/**
 * migrate-annee-2627.mjs
 * Migration annuelle 2025-2026 → 2026-2027
 *
 * Ce que fait ce script :
 *   1. 2A TS (actuels) → statut: 'laureat', anneePromotion: '2025-2026'
 *   2. 1A TS (actuels) → promus en 2A : groupeId mis à jour, niveau: '2A TS', annee: 2026-2027
 *   3. Groupes 2A → mis à jour pour accueillir la promo montante
 *   4. Groupes 1A → réinitialisés, prêts pour nouveaux inscrits 2026-2027
 *   Licence CNAM → non touché (cycle indépendant)
 *
 * Usage : FIREBASE_TOKEN=<ci_token> node scripts/migrate-annee-2627.mjs [--dry-run]
 */

const PROJECT_ID = 'erp-pedago-iftl';
const REFRESH_TOKEN = process.env.FIREBASE_TOKEN;
const DRY_RUN = process.argv.includes('--dry-run');

if (!REFRESH_TOKEN) { console.error('❌ Set FIREBASE_TOKEN env var'); process.exit(1); }
if (DRY_RUN) console.log('🔍 MODE SIMULATION (--dry-run) — aucune modification réelle');

// ─── OAuth2 ──────────────────────────────────────────────────────────────────
async function getAccessToken() {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(data));
  return data.access_token;
}

// ─── Firestore REST helpers ───────────────────────────────────────────────────
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

function toFsVal(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFsVal) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) if (v !== undefined) fields[k] = toFsVal(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) fields[k] = toFsVal(v);
  return { fields };
}

async function listAll(token, col) {
  const docs = [];
  let pageToken = '';
  do {
    const url = `${BASE}/${col}?pageSize=300${pageToken ? '&pageToken=' + pageToken : ''}`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    if (data.documents) {
      for (const d of data.documents) {
        const id = d.name.split('/').pop();
        const obj = { id };
        for (const [k, v] of Object.entries(d.fields || {})) {
          if (v.stringValue !== undefined) obj[k] = v.stringValue;
          else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
          else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
          else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue);
          else if (v.nullValue !== undefined) obj[k] = null;
        }
        docs.push(obj);
      }
    }
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return docs;
}

async function patch(token, col, id, data) {
  if (DRY_RUN) { console.log(`  [DRY] PATCH ${col}/${id}`, JSON.stringify(data)); return; }
  const fields = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `${BASE}/${col}/${id}?${fields}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toDoc(data)),
  });
  if (!r.ok) throw new Error(`PATCH ${col}/${id} → ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Mapping 1A → 2A ────────────────────────────────────────────────────────
const PROMOTION_MAP = {
  '1a-otm-a':  '2a-otm-a',
  '1a-otm-b':  '2a-otm-b',
  '1a-oflp':   '2a-oflp',
  '1a-ael':    '2a-ael',
  '1a-ecom':   '2a-ecom',
  '1a-adee':   '2a-adee',
};

const GROUPES_1A = Object.keys(PROMOTION_MAP);
const GROUPES_2A = Object.values(PROMOTION_MAP);

// Nouveaux noms pour les groupes 2A (qui accueillent la promo montante)
const GROUPE_2A_LABELS = {
  '2a-otm-a':  '2A TS - Groupe A (OTM)',
  '2a-otm-b':  '2A TS - Groupe B (OTM)',
  '2a-oflp':   '2A TS - Groupe C (OFLP)',
  '2a-ael':    '2A TS - Groupe D (AEL)',
  '2a-ecom':   '2A TS - Groupe E (ECOM)',
  '2a-adee':   '2A TS - Groupe F (ADEE)',
};

// Noms des groupes 1A réinitialisés pour la promo entrante
const GROUPE_1A_LABELS = {
  '1a-otm-a':  '1A TS - Groupe A (OTM)',
  '1a-otm-b':  '1A TS - Groupe B (OTM)',
  '1a-oflp':   '1A TS - Groupe C (OFLP)',
  '1a-ael':    '1A TS - Groupe D (AEL)',
  '1a-ecom':   '1A TS - Groupe E (ECOM)',
  '1a-adee':   '1A TS - Groupe F (ADEE)',
};

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Migration annuelle 2025-2026 → 2026-2027\n');

  const token = await getAccessToken();
  console.log('✅ Token OK\n');

  // 1. Charger tous les étudiants
  console.log('📥 Chargement des étudiants...');
  const allStudents = await listAll(token, 'students');
  console.log(`   ${allStudents.length} étudiants trouvés`);

  const students2A = allStudents.filter(s => GROUPES_2A.includes(s.groupeId) && s.statut !== 'laureat');
  const students1A = allStudents.filter(s => GROUPES_1A.includes(s.groupeId));
  const studentsLicence = allStudents.filter(s => ['lic-g1', 'lic-g2'].includes(s.groupeId));

  console.log(`   → ${students2A.length} étudiants 2A TS (→ lauréats)`);
  console.log(`   → ${students1A.length} étudiants 1A TS (→ promo 2A)`);
  console.log(`   → ${studentsLicence.length} étudiants Licence CNAM (non touchés)\n`);

  // 2. Marquer les 2A comme lauréats
  console.log('🎓 Passage en lauréats (2A TS 2025-2026)...');
  let done = 0;
  for (const s of students2A) {
    await patch(token, 'students', s.id, {
      statut: 'laureat',
      anneePromotion: '2025-2026',
      updatedAt: new Date().toISOString(),
    });
    done++;
    if (done % 10 === 0) console.log(`   ${done}/${students2A.length}...`);
    await sleep(80);
  }
  console.log(`   ✅ ${students2A.length} étudiants → lauréats\n`);

  // 3. Promouvoir les 1A → 2A
  console.log('⬆️  Promotion 1A → 2A TS 2026-2027...');
  done = 0;
  for (const s of students1A) {
    const newGroupeId = PROMOTION_MAP[s.groupeId];
    if (!newGroupeId) { console.warn(`   ⚠️ groupeId inconnu: ${s.groupeId} pour ${s.code}`); continue; }
    await patch(token, 'students', s.id, {
      groupeId: newGroupeId,
      niveau: '2A TS',
      anneeAcademique: '2026-2027',
      updatedAt: new Date().toISOString(),
    });
    done++;
    if (done % 10 === 0) console.log(`   ${done}/${students1A.length}...`);
    await sleep(80);
  }
  console.log(`   ✅ ${students1A.length} étudiants promus en 2A\n`);

  // 4. Mettre à jour les groupes 2A (promo montante)
  console.log('📁 Mise à jour des groupes 2A (2026-2027)...');
  for (const [id, nom] of Object.entries(GROUPE_2A_LABELS)) {
    await patch(token, 'groupes', id, {
      nom,
      niveau: '2A TS',
      anneeAcademique: '2026-2027',
      actif: true,
      updatedAt: new Date().toISOString(),
    });
    console.log(`   ✅ ${id} → "${nom}"`);
    await sleep(100);
  }
  console.log();

  // 5. Réinitialiser les groupes 1A (prêts pour nouveaux inscrits)
  console.log('📁 Réinitialisation des groupes 1A (2026-2027)...');
  for (const [id, nom] of Object.entries(GROUPE_1A_LABELS)) {
    await patch(token, 'groupes', id, {
      nom,
      niveau: '1A TS',
      anneeAcademique: '2026-2027',
      actif: true,
      updatedAt: new Date().toISOString(),
    });
    console.log(`   ✅ ${id} → "${nom}"`);
    await sleep(100);
  }
  console.log();

  // ─── Résumé ──────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ MIGRATION TERMINÉE');
  console.log(`   Lauréats 2025-2026 : ${students2A.length} étudiants`);
  console.log(`   Promus en 2A       : ${students1A.length} étudiants`);
  console.log(`   Licence CNAM       : ${studentsLicence.length} étudiants (non touchés)`);
  console.log('');
  console.log('   Prochaines étapes :');
  console.log('   1. Injecter les nouveaux inscrits 1A TS 2026-2027');
  console.log('      → Envoyer la liste à Claude pour injection');
  console.log('   2. Vérifier sur https://erp-pedago-iftl.web.app');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch(err => { console.error('❌ Erreur fatale:', err.message); process.exit(1); });
