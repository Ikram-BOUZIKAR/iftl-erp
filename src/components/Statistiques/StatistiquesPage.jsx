import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const BLUE   = '#005989';
const GREEN  = '#c8d45d';
const YELLOW = '#f5c845';
const RED    = '#ef4444';
const SLATE  = '#64748b';

const FILIERES = {
  TMLI: { label: 'TMLI', color: '#005989' },
  LIPF: { label: 'LIPF', color: '#0077b6' },
  GOL:  { label: 'GOL',  color: '#00b4d8' },
  ECMD: { label: 'ECMD', color: '#6a7d10' },
  DMVT: { label: 'DMVT', color: '#d75930' },
  LE:   { label: 'LE',   color: '#f59e0b' },
  CTM:  { label: 'CTM',  color: '#10b981' },
  CTP:  { label: 'CTP',  color: '#8b5cf6' },
  LIC:  { label: 'LIC',  color: '#7c3aed' },
};

const TABS = [
  { id: 'general',      label: 'Vue générale'  },
  { id: 'effectifs',    label: 'Effectifs'      },
  { id: 'notes',        label: 'Notes'          },
  { id: 'absences',     label: 'Absences'       },
  { id: 'paiements',    label: 'Paiements'      },
  { id: 'intervenants', label: 'Intervenants'   },
];

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
function last6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] };
  });
}

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
function fmtEur(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

function getFiliere(s) {
  return s.filiereCode || s.filiere || s.filiereLabel || '';
}

// ── Shared UI ────────────────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>{children}</div>;
}
function CardTitle({ children }) {
  return <h2 className="font-bold text-slate-800 mb-4 text-base">{children}</h2>;
}
function KpiCard({ label, value, sub, color = BLUE, icon }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${color}18` }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
          <p className="text-sm font-semibold text-slate-700 leading-tight mt-0.5">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
function Spinner() {
  return <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
  </div>;
}
function Empty({ msg = 'Aucune donnée disponible' }) {
  return <div className="py-14 text-center text-slate-400 text-sm">{msg}</div>;
}
const CustomTooltip = ({ active, payload, label, fmt: fmtFn }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-bold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{fmtFn ? fmtFn(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── 1. Vue Générale ──────────────────────────────────────────────────────────
function VueGenerale({ students, groupes, modules, intervenants, presences, absences, factures, sessions, loading }) {
  const presenceRate = useMemo(() => {
    if (!presences.length) return null;
    const present = presences.filter(p => p.statut === 'present').length;
    return Math.round((present / presences.length) * 100);
  }, [presences]);

  const revenusMonth = useMemo(() => {
    const now = new Date();
    return factures.filter(f => {
      const d = f.datePaiement?.toDate?.() || (f.datePaiement ? new Date(f.datePaiement) : null);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).reduce((acc, f) => acc + (Number(f.montantPaye) || Number(f.montant) || 0), 0);
  }, [factures]);

  const presenceSparkData = useMemo(() => {
    return [
      { name: 'Présents',  value: presences.filter(p => p.statut === 'present').length,             fill: '#16a34a' },
      { name: 'Retards',   value: presences.filter(p => p.statut === 'retard').length,              fill: YELLOW   },
      { name: 'Absences',  value: absences.length,                                                   fill: RED      },
    ];
  }, [presences, absences]);

  const filiereData = useMemo(() => {
    const map = {};
    students.forEach(s => { const k = getFiliere(s) || 'Autre'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map)
      .map(([k, v]) => ({ name: k, value: v, color: FILIERES[k]?.color || SLATE }))
      .sort((a, b) => b.value - a.value);
  }, [students]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Apprenants actifs" value={fmt(students.length)} icon="🎓" color={BLUE} sub={`${groupes.length} groupes`} />
        <KpiCard label="Intervenants" value={fmt(intervenants.length)} icon="👨‍🏫" color="#7c3aed" />
        <KpiCard label="Groupes" value={fmt(groupes.length)} icon="🏫" color="#0ea5e9" />
        <KpiCard label="Modules" value={fmt(modules.length)} icon="📚" color={GREEN} />
        <KpiCard
          label="Taux présence"
          value={presenceRate != null ? `${presenceRate}%` : '—'}
          icon="📊"
          color={presenceRate == null ? SLATE : presenceRate >= 80 ? '#16a34a' : presenceRate >= 60 ? '#d97706' : RED}
          sub={`${presences.length} enregistrements`}
        />
        <KpiCard label="Séances" value={fmt(sessions.length)} icon="📅" color={YELLOW} sub={`${sessions.filter(s => s.statut === 'terminee').length} terminées`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Répartition apprenants par filière</CardTitle>
          {filiereData.length === 0 ? <Empty /> : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={filiereData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {filiereData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {filiereData.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: f.color }} />
                      <span className="text-slate-600 font-medium">{f.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold" style={{ color: f.color }}>{f.value}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">{Math.round((f.value / (students.length || 1)) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Présences globales</CardTitle>
          {presences.length === 0 ? <Empty msg="Aucun émargement enregistré" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={presenceSparkData} dataKey="value" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => value > 0 ? `${name} (${value})` : ''}
                  labelLine={false}>
                  {presenceSparkData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Séances par statut */}
      <Card>
        <CardTitle>Séances par statut</CardTitle>
        {sessions.length === 0 ? <Empty /> : (() => {
          const data = [
            { statut: 'Planifiée',  count: sessions.filter(s => s.statut === 'planifiee').length,  fill: '#94a3b8' },
            { statut: 'En cours',   count: sessions.filter(s => s.statut === 'en_cours').length,   fill: '#10b981' },
            { statut: 'Terminée',   count: sessions.filter(s => s.statut === 'terminee').length,   fill: BLUE      },
            { statut: 'Annulée',    count: sessions.filter(s => s.statut === 'annulee').length,    fill: RED       },
          ].filter(d => d.count > 0);
          return (
            <div className="flex gap-4 flex-wrap">
              {data.map((d, i) => (
                <div key={i} className="flex-1 min-w-32 rounded-xl border p-4 text-center" style={{ borderColor: d.fill + '40', background: d.fill + '10' }}>
                  <p className="text-3xl font-black" style={{ color: d.fill }}>{d.count}</p>
                  <p className="text-xs font-semibold text-slate-600 mt-1">{d.statut}</p>
                </div>
              ))}
            </div>
          );
        })()}
      </Card>
    </div>
  );
}

// ── 2. Effectifs ─────────────────────────────────────────────────────────────
function Effectifs({ students, groupes, loading }) {
  const filiereBar = useMemo(() => {
    const map = {};
    students.forEach(s => { const k = getFiliere(s) || 'Autre'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map)
      .map(([k, v]) => ({ filiere: k, effectif: v, color: FILIERES[k]?.color || SLATE }))
      .sort((a, b) => b.effectif - a.effectif);
  }, [students]);

  const groupeBar = useMemo(() => {
    return groupes
      .map(g => {
        const count = students.filter(s => s.groupeId === g.id).length;
        return { nom: g.nom || g.id, effectif: count, id: g.id };
      })
      .sort((a, b) => b.effectif - a.effectif)
      .slice(0, 15);
  }, [students, groupes]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Effectifs par filière</CardTitle>
          {filiereBar.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={filiereBar} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="filiere" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="effectif" name="Effectif" radius={[6, 6, 0, 0]}>
                  {filiereBar.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle>Distribution filières</CardTitle>
          {filiereBar.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={filiereBar} dataKey="effectif" nameKey="filiere" cx="50%" cy="50%"
                  outerRadius={100} label={({ filiere, percent }) => `${filiere} ${(percent * 100).toFixed(0)}%`} labelLine>
                  {filiereBar.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>Effectifs par groupe (top 15)</CardTitle>
        {groupeBar.length === 0 ? <Empty /> : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={groupeBar} margin={{ top: 4, right: 8, left: -10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="effectif" name="Effectif" fill={BLUE} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            {/* Table view for zero-count groups */}
            {groupeBar.some(g => g.effectif === 0) && (
              <div className="mt-4 text-xs text-amber-600 bg-amber-50 rounded-xl p-3 border border-amber-100">
                ⚠ Certains groupes affichent 0 apprenant — vérifiez que le champ <code className="font-mono">groupeId</code> des apprenants correspond bien à l'identifiant Firestore du groupe.
              </div>
            )}
          </>
        )}
      </Card>

      {/* Détail groupes avec zéro apprenants */}
      {groupeBar.filter(g => g.effectif === 0).length > 0 && (
        <Card>
          <CardTitle>Groupes sans apprenant affecté</CardTitle>
          <div className="space-y-2">
            {groupeBar.filter(g => g.effectif === 0).map(g => (
              <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm">
                <span className="font-medium text-slate-700">{g.nom}</span>
                <span className="text-xs font-mono text-slate-400">{g.id}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── 3. Notes ─────────────────────────────────────────────────────────────────
function Notes({ loading, notes, evaluations, groupes }) {
  const histogram = useMemo(() => {
    const ranges = [
      { label: '0–5',   min: 0,  max: 5  },
      { label: '5–8',   min: 5,  max: 8  },
      { label: '8–10',  min: 8,  max: 10 },
      { label: '10–12', min: 10, max: 12 },
      { label: '12–14', min: 12, max: 14 },
      { label: '14–16', min: 14, max: 16 },
      { label: '16–18', min: 16, max: 18 },
      { label: '18–20', min: 18, max: 20 },
    ];
    return ranges.map(r => ({
      range: r.label,
      count: notes.filter(n => {
        const v = Number(n.note ?? n.valeur ?? n.score);
        return !isNaN(v) && v >= r.min && v < r.max;
      }).length,
    }));
  }, [notes]);

  const moyenneParGroupe = useMemo(() => {
    const evalByGroup = {};
    evaluations.forEach(ev => {
      if (ev.groupeId) {
        if (!evalByGroup[ev.groupeId]) evalByGroup[ev.groupeId] = [];
        evalByGroup[ev.groupeId].push(ev.id);
      }
    });
    return groupes.map(g => {
      const evalIds = evalByGroup[g.id] || [];
      const relevant = notes.filter(n => evalIds.includes(n.evaluationId));
      const vals = relevant.map(n => Number(n.note ?? n.valeur ?? n.score)).filter(v => !isNaN(v));
      const moy = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
      return { nom: g.nom || g.id, moyenne: moy !== null ? Number(moy.toFixed(2)) : null, count: vals.length };
    }).filter(g => g.moyenne !== null).sort((a, b) => b.moyenne - a.moyenne).slice(0, 12);
  }, [notes, evaluations, groupes]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Distribution des notes</CardTitle>
        {notes.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogram} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Nb étudiants" fill={GREEN} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <CardTitle>Moyenne par groupe</CardTitle>
        {moyenneParGroupe.length === 0 ? <Empty msg="Pas assez de données (notations non saisies)" /> : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moyenneParGroupe} margin={{ top: 4, right: 8, left: -10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip fmt={v => `${v}/20`} />} />
                <Bar dataKey="moyenne" name="Moyenne" radius={[5, 5, 0, 0]}>
                  {moyenneParGroupe.map((entry, i) => (
                    <Cell key={i} fill={entry.moyenne >= 10 ? GREEN : entry.moyenne >= 8 ? YELLOW : RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 text-xs text-slate-500">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: GREEN }} /> ≥ 10</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: YELLOW }} /> 8–10</div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: RED }} /> &lt; 8</div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ── 4. Absences ──────────────────────────────────────────────────────────────
function Absences({ absences, groupes, loading }) {
  // absences are already derived presences with groupeId enriched from sessions
  const absByGroupe = useMemo(() => {
    const map = {};
    absences.forEach(a => {
      const gid = a.groupeId || 'Inconnu';
      map[gid] = (map[gid] || 0) + 1;
    });
    return Object.entries(map)
      .map(([gid, count]) => {
        const g = groupes.find(gr => gr.id === gid);
        return { nom: g?.nom || gid, count, id: gid };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [absences, groupes]);

  const maxAbs = Math.max(...absByGroupe.map(g => g.count), 1);

  const absByType = useMemo(() => {
    const typeLabel = {
      absent_non_justifie: 'Non justifiée',
      absent_justifie:     'Justifiée',
      absent:              'Absence',
    };
    const map = {};
    absences.forEach(a => {
      const t = typeLabel[a.statut] || a.motif || 'Non classifiée';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [absences]);

  if (loading) return <Spinner />;

  if (absences.length === 0) return <Empty msg="Aucune absence enregistrée dans les émargements." />;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-black text-red-500">{absences.length}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1">Total absences</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-black text-amber-500">{absences.filter(a => a.statut === 'absent_non_justifie').length}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1">Non justifiées</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
          <p className="text-3xl font-black text-blue-500">{absences.filter(a => a.statut === 'absent_justifie').length}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1">Justifiées</p>
        </div>
      </div>

      <Card>
        <CardTitle>Absences par groupe (top 15)</CardTitle>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={absByGroupe} margin={{ top: 4, right: 8, left: -10, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Absences" radius={[5, 5, 0, 0]}>
              {absByGroupe.map((entry, i) => (
                <Cell key={i} fill={entry.count / maxAbs > 0.7 ? RED : entry.count / maxAbs > 0.4 ? YELLOW : BLUE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {absByType.length > 0 && (
        <Card>
          <CardTitle>Répartition par motif</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={absByType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                {absByType.map((_, i) => (
                  <Cell key={i} fill={[RED, BLUE, YELLOW, GREEN, '#7c3aed', '#0ea5e9'][i % 6]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}

// ── 5. Paiements ─────────────────────────────────────────────────────────────
function Paiements({ factures, loading }) {
  const months = last6Months();
  const revenusParMois = useMemo(() => {
    return months.map(m => {
      const total = factures.filter(f => {
        const d = f.datePaiement?.toDate?.() || (f.datePaiement ? new Date(f.datePaiement) : null);
        return d && d.getMonth() === m.month && d.getFullYear() === m.year;
      }).reduce((acc, f) => acc + (Number(f.montantPaye) || Number(f.montant) || 0), 0);
      return { mois: m.label, revenus: total };
    });
  }, [factures]);

  const statutData = useMemo(() => {
    const map = {};
    factures.forEach(f => { const s = f.statut || 'inconnu'; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [factures]);
  const statutColors = { solde: GREEN, soldé: GREEN, partiel: YELLOW, impaye: RED, impayé: RED, inconnu: SLATE };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Revenus des 6 derniers mois</CardTitle>
        {factures.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenusParMois} margin={{ top: 4, right: 8, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={YELLOW} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={YELLOW} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => fmtEur(v)} width={80} />
              <Tooltip content={<CustomTooltip fmt={fmtEur} />} />
              <Area type="monotone" dataKey="revenus" name="Revenus" stroke={YELLOW} fill="url(#revGrad)" strokeWidth={2.5} dot={{ r: 4, fill: YELLOW }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle>Répartition par statut</CardTitle>
          {statutData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statutData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                  outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                  {statutData.map((entry, i) => (
                    <Cell key={i} fill={statutColors[entry.name.toLowerCase()] || SLATE} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <CardTitle>Résumé financier</CardTitle>
          <div className="space-y-3">
            {[
              { label: 'Total facturé',  value: fmtEur(factures.reduce((a, f) => a + (Number(f.montant) || 0), 0)),       color: BLUE         },
              { label: 'Total encaissé', value: fmtEur(factures.reduce((a, f) => a + (Number(f.montantPaye) || 0), 0)),    color: '#16a34a'    },
              { label: 'Reste à payer',  value: fmtEur(factures.reduce((a, f) => a + Math.max(0, (Number(f.montant) || 0) - (Number(f.montantPaye) || 0)), 0)), color: RED },
              { label: 'Nb factures',    value: String(factures.length),                                                    color: SLATE        },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                <span className="text-sm text-slate-600 font-medium">{item.label}</span>
                <span className="text-base font-black" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── 6. Intervenants ──────────────────────────────────────────────────────────
function Intervenants({ sessions, intervenants, loading }) {
  const masseHoraire = useMemo(() => {
    const map = {};
    sessions.forEach(s => {
      if (!s.intervenantId) return;
      map[s.intervenantId] = (map[s.intervenantId] || 0) + (Number(s.duree) || 1.5);
    });
    return Object.entries(map)
      .map(([iid, heures]) => {
        const iv = intervenants.find(i => i.id === iid);
        const nom = iv ? `${iv.prenom || ''} ${iv.nom || ''}`.trim() || iid : iid;
        return { nom: nom.substring(0, 22), heures: Math.round(heures * 10) / 10 };
      })
      .sort((a, b) => b.heures - a.heures).slice(0, 10);
  }, [sessions, intervenants]);

  const sessionsByType = useMemo(() => {
    const map = {};
    sessions.forEach(s => { const t = s.type || 'autre'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sessions]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Masse horaire par intervenant (top 10)</CardTitle>
        {masseHoraire.length === 0 ? <Empty msg="Aucune séance avec intervenant enregistrée" /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={masseHoraire} layout="vertical" margin={{ top: 4, right: 40, left: 110, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit=" h" />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 11 }} width={105} />
              <Tooltip content={<CustomTooltip fmt={v => `${v} h`} />} />
              <Bar dataKey="heures" name="Heures" fill={BLUE} radius={[0, 6, 6, 0]}>
                {masseHoraire.map((_, i) => (
                  <Cell key={i} fill={`hsl(${207 - i * 12},${80 - i * 3}%,${35 + i * 4}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <CardTitle>Répartition des séances par type</CardTitle>
        {sessionsByType.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={sessionsByType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                {sessionsByType.map((_, i) => (
                  <Cell key={i} fill={[BLUE, GREEN, YELLOW, RED, '#7c3aed', '#0ea5e9'][i % 6]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function StatistiquesPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading]     = useState(true);
  const [fetchErrors, setFetchErrors] = useState([]);
  const [filterGroupe, setFilterGroupe] = useState('');

  const [students,     setStudents]     = useState([]);
  const [groupes,      setGroupes]      = useState([]);
  const [modules,      setModules]      = useState([]);
  const [evaluations,  setEvaluations]  = useState([]);
  const [notes,        setNotes]        = useState([]);
  const [presences,    setPresences]    = useState([]);
  const [factures,     setFactures]     = useState([]);
  const [intervenants, setIntervenants] = useState([]);
  const [sessions,     setSessions]     = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setFetchErrors([]);
      const errors = [];

      // Safe individual fetch — one failure doesn't kill the rest
      const safe = async (col) => {
        try {
          const s = await getDocs(collection(db, col));
          return s.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
          errors.push(`${col}: ${err.message}`);
          console.warn(`[Stats] Could not load '${col}':`, err.message);
          return [];
        }
      };

      const [s, g, mo, ev, no, pr, fa, iv, se] = await Promise.all([
        safe('students'),
        safe('groupes'),
        safe('modules'),
        safe('evaluations'),
        safe('notes'),
        safe('presences'),
        safe('factures'),
        safe('intervenants'),
        safe('sessions'),
      ]);

      setStudents(s);
      setGroupes(g);
      setModules(mo);
      setEvaluations(ev);
      setNotes(no);
      setPresences(pr);
      setFactures(fa);
      setIntervenants(iv);
      setSessions(se);
      setFetchErrors(errors);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Derive absences from presences + sessions (no separate "absences" collection)
  const absences = useMemo(() => {
    return presences
      .filter(p =>
        p.statut === 'absent_non_justifie' ||
        p.statut === 'absent_justifie' ||
        p.statut === 'absent' ||
        p.present === false
      )
      .map(p => {
        const sess = sessions.find(s => s.id === p.sessionId);
        return { ...p, groupeId: sess?.groupeId || p.groupeId, module: sess?.module || p.module };
      });
  }, [presences, sessions]);

  // Apply group filter across all datasets
  const filtered = useMemo(() => {
    if (!filterGroupe) return { students, groupes, modules, evaluations, notes, presences, absences, factures, intervenants, sessions };

    const filtSess = sessions.filter(s => s.groupeId === filterGroupe);
    const filtSessIds = new Set(filtSess.map(s => s.id));
    const filtEvals = evaluations.filter(e => e.groupeId === filterGroupe);
    const filtEvalIds = new Set(filtEvals.map(e => e.id));

    return {
      students:    students.filter(s => s.groupeId === filterGroupe),
      groupes,
      modules,
      evaluations: filtEvals,
      notes:       notes.filter(n => filtEvalIds.has(n.evaluationId)),
      presences:   presences.filter(p => filtSessIds.has(p.sessionId)),
      absences:    absences.filter(a => filtSessIds.has(a.sessionId)),
      factures,
      intervenants,
      sessions:    filtSess,
    };
  }, [filterGroupe, students, groupes, modules, evaluations, notes, presences, absences, factures, intervenants, sessions]);

  const tabProps = { ...filtered, loading };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Statistiques</h1>
          <p className="text-slate-400 text-sm mt-0.5">Tableau de bord analytique — IFTL</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Group filter */}
          <select
            value={filterGroupe}
            onChange={e => setFilterGroupe(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#005989]"
          >
            <option value="">Tous les groupes</option>
            {groupes.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(g => (
              <option key={g.id} value={g.id}>{g.nom}</option>
            ))}
          </select>
          {filterGroupe && (
            <button onClick={() => setFilterGroupe('')}
              className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Fetch errors warning */}
      {fetchErrors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 mb-1">⚠ Certaines collections n'ont pas pu être chargées :</p>
          <ul className="text-xs text-amber-600 space-y-0.5">
            {fetchErrors.map((e, i) => <li key={i} className="font-mono">{e}</li>)}
          </ul>
        </div>
      )}

      {/* Data summary pills */}
      {!loading && (
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            { label: `${students.length} apprenants`, ok: students.length > 0 },
            { label: `${groupes.length} groupes`,     ok: groupes.length > 0  },
            { label: `${modules.length} modules`,     ok: modules.length > 0  },
            { label: `${sessions.length} séances`,    ok: sessions.length > 0 },
            { label: `${presences.length} présences`, ok: presences.length > 0 },
          ].map((d, i) => (
            <span key={i} className={`px-3 py-1 rounded-full font-semibold border ${d.ok ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
              {d.ok ? '✓' : '○'} {d.label}
            </span>
          ))}
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-max px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'general'      && <VueGenerale {...tabProps} />}
      {activeTab === 'effectifs'    && <Effectifs {...tabProps} />}
      {activeTab === 'notes'        && <Notes {...tabProps} />}
      {activeTab === 'absences'     && <Absences {...tabProps} />}
      {activeTab === 'paiements'    && <Paiements {...tabProps} />}
      {activeTab === 'intervenants' && <Intervenants {...tabProps} />}
    </div>
  );
}
