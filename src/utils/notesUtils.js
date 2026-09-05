// ── Shared notes / grade calculation utilities ────────────────────────────────

export const EVAL_TYPES = [
  { value: 'CC',           label: 'Contrôle Continu' },
  { value: 'EFM',          label: 'Examen Final de Module (EFM)' },
  { value: 'PARTICIPATION', label: 'Participation' },
  { value: 'TD',           label: 'Travaux Dirigés' },
  { value: 'SOUTENANCE',   label: 'Soutenance' },
  { value: 'RATTRAPAGE',   label: 'Rattrapage' },
];

// Types entered via the intervenant portal (as opposed to legacy admin evaluations)
export const NEW_TYPE_SET = new Set(['CC', 'EFM', 'PARTICIPATION', 'TD', 'SOUTENANCE', 'RATTRAPAGE']);

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
