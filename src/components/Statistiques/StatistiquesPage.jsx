import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';

// ── Brand ────────────────────────────────────────────────────────────────────
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
  { id: 'general',      label: 'Vue générale' },
  { id: 'effectifs',    label: 'Effectifs' },
  { id: 'notes',        label: 'Notes' },
  { id: 'absences',     label: 'Absences' },
  { id: 'paiements',    label: 'Paiements' },
  { id: 'intervenants', label: 'Intervenants' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '—';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function fmtEur(n) {
  if (n == null) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function last6Months() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] };
  });
}

// ── Shared UI components ─────────────────────────────────────────────────────
function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children }) {
  return <h2 className="font-bold text-slate-800 mb-4 text-base">{children}</h2>;
}

function KpiCard({ label, value, sub, color = BLUE, icon, trend }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: `${color}18` }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-black leading-none" style={{ color }}>{value}</p>
          <p className="text-sm font-semibold text-slate-700 leading-tight mt-0.5">{label}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
        {trend != null && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0 ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </Card>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}

function Empty({ msg = 'Aucune donnée disponible' }) {
  return (
    <div className="py-14 text-center text-slate-400 text-sm">{msg}</div>
  );
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
function VueGenerale({ students, groupes, modules, intervenants, presences, factures, loading }) {
  const presenceRate = useMemo(() => {
    if (!presences.length) return null;
    const present = presences.filter(p => p.statut === 'present').length;
    return Math.round((present / presences.length) * 100);
  }, [presences]);

  const revenusMonth = useMemo(() => {
    const now = new Date();
    return factures
      .filter(f => {
        const d = f.datePaiement?.toDate?.() || (f.datePaiement ? new Date(f.datePaiement) : null);
        return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((acc, f) => acc + (Number(f.montantPaye) || Number(f.montant) || 0), 0);
  }, [factures]);

  // Sparkline data: presences by status for mini area
  const presenceSparkData = useMemo(() => {
    const statuts = ['present', 'retard', 'absent'];
    return statuts.map(s => ({ name: s, value: presences.filter(p => p.statut === s).length }));
  }, [presences]);

  // Donut data for filiere distribution
  const filiereData = useMemo(() => {
    const map = {};
    students.forEach(s => { const k = s.filiereCode || s.filiere || 'Autre'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([k, v]) => ({ name: k, value: v, color: FILIERES[k]?.color || SLATE }));
  }, [students]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Apprenants" value={fmt(students.length)} icon="🎓" color={BLUE} sub={`${groupes.length} groupes`} />
        <KpiCard label="Intervenants" value={fmt(intervenants.length)} icon="👨‍🏫" color="#7c3aed" />
        <KpiCard label="Groupes" value={fmt(groupes.length)} icon="🏫" color="#0ea5e9" />
        <KpiCard label="Modules" value={fmt(modules.length)} icon="📚" color={GREEN} />
        <KpiCard
          label="Taux présence"
          value={presenceRate != null ? `${presenceRate}%` : '—'}
          icon="📊"
          color={presenceRate == null ? SLATE : presenceRate >= 80 ? '#16a34a' : presenceRate >= 60 ? '#d97706' : RED}
          sub={`${presences.length} enreg.`}
        />
        <KpiCard label="Revenus mois" value={fmtEur(revenusMonth)} icon="💶" color={YELLOW} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par filière donut */}
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

        {/* Assiduité globale */}
        <Card>
          <CardTitle>Assiduité globale</CardTitle>
          {presences.length === 0 ? <Empty msg="Aucun émargement enregistré" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={presenceSparkData}
                  dataKey="value"
                  cx="50%" cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  <Cell fill="#16a34a" />
                  <Cell fill="#d97706" />
                  <Cell fill={RED} />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => v.charAt(0).toUpperCase() + v.slice(1)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── 2. Effectifs ─────────────────────────────────────────────────────────────
function Effectifs({ students, groupes, loading }) {
  const filiereBar = useMemo(() => {
    const map = {};
    students.forEach(s => { const k = s.filiereCode || s.filiere || 'Autre'; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map)
      .map(([k, v]) => ({ filiere: k, effectif: v, color: FILIERES[k]?.color || SLATE }))
      .sort((a, b) => b.effectif - a.effectif);
  }, [students]);

  const groupeBar = useMemo(() => {
    return groupes
      .map(g => ({ nom: g.nom?.split('–').pop()?.trim() || g.nom || g.id, effectif: students.filter(s => s.groupeId === g.id).length }))
      .sort((a, b) => b.effectif - a.effectif)
      .slice(0, 15);
  }, [students, groupes]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart by filière */}
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

        {/* Pie chart distribution */}
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

      {/* Bar chart by groupe */}
      <Card>
        <CardTitle>Effectifs par groupe (top 15)</CardTitle>
        {groupeBar.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={groupeBar} margin={{ top: 4, right: 8, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="effectif" name="Effectif" fill={BLUE} radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

// ── 3. Notes ─────────────────────────────────────────────────────────────────
function Notes({ loading, notes, evaluations, groupes }) {
  const histogram = useMemo(() => {
    const ranges = [
      { label: '0-5',   min: 0,  max: 5  },
      { label: '5-8',   min: 5,  max: 8  },
      { label: '8-10',  min: 8,  max: 10 },
      { label: '10-12', min: 10, max: 12 },
      { label: '12-14', min: 12, max: 14 },
      { label: '14-16', min: 14, max: 16 },
      { label: '16-18', min: 16, max: 18 },
      { label: '18-20', min: 18, max: 20 },
    ];
    return ranges.map(r => ({
      range: r.label,
      count: notes.filter(n => {
        const v = Number(n.note ?? n.valeur ?? n.score);
        return v >= r.min && v < r.max;
      }).length,
    }));
  }, [notes]);

  const moyenneParGroupe = useMemo(() => {
    const evalByGroup = {};
    evaluations.forEach(ev => {
      const gid = ev.groupeId;
      if (!gid) return;
      if (!evalByGroup[gid]) evalByGroup[gid] = [];
      evalByGroup[gid].push(ev.id);
    });

    return groupes.map(g => {
      const evalIds = evalByGroup[g.id] || [];
      const relevant = notes.filter(n => evalIds.includes(n.evaluationId));
      const vals = relevant.map(n => Number(n.note ?? n.valeur ?? n.score)).filter(v => !isNaN(v));
      const moy = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
      return { nom: g.nom?.split('–').pop()?.trim() || g.nom || g.id, moyenne: moy ? Number(moy) : null, count: vals.length };
    }).filter(g => g.moyenne !== null).sort((a, b) => b.moyenne - a.moyenne).slice(0, 12);
  }, [notes, evaluations, groupes]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Histogram */}
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

      {/* Moyenne par groupe */}
      <Card>
        <CardTitle>Moyenne par groupe</CardTitle>
        {moyenneParGroupe.length === 0 ? <Empty msg="Pas assez de données" /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={moyenneParGroupe} margin={{ top: 4, right: 8, left: -10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip fmt={v => `${v}/20`} />} />
              <Bar dataKey="moyenne" name="Moyenne" fill={GREEN} radius={[5, 5, 0, 0]}>
                {moyenneParGroupe.map((entry, i) => (
                  <Cell key={i} fill={entry.moyenne >= 10 ? GREEN : entry.moyenne >= 8 ? YELLOW : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {/* Color legend */}
        {moyenneParGroupe.length > 0 && (
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: GREEN }} /> ≥ 10</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: YELLOW }} /> 8-10</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: RED }} /> &lt; 8</div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── 4. Absences ──────────────────────────────────────────────────────────────
function Absences({ absences, groupes, loading }) {
  const absByGroupe = useMemo(() => {
    const map = {};
    absences.forEach(a => {
      const gid = a.groupeId || a.groupe || 'Inconnu';
      map[gid] = (map[gid] || 0) + 1;
    });
    return Object.entries(map)
      .map(([gid, count]) => {
        const g = groupes.find(gr => gr.id === gid);
        return { nom: g?.nom?.split('–').pop()?.trim() || gid, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [absences, groupes]);

  const maxAbs = Math.max(...absByGroupe.map(g => g.count), 1);

  const absByType = useMemo(() => {
    const map = {};
    absences.forEach(a => { const t = a.motif || a.type || 'Non justifiée'; map[t] = (map[t] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [absences]);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Absences par groupe (top 15)</CardTitle>
        {absByGroupe.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={absByGroupe} margin={{ top: 4, right: 8, left: -10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="nom" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Absences" radius={[5, 5, 0, 0]}>
                {absByGroupe.map((entry, i) => (
                  <Cell key={i} fill={entry.count / maxAbs > 0.7 ? RED : entry.count / maxAbs > 0.4 ? YELLOW : BLUE} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {absByGroupe.length > 0 && (
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: RED }} /> Élevé (&gt;70%)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: YELLOW }} /> Modéré (40-70%)</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full" style={{ background: BLUE }} /> Faible</div>
          </div>
        )}
      </Card>

      {absByType.length > 0 && (
        <Card>
          <CardTitle>Répartition par motif</CardTitle>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={absByType} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                {absByType.map((_, i) => (
                  <Cell key={i} fill={[RED, YELLOW, BLUE, GREEN, '#7c3aed', '#0ea5e9'][i % 6]} />
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
      const total = factures
        .filter(f => {
          const d = f.datePaiement?.toDate?.() || (f.datePaiement ? new Date(f.datePaiement) : null);
          return d && d.getMonth() === m.month && d.getFullYear() === m.year;
        })
        .reduce((acc, f) => acc + (Number(f.montantPaye) || Number(f.montant) || 0), 0);
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
      {/* Bar chart revenus par mois */}
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

      {/* Pie chart statut paiement */}
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

        {/* Summary cards */}
        <Card>
          <CardTitle>Résumé financier</CardTitle>
          <div className="space-y-3">
            {[
              { label: 'Total facturé', value: fmtEur(factures.reduce((a, f) => a + (Number(f.montant) || 0), 0)), color: BLUE },
              { label: 'Total encaissé', value: fmtEur(factures.reduce((a, f) => a + (Number(f.montantPaye) || 0), 0)), color: '#16a34a' },
              { label: 'Reste à payer', value: fmtEur(factures.reduce((a, f) => a + Math.max(0, (Number(f.montant) || 0) - (Number(f.montantPaye) || 0)), 0)), color: RED },
              { label: 'Nb factures', value: String(factures.length), color: SLATE },
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
      const iid = s.intervenantId;
      if (!iid) return;
      map[iid] = (map[iid] || 0) + (Number(s.duree) || 1.5);
    });
    return Object.entries(map)
      .map(([iid, heures]) => {
        const iv = intervenants.find(i => i.id === iid);
        const nom = iv ? `${iv.prenom || ''} ${iv.nom || ''}`.trim() || iid : iid;
        return { nom: nom.substring(0, 20), heures: Math.round(heures * 10) / 10 };
      })
      .sort((a, b) => b.heures - a.heures)
      .slice(0, 10);
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
        {masseHoraire.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={masseHoraire} layout="vertical" margin={{ top: 4, right: 40, left: 100, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} unit=" h" />
              <YAxis type="category" dataKey="nom" tick={{ fontSize: 11 }} width={95} />
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
  const [loading, setLoading] = useState(true);

  const [students, setStudents]       = useState([]);
  const [groupes, setGroupes]         = useState([]);
  const [modules, setModules]         = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [notes, setNotes]             = useState([]);
  const [presences, setPresences]     = useState([]);
  const [absences, setAbsences]       = useState([]);
  const [factures, setFactures]       = useState([]);
  const [intervenants, setIntervenants] = useState([]);
  const [sessions, setSessions]       = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const snap = async (col) => {
          const s = await getDocs(collection(db, col));
          return s.docs.map(d => ({ id: d.id, ...d.data() }));
        };
        const [s, g, mo, ev, no, pr, ab, fa, iv, se] = await Promise.all([
          snap('students'),
          snap('groupes'),
          snap('modules'),
          snap('evaluations'),
          snap('notes'),
          snap('presences'),
          snap('absences'),
          snap('factures'),
          snap('intervenants'),
          snap('sessions'),
        ]);
        setStudents(s);
        setGroupes(g);
        setModules(mo);
        setEvaluations(ev);
        setNotes(no);
        setPresences(pr);
        setAbsences(ab);
        setFactures(fa);
        setIntervenants(iv);
        setSessions(se);
      } catch {}
      setLoading(false);
    };
    fetchAll();
  }, []);

  const tabProps = { students, groupes, modules, evaluations, notes, presences, absences, factures, intervenants, sessions, loading };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Statistiques</h1>
          <p className="text-slate-400 text-sm mt-0.5">Tableau de bord analytique — plateforme pédagogique</p>
        </div>
        <div className="text-xs text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shrink-0">
          Année 2025–2026
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-max px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
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
