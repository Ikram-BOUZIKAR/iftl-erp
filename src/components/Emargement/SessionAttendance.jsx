import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessionsService, presencesService, studentsService, groupesService, intervenantsService } from '../../services/firestore';
import { generateFeuillEmargement } from '../../services/pdfService';
import { computeAbsenceScore } from '../../services/absenceService';

const STATUTS = [
  { value: 'present', label: 'Présent', short: 'P', color: 'bg-green-500 text-white', border: 'border-green-500' },
  { value: 'retard', label: 'Retard', short: 'R', color: 'bg-yellow-500 text-white', border: 'border-yellow-500' },
  { value: 'absent_justifie', label: 'Absent Justifié', short: 'AJ', color: 'bg-blue-500 text-white', border: 'border-blue-500' },
  { value: 'absent_non_justifie', label: 'Absent N.J.', short: 'ANJ', color: 'bg-red-500 text-white', border: 'border-red-500' },
];

export default function SessionAttendance() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [groupe, setGroupe] = useState(null);
  const [intervenant, setIntervenant] = useState(null);
  const [attendance, setAttendance] = useState({}); // studentId → { statut, heureArrivee, justification }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      const sess = await sessionsService.getById(id);
      if (!sess) { setLoading(false); return; }
      setSession(sess);

      const [presences, studentsData, groupeData, intervenantData] = await Promise.all([
        presencesService.getBySession(id),
        sess.groupeId ? studentsService.getAll({ groupeId: sess.groupeId }) : Promise.resolve([]),
        sess.groupeId ? groupesService.getById(sess.groupeId) : Promise.resolve(null),
        sess.intervenantId ? intervenantsService.getById(sess.intervenantId) : Promise.resolve(null),
      ]);

      setStudents(studentsData.filter(s => s.statut === 'actif'));
      setGroupe(groupeData);
      setIntervenant(intervenantData);

      // Initialize attendance from existing presences
      const init = {};
      for (const s of studentsData.filter(s => s.statut === 'actif')) {
        init[s.id] = { statut: 'present', heureArrivee: '', justification: '' };
      }
      for (const p of presences) {
        if (init[p.studentId] !== undefined) {
          init[p.studentId] = { statut: p.statut, heureArrivee: p.heureArrivee || '', justification: p.justification || '' };
        }
      }
      setAttendance(init);
      setLoading(false);
    };
    load();
  }, [id]);

  const setStatut = (studentId, statut) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], statut } }));
    setSaved(false);
  };

  const setExtra = (studentId, key, val) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: val } }));
    setSaved(false);
  };

  const markAll = (statut) => {
    const next = {};
    for (const s of students) next[s.id] = { ...attendance[s.id], statut };
    setAttendance(next);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = students.map(s => ({
        studentId: s.id,
        statut: attendance[s.id]?.statut || 'present',
        heureArrivee: attendance[s.id]?.heureArrivee || '',
        justification: attendance[s.id]?.justification || '',
      }));
      await presencesService.bulkUpsert(id, entries);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleExportPDF = () => {
    const presences = students.map(s => ({
      studentId: s.id,
      statut: attendance[s.id]?.statut || 'present',
      heureArrivee: attendance[s.id]?.heureArrivee || '',
    }));
    generateFeuillEmargement({ session, students, presences, intervenant, groupe });
  };

  const stats = {
    present: students.filter(s => attendance[s.id]?.statut === 'present').length,
    retard: students.filter(s => attendance[s.id]?.statut === 'retard').length,
    aj: students.filter(s => attendance[s.id]?.statut === 'absent_justifie').length,
    anj: students.filter(s => attendance[s.id]?.statut === 'absent_non_justifie').length,
  };

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    return !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q);
  });

  if (loading) return <div className="p-8 text-center text-gray-400">Chargement…</div>;
  if (!session) return <div className="p-8 text-center text-red-500">Séance introuvable</div>;

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/emargement" className="hover:text-gray-700">Émargement</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{session.module}</span>
      </div>

      {/* Session info + actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Date" value={session.date ? new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
            <InfoItem label="Horaire" value={`${session.heureDebut} – ${session.heureFin}`} />
            <InfoItem label="Groupe" value={groupe?.nom || '—'} />
            <InfoItem label="Intervenant" value={intervenant ? `${intervenant.prenom} ${intervenant.nom}` : '—'} />
            <InfoItem label="Salle" value={session.salle || '—'} />
            <InfoItem label="Type" value={session.type?.toUpperCase() || '—'} />
            <InfoItem label="Statut" value={session.statut} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExportPDF}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
              📄 Exporter PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition flex items-center gap-2"
            >
              {saving ? 'Sauvegarde…' : saved ? '✓ Sauvegardé' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Présents', count: stats.present, color: 'text-green-700 bg-green-50 border-green-200' },
          { label: 'Retards', count: stats.retard, color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
          { label: 'Abs. Justifiés', count: stats.aj, color: 'text-blue-700 bg-blue-50 border-blue-200' },
          { label: 'Abs. Non Just.', count: stats.anj, color: 'text-red-700 bg-red-50 border-red-200' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl border p-3 text-center ${item.color}`}>
            <p className="text-2xl font-bold">{item.count}</p>
            <p className="text-xs font-medium mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher apprenant…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-40 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
        />
        <span className="text-sm text-gray-500 font-medium">Tout marquer :</span>
        {STATUTS.map(s => (
          <button key={s.value} onClick={() => markAll(s.value)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${s.color} hover:opacity-80 transition`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Attendance list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {students.length === 0
              ? 'Aucun apprenant actif dans ce groupe. Ajoutez des apprenants dans la section Apprenants.'
              : 'Aucun apprenant trouvé'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((student, idx) => {
              const att = attendance[student.id] || { statut: 'present', heureArrivee: '', justification: '' };
              return (
                <div key={student.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center gap-4">
                    {/* Number */}
                    <span className="text-xs text-gray-400 font-mono w-6 shrink-0">{idx + 1}</span>

                    {/* Avatar */}
                    {student.photoURL ? (
                      <img src={student.photoURL} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                        {student.nom?.[0]}{student.prenom?.[0]}
                      </div>
                    )}

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{student.nom} {student.prenom}</p>
                      <p className="text-xs text-gray-400">{student.cin || student.email}</p>
                    </div>

                    {/* Status buttons */}
                    <div className="flex gap-1.5 shrink-0">
                      {STATUTS.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setStatut(student.id, s.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition border-2 ${
                            att.statut === s.value
                              ? `${s.color} ${s.border}`
                              : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {s.short}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Extra fields for retard/AJ */}
                  {att.statut === 'retard' && (
                    <div className="mt-2 ml-[3.75rem] flex items-center gap-3">
                      <label className="text-xs text-gray-500">Heure d'arrivée :</label>
                      <input
                        type="time"
                        value={att.heureArrivee}
                        onChange={e => setExtra(student.id, 'heureArrivee', e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none"
                      />
                    </div>
                  )}
                  {att.statut === 'absent_justifie' && (
                    <div className="mt-2 ml-[3.75rem] flex items-center gap-3">
                      <label className="text-xs text-gray-500">Justification :</label>
                      <input
                        type="text"
                        value={att.justification}
                        onChange={e => setExtra(student.id, 'justification', e.target.value)}
                        placeholder="Motif…"
                        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky save button */}
      <div className="sticky bottom-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-gray-900 text-white rounded-xl shadow-lg hover:bg-gray-800 disabled:opacity-50 transition font-medium text-sm"
        >
          {saving ? 'Sauvegarde…' : saved ? '✓ Tout sauvegardé' : '💾 Sauvegarder la feuille'}
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-gray-900 font-semibold mt-0.5">{value}</p>
    </div>
  );
}
