/**
 * Firestore seed script — injects groupes, students, modules, intervenants
 * Uses OAuth2 access token from firebase-tools CI token
 */
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const PROJECT_ID = 'erp-pedago-iftl';
const REFRESH_TOKEN = process.env.FIREBASE_TOKEN;
if (!REFRESH_TOKEN) { console.error('❌ Set FIREBASE_TOKEN env var'); process.exit(1); }

// ─── Get access token ────────────────────────────────────────────────────────
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

// ─── Firestore REST helpers ──────────────────────────────────────────────────
function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return { doubleValue: val };
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v);
  }
  return { fields };
}

async function upsertDoc(token, collection, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${docId}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toFirestoreDoc(data)),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`PATCH ${collection}/${docId} failed: ${resp.status} ${err.slice(0, 200)}`);
  }
  return resp.json();
}

async function collectionCount(token, col) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${col}?pageSize=1`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json();
  return data.documents?.length || 0;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const portailRaw = readFileSync('/tmp/portail_data.json', 'utf-8');
const PORTAIL = JSON.parse(portailRaw);

const GROUPE_MAP = {
  'TS.A – OTM':  { id: '1a-otm-a',  nom: '1A TS - Groupe A (OTM)',  niveau: '1A TS', filiereCode: 'OTM',  anneeAcademique: '2025-2026' },
  'TS.B – OTM':  { id: '1a-otm-b',  nom: '1A TS - Groupe B (OTM)',  niveau: '1A TS', filiereCode: 'OTM',  anneeAcademique: '2025-2026' },
  'TS.C – OFLP': { id: '1a-oflp',   nom: '1A TS - Groupe C (OFLP)', niveau: '1A TS', filiereCode: 'OFLP', anneeAcademique: '2025-2026' },
  'TS.D – AEL':  { id: '1a-ael',    nom: '1A TS - Groupe D (AEL)',  niveau: '1A TS', filiereCode: 'AEL',  anneeAcademique: '2025-2026' },
  'TS.E – ECOM': { id: '1a-ecom',   nom: '1A TS - Groupe E (ECOM)', niveau: '1A TS', filiereCode: 'ECOM', anneeAcademique: '2025-2026' },
  'TS.F':        { id: '1a-adee',   nom: '1A TS - Groupe F (ADEE)', niveau: '1A TS', filiereCode: 'ADEE', anneeAcademique: '2025-2026' },
  'Gr.A – OTM':  { id: '2a-otm-a',  nom: '2A TS - Groupe A (OTM)',  niveau: '2A TS', filiereCode: 'OTM',  anneeAcademique: '2025-2026' },
  'Gr.B – OTM':  { id: '2a-otm-b',  nom: '2A TS - Groupe B (OTM)',  niveau: '2A TS', filiereCode: 'OTM',  anneeAcademique: '2025-2026' },
  'Gr.C – OFLP': { id: '2a-oflp',   nom: '2A TS - Groupe C (OFLP)', niveau: '2A TS', filiereCode: 'OFLP', anneeAcademique: '2025-2026' },
  'Gr.D – AEL':  { id: '2a-ael',    nom: '2A TS - Groupe D (AEL)',  niveau: '2A TS', filiereCode: 'AEL',  anneeAcademique: '2025-2026' },
  'Gr.E – ECOM': { id: '2a-ecom',   nom: '2A TS - Groupe E (ECOM)', niveau: '2A TS', filiereCode: 'ECOM', anneeAcademique: '2025-2026' },
  'Gr.F – ADEE': { id: '2a-adee',   nom: '2A TS - Groupe F (ADEE)', niveau: '2A TS', filiereCode: 'ADEE', anneeAcademique: '2025-2026' },
  'GROUPE 1':    { id: 'lic-g1',    nom: 'Licence CNAM - Groupe 1', niveau: 'Licence CNAM', filiereCode: 'LIC', anneeAcademique: '2025-2026' },
  'GROUPE 2':    { id: 'lic-g2',    nom: 'Licence CNAM - Groupe 2', niveau: 'Licence CNAM', filiereCode: 'LIC', anneeAcademique: '2025-2026' },
};

const MODULES_BY_FILIERE = {
  OTM: [
    'Métier & Formation',
    'Fondamentaux du Transport Multimodal et régime TIR',
    "Fondamentaux de la Logistique et de l'entrepôt",
    'Réglementation des modes de Transport et conventions internationales',
    'Réglementation logistique et Transport',
    'Contrats de Transport et Incoterms dans le commerce International',
    'Gestion des opérations en entrepôt',
    "Gestion des stocks et techniques d'approvisionnement",
    'Réglementations et Techniques Douanières',
    'Comptabilité Générale et Analytique',
    'Management des Achats',
    'Fondamentaux Commerce & Marketing',
    'Statistiques & Mathématiques appliquées à la logistique',
    'Digital Skills - Outils Bureautiques de gestion',
    'Communication écrite et orale en Français',
    'Business English Written and Oral Communication',
    'Développement Personnel et Communication en milieu professionnel',
    'Recherche de Stages',
  ],
  OFLP: [
    'Métier & Formation',
    "Fondamentaux de la Logistique et de l'entrepôt",
    'Réglementation logistique et Transport',
    'Organisation des flux de la logistique de Production',
    'MRP - Material Requirements Planning',
    'Ordonnancement',
    'Gestion des opérations en entrepôt',
    'Statistiques & Mathématiques appliquées à la logistique',
    'Transport et distribution',
    "Gestion des Stocks et techniques d'Approvisionnement",
    'Comptabilité Générale et Analytique',
    'Management des Achats',
    'Fondamentaux Commerce & Marketing',
    'Digital Skills - Outils Bureautiques de gestion',
    'Communication écrite et orale en Français',
    'Business English Written and Oral Communication',
    'Développement Personnel et Communication en milieu professionnel',
    'Recherche de Stages',
  ],
  AEL: [
    'Métier & Formation',
    "Fondamentaux de la Logistique et de l'entrepôt",
    'Réglementation Logistique et Transport',
    'Comptabilité Générale et Analytique',
    'Management des Achats',
    'Fondamentaux Commerce & Marketing',
    "Gestion des stocks et Techniques d'approvisionnement",
    'Gestion des Opérations en Entrepôt',
    'Transport et Distribution',
    'Statistiques & Mathématiques appliquées à la logistique',
    'Digital Skills - Outils Bureautiques de gestion',
    'Communication écrite et orale en Français',
    'Business English Written and Oral Communication',
    'Développement Personnel et Communication en milieu professionnel',
    'Recherche de Stages',
  ],
  ECOM: [
    'Métier et Formation',
    "Fondamentaux de la Logistique et d'entrepôt",
    'Environnement Web',
    'Programmation Web & HTML',
    "Fondamentaux de l'Entrepreneuriat",
    'Comptabilité Générale et comptabilité des sociétés',
    'Fondamentaux Commerce & Marketing',
    'Management des Achats',
    'Statistiques & Mathématiques appliquées à la logistique',
    'Gestion Stocks & Warehouse Management',
    'Logistique de distribution',
    'Outils CMS pour E-commerce',
    'Réglementation Logistique et Transport',
    'Marketing digital',
    'Digital Skills - Outils Bureautiques de gestion',
    'Communication écrite et orale en Français',
    'Business English Written and Oral Communication',
    'Coaching & Communication pour entrepreneurs',
    'Développement Personnel et Communication en milieu professionnel',
    'Recherche de Stages',
  ],
  ADEE: [
    'Métier & Formation',
    'Recherche et Lecture de la documentation Technique',
    'Méthodes et outils de Diagnostic',
    'Moteur à combustion interne (thermique)',
    'Transmission de puissance',
    'Métrologie',
    "Organisation et Travaux d'atelier",
    'Liaison au Sol',
    'Hygiène, sécurité et environnement',
    'Les Systèmes électroniques automobiles',
    'Les Systèmes électriques automobile',
    'Principes et Fondamentaux des affaires',
    'Digital Skills - Outils Bureautiques de gestion',
    'Communication écrite et orale en Français',
    'Technical English',
    'Développement Personnel et Communication en milieu professionnel',
    'Recherche de Stages',
  ],
  LIC: [
    'CFA109 - Info. Comptable & Management',
    'LTR112 - Supply Chain Planning, Manufacturing & Lean Management',
    'ESC118 - Processus et organisation des achats',
    'LTR135 - Achats de prestations transport et log. / Mgmt équipes',
    'LTR126 - Pilotage des Flux',
    'LTR113 - Logistique Durable',
    'ESC121 - Marketing des Achats',
    'LTR143 - Contrôle Gestion SC',
    'ANG320 - Anglais Professionnel',
    'TED001 - Transitions Écologiques',
  ],
};

const INTERVENANTS = [
  { id: 'int-soba', nom: 'SOBA', prenom: 'Brahim', specialites: ['Réglementations et Techniques Douanières'], email: 'b.soba@iftl.ma', actif: true },
  { id: 'int-moutmihi', nom: 'MOUTMIHI', prenom: 'Mohamed', specialites: ["Fondamentaux de la Logistique et de l'entrepôt"], email: 'm.moutmihi@iftl.ma', actif: true },
  { id: 'int-nour', nom: 'NOUR', prenom: 'Abdelhak', specialites: ['Gestion des opérations en entrepôt'], email: 'a.nour@iftl.ma', actif: true },
  { id: 'int-aboutajeddine', nom: 'ABOUTAJEDDINE', prenom: 'Faycal', specialites: ['Gestion des opérations en entrepôt'], email: 'f.aboutajeddine@iftl.ma', actif: true },
  { id: 'int-abachikh', nom: 'ABACHIKH', prenom: 'Karima', specialites: ["Gestion des stocks et techniques d'approvisionnement"], email: 'k.abachikh@iftl.ma', actif: true },
  { id: 'int-bouaissi', nom: 'BOUAISSI', prenom: 'Abdennacer', specialites: ["Gestion des stocks et techniques d'approvisionnement"], email: 'a.bouaissi@iftl.ma', actif: true },
  { id: 'int-essaf', nom: 'ESSAF', prenom: 'Kaoutar', specialites: ['Comptabilité Générale et Analytique'], email: 'k.essaf@iftl.ma', actif: true },
  { id: 'int-achoui', nom: 'ACHOUI', prenom: 'Mostafa', specialites: ['Statistiques & Mathématiques appliquées à la logistique'], email: 'm.achoui@iftl.ma', actif: true },
  { id: 'int-sabir', nom: 'SABIR', prenom: 'Khalil', specialites: ['Digital Skills - Outils Bureautiques de gestion', 'Recherche de Stages'], email: 'k.sabir@iftl.ma', actif: true },
  { id: 'int-lifi', nom: 'LIFI', prenom: 'Nada', specialites: ['Business English Written and Oral Communication'], email: 'n.lifi@iftl.ma', actif: true },
];

// ─── Main seed ────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🔑 Obtaining access token...');
  const token = await getAccessToken();
  console.log('✓ Token obtained\n');

  // ── 1. Groupes ──────────────────────────────────────────────────────────────
  console.log('📦 Seeding groupes...');
  let groupeCount = 0;
  for (const [, g] of Object.entries(GROUPE_MAP)) {
    const { id, ...data } = g;
    await upsertDoc(token, 'groupes', id, {
      ...data,
      modules: MODULES_BY_FILIERE[data.filiereCode] || [],
      actif: true,
      importedAt: new Date().toISOString(),
    });
    process.stdout.write('.');
    groupeCount++;
  }
  console.log(`\n✓ ${groupeCount} groupes importés\n`);

  // ── 2. Modules (collection dédiée par filière) ──────────────────────────────
  console.log('📚 Seeding modules...');
  let modCount = 0;
  for (const [filiereCode, modules] of Object.entries(MODULES_BY_FILIERE)) {
    for (let i = 0; i < modules.length; i++) {
      const modId = `${filiereCode.toLowerCase()}-m${String(i + 1).padStart(2, '0')}`;
      await upsertDoc(token, 'modules', modId, {
        nom: modules[i],
        filiereCode,
        ordre: i + 1,
        actif: true,
      });
      process.stdout.write('.');
      modCount++;
    }
  }
  console.log(`\n✓ ${modCount} modules importés\n`);

  // ── 3. Intervenants ─────────────────────────────────────────────────────────
  console.log('👤 Seeding intervenants...');
  for (const { id, ...data } of INTERVENANTS) {
    await upsertDoc(token, 'intervenants', id, data);
    process.stdout.write('.');
  }
  console.log(`\n✓ ${INTERVENANTS.length} intervenants importés\n`);

  // ── 4. Students ─────────────────────────────────────────────────────────────
  console.log('🎓 Seeding students (346)...');
  let studentCount = 0;
  for (const s of PORTAIL) {
    const g = GROUPE_MAP[s.groupe];
    if (!g) { console.warn(`\n⚠ Unknown groupe: ${s.groupe}`); continue; }

    const parts = (s.date || '').split('/');
    const dateNaissance = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : s.date || '';

    // Build results by module
    const resultats = {};
    for (const m of s.modules || []) {
      if (m.module && m.statut && m.statut !== '—') {
        resultats[m.module] = {
          statut: m.statut,
          note: m.grade && m.grade !== '—' ? parseFloat(m.grade) || null : null,
          coeff: m.coeff || null,
        };
      }
    }

    await upsertDoc(token, 'students', s.code, {
      codeApprenant: s.code,
      nom: s.nom,
      prenom: s.prenom,
      cin: s.cin,
      dateNaissance,
      groupeId: g.id,
      groupeNom: g.nom,
      niveau: s.annee,
      filiereCode: g.filiereCode,
      anneeAcademique: '2025-2026',
      statut: 'actif',
      moyenneGenerale: s.moy && s.moy !== '—' ? parseFloat(s.moy) || null : null,
      statutGlobal: s.statut_global || '',
      resultats,
    });

    studentCount++;
    if (studentCount % 20 === 0) process.stdout.write(`\n  ${studentCount}/346`);
    else process.stdout.write('.');
  }
  console.log(`\n✓ ${studentCount} apprenants importés\n`);

  // ── 5. Settings ─────────────────────────────────────────────────────────────
  console.log('⚙ Seeding settings...');
  await upsertDoc(token, 'settings', 'general', {
    nomEcole: 'IFTL - Institut de Formation dans les métiers du Transport et de la Logistique',
    adresse: 'Casablanca, Maroc',
    telephone: '',
    emailContact: 'contact@iftl.ma',
    anneeAcademique: '2025-2026',
    cndpAutorisation: 'A-PO-268/2024',
  });
  console.log('✓ Settings importés\n');

  console.log('🎉 Import terminé !');
  console.log(`   Groupes: ${groupeCount}`);
  console.log(`   Modules: ${modCount}`);
  console.log(`   Intervenants: ${INTERVENANTS.length}`);
  console.log(`   Apprenants: ${studentCount}`);
}

seed().catch(err => {
  console.error('\n✗ Erreur:', err.message);
  process.exit(1);
});
