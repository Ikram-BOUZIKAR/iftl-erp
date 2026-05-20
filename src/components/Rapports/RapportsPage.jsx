import { useEffect, useState } from 'react';
import { useStudents, useSessions, useGroupes } from '../../hooks/useData';
import { presencesService } from '../../services/firestore';
import { computeStudentAbsencesByModule, getAlertColor } from '../../services/absenceService';
import { generateAbsenceReport } from '../../services/pdfService';
import { useAppStore } from '../../store/appStore';
import { Link } from 'react-router-dom';
import { useToast } from '../UI/Toast';

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

export default function RapportsPage() {
  const toast = useToast();
  const { data: students } = useStudents();
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();
  const academicYear = useAppStore(s => s.academicYear);
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterAlert, setFilterAlert] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadPresences = async () => {
      try {
        const finished = sessions.filter(s => s.statut === 'terminee');
        const all = await Promise.all(finished.map(s => presencesService.getBySession(s.id)));
        setPresences(all.flat());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (sessions.length >= 0) loadPresences();
  }, [sessions]);

  const studentData = students.map(s => {
    const sp = presences.filter(p => p.studentId === s.id);
    const byModule = computeStudentAbsencesByModule(sp, sessions);
    const totalScore = Object.values(byModule).reduce((acc, m) => acc + m.score, 0);
    const maxScore = Math.max(0, ...Object.values(byModule).map(m => m.score));
    const alertLevel = maxScore >= 5 ? 'danger' : maxScore >= 3 ? 'warning' : 'ok';
    const groupe = groupes.find(g => g.id === s.groupeId);
    return { ...s, byModule, totalScore, maxScore, alertLevel, groupeNom: groupe?.nom || s.filiere || '—' };
  });

  const filtered = studentData.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q);
    const matchGroupe = !filterGroupe || s.groupeId === filterGroupe;
    const matchAlert = !filterAlert || s.alertLevel === filterAlert;
    return matchSearch && matchGroupe && matchAlert;
  });

  const handleExportPDF = () => {
    try {
      const absencesByStudent = {};
      for (const s of filtered) absencesByStudent[s.id] = s.byModule;
      generateAbsenceReport({ students: filtered, absencesByStudent, academicYear });
      toast.success('Rapport PDF généré avec succès');
    } catch (err) {
      toast.error('Erreur lors de la génération : ' + err.message);
    }
  };

  const ALERT_STYLES = {
    danger: 'bg-red-100 text-red-700 border-red-200',
    warning: 'bg-amber-100 text-amber-700 border-amber-200',
    ok: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
  const ALERT_LABELS = { danger: 'Danger', warning: 'Alerte', ok: 'OK' };
  const ALERT_ICONS = { danger: '⚠', warning: '⚡', ok: '✓' };

  const dangerCount = studentData.filter(s => s.alertLevel === 'danger').length;
  const warningCount = studentData.filter(s => s.alertLevel === 'warning').length;
  const okCount = studentData.filter(s => s.alertLevel === 'ok').length;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rapports des absences</h1>
          <p className="text-slate-500 text-sm mt-0.5">Année {academicYear} · {filtered.length} apprenant{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={handleExportPDF}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors bg-white shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter PDF
        </button>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En danger', sublabel: '≥ 5 absences', count: dangerCount, color: 'border-red-400', bg: 'bg-red-50', text: 'text-red-700', icon: '⚠' },
          { label: 'En alerte', sublabel: '≥ 3 absences', count: warningCount, color: 'border-amber-400', bg: 'bg-amber-50', text: 'text-amber-700', icon: '⚡' },
          { label: 'Sans alerte', sublabel: 'Tout va bien', count: okCount, color: 'border-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: '✓' },
        ].map(item => (
          <div key={item.label} className={`bg-white rounded-xl border-l-4 p-5 shadow-sm ${item.color}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-3xl font-bold text-slate-800">{item.count}</p>
                <p className="text-sm font-medium text-slate-700 mt-1">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sublabel}</p>
              </div>
              <span className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center ${item.bg}`}>{item.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input type="text" placeholder="Rechercher apprenant…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
        </div>
        <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select value={filterAlert} onChange={e => setFilterAlert(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Toutes les alertes</option>
          <option value="danger">Danger (≥ 5)</option>
          <option value="warning">Alerte (≥ 3)</option>
          <option value="ok">OK</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Calcul des absences…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-slate-700 font-semibold">Aucun apprenant trouvé</p>
            <p className="text-slate-400 text-sm mt-1">Modifiez vos filtres ou ajoutez des apprenants.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Apprenant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Alerte</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Détail modules</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        s.alertLevel === 'danger' ? 'bg-red-100 text-red-700' :
                        s.alertLevel === 'warning' ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {s.nom?.[0]}{s.prenom?.[0]}
                      </div>
                      <p className="font-medium text-slate-800">{s.nom} {s.prenom}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{s.groupeNom}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold border px-2 py-0.5 rounded-full ${ALERT_STYLES[s.alertLevel]}`}>
                      {ALERT_ICONS[s.alertLevel]} {ALERT_LABELS[s.alertLevel]} ({s.maxScore.toFixed(1)})
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(s.byModule).map(([mod, data]) => (
                        <span key={mod} className={`text-xs px-1.5 py-0.5 rounded-full border ${ALERT_STYLES[data.alertLevel]}`}>
                          {mod}: {data.score.toFixed(1)}
                        </span>
                      ))}
                      {Object.keys(s.byModule).length === 0 && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/apprenants/${s.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">Détail →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
