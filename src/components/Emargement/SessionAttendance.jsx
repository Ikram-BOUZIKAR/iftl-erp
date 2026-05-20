import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sessionsService, presencesService, studentsService, groupesService, intervenantsService } from '../../services/firestore';
import { generateFeuillEmargement } from '../../services/pdfService';
import { computeAbsenceScore } from '../../services/absenceService';
import { useToast } from '../UI/Toast';

const STATUTS = [
  { value: 'present', label: 'Présent', short: 'P', bg: 'bg-emerald-500 text-white', border: 'border-emerald-500' },
  { value: 'retard', label: 'Retard', short: 'R', bg: 'bg-amber-500 text-white', border: 'border-amber-500' },
  { value: 'absent_justifie', label: 'Absent Justifié', short: 'AJ', bg: 'bg-blue-500 text-white', border: 'border-blue-500' },
  { value: 'absent_non_justifie', label: 'Absent N.J.', short: 'ANJ', bg: 'bg-red-500 text-white', border: 'border-red-500' },
];

export default function SessionAttendance() {
  const { id } = useParams();
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [groupe, setGroupe] = useState(null);
  const [intervenant, setIntervenant] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  };

  const setExtra = (studentId, key, val) => {
    setAttendance(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: val } }));
  };

  const markAll = (statut) => {
    const next = {};
    for (const s of students) next[s.id] = { ...attendance[s.id], statut };
    setAttendance(next);
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
      toast.success('Feuille de présence sauvegardée');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde : ' + err.message);
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

  if (loading) return (
    <div className="p-12 text-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-slate-400 text-sm mt-3">Chargement…</p>
    </div>
  );
  if (!session) return (
    <div className="p-12 text-center">
      <p className="text-red-500 font-medium">Séance introuvable</p>
      <Link to="/emargement" className="text-indigo-600 hover:text-indigo-700 text-sm mt-2 inline-block">← Retour à l'émargement</Link>
    </div>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/emargement" className="hover:text-slate-700 transition-colors">Émargement</Link>
        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-800 font-medium truncate">{session.module}</span>
      </nav>

      {/* Session info card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
            <InfoItem label="Date" value={session.date ? new Date(session.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'} />
            <InfoItem label="Horaire" value={`${session.heureDebut} – ${session.heureFin}`} />
            <InfoItem label="Groupe" value={groupe?.nom || '—'} />
            <InfoItem label="Intervenant" value={intervenant ? `${intervenant.prenom} ${intervenant.nom}` : '—'} />
            <InfoItem label="Salle" value={session.salle || '—'} />
            <InfoItem label="Type" value={session.type?.toUpperCase() || '—'} />
            <InfoItem label="Statut" value={
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                session.statut === 'en_cours' ? 'bg-emerald-100 text-emerald-700' :
                session.statut === 'terminee' ? 'bg-blue-100 text-blue-700' :
                'bg-slate-100 text-slate-600'
              }`}>{session.statut}</span>
            } />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExportPDF}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors bg-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Présents', count: stats.present, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Retards', count: stats.retard, color: 'text-amber-700 bg-amber-50 border-amber-200' },
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-40">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Rechercher apprenant…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
        </div>
        <span className="text-sm text-slate-500 font-medium shrink-0">Tout marquer :</span>
        {STATUTS.map(s => (
          <button key={s.value} onClick={() => markAll(s.value)}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${s.bg} hover:opacity-80`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Attendance list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎓</span>
            </div>
            <p className="text-slate-700 font-semibold">
              {students.length === 0
                ? 'Aucun apprenant actif dans ce groupe'
                : 'Aucun apprenant trouvé'}
            </p>
            {students.length === 0 && (
              <p className="text-slate-400 text-sm mt-1">
                <Link to="/apprenants" className="text-indigo-600 hover:text-indigo-700 font-medium">Ajouter des apprenants →</Link>
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((student, idx) => {
              const att = attendance[student.id] || { statut: 'present', heureArrivee: '', justification: '' };
              return (
                <div key={student.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-slate-300 font-mono w-6 shrink-0 text-right">{idx + 1}</span>

                    {student.photoURL ? (
                      <img src={student.photoURL} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                        {student.nom?.[0]}{student.prenom?.[0]}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{student.nom} {student.prenom}</p>
                      <p className="text-xs text-slate-400">{student.cin || student.email}</p>
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      {STATUTS.map(s => (
                        <button
                          key={s.value}
                          onClick={() => setStatut(student.id, s.value)}
                          title={s.label}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all border-2 ${
                            att.statut === s.value
                              ? `${s.bg} ${s.border}`
                              : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'
                          }`}
                        >
                          {s.short}
                        </button>
                      ))}
                    </div>
                  </div>

                  {att.statut === 'retard' && (
                    <div className="mt-2 ml-[3.75rem] flex items-center gap-3">
                      <label className="text-xs text-slate-500 font-medium">Heure d'arrivée :</label>
                      <input
                        type="time"
                        value={att.heureArrivee}
                        onChange={e => setExtra(student.id, 'heureArrivee', e.target.value)}
                        className="text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                  {att.statut === 'absent_justifie' && (
                    <div className="mt-2 ml-[3.75rem] flex items-center gap-3">
                      <label className="text-xs text-slate-500 font-medium">Justification :</label>
                      <input
                        type="text"
                        value={att.justification}
                        onChange={e => setExtra(student.id, 'justification', e.target.value)}
                        placeholder="Motif de l'absence…"
                        className="flex-1 text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
      {students.length > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-colors disabled:opacity-60 font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saving ? 'Sauvegarde…' : 'Sauvegarder la feuille'}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{label}</p>
      <div className="text-sm text-slate-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}
