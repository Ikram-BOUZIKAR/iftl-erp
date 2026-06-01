import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { studentsService } from '../../services/firestore';
import { usePresencesByStudent, useSessions, useGroupes } from '../../hooks/useData';
import { computeStudentAbsencesByModule, getAlertColor } from '../../services/absenceService';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const STATUT_LABELS = {
  present: 'Présent',
  absent_justifie: 'Absent Justifié',
  absent_non_justifie: 'Absent Non Justifié',
  retard: 'Retard'
};

const STATUT_COLORS = {
  present: 'bg-emerald-100 text-emerald-700',
  absent_justifie: 'bg-blue-100 text-blue-700',
  absent_non_justifie: 'bg-red-100 text-red-700',
  retard: 'bg-amber-100 text-amber-700'
};

const TYPE_LABELS = {
  cc: 'Contrôle Continu',
  tp: 'TP',
  examen_fin_module: 'Examen Fin Module',
  examen_session: 'Examen Fin Module',
  ds: 'Devoir Surveillé',
};

const TYPE_COEFF = {
  cc: 1,
  tp: 1,
  ds: 1,
  examen_fin_module: 2,
  examen_session: 2,
};

export default function ApprenantDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notesData, setNotesData] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const { data: presences } = usePresencesByStudent(id);
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();

  useEffect(() => {
    studentsService.getById(id).then(s => { setStudent(s); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!id || !student) return;
    setNotesLoading(true);
    const studentCode = student.code || '';
    const notesById = getDocs(query(collection(db, 'notes'), where('studentId', '==', id)));
    const notesByCode = studentCode && studentCode !== id
      ? getDocs(query(collection(db, 'notes'), where('studentId', '==', studentCode)))
      : Promise.resolve(null);
    Promise.all([notesById, notesByCode, getDocs(collection(db, 'evaluations')), getDocs(collection(db, 'modules'))])
      .then(([snapById, snapByCode, evalsSnap, modulesSnap]) => {
        const evals = {};
        evalsSnap.forEach(d => { evals[d.id] = { id: d.id, ...d.data() }; });
        const mods = {};
        modulesSnap.forEach(d => { mods[d.id] = { id: d.id, ...d.data() }; });

        const seen = new Set();
        const rows = [];
        const addSnap = (snap) => {
          if (!snap) return;
          snap.forEach(d => {
            if (seen.has(d.id)) return;
            seen.add(d.id);
            const n = { id: d.id, ...d.data() };
            const ev = evals[n.evaluationId] || null;
            const mod = ev ? mods[ev.moduleId] : null;
            rows.push({
              noteId: n.id,
              note: n.note,
              absent: n.absent,
              commentaire: n.commentaire || '',
              evalTitre: ev?.titre || '—',
              evalType: ev?.type || '',
              moduleId: ev?.moduleId || null,
              moduleNom: mod ? `${mod.code} — ${mod.nom}` : (ev?.moduleId || 'Module inconnu'),
              date: ev?.date || null,
            });
          });
        };
        addSnap(snapById);
        addSnap(snapByCode);
        rows.sort((a, b) => (a.moduleNom > b.moduleNom ? 1 : -1));
        setNotesData(rows);
        setNotesLoading(false);
      }).catch(() => setNotesLoading(false));
  }, [id, student]);

  if (loading) return (
    <div className="p-12 text-center">
      <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-slate-400 text-sm mt-3">Chargement…</p>
    </div>
  );
  if (!student) return (
    <div className="p-12 text-center">
      <p className="text-red-500 font-medium">Apprenant introuvable</p>
      <Link to="/apprenants" className="text-indigo-600 hover:text-indigo-700 text-sm mt-2 inline-block">← Retour aux apprenants</Link>
    </div>
  );

  const groupe = groupes.find(g => g.id === student.groupeId);
  const byModule = computeStudentAbsencesByModule(presences, sessions);

  const presencesWithSession = presences.map(p => ({
    ...p,
    session: sessions.find(s => s.id === p.sessionId)
  })).filter(p => p.session).sort((a, b) => new Date(b.session.date) - new Date(a.session.date));

  const maxScore = Math.max(0, ...Object.values(byModule).map(m => m.score));
  const alertLevel = maxScore >= 5 ? 'danger' : maxScore >= 3 ? 'warning' : 'ok';
  const alertColors = {
    danger: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/apprenants" className="hover:text-slate-700 transition-colors">Apprenants</Link>
        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-800 font-medium">{student.nom} {student.prenom}</span>
      </nav>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-6">
          <div className="shrink-0">
            {student.photoURL ? (
              <img src={student.photoURL} alt="" className="w-20 h-20 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700">
                {student.nom?.[0]}{student.prenom?.[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-800">{student.nom} {student.prenom}</h1>
                <p className="text-slate-500 text-sm">{student.email}</p>
              </div>
              {maxScore > 0 && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${alertColors[alertLevel]}`}>
                  {alertLevel === 'danger' ? '⚠ DANGER' : alertLevel === 'warning' ? '⚡ ALERTE' : '✓ OK'} ({maxScore.toFixed(1)} abs.)
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InfoField label="Téléphone" value={student.telephone || '—'} />
              <InfoField label="CIN" value={student.cin || '—'} />
              <InfoField label="Date de naissance" value={student.dateNaissance || '—'} />
              <InfoField label="Groupe" value={groupe?.nom || student.filiere || '—'} />
              <InfoField label="Filière" value={student.filiere || '—'} />
              <InfoField label="Niveau" value={student.niveau || '—'} />
              <InfoField label="Statut" value={
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  student.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' :
                  student.statut === 'inactif' ? 'bg-slate-100 text-slate-600' :
                  'bg-amber-100 text-amber-700'
                }`}>{student.statut}</span>
              } />
            </div>
          </div>
        </div>
      </div>

      {/* Notes / grades section */}
      <NotesSection notesData={notesData} loading={notesLoading} />

      {/* Absence summary by module */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4">Récapitulatif des absences par module</h2>
        {Object.keys(byModule).length === 0 ? (
          <div className="text-center py-6">
            <p className="text-emerald-600 font-medium">✓ Aucune absence enregistrée</p>
            <p className="text-slate-400 text-sm mt-1">Cet apprenant est à jour dans ses présences.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(byModule).map(([module, data]) => {
              const borderColor = data.alertLevel === 'danger' ? 'border-red-400' :
                                  data.alertLevel === 'warning' ? 'border-amber-400' :
                                  'border-emerald-400';
              const bgColor = data.alertLevel === 'danger' ? 'bg-red-50' :
                              data.alertLevel === 'warning' ? 'bg-amber-50' :
                              'bg-emerald-50';
              const textColor = data.alertLevel === 'danger' ? 'text-red-700' :
                                data.alertLevel === 'warning' ? 'text-amber-700' :
                                'text-emerald-700';
              return (
                <div key={module} className={`rounded-xl border-l-4 p-4 ${borderColor} ${bgColor}`}>
                  <p className="font-semibold text-sm text-slate-800 truncate">{module}</p>
                  <p className={`text-2xl font-bold ${textColor} mt-1`}>{data.score.toFixed(1)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {data.anjCount} ANJ · {data.retardCount} retard{data.retardCount !== 1 ? 's' : ''} · {data.ajCount} AJ
                  </p>
                  {data.alertLevel !== 'ok' && (
                    <p className={`text-xs font-semibold mt-1.5 ${textColor}`}>
                      {data.alertLevel === 'danger' ? '⚠ DANGER ≥ 5' : '⚡ ALERTE ≥ 3'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendance history */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Historique des présences ({presencesWithSession.length})</h2>
        </div>
        {presencesWithSession.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-sm">Aucun enregistrement de présence</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Module</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Horaire</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {presencesWithSession.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-700">
                    {p.session.date ? new Date(p.session.date).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.session.module}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                    {p.session.heureDebut} – {p.session.heureFin}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUT_COLORS[p.statut] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUT_LABELS[p.statut] || p.statut}
                    </span>
                    {p.statut === 'retard' && p.heureArrivee && (
                      <span className="text-xs text-slate-400 ml-2">({p.heureArrivee})</span>
                    )}
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

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
      <div className="text-sm text-slate-800 font-medium mt-0.5">{value}</div>
    </div>
  );
}

function getNoteColor(note) {
  if (note === null || note === undefined || note === '') return 'text-slate-400';
  const n = parseFloat(note);
  if (isNaN(n)) return 'text-slate-400';
  if (n >= 14) return 'text-emerald-600';
  if (n >= 10) return 'text-blue-600';
  if (n >= 8) return 'text-amber-600';
  return 'text-red-600';
}

function getNoteBg(note) {
  if (note === null || note === undefined || note === '') return 'bg-slate-50';
  const n = parseFloat(note);
  if (isNaN(n)) return 'bg-slate-50';
  if (n >= 14) return 'bg-emerald-50 border-emerald-200';
  if (n >= 10) return 'bg-blue-50 border-blue-200';
  if (n >= 8) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function computeModuleMoyenne(rows) {
  const valid = rows.filter(r => !r.absent && r.note !== '' && r.note !== null && r.note !== undefined && !isNaN(parseFloat(r.note)));
  if (valid.length === 0) return null;
  const totalCoeff = valid.reduce((s, r) => s + (TYPE_COEFF[r.evalType] || 1), 0);
  const totalWeighted = valid.reduce((s, r) => s + parseFloat(r.note) * (TYPE_COEFF[r.evalType] || 1), 0);
  return totalWeighted / totalCoeff;
}

function NotesSection({ notesData, loading }) {
  if (loading) return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="font-bold text-slate-800 mb-4">Notes & Résultats</h2>
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
        Chargement des notes…
      </div>
    </div>
  );

  if (notesData.length === 0) return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="font-bold text-slate-800 mb-4">Notes & Résultats</h2>
      <div className="text-center py-6">
        <p className="text-slate-400 text-sm">Aucune note enregistrée pour cet apprenant.</p>
      </div>
    </div>
  );

  // Group by module
  const byModule = {};
  notesData.forEach(r => {
    const key = r.moduleId || r.moduleNom;
    if (!byModule[key]) byModule[key] = { nom: r.moduleNom, rows: [] };
    byModule[key].rows.push(r);
  });

  const totalNotes = notesData.filter(r => !r.absent && r.note !== '' && r.note !== null && !isNaN(parseFloat(r.note)));
  const globalMoy = totalNotes.length > 0
    ? totalNotes.reduce((s, r) => s + parseFloat(r.note), 0) / totalNotes.length
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Notes & Résultats ({notesData.length} évaluation{notesData.length > 1 ? 's' : ''})</h2>
        {globalMoy !== null && (
          <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getNoteBg(globalMoy)}`}>
            Moy. générale : <span className={getNoteColor(globalMoy)}>{globalMoy.toFixed(2)}/20</span>
          </span>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {Object.entries(byModule).map(([key, { nom, rows }]) => {
          const moy = computeModuleMoyenne(rows);
          return (
            <div key={key} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 text-sm">{nom}</h3>
                {moy !== null && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getNoteBg(moy)} ${getNoteColor(moy)}`}>
                    Moy. {moy.toFixed(2)}/20
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Évaluation</th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Date</th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Note /20</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                      <tr key={r.noteId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 pr-4 text-slate-700 font-medium">{r.evalTitre}</td>
                        <td className="py-2.5 pr-4">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {TYPE_LABELS[r.evalType] || r.evalType || '—'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 text-xs hidden sm:table-cell">
                          {r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="py-2.5 text-right">
                          {r.absent ? (
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Absent</span>
                          ) : (r.note !== '' && r.note !== null && r.note !== undefined) ? (
                            <span className={`text-sm font-bold ${getNoteColor(r.note)}`}>
                              {parseFloat(r.note).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
