// ── Shared notes / grade calculation utilities ────────────────────────────────

export const EVAL_TYPES = [
  { value: 'CC',           label: 'Contrôle Continu' },
  { value: 'EFM',          label: 'Examen Final de Module (EFM)' },
  { value: 'EFF',          label: 'Examen de Fin de Formation (EFF)' },
  { value: 'PARTICIPATION', label: 'Participation' },
  { value: 'TD',           label: 'Travaux Dirigés' },
  { value: 'SOUTENANCE',   label: 'Soutenance' },
  { value: 'RATTRAPAGE',   label: 'Rattrapage' },
];

// Types entered via the intervenant portal (as opposed to legacy admin evaluations)
export const NEW_TYPE_SET = new Set(['CC', 'EFM', 'EFF', 'PARTICIPATION', 'TD', 'SOUTENANCE', 'RATTRAPAGE']);

/**
 * Calculate module average using the new fixed-weight formula:
 *   EFM  = 60 %
 *   mean(CC, PARTICIPATION, TD, SOUTENANCE) = 40 %
 *   RATTRAPAGE replaces EFM if higher, capped at 12/20.
 *
 * @param {{ [type: string]: number[] }} notesParType
 *   e.g. { CC: [14, 12], EFM: [10], RATTRAPAGE: [13] }
 * @returns {{ moyenne: number|null, efm, efmEffective, rattrapage, rattrapageApplied, othersAvg }}
 */
export function calculerNouvelleFormule(notesParType) {
  const efmArr       = notesParType.EFM        || [];
  const rattrapageArr = notesParType.RATTRAPAGE || [];
  const autresTypes  = ['CC', 'PARTICIPATION', 'TD', 'SOUTENANCE'];

  // EFM: take the last entered value (one per module per semestre)
  const efm       = efmArr.length > 0       ? efmArr[efmArr.length - 1]             : null;
  const rattrapage = rattrapageArr.length > 0 ? rattrapageArr[rattrapageArr.length - 1] : null;

  // Apply rattrapage rule
  let efmEffective     = efm;
  let rattrapageApplied = false;
  if (rattrapage !== null) {
    const capped = Math.min(rattrapage, 12);
    if (efm === null || capped > efm) {
      efmEffective     = capped;
      rattrapageApplied = true;
    }
  }

  // Average of each "autres" type first, then average the type averages
  const typeMoys = autresTypes
    .filter(t => notesParType[t]?.length > 0)
    .map(t => notesParType[t].reduce((s, n) => s + n, 0) / notesParType[t].length);
  const othersAvg = typeMoys.length > 0
    ? typeMoys.reduce((s, n) => s + n, 0) / typeMoys.length
    : null;

  const round2 = n => Math.round(n * 100) / 100;

  if (efmEffective === null && othersAvg === null) return { moyenne: null };
  if (efmEffective === null) return { moyenne: round2(othersAvg * 0.4), othersAvg, rattrapageApplied };
  if (othersAvg   === null) return { moyenne: round2(efmEffective * 0.6), efm, efmEffective, rattrapage, rattrapageApplied };

  return {
    moyenne: round2(efmEffective * 0.6 + othersAvg * 0.4),
    efm, efmEffective, rattrapage, rattrapageApplied, othersAvg,
  };
}

// ── Mention label ─────────────────────────────────────────────────────────────

export function getMention(moy) {
  const v = parseFloat(moy);
  if (v >= 16) return { label: 'Très bien',   color: 'emerald' };
  if (v >= 14) return { label: 'Bien',         color: 'blue'    };
  if (v >= 12) return { label: 'Assez bien',   color: 'sky'     };
  if (v >= 10) return { label: 'Passable',     color: 'yellow'  };
  return           { label: 'Insuffisant',  color: 'red'     };
}

// ── 2A Passage formula ────────────────────────────────────────────────────────
// Moy2A×30% + Moy1A×20% + Stages×30% + EFF×20% = Moyenne de Passage
// Any null component is excluded and the remaining weights are renormalized.
export function calculerMoyennePassage({ moy2A, moy1A, stages, eff }) {
  const parts = [
    { v: moy2A,  w: 0.30 },
    { v: moy1A,  w: 0.20 },
    { v: stages, w: 0.30 },
    { v: eff,    w: 0.20 },
  ].filter(p => p.v !== null && p.v !== undefined && !isNaN(p.v));

  if (parts.length === 0) return null;

  const totalWeight = parts.reduce((s, p) => s + p.w, 0);
  if (totalWeight === 0) return null;

  const sum = parts.reduce((s, p) => s + p.v * (p.w / totalWeight), 0);
  return Math.round(sum * 100) / 100;
}

export function getDecisionPassage(moy) {
  if (moy === null || moy === undefined) return { decision: '—', color: 'slate' };
  if (moy >= 10) return { decision: 'ADMIS(E)',      color: 'emerald' };
  if (moy >= 8)  return { decision: 'AJOURNÉ(E)',    color: 'orange'  };
  return               { decision: 'REDOUBLANT(E)', color: 'red'     };
}

// ── Formules d'import ─────────────────────────────────────────────────────────

function _n(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? null : n;
}
const _r2 = v => Math.round(v * 100) / 100;

/**
 * Moyenne d'un module 1A TS / 2A TS.
 * Formule universelle : CC × 0,4 + EFM × 0,6
 * Rattrapage remplace l'EFM uniquement s'il est supérieur.
 */
export function calculerMoyenneModule1ATS(cc, efm, rattrapage) {
  const cc_ = _n(cc), efm_ = _n(efm), ratt_ = _n(rattrapage);
  let efmEff = efm_;
  if (ratt_ !== null && (efm_ === null || ratt_ > efm_)) efmEff = ratt_;
  if (cc_ !== null && efmEff !== null) return _r2(cc_ * 0.4 + efmEff * 0.6);
  if (efmEff !== null) return _r2(efmEff * 0.6);
  if (cc_ !== null) return _r2(cc_ * 0.4);
  return null;
}

/**
 * Moyenne d'une UE Licence CNAM.
 * CTL × 0,25 + max(EFM, min(Ratt, 12)) × 0,75
 * LTR126 : si 9 ≤ moy < 10 → relevé à 10.
 */
export function calculerMoyenneUELicence(ctl, efm, rattrapage, codeUE = '') {
  const ctl_ = _n(ctl), efm_ = _n(efm), ratt_ = _n(rattrapage);
  let efmEff = efm_;
  if (ratt_ !== null) {
    const capped = Math.min(ratt_, 12);
    efmEff = efm_ !== null ? Math.max(efm_, capped) : capped;
  }
  if (ctl_ === null && efmEff === null) return null;
  let moy;
  if (ctl_ !== null && efmEff !== null) moy = _r2(ctl_ * 0.25 + efmEff * 0.75);
  else if (efmEff !== null) moy = _r2(efmEff * 0.75);
  else moy = _r2(ctl_ * 0.25);
  if (codeUE === 'LTR126' && moy !== null && moy >= 9 && moy < 10) moy = 10;
  return moy;
}

// ECTS Licence CNAM (UAM10K hors moyenne)
export const ECTS_LICENCE = {
  CFA109: 6, LTR112: 4, ESC118: 4, LTR135: 6, LTR126: 4,
  LTR113: 6, ESC121: 4, LTR143: 6, ANG320: 6, TED001: 3,
};

/**
 * Moyenne générale Licence CNAM pondérée par ECTS (UAM10K exclue).
 * Si moy ≥ 10 : toutes UE notées acquises.
 * Licence validée : moy ≥ 10, TED001 ≥ 10, UAM10K ≥ 10.
 */
export function calculerMoyenneGeneraleLicence(ues) {
  const notables = ues.filter(u => u.code !== 'UAM10K' && u.moyenne !== null);
  if (!notables.length) return null;
  const totalECTS = notables.reduce((s, u) => s + (ECTS_LICENCE[u.code] ?? 0), 0);
  if (totalECTS === 0) return null;
  return _r2(notables.reduce((s, u) => s + u.moyenne * (ECTS_LICENCE[u.code] ?? 0), 0) / totalECTS);
}

/** Statut d'un module 1A TS. */
export function getStatutModule(moy) {
  if (moy === null || moy === undefined) return null;
  if (moy >= 10) return 'valide';
  if (moy >= 9)  return 'rachat';
  return 'non_valide';
}

/**
 * Moyenne 1A TS pondérée par coefficients.
 * @param {Array<{moyenne: number|null, coeff: number}>} modules
 */
export function calculerMoyenne1AGroupe(modules) {
  const ok = modules.filter(m => m.moyenne !== null && m.coeff > 0);
  if (!ok.length) return null;
  const totalCoeff = ok.reduce((s, m) => s + m.coeff, 0);
  return _r2(ok.reduce((s, m) => s + m.moyenne * m.coeff, 0) / totalCoeff);
}

// ── Deadline helpers ──────────────────────────────────────────────────────────

export const NOTE_DEADLINES = {
  S1: new Date('2027-01-30'),
  S2: new Date('2027-05-30'),
};

export function deadlineInfo(semLabel) {
  const dl = NOTE_DEADLINES[semLabel];
  if (!dl) return null;
  const daysLeft = Math.ceil((dl - new Date()) / 86_400_000);
  return {
    date:    dl,
    daysLeft,
    overdue: daysLeft < 0,
    urgent:  daysLeft >= 0 && daysLeft <= 60,
    label:   dl.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  };
}
