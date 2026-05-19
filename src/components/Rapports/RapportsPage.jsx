import { useEffect, useState } from 'react';
import { useStudents, useSessions, useGroupes } from '../../hooks/useData';
import { presencesService } from '../../services/firestore';
import { computeStudentAbsencesByModule, getAlertColor } from '../../services/absenceService';
import { generateAbsenceReport } from '../../services/pdfService';
import { useAppStore } from '../../store/appStore';
import { Link } from 'react-router-dom';

export default function RapportsPage() {
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
    const absencesByStudent = {};
    for (const s of filtered) absencesByStudent[s.id] = s.byModule;
    generateAbsenceReport({ students: filtered, absencesByStudent, academicYear });
  };

  const ALERT_STYLES = {
    danger: 'bg-red-100 text-red-700 border-red-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    ok: 'bg-green-100 text-green-700 border-green-300',
  };
  const ALERT_LABELS = { danger: '⚠ Danger', warning: '⚡ Alerte', ok: '✓ OK' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports des absences</h1>
          <p className="text-gray-500 text-sm">Année {academicYear} · {filtered.length} apprenants</p>
        </div>
        <button onClick={handleExportPDF}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition flex items-center gap-2">
          📄 Exporter PDF
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En danger (≥ 5)', count: studentData.filter(s => s.alertLevel === 'danger').length, color: 'border-red-500 text-red-700' },
          { label: 'En alerte (≥ 3)', count: studentData.filter(s => s.alertLevel === 'warning').length, color: 'border-yellow-500 text-yellow-700' },
          { label: 'Sans alerte', count: studentData.filter(s => s.alertLevel === 'ok').length, color: 'border-green-500 text-green-700' },
        ].map(item => (
          <div key={item.label} className={`bg-white rounded-xl border-l-4 p-4 shadow-sm ${item.color}`}>
            <p className="text-3xl font-bold">{item.count}</p>
            <p className="text-sm text-gray-600 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3">
        <input type="text" placeholder="Rechercher apprenant…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
        <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select value={filterAlert} onChange={e => setFilterAlert(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
          <option value="">Toutes les alertes</option>
          <option value="danger">Danger (≥ 5)</option>
          <option value="warning">Alerte (≥ 3)</option>
          <option value="ok">OK</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Calcul des absences…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun apprenant trouvé</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Apprenant</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Alerte max</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden lg:table-cell">Détail modules</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{s.nom} {s.prenom}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{s.groupeNom}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold border px-2 py-1 rounded ${ALERT_STYLES[s.alertLevel]}`}>
                      {ALERT_LABELS[s.alertLevel]} ({s.maxScore.toFixed(1)})
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(s.byModule).map(([mod, data]) => (
                        <span key={mod} className={`text-xs px-1.5 py-0.5 rounded border ${ALERT_STYLES[data.alertLevel]}`}>
                          {mod}: {data.score.toFixed(1)}
                        </span>
                      ))}
                      {Object.keys(s.byModule).length === 0 && <span className="text-xs text-gray-400">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/apprenants/${s.id}`} className="text-xs text-blue-600 hover:underline">Détail →</Link>
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
