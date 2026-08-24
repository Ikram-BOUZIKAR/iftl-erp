import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { HelpButton } from '../UI/HelpGuide';

const BLUE = '#005989';
const BG = '#f1f5f9';

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcoUser()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>; }
function IcoCal()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>; }
function IcoChart()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>; }
function IcoClock()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>; }
function IcoBook()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>; }
function IcoBell()     { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>; }
function IcoLogout()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }

const TABS = [
  { id: 'profil',        label: 'Mon Profil',     short: 'Profil',     Icon: IcoUser  },
  { id: 'planning',      label: 'Mon Planning',   short: 'Planning',   Icon: IcoCal   },
  { id: 'resultats',     label: 'Mes Résultats',  short: 'Résultats',  Icon: IcoChart },
  { id: 'absences',      label: 'Mes Absences',   short: 'Absences',   Icon: IcoClock },
  { id: 'ressources',    label: 'Ressources',     short: 'Ressources', Icon: IcoBook  },
  { id: 'notifications', label: 'Annonces',       short: 'Annonces',   Icon: IcoBell  },
];

const TYPE_COLORS = {
  EFM:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  EFF:    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  CC:     { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  TP:     { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  Cours:  { bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  default:{ bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
};

function getTypeColors(type) {
  if (!type) return TYPE_COLORS.default;
  const u = type.toUpperCase();
  if (u.includes('EFM')) return TYPE_COLORS.EFM;
  if (u.includes('EFF')) return TYPE_COLORS.EFF;
  if (u.includes('CC'))  return TYPE_COLORS.CC;
  if (u.includes('TP'))  return TYPE_COLORS.TP;
  return TYPE_COLORS.Cours;
}

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-MA', { weekday: 'short', day: '2-digit', month: 'short' });
  } catch { return dateStr; }
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-14">
      <div className="w-8 h-8 rounded-full animate-spin"
           style={{ border: `3px solid ${BLUE}25`, borderTopColor: BLUE }} />
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

async function fetchByMultipleKeys(collName, keys) {
  const seen = new Set();
  const results = [];
  await Promise.all(
    keys.filter(k => k.value).map(async ({ field, value }) => {
      try {
        const q = query(collection(db, collName), where(field, '==', value));
        const snap = await getDocs(q);
        snap.forEach(d => {
          if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); }
        });
      } catch { /* ignore */ }
    })
  );
  return results;
}

// ── Mon Profil ─────────────────────────────────────────────────────────────────
function ProfilTab({ student, userProfile, userId }) {
  const [form, setForm] = useState({
    telephone: student?.telephone || userProfile?.telephone || '',
    ville:     student?.ville || '',
    adresse:   student?.adresse || '',
    photo:     student?.photo || userProfile?.photo || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');
  const studentCode = userProfile?.studentCode || userProfile?.codeApprenant;

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (userId) await updateDoc(doc(db, 'users', userId), { telephone: form.telephone, photo: form.photo, updatedAt: new Date() });
      if (studentCode) {
        const ref = student?.id ? doc(db, 'students', student.id) : doc(db, 'students', studentCode);
        await updateDoc(ref, { telephone: form.telephone, ville: form.ville, adresse: form.adresse, updatedAt: new Date() });
      }
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError('Erreur : ' + err.message); }
    finally { setSaving(false); }
  };

  const fullName = `${student?.prenom || userProfile?.prenom || ''} ${student?.nom || userProfile?.nom || ''}`.trim();
  const filiere = [student?.anneeFormation, student?.niveau].filter(Boolean).join(' ');

  const InfoRow = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-slate-100 last:border-0 gap-0.5">
      <span className="text-xs font-semibold text-slate-400 sm:w-40 shrink-0 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100" style={{ background: `${BLUE}07` }}>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dossier étudiant</p>
        </div>
        <div className="px-5">
          <InfoRow label="Nom complet"    value={fullName} />
          <InfoRow label="Code apprenant" value={studentCode} />
          <InfoRow label="Email"          value={userProfile?.email} />
          <InfoRow label="Filière"        value={filiere || '—'} />
          <InfoRow label="Groupe"         value={student?.groupeId} />
          <InfoRow label="CIN"            value={student?.cin} />
          <InfoRow label="Date naissance" value={student?.dateNaissance} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Informations modifiables</p>
          <p className="text-xs text-slate-400 mt-0.5">Mettez à jour vos coordonnées personnelles</p>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Téléphone', key: 'telephone', type: 'tel', ph: '+212 6XX XXX XXX' },
            { label: 'Ville',     key: 'ville',     type: 'text', ph: 'Votre ville' },
            { label: 'Adresse',   key: 'adresse',   type: 'text', ph: 'Votre adresse complète' },
            { label: 'Photo (URL)', key: 'photo',   type: 'url', ph: 'https://…' },
          ].map(({ label, key, type, ph }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
              <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={ph}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BLUE }}
                onFocus={e => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = `0 0 0 3px ${BLUE}18`; }}
                onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
              />
            </div>
          ))}
          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</p>}
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
            style={{ background: BLUE }}>
            {saving ? 'Enregistrement…' : saved ? '✓ Modifications enregistrées' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mon Planning ───────────────────────────────────────────────────────────────
function PlanningTab({ groupeId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupeId) { setLoading(false); return; }
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'sessions'), where('groupeId', '==', groupeId)));
        const today = new Date().toISOString().split('T')[0];
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setSessions(list.filter(s => (s.date || '') >= today).sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 60));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [groupeId]);

  if (loading) return <Spinner />;
  if (!groupeId) return <EmptyState message="Groupe non défini. Contactez l'administration." />;
  if (sessions.length === 0) return <EmptyState message="Aucune séance planifiée pour les prochaines semaines." />;

  return (
    <div className="space-y-2.5">
      {sessions.map(s => {
        const colors = getTypeColors(s.type);
        const d = s.date ? new Date(s.date) : null;
        return (
          <div key={s.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex shadow-sm">
            <div className="px-4 py-4 shrink-0 text-center border-r border-slate-100 min-w-[68px]"
                 style={{ background: `${BLUE}07` }}>
              {d ? (
                <>
                  <p className="text-xs font-semibold text-slate-400">{d.toLocaleDateString('fr-MA', { month: 'short' }).toUpperCase()}</p>
                  <p className="text-2xl font-black leading-none mt-0.5" style={{ color: BLUE }}>{d.getDate()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{d.toLocaleDateString('fr-MA', { weekday: 'short' })}</p>
                </>
              ) : <p className="text-xl font-bold text-slate-300">—</p>}
            </div>
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{s.module || s.moduleId || 'Module'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.heureDebut && s.heureFin ? `${s.heureDebut} – ${s.heureFin}` : s.heureDebut || ''}
                    {s.salle ? ` · Salle ${s.salle}` : ''}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full border shrink-0"
                      style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                  {s.type || 'Cours'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Mes Résultats ──────────────────────────────────────────────────────────────
function moyColor(n) {
  const v = parseFloat(n);
  return isNaN(v) ? '#94a3b8' : v >= 10 ? '#16a34a' : '#dc2626';
}

function DecisionBadge({ decision }) {
  if (!decision) return null;
  const lo = decision.toLowerCase();
  const style = lo.includes('admis') || lo.includes('valid') || lo.includes('passage')
    ? { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' }
    : lo.includes('rattrapage') || lo.includes('ajourné')
    ? { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' }
    : { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full border"
          style={{ background: style.bg, color: style.text, borderColor: style.border }}>
      {decision}
    </span>
  );
}

function ResultatsTab({ studentId, studentCode }) {
  const [bulletins, setBulletins] = useState([]);
  const [notes,     setNotes]     = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const keys = [
          { field: 'studentId',    value: studentId   },
          { field: 'studentCode',  value: studentCode },
          { field: 'codeApprenant',value: studentCode },
        ];
        const [bulls, rawNotes] = await Promise.all([
          fetchByMultipleKeys('bulletins', keys),
          fetchByMultipleKeys('notes',     keys),
        ]);
        setBulletins(bulls); setNotes(rawNotes);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [studentId, studentCode]);

  if (loading) return <Spinner />;
  if (bulletins.length === 0 && notes.length === 0)
    return <EmptyState message="Aucun résultat disponible pour le moment." />;

  return (
    <div className="space-y-5">
      {bulletins.map(bull => {
        const modules  = Array.isArray(bull.modules) ? bull.modules : [];
        const moy      = bull.moyenneGenerale ?? bull.moyenne;
        const mention  = bull.mention || bull.mentionGenerale;
        const decision = bull.decisionLabel || bull.decision;
        return (
          <div key={bull.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100"
                 style={{ background: 'linear-gradient(135deg,#005989,#0077b6)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-sm">Relevé de notes {bull.anneeFormation || ''}</p>
                  {bull.filiere && <p className="text-white/70 text-xs mt-0.5">{bull.filiere}</p>}
                </div>
                {moy !== undefined && (
                  <p className="text-2xl font-black text-white">
                    {parseFloat(moy).toFixed(2)}<span className="text-xs font-normal text-white/70 ml-1">/20</span>
                  </p>
                )}
              </div>
              {mention && <p className="text-white/80 text-xs mt-1">{mention}</p>}
              {decision && <div className="mt-3"><DecisionBadge decision={decision} /></div>}
            </div>
            {modules.length > 0 && (
              <div className="divide-y divide-slate-50">
                {modules.map((m, i) => {
                  const note = m.note ?? m.moyenne ?? m.moyenneModule;
                  const coef = m.coefficient ?? m.coef ?? 1;
                  return (
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium truncate">{m.nom || m.module || `Module ${i+1}`}</p>
                        {coef > 1 && <p className="text-xs text-slate-400">Coef. {coef}</p>}
                      </div>
                      <span className="text-base font-black shrink-0" style={{ color: note !== undefined ? moyColor(note) : '#cbd5e1' }}>
                        {note !== undefined ? parseFloat(note).toFixed(2) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {bulletins.length === 0 && notes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Notes en cours de semestre</p>
            <p className="text-xs text-slate-400 mt-0.5">Le bulletin définitif sera disponible en fin de semestre.</p>
          </div>
          <div className="divide-y divide-slate-50">
            {notes.map(n => {
              const note = n.note ?? n.moyenne;
              return (
                <div key={n.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700 truncate flex-1">{n.module || n.evaluationId || 'Évaluation'}</p>
                  <span className="text-base font-black shrink-0" style={{ color: note !== undefined ? moyColor(note) : '#cbd5e1' }}>
                    {note !== undefined ? parseFloat(note).toFixed(2) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mes Absences ───────────────────────────────────────────────────────────────
function AbsencesTab({ studentId, studentCode }) {
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const keys = [
          { field: 'studentId',    value: studentId   },
          { field: 'studentCode',  value: studentCode },
          { field: 'codeApprenant',value: studentCode },
        ];
        const all = await fetchByMultipleKeys('presences', keys);
        setAbsences(all.filter(p => p.present === false || p.statut === 'absent' || p.absent === true));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [studentId, studentCode]);

  if (loading) return <Spinner />;

  const byModule = {};
  absences.forEach(p => {
    const mod = p.module || p.moduleId || 'Module inconnu';
    if (!byModule[mod]) byModule[mod] = [];
    byModule[mod].push(p);
  });

  const total = absences.length;
  const alertColors = (count) => {
    if (count >= 5) return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Alerte rouge' };
    if (count >= 3) return { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', label: 'Alerte orange' };
    return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Situation normale' };
  };
  const globalAlert = alertColors(total);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5 border shadow-sm" style={{ background: globalAlert.bg, borderColor: globalAlert.border }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: globalAlert.text }}>Total absences</p>
            <p className="text-4xl font-black mt-1 leading-none" style={{ color: globalAlert.text }}>{total}</p>
            <p className="text-xs mt-1" style={{ color: globalAlert.text }}>séance{total !== 1 ? 's' : ''} d'absence</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                 style={{ background: 'white', borderColor: globalAlert.border }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: globalAlert.text }} />
              <span className="text-xs font-semibold" style={{ color: globalAlert.text }}>{globalAlert.label}</span>
            </div>
            <p className="text-xs mt-2 text-slate-400">Seuil rouge : 5 abs.</p>
          </div>
        </div>
      </div>
      {total === 0 ? (
        <EmptyState message="Aucune absence enregistrée. Continuez ainsi !" />
      ) : Object.entries(byModule).map(([mod, list]) => {
        const alert = alertColors(list.length);
        return (
          <div key={mod} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800 flex-1 min-w-0 truncate">{mod}</p>
              <span className="text-xs font-bold px-3 py-1 rounded-full border"
                    style={{ background: alert.bg, color: alert.text, borderColor: alert.border }}>
                {list.length} absence{list.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="px-5 divide-y divide-slate-50">
              {list.map((a, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between text-xs text-slate-500">
                  <span>{formatDateFr(a.date) || 'Date inconnue'}</span>
                  {a.heureDebut && a.heureFin && <span className="text-slate-400">{a.heureDebut} – {a.heureFin}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Ressources ─────────────────────────────────────────────────────────────────
const PLATFORMS = [
  {
    id: 'scholarvox', name: 'ScholarVox', tagline: 'Bibliothèque numérique',
    description: 'Accès illimité à des milliers d\'ouvrages académiques et manuels pédagogiques.',
    url: 'https://international.scholarvox.com/',
    bgGradient: 'linear-gradient(135deg,#e65c00,#f9a825)',
    badge: 'Catalogue', badgeColor: '#fff7ed', badgeText: '#ea580c',
    icon: <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10"><rect x="6" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.9"/><rect x="10" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.6"/><rect x="14" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.3"/><path d="M10 16h16M10 22h14M10 28h12" stroke="#e65c00" strokeWidth="2.5" strokeLinecap="round"/></svg>,
    iconBg: 'rgba(255,255,255,0.15)',
  },
  {
    id: 'altissia', name: 'ALTISSIA', tagline: 'Language empowers people',
    description: 'Apprenez et perfectionnez vos langues étrangères avec la plateforme e-learning interactive.',
    url: 'https://learn.altissia.org/platform/login?interfaceLg=fr_FR',
    bgGradient: 'linear-gradient(135deg,#162a4a,#1e3a6e)',
    badge: 'Langues', badgeColor: 'rgba(157,196,31,0.2)', badgeText: '#9dc41f',
    icon: <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10"><rect x="10" y="8" width="28" height="28" rx="5" fill="#9dc41f" opacity="0.9"/><path d="M24 12L32 32M24 12L16 32M19 24L29 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    iconBg: 'rgba(157,196,31,0.2)',
  },
];

function RessourcesTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 font-medium">Plateformes numériques accessibles avec votre compte IFTL</p>
      {PLATFORMS.map(p => (
        <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
           className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
           style={{ background: p.bgGradient }}>
          <div className="p-5 flex gap-4 items-start">
            <div className="shrink-0 w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: p.iconBg }}>{p.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-white font-black text-lg">{p.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: p.badgeColor, color: p.badgeText }}>{p.badge}</span>
              </div>
              <p className="text-white/70 text-xs font-medium mb-2">{p.tagline}</p>
              <p className="text-white/80 text-sm leading-relaxed">{p.description}</p>
            </div>
          </div>
          <div className="px-5 pb-4">
            <span className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
              </svg>
              Accéder à la plateforme
            </span>
          </div>
        </a>
      ))}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-xs text-blue-700 font-medium">
          💡 Utilisez vos identifiants IFTL communiqués par l'administration.
          Problème ? <a href="mailto:scolarite@iftl.ma" className="underline">scolarite@iftl.ma</a>
        </p>
      </div>
    </div>
  );
}

// ── Annonces & Notifications ───────────────────────────────────────────────────
const ANNONCE_TYPE_STYLE = {
  info:      { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe', label: 'Info'    },
  important: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Urgent'  },
  evenement: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Événement' },
  examen:    { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa', label: 'Examen'  },
};

function NotificationsTab({ groupeId, studentGroupe }) {
  const [annonces, setAnnonces] = useState([]);
  const [exams, setExams]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [annSnap, sessSnap] = await Promise.all([
          getDocs(query(collection(db, 'annonces'), orderBy('datePublication', 'desc'))),
          groupeId ? getDocs(query(collection(db, 'sessions'), where('groupeId', '==', groupeId))) : Promise.resolve({ forEach: () => {} }),
        ]);

        // Filter annonces visible for this student's group
        const ann = [];
        annSnap.forEach(d => {
          const a = { id: d.id, ...d.data() };
          const exp = a.expirationDate;
          if (exp && exp < today) return;
          const cibleGroupes = a.cibleGroupes || [];
          const cibleRoles   = a.cibleRoles   || [];
          const isGlobal = cibleGroupes.length === 0 && cibleRoles.length === 0;
          const forMe    = cibleGroupes.includes(groupeId) || cibleRoles.includes('apprenant');
          if (isGlobal || forMe) ann.push(a);
        });
        setAnnonces(ann);

        const examList = [];
        sessSnap.forEach(d => {
          const data = { id: d.id, ...d.data() };
          if ((data.date || '') < today) return;
          const t = (data.type || '').toUpperCase();
          if (t.includes('EFM') || t.includes('EFF') || t.includes('CC')) examList.push(data);
        });
        examList.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setExams(examList);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [groupeId]);

  if (loading) return <Spinner />;

  const daysUntilLabel = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    if (diff <= 7) return `Dans ${diff} jours`;
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Examens à venir */}
      {exams.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Examens à venir</p>
          <div className="space-y-2.5">
            {exams.map(exam => {
              const colors = getTypeColors(exam.type);
              const d = exam.date ? new Date(exam.date) : null;
              const urgency = daysUntilLabel(exam.date);
              return (
                <div key={exam.id} className="bg-white rounded-2xl border overflow-hidden flex shadow-sm"
                     style={{ borderColor: colors.border }}>
                  <div className="px-4 py-4 shrink-0 text-center min-w-[64px]" style={{ background: colors.bg }}>
                    {d ? (
                      <>
                        <p className="text-xl font-black leading-none" style={{ color: colors.text }}>{d.getDate()}</p>
                        <p className="text-xs mt-0.5" style={{ color: colors.text }}>{d.toLocaleDateString('fr-MA', { month: 'short' })}</p>
                      </>
                    ) : <p className="text-xl font-bold" style={{ color: colors.text }}>?</p>}
                  </div>
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{exam.module || 'Module'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {exam.heureDebut && exam.heureFin ? `${exam.heureDebut} – ${exam.heureFin}` : ''}
                          {exam.salle ? ` · Salle ${exam.salle}` : ''}
                        </p>
                        {urgency && <p className="text-xs font-bold mt-1.5" style={{ color: colors.text }}>{urgency}</p>}
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full border shrink-0"
                            style={{ background: colors.bg, color: colors.text, borderColor: colors.border }}>
                        {exam.type}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Annonces */}
      <div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
          Annonces {annonces.length > 0 ? `(${annonces.length})` : ''}
        </p>
        {annonces.length === 0 ? (
          <EmptyState message="Aucune annonce pour le moment." />
        ) : (
          <div className="space-y-3">
            {annonces.map(a => {
              const style = ANNONCE_TYPE_STYLE[a.type] || ANNONCE_TYPE_STYLE.info;
              const date = a.datePublication
                ? (a.datePublication?.toDate ? a.datePublication.toDate() : new Date(a.datePublication)).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' })
                : '';
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  {a.pinned && (
                    <div className="px-4 py-1.5 text-xs font-bold text-slate-500 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M5 5a2 2 0 012-2h6a2 2 0 012 2v2a2 2 0 01-.586 1.414L13 9.828V14a1 1 0 01-.553.894l-4 2A1 1 0 017 16v-6.172l-1.414-1.414A2 2 0 015 7V5z"/></svg>
                      Épinglé
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm font-bold text-slate-800 flex-1">{a.titre}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full border shrink-0"
                            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                        {style.label}
                      </span>
                    </div>
                    {a.contenu && <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.contenu}</p>}
                    <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                      <span>{a.auteurNom || 'IFTL Administration'}</span>
                      <span>{date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {exams.length === 0 && annonces.length === 0 && (
        <EmptyState message="Aucune annonce ni examen à venir." />
      )}
    </div>
  );
}

// ── Sidebar nav link ───────────────────────────────────────────────────────────
function SideNavLink({ tab, active, onClick }) {
  const { Icon, label } = tab;
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left group"
      style={active
        ? { background: 'rgba(255,255,255,0.16)', color: 'white' }
        : { color: 'rgba(255,255,255,0.55)' }
      }
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
    >
      {active && <span className="absolute left-0 w-1 h-6 rounded-r-full bg-white" />}
      <Icon />
      {label}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PortailApprenant({ auth }) {
  const { user, userProfile, logout } = auth;
  const [activeTab, setActiveTab] = useState('profil');
  const [student, setStudent]     = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const studentCode = userProfile?.studentCode || userProfile?.codeApprenant;

  useEffect(() => {
    if (!studentCode) { setLoadingStudent(false); return; }
    (async () => {
      try {
        const directSnap = await getDoc(doc(db, 'students', studentCode));
        if (directSnap.exists()) { setStudent({ id: directSnap.id, ...directSnap.data() }); return; }
        const q = query(collection(db, 'students'), where('code', '==', studentCode));
        const snap = await getDocs(q);
        if (!snap.empty) { const d = snap.docs[0]; setStudent({ id: d.id, ...d.data() }); }
      } catch (err) { console.error(err); }
      finally { setLoadingStudent(false); }
    })();
  }, [studentCode]);

  const prenom      = userProfile?.prenom || student?.prenom || '';
  const nom         = userProfile?.nom    || student?.nom    || '';
  const displayName = `${prenom} ${nom}`.trim() || 'Apprenant';
  const initials    = ((prenom[0] || '?') + (nom[0] || '?')).toUpperCase();
  const photo       = student?.photo || userProfile?.photo;
  const groupeId    = student?.groupeId;
  const studentId   = student?.id || studentCode;

  const Avatar = ({ size = 10 }) => (
    <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold overflow-hidden shrink-0`}
         style={{ background: BLUE, fontSize: size > 8 ? '1rem' : '0.75rem', minWidth: `${size * 4}px`, minHeight: `${size * 4}px` }}>
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : initials}
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: BG }}>

      {/* ── Desktop Sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 z-40 shadow-2xl"
             style={{ background: 'linear-gradient(180deg,#002d47 0%,#00436e 60%,#005989 100%)' }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(255,255,255,0.12)' }}>
              <span className="text-white font-black text-base">IF</span>
            </div>
            <div>
              <p className="text-white font-black text-base leading-tight">IFTL</p>
              <p className="text-blue-300 text-[10px] leading-tight">Institut de Formation Transport & Logistique</p>
            </div>
          </div>
        </div>

        {/* Profile card */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar size={10} />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold truncate">{displayName}</p>
              <p className="text-blue-300 text-xs truncate">{studentCode || userProfile?.email}</p>
              {student?.anneeFormation && (
                <p className="text-blue-400 text-[10px] mt-0.5 truncate">{student.anneeFormation}{student.niveau ? ` · ${student.niveau}` : ''}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 relative">
          {TABS.map(tab => (
            <SideNavLink key={tab.id} tab={tab} active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)} />
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 transition-all"
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <IcoLogout />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col h-full shadow-2xl z-10"
                 style={{ background: 'linear-gradient(180deg,#002d47 0%,#005989 100%)' }}>
            <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <span className="text-white font-black text-sm">IF</span>
                </div>
                <p className="text-white font-black">IFTL</p>
              </div>
              <button onClick={() => setMobileSidebarOpen(false)} className="text-white/60 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Avatar size={9} />
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold truncate">{displayName}</p>
                  <p className="text-blue-300 text-xs truncate">{studentCode}</p>
                </div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 relative">
              {TABS.map(tab => (
                <SideNavLink key={tab.id} tab={tab} active={activeTab === tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileSidebarOpen(false); }} />
              ))}
            </nav>
            <div className="px-3 py-4 border-t border-white/10">
              <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300">
                <IcoLogout />Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Mobile top header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setMobileSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BLUE }}>
                  <span className="text-white font-black text-xs">IF</span>
                </div>
                <span className="font-bold text-slate-800 text-sm">Portail Apprenant</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 max-w-28 truncate hidden sm:block">{displayName}</span>
              <HelpButton role="apprenant" color={BLUE} />
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-slate-100">
                <IcoLogout />
              </button>
            </div>
          </div>
        </header>

        {/* Page header */}
        <div className="hidden lg:block px-8 pt-8 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                {TABS.find(t => t.id === activeTab)?.label}
              </p>
              <h1 className="text-2xl font-black text-slate-800">
                {activeTab === 'profil' ? `Bonjour, ${prenom || displayName}` : TABS.find(t => t.id === activeTab)?.label}
              </h1>
            </div>
            {student && (
              <div className="flex gap-2">
                {student.anneeFormation && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white">
                    {student.anneeFormation}
                  </span>
                )}
                {student.niveau && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 bg-white">
                    {student.niveau}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 pb-24 lg:pb-10 pt-4 lg:pt-0">
          <div className="max-w-3xl">
            {loadingStudent ? <Spinner /> : (
              <>
                {activeTab === 'profil'        && <ProfilTab student={student} userProfile={userProfile} userId={user?.uid} />}
                {activeTab === 'planning'      && <PlanningTab groupeId={groupeId} />}
                {activeTab === 'resultats'     && <ResultatsTab studentId={studentId} studentCode={studentCode} />}
                {activeTab === 'absences'      && <AbsencesTab studentId={studentId} studentCode={studentCode} />}
                {activeTab === 'ressources'    && <RessourcesTab />}
                {activeTab === 'notifications' && <NotificationsTab groupeId={groupeId} />}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── Mobile bottom tab bar ─────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 transition-colors"
                style={{ color: active ? BLUE : '#94a3b8' }}>
                <tab.Icon />
                <span className="text-[9px] font-semibold leading-none">{tab.short}</span>
                {active && <span className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ background: BLUE }} />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
