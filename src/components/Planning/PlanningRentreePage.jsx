const BLUE = '#005989';

const S1 = [
  {
    jour: 'Mercredi', date: 16,
    events: [
      { type: 'integration', horaire: '9h00 – 13h30', titre: "Journées d'intégration", detail: 'Accueil festif · TeamBuilding' },
      { type: 'libre', horaire: 'Après-midi', titre: 'Temps libre' },
    ],
  },
  {
    jour: 'Jeudi', date: 17,
    events: [
      { type: 'seminaire', titre: "Séminaire d'ouverture", detail: 'Mot du Directeur Général · M. Karaouane Mohamed' },
    ],
  },
  {
    jour: 'Vendredi', date: 18, off: true,
    events: [{ type: 'off', titre: 'Journée off' }],
  },
];

const S2 = [
  {
    jour: 'Lundi', date: 21,
    events: [
      { type: 'altissia', horaire: '9h00 – 13h00', titre: 'Séminaire ALTISSIA', detail: 'Plateforme de langues · Équipe Altissia' },
      { type: 'libre', horaire: 'Après-midi', titre: 'Temps libre' },
    ],
  },
  { jour: 'Mardi',    date: 22, events: [{ type: 'formation', titre: 'Métier & Formation', detail: 'M. Karaouane Mohamed' }] },
  { jour: 'Mercredi', date: 23, events: [{ type: 'formation', titre: 'Métier & Formation', detail: 'M. Karaouane Mohamed' }] },
  { jour: 'Jeudi',    date: 24, events: [{ type: 'formation', titre: 'Métier & Formation', detail: 'M. Karaouane Mohamed' }] },
  { jour: 'Vendredi', date: 25, events: [{ type: 'formation', titre: 'Métier & Formation', detail: 'M. Karaouane Mohamed' }] },
];

const EVT = {
  integration: 'bg-amber-50  text-amber-800',
  seminaire:   'bg-blue-50   text-[#005989]',
  altissia:    'bg-sky-50    text-sky-700',
  formation:   'bg-emerald-50 text-emerald-800',
  off:         'bg-slate-100 text-slate-400',
  libre:       'border border-dashed border-slate-200 text-slate-400',
};

const LEGEND = [
  { color: '#d97706', label: 'Intégration & TeamBuilding' },
  { color: BLUE,      label: 'Séminaire institutionnel'   },
  { color: '#0369a1', label: 'ALTISSIA — Langues'         },
  { color: '#047857', label: 'Métier & Formation'          },
  { color: '#9ca3af', label: 'Journée off'                },
];

function EvtBlock({ ev }) {
  return (
    <div className={`rounded-lg px-2.5 py-2 flex flex-col gap-0.5 ${EVT[ev.type] || ''}`}>
      {ev.horaire && <span className="text-[10px] font-bold opacity-60 tabular-nums">{ev.horaire}</span>}
      <span className="text-xs font-semibold leading-snug">{ev.titre}</span>
      {ev.detail && <span className="text-[10.5px] opacity-70 leading-tight">{ev.detail}</span>}
    </div>
  );
}

function DayCard({ jour, date, events, off }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col${off ? ' opacity-55' : ''}`}>
      <div className="px-3 py-2.5 border-b border-slate-100" style={{ background: `${BLUE}0d` }}>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: BLUE }}>{jour}</p>
        <p className="text-2xl font-black leading-none mt-0.5 text-slate-800 tabular-nums">{date}</p>
        <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">Septembre 2026</p>
      </div>
      <div className="p-2 flex flex-col gap-1.5 flex-1">
        {events.map((ev, i) => <EvtBlock key={i} ev={ev} />)}
      </div>
    </div>
  );
}

export function RentreeSchedule() {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Semaine 1 — 16 au 18 septembre
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {S1.map(j => <DayCard key={j.date} {...j} />)}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex-1 h-px bg-slate-200" />
        Week-end · 19 &amp; 20 septembre
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
          Semaine 2 — 21 au 25 septembre
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {S2.map(j => <DayCard key={j.date} {...j} />)}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-slate-100">
        {LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlanningRentreePage() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Programme de rentrée</h1>
          <p className="text-slate-500 text-sm mt-0.5">TS 1ère Année — Toutes filières · Septembre 2026</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors shadow-sm"
          style={{ background: BLUE }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <RentreeSchedule />
      </div>
    </div>
  );
}
