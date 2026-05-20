import { useMemo } from 'react';
import { useStudents, useSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { presencesService } from '../../services/firestore';
import { useState, useEffect } from 'react';

const BRAND = '#005989';
const FILIERES = {
  OTM:  { label: 'Organisation du Transport de Marchandises', color: '#005989' },
  OFLP: { label: 'Flux Logistiques & Production',             color: '#0077b6' },
  AEL:  { label: 'Agent d\'Exploitation Logistique',          color: '#00b4d8' },
  ECOM: { label: 'E-Commerce',                                color: '#6a7d10' },
  ADEE: { label: 'Agent Déclarant & Exportation',             color: '#d75930' },
  LIC:  { label: 'Licence CNAM',                              color: '#7c3aed' },
};

function KPI({ label, value, sub, color = BRAND, icon }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: `${color}15` }}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black" style={{ color }}>{value}</p>
        <p className="text-sm font-semibold text-slate-700 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function Bar({ label, value, max, color, count }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs font-medium text-slate-600 truncate shrink-0">{label}</div>
      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full flex items-center pl-2 transition-all"
          style={{ width: `${Math.max(pct, 4)}%`, background: color }}>
          <span className="text-white text-[10px] font-bold whitespace-nowrap">{count}</span>
        </div>
      </div>
      <div className="text-xs font-bold w-10 text-right" style={{ color }}>{pct}%</div>
    </div>
  );
}

function DonutSegment({ pct, offset, color, r = 40 }) {
  const circ = 2 * Math.PI * r;
  return (
    <circle cx="60" cy="60" r={r} fill="none" stroke={color}
      strokeWidth="16" strokeDasharray={`${(pct / 100) * circ} ${circ}`}
      strokeDashoffset={-offset * circ / 100}
      strokeLinecap="butt" transform="rotate(-90 60 60)" />
  );
}

export default function StatistiquesPage() {
  const { data: students } = useStudents();
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [presences, setPresences] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const done = sessions.filter(s => s.statut === 'terminee').slice(0, 100);
        const all = await Promise.all(done.map(s => presencesService.getBySession(s.id)));
        setPresences(all.flat());
      } catch {}
    };
    if (sessions.length) load();
  }, [sessions]);

  // ── Computed stats ──────────────────────────────────────────────────────
  const studentsByFiliere = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const k = s.filiereCode || s.filiere || 'Autre';
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [students]);

  const studentsByGroupe = useMemo(() => {
    const map = {};
    groupes.forEach(g => {
      map[g.id] = { nom: g.nom, count: students.filter(s => s.groupeId === g.id).length };
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [students, groupes]);

  const sessionsByType = useMemo(() => {
    const map = { cours: 0, tp: 0, td: 0, exam: 0, autre: 0 };
    sessions.forEach(s => { map[s.type || 'autre'] = (map[s.type || 'autre'] || 0) + 1; });
    return map;
  }, [sessions]);

  const presenceRate = useMemo(() => {
    if (!presences.length) return null;
    const present = presences.filter(p => p.statut === 'present').length;
    return Math.round((present / presences.length) * 100);
  }, [presences]);

  const absenceRate = presenceRate !== null ? 100 - presenceRate : null;

  const sessionsDone = sessions.filter(s => s.statut === 'terminee').length;
  const sessionsPlanned = sessions.filter(s => s.statut === 'planifiee').length;
  const sessionsTotal = sessions.length;

  const maxStudentGroupe = Math.max(...studentsByGroupe.map(g => g.count), 1);

  const filiereKeys = Object.keys(FILIERES);
  const filiereData = filiereKeys.map(k => ({
    code: k,
    ...FILIERES[k],
    count: studentsByFiliere[k] || 0,
  })).filter(f => f.count > 0);

  // Donut chart data
  const total = students.length || 1;
  let cumOffset = 0;
  const donutSegments = filiereData.map(f => {
    const pct = (f.count / total) * 100;
    const seg = { ...f, pct: Math.round(pct * 10) / 10, offset: cumOffset };
    cumOffset += pct;
    return seg;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Statistiques</h1>
          <p className="text-slate-400 text-sm mt-0.5">Vue analytique de l'activité pédagogique</p>
        </div>
        <div className="text-xs text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
          Année 2025–2026
        </div>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Apprenants inscrits" value={students.length} icon="🎓" color={BRAND} sub={`${groupes.length} groupes`} />
        <KPI label="Séances réalisées" value={sessionsDone} icon="✅" color="#16a34a" sub={`sur ${sessionsTotal} planifiées`} />
        <KPI label="Taux de présence" value={presenceRate !== null ? `${presenceRate}%` : '—'} icon="📊" color={presenceRate >= 80 ? '#16a34a' : presenceRate >= 60 ? '#d97706' : '#dc2626'} sub={`${presences.length} enregistrements`} />
        <KPI label="Intervenants actifs" value={intervenants.length} icon="👨‍🏫" color="#7c3aed" sub={`${sessionsByType.cours || 0} cours planifiés`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Apprenants par filière — Donut ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Répartition par filière</h2>
          {students.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Aucune donnée</div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-32 h-32 -rotate-0">
                  <circle cx="60" cy="60" r="40" fill="none" stroke="#f1f5f9" strokeWidth="16" />
                  {donutSegments.map((seg, i) => (
                    <DonutSegment key={i} pct={seg.pct} offset={seg.offset} color={seg.color} />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-2xl font-black text-slate-800">{students.length}</p>
                  <p className="text-[10px] text-slate-400 font-medium">total</p>
                </div>
              </div>
              <div className="w-full space-y-1.5">
                {filiereData.map(f => (
                  <div key={f.code} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.color }} />
                      <span className="text-slate-600 font-medium">{f.code}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: f.color }}>{f.count}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">{Math.round((f.count / total) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Apprenants par groupe — Barres ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:col-span-2">
          <h2 className="font-bold text-slate-800 mb-4">Effectifs par groupe</h2>
          {studentsByGroupe.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">Aucun groupe</div>
          ) : (
            <div className="space-y-2.5">
              {studentsByGroupe.map((g, i) => {
                const filCode = groupes.find(gr => gr.nom === g.nom)?.filiereCode;
                const col = FILIERES[filCode]?.color || BRAND;
                return (
                  <Bar key={i} label={g.nom.split('–').pop().trim() || g.nom} value={g.count} max={maxStudentGroupe} color={col} count={g.count} />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Séances par type ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Séances par type</h2>
          <div className="space-y-3">
            {[
              { label: 'Cours magistraux', key: 'cours',  color: '#005989', icon: '📖' },
              { label: 'Travaux pratiques', key: 'tp',    color: '#16a34a', icon: '🔬' },
              { label: 'Travaux dirigés',   key: 'td',    color: '#7c3aed', icon: '✏️' },
              { label: 'Examens',           key: 'exam',  color: '#dc2626', icon: '📝' },
            ].map(row => {
              const n = sessionsByType[row.key] || 0;
              const pct = sessionsTotal > 0 ? Math.round((n / sessionsTotal) * 100) : 0;
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center shrink-0">{row.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{row.label}</span>
                      <span className="font-bold" style={{ color: row.color }}>{n} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{sessionsTotal} séances au total</span>
            <span className="font-semibold text-slate-600">{sessionsDone} terminées · {sessionsPlanned} planifiées</span>
          </div>
        </div>

        {/* ── Présences / Absences ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-4">Assiduité globale</h2>
          {presences.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <p>Aucun émargement enregistré</p>
              <p className="text-xs mt-1">Les statistiques apparaîtront après les premières séances</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Présent',   statut: 'present', color: '#16a34a', icon: '✅' },
                { label: 'Absent',    statut: 'absent',  color: '#dc2626', icon: '❌' },
                { label: 'Retard',    statut: 'retard',  color: '#d97706', icon: '⏰' },
              ].map(row => {
                const n = presences.filter(p => p.statut === row.statut).length;
                const pct = presences.length > 0 ? Math.round((n / presences.length) * 100) : 0;
                return (
                  <div key={row.statut} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center shrink-0">{row.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-600">{row.label}</span>
                        <span className="font-bold" style={{ color: row.color }}>{n} ({pct}%)</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: row.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-2 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{presences.length} enregistrements analysés</span>
                  <div className={`text-sm font-black px-3 py-1 rounded-full ${
                    presenceRate >= 80 ? 'bg-green-100 text-green-700' :
                    presenceRate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    Taux : {presenceRate}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Filières — détail ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Détail par filière</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 text-left font-semibold">Filière</th>
                <th className="px-5 py-3 text-left font-semibold">Code</th>
                <th className="px-5 py-3 text-right font-semibold">Apprenants</th>
                <th className="px-5 py-3 text-right font-semibold">Groupes</th>
                <th className="px-5 py-3 text-right font-semibold">Part</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filiereKeys.map(code => {
                const f = FILIERES[code];
                const cnt = studentsByFiliere[code] || 0;
                const nbGroupes = groupes.filter(g => g.filiereCode === code).length;
                const pct = Math.round((cnt / (students.length || 1)) * 100);
                return (
                  <tr key={code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-700">{f.label}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: f.color }}>
                        {code}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-800">{cnt}</td>
                    <td className="px-5 py-3 text-right text-slate-500">{nbGroupes}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: f.color }} />
                        </div>
                        <span className="text-xs font-semibold w-8 text-right" style={{ color: f.color }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
