/**
 * Crée les 15 groupes 2026-2027 dans Firestore (1A TS × 8, 2A TS × 6, QUALIF × 1)
 * Usage : FIREBASE_TOKEN=<refresh_token> node scripts/create-groupes-2026.mjs
 */

const PROJECT_ID = 'erp-pedago-iftl';
const REFRESH_TOKEN = process.env.FIREBASE_TOKEN;
if (!REFRESH_TOKEN) {
  console.error('❌  Définir FIREBASE_TOKEN avant de lancer ce script.');
  process.exit(1);
}

// ── Échange du refresh token contre un access token ───────────────────────────
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

// ── Helpers Firestore REST ─────────────────────────────────────────────────────
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
  return doc.name.split('/').pop(); // docId
}

async function listDocs(token, colPath) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${colPath}?pageSize=300`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  return (data.documents || []).map(d => {
    const fields = {};
    for (const [k, v] of Object.entries(d.fields || {})) {
      fields[k] = v.stringValue ?? v.booleanValue ?? v.doubleValue ?? null;
    }
    return { id: d.name.split('/').pop(), ...fields };
  });
}

// ── Définition des groupes 2026-2027 ─────────────────────────────────────────
const GROUPES = [
  // 1A TS — 8 groupes (1ère année)
  { nom: '1TS-A', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale',        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-B', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale',        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-C', filiereCode: 'LIPF', filiere: 'Logistique Industrielle et Pilotage des Flux',             typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-D', filiereCode: 'LIPF', filiere: 'Logistique Industrielle et Pilotage des Flux',             typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-E', filiereCode: 'GOLE', filiere: "Gestion des Opérations Logistiques et d'Entrepôt",        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-F', filiereCode: 'GOLE', filiere: "Gestion des Opérations Logistiques et d'Entrepôt",        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-G', filiereCode: 'ECMD', filiere: 'E-Commerce, Marketing Digital et Distribution',            typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-H', filiereCode: 'DMVT', filiere: 'Diagnostic et Maintenance des Véhicules de Transport',    typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  // 2A TS — 6 groupes (2ème année, ex-1A TS 2025-2026)
  { nom: '2TS-A', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale',        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-B', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale',        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-C', filiereCode: 'LIPF', filiere: 'Logistique Industrielle et Pilotage des Flux',             typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-D', filiereCode: 'GOLE', filiere: "Gestion des Opérations Logistiques et d'Entrepôt",        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-E', filiereCode: 'ECMD', filiere: 'E-Commerce, Marketing Digital et Distribution',            typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-F', filiereCode: 'DMVT', filiere: 'Diagnostic et Maintenance des Véhicules de Transport',    typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  // QUALIF
  { nom: 'Conducteur Routier de Marchandises', filiereCode: 'CRM', filiere: 'Conducteur(trice) Routier(ère) de Marchandises', typeFormation: 'Qualification', niveau: 'Qualification', anneePromotion: '', annee: '2026-2027', statut: 'actif', actif: true },
];

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🔑  Authentification Firebase…');
  const token = await getAccessToken();
  console.log('✓   Token obtenu.\n');

  console.log('📋  Chargement des groupes existants…');
  const existing = await listDocs(token, 'groupes');
  const existingNoms2026 = new Set(
    existing.filter(g => g.annee === '2026-2027').map(g => g.nom)
  );
  console.log(`✓   ${existing.length} groupes en base, ${existingNoms2026.size} pour 2026-2027.\n`);

  const toCreate = GROUPES.filter(g => !existingNoms2026.has(g.nom));
  if (toCreate.length === 0) {
    console.log('✅  Tous les groupes 2026-2027 existent déjà. Rien à faire.');
    return;
  }

  console.log(`🚀  Création de ${toCreate.length} groupe(s)…`);
  let ok = 0, fail = 0;
  for (const g of toCreate) {
    try {
      const id = await createDoc(token, 'groupes', g);
      console.log(`  ✓  ${g.nom} (${g.filiereCode}) → ${id}`);
      ok++;
    } catch (err) {
      console.error(`  ✗  ${g.nom}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n─── Résultat ───────────────────────────────`);
  console.log(`✓ Créés  : ${ok}`);
  if (fail) console.log(`✗ Erreurs: ${fail}`);
  console.log(`\nProchaine étape → /admin/affectation-population`);
})();
