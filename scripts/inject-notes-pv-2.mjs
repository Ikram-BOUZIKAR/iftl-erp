/**
 * inject-notes-pv-2.mjs
 * Injecte tous les groupes manquants depuis les PV 2025-2026 :
 *   1A TS.C OFLP (24), TS.D AEL (20)
 *   2A Gr.A-F OTM/OFLP/AEL/ECOM/ADEE (142 apprenants)
 *   TS.E ECOM (19) + TS.F AUTO (30) des promo précédentes (maintenant 2A)
 *
 * Usage : FIREBASE_TOKEN=<ci_token> node scripts/inject-notes-pv-2.mjs
 */

const PROJECT_ID = 'erp-pedago-iftl';
const REFRESH_TOKEN = process.env.FIREBASE_TOKEN;
if (!REFRESH_TOKEN) { console.error('❌ Set FIREBASE_TOKEN'); process.exit(1); }

async function getAccessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error('Token failed: ' + JSON.stringify(d));
  return d.access_token;
}

function toFsVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { doubleValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsVal) } };
  if (typeof v === 'object') { const f = {}; for (const [k, val] of Object.entries(v)) if (val !== undefined) f[k] = toFsVal(val); return { mapValue: { fields: f } }; }
  return { stringValue: String(v) };
}
function toDoc(obj) { const f = {}; for (const [k, v] of Object.entries(obj)) if (v !== undefined) f[k] = toFsVal(v); return { fields: f }; }
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
async function upsert(tok, col, id, data) {
  const r = await fetch(`${BASE}/${col}/${id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: JSON.stringify(toDoc(data)) });
  if (!r.ok) throw new Error(`PATCH ${col}/${id} → ${r.status}: ${(await r.text()).slice(0,200)}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════
const NOW = new Date().toISOString();
const ANNEE = '2025-2026';

// ── Nouveaux intervenants (complément des 26 déjà injectés) ────────
const INTERVENANTS_NEW = [
  { id: 'moutmihi-mohamed',    nom: 'MOUTMIHI',       prenom: 'Mohamed',      specialite: 'Pilotage de la Performance Logistique', actif: true },
  { id: 'amrani-aissam',       nom: 'AMRANI',         prenom: 'Aissam',       specialite: 'Entrepreneuriat & Innovation',          actif: true },
  { id: 'hajji-hamid',         nom: 'HAJJI',          prenom: 'Hamid',        specialite: 'Assurances Transport & Anomalies',      actif: true },
  { id: 'elmountassir-khalil', nom: 'ELMOUNTASSIR',   prenom: 'Khalil',       specialite: 'E-Commerce Avancé & UX Design',        actif: true },
  { id: 'lahlou',              nom: 'LAHLOU',         prenom: '',             specialite: 'Design Web',                            actif: true },
  { id: 'aboutajeddine-farida',nom: 'ABOUTAJEDDINE',  prenom: 'Farida',       specialite: 'Métier & Formation',                    actif: true },
];

// ── Groupes ─────────────────────────────────────────────────────────
const GROUPES = [
  // 1A 2025-2026
  { id: 'ts-c-oflp-1a-2025', nom: 'TS.C – OFLP 1ère Année',  filiere: 'OFLP', filiereCode: 'OFLP', niveau: 'TS 1A', anneeAcademique: ANNEE, effectif: 24 },
  { id: 'ts-d-ael-1a-2025',  nom: 'TS.D – AEL 1ère Année',   filiere: 'AEL',  filiereCode: 'AEL',  niveau: 'TS 1A', anneeAcademique: ANNEE, effectif: 20 },
  // 2A 2025-2026
  { id: 'ts-a-otm-2a-2025',  nom: 'TS 2A – Gr.A OTM',        filiere: 'OTM',  filiereCode: 'OTM',  niveau: 'TS 2A', anneeAcademique: ANNEE, effectif: 26 },
  { id: 'ts-b-otm-2a-2025',  nom: 'TS 2A – Gr.B OTM',        filiere: 'OTM',  filiereCode: 'OTM',  niveau: 'TS 2A', anneeAcademique: ANNEE, effectif: 26 },
  { id: 'ts-c-oflp-2a-2025', nom: 'TS 2A – Gr.C OFLP',       filiere: 'OFLP', filiereCode: 'OFLP', niveau: 'TS 2A', anneeAcademique: ANNEE, effectif: 26 },
  { id: 'ts-d-ael-2a-2025',  nom: 'TS 2A – Gr.D AEL',        filiere: 'AEL',  filiereCode: 'AEL',  niveau: 'TS 2A', anneeAcademique: ANNEE, effectif: 27 },
  { id: 'ts-e-ecom-2a-2025', nom: 'TS 2A – Gr.E E-Commerce', filiere: 'ECOM', filiereCode: 'ECOM', niveau: 'TS 2A', anneeAcademique: ANNEE, effectif: 19 },
  { id: 'ts-f-adee-2a-2025', nom: 'TS 2A – Gr.F ADEE',       filiere: 'ADEE', filiereCode: 'ADEE', niveau: 'TS 2A', anneeAcademique: ANNEE, effectif: 18 },
  { id: 'ts-e-ecom-1a-2024', nom: 'TS.E – E-Commerce 1A (promo 2024)', filiere: 'ECOM', filiereCode: 'ECOM', niveau: 'TS 1A', anneeAcademique: '2024-2025', effectif: 19 },
  { id: 'ts-f-auto-1a-2024', nom: 'TS.F – AUTO 1A (promo 2024)',       filiere: 'AUTO', filiereCode: 'AUTO', niveau: 'TS 1A', anneeAcademique: '2024-2025', effectif: 30 },
];

// ── Modules ──────────────────────────────────────────────────────────
const MODULES = [
  // OFLP 1A
  { id: 'OFLP-1A-M01', code: 'OFLP-1A-M01', nom: 'Logistique de Distribution',                     filiereCode: 'OFLP', intervenantId: 'elbahi-younes',        coeff: 2 },
  { id: 'OFLP-1A-M02', code: 'OFLP-1A-M02', nom: 'Réglementation Logistique et Transport',          filiereCode: 'OFLP', intervenantId: 'benhaddou-najib',       coeff: 2 },
  { id: 'OFLP-1A-M03', code: 'OFLP-1A-M03', nom: 'Statistiques & Mathématiques appliquées',         filiereCode: 'OFLP', intervenantId: 'achoui-mostafa',        coeff: 2 },
  { id: 'OFLP-1A-M04', code: 'OFLP-1A-M04', nom: 'Métier & Formation',                              filiereCode: 'OFLP', intervenantId: 'darkaoui-abdellah',     coeff: 2 },
  { id: 'OFLP-1A-M05', code: 'OFLP-1A-M05', nom: "Fondamentaux de la Logistique et de l'entrepôt", filiereCode: 'OFLP', intervenantId: 'aboutajeddin-faycal',   coeff: 2 },
  { id: 'OFLP-1A-M06', code: 'OFLP-1A-M06', nom: 'Comptabilité Générale et Analytique',             filiereCode: 'OFLP', intervenantId: 'essaf-kaoutar',         coeff: 1 },
  // AEL 1A
  { id: 'AEL-1A-M01', code: 'AEL-1A-M01', nom: 'Logistique de Distribution',                        filiereCode: 'AEL', intervenantId: 'elbahi-younes',         coeff: 2 },
  { id: 'AEL-1A-M02', code: 'AEL-1A-M02', nom: 'Réglementation Logistique et Transport',             filiereCode: 'AEL', intervenantId: 'benhaddou-najib',        coeff: 2 },
  { id: 'AEL-1A-M03', code: 'AEL-1A-M03', nom: 'Statistiques & Mathématiques appliquées',            filiereCode: 'AEL', intervenantId: 'achoui-mostafa',         coeff: 1 },
  { id: 'AEL-1A-M04', code: 'AEL-1A-M04', nom: 'Métier et Formation',                                filiereCode: 'AEL', intervenantId: 'aboutajeddine-farida',   coeff: 2 },
  { id: 'AEL-1A-M05', code: 'AEL-1A-M05', nom: "Fondamentaux de la Logistique et de l'entrepôt",    filiereCode: 'AEL', intervenantId: 'aboutajeddin-faycal',    coeff: 2 },
  { id: 'AEL-1A-M06', code: 'AEL-1A-M06', nom: 'Comptabilité Générale et Analytique',                filiereCode: 'AEL', intervenantId: 'essaf-kaoutar',          coeff: 1 },
  { id: 'AEL-1A-M07', code: 'AEL-1A-M07', nom: 'Fondamentaux Commerce & Marketing',                  filiereCode: 'AEL', intervenantId: 'haloui-mourad',          coeff: 2 },
  { id: 'AEL-1A-M08', code: 'AEL-1A-M08', nom: 'Environnement Web',                                  filiereCode: 'AEL', intervenantId: 'elkhalil-elmoun-badr',   coeff: 2 },
  { id: 'AEL-1A-M09', code: 'AEL-1A-M09', nom: 'Programmation Web & HTML',                           filiereCode: 'AEL', intervenantId: 'elkhalil-elmoun-badr',   coeff: 2 },
  { id: 'AEL-1A-M10', code: 'AEL-1A-M10', nom: 'Marketing Digital',                                  filiereCode: 'AEL', intervenantId: 'hilal-mohamed',          coeff: 2 },
  // ECOM 1A (2024 promo)
  { id: 'ECOM-1A-M01', code: 'ECOM-1A-M01', nom: 'Design Web',                                       filiereCode: 'ECOM', intervenantId: 'lahlou',               coeff: 2 },
  { id: 'ECOM-1A-M02', code: 'ECOM-1A-M02', nom: 'Logistique Inverse et Durabilité',                 filiereCode: 'ECOM', intervenantId: 'elbahi-younes',         coeff: 2 },
  { id: 'ECOM-1A-M03', code: 'ECOM-1A-M03', nom: 'Gestion de Projet',                                filiereCode: 'ECOM', intervenantId: 'hammani-khalid',        coeff: 1 },
  { id: 'ECOM-1A-M04', code: 'ECOM-1A-M04', nom: 'E-Commerce Avancé',                                filiereCode: 'ECOM', intervenantId: 'elmountassir-khalil',   coeff: 2 },
  { id: 'ECOM-1A-M05', code: 'ECOM-1A-M05', nom: 'UX Design',                                        filiereCode: 'ECOM', intervenantId: 'elmountassir-khalil',   coeff: 2 },
  { id: 'ECOM-1A-M06', code: 'ECOM-1A-M06', nom: 'Pilotage de la Performance Logistique',            filiereCode: 'ECOM', intervenantId: 'moutmihi-mohamed',      coeff: 2 },
  // AUTO 1A (2024 promo)
  { id: 'AUTO-1A-M01', code: 'AUTO-1A-M01', nom: 'Métier & Formation',                               filiereCode: 'AUTO', intervenantId: 'darkaoui-abdellah',     coeff: 2 },
  { id: 'AUTO-1A-M02', code: 'AUTO-1A-M02', nom: 'Lecture Documentation Technique',                  filiereCode: 'AUTO', intervenantId: 'darkaoui-abdellah',     coeff: 2 },
  { id: 'AUTO-1A-M03', code: 'AUTO-1A-M03', nom: 'Méthodes et Outils de Diagnostic',                 filiereCode: 'AUTO', intervenantId: 'darkaoui-abdellah',     coeff: 2 },
  { id: 'AUTO-1A-M04', code: 'AUTO-1A-M04', nom: 'Systèmes Électroniques Automobiles',               filiereCode: 'AUTO', intervenantId: 'darkaoui-abdellah',     coeff: 2 },
  // OTM 2A
  { id: 'OTM-2A-M01', code: 'OTM-2A-M01', nom: 'Fiscalité Douanière',                               filiereCode: 'OTM', intervenantId: 'soba-brahim',            coeff: 2 },
  { id: 'OTM-2A-M02', code: 'OTM-2A-M02', nom: 'Logistique Inverse et Durabilité',                  filiereCode: 'OTM', intervenantId: 'elbahi-younes',           coeff: 2 },
  { id: 'OTM-2A-M03', code: 'OTM-2A-M03', nom: 'Gestion de Projet',                                 filiereCode: 'OTM', intervenantId: 'hammani-khalid',          coeff: 1 },
  { id: 'OTM-2A-M04', code: 'OTM-2A-M04', nom: 'Tarification Transport International',              filiereCode: 'OTM', intervenantId: 'ezzahraoui-mohamed',      coeff: 2 },
  { id: 'OTM-2A-M05', code: 'OTM-2A-M05', nom: 'Pilotage de la Performance Logistique',             filiereCode: 'OTM', intervenantId: 'moutmihi-mohamed',        coeff: 2 },
  // OFLP 2A
  { id: 'OFLP-2A-M01', code: 'OFLP-2A-M01', nom: 'Fiscalité Douanière',                             filiereCode: 'OFLP', intervenantId: 'soba-brahim',           coeff: 2 },
  { id: 'OFLP-2A-M02', code: 'OFLP-2A-M02', nom: 'Logistique Inverse et Durabilité',                filiereCode: 'OFLP', intervenantId: 'elbahi-younes',          coeff: 2 },
  { id: 'OFLP-2A-M03', code: 'OFLP-2A-M03', nom: 'Gestion de Projet',                               filiereCode: 'OFLP', intervenantId: 'hammani-khalid',         coeff: 1 },
  { id: 'OFLP-2A-M04', code: 'OFLP-2A-M04', nom: 'Gestion Financière',                              filiereCode: 'OFLP', intervenantId: 'essaf-kaoutar',          coeff: 1 },
  { id: 'OFLP-2A-M05', code: 'OFLP-2A-M05', nom: 'Pilotage de la Performance Logistique',           filiereCode: 'OFLP', intervenantId: 'moutmihi-mohamed',       coeff: 2 },
  // AEL 2A
  { id: 'AEL-2A-M01', code: 'AEL-2A-M01', nom: 'Logistique Inverse et Durabilité',                  filiereCode: 'AEL', intervenantId: 'elbahi-younes',           coeff: 2 },
  { id: 'AEL-2A-M02', code: 'AEL-2A-M02', nom: 'Gestion de Projet',                                 filiereCode: 'AEL', intervenantId: 'hammani-khalid',          coeff: 1 },
  { id: 'AEL-2A-M03', code: 'AEL-2A-M03', nom: 'Gestion Financière',                                filiereCode: 'AEL', intervenantId: 'essaf-kaoutar',           coeff: 1 },
  { id: 'AEL-2A-M04', code: 'AEL-2A-M04', nom: 'Pilotage de la Performance Logistique',             filiereCode: 'AEL', intervenantId: 'moutmihi-mohamed',        coeff: 2 },
  // ECOM 2A
  { id: 'ECOM-2A-M01', code: 'ECOM-2A-M01', nom: 'Design Web',                                      filiereCode: 'ECOM', intervenantId: 'lahlou',                coeff: 2 },
  { id: 'ECOM-2A-M02', code: 'ECOM-2A-M02', nom: 'Logistique Inverse et Durabilité',                filiereCode: 'ECOM', intervenantId: 'elbahi-younes',          coeff: 2 },
  { id: 'ECOM-2A-M03', code: 'ECOM-2A-M03', nom: 'Gestion de Projet',                               filiereCode: 'ECOM', intervenantId: 'hammani-khalid',         coeff: 1 },
  { id: 'ECOM-2A-M04', code: 'ECOM-2A-M04', nom: 'E-Commerce Avancé',                               filiereCode: 'ECOM', intervenantId: 'elmountassir-khalil',    coeff: 2 },
  { id: 'ECOM-2A-M05', code: 'ECOM-2A-M05', nom: 'UX Design',                                       filiereCode: 'ECOM', intervenantId: 'elmountassir-khalil',    coeff: 2 },
  { id: 'ECOM-2A-M06', code: 'ECOM-2A-M06', nom: 'Pilotage de la Performance Logistique',           filiereCode: 'ECOM', intervenantId: 'moutmihi-mohamed',       coeff: 2 },
  // ADEE 2A
  { id: 'ADEE-2A-M01', code: 'ADEE-2A-M01', nom: 'Moteur Thermique',                                filiereCode: 'ADEE', intervenantId: 'darkaoui-abdellah',      coeff: 2 },
  { id: 'ADEE-2A-M02', code: 'ADEE-2A-M02', nom: 'Entretien Véhicules',                             filiereCode: 'ADEE', intervenantId: 'darkaoui-abdellah',      coeff: 2 },
  { id: 'ADEE-2A-M03', code: 'ADEE-2A-M03', nom: 'ADAS – Systèmes Avancés d\'Aide à la Conduite',  filiereCode: 'ADEE', intervenantId: 'darkaoui-abdellah',      coeff: 2 },
  { id: 'ADEE-2A-M04', code: 'ADEE-2A-M04', nom: 'Climatisation Automobile',                        filiereCode: 'ADEE', intervenantId: 'darkaoui-abdellah',      coeff: 2 },
  { id: 'ADEE-2A-M05', code: 'ADEE-2A-M05', nom: 'Logistique Inverse et Durabilité',                filiereCode: 'ADEE', intervenantId: 'elbahi-younes',          coeff: 2 },
];

// ── Évaluations (1 par module par groupe, type moy) ──────────────────
function mkEvals(groupId, moduleIds, annee) {
  return moduleIds.map(mid => ({
    id: `${mid}-${groupId}-moy`,
    moduleId: mid, groupeId: groupId, anneeAcademique: annee,
    type: 'examen_session', coefficient: 1, libelle: 'Moyenne module',
    createdAt: NOW,
  }));
}

const EVALS = [
  ...mkEvals('ts-c-oflp-1a-2025', ['OFLP-1A-M01','OFLP-1A-M02','OFLP-1A-M03','OFLP-1A-M04','OFLP-1A-M05','OFLP-1A-M06'], ANNEE),
  ...mkEvals('ts-d-ael-1a-2025',  ['AEL-1A-M01','AEL-1A-M02','AEL-1A-M03','AEL-1A-M04','AEL-1A-M05','AEL-1A-M06','AEL-1A-M07','AEL-1A-M08','AEL-1A-M09','AEL-1A-M10'], ANNEE),
  ...mkEvals('ts-e-ecom-1a-2024', ['ECOM-1A-M01','ECOM-1A-M02','ECOM-1A-M03','ECOM-1A-M04','ECOM-1A-M05','ECOM-1A-M06'], '2024-2025'),
  ...mkEvals('ts-f-auto-1a-2024', ['AUTO-1A-M01','AUTO-1A-M02','AUTO-1A-M03','AUTO-1A-M04'], '2024-2025'),
  ...mkEvals('ts-a-otm-2a-2025',  ['OTM-2A-M01','OTM-2A-M02','OTM-2A-M03','OTM-2A-M04','OTM-2A-M05'], ANNEE),
  ...mkEvals('ts-b-otm-2a-2025',  ['OTM-2A-M01','OTM-2A-M02','OTM-2A-M03','OTM-2A-M04','OTM-2A-M05'], ANNEE),
  ...mkEvals('ts-c-oflp-2a-2025', ['OFLP-2A-M01','OFLP-2A-M02','OFLP-2A-M03','OFLP-2A-M04','OFLP-2A-M05'], ANNEE),
  ...mkEvals('ts-d-ael-2a-2025',  ['AEL-2A-M01','AEL-2A-M02','AEL-2A-M03','AEL-2A-M04'], ANNEE),
  ...mkEvals('ts-e-ecom-2a-2025', ['ECOM-2A-M01','ECOM-2A-M02','ECOM-2A-M03','ECOM-2A-M04','ECOM-2A-M05','ECOM-2A-M06'], ANNEE),
  ...mkEvals('ts-f-adee-2a-2025', ['ADEE-2A-M01','ADEE-2A-M02','ADEE-2A-M03','ADEE-2A-M04','ADEE-2A-M05'], ANNEE),
];

// ── Apprenants ────────────────────────────────────────────────────────
// Format: [code, cin, nom, prenom, dateNaissance, groupeId]
const STUDENTS = [
  // ── 1A TS.C OFLP (24) ──────────────────────────────────────────
  ['TS0325','JT91569',  'ALAHIANE',      'Jaber',            '2001-08-06','ts-c-oflp-1a-2025'],
  ['TS0283','EA266451', 'BAHOU',         'Bilal',            '2007-12-01','ts-c-oflp-1a-2025'],
  ['TS0370','BL180831', 'BARGACH',       'Youssef',          '2006-09-15','ts-c-oflp-1a-2025'],
  ['TS0313','BM57657',  'BEN ZAINEB',    'Loay',             '2007-10-05','ts-c-oflp-1a-2025'],
  ['TS0327','BW75001',  'BOUAZEF',       'Soukaina',         '2007-08-19','ts-c-oflp-1a-2025'],
  ['TS0377','BW47671',  'CHAMIL',        'El Mahdi',         '2006-07-14','ts-c-oflp-1a-2025'],
  ['TS0367','BK755716', 'DOHAN',         'Zakaria',          '2006-06-30','ts-c-oflp-1a-2025'],
  ['TS0379','BK766269', 'EL ALAOUI',     'Kamal',            '2007-02-15','ts-c-oflp-1a-2025'],
  ['TS0321','L699402',  'EL BARRAK',     'Mohamed',          '2004-06-21','ts-c-oflp-1a-2025'],
  ['TS0309','K632489',  'HANINE',        'Ilias',            '2005-05-28','ts-c-oflp-1a-2025'],
  ['TS0336','GN263861', 'ISMAILI',       'Achraf',           '2008-03-14','ts-c-oflp-1a-2025'],
  ['TS0289','BH655905', 'JALIL',         'Chourouq',         '2007-11-03','ts-c-oflp-1a-2025'],
  ['TS0280','BM50507',  'KAZZAR',        'Hibatallah',       '2008-02-11','ts-c-oflp-1a-2025'],
  ['TS0398','WA343352', 'KHADER',        'Mohamed',          '2006-08-04','ts-c-oflp-1a-2025'],
  ['TS0376','WA364491', 'LABKIRI',       'Douae',            '2007-06-29','ts-c-oflp-1a-2025'],
  ['TS0270','BE951494', 'LOURAOUI',      'Adam',             '2007-03-08','ts-c-oflp-1a-2025'],
  ['TS0271','BB262359', 'MAJID',         'Hajar',            '2007-07-18','ts-c-oflp-1a-2025'],
  ['TS0290','WA360874', 'MARZOUGUI',     'Mohamed-Ali',      '2008-06-03','ts-c-oflp-1a-2025'],
  ['TS0284','BB268104', 'MOUSLIH',       'Maroua',           '2008-03-02','ts-c-oflp-1a-2025'],
  ['TS0269','V390987',  'QUEDDI',        'Islam',            '2006-10-07','ts-c-oflp-1a-2025'],
  ['TS0306','E856480',  'RBAIAI',        'Radouane',         '2007-09-14','ts-c-oflp-1a-2025'],
  ['TS0347','BB267877', 'SAIEDDINE',     'Marwa',            '2007-05-26','ts-c-oflp-1a-2025'],
  ['TS0328','E827411',  'ZAAKOUR',       'Elias',            '2007-11-26','ts-c-oflp-1a-2025'],
  ['TS0375','BK769954', 'ZAIDANI',       'Reda',             '2007-05-17','ts-c-oflp-1a-2025'],
  // ── 1A TS.D AEL (20) ───────────────────────────────────────────
  ['TS0413','WA370607', 'AARAB',         'Aya',              '2007-09-01','ts-d-ael-1a-2025'],
  ['TS0266','BW74613',  'ABASSILE',      'Sanaa',            '2007-08-01','ts-d-ael-1a-2025'],
  ['TS0387','CD947074', 'ABROUK',        'Imad',             '2006-11-15','ts-d-ael-1a-2025'],
  ['TS0391','WA358027', 'ALTIT',         'Hiba',             '2007-10-07','ts-d-ael-1a-2025'],
  ['TS0392','WA357663', 'ALTIT',         'Jihane',           '2008-04-11','ts-d-ael-1a-2025'],
  ['TS0388','WA361949', 'BOUSEHBA',      'Meryem',           '2008-01-06','ts-d-ael-1a-2025'],
  ['TS0305','BW75594',  'EL WAFA',       'Ahde',             '2007-08-22','ts-d-ael-1a-2025'],
  ['TS0382','BW67378',  'EL-ATMANI',     'Anass',            '2006-11-11','ts-d-ael-1a-2025'],
  ['TS0297','WA365255', 'ELAMRI',        'Meryeme',          '2007-12-09','ts-d-ael-1a-2025'],
  ['TS0410','BL181260', 'ETTAOUSSI',     'Mohamed Amine',    '2007-07-19','ts-d-ael-1a-2025'],
  ['TS0304','WA352693', 'GAMMAR',        'Ahlam',            '2007-07-07','ts-d-ael-1a-2025'],
  ['TS0322','WA341972', 'GHANEM',        'Aya',              '2006-09-19','ts-d-ael-1a-2025'],
  ['TS0390','BW64243',  'JOULALY',       'Abderrazzak',      '2005-12-12','ts-d-ael-1a-2025'],
  ['TS0403','BV7941',   'KAROUANI',      'Sara',             '2007-07-27','ts-d-ael-1a-2025'],
  ['TS0312','BA48308',  'LAFNOUNE',      'Mohammed Amine',   '2006-09-09','ts-d-ael-1a-2025'],
  ['TS0396','BW82055',  'LAKHILI',       'Aya',              '2007-11-19','ts-d-ael-1a-2025'],
  ['TS0281','Y539806',  'MAJDI',         'Lina',             '2007-04-25','ts-d-ael-1a-2025'],
  ['TS0402','BW81750',  'NZOULOU',       'Safaa',            '2007-03-19','ts-d-ael-1a-2025'],
  ['TS0361','BB212402', 'RIZAOUI',       'Douaa',            '2007-12-26','ts-d-ael-1a-2025'],
  ['TS0411','BW75999',  'STELLINO HAFID','Nour',             '2006-08-27','ts-d-ael-1a-2025'],
  // ── TS.E ECOM 1A promo 2024 (maintenant 2A Gr.E) ───────────────
  ['TS0194','WA355117', 'BOUKARCHA',     'Ayman',            '2006-06-22','ts-e-ecom-2a-2025'],
  ['TS0152','AE335109', 'CHAFKI',        'Ibtihal',          '2005-07-22','ts-e-ecom-2a-2025'],
  ['TS0161','W473610',  'CHANGUITI',     'Hibatallah',       '2007-02-19','ts-e-ecom-2a-2025'],
  ['TS0265','A03241828','DIOP',          'Omar',             '1999-12-24','ts-e-ecom-2a-2025'],
  ['TS0254','BW58200',  'EL AMRAOUI',    'Mohamed Iyad',     '2006-05-18','ts-e-ecom-2a-2025'],
  ['TS0245','Q365298',  'EL GAMH',       'Zakariya',         '2004-10-23','ts-e-ecom-2a-2025'],
  ['TS0201','WA341135', 'EL HOUARI',     'Salma',            '2006-12-20','ts-e-ecom-2a-2025'],
  ['TS0137','WA315090', 'EL-ADNANY',     'Othmane',          '2005-03-20','ts-e-ecom-2a-2025'],
  ['TS0256','BW67531',  'EL-MADHOUN',    'Ayoub',            '2006-11-25','ts-e-ecom-2a-2025'],
  ['TS0247','WA347851', 'HADDOUCH',      'Anas',             '2005-04-22','ts-e-ecom-2a-2025'],
  ['TS0169','MJ21006',  'HAFIDI',        'Elmehdi',          '2005-10-15','ts-e-ecom-2a-2025'],
  ['TS0221','BW75696',  'HANINE DAOUDI', 'Mohamed',          '2006-06-27','ts-e-ecom-2a-2025'],
  ['TS0241','M688765',  'HAWAD',         'Imad-Eddine',      '2006-05-03','ts-e-ecom-2a-2025'],
  ['TS0199','JB534487', 'LOUIK',         'Amine',            '2003-10-26','ts-e-ecom-2a-2025'],
  ['TS0166','BW66736',  'LOULIJAT',      'Fatima-Zahraa',    '2007-01-12','ts-e-ecom-2a-2025'],
  ['TS0235','IC194466', 'NACIRI',        'Abderrahman',      '2007-03-12','ts-e-ecom-2a-2025'],
  ['TS0224','WA345893', 'NAIM',          'Yahya',            '2005-07-13','ts-e-ecom-2a-2025'],
  ['TS0234','BW55722',  'SELLAMI',       'Ghita',            '2006-02-22','ts-e-ecom-2a-2025'],
  ['TS0266','BW68838',  'BRKA',          'Anwar',            '2006-12-09','ts-e-ecom-2a-2025'], // code conflict handled below
  // ── TS.F AUTO 1A promo 2024 (maintenant 2A Gr.F ADEE) ──────────
  ['TS0362','BW55145',  'ABDOU',         'Ali',              '2005-10-17','ts-f-adee-2a-2025'],
  ['TS0416','M717006',  'ABOUDOU',       'Anas',             '2007-11-09','ts-f-adee-2a-2025'],
  ['TS0372','X452849',  'AKLAF',         'Ilyass',           '2006-03-08','ts-f-adee-2a-2025'],
  ['TS0414','BW46963',  'AL HIANE',      'Zakaria',          '2005-01-07','ts-f-adee-2a-2025'],
  ['TS0369','P397495',  'ASSABANE',      'Amine',            '2007-12-18','ts-f-adee-2a-2025'],
  ['TS0415','BA51358',  'ASSILI',        'Aymane',           '2007-05-31','ts-f-adee-2a-2025'],
  ['TS0330','M703742',  'BELAGMIRI',     'Adnan',            '2007-08-07','ts-f-adee-2a-2025'],
  ['TS0389','T362179',  'BOUCHFIRA',     'Isshak',           '2008-01-14','ts-f-adee-2a-2025'],
  ['TS0399','Z709796',  'DIYANE',        'Amine',            '2007-06-26','ts-f-adee-2a-2025'],
  ['TS0349','JT93389',  'DJAJA',         'Khalid',           '2001-12-03','ts-f-adee-2a-2025'],
  ['TS0406','AM18820',  'EL FATHI',      'Mohamed',          '2007-04-11','ts-f-adee-2a-2025'],
  ['TS0323','BK754428', 'FADEL',         'Abdelilah',        '2007-07-24','ts-f-adee-2a-2025'],
  ['TS0385','WA341398', 'FEKKAR',        'Salaheddine',      '2005-07-22','ts-f-adee-2a-2025'],
  ['TS0386','WA325772', 'FETTAH',        'Walid',            '2005-06-01','ts-f-adee-2a-2025'],
  ['TS0288','DI29549',  'GHADDOU',       'Mahmoud',          '2007-08-06','ts-f-adee-2a-2025'],
  ['TS0314','BE946237', 'GHIGHA',        'Imrane El Khalil', '2007-09-21','ts-f-adee-2a-2025'],
  ['TS0412','WA361193', 'HAJJI',         'Reda',             '2007-03-05','ts-f-adee-2a-2025'],
  ['TS0381','MC343484', 'HINI',          'Achraf',           '2007-11-18','ts-f-adee-2a-2025'],
  ['TS0408','W472643',  'LAAFIA',        'Mohamed',          '2006-01-04','ts-f-adee-2a-2025'],
  ['TS0267','AM1380',   'LICHIOUI',      'Soufiane',         '2006-12-20','ts-f-adee-2a-2025'],
  ['TS0356','BA56550',  'LOTFI',         'Hicham',           '2006-02-28','ts-f-adee-2a-2025'],
  ['TS0371','M713696',  'M\'BARKY',      'Rayane',           '2007-08-17','ts-f-adee-2a-2025'],
  ['TS0332','Z701765',  'NADIR',         'Hamza',            '2007-07-21','ts-f-adee-2a-2025'],
  ['TS0394','BB213993', 'NAJIH',         'Ilyass',           '2007-03-23','ts-f-adee-2a-2025'],
  ['TS0409','W487012',  'NOUREDDINE',    'Abdelhakim',       '2006-02-06','ts-f-adee-2a-2025'],
  ['TS0339','EA240013', 'QARDOUCH',      'Saad',             '2003-02-26','ts-f-adee-2a-2025'],
  ['TS0296','WA355838', 'RGUIBI',        'El Mehdi',         '2007-11-25','ts-f-adee-2a-2025'],
  ['TS0344','BK725248', 'ROUHI',         'Ikram',            '2002-07-06','ts-f-adee-2a-2025'],
  ['TS0303','EC90679',  'STAILI',        'Anas',             '2006-03-01','ts-f-adee-2a-2025'],
  ['TS0326','BJ495306', 'TOUHAFI',       'Omar',             '2006-12-13','ts-f-adee-2a-2025'],
  // ── 2A Gr.A OTM (26) ───────────────────────────────────────────
  ['TS0172','K589469',  'ABDAIMI',       'Fadi',             '2006-07-07','ts-a-otm-2a-2025'],
  ['TS0186','WA335368', 'AOMARI',        'Oumaima',          '2004-09-12','ts-a-otm-2a-2025'],
  ['TS0138','BA22844',  'BASTI',         'Reda',             '2006-03-15','ts-a-otm-2a-2025'],
  ['TS0203','ID134203', 'BENDIF',        'Soumia',           '2006-04-02','ts-a-otm-2a-2025'],
  ['TS0150','EE895860', 'EL AINOUSSE',   'Houssam',          '2005-06-14','ts-a-otm-2a-2025'],
  ['TS0126','WA354139', 'EL HRISSI',     'Adam',             '2006-08-09','ts-a-otm-2a-2025'],
  ['TS0184','BF26775',  'EL MOUDENE',    'Niama',            '2006-07-16','ts-a-otm-2a-2025'],
  ['TS0139','BB235467', 'ELGHALAME',     'Othmane',          '2003-12-04','ts-a-otm-2a-2025'],
  ['TS0132','WA342813', 'ENNAJI',        'Merieme',          '2006-10-09','ts-a-otm-2a-2025'],
  ['TS0145','JA206763', 'GAGUA',         'Ilyas',            '2006-08-03','ts-a-otm-2a-2025'],
  ['TS0148','BW40461',  'HAYAR',         'Othman',           '2004-03-22','ts-a-otm-2a-2025'],
  ['TS0180','MC333190', 'HOUSNI',        'Anas',             '2006-05-04','ts-a-otm-2a-2025'],
  ['TS0133','BA51200',  'IGOURZAL',      'Imrane',           '2006-07-07','ts-a-otm-2a-2025'],
  ['TS0147','BA52843',  'JEBBAR',        'Alaa',             '2006-08-16','ts-a-otm-2a-2025'],
  ['TS0128','HH92407',  'JEROUANE',      'Abdelouafi',       '2006-03-27','ts-a-otm-2a-2025'],
  ['TS0122','WA340994', 'KARAM',         'Yasser',           '2006-04-13','ts-a-otm-2a-2025'],
  ['TS0146','WA346444', 'KHOULD',        'Dounia',           '2006-11-26','ts-a-otm-2a-2025'],
  ['TS0183','DM3101',   'LAGROUH',       'Douae',            '2007-02-06','ts-a-otm-2a-2025'],
  ['TS0260','BH646353', 'MOUHTADI',      'Lamyaa',           '2004-05-20','ts-a-otm-2a-2025'],
  ['TS0160','IC194396', 'QAHIR',         'Mohamed',          '2006-10-22','ts-a-otm-2a-2025'],
  ['TS0131','BK746058', 'RAKHIS',        'Malak',            '2005-07-25','ts-a-otm-2a-2025'],
  ['TS0129','ZT323512', 'RAMI',          'El Mehdi',         '2006-01-03','ts-a-otm-2a-2025'],
  ['TS0238','M671690',  'SAKRAOUI',      'Ahmed-El Mahdi',   '2004-10-04','ts-a-otm-2a-2025'],
  ['TS0215','WA347403', 'SAMIR',         'Rayane',           '2007-07-21','ts-a-otm-2a-2025'],
  ['TS0134','X397228',  'WAHIB',         'Mohamed Taha',     '2003-03-08','ts-a-otm-2a-2025'],
  ['TS0255','BL182199', 'WAKRIM',        'Aya',              '2006-04-06','ts-a-otm-2a-2025'],
  // ── 2A Gr.B OTM (26) ───────────────────────────────────────────
  ['TS0217','BB246071', 'ABERKOUKS',     'Maria',            '2006-01-21','ts-b-otm-2a-2025'],
  ['TS0157','JB535197', 'AIT RAIS',      'Zakaria',          '2006-01-30','ts-b-otm-2a-2025'],
  ['TS0197','GI25011',  'BELAICH',       'Jihane',           '2006-05-28','ts-b-otm-2a-2025'],
  ['TS0141','BW66965',  'BENAMEUR',      'El Youbi Wissal',  '2006-07-16','ts-b-otm-2a-2025'],
  ['TS0237','BJ490564', 'BERBAR',        'Abderahman',       '2005-09-20','ts-b-otm-2a-2025'],
  ['TS0127','BW57636',  'BIKRA',         'Yasmine',          '2006-08-19','ts-b-otm-2a-2025'],
  ['TS0140','BW12442',  'BOUKHLAL',      'Hiba Allah',       '2005-01-13','ts-b-otm-2a-2025'],
  ['TS0231','LB269715', 'BOUKIRI',       'Salma',            '2006-01-14','ts-b-otm-2a-2025'],
  ['TS0257','BB211409', 'DERKAOUI',      'Taha',             '2004-04-16','ts-b-otm-2a-2025'],
  ['TS0226','BW68989',  'EL KHADIR',     'Hiba',             '2007-02-22','ts-b-otm-2a-2025'],
  ['TS0263','BJ494117', 'ERRAFII',       'Soufiane',         '2005-12-05','ts-b-otm-2a-2025'],
  ['TS0192','AR802483', 'FAWZI',         'Aiman',            '2005-03-31','ts-b-otm-2a-2025'],
  ['TS0181','BB256750', 'HAMDAOUI',      'Hamza',            '2005-11-27','ts-b-otm-2a-2025'],
  ['TS0259','AS23333',  'HANOUCHA',      'Achraf',           '2004-09-16','ts-b-otm-2a-2025'],
  ['TS0207','J589330',  'KARBID',        'Salma',            '2006-05-02','ts-b-otm-2a-2025'],
  ['TS0165','U218130',  'KARFAL',        'Mohamed Amine',    '2006-01-24','ts-b-otm-2a-2025'],
  ['TS0250','BW50576',  'KARIMINE',      'Hasnae',           '2005-09-15','ts-b-otm-2a-2025'],
  ['TS0220','BJ503180', 'LOUZI',         'Imrane',           '2006-07-25','ts-b-otm-2a-2025'],
  ['TS0136','EE656093', 'MARC',          'Anouar',           '2002-07-14','ts-b-otm-2a-2025'],
  ['TS0187','BW56874',  'MOUBTAHIJ',     'Houssam',          '2005-12-08','ts-b-otm-2a-2025'],
  ['TS0142','BW71836',  'MZOUMI',        'Douae',            '2006-11-30','ts-b-otm-2a-2025'],
  ['TS0188','AM3859',   'NADIR',         'Adam',             '2005-03-09','ts-b-otm-2a-2025'],
  ['TS0154','BW52072',  'SABIR',         'Ahmed Rayane',     '2006-04-29','ts-b-otm-2a-2025'],
  ['TS0240','BB246335', 'SEBBAR',        'Mouad',            '2006-03-10','ts-b-otm-2a-2025'],
  ['TS0175','BW56175',  'TINERT',        'Ilyass',           '2006-07-15','ts-b-otm-2a-2025'],
  ['TS0200','P397086',  'ZARROUQ',       'Manale',           '2005-10-18','ts-b-otm-2a-2025'],
  // ── 2A Gr.C OFLP (26) ──────────────────────────────────────────
  ['TS0193','WA345296', 'AAZIM',         'Walid',            '2005-10-10','ts-c-oflp-2a-2025'],
  ['TS0210','BH648623', 'ABOUSSAD',      'Hafsa',            '2005-10-06','ts-c-oflp-2a-2025'],
  ['TS0125','WA352058', 'AIT LAMINE',    'Hamza',            '2006-03-02','ts-c-oflp-2a-2025'],
  ['TS0236','QA204331', 'BENAOUAMA',     'Maryem',           '2005-11-06','ts-c-oflp-2a-2025'],
  ['TS0123','WA354921', 'BENLECHGAR',    'Wahiba',           '2006-11-12','ts-c-oflp-2a-2025'],
  ['TS0149','AY29161',  'CHAFII',        'Riad',             '2007-02-11','ts-c-oflp-2a-2025'],
  ['TS0206','JT112879', 'CHAIB',         'Bader',            '2004-01-25','ts-c-oflp-2a-2025'],
  ['TS0163','WA339042', 'CHOKHMANE',     'Aymen',            '2005-07-16','ts-c-oflp-2a-2025'],
  ['TS0222','BJ500423', 'DOFRY',         'Yassine',          '2006-07-17','ts-c-oflp-2a-2025'],
  ['TS0156','WA341131', 'EL-MENIAR',     'Yassine',          '2006-01-13','ts-c-oflp-2a-2025'],
  ['TS0248','BW61678',  'ELKHAYAT',      'Abdelhak',         '2005-05-04','ts-c-oflp-2a-2025'],
  ['TS0143','SH220269', 'ELKOTBI',       'Ayoub',            '2004-09-10','ts-c-oflp-2a-2025'],
  ['TS0135','WA347400', 'ELMENTAGUY',    'Laila',            '2006-06-19','ts-c-oflp-2a-2025'],
  ['TS0144','WA284499', 'FAWZI',         'Marwa',            '2005-09-09','ts-c-oflp-2a-2025'],
  ['TS0177','BW74505',  'HASSIOUI',      'Islam',            '2006-08-03','ts-c-oflp-2a-2025'],
  ['TS0191','WA307895', 'HILAL',         'Othmane',          '2007-02-23','ts-c-oflp-2a-2025'],
  ['TS0242','BA51140',  'KABIL',         'Hiba',             '2007-01-05','ts-c-oflp-2a-2025'],
  ['TS0232','WA341221', 'KAFIL',         'Doaa',             '2006-08-24','ts-c-oflp-2a-2025'],
  ['TS0209','Z684004',  'LASFAR',        'Wissam',           '2004-03-30','ts-c-oflp-2a-2025'],
  ['TS0179','WA338963', 'LEMKHAIFI',     'Abdelfattah',      '2006-05-21','ts-c-oflp-2a-2025'],
  ['TS0173','W497815',  'SAIF EDDINE',   'Fahd',             '2006-08-30','ts-c-oflp-2a-2025'],
  ['TS0162','BK756608', 'SEHB',          'Mohamed Amine',    '2006-12-18','ts-c-oflp-2a-2025'],
  ['TS0216','BB255127', 'SRATEL',        'Zouhair',          '2006-07-09','ts-c-oflp-2a-2025'],
  ['TS0252','EA269422', 'TAOUSSI',       'Noura',            '2007-04-08','ts-c-oflp-2a-2025'],
  ['TS0227','WA331045', 'TOUMI',         'Manal',            '2005-05-08','ts-c-oflp-2a-2025'],
  ['TS0202','BE943379', 'WAHID',         'Anass',            '2007-05-17','ts-c-oflp-2a-2025'],
  // ── 2A Gr.D AEL (27) ───────────────────────────────────────────
  ['TS0212','EE878497', 'AGABTI',        'Youssef',          '2005-08-21','ts-d-ael-2a-2025'],
  ['TS0178','SL23738',  'ASSEMLAL',      'Kawthar',          '2006-10-22','ts-d-ael-2a-2025'],
  ['TS0196','EA268237', 'BENKHADA',      'Narjiss',          '2006-11-10','ts-d-ael-2a-2025'],
  ['TS0204','JH102277', 'BENTANJI',      'Chaima',           '2005-07-20','ts-d-ael-2a-2025'],
  ['TS0198','WA347612', 'BERRAZAM',      'Walid',            '2006-07-04','ts-d-ael-2a-2025'],
  ['TS0182','BW57890',  'BOUGHOU',       'Zakaria',          '2006-07-26','ts-d-ael-2a-2025'],
  ['TS0205','BL179855', 'BOUZIRI',       'Adam',             '2005-07-15','ts-d-ael-2a-2025'],
  ['TS0244','AE339993', 'CHELLIQ',       'Anas',             '2006-09-24','ts-d-ael-2a-2025'],
  ['TS0153','BB249292', 'ECH-CHARQY',    'Safaa',            '2006-04-19','ts-d-ael-2a-2025'],
  ['TS0155','BW72679',  'EL KABIL',      'Amine',            '2006-04-10','ts-d-ael-2a-2025'],
  ['TS0158','JA204531', 'EL MOUATAMID',  'Aymane',           '2005-10-07','ts-d-ael-2a-2025'],
  ['TS0230','BW60726',  'EZARADI',       'Amine',            '2005-05-27','ts-d-ael-2a-2025'],
  ['TS0225','V393889',  'GHILANI',       'Malak',            '2005-11-12','ts-d-ael-2a-2025'],
  ['TS0219','E823194',  'HACHADI',       'Malak',            '2006-05-06','ts-d-ael-2a-2025'],
  ['TS0233','BJ502130', 'HACHMANI',      'Adam',             '2006-04-21','ts-d-ael-2a-2025'],
  ['TS0174','BW67084',  'HADRI',         'Jannate',          '2007-02-12','ts-d-ael-2a-2025'],
  ['TS0243','BH651537', 'JEMMI',         'Oussama',          '2006-01-07','ts-d-ael-2a-2025'],
  ['TS0117','WA344381', 'KHOUBBANE',     'Fatima-Zahraa',    '2004-10-27','ts-d-ael-2a-2025'],
  ['TS0214','BE906348', 'LAKRATTE',      'Yassine',          '2004-03-30','ts-d-ael-2a-2025'],
  ['TS0249','BW58535',  'NAFII',         'Mouhssine',        '2005-06-14','ts-d-ael-2a-2025'],
  ['TS0130','P388226',  'OUCHEN',        'Zakariae',         '2005-05-25','ts-d-ael-2a-2025'],
  ['TS0223','BW5099',   'OUTASS',        'Mehdi',            '2001-03-01','ts-d-ael-2a-2025'],
  ['TS0159','JB522885', 'OUTLIOUA',      'Othman',           '2003-10-09','ts-d-ael-2a-2025'],
  ['TS0124','BW59748',  'RADI',          'Doha',             '2005-01-02','ts-d-ael-2a-2025'],
  ['TS0211','BW62157',  'SAMIME',        'Naoufal',          '2006-03-27','ts-d-ael-2a-2025'],
  ['TS0170','T348843',  'TALEB',         'Youssef Seddik',   '2007-02-27','ts-d-ael-2a-2025'],
  ['TS0189','M704483',  'TARBAOUI',      'Bilal',            '2006-06-08','ts-d-ael-2a-2025'],
  // ── 2A Gr.F ADEE (18) ─────────────────────────────────────────
  ['TS0229','AS29190',  'ABOUSSD',       'Mohammed',         '2005-11-09','ts-f-adee-2a-2025'],
  ['TS0258','X436656',  'AIDI',          'Ayoub',            '2003-03-07','ts-f-adee-2a-2025'],
  ['TS0213','WA327740', 'AMAKRANE',      'Mouad',            '2006-10-07','ts-f-adee-2a-2025'],
  ['TS0195','BM47893',  'BOUGARNE',      'Chamseddine',      '2006-01-05','ts-f-adee-2a-2025'],
  ['TS0264','BK705105', 'BOUNAJI',       'Zakaria',          '2002-04-27','ts-f-adee-2a-2025'],
  ['TS0164','U212030',  'BOUTHIR',       'Mohamed',          '2003-06-18','ts-f-adee-2a-2025'],
  ['TS0246','W478052',  'ELHAIMER',      'Hamza',            '2003-11-09','ts-f-adee-2a-2025'],
  ['TS0167','P391794',  'HABACHY',       'Rayan',            '2006-05-27','ts-f-adee-2a-2025'],
  ['TS0171','BB249666', 'HAMANI',        'Mostafa',          '2005-05-16','ts-f-adee-2a-2025'],
  ['TS0151','JE324597', 'HAMMOUCH',      'Lahoucine',        '2004-11-27','ts-f-adee-2a-2025'],
  ['TS0239','W491066',  'HAMRITI',       'Abderrahmane-Bichara','2006-03-23','ts-f-adee-2a-2025'],
  ['TS0208','IC187589', 'HIRT',          'Abdel-Ilah',       '2005-05-21','ts-f-adee-2a-2025'],
  ['TS0262','WA324355', 'JOUIRA',        'Mohcine',          '2006-07-28','ts-f-adee-2a-2025'],
  ['TS0253','WA332043', 'LABDAOUI',      'Anas',             '2005-01-13','ts-f-adee-2a-2025'],
  ['TS0228','Q377662',  'MOUAYCHE',      'Rida',             '2006-05-15','ts-f-adee-2a-2025'],
  ['TS0185','BW71241',  'OTMANE',        'Badreddine',       '2006-08-31','ts-f-adee-2a-2025'],
  ['TS0261','BH633856', 'SBARHI',        'Mohammed Khalil',  '2005-01-02','ts-f-adee-2a-2025'],
  ['TS0251','EE878023', 'ZAHRAN',        'Mustapha',         '2004-09-08','ts-f-adee-2a-2025'],
];

// ── Notes par groupe ─────────────────────────────────────────────────
// Format: { [studentCode]: [m1, m2, m3, m4, m5, m6?] }
// null = absent

const NOTES_1A_OFLP = {
  'TS0325': [0.00,  13.80, 13.80,  4.00, 16.36, 16.70],
  'TS0283': [11.20, 12.80, 12.00, 18.67, 14.09, 15.70],
  'TS0370': [11.60, 11.20, 12.60, 15.33, 14.09, 12.00],
  'TS0313': [12.80, 15.00, 12.40, 17.33, 10.00, 13.25],
  'TS0327': [12.20, 14.20, 10.00, 13.33, 10.91, 15.50],
  'TS0377': [12.20, 13.60, 10.00, 17.33, 14.09, 14.90],
  'TS0367': [12.40, 12.60, 10.00, 16.00, 10.91,  6.60],
  'TS0379': [12.20, 10.00, 10.00, 16.67, 13.64, 14.15],
  'TS0321': [13.20, 11.60, 13.60, 18.67,  9.55, 13.90],
  'TS0309': [11.60, 12.00,  7.80, 18.67, 13.18, 14.90],
  'TS0336': [11.20, 10.60, 10.80, 13.33,  8.18, 15.20],
  'TS0289': [11.60, 13.60, 13.60, 18.00,  8.64, 11.20],
  'TS0280': [11.80, 14.80, 10.00, 13.33,  8.18, 13.40],
  'TS0398': [11.80, 13.80, 10.00, 14.67,  7.27, 15.30],
  'TS0376': [12.20, 14.60, 11.20, 14.67, 12.73, 13.90],
  'TS0270': [12.40,  7.80, 10.00, 16.00, 14.09, 13.75],
  'TS0271': [11.80, 16.20, 12.20, 14.67, 15.45, 15.85],
  'TS0290': [12.20, 15.20, 11.60, 12.00,  9.55, 10.30],
  'TS0284': [13.00, 15.20, 12.40, 11.33, 10.00, 14.90],
  'TS0269': [ 0.00, 15.40, 17.00, 16.00, 14.55, 16.35],
  'TS0306': [14.00, 13.40, 16.20, 16.67, 15.91, 16.55],
  'TS0347': [14.00, 15.80, 13.50, 14.00, 11.82, 15.20],
  'TS0328': [10.80, 11.80, 10.00,  6.67,  7.73,  8.40],
  'TS0375': [12.00, 12.80, 10.00, 14.00,  9.09, 11.30],
};

const NOTES_1A_AEL = {
  'TS0413': [12.00, 14.80, 13.20,  8.67,  4.55, 15.55, 15.40, 11.75,  6.70, 16.80],
  'TS0266': [10.60, 14.60, 14.40, 15.33,  9.09, 15.80, 16.60, 17.25,  9.72, 20.00],
  'TS0387': [ 0.00, 16.00, 15.60, 12.67,  3.64, 11.50, 13.30, 19.25,  7.74, 18.20],
  'TS0391': [ 9.00, 14.60, 10.80,  8.00,  7.73, 14.40, 14.10, 15.50,  8.91, 16.80],
  'TS0392': [ 9.00, 16.40, 11.20,  7.33, 10.45, 10.00, 13.10, 15.50,  9.24, 18.80],
  'TS0388': [10.00, 16.00, 10.80, 10.67,  5.00,  3.80,  0.00, 10.75,  2.00,  null],
  'TS0305': [13.60, 15.60, 10.00, 15.33,  8.64, 14.10, 15.20, 16.00, 12.02, 19.40],
  'TS0382': [15.00, 14.40, 12.60, 17.33, 12.27, 12.70, 13.00, 16.00, 12.75, 18.20],
  'TS0297': [ 9.60, 16.40, 16.80, 17.33, 15.00, 16.00, 16.70, 16.00, 13.00, 18.20],
  'TS0410': [11.20, 15.80, 13.40,  9.33, 10.45, 13.50, 14.80, 20.00,  9.36, 16.40],
  'TS0304': [10.20, 12.20,  7.00,  9.33,  8.18,  6.80, 12.40, 18.50,  8.49, 15.80],
  'TS0322': [11.20, 16.00, 10.40,  7.33, 11.36, 15.80, 16.10, 17.75, 11.02, 20.00],
  'TS0390': [10.80, 10.00, 12.60,  5.33,  8.18, 15.40, 15.20, 16.00, 10.39, 15.80],
  'TS0403': [11.60, 13.00, 11.40, 12.00,  8.64, 10.00, 13.90, 15.25,  8.78, 17.60],
  'TS0312': [12.00, 15.20, 14.20, 16.67,  9.55, 14.55, 14.20, 15.00,  9.84, 17.60],
  'TS0396': [12.40, 16.00, 10.00, 10.67,  9.55, 14.60, 14.30, 16.00, 10.00, 18.80],
  'TS0281': [ 9.40, 16.00, 12.00, 14.00, 10.91, 16.20, 14.70, 17.50, 10.47, 17.60],
  'TS0402': [12.80, 15.40, 11.20, 12.67,  6.82, 12.00, 16.40, 17.00,  7.01, 20.00],
  'TS0361': [11.20, 17.00, 12.20, 15.33, 12.27, 15.70, 14.60, 20.00, 11.21, 20.00],
  'TS0411': [13.40, 16.80, 17.20, 11.33,  8.18, 16.00, 14.40, 18.50,  9.15, 17.60],
};

// modules for ECOM 1A (TS.E / Gr.E)
const NOTES_ECOM_1A = {
  'TS0194': [13.40, 12.00, 12.00, 18.00, 17.90,  6.80],
  'TS0152': [13.20, 13.40, 12.00, 18.00, 17.90, 6.70],
  'TS0161': [13.40, 13.20, 13.20, 16.20, 18.80,  5.80],
  'TS0265': [13.60, 13.40, 12.00, 16.20, 18.80,  7.20],
  'TS0254': [12.60, 10.40, 10.00, 16.20, 14.80,  null],
  'TS0245': [12.80, 10.00, 10.80, 12.80, 14.50,  5.40],
  'TS0201': [13.60, 11.60, 13.50, 17.00, 15.00,  null],
  'TS0137': [12.00, 13.80, 12.60, 13.75, 16.50,  null],
  'TS0256': [13.20, 10.00,  2.40, 10.50,  null,  null],
  'TS0247': [14.60, 15.80, 13.80, 18.00, 17.20,  5.30],
  'TS0169': [11.60, 10.20, 11.40, 12.80, 12.50,  null],
  'TS0221': [13.20, 10.00, 10.00, 12.80, 15.40,  6.40],
  'TS0241': [14.60, 12.80, 13.00, 16.20, 17.60,  7.70],
  'TS0199': [14.60, 11.80, 14.80, 16.20, 14.20,  4.40],
  'TS0166': [13.60, 16.40, 14.50, 18.00, 15.90, 10.80],
  'TS0235': [13.60, 12.40, 14.20, 16.20, 17.40, 10.80],
  'TS0224': [12.00,  0.00,  7.60,  7.00,  1.80,  null],
  'TS0234': [13.60, 14.80, 12.60, 18.00, 17.60, 10.00],
  'TS0266': [12.60, 10.00, 12.60, 12.80, 16.40,  null], // BRKA
};

// AUTO 1A (TS.F) – 4 modules
const NOTES_AUTO_1A = {
  'TS0362': [ 5.00,  5.00,  8.25, 12.50],
  'TS0416': [ 0.00,  0.00,  2.25, 14.50],
  'TS0372': [18.00, 17.50, 19.50, 19.50],
  'TS0414': [ 0.00,  1.00,  4.50,  0.00],
  'TS0369': [13.50, 18.00, 12.50, 14.50],
  'TS0415': [ 0.00,  0.00, 13.50, 16.50],
  'TS0330': [ 0.00,  2.00,  7.25, 16.00],
  'TS0389': [ 5.50,  5.00,  7.25, 16.00],
  'TS0399': [10.00,  8.00, 13.25, 16.50],
  'TS0349': [18.00, 19.50, 15.25, 18.00],
  'TS0406': [17.00, 18.50, 11.50, 16.00],
  'TS0323': [19.00, 11.50, 14.00, 14.00],
  'TS0385': [ 3.00,  2.50, 12.00, 13.50],
  'TS0386': [ 4.00,  0.00,  5.50, 11.50],
  'TS0288': [ 3.50,  3.50,  0.00,  6.00],
  'TS0314': [ 0.00,  0.00,  0.00,  0.00],
  'TS0412': [ 0.00,  6.50,  7.25, 15.50],
  'TS0381': [ 6.50,  3.00,  9.00, 10.00],
  'TS0408': [10.00, 15.00,  8.75,  8.50],
  'TS0267': [14.00,  6.00, 10.00, 12.50],
  'TS0356': [11.00, 15.50, 16.00, 16.00],
  'TS0371': [ 5.00,  5.00,  3.75,  3.50],
  'TS0332': [ 6.00, 16.50, 12.50,  8.00],
  'TS0394': [12.00, 15.50, 10.00, 11.50],
  'TS0409': [11.00, 18.00, 14.00, 17.00],
  'TS0339': [20.00, 15.00, 17.75, 18.00],
  'TS0296': [ 7.50,  4.50,  3.25,  9.00],
  'TS0344': [12.00, 18.50,  7.50, 13.50],
  'TS0303': [15.00, 18.75, 17.00, 17.50],
  'TS0326': [11.00, 12.50, 11.50, 14.00],
};

// OTM 2A (Gr.A et Gr.B) – 5 modules
const NOTES_OTM_2A_A = {
  'TS0172': [12.00, 11.20,  3.00, 15.60,  6.75],
  'TS0186': [11.70, 15.40, 10.40, 15.60,  4.75],
  'TS0138': [ 0.00,  0.00,  0.00,  0.00,  null],
  'TS0203': [14.30, 14.20, 14.30, 13.60, 14.00],
  'TS0150': [15.40, 15.00, 14.60, 14.00, 11.50],
  'TS0126': [12.70, 12.00, 11.60, 15.75,  null],
  'TS0184': [14.80, 13.40, 12.60, 13.60,  6.50],
  'TS0139': [12.80, 10.40, 10.00, 12.60,  null],
  'TS0132': [14.40, 15.60, 14.30, 14.00, 18.00],
  'TS0145': [15.30, 14.20, 13.20, 13.60, 13.25],
  'TS0148': [ 7.25, 10.40,  6.80,  5.00,  null],
  'TS0180': [12.30, 13.60, 10.00, 14.60, 15.50],
  'TS0133': [10.00, 10.00, 10.00, 14.00, 11.00],
  'TS0147': [15.40, 14.60, 15.20, 14.00, 13.50],
  'TS0128': [13.80, 10.20, 10.20, 13.60,  8.00],
  'TS0122': [13.80, 14.40, 14.00, 13.40, 17.50],
  'TS0146': [15.00, 14.00, 10.00, 14.00, 13.00],
  'TS0183': [10.00, 10.00, 10.40, 12.50,  null],
  'TS0260': [13.90, 11.40,  6.80, 12.00,  7.75],
  'TS0160': [18.00, 12.40, 11.90, 13.60, 11.75],
  'TS0131': [17.70, 16.00, 14.60, 14.60, 13.50],
  'TS0129': [13.60, 10.40, 10.20, 15.20, 11.75],
  'TS0238': [16.30, 11.40, 11.60, 14.00, 10.00],
  'TS0215': [15.20, 15.40, 10.00,  null,  null],
  'TS0134': [14.00, 12.60, 10.80, 10.50,  null],
  'TS0255': [10.00, 13.20,  6.80, 11.00,  null],
};

const NOTES_OTM_2A_B = {
  'TS0217': [11.90, 11.40, 14.00, 13.60, 10.00],
  'TS0157': [ 4.70, 10.00, 10.40, 14.60,  3.75],
  'TS0197': [15.60, 12.40, 14.70, 14.60,  9.50],
  'TS0141': [14.20, 14.40, 13.80, 12.00,  null],
  'TS0237': [12.70, 10.00, 11.60, 12.50,  null],
  'TS0127': [14.90, 13.60, 12.50, 13.00, 14.50],
  'TS0140': [13.80, 13.60, 12.00, 12.00, 13.00],
  'TS0231': [10.90, 12.20, 12.80, 11.60,  5.00],
  'TS0257': [10.00, 10.00, 12.20, 13.00,  9.00],
  'TS0226': [15.50, 13.20, 14.30, 13.00, 12.50],
  'TS0263': [10.00, 11.40, 13.70,  0.00,  4.75],
  'TS0192': [12.10, 11.20, 13.80, 14.60, 13.50],
  'TS0181': [10.00,  3.00, 10.40,  0.00,  null],
  'TS0259': [ 0.00,  0.00,  0.00,  0.00,  null],
  'TS0207': [13.10, 13.40, 13.70, 13.60,  null],
  'TS0165': [ 0.00,  0.00,  0.00,  0.00,  null],
  'TS0250': [12.00, 11.80, 14.40, 13.20,  3.75],
  'TS0220': [ 7.60,  7.60, 12.50,  0.00, 12.75],
  'TS0136': [11.50,  0.00, 12.80,  0.00,  7.00],
  'TS0187': [10.00, 10.20, 10.00, 11.40,  5.50],
  'TS0142': [14.90, 10.00, 10.00,  0.00, 11.50],
  'TS0188': [13.50, 10.00, 10.00, 14.00, 11.25],
  'TS0154': [11.75, 11.60, 10.40, 13.00,  6.75],
  'TS0240': [12.10, 10.20, 12.50,  0.00,  7.00],
  'TS0175': [10.60,  4.20, 14.40, 13.60, 12.00],
  'TS0200': [13.00, 10.00, 14.00,  null,  null],
};

// OFLP 2A (Gr.C) – 5 modules
const NOTES_OFLP_2A = {
  'TS0193': [10.00, 10.60,  null,  2.00,  1.60],
  'TS0210': [13.60, 14.00, 13.50, 15.30, 12.30],
  'TS0125': [10.60, 10.20, 12.50, 14.70,  4.20],
  'TS0236': [12.60, 10.60,  9.00, 15.00,  4.80],
  'TS0123': [12.40, 13.00, 12.50, 16.00,  7.80],
  'TS0149': [ 0.00,  0.00,  null,  null,  0.00],
  'TS0206': [11.00, 13.00, 12.00, 15.30, 10.00],
  'TS0163': [11.20, 11.20,  null, 13.80,  6.50],
  'TS0222': [11.80, 11.50,  6.75, 12.30,  7.20],
  'TS0156': [11.80, 12.60,  null, 12.90,  6.90],
  'TS0248': [12.20, 10.20, 13.50, 12.00, 10.00],
  'TS0143': [12.00, 11.80,  8.25, 13.10,  5.60],
  'TS0135': [11.20, 12.40,  6.50, 13.90,  5.10],
  'TS0144': [11.60, 12.40, 14.50, 15.50, 11.30],
  'TS0177': [11.60, 11.20, 12.00, 14.00,  6.30],
  'TS0191': [10.00, 10.00, 12.50,  9.20,  7.00],
  'TS0242': [13.40, 13.40, 13.50, 15.80, 10.00],
  'TS0232': [10.80, 14.00, 13.00, 15.20, 10.00],
  'TS0209': [12.00, 10.90, 13.50, 13.20,  3.60],
  'TS0179': [14.80, 13.30, 16.00, 17.60, 13.60],
  'TS0173': [ 0.00,  4.20, 10.50,  8.80,  0.40],
  'TS0162': [12.00, 13.00,  8.00, 14.40, 10.20],
  'TS0216': [11.00, 13.60, 10.00, 10.80,  2.36],
  'TS0252': [13.20, 14.60, 16.00, 15.90, 10.10],
  'TS0227': [12.00, 10.80,  7.50, 12.80,  3.90],
  'TS0202': [11.00,  6.60, 11.00,  9.60,  6.30],
};

// AEL 2A (Gr.D) – 4 modules
const NOTES_AEL_2A = {
  'TS0212': [14.20, 13.40, 10.00, 14.90],
  'TS0178': [16.00, 12.20, 13.00, 16.30],
  'TS0196': [12.60, 13.30, 10.00, 11.50],
  'TS0204': [ 6.00, 11.10, 10.00, 13.80],
  'TS0198': [ 6.00, 10.00,  5.50,  3.00],
  'TS0182': [10.00, 10.00, 12.50,  8.00],
  'TS0205': [ 6.80, 10.00,  1.00,  6.80],
  'TS0244': [ 3.60,  6.60,  6.00, 12.80],
  'TS0153': [13.40, 13.00, 13.50, 14.70],
  'TS0155': [10.00,  3.80,  0.00,  4.00],
  'TS0158': [10.40, 10.60, 11.50, 11.00],
  'TS0230': [10.00, 11.40, 10.00,  7.20],
  'TS0225': [13.00, 10.00, 12.50, 15.70],
  'TS0219': [13.20, 10.60, 10.00, 13.90],
  'TS0233': [10.00,  7.80,  0.00,  6.60],
  'TS0174': [15.20, 12.20, 18.00, 16.60],
  'TS0243': [11.00, 10.00,  7.50, 14.70],
  'TS0117': [11.00, 12.90, 16.00, 12.20],
  'TS0214': [10.00, 10.60, 10.00, 10.80],
  'TS0249': [ 6.00,  6.60, 10.00,  3.00],
  'TS0130': [ 5.40,  6.60,  6.00,  5.60],
  'TS0223': [13.60, 11.60, 15.00, 14.00],
  'TS0159': [10.60,  7.40, 15.00, 11.20],
  'TS0124': [10.00,  7.80, 13.00,  9.20],
  'TS0211': [ 7.20, 10.00,  7.00,  7.20],
  'TS0170': [10.00, 10.00, 10.00, 12.70],
  'TS0189': [14.00, 10.60, 10.00, 14.90],
};

// ECOM 2A (Gr.E) – same students as TS.E, 6 modules
const NOTES_ECOM_2A = {
  'TS0194': [13.40, 12.00, 12.00, 18.00, 17.90,  6.80],
  'TS0152': [13.20, 13.40, 12.00, 18.00, 17.90,  6.70],
  'TS0161': [13.40, 13.20, 13.20, 16.20, 18.80,  5.80],
  'TS0265': [13.60, 13.40, 12.00, 16.20, 18.80,  7.20],
  'TS0254': [12.60, 10.40, 10.00, 16.20, 14.80,  null],
  'TS0245': [12.80, 10.00, 10.80, 12.80, 14.50,  5.40],
  'TS0201': [13.60, 11.60, 13.50, 17.00, 15.00,  null],
  'TS0137': [12.00, 13.80, 12.60, 13.75, 16.50,  null],
  'TS0256': [13.20, 10.00,  2.40, 10.50,  null,  null],
  'TS0247': [14.60, 15.80, 13.80, 18.00, 17.20,  5.30],
  'TS0169': [11.60, 10.20, 11.40, 12.80, 12.50,  null],
  'TS0221': [13.20, 10.00, 10.00, 12.80, 15.40,  6.40],
  'TS0241': [14.60, 12.80, 13.00, 16.20, 17.60,  7.70],
  'TS0199': [14.60, 11.80, 14.80, 16.20, 14.20,  4.40],
  'TS0166': [13.60, 16.40, 14.50, 18.00, 15.90, 10.80],
  'TS0235': [13.60, 12.40, 14.20, 16.20, 17.40, 10.80],
  'TS0224': [12.00,  0.00,  7.60,  7.00,  1.80,  null],
  'TS0234': [13.60, 14.80, 12.60, 18.00, 17.60, 10.00],
  'TS0266': [12.60, 10.00, 12.60, 12.80, 16.40,  null],
};

// ADEE 2A (Gr.F) – 4 modules
const NOTES_ADEE_2A = {
  'TS0229': [12.75, 13.65, 12.50, 15.00],
  'TS0258': [11.55, 11.90, 15.10, 10.50],
  'TS0213': [ null,  null,  null,  null],
  'TS0195': [12.15, 11.80, 11.50, 16.00],
  'TS0264': [13.95, 16.20, 12.30, 16.00],
  'TS0164': [11.25, 11.20, 11.30, 15.00],
  'TS0246': [19.15, 18.55, 19.00, 18.00],
  'TS0167': [17.85, 18.55, 19.30, 18.00],
  'TS0171': [12.50, 13.30, 12.00, 17.00],
  'TS0151': [16.75, 17.30, 18.40, 17.50],
  'TS0239': [14.00, 15.95, 15.80, 16.50],
  'TS0208': [13.65, 14.35, 15.30, 15.00],
  'TS0262': [10.10, 14.85, 12.00, 13.00],
  'TS0253': [11.70, 11.85, 10.40, 16.00],
  'TS0228': [14.20, 14.20, 12.40, 11.00],
  'TS0185': [19.15, 18.70, 19.30, 19.00],
  'TS0261': [11.75, 10.40, 12.50, 12.00],
  'TS0251': [16.25, 16.15, 18.20, 17.50],
};

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
(async () => {
  console.log('🔑 Token OAuth2…');
  const tok = await getAccessToken();
  console.log('✅ Token OK\n');

  // 1. Intervenants
  console.log(`👨‍🏫 Ajout ${INTERVENANTS_NEW.length} nouveaux intervenants…`);
  for (const iv of INTERVENANTS_NEW) {
    await upsert(tok, 'intervenants', iv.id, { ...iv, createdAt: NOW, updatedAt: NOW });
    process.stdout.write('.');
  }
  console.log(' ✅');

  // 2. Groupes
  console.log(`📋 ${GROUPES.length} groupes…`);
  for (const g of GROUPES) {
    await upsert(tok, 'groupes', g.id, { ...g, createdAt: NOW });
    process.stdout.write('.');
  }
  console.log(' ✅');

  // 3. Modules
  console.log(`📚 ${MODULES.length} modules…`);
  for (const m of MODULES) {
    await upsert(tok, 'modules', m.id, { ...m, createdAt: NOW });
    process.stdout.write('.');
  }
  console.log(' ✅');

  // 4. Évaluations
  console.log(`📝 ${EVALS.length} évaluations…`);
  for (const ev of EVALS) {
    await upsert(tok, 'evaluations', ev.id, ev);
    process.stdout.write('.');
  }
  console.log(' ✅');

  // 5. Apprenants – gestion conflit code TS0266
  const seen = new Set();
  console.log(`🎓 ${STUDENTS.length} apprenants…`);
  for (const [code, cin, nom, prenom, dob, groupeId] of STUDENTS) {
    // Si code déjà vu (conflit TS0266 AEL vs ECOM), utiliser cin comme id
    const sid = seen.has(code) ? `${code}-${cin}` : code;
    seen.add(code);
    await upsert(tok, 'students', sid, {
      code: sid, cin, nom, prenom,
      dateNaissance: dob,
      groupeId, filiere: groupeId.includes('oflp') ? 'OFLP' : groupeId.includes('ael') ? 'AEL' : groupeId.includes('ecom') ? 'ECOM' : groupeId.includes('adee') ? 'ADEE' : groupeId.includes('auto') ? 'AUTO' : 'OTM',
      anneeAcademique: ANNEE, statut: 'actif', createdAt: NOW,
    });
    process.stdout.write('.');
  }
  console.log(' ✅');

  // 6. Notes
  async function injectNotes(notesMap, groupId, moduleIds) {
    let count = 0;
    for (const [studentCode, grades] of Object.entries(notesMap)) {
      for (let i = 0; i < moduleIds.length; i++) {
        const note = grades[i];
        if (note === null || note === undefined) continue;
        const evalId = `${moduleIds[i]}-${groupId}-moy`;
        const noteId = `${evalId}--${studentCode}`;
        await upsert(tok, 'notes', noteId, {
          evaluationId: evalId, studentId: studentCode,
          note, absent: false, createdAt: NOW,
        });
        count++;
      }
    }
    return count;
  }

  console.log('📊 Injection des notes…');
  let total = 0;

  total += await injectNotes(NOTES_1A_OFLP, 'ts-c-oflp-1a-2025', ['OFLP-1A-M01','OFLP-1A-M02','OFLP-1A-M03','OFLP-1A-M04','OFLP-1A-M05','OFLP-1A-M06']);
  process.stdout.write(' OFLP-1A✓');

  total += await injectNotes(NOTES_1A_AEL,  'ts-d-ael-1a-2025',  ['AEL-1A-M01','AEL-1A-M02','AEL-1A-M03','AEL-1A-M04','AEL-1A-M05','AEL-1A-M06','AEL-1A-M07','AEL-1A-M08','AEL-1A-M09','AEL-1A-M10']);
  process.stdout.write(' AEL-1A✓');

  total += await injectNotes(NOTES_ECOM_1A, 'ts-e-ecom-1a-2024', ['ECOM-1A-M01','ECOM-1A-M02','ECOM-1A-M03','ECOM-1A-M04','ECOM-1A-M05','ECOM-1A-M06']);
  process.stdout.write(' ECOM-1A✓');

  total += await injectNotes(NOTES_AUTO_1A, 'ts-f-auto-1a-2024', ['AUTO-1A-M01','AUTO-1A-M02','AUTO-1A-M03','AUTO-1A-M04']);
  process.stdout.write(' AUTO-1A✓');

  total += await injectNotes(NOTES_OTM_2A_A,'ts-a-otm-2a-2025',  ['OTM-2A-M01','OTM-2A-M02','OTM-2A-M03','OTM-2A-M04','OTM-2A-M05']);
  process.stdout.write(' OTM-2A-A✓');

  total += await injectNotes(NOTES_OTM_2A_B,'ts-b-otm-2a-2025',  ['OTM-2A-M01','OTM-2A-M02','OTM-2A-M03','OTM-2A-M04','OTM-2A-M05']);
  process.stdout.write(' OTM-2A-B✓');

  total += await injectNotes(NOTES_OFLP_2A, 'ts-c-oflp-2a-2025', ['OFLP-2A-M01','OFLP-2A-M02','OFLP-2A-M03','OFLP-2A-M04','OFLP-2A-M05']);
  process.stdout.write(' OFLP-2A✓');

  total += await injectNotes(NOTES_AEL_2A,  'ts-d-ael-2a-2025',  ['AEL-2A-M01','AEL-2A-M02','AEL-2A-M03','AEL-2A-M04']);
  process.stdout.write(' AEL-2A✓');

  total += await injectNotes(NOTES_ECOM_2A, 'ts-e-ecom-2a-2025', ['ECOM-2A-M01','ECOM-2A-M02','ECOM-2A-M03','ECOM-2A-M04','ECOM-2A-M05','ECOM-2A-M06']);
  process.stdout.write(' ECOM-2A✓');

  total += await injectNotes(NOTES_ADEE_2A, 'ts-f-adee-2a-2025', ['ADEE-2A-M01','ADEE-2A-M02','ADEE-2A-M03','ADEE-2A-M04']);
  process.stdout.write(' ADEE-2A✓\n');

  console.log(`\n${'═'.repeat(45)}`);
  console.log(`✅ Injection terminée !`);
  console.log(`   ${GROUPES.length} nouveaux groupes`);
  console.log(`   ${MODULES.length} nouveaux modules`);
  console.log(`   ${STUDENTS.length} apprenants`);
  console.log(`   ~${total} notes`);
  console.log(`${'═'.repeat(45)}\n`);
})();
