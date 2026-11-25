/**
 * Importe 385 étudiants (2A TS + 1A TS + QUALIF) dans Firestore depuis les CSV 2026-2027
 * Usage : FIREBASE_TOKEN=<refresh_token> node scripts/import-population-2026.mjs
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = 'erp-pedago-iftl';
const REFRESH_TOKEN = process.env.FIREBASE_TOKEN;
if (!REFRESH_TOKEN) {
  console.error('❌  Définir FIREBASE_TOKEN avant de lancer ce script.');
  process.exit(1);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: REFRESH_TOKEN,
      grant_type:    'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token failed: ' + JSON.stringify(data));
  return data.access_token;
}

// ── Firestore REST helpers ────────────────────────────────────────────────────
function toFSVal(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number')  return { doubleValue: val };
  if (val instanceof Date)      return { timestampValue: val.toISOString() };
  if (typeof val === 'string')  return { stringValue: val };
  if (Array.isArray(val))       return { arrayValue: { values: val.map(toFSVal) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) if (v !== undefined) fields[k] = toFSVal(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}
function toDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) fields[k] = toFSVal(v);
  return { fields };
}

async function createDoc(token, colPath, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${colPath}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toDoc(data)),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`POST ${colPath} failed ${resp.status}: ${err.slice(0, 300)}`);
  }
  const doc = await resp.json();
  return doc.name.split('/').pop();
}

// Liste avec pagination (pageToken)
async function listAllDocs(token, colPath, pageSize = 300) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${colPath}`;
  const docs = [];
  let pageToken = null;
  do {
    const url = base + `?pageSize=${pageSize}` + (pageToken ? `&pageToken=${pageToken}` : '');
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await resp.json();
    for (const d of (data.documents || [])) {
      const fields = {};
      for (const [k, v] of Object.entries(d.fields || {})) {
        fields[k] = v.stringValue ?? v.booleanValue ?? v.doubleValue ?? null;
      }
      docs.push({ id: d.name.split('/').pop(), ...fields });
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return docs;
}

// Query par champ (runQuery)
async function queryByField(token, colPath, field, value) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: colPath }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: { stringValue: value },
        },
      },
      limit: 2,
    },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const results = await resp.json();
  return (results || []).filter(r => r.document).map(r => r.document.name.split('/').pop());
}

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(filepath) {
  const text = readFileSync(filepath, 'utf-8').replace(/^﻿/, ''); // strip BOM
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ''; });
    return row;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🔑  Authentification Firebase…');
  const token = await getAccessToken();
  console.log('✓   Token obtenu.\n');

  // Charger tous les groupes pour le map nom → id
  console.log('📋  Chargement des groupes Firestore…');
  const groupes = await listAllDocs(token, 'groupes');
  const groupeMap = {};
  for (const g of groupes) {
    if (g.nom) groupeMap[g.nom.trim()] = g.id;
  }
  console.log(`✓   ${groupes.length} groupes chargés.\n`);

  // Charger les étudiants existants pour détecter doublons
  console.log('📋  Chargement des étudiants existants…');
  const existingStudents = await listAllDocs(token, 'students');
  const existingCodes = new Set(existingStudents.map(s => (s.codeApprenant || '').toUpperCase()));
  console.log(`✓   ${existingStudents.length} étudiants en base.\n`);

  // Lire les deux CSV
  const csv2a  = parseCSV(join(__dir, 'import_2A_TS_2026-2027.csv'));
  const csv1a  = parseCSV(join(__dir, 'import_1A_TS_QUALIF_2026-2027.csv'));
  const allRows = [...csv2a, ...csv1a];
  console.log(`📄  ${csv2a.length} lignes 2A TS + ${csv1a.length} lignes 1A TS/QUALIF = ${allRows.length} total.\n`);

  let created = 0, skipped = 0, errors = 0;

  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    const code = (row.codeapprenant || row['code apprenant'] || '').trim().toUpperCase();
    if (!code) { skipped++; continue; }

    if (existingCodes.has(code)) {
      process.stdout.write(`  ⏭  ${code} (doublon)\n`);
      skipped++;
      continue;
    }

    const groupeNom = (row.groupe || '').trim();
    const groupeId  = groupeMap[groupeNom] || '';
    if (!groupeId) {
      process.stdout.write(`  ⚠  ${code} — groupe "${groupeNom}" non trouvé en base\n`);
    }

    const niveau = (row.niveau || '').trim();
    const anneeFormation = niveau === '2A TS' ? '2' : niveau === '1A TS' ? '1' : '';

    const payload = {
      nom:            (row.nom || '').trim().toUpperCase(),
      prenom:         (row.prenom || '').trim(),
      codeApprenant:  code,
      cin:            (row.cin || '').trim().toUpperCase(),
      email:          (row.email || '').trim().toLowerCase(),
      telephone:      (row.telephone || '').trim(),
      dateNaissance:  (row.datenaissance || '').trim(),
      genre:          (row.genre || '').trim(),
      ville:          (row.ville || '').trim(),
      groupe:         groupeNom,
      groupeId,
      niveau,
      anneeFormation,
      filiereCode:    (row.filierecode || '').trim().toUpperCase(),
      anneeAcademique: (row.anneeacademique || '2026-2027').trim(),
      statut:         'actif',
    };

    try {
      const id = await createDoc(token, 'students', payload);
      process.stdout.write(`  ✓  ${code} (${groupeNom}) → ${id}\n`);
      existingCodes.add(code); // éviter double-création si le code apparaît deux fois
      created++;
    } catch (err) {
      process.stdout.write(`  ✗  ${code}: ${err.message}\n`);
      errors++;
    }

    // Progress every 50
    if ((i + 1) % 50 === 0) console.log(`\n  → ${i + 1}/${allRows.length} traités…\n`);
  }

  console.log('\n─── Résultat ───────────────────────────────');
  console.log(`✓ Créés  : ${created}`);
  console.log(`⏭ Ignorés: ${skipped} (doublons)`);
  if (errors) console.log(`✗ Erreurs: ${errors}`);
  console.log(`\nTotal en base après import : ~${existingStudents.length + created}`);
})();
