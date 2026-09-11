/**
 * inject-notes-pv.mjs
 * Injecte dans Firestore les données des PV de notes 2025-2026 récupérés depuis Cowork :
 *   - PV_Dashboard_1A_TS_2025-2026.xlsx   → TS.A (OTM-A) et TS.B (OTM-B), 26+26 apprenants, 6 modules S1
 *   - PV_Dashboard_Licence_CNAM_2025-2026.xlsx → Licence LG03608A, G1+G2, 28+28 apprenants, CTL+EFM 4 modules
 *
 * Collections créées/mises à jour : groupes | intervenants | modules | students | evaluations | notes
 *
 * Usage : FIREBASE_TOKEN=<ci_token> node scripts/inject-notes-pv.mjs
 */

const PROJECT_ID = 'erp-pedago-iftl';
const REFRESH_TOKEN = process.env.FIREBASE_TOKEN;
if (!REFRESH_TOKEN) { console.error('❌ Set FIREBASE_TOKEN env var'); process.exit(1); }

// ─── OAuth2 helper ─────────────────────────────────────────────────────────────
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

// ─── Firestore REST helpers ─────────────────────────────────────────────────────
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

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

async function upsert(token, col, id, data) {
  const r = await fetch(`${BASE}/${col}/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toDoc(data)),
  });
  if (!r.ok) throw new Error(`PATCH ${col}/${id} → ${r.status}: ${(await r.text()).slice(0,200)}`);
  return id;
}

async function create(token, col, data) {
  const r = await fetch(`${BASE}/${col}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toDoc(data)),
  });
  if (!r.ok) throw new Error(`POST ${col} → ${r.status}: ${(await r.text()).slice(0,200)}`);
  const res = await r.json();
  return res.name.split('/').pop();
}

// delay helper to avoid rate-limiting
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════════════════════

const NOW = new Date().toISOString();
const ANNEE = '2025-2026';

// ─── Groupes ────────────────────────────────────────────────────────────────────
const GROUPES = [
  { id: 'ts-a-otm-1a-2025', nom: 'TS.A – OTM 1ère Année', filiere: 'OTM', filiereCode: 'OTM', niveau: 'TS 1A', anneeAcademique: ANNEE, effectif: 26 },
  { id: 'ts-b-otm-1a-2025', nom: 'TS.B – OTM 1ère Année', filiere: 'OTM', filiereCode: 'OTM', niveau: 'TS 1A', anneeAcademique: ANNEE, effectif: 26 },
  { id: 'licence-cnam-g1-2025', nom: 'Licence ASC-CNAM – Groupe 1', filiere: 'Licence Achats & Supply Chain', filiereCode: 'CNAM', niveau: 'Licence LG03608A', anneeAcademique: ANNEE, effectif: 28 },
  { id: 'licence-cnam-g2-2025', nom: 'Licence ASC-CNAM – Groupe 2', filiere: 'Licence Achats & Supply Chain', filiereCode: 'CNAM', niveau: 'Licence LG03608A', anneeAcademique: ANNEE, effectif: 28 },
];

// ─── Intervenants ───────────────────────────────────────────────────────────────
const INTERVENANTS = [
  { id: 'benhaddou-najib',       nom: 'BENHADDOU',        prenom: 'Najib',            specialite: 'Réglementation Transport & Logistique',      actif: true },
  { id: 'ezzahraoui-mohamed',    nom: 'EZZAHRAOUI',       prenom: 'Mohamed',           specialite: 'Transport International & Incoterms',         actif: true },
  { id: 'achoui-mostafa',        nom: 'ACHOUI',           prenom: 'Mostafa',           specialite: 'Statistiques & Mathématiques appliquées',     actif: true },
  { id: 'darkaoui-abdellah',     nom: 'DARKAOUI',         prenom: 'Abdellah',          specialite: 'Mécanique Automobile & Métier',               actif: true },
  { id: 'aboutajeddin-faycal',   nom: 'ABOUTAJEDDIN',     prenom: 'Fayçal',            specialite: 'Logistique & Gestion Entrepôt',               actif: true },
  { id: 'aboutajeddin-farida',   nom: 'ABOUTAJEDDIN',     prenom: 'Farida',            specialite: 'Métier & Formation',                          actif: true },
  { id: 'essaf-kaoutar',         nom: 'ESSAF',            prenom: 'Kaoutar',           specialite: 'Comptabilité Générale & Analytique',          actif: true },
  { id: 'tahri-rachid',          nom: 'TAHRI',            prenom: 'Rachid',            specialite: 'Transport Multimodal & Régime TIR',           actif: true },
  { id: 'bouaissi-abdennacer',   nom: 'BOUAISSI',         prenom: 'Abdennacer',        specialite: 'Supply Chain & Gestion des Stocks',           actif: true },
  { id: 'sabir-khalil',          nom: 'SABIR',            prenom: 'Khalil',            specialite: 'Développement Personnel & Stages',            actif: true },
  { id: 'kachbal-sofia',         nom: 'KACHBAL',          prenom: 'Sofia',             specialite: 'Vie Scolaire & Assiduité',                    actif: true },
  { id: 'soba-brahim',           nom: 'SOBA',             prenom: 'Brahim',            specialite: 'Réglementation Transport',                    actif: true },
  { id: 'bricha-saad',           nom: 'BRICHA',           prenom: 'Saad',              specialite: 'Achats & Supply Chain',                       actif: true },
  { id: 'haloui-mourad',         nom: 'HALOUI',           prenom: 'Mourad',            specialite: 'Management des Achats & Commerce',            actif: true },
  { id: 'khamous-said',          nom: 'KHAMOUS',          prenom: 'Said',              specialite: 'Communication écrite et orale',               actif: true },
  { id: 'lifi-nada',             nom: 'LIFI',             prenom: 'Nada',              specialite: 'Anglais professionnel',                       actif: true },
  { id: 'moujib-hamid',          nom: 'MOUJIB',           prenom: 'Hamid',             specialite: 'Développement Personnel',                     actif: true },
  { id: 'zinifi-abdellah',       nom: 'ZINIFI',           prenom: 'Abdellah',          specialite: 'Transport Routier International',             actif: true },
  { id: 'elbahi-younes',         nom: 'ELBAHI',           prenom: 'Younes',            specialite: 'Logistique de Distribution',                  actif: true },
  { id: 'elkhalil-elmoun-badr',  nom: 'ELKHALIL ELMOUN',  prenom: 'Badr',              specialite: 'E-Commerce & Digital',                       actif: true },
  { id: 'hilal-mohamed',         nom: 'HILAL',            prenom: 'Mohamed',           specialite: 'Marketing Digital',                           actif: true },
  { id: 'ait-ali-hassan',        nom: 'AIT ALI',          prenom: 'Hassan',            specialite: 'Achats de Prestations Transport & Logistique', actif: true },
  { id: 'oudrhiri-loubna',       nom: 'OUDRHIRI',         prenom: 'Loubna',            specialite: 'Pilotage des Flux & Supply Chain',            actif: true },
  { id: 'noure-abdelhak',        nom: 'NOURE',            prenom: 'Abdelhak',          specialite: 'Logistique Durable & Transition Écologique',  actif: true },
  { id: 'houari-mohamed',        nom: 'HOUARI',           prenom: 'Mohamed',           specialite: 'Contrôle de Gestion Supply Chain',            actif: true },
  { id: 'hammani-khalid',        nom: 'HAMMANI',          prenom: 'Khalid',            specialite: 'Enjeux des Transitions Écologiques',          actif: true },
];

// ─── Modules ────────────────────────────────────────────────────────────────────
const MODULES = [
  // ── Licence CNAM LG03608A ──
  { id: 'CFA109', code: 'CFA109', nom: 'Information comptable et management',                      filiereCode: 'CNAM', intervenantId: 'essaf-kaoutar',       coeff: 6, ects: 6 },
  { id: 'LTR112', code: 'LTR112', nom: 'Supply Chain Planning, Manufacturing & Lean Mgmt',         filiereCode: 'CNAM', intervenantId: 'bouaissi-abdennacer', coeff: 4, ects: 4 },
  { id: 'ESC118', code: 'ESC118', nom: 'Processus et organisation des achats',                      filiereCode: 'CNAM', intervenantId: 'bricha-saad',         coeff: 4, ects: 4 },
  { id: 'LTR135', code: 'LTR135', nom: 'Achats de prestations transport et log. / Mgmt équipes',   filiereCode: 'CNAM', intervenantId: 'ait-ali-hassan',      coeff: 6, ects: 6 },
  { id: 'LTR126', code: 'LTR126', nom: 'Outils et techniques de pilotage des flux',                filiereCode: 'CNAM', intervenantId: 'oudrhiri-loubna',     coeff: 4, ects: 4 },
  { id: 'LTR113', code: 'LTR113', nom: 'Logistique durable et transition écologique',              filiereCode: 'CNAM', intervenantId: 'noure-abdelhak',      coeff: 6, ects: 6 },
  { id: 'ESC121', code: 'ESC121', nom: 'Marketing des achats',                                      filiereCode: 'CNAM', intervenantId: 'bricha-saad',         coeff: 4, ects: 4 },
  { id: 'LTR143', code: 'LTR143', nom: 'Contrôle de gestion Supply Chain',                         filiereCode: 'CNAM', intervenantId: 'houari-mohamed',      coeff: 6, ects: 6 },
  { id: 'ANG320', code: 'ANG320', nom: 'Anglais professionnel',                                     filiereCode: 'CNAM', intervenantId: 'lifi-nada',           coeff: 6, ects: 6 },
  { id: 'TED001', code: 'TED001', nom: 'Enjeux des transitions écologiques',                        filiereCode: 'CNAM', intervenantId: 'hammani-khalid',      coeff: 3, ects: 3 },
  // ── TS OTM 1ère Année ──
  { id: 'OTM-M01', code: 'OTM-M01', nom: 'Réglementation logistique et Transport',                         filiereCode: 'OTM', intervenantId: 'benhaddou-najib',     coeff: 2 },
  { id: 'OTM-M02', code: 'OTM-M02', nom: 'Contrats de Transport et Incoterms dans le commerce international', filiereCode: 'OTM', intervenantId: 'ezzahraoui-mohamed',  coeff: 2 },
  { id: 'OTM-M03', code: 'OTM-M03', nom: 'Statistiques & Mathématiques appliquées à la logistique',         filiereCode: 'OTM', intervenantId: 'achoui-mostafa',      coeff: 1 },
  { id: 'OTM-M04', code: 'OTM-M04', nom: 'Métier & Formation',                                              filiereCode: 'OTM', intervenantId: 'darkaoui-abdellah',   coeff: 2 },
  { id: 'OTM-M05', code: 'OTM-M05', nom: "Fondamentaux de la Logistique et de l'entrepôt",                  filiereCode: 'OTM', intervenantId: 'aboutajeddin-faycal', coeff: 2 },
  { id: 'OTM-M06', code: 'OTM-M06', nom: 'Comptabilité Générale et Analytique',                             filiereCode: 'OTM', intervenantId: 'essaf-kaoutar',       coeff: 1 },
  { id: 'OTM-M07', code: 'OTM-M07', nom: 'Fondamentaux du Transport Multimodal et régime TIR',              filiereCode: 'OTM', intervenantId: 'tahri-rachid',        coeff: 2 },
  { id: 'OTM-M08', code: 'OTM-M08', nom: "Gestion des opérations en entrepôt",                              filiereCode: 'OTM', intervenantId: 'aboutajeddin-faycal', coeff: 2 },
  { id: 'OTM-M09', code: 'OTM-M09', nom: "Gestion des stocks et techniques d'approvisionnement",            filiereCode: 'OTM', intervenantId: 'bouaissi-abdennacer', coeff: 2 },
  { id: 'OTM-M10', code: 'OTM-M10', nom: 'Recherche de Stage',                                              filiereCode: 'OTM', intervenantId: 'sabir-khalil',        coeff: 1 },
  { id: 'OTM-M11', code: 'OTM-M11', nom: 'Discipline & Assiduité',                                          filiereCode: 'OTM', intervenantId: 'kachbal-sofia',       coeff: 1 },
];

// ─── Évaluations ──────────────────────────────────────────────────────────────
// Licence CNAM : CC (controle, coeff 0.40) + EFM (examen_session, coeff 0.60) par module × 2 groupes
// TS OTM      : 1 éval de type examen_session (moyenne module) par module × 2 groupes
const CNAM_MODS_WITH_DATA = ['CFA109','LTR112','ESC118','LTR135']; // 4 modules avec CTL+EFM complets
const OTM_MODS_S1 = ['OTM-M01','OTM-M02','OTM-M03','OTM-M04','OTM-M05','OTM-M06'];

function makeEvals() {
  const evals = [];
  // Licence CNAM
  for (const g of ['licence-cnam-g1-2025','licence-cnam-g2-2025']) {
    const gLabel = g.includes('g1') ? 'G1' : 'G2';
    for (const mod of CNAM_MODS_WITH_DATA) {
      const m = MODULES.find(x => x.id === mod);
      evals.push({ id: `${mod}-${g}-cc`,  code: `${mod}-${gLabel}-CC`,  titre: `${mod} — ${m.nom} — Contrôle Continu — ${gLabel}`,      type: 'controle',        moduleId: mod, groupeId: g, bareme: 20, coefficient: 0.4, sessionAcademique: 'S1', anneeAcademique: ANNEE, date: '2025-11-30', createdAt: NOW });
      evals.push({ id: `${mod}-${g}-efm`, code: `${mod}-${gLabel}-EFM`, titre: `${mod} — ${m.nom} — Examen de Fin de Module — ${gLabel}`, type: 'examen_session', moduleId: mod, groupeId: g, bareme: 20, coefficient: 0.6, sessionAcademique: 'S1', anneeAcademique: ANNEE, date: '2026-01-15', createdAt: NOW });
    }
  }
  // TS OTM S1
  for (const g of ['ts-a-otm-1a-2025','ts-b-otm-1a-2025']) {
    const gLabel = g.includes('-a-') ? 'TS.A' : 'TS.B';
    for (const mod of OTM_MODS_S1) {
      const m = MODULES.find(x => x.id === mod);
      evals.push({ id: `${mod}-${g}-moy`, code: `${mod}-${gLabel}-MOY`, titre: `${mod} — ${m.nom} — Moyenne Annuelle — ${gLabel}`, type: 'examen_session', moduleId: mod, groupeId: g, bareme: 20, coefficient: 1, sessionAcademique: 'S1', anneeAcademique: ANNEE, date: '2026-05-01', createdAt: NOW });
    }
  }
  return evals;
}

// ─── Students TS.A (OTM-A, 1A) ─────────────────────────────────────────────────
// notes[i] = note module OTM-M0{i+1} (M1..M6)
const TS_A = [
  { code:'TS0342', nom:'ABAJAD',       prenom:'Youssra',         cin:'E866168',  ddn:'01/08/2006', notes:[13.20,13.60,10.00,14.67,15.45,14.20] },
  { code:'TS0378', nom:'AMMARI',       prenom:'Walid',           cin:'ZT356166', ddn:'21/12/2006', notes:[11.00,11.80,10.00,17.33,11.36,8.40]  },
  { code:'TS0357', nom:'AMRANI IDRISSI',prenom:'Fatima Zahra',   cin:'BW49905',  ddn:'16/08/2005', notes:[14.40,14.80,10.00,17.33,17.27,13.00] },
  { code:'TS0333', nom:'AZKKA',        prenom:'Yasmine',         cin:'BK758121', ddn:'01/11/2007', notes:[10.00,16.00,11.80,18.00,15.91,16.50] },
  { code:'TS0302', nom:'BAHNAIK',      prenom:'Hamza',           cin:'BW77297',  ddn:'25/03/2008', notes:[15.40,10.00,10.00,15.33,10.45,7.30]  },
  { code:'TS0301', nom:'BATTAL',       prenom:'Sara',            cin:'BE954221', ddn:'08/09/2007', notes:[16.80,16.00,10.60,16.00,15.00,16.60] },
  { code:'TS0395', nom:'EL BAZZARY',   prenom:'Aymane',          cin:'WA314114', ddn:'11/08/2005', notes:[5.40,4.00,4.00,12.00,8.64,4.80]    },
  { code:'TS0324', nom:'EL OUNKI',     prenom:'Younes',          cin:'DN53088',  ddn:'06/05/2007', notes:[0.00,15.60,11.00,16.67,14.55,15.20] },
  { code:'TS0300', nom:'ELIRAOUI',     prenom:'Abdelali',        cin:'MC336073', ddn:'15/04/2007', notes:[16.40,15.20,11.00,4.67,10.45,10.20] },
  { code:'TS0331', nom:'ELOUARDI',     prenom:'Mohamed',         cin:'WA356147', ddn:'06/05/2007', notes:[10.00,15.00,4.20,0.00,18.64,3.80]   },
  { code:'TS0364', nom:'EN-NAJI',      prenom:'Hafsa',           cin:'WA359444', ddn:'15/07/2006', notes:[14.20,15.20,10.00,17.33,12.27,15.40] },
  { code:'TS0285', nom:'HALFYA',       prenom:'Yahya',           cin:'BW10513',  ddn:'02/11/2004', notes:[15.20,14.40,11.60,12.00,12.27,13.80] },
  { code:'TS0334', nom:'HAMID',        prenom:'Abdelmounaim',    cin:'WA352935', ddn:'05/02/2007', notes:[15.00,13.80,11.20,18.00,14.09,10.80] },
  { code:'TS0293', nom:'JENNANI',      prenom:'Mohamed',         cin:'WA358114', ddn:'14/04/2007', notes:[10.00,15.20,12.20,17.33,16.82,14.70] },
  { code:'TS0373', nom:'LAHROUR',      prenom:'Mouaad',          cin:'GG22936',  ddn:'04/10/2007', notes:[7.80,16.40,7.40,4.00,16.36,7.40]    },
  { code:'TS0275', nom:'LEMOUDA',      prenom:'Ahmed',           cin:'TA170553', ddn:'14/07/2007', notes:[10.00,16.40,12.00,6.67,10.91,7.00]  },
  { code:'TS0277', nom:'LEMRHARI',     prenom:'Marwane',         cin:'TA171348', ddn:'21/11/2007', notes:[4.80,0.00,6.40,12.00,10.45,0.00]   },
  { code:'TS0299', nom:'MOUSBAHI',     prenom:'Chaimae',         cin:'GB316475', ddn:'23/07/2005', notes:[16.20,16.80,17.20,16.67,15.45,16.40] },
  { code:'TS0384', nom:'NASEH',        prenom:'Ibrahim',         cin:'BB249183', ddn:'23/01/2006', notes:[15.40,15.60,10.00,13.33,8.18,14.90] },
  { code:'TS0320', nom:'NIDAM',        prenom:'Hajar',           cin:'BH652348', ddn:'05/09/2007', notes:[10.80,14.00,13.20,20.00,15.00,15.30] },
  { code:'TS0295', nom:'NOUKRY',       prenom:'Abdelaziz',       cin:'TA169011', ddn:'18/06/2006', notes:[16.20,16.40,11.60,6.67,16.82,13.60] },
  { code:'TS0276', nom:'RABAH',        prenom:'Fatima-Ezzahra',  cin:'TA175039', ddn:'18/09/2007', notes:[15.40,16.40,10.00,15.33,15.45,11.40] },
  { code:'TS0353', nom:'SAADAOUI',     prenom:'Chouaib',         cin:'WA340420', ddn:'02/10/2005', notes:[10.40,9.60,10.00,15.33,16.36,13.30] },
  { code:'TS0337', nom:'TAOUSS',       prenom:'Hasnaa',          cin:'T342960',  ddn:'12/10/2007', notes:[10.80,13.00,11.00,10.67,11.36,16.30] },
  { code:'TS0400', nom:'WARDY',        prenom:'Rayane',          cin:'BH648979', ddn:'02/06/2006', notes:[10.20,16.80,10.00,16.67,9.55,12.40] },
  { code:'TS0311', nom:'YASYN',        prenom:'Afrae',           cin:'BK770376', ddn:'30/03/2008', notes:[10.00,15.20,13.20,17.33,10.45,7.60] },
];

// ─── Students TS.B (OTM-B, 1A) ─────────────────────────────────────────────────
const TS_B = [
  { code:'TS0335', nom:'ABDELLAOUI',     prenom:'Mohamed Zakaria',  cin:'EC98432',  ddn:'14/05/2007', notes:[13.60,14.20,11.00,16.67,10.45,13.30] },
  { code:'TS0365', nom:'AGOUMY',         prenom:'Zakaria',          cin:'W475620',  ddn:'09/10/2004', notes:[10.80,14.00,11.80,12.67,7.73,9.80]   },
  { code:'TS0279', nom:'AIT-CHEIKH',     prenom:'Sara',             cin:'BM58189',  ddn:'14/07/2007', notes:[13.40,15.60,10.00,18.00,10.91,15.90] },
  { code:'TS0274', nom:'ALOUANI',        prenom:'Wissal',           cin:'BB258526', ddn:'26/12/2007', notes:[15.40,14.00,11.60,14.67,15.00,15.40] },
  { code:'TS0315', nom:'ARIFI',          prenom:'Yahya',            cin:'BW62276',  ddn:'24/04/2005', notes:[10.00,13.80,7.00,10.00,7.73,6.50]    },
  { code:'TS0366', nom:'ATIQE',          prenom:'Hicham',           cin:'T338915',  ddn:'04/08/2006', notes:[14.40,16.40,10.80,15.33,12.27,11.80] },
  { code:'TS0374', nom:'ATOUFI',         prenom:'Aymen',            cin:'WA358437', ddn:'08/07/2006', notes:[10.80,10.00,6.00,7.33,7.27,6.20]    },
  { code:'TS0401', nom:'BERKA',          prenom:'Sara',             cin:'BB254090', ddn:'15/11/2006', notes:[0.00,14.00,10.00,12.67,7.73,10.20]  },
  { code:'TS0307', nom:'EL AAMRAOUI',    prenom:'Aya',              cin:'K642903',  ddn:'18/04/2007', notes:[16.40,16.40,13.40,16.67,12.27,16.15] },
  { code:'TS0363', nom:'EL BAIBI',       prenom:'Khawla',           cin:'WA365676', ddn:'05/06/2007', notes:[14.00,16.40,11.60,16.67,15.45,14.80] },
  { code:'TS0308', nom:'EL KOBB',        prenom:'Soufiane',         cin:'T341370',  ddn:'06/08/2006', notes:[16.00,10.00,10.00,14.67,11.82,15.30] },
  { code:'TS0282', nom:'ELGHAZLANI',     prenom:'Mohammed Amine',   cin:'M714353',  ddn:'22/06/2007', notes:[12.40,16.80,10.00,15.33,13.18,11.10] },
  { code:'TS0316', nom:'ELMIR',          prenom:'Chams Eddine',     cin:'T352471',  ddn:'06/12/2007', notes:[10.00,16.80,10.00,17.33,12.27,7.00]  },
  { code:'TS0298', nom:'FASLI',          prenom:'Hibat Allah',      cin:'BW73344',  ddn:'23/05/2006', notes:[14.00,13.80,10.00,16.67,9.55,15.75]  },
  { code:'TS0273', nom:'FATHALLAH',      prenom:'Fatima-Ezzahra',   cin:'M696250',  ddn:'07/05/2006', notes:[18.20,16.80,13.40,18.00,15.00,15.90] },
  { code:'TS0341', nom:'IDNASSER',       prenom:'Aicha',            cin:'BW68967',  ddn:'22/07/2007', notes:[15.00,14.80,11.40,17.33,12.73,16.30] },
  { code:'TS0350', nom:'JAAFAR',         prenom:'Oumaima',          cin:'AY38259',  ddn:'17/01/2008', notes:[18.00,16.40,14.20,18.00,7.27,16.40]  },
  { code:'TS0329', nom:'LOUSOURE',       prenom:'Khadija',          cin:'BB267316', ddn:'08/09/2007', notes:[10.00,12.60,10.00,14.00,9.09,12.00]  },
  { code:'TS0317', nom:"M'HARZI ALAOUI", prenom:'Brahim',           cin:'VA166518', ddn:'23/09/2007', notes:[10.00,16.40,12.60,18.00,14.55,15.70] },
  { code:'TS0294', nom:'MAJDI',          prenom:'Ilyass',           cin:'BW77515',  ddn:'14/07/2007', notes:[10.00,16.40,10.00,14.00,5.91,9.60]   },
  { code:'TS0286', nom:'MANAM',          prenom:'Yassine',          cin:'WA330507', ddn:'25/08/2005', notes:[12.40,13.40,10.00,14.00,10.91,15.10] },
  { code:'TS0340', nom:'MOUBARIK',       prenom:'Oussama',          cin:'BW84777',  ddn:'04/04/2007', notes:[15.40,16.40,10.40,18.00,11.36,13.80] },
  { code:'TS0346', nom:'MOUSLIK',        prenom:'Karim',            cin:'TA171444', ddn:'20/12/2007', notes:[10.20,15.00,14.40,17.33,14.09,15.55] },
  { code:'TS0292', nom:'OUKKOUR',        prenom:'Aya',              cin:'CN66770',  ddn:'21/12/2007', notes:[16.00,16.40,10.00,16.00,12.27,14.75] },
  { code:'TS0348', nom:'OURIAD',         prenom:'Omar',             cin:'BW63601',  ddn:'28/11/2006', notes:[10.00,1.20,7.80,4.67,3.18,4.40]     },
  { code:'TS0272', nom:'SEMMADE',        prenom:'Mohammed Amine',   cin:'BB275769', ddn:'24/09/2007', notes:[16.00,12.80,11.80,17.33,11.36,15.40] },
];

// ─── Students Licence CNAM G1 (28) ─────────────────────────────────────────────
// notes: { CFA109:[cc,efm], LTR112:[cc,efm], ESC118:[cc,efm], LTR135:[cc,efm] }
const CNAM_G1 = [
  { code:'MAR655197', nom:'AHADJI',        prenom:'Mohamed',          cin:'DI11846',  ddn:'18/12/2004', notes:{ CFA109:[1.00,0.00],   LTR112:[0.00,15.00],  ESC118:[13.00,13.50], LTR135:[15.33,18.50] } },
  { code:'MAR655198', nom:'AIT AHMED',     prenom:'Walae',            cin:'BJ469583', ddn:'27/10/2004', notes:{ CFA109:[14.75,11.50], LTR112:[15.00,0.00],  ESC118:[0.00,0.00],   LTR135:[0.00,0.00]   } },
  { code:'MAR655206', nom:'ATTOU',         prenom:'Ikram',            cin:'BW54512',  ddn:'22/05/2005', notes:{ CFA109:[16.75,15.75], LTR112:[16.00,14.50], ESC118:[19.00,15.00], LTR135:[18.50,19.00] } },
  { code:'MAR655207', nom:'AZZABI',        prenom:'Sajda',            cin:'EE755568', ddn:'21/08/2005', notes:{ CFA109:[16.75,15.00], LTR112:[11.00,16.00], ESC118:[12.50,15.50], LTR135:[18.67,18.50] } },
  { code:'MAR655208', nom:'BAHRI',         prenom:'Ghita',            cin:'BA37277',  ddn:'11/05/2004', notes:{ CFA109:[15.50,15.50], LTR112:[16.00,17.00], ESC118:[15.25,14.00], LTR135:[9.00,18.50]  } },
  { code:'MAR655260', nom:'BARRIZE',       prenom:'Hassan',           cin:'BW43292',  ddn:'02/10/2004', notes:{ CFA109:[14.25,15.00], LTR112:[13.00,16.00], ESC118:[13.00,12.00], LTR135:[16.67,18.50] } },
  { code:'MAR655212', nom:'BELASRI',       prenom:'Zakaria',          cin:'BB245762', ddn:'10/12/2005', notes:{ CFA109:[2.00,6.00],   LTR112:[13.00,5.00],  ESC118:[16.50,8.50],  LTR135:[7.33,0.00]   } },
  { code:'MAR655214', nom:'BOUGHOU',       prenom:'Noure El Houda',   cin:'BW56861',  ddn:'06/12/2005', notes:{ CFA109:[11.00,16.00], LTR112:[13.00,15.00], ESC118:[13.75,11.50], LTR135:[19.67,19.00] } },
  { code:'MAR655192', nom:'BOUKHAZRI',     prenom:'Redouane',         cin:'BH450100', ddn:'04/03/1989', notes:{ CFA109:[16.25,13.50], LTR112:[13.00,5.00],  ESC118:[10.75,10.00], LTR135:[14.83,16.50] } },
  { code:'MAR655215', nom:'BSAIRI',        prenom:'Mohammed-Amine',   cin:'AD352036', ddn:'16/03/2006', notes:{ CFA109:[15.00,11.00], LTR112:[15.50,16.00], ESC118:[12.00,12.50], LTR135:[18.33,19.00] } },
  { code:'MAR655217', nom:'DIB',           prenom:'Manar',            cin:'BW51640',  ddn:'17/01/2006', notes:{ CFA109:[17.25,16.00], LTR112:[16.00,17.50], ESC118:[16.25,14.50], LTR135:[16.67,18.50] } },
  { code:'MAR655218', nom:'DRIFI',         prenom:'Abdelmajid',       cin:'JY52036',  ddn:'16/12/2005', notes:{ CFA109:[14.00,10.00], LTR112:[16.00,16.00], ESC118:[12.50,12.50], LTR135:[17.83,18.50] } },
  { code:'MAR655223', nom:'EL ARIF',       prenom:'Imane',            cin:'BE939472', ddn:'12/10/2004', notes:{ CFA109:[10.00,10.00], LTR112:[13.00,15.00], ESC118:[9.50,9.00],   LTR135:[8.50,19.50]  } },
  { code:'MAR655224', nom:'EL YOUSSEFI',   prenom:'El Khalil El Mustapha', cin:'WA343148', ddn:'19/10/2005', notes:{ CFA109:[1.50,5.00], LTR112:[0.00,10.00], ESC118:[10.00,5.00], LTR135:[0.00,0.00] } },
  { code:'MAR655293', nom:'ET-TAYEB',      prenom:'Chouaib',          cin:'WA312440', ddn:'19/01/2003', notes:{ CFA109:[3.00,2.00],   LTR112:[0.00,7.00],   ESC118:[12.00,4.00],  LTR135:[13.17,20.00] } },
  { code:'MAR655226', nom:'FALIH',         prenom:'Douaa',            cin:'BW52992',  ddn:'25/02/2005', notes:{ CFA109:[18.25,18.00], LTR112:[18.00,18.50], ESC118:[19.00,18.00], LTR135:[19.50,19.50] } },
  { code:'MAR655231', nom:'JAFIR',         prenom:'Wassim',           cin:'BW42715',  ddn:'23/02/2004', notes:{ CFA109:[17.25,14.50], LTR112:[13.00,13.00], ESC118:[17.50,18.00], LTR135:[19.17,19.50] } },
  { code:'MAR655301', nom:'KANNOUE',       prenom:'Aya',              cin:'BB206350', ddn:'26/11/2005', notes:{ CFA109:[10.25,0.00],  LTR112:[12.00,10.00], ESC118:[11.00,4.00],  LTR135:[18.33,19.00] } },
  { code:'MAR655236', nom:'LEBBAR',        prenom:'Chaimaa',          cin:'BW43238',  ddn:'26/03/2005', notes:{ CFA109:[14.75,15.75], LTR112:[13.00,16.50], ESC118:[18.00,17.50], LTR135:[7.50,19.50]  } },
  { code:'MAR655310', nom:'MANIT',         prenom:'Asmaa',            cin:'BW62357',  ddn:'17/03/2006', notes:{ CFA109:[16.00,13.00], LTR112:[16.00,13.00], ESC118:[11.50,10.00], LTR135:[8.50,19.50]  } },
  { code:'MAR655312', nom:'MARCHOUD',      prenom:'Assia',            cin:'BJ493942', ddn:'07/11/2000', notes:{ CFA109:[13.50,14.50], LTR112:[14.00,0.00],  ESC118:[10.00,4.50],  LTR135:[3.50,17.00]  } },
  { code:'MAR655313', nom:'MOUAHID',       prenom:'Charaf Eddine',    cin:'BW45972',  ddn:'01/02/2005', notes:{ CFA109:[0.00,3.00],   LTR112:[13.00,16.00], ESC118:[0.00,0.00],   LTR135:[0.00,0.00]   } },
  { code:'MAR655238', nom:'NOUIGUER',      prenom:'Mohamed',          cin:'W471355',  ddn:'11/10/2003', notes:{ CFA109:[18.00,15.00], LTR112:[13.00,16.00], ESC118:[14.00,12.50], LTR135:[17.33,17.00] } },
  { code:'MAR655315', nom:'NOUR',          prenom:'Ayman',            cin:'BW37958',  ddn:'06/03/2005', notes:{ CFA109:[16.75,15.00], LTR112:[18.00,15.00], ESC118:[0.00,0.00],   LTR135:[8.50,19.50]  } },
  { code:'MAR655316', nom:'OUJOUT',        prenom:'Mehdi',            cin:'',         ddn:'05/03/2005', notes:{ CFA109:[1.00,7.50],   LTR112:[10.00,16.00], ESC118:[4.00,8.75],   LTR135:[11.17,17.00] } },
  { code:'MAR655239', nom:'QANOUNE',       prenom:'Aya',              cin:'D123084',  ddn:'28/07/2005', notes:{ CFA109:[14.00,11.00], LTR112:[0.00,12.00],  ESC118:[0.00,0.00],   LTR135:[18.33,18.50] } },
  { code:'MAR655241', nom:'SAMOUD',        prenom:'Chaymaa',          cin:'EE891300', ddn:'28/07/2005', notes:{ CFA109:[18.25,16.00], LTR112:[13.00,15.00], ESC118:[10.50,14.50], LTR135:[19.00,19.50] } },
  { code:'MAR655341', nom:'SODKI',         prenom:'Zineb',            cin:'WA339057', ddn:'13/02/2006', notes:{ CFA109:[10.00,10.00], LTR112:[12.00,15.00], ESC118:[11.00,10.50], LTR135:[19.33,20.00] } },
];

// ─── Students Licence CNAM G2 (28) ─────────────────────────────────────────────
const CNAM_G2 = [
  { code:'MAR655194', nom:'ABOULEDHOUM',  prenom:'Rim',              cin:'BW35836',  ddn:'24/07/2004', notes:{ CFA109:[16.50,15.50], LTR112:[17.00,14.00], ESC118:[17.50,10.50], LTR135:[17.50,19.50] } },
  { code:'MAR655196', nom:'ACHRRAB',      prenom:'Soumaya',          cin:'ZG172704', ddn:'19/12/2004', notes:{ CFA109:[17.50,12.00], LTR112:[18.00,15.00], ESC118:[11.50,12.50], LTR135:[17.33,19.00] } },
  { code:'MAR655203', nom:"AIT M'HAMED",  prenom:'Nouhaila',         cin:'',         ddn:'26/07/2005', notes:{ CFA109:[17.50,10.00], LTR112:[10.00,12.00], ESC118:[15.50,11.50], LTR135:[18.50,19.00] } },
  { code:'MAR655204', nom:'AIT RAHO',     prenom:'Badre',            cin:'FA201609', ddn:'04/05/2005', notes:{ CFA109:[17.25,15.50], LTR112:[16.50,14.00], ESC118:[12.50,13.50], LTR135:[20.00,18.50] } },
  { code:'MAR655205', nom:'ATOU',         prenom:'Hiba',             cin:'BW58242',  ddn:'31/01/2006', notes:{ CFA109:[17.50,17.50], LTR112:[18.00,16.50], ESC118:[19.50,18.25], LTR135:[17.83,19.00] } },
  { code:'MAR655209', nom:'BAKHCHENI',    prenom:'Hiba',             cin:'WA320175', ddn:'04/11/2004', notes:{ CFA109:[17.00,13.00], LTR112:[12.00,16.50], ESC118:[14.50,12.25], LTR135:[16.00,18.00] } },
  { code:'MAR655211', nom:'BECHCHAR',     prenom:'Jihane',           cin:'WA344305', ddn:'19/02/2006', notes:{ CFA109:[14.75,10.50], LTR112:[13.00,11.00], ESC118:[10.00,10.75], LTR135:[17.83,16.00] } },
  { code:'MAR655216', nom:'DERRAGUI',     prenom:'Abderrahmane',     cin:'WA316281', ddn:'02/09/2004', notes:{ CFA109:[15.00,12.00], LTR112:[17.00,13.00], ESC118:[14.50,11.75], LTR135:[17.50,19.00] } },
  { code:'MAR655221', nom:'EL ALAMI',     prenom:'Hiba',             cin:'BW57517',  ddn:'18/08/2005', notes:{ CFA109:[16.75,15.50], LTR112:[10.50,15.00], ESC118:[11.50,12.50], LTR135:[19.33,19.00] } },
  { code:'MAR655222', nom:'EL AOMARI',    prenom:'Rihab',            cin:'AM6950',   ddn:'11/02/2005', notes:{ CFA109:[15.00,12.00], LTR112:[17.00,15.50], ESC118:[11.00,11.00], LTR135:[17.00,18.00] } },
  { code:'MAR655292', nom:'EL HADI',      prenom:'Jamal',            cin:'BW43005',  ddn:'13/10/2002', notes:{ CFA109:[0.00,0.00],   LTR112:[4.00,0.00],   ESC118:[0.00,0.00],   LTR135:[0.00,0.00]   } },
  { code:'MAR655225', nom:'ELHILALI',     prenom:'Salma',            cin:'WA333616', ddn:'28/08/2004', notes:{ CFA109:[17.00,17.00], LTR112:[18.00,17.50], ESC118:[15.50,15.50], LTR135:[7.50,0.00]   } },
  { code:'MAR655227', nom:'FETTAH',       prenom:'Yousra',           cin:'WA339254', ddn:'17/04/2005', notes:{ CFA109:[17.75,16.00], LTR112:[16.50,17.00], ESC118:[18.50,12.75], LTR135:[19.00,18.50] } },
  { code:'MAR655228', nom:'GUERMOUDI',    prenom:'Kaoutar',          cin:'BJ491259', ddn:'07/11/2005', notes:{ CFA109:[12.00,14.00], LTR112:[17.00,3.00],  ESC118:[10.00,10.00], LTR135:[0.00,17.50]  } },
  { code:'MAR655229', nom:'HAMDOUN',      prenom:'Hind',             cin:'WA334464', ddn:'09/11/2005', notes:{ CFA109:[13.50,10.00], LTR112:[8.00,13.00],  ESC118:[15.50,15.25], LTR135:[17.50,15.50] } },
  { code:'MAR655230', nom:'HIDROUNI',     prenom:'Fatima',           cin:'V387752',  ddn:'24/10/2003', notes:{ CFA109:[14.00,10.00], LTR112:[11.00,12.00], ESC118:[15.50,8.00],  LTR135:[17.17,18.50] } },
  { code:'MAR655295', nom:'HIDROUNI',     prenom:'Ayoub',            cin:'V392993',  ddn:'17/10/2005', notes:{ CFA109:[15.25,12.50], LTR112:[13.00,8.00],  ESC118:[15.50,10.25], LTR135:[8.67,19.50]  } },
  { code:'MAR655232', nom:'JAFRANE',      prenom:'Majdouline',       cin:'BW63906',  ddn:'15/04/2005', notes:{ CFA109:[12.00,8.00],  LTR112:[13.00,10.00], ESC118:[11.00,9.75],  LTR135:[16.50,19.00] } },
  { code:'MAR655299', nom:'JAFUR',        prenom:'Oussama',          cin:'BJ485431', ddn:'11/02/2005', notes:{ CFA109:[10.00,8.00],  LTR112:[12.00,13.00], ESC118:[12.50,8.00],  LTR135:[19.00,17.50] } },
  { code:'MAR655233', nom:'JENNANI',      prenom:'Mohamed Amine',    cin:'WA345293', ddn:'01/09/2004', notes:{ CFA109:[0.00,2.00],   LTR112:[16.00,3.00],  ESC118:[15.00,0.25],  LTR135:[7.33,16.50]  } },
  { code:'MAR655234', nom:'KAMLI',        prenom:'Ayoub',            cin:'WA341045', ddn:'05/01/2006', notes:{ CFA109:[12.00,7.50],  LTR112:[12.50,12.00], ESC118:[11.50,6.50],  LTR135:[18.17,16.00] } },
  { code:'MAR655303', nom:'KAZI',         prenom:'Yassine',          cin:'BW56115',  ddn:'26/09/2005', notes:{ CFA109:[7.50,2.00],   LTR112:[10.50,3.00],  ESC118:[15.00,8.00],  LTR135:[19.50,14.50] } },
  { code:'MAR655304', nom:'KHAMMALI',     prenom:'Smail',            cin:'WA340436', ddn:'17/12/2005', notes:{ CFA109:[1.00,2.00],   LTR112:[9.00,0.00],   ESC118:[3.00,10.50],  LTR135:[17.00,15.00] } },
  { code:'MAR655235', nom:'LARAKI',       prenom:'Youssef',          cin:'WA333438', ddn:'01/01/2005', notes:{ CFA109:[1.00,2.00],   LTR112:[5.00,3.00],   ESC118:[10.00,8.00],  LTR135:[17.83,18.50] } },
  { code:'MAR655237', nom:'MAKTOUB',      prenom:'Rayane',           cin:'BW57671',  ddn:'10/12/2005', notes:{ CFA109:[18.00,13.00], LTR112:[10.50,15.00], ESC118:[12.50,10.00], LTR135:[19.50,18.50] } },
  { code:'MAR655308', nom:'OUAHBI',       prenom:'Mamoun',           cin:'WA336583', ddn:'06/02/2006', notes:{ CFA109:[3.00,7.00],   LTR112:[10.50,13.00], ESC118:[14.50,8.25],  LTR135:[19.50,20.00] } },
  { code:'MAR655240', nom:'RIMANE',       prenom:'Abderrazak',       cin:'BW50700',  ddn:'19/03/2006', notes:{ CFA109:[18.25,16.75], LTR112:[19.00,18.00], ESC118:[15.50,17.00], LTR135:[18.67,17.50] } },
  { code:'MAR655317', nom:'SAHRAOUI',     prenom:'Mohamed',          cin:'BW35296',  ddn:'06/07/2004', notes:{ CFA109:[0.00,0.00],   LTR112:[7.00,0.00],   ESC118:[14.50,12.75], LTR135:[9.00,19.00]  } },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🔑 Récupération du token OAuth2…');
  const token = await getAccessToken();
  console.log('✅ Token obtenu\n');

  // ── 1. Groupes ──────────────────────────────────────────────────────────────
  console.log(`📋 Injection de ${GROUPES.length} groupes…`);
  for (const g of GROUPES) {
    await upsert(token, 'groupes', g.id, { ...g, createdAt: NOW });
    process.stdout.write('.');
  }
  console.log(' ✅\n');

  // ── 2. Intervenants ─────────────────────────────────────────────────────────
  console.log(`👨‍🏫 Injection de ${INTERVENANTS.length} intervenants…`);
  for (const i of INTERVENANTS) {
    const { id, ...data } = i;
    await upsert(token, 'intervenants', id, { ...data, createdAt: NOW });
    process.stdout.write('.');
  }
  console.log(' ✅\n');

  // ── 3. Modules ───────────────────────────────────────────────────────────────
  console.log(`📚 Injection de ${MODULES.length} modules…`);
  for (const m of MODULES) {
    const { id, ...data } = m;
    await upsert(token, 'modules', id, { ...data, anneeAcademique: ANNEE, createdAt: NOW });
    process.stdout.write('.');
  }
  console.log(' ✅\n');

  // ── 4. Évaluations ───────────────────────────────────────────────────────────
  const EVALS = makeEvals();
  console.log(`📝 Injection de ${EVALS.length} évaluations…`);
  for (const e of EVALS) {
    const { id, ...data } = e;
    await upsert(token, 'evaluations', id, data);
    process.stdout.write('.');
  }
  console.log(' ✅\n');

  // ── 5. Apprenants + Notes ────────────────────────────────────────────────────

  // Helper: injecte un apprenant + ses notes
  async function injectStudent(s, groupeId, filiere, niveau, evalMap) {
    // Student
    const stdData = {
      nom: s.nom, prenom: s.prenom, codeApprenant: s.code,
      cin: s.cin || null, dateNaissance: s.ddn || null,
      groupeId, filiere, niveau, anneeAcademique: ANNEE,
      actif: true, createdAt: NOW,
    };
    await upsert(token, 'students', s.code, stdData);

    // Notes
    for (const [evalId, noteVal] of Object.entries(evalMap(s))) {
      if (noteVal === null || noteVal === undefined) continue;
      const absent = noteVal === 0;
      const noteId = `${evalId}--${s.code}`;
      await upsert(token, 'notes', noteId, {
        evaluationId: evalId,
        studentId: s.code,
        studentNom: s.nom,
        studentPrenom: s.prenom,
        note: absent ? null : noteVal,
        absent,
        commentaire: '',
        createdAt: NOW,
      });
    }
  }

  // TS.A
  console.log(`🎓 TS.A OTM – ${TS_A.length} apprenants…`);
  for (const s of TS_A) {
    await injectStudent(s, 'ts-a-otm-1a-2025', 'OTM', 'TS 1A', (st) => {
      const map = {};
      OTM_MODS_S1.forEach((mod, i) => {
        map[`${mod}-ts-a-otm-1a-2025-moy`] = st.notes[i] ?? null;
      });
      return map;
    });
    process.stdout.write('.');
    await sleep(50);
  }
  console.log(' ✅\n');

  // TS.B
  console.log(`🎓 TS.B OTM – ${TS_B.length} apprenants…`);
  for (const s of TS_B) {
    await injectStudent(s, 'ts-b-otm-1a-2025', 'OTM', 'TS 1A', (st) => {
      const map = {};
      OTM_MODS_S1.forEach((mod, i) => {
        map[`${mod}-ts-b-otm-1a-2025-moy`] = st.notes[i] ?? null;
      });
      return map;
    });
    process.stdout.write('.');
    await sleep(50);
  }
  console.log(' ✅\n');

  // Licence CNAM G1
  console.log(`🎓 Licence CNAM G1 – ${CNAM_G1.length} apprenants…`);
  for (const s of CNAM_G1) {
    await injectStudent(s, 'licence-cnam-g1-2025', 'Licence Achats & Supply Chain', 'Licence LG03608A', (st) => {
      const map = {};
      for (const mod of CNAM_MODS_WITH_DATA) {
        const [cc, efm] = st.notes[mod] || [null, null];
        map[`${mod}-licence-cnam-g1-2025-cc`]  = cc;
        map[`${mod}-licence-cnam-g1-2025-efm`] = efm;
      }
      return map;
    });
    process.stdout.write('.');
    await sleep(50);
  }
  console.log(' ✅\n');

  // Licence CNAM G2
  console.log(`🎓 Licence CNAM G2 – ${CNAM_G2.length} apprenants…`);
  for (const s of CNAM_G2) {
    await injectStudent(s, 'licence-cnam-g2-2025', 'Licence Achats & Supply Chain', 'Licence LG03608A', (st) => {
      const map = {};
      for (const mod of CNAM_MODS_WITH_DATA) {
        const [cc, efm] = st.notes[mod] || [null, null];
        map[`${mod}-licence-cnam-g2-2025-cc`]  = cc;
        map[`${mod}-licence-cnam-g2-2025-efm`] = efm;
      }
      return map;
    });
    process.stdout.write('.');
    await sleep(50);
  }
  console.log(' ✅\n');

  // ── Résumé ───────────────────────────────────────────────────────────────────
  const totalStudents = TS_A.length + TS_B.length + CNAM_G1.length + CNAM_G2.length;
  const totalNotes = TS_A.length * 6 + TS_B.length * 6
    + CNAM_G1.length * CNAM_MODS_WITH_DATA.length * 2
    + CNAM_G2.length * CNAM_MODS_WITH_DATA.length * 2;
  console.log('═════════════════════════════════════════');
  console.log(`✅ Injection terminée !`);
  console.log(`   ${GROUPES.length} groupes`);
  console.log(`   ${INTERVENANTS.length} intervenants`);
  console.log(`   ${MODULES.length} modules`);
  console.log(`   ${EVALS.length} évaluations`);
  console.log(`   ${totalStudents} apprenants`);
  console.log(`   ~${totalNotes} notes`);
  console.log('═════════════════════════════════════════');
}

main().catch(err => { console.error('\n❌', err.message); process.exit(1); });
