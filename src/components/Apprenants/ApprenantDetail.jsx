import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { studentsService } from '../../services/firestore';
import { usePresencesByStudent, useSessions, useGroupes } from '../../hooks/useData';
import { computeStudentAbsencesByModule } from '../../services/absenceService';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

const STATUT_LABELS = {
  present: 'Présent',
  absent_justifie: 'Absent Justifié',
  absent_non_justifie: 'Absent Non Justifié',
  retard: 'Retard',
};

const STATUT_COLORS = {
  present: 'bg-emerald-100 text-emerald-700',
  absent_justifie: 'bg-blue-100 text-blue-700',
  absent_non_justifie: 'bg-red-100 text-red-700',
  retard: 'bg-amber-100 text-amber-700',
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

const SESSION_TYPE_LABELS = {
  cours: 'Cours',
  tp: 'TP',
  td: 'TD',
  examen: 'Examen',
  rattrapage: 'Rattrapage',
};

const SESSION_TYPE_COLORS = {
  cours: 'bg-blue-100 text-blue-700',
  tp: 'bg-purple-100 text-purple-700',
  td: 'bg-indigo-100 text-indigo-700',
  examen: 'bg-red-100 text-red-700',
  rattrapage: 'bg-orange-100 text-orange-700',
};

const TABS = [
  { id: 'dossier', label: 'Dossier' },
  { id: 'resultats', label: 'Résultats' },
  { id: 'absences', label: 'Absences' },
  { id: 'planning', label: 'Planning' },
  { id: 'annonces', label: 'Annonces' },
];

function toAscii(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function genEmailIftl(prenom, nom) {
  const p = toAscii(prenom);
  const n = toAscii(nom);
  if (!p && !n) return null;
  if (!n) return `${p}@iftl.ma`;
  return `${p[0]}.${n}@iftl.ma`;
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</p>
      <div className="text-sm text-slate-800 font-medium mt-0.5">{value || '—'}</div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="text-xs font-bold text-[#005989] uppercase tracking-wide border-b border-slate-100 pb-2 mb-3">
      {title}
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
  const valid = rows.filter(
    r => !r.absent && r.note !== '' && r.note !== null && r.note !== undefined && !isNaN(parseFloat(r.note))
  );
  if (valid.length === 0) return null;
  const totalCoeff = valid.reduce((s, r) => s + (TYPE_COEFF[r.evalType] || 1), 0);
  const totalWeighted = valid.reduce((s, r) => s + parseFloat(r.note) * (TYPE_COEFF[r.evalType] || 1), 0);
  return totalWeighted / totalCoeff;
}

function NotesSection({ notesData, loading }) {
  if (loading)
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4">Évaluations</h2>
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          Chargement des notes…
        </div>
      </div>
    );

  if (notesData.length === 0)
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="font-bold text-slate-800 mb-4">Évaluations</h2>
        <div className="text-center py-6">
          <p className="text-slate-400 text-sm">Aucune note enregistrée pour cet apprenant.</p>
        </div>
      </div>
    );

  const byModule = {};
  notesData.forEach(r => {
    const key = r.moduleId || r.moduleNom;
    if (!byModule[key]) byModule[key] = { nom: r.moduleNom, rows: [] };
    byModule[key].rows.push(r);
  });

  const totalNotes = notesData.filter(
    r => !r.absent && r.note !== '' && r.note !== null && !isNaN(parseFloat(r.note))
  );
  const globalMoy =
    totalNotes.length > 0
      ? totalNotes.reduce((s, r) => s + parseFloat(r.note), 0) / totalNotes.length
      : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="font-bold text-slate-800">
          Évaluations ({notesData.length} évaluation{notesData.length > 1 ? 's' : ''})
        </h2>
        {globalMoy !== null && (
          <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getNoteBg(globalMoy)}`}>
            Moy. générale :{' '}
            <span className={getNoteColor(globalMoy)}>{globalMoy.toFixed(2)}/20</span>
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
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getNoteBg(moy)} ${getNoteColor(moy)}`}
                  >
                    Moy. {moy.toFixed(2)}/20
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Évaluation
                      </th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                        Date
                      </th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Note /20
                      </th>
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
                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Absent
                            </span>
                          ) : r.note !== '' && r.note !== null && r.note !== undefined ? (
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

function BulletinCard({ item }) {
  const moduleName = item.module || item.moduleId || item.libelle || 'Module';
  const decision = item.decision || '';
  const moyenne =
    item.moyenneGenerale !== undefined
      ? item.moyenneGenerale
      : item.moyenne !== undefined
      ? item.moyenne
      : item.moy !== undefined
      ? item.moy
      : null;

  const decisionBadgeClass =
    decision === 'Admis'
      ? 'bg-emerald-100 text-emerald-700'
      : decision === 'Redoublant'
      ? 'bg-red-100 text-red-700'
      : decision === 'Ajourné'
      ? 'bg-orange-100 text-orange-700'
      : 'bg-slate-100 text-slate-600';

  const efm = item.noteEFM !== undefined ? item.noteEFM : item.EFM !== undefined ? item.EFM : item.efm;
  const eff = item.noteEFF !== undefined ? item.noteEFF : item.EFF !== undefined ? item.EFF : item.eff;
  const cc = item.noteCC !== undefined ? item.noteCC : item.CC !== undefined ? item.CC : item.cc;
  const oral = item.noteOral !== undefined ? item.noteOral : item.oral;

  if (item.modules && Array.isArray(item.modules)) {
    return (
      <>
        {item.modules.map((mod, i) => (
          <BulletinCard key={i} item={mod} />
        ))}
      </>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-800 text-sm">{moduleName}</h3>
        <div className="flex items-center gap-2">
          {decision && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${decisionBadgeClass}`}>
              {decision}
            </span>
          )}
          {moyenne !== null && moyenne !== undefined && (
            <span className={`text-sm font-bold ${getNoteColor(moyenne)}`}>
              {parseFloat(moyenne).toFixed(2)}/20
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          ['EFM', efm],
          ['EFF', eff],
          ['CC', cc],
          ['Oral', oral],
        ].map(([label, val]) => (
          <div key={label} className="bg-slate-50 rounded-lg p-2">
            <div className="text-xs text-slate-400 font-medium mb-1">{label}</div>
            <div className={`text-sm font-bold ${getNoteColor(val)}`}>
              {val !== null && val !== undefined ? parseFloat(val).toFixed(2) : '—'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ApprenantDetail() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dossier');
  const [copied, setCopied] = useState(false);

  // Evaluations — eager
  const [notesData, setNotesData] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);

  // Bulletins — lazy
  const [bulletins, setBulletins] = useState([]);
  const [bulletinsLoading, setBulletinsLoading] = useState(false);
  const [bulletinsFetched, setBulletinsFetched] = useState(false);

  // Annonces — lazy
  const [annonces, setAnnonces] = useState([]);
  const [annoncesLoading, setAnnoncesLoading] = useState(false);
  const [annoncesFetched, setAnnoncesFetched] = useState(false);

  const { data: presences } = usePresencesByStudent(id);
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();

  // Load student
  useEffect(() => {
    studentsService.getById(id).then(s => {
      setStudent(s);
      setLoading(false);
    });
  }, [id]);

  // Load evaluations/notes (eager, triggered when student is available)
  useEffect(() => {
    if (!id || !student) return;
    setNotesLoading(true);
    const studentCode = student.code || '';
    const notesById = getDocs(query(collection(db, 'notes'), where('studentId', '==', id)));
    const notesByCode =
      studentCode && studentCode !== id
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
        const addSnap = snap => {
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
              moduleNom: mod
                ? `${mod.code} — ${mod.nom}`
                : ev?.moduleId || 'Module inconnu',
              date: ev?.date || null,
            });
          });
        };
        addSnap(snapById);
        addSnap(snapByCode);
        rows.sort((a, b) => (a.moduleNom > b.moduleNom ? 1 : -1));
        setNotesData(rows);
        setNotesLoading(false);
      })
      .catch(() => setNotesLoading(false));
  }, [id, student]);

  // Load bulletins (lazy — only when résultats tab first opened)
  useEffect(() => {
    if (activeTab !== 'resultats' || bulletinsFetched || !student) return;
    setBulletinsFetched(true);
    setBulletinsLoading(true);
    const studentCode = student.code || '';
    const q1 = getDocs(query(collection(db, 'bulletins'), where('studentId', '==', id)));
    const q2 = studentCode
      ? getDocs(query(collection(db, 'bulletins'), where('studentCode', '==', studentCode)))
      : Promise.resolve(null);
    const q3 = studentCode
      ? getDocs(query(collection(db, 'bulletins'), where('codeApprenant', '==', studentCode)))
      : Promise.resolve(null);
    Promise.all([q1, q2, q3])
      .then(([s1, s2, s3]) => {
        const seen = new Set();
        const items = [];
        const addSnap = snap => {
          if (!snap) return;
          snap.forEach(d => {
            if (seen.has(d.id)) return;
            seen.add(d.id);
            items.push({ id: d.id, ...d.data() });
          });
        };
        addSnap(s1);
        addSnap(s2);
        addSnap(s3);
        setBulletins(items);
        setBulletinsLoading(false);
      })
      .catch(() => setBulletinsLoading(false));
  }, [activeTab, bulletinsFetched, student, id]);

  // Load annonces (lazy — only when annonces tab first opened)
  useEffect(() => {
    if (activeTab !== 'annonces' || annoncesFetched) return;
    setAnnoncesFetched(true);
    setAnnoncesLoading(true);
    getDocs(query(collection(db, 'annonces'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        setAnnonces(items);
        setAnnoncesLoading(false);
      })
      .catch(() => setAnnoncesLoading(false));
  }, [activeTab, annoncesFetched]);

  if (loading)
    return (
      <div className="p-12 text-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 text-sm mt-3">Chargement…</p>
      </div>
    );
  if (!student)
    return (
      <div className="p-12 text-center">
        <p className="text-red-500 font-medium">Apprenant introuvable</p>
        <Link to="/apprenants" className="text-indigo-600 hover:text-indigo-700 text-sm mt-2 inline-block">
          ← Retour aux apprenants
        </Link>
      </div>
    );

  const groupe = groupes.find(g => g.id === student.groupeId);
  const emailIftl = genEmailIftl(student.prenom, student.nom);

  const absenceByModule = computeStudentAbsencesByModule(presences, sessions);
  const presencesWithSession = presences
    .map(p => ({ ...p, session: sessions.find(s => s.id === p.sessionId) }))
    .filter(p => p.session)
    .sort((a, b) => new Date(b.session.date) - new Date(a.session.date));

  const today = new Date().toISOString().slice(0, 10);
  const upcomingSessions = sessions
    .filter(s => s.groupeId === student.groupeId && s.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20);

  const maxScore = Math.max(0, ...Object.values(absenceByModule).map(m => m.score));
  const alertLevel = maxScore >= 5 ? 'danger' : maxScore >= 3 ? 'warning' : 'ok';

  function copyEmailIftl() {
    if (!emailIftl) return;
    navigator.clipboard.writeText(emailIftl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/apprenants" className="hover:text-slate-700 transition-colors">
          Apprenants
        </Link>
        <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-800 font-medium">
          {student.prenom} {student.nom}
        </span>
      </nav>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            {student.photoURL ? (
              <img
                src={student.photoURL}
                alt=""
                className="w-20 h-20 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#005989]/10 flex items-center justify-center text-2xl font-bold text-[#005989]">
                {(student.prenom?.[0] || '').toUpperCase()}
                {(student.nom?.[0] || '').toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-800">
                  {student.prenom} {student.nom}
                </h1>
                {student.code && (
                  <span className="inline-block font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-1">
                    {student.code}
                  </span>
                )}
                {emailIftl && (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 text-xs bg-[#005989]/10 text-[#005989] px-2 py-0.5 rounded">
                      📧 {emailIftl}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: status + meta */}
              <div className="text-right space-y-1 shrink-0">
                <div>
                  <span
                    className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${
                      student.statut === 'actif'
                        ? 'bg-emerald-100 text-emerald-700'
                        : student.statut === 'inactif'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {student.statut || 'actif'}
                  </span>
                </div>
                {groupe && <div className="text-xs text-slate-600 font-medium">{groupe.nom}</div>}
                {student.filiere && <div className="text-xs text-slate-500">{student.filiere}</div>}
                {student.niveau && <div className="text-xs text-slate-500">{student.niveau}</div>}
                {student.anneeAcademique && (
                  <div className="text-xs text-slate-400">{student.anneeAcademique}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-0 overflow-x-auto border-b border-slate-200 px-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'border-[#005989] text-[#005989] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6">
          {/* === TAB: DOSSIER === */}
          {activeTab === 'dossier' && (
            <div className="space-y-6">
              {/* Identité */}
              <div>
                <SectionHeader title="Identité" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <InfoField label="CIN" value={student.cin} />
                  <InfoField label="Date de naissance" value={student.dateNaissance} />
                  <InfoField label="Téléphone" value={student.telephone} />
                  <InfoField label="Email personnel" value={student.email} />
                  <InfoField label="Adresse" value={student.adresse} />
                  <InfoField label="Ville" value={student.ville} />
                </div>
              </div>

              {/* Compte IFTL */}
              <div>
                <SectionHeader title="Compte IFTL" />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">
                      Email IFTL
                    </p>
                    {emailIftl ? (
                      <button
                        onClick={copyEmailIftl}
                        className="inline-flex items-center gap-1.5 text-sm bg-[#005989]/10 text-[#005989] px-3 py-1.5 rounded-lg hover:bg-[#005989]/20 transition-colors font-medium"
                        title="Cliquer pour copier"
                      >
                        📧 {emailIftl}
                        {copied && (
                          <span className="text-xs text-emerald-600 ml-1">Copié !</span>
                        )}
                      </button>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </div>
                  <InfoField label="Code apprenant" value={student.code} />
                </div>
              </div>

              {/* Famille */}
              <div>
                <SectionHeader title="Famille" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Père</p>
                    <div className="text-sm text-slate-800 font-medium">{student.nomPere || '—'}</div>
                    {student.telephonePere && (
                      <div className="text-xs text-slate-500">{student.telephonePere}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Mère</p>
                    <div className="text-sm text-slate-800 font-medium">{student.nomMere || '—'}</div>
                    {student.telephoneMere && (
                      <div className="text-xs text-slate-500">{student.telephoneMere}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Baccalauréat */}
              <div>
                <SectionHeader title="Baccalauréat" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <InfoField label="Type / Série" value={student.typeBac} />
                  <InfoField label="Mention" value={student.mentionBac} />
                  <InfoField label="Établissement" value={student.etablissementBac} />
                  <InfoField label="Année" value={student.anneeBac} />
                </div>
              </div>

              {/* Admission / Concours */}
              <div>
                <SectionHeader title="Admission / Concours" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <InfoField label="Session" value={student.sessionConcours} />
                  <InfoField
                    label="Score admission /20"
                    value={
                      student.scoreAdmission !== undefined && student.scoreAdmission !== ''
                        ? `${parseFloat(student.scoreAdmission).toFixed(2)} / 20`
                        : null
                    }
                  />
                  <InfoField
                    label="Note oral /20"
                    value={
                      student.noteOral !== undefined && student.noteOral !== ''
                        ? `${parseFloat(student.noteOral).toFixed(2)} / 20`
                        : null
                    }
                  />
                  <InfoField label="Année académique" value={student.anneeAcademique} />
                </div>
              </div>
            </div>
          )}

          {/* === TAB: RÉSULTATS === */}
          {activeTab === 'resultats' && (
            <div className="space-y-6">
              {/* A — Relevé de notes (PV / bulletins) */}
              <div>
                <h2 className="font-bold text-slate-800 mb-4">Relevé de notes (PV)</h2>
                {bulletinsLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                    <div className="w-4 h-4 border-2 border-[#005989] border-t-transparent rounded-full animate-spin"></div>
                    Chargement des bulletins…
                  </div>
                ) : bulletins.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-6 text-center">
                    <p className="text-slate-400 text-sm">Aucun bulletin disponible.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bulletins.map(item => (
                      <BulletinCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>

              {/* B — Évaluations */}
              <NotesSection notesData={notesData} loading={notesLoading} />
            </div>
          )}

          {/* === TAB: ABSENCES === */}
          {activeTab === 'absences' && (
            <div className="space-y-6">
              {/* Absence alert banner */}
              {maxScore > 0 && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                    alertLevel === 'danger'
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  {alertLevel === 'danger'
                    ? `⚠ DANGER — Score max : ${maxScore.toFixed(1)} absences`
                    : `⚡ ALERTE — Score max : ${maxScore.toFixed(1)} absences`}
                </div>
              )}

              {/* By module summary */}
              <div>
                <h2 className="font-bold text-slate-800 mb-4">Récapitulatif par module</h2>
                {Object.keys(absenceByModule).length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-emerald-600 font-medium">Aucune absence enregistrée</p>
                    <p className="text-slate-400 text-sm mt-1">Cet apprenant est à jour dans ses présences.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Object.entries(absenceByModule).map(([module, data]) => {
                      const borderColor =
                        data.alertLevel === 'danger'
                          ? 'border-red-400'
                          : data.alertLevel === 'warning'
                          ? 'border-amber-400'
                          : 'border-emerald-400';
                      const bgColor =
                        data.alertLevel === 'danger'
                          ? 'bg-red-50'
                          : data.alertLevel === 'warning'
                          ? 'bg-amber-50'
                          : 'bg-emerald-50';
                      const textColor =
                        data.alertLevel === 'danger'
                          ? 'text-red-700'
                          : data.alertLevel === 'warning'
                          ? 'text-amber-700'
                          : 'text-emerald-700';
                      return (
                        <div
                          key={module}
                          className={`rounded-xl border-l-4 p-4 ${borderColor} ${bgColor}`}
                        >
                          <p className="font-semibold text-sm text-slate-800 truncate">{module}</p>
                          <p className={`text-2xl font-bold ${textColor} mt-1`}>{data.score.toFixed(1)}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {data.anjCount} ANJ · {data.retardCount} retard
                            {data.retardCount !== 1 ? 's' : ''} · {data.ajCount} AJ
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

              {/* Presence history table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="font-bold text-slate-800">
                    Historique des présences ({presencesWithSession.length})
                  </h2>
                </div>
                {presencesWithSession.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-400 text-sm">Aucun enregistrement de présence</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                            Date
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                            Module
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">
                            Horaire
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">
                            Statut
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {presencesWithSession.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-700">
                              {p.session.date
                                ? new Date(p.session.date).toLocaleDateString('fr-FR')
                                : '—'}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {p.session.module}
                            </td>
                            <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                              {p.session.heureDebut} – {p.session.heureFin}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  STATUT_COLORS[p.statut] || 'bg-slate-100 text-slate-600'
                                }`}
                              >
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
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === TAB: PLANNING === */}
          {activeTab === 'planning' && (
            <div>
              <h2 className="font-bold text-slate-800 mb-4">
                Prochaines séances
                {student.groupeId && groupe && (
                  <span className="ml-2 text-sm font-normal text-slate-500">— {groupe.nom}</span>
                )}
              </h2>
              {!student.groupeId ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                  <p className="text-slate-400 text-sm">Cet apprenant n'est assigné à aucun groupe.</p>
                </div>
              ) : upcomingSessions.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                  <p className="text-slate-500 font-medium">Aucune séance programmée</p>
                  <p className="text-slate-400 text-sm mt-1">Aucune session à venir pour ce groupe.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingSessions.map(s => (
                    <div
                      key={s.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4 flex-wrap"
                    >
                      <div className="shrink-0 text-center min-w-[3.5rem]">
                        <div className="text-xs text-slate-400 font-medium uppercase">
                          {s.date
                            ? new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short' })
                            : '—'}
                        </div>
                        <div className="text-sm font-bold text-slate-800">
                          {s.date
                            ? new Date(s.date).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                              })
                            : '—'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 text-sm truncate">
                          {s.module || 'Module'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {s.heureDebut && s.heureFin ? `${s.heureDebut} – ${s.heureFin}` : ''}
                          {s.salle ? ` · ${s.salle}` : ''}
                        </div>
                      </div>
                      {s.type && (
                        <span
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                            SESSION_TYPE_COLORS[s.type] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {SESSION_TYPE_LABELS[s.type] || s.type}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === TAB: ANNONCES === */}
          {activeTab === 'annonces' && (
            <div>
              <h2 className="font-bold text-slate-800 mb-4">Annonces</h2>
              {annoncesLoading ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
                  <div className="w-4 h-4 border-2 border-[#005989] border-t-transparent rounded-full animate-spin"></div>
                  Chargement des annonces…
                </div>
              ) : annonces.length === 0 ? (
                <div className="bg-slate-50 rounded-xl p-8 text-center">
                  <p className="text-slate-400 text-sm">Aucune annonce disponible.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {annonces.map(a => (
                    <div
                      key={a.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold text-slate-800 text-sm">
                          {a.titre || 'Annonce'}
                        </h3>
                        {a.createdAt && (
                          <span className="text-xs text-slate-400 shrink-0">
                            {a.createdAt.toDate
                              ? a.createdAt.toDate().toLocaleDateString('fr-FR')
                              : typeof a.createdAt === 'string'
                              ? new Date(a.createdAt).toLocaleDateString('fr-FR')
                              : ''}
                          </span>
                        )}
                      </div>
                      {a.contenu && (
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {a.contenu}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
