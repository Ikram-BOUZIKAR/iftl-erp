import { useMemo } from 'react';

// ── Données 2026-2027 ─────────────────────────────────────────────────────────

const JOURS_FERIES = {
  '2026-08-14': { label: 'Fête nationale', type: 'ferie' },
  '2026-08-20': { label: 'Révolution du Roi et du Peuple', type: 'ferie' },
  '2026-08-21': { label: 'Fête de la Jeunesse', type: 'ferie' },
  '2026-11-06': { label: 'Marche Verte', type: 'ferie' },
  '2026-11-18': { label: 'Fête de l\'Indépendance', type: 'ferie' },
  '2027-01-01': { label: 'Jour de l\'An', type: 'ferie' },
  '2027-01-12': { label: 'Aïd Al Mawlid Annabaoui', type: 'ferie' },
  '2027-05-01': { label: 'Fête du Travail', type: 'ferie' },
  '2027-07-30': { label: 'Fête du Trône', type: 'ferie' },
};

const VACANCES = [
  { debut: '2026-12-06', fin: '2026-12-13', label: 'Vacances de Noël' },
  { debut: '2027-01-24', fin: '2027-01-31', label: 'Vacances d\'hiver' },
  { debut: '2027-02-17', fin: '2027-03-18', label: 'Ramadan' },
  { debut: '2027-03-21', fin: '2027-03-28', label: 'Vacances de printemps' },
  { debut: '2027-05-09', fin: '2027-05-16', label: 'Vacances de mai' },
];

// Rentrée : semaine du 14 sept. 2026
const RENTREE = '2026-09-14';
// Fin d'année académique approximative
const FIN_ANNEE = '2027-06-30';

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }
function dateStr(y, m, d) { return `${y}-${pad(m + 1)}-${pad(d)}`; }
function getDayOfWeek(y, m, d) { return new Date(y, m, d).getDay(); } // 0=Sun, 6=Sat

function getVacance(ds) {
  return VACANCES.find(v => ds >= v.debut && ds <= v.fin) || null;
}
function isFerie(ds) { return !!JOURS_FERIES[ds]; }
function isWeekend(y, m, d) { const dow = getDayOfWeek(y, m, d); return dow === 0 || dow === 6; }
function isHorsAnnee(ds) { return ds < RENTREE || ds > FIN_ANNEE; }

const LEGEND = [
  { color: 'bg-[#005989]', label: 'Cours / séances' },
  { color: 'bg-emerald-500', label: 'Vacances' },
  { color: 'bg-red-500', label: 'Jour férié' },
  { color: 'bg-amber-400', label: 'Ramadan' },
  { color: 'bg-slate-200', label: 'Week-end / hors année' },
];

function getDayColor(ds, d, m, y) {
  if (isHorsAnnee(ds)) return null;
  if (isWeekend(y, m, d)) return 'weekend';
  const vac = getVacance(ds);
  if (vac) {
    if (vac.label === 'Ramadan') return 'ramadan';
    return 'vacance';
  }
  if (isFerie(ds)) return 'ferie';
  return 'cours';
}

const COLOR_MAP = {
  cours:   { cell: 'bg-[#e8f4fb] text-[#005989] font-semibold ring-1 ring-[#005989]/20', dot: 'bg-[#005989]' },
  vacance: { cell: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  ramadan: { cell: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-400' },
  ferie:   { cell: 'bg-red-50 text-red-700 ring-1 ring-red-200', dot: 'bg-red-500' },
  weekend: { cell: 'bg-slate-50 text-slate-300', dot: '' },
};

function MonthCalendar({ year, month, monthName }) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = (getDayOfWeek(year, month, 1) + 6) % 7; // Mon=0
  const cells = [];
  // Blank cells before day 1
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = dateStr(year, month, d);
    const colorKey = getDayColor(ds, d, month, year);
    cells.push({ d, ds, colorKey });
  }
  // Pad to full grid rows
  while (cells.length % 7 !== 0) cells.push(null);

  // Count cours days this month
  const coursDays = cells.filter(c => c?.colorKey === 'cours').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-700">{monthName}</h3>
        {coursDays > 0 && (
          <span className="text-[10px] text-slate-400">{coursDays}j cours</span>
        )}
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-slate-400 py-0.5">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const style = cell.colorKey ? COLOR_MAP[cell.colorKey] : null;
          const tooltip = isFerie(cell.ds)
            ? JOURS_FERIES[cell.ds].label
            : getVacance(cell.ds)?.label || '';
          return (
            <div
              key={i}
              title={tooltip}
              className={`text-center text-[10px] rounded py-0.5 cursor-default select-none transition-opacity
                ${style ? style.cell : 'text-slate-200'}`}
            >
              {cell.d}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Vacances / fériés list ────────────────────────────────────────────────────
function UpcomingEvents({ today }) {
  const events = [];
  // Jours fériés
  Object.entries(JOURS_FERIES).forEach(([ds, info]) => {
    if (ds >= today) events.push({ ds, label: info.label, type: 'ferie' });
  });
  // Vacances (start date)
  VACANCES.forEach(v => {
    if (v.fin >= today) events.push({ ds: v.debut, label: v.label, type: 'vacance', fin: v.fin });
  });
  events.sort((a, b) => a.ds.localeCompare(b.ds));
  const next = events.slice(0, 8);

  const fmt = (ds) => {
    const d = new Date(ds + 'T12:00:00');
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const daysBetween = (ds) => {
    const t = new Date(today + 'T00:00:00');
    const d = new Date(ds + 'T00:00:00');
    return Math.ceil((d - t) / 86400000);
  };

  return (
    <div className="space-y-2">
      {next.map((e, i) => {
        const diff = daysBetween(e.ds);
        const isRamadan = e.label === 'Ramadan';
        const color = e.type === 'ferie' ? 'bg-red-100 text-red-700 border-red-200'
          : isRamadan ? 'bg-amber-100 text-amber-700 border-amber-200'
          : 'bg-emerald-100 text-emerald-700 border-emerald-200';
        return (
          <div key={i} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${color}`}>
            <div className="text-xs font-bold min-w-[70px]">{fmt(e.ds)}</div>
            <div className="flex-1 text-xs font-medium leading-tight">{e.label}
              {e.fin && e.fin !== e.ds && <span className="font-normal"> → {fmt(e.fin)}</span>}
            </div>
            <div className="text-[10px] font-semibold whitespace-nowrap">
              {diff === 0 ? 'Aujourd\'hui' : diff === 1 ? 'Demain' : `J-${diff}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CalendrierAcademique() {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  // Sept 2026 → Juil 2027
  const months = [
    { year: 2026, month: 8, label: 'Septembre 2026' },
    { year: 2026, month: 9, label: 'Octobre 2026' },
    { year: 2026, month: 10, label: 'Novembre 2026' },
    { year: 2026, month: 11, label: 'Décembre 2026' },
    { year: 2027, month: 0, label: 'Janvier 2027' },
    { year: 2027, month: 1, label: 'Février 2027' },
    { year: 2027, month: 2, label: 'Mars 2027' },
    { year: 2027, month: 3, label: 'Avril 2027' },
    { year: 2027, month: 4, label: 'Mai 2027' },
    { year: 2027, month: 5, label: 'Juin 2027' },
  ];

  // Stats
  let totalCours = 0, totalVac = 0, totalFeries = 0;
  months.forEach(({ year, month }) => {
    const n = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= n; d++) {
      const ds = dateStr(year, month, d);
      const k = getDayColor(ds, d, month, year);
      if (k === 'cours') totalCours++;
      else if (k === 'vacance' || k === 'ramadan') totalVac++;
      else if (k === 'ferie') totalFeries++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Calendrier académique 2026-2027</h2>
          <p className="text-sm text-slate-500 mt-0.5">Rentrée le 15 septembre 2026 · Fin juin 2027</p>
        </div>
        <div className="flex gap-3 text-xs flex-wrap">
          <span className="bg-[#e8f4fb] text-[#005989] px-3 py-1.5 rounded-lg font-semibold border border-[#005989]/20">{totalCours} j. cours</span>
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg font-semibold border border-emerald-200">{totalVac} j. vacances</span>
          <span className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg font-semibold border border-red-200">{totalFeries} j. fériés</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${l.color}`}></span>
            <span className="text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-6 flex-wrap lg:flex-nowrap">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {months.map(m => (
              <MonthCalendar key={m.label} year={m.year} month={m.month} monthName={m.label} />
            ))}
          </div>
        </div>

        {/* Sidebar: upcoming events */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Prochains événements</h3>
            <UpcomingEvents today={today} />
          </div>

          {/* Vacances details */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mt-3">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Vacances scolaires</h3>
            <div className="space-y-2">
              {VACANCES.map(v => {
                const isRamadan = v.label === 'Ramadan';
                const color = isRamadan
                  ? 'border-l-amber-400 bg-amber-50'
                  : 'border-l-emerald-400 bg-emerald-50';
                const fmt = (ds) => new Date(ds + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                return (
                  <div key={v.label} className={`border-l-4 px-3 py-2 rounded-r-lg ${color}`}>
                    <p className="text-xs font-bold text-slate-700">{v.label}</p>
                    <p className="text-[11px] text-slate-500">{fmt(v.debut)} → {fmt(v.fin)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
