import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../services/firebase';
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
function IcoBus()      { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 6h8M6 10h12M6 14h12M8 18h8M4 6a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM8 18v2m8-2v2"/></svg>; }

const POINTS_RASSEMBLEMENT = [
  'Zaouia',
  'Aéroport Med 5 - Terminal 1',
  'Station Afriquia - AL Madina Deroua',
  'Station Total - Sapino',
];

const TABS = [
  { id: 'profil',        label: 'Mon Profil',     short: 'Profil',     Icon: IcoUser  },
  { id: 'planning',      label: 'Mon Planning',   short: 'Planning',   Icon: IcoCal   },
  { id: 'resultats',     label: 'Mes Résultats',  short: 'Résultats',  Icon: IcoChart },
  { id: 'absences',      label: 'Mes Absences',   short: 'Absences',   Icon: IcoClock },
  { id: 'ressources',    label: 'Ressources',     short: 'Ressources', Icon: IcoBook  },
  { id: 'notifications', label: 'Annonces',       short: 'Annonces',   Icon: IcoBell  },
  { id: 'transport',     label: 'Transport',      short: 'Transport',  Icon: IcoBus   },
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
    ville:     student?.ville     || '',
    adresse:   student?.adresse   || '',
  });
  const [photoURL,    setPhotoURL]    = useState(student?.photo || userProfile?.photo || '');
  const [uploading,   setUploading]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState('');
  const fileInputRef = useRef(null);
  const studentCode = userProfile?.studentCode || userProfile?.codeApprenant;

  // Detect missing editable fields
  const missingFields = [
    !form.telephone && 'Téléphone',
    !form.ville     && 'Ville',
    !form.adresse   && 'Adresse',
    !photoURL       && 'Photo de profil',
  ].filter(Boolean);
  const completionPct = Math.round(((4 - missingFields.length) / 4) * 100);

  const handlePhotoUpload = async (file) => {
    if (!file || !userId) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { setError('Format non supporté (JPEG, PNG, WEBP uniquement)'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Photo trop volumineuse (max 5 Mo)'); return; }
    setUploading(true); setError('');
    try {
      const path = `profiles/${userId}/photo`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setPhotoURL(url);
      // Save immediately to Firestore
      await updateDoc(doc(db, 'users', userId), { photo: url, updatedAt: new Date() });
      if (student?.id) await updateDoc(doc(db, 'students', student.id), { photo: url, updatedAt: new Date() });
    } catch (err) { setError('Erreur upload : ' + err.message); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      if (userId) await updateDoc(doc(db, 'users', userId), { telephone: form.telephone, updatedAt: new Date() });
      const studentRef = student?.id ? doc(db, 'students', student.id) : studentCode ? doc(db, 'students', studentCode) : null;
      if (studentRef) await updateDoc(studentRef, { telephone: form.telephone, ville: form.ville, adresse: form.adresse, updatedAt: new Date() });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { setError('Erreur : ' + err.message); }
    finally { setSaving(false); }
  };

  const fullName = `${student?.prenom || userProfile?.prenom || ''} ${student?.nom || userProfile?.nom || ''}`.trim();
  const initials = [userProfile?.prenom?.[0] || student?.prenom?.[0], userProfile?.nom?.[0] || student?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  const InfoRow = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-slate-100 last:border-0 gap-0.5">
      <span className="text-xs font-semibold text-slate-400 sm:w-40 shrink-0 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Completion banner */}
      {missingFields.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <p className="text-sm font-bold text-amber-800">Dossier incomplet — {missingFields.length} information{missingFields.length > 1 ? 's' : ''} manquante{missingFields.length > 1 ? 's' : ''}</p>
              <p className="text-xs text-amber-600 mt-0.5">Complétez votre profil pour un dossier à jour : {missingFields.join(', ')}</p>
            </div>
            <span className="text-sm font-black text-amber-800 shrink-0">{completionPct}%</span>
          </div>
          <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${completionPct}%`, background: '#f59e0b' }} />
          </div>
        </div>
      )}
      {missingFields.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
          </div>
          <p className="text-sm font-semibold text-emerald-800">Dossier complet — merci !</p>
        </div>
      )}

      {/* Photo + nom card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-5 flex items-center gap-5">
          {/* Avatar with upload overlay */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white font-black text-xl"
                 style={{ background: BLUE }}>
              {photoURL
                ? <img src={photoURL} alt="photo" className="w-full h-full object-cover" />
                : initials}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 disabled:opacity-60"
              style={{ background: BLUE }}
              title="Changer la photo"
            >
              {uploading
                ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              }
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ''; }} />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-black text-slate-800 leading-tight">{fullName || '—'}</p>
            <p className="text-sm text-slate-500 mt-0.5">{studentCode || userProfile?.email}</p>
            {(student?.anneeFormation || student?.niveau) && (
              <p className="text-xs text-slate-400 mt-1">{[student.anneeFormation, student.niveau].filter(Boolean).join(' · ')}</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
              {uploading ? 'Envoi en cours…' : 'Cliquez sur l\'icône pour changer la photo'}
            </p>
          </div>
        </div>
      </div>

      {/* Academic info (read-only) */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100" style={{ background: `${BLUE}07` }}>
          <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Dossier académique</p>
        </div>
        <div className="px-5">
          <InfoRow label="Email institutionnel" value={userProfile?.email} />
          <InfoRow label="Code apprenant"       value={studentCode} />
          <InfoRow label="CIN"                  value={student?.cin} />
          <InfoRow label="Date de naissance"    value={student?.dateNaissance} />
          <InfoRow label="Groupe"               value={student?.groupeId} />
        </div>
      </div>

      {/* Editable fields */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">Coordonnées personnelles</p>
          <p className="text-xs text-slate-400 mt-0.5">Ces informations sont modifiables à tout moment</p>
        </div>
        <div className="p-5 space-y-4">
          {[
            { label: 'Téléphone', key: 'telephone', type: 'tel',  ph: '+212 6XX XXX XXX' },
            { label: 'Ville',     key: 'ville',     type: 'text', ph: 'Votre ville de résidence' },
            { label: 'Adresse',   key: 'adresse',   type: 'text', ph: 'Votre adresse complète' },
          ].map(({ label, key, type, ph }) => {
            const isEmpty = !form[key];
            return (
              <div key={key}>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  {label}
                  {isEmpty && <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">Manquant</span>}
                </label>
                <input type={type} value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-sm text-slate-800 focus:outline-none transition-all"
                  style={{ borderColor: isEmpty ? '#fcd34d' : '#e2e8f0' }}
                  onFocus={e => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = `0 0 0 3px ${BLUE}18`; }}
                  onBlur={e => { e.target.style.borderColor = !form[key] ? '#fcd34d' : '#e2e8f0'; e.target.style.boxShadow = ''; }}
                />
              </div>
            );
          })}
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

function getMention(avg) {
  if (avg == null) return null;
  const v = parseFloat(avg);
  if (v >= 16) return 'Très bien';
  if (v >= 14) return 'Bien';
  if (v >= 12) return 'Assez bien';
  if (v >= 10) return 'Passable';
  return 'Insuffisant';
}

function ResultatsTab({ studentId, studentCode }) {
  const [semestres, setSemestres] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [isEmpty,   setIsEmpty]   = useState(false);

  useEffect(() => {
    if (!studentId && !studentCode) { setLoading(false); setIsEmpty(true); return; }
    (async () => {
      try {
        // 1. Fetch notes for this student (try both Firestore doc id and legacy code)
        const seen = new Set();
        const studentNotes = [];
        for (const value of [studentId, studentCode]) {
          if (!value) continue;
          try {
            const snap = await getDocs(query(collection(db, 'notes'), where('studentId', '==', value)));
            snap.forEach(d => {
              if (!seen.has(d.id)) { seen.add(d.id); studentNotes.push({ id: d.id, ...d.data() }); }
            });
          } catch { /* permission denied or no results */ }
        }

        if (studentNotes.length === 0) { setIsEmpty(true); return; }

        // 2. Fetch evaluations referenced by the notes
        const evalIds = [...new Set(studentNotes.map(n => n.evaluationId).filter(Boolean))];
        const evalMap = {};
        await Promise.all(evalIds.map(async eid => {
          try {
            const s = await getDoc(doc(db, 'evaluations', eid));
            if (s.exists()) evalMap[eid] = { id: s.id, ...s.data() };
          } catch { /* ignore */ }
        }));

        // 3. Fetch modules referenced by evaluations
        const modIds = [...new Set(Object.values(evalMap).map(e => e.moduleId).filter(Boolean))];
        const modMap = {};
        await Promise.all(modIds.map(async mid => {
          try {
            const s = await getDoc(doc(db, 'modules', mid));
            if (s.exists()) modMap[mid] = { id: s.id, ...s.data() };
          } catch { /* ignore */ }
        }));

        // 4. Group by semestre → module
        const bySem = {};
        for (const note of studentNotes) {
          const ev = evalMap[note.evaluationId];
          if (!ev) continue;
          const sem = ev.sessionAcademique || 'S1';
          const mid = ev.moduleId || '_unknown';
          if (!bySem[sem]) bySem[sem] = {};
          if (!bySem[sem][mid]) bySem[sem][mid] = [];
          bySem[sem][mid].push({ note, ev });
        }

        // 5. Compute weighted averages per module, then general average
        const result = Object.entries(bySem)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([semLabel, moduleMap]) => {
            let genWeightedSum = 0, genCoeffSum = 0;
            const moduleList = Object.entries(moduleMap).map(([mid, items]) => {
              const mod      = modMap[mid];
              const modCoeff = parseFloat(mod?.coeff) || 1;
              let evWeightedSum = 0, evCoeffSum = 0, pending = 0;
              for (const { note, ev } of items) {
                const bareme  = parseFloat(ev.bareme)      || 20;
                const evCoeff = parseFloat(ev.coefficient) || 1;
                if (note.absent) {
                  evWeightedSum += 0; evCoeffSum += evCoeff; // absent = 0
                } else if (note.note != null) {
                  evWeightedSum += (parseFloat(note.note) / bareme) * 20 * evCoeff;
                  evCoeffSum += evCoeff;
                } else {
                  pending++; // note not yet entered
                }
              }
              const moyenne = evCoeffSum > 0 ? evWeightedSum / evCoeffSum : null;
              if (moyenne !== null) { genWeightedSum += moyenne * modCoeff; genCoeffSum += modCoeff; }
              return { id: mid, nom: mod?.nom || mod?.code || mid, coeff: modCoeff, moyenne, pending, evalCount: items.length };
            });
            const moyenneGenerale = genCoeffSum > 0 ? genWeightedSum / genCoeffSum : null;
            const hasPending = moduleList.some(m => m.pending > 0);
            return { label: semLabel, modules: moduleList, moyenneGenerale, mention: getMention(moyenneGenerale), hasPending };
          });

        setSemestres(result);
      } catch (err) { console.error('ResultatsTab error:', err); }
      finally { setLoading(false); }
    })();
  }, [studentId, studentCode]);

  if (loading) return <Spinner />;
  if (isEmpty || semestres.length === 0)
    return <EmptyState message="Aucun résultat disponible pour le moment." />;

  return (
    <div className="space-y-5">
      {semestres.map(sem => (
        <div key={sem.label} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Semestre header */}
          <div className="px-5 py-4 border-b border-slate-100"
               style={{ background: 'linear-gradient(135deg,#005989,#0077b6)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white font-bold text-sm">Semestre {sem.label}</p>
                {sem.hasPending && (
                  <p className="text-white/60 text-xs mt-0.5">Semestre en cours — notes partielles</p>
                )}
              </div>
              {sem.moyenneGenerale !== null && (
                <div className="text-right">
                  <p className="text-2xl font-black text-white leading-none">
                    {sem.moyenneGenerale.toFixed(2)}
                    <span className="text-xs font-normal text-white/60 ml-1">/20</span>
                  </p>
                  {sem.mention && <p className="text-white/70 text-xs mt-0.5">{sem.mention}</p>}
                </div>
              )}
            </div>
          </div>
          {/* Module rows */}
          <div className="divide-y divide-slate-50">
            {sem.modules.map(m => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 font-medium truncate">{m.nom}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Coef. {m.coeff}
                    {m.pending > 0 && (
                      <span className="ml-2 font-medium text-amber-500">
                        · {m.pending} éval. en attente
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-base font-black shrink-0 tabular-nums"
                      style={{ color: m.moyenne !== null ? moyColor(m.moyenne) : '#cbd5e1' }}>
                  {m.moyenne !== null ? m.moyenne.toFixed(2) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
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

// ── Transport ─────────────────────────────────────────────────────────────────
function TransportTab({ studentId, studentNom, studentPrenom, studentCode }) {
  const [abonnement, setAbonnement] = useState(null);
  const [demande,    setDemande]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [point,      setPoint]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    (async () => {
      try {
        // Check confirmed subscription
        const qAbo = query(collection(db, 'transport_abonnements'), where('studentId', '==', studentId));
        const snapAbo = await getDocs(qAbo);
        if (!snapAbo.empty) { setAbonnement({ id: snapAbo.docs[0].id, ...snapAbo.docs[0].data() }); setLoading(false); return; }
        // Check pending request
        const qDem = query(collection(db, 'transport_demandes'), where('studentId', '==', studentId));
        const snapDem = await getDocs(qDem);
        if (!snapDem.empty) setDemande({ id: snapDem.docs[0].id, ...snapDem.docs[0].data() });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    })();
  }, [studentId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!point) { setError('Veuillez sélectionner un point de rassemblement.'); return; }
    setSubmitting(true); setError('');
    try {
      const newDemande = {
        studentId,
        studentNom:    studentNom || '',
        studentPrenom: studentPrenom || '',
        studentCode:   studentCode || '',
        pointRassemblement: point,
        statut:        'en_attente',
        dateDemande:   serverTimestamp(),
      };
      const ref = await addDoc(collection(db, 'transport_demandes'), newDemande);
      setDemande({ id: ref.id, ...newDemande, statut: 'en_attente' });
      setSubmitted(true);
    } catch (err) { setError('Erreur lors de la soumission : ' + err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <Spinner />;

  // ── Active subscription ──
  if (abonnement && abonnement.statut === 'actif') {
    return (
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl overflow-hidden border border-green-100"
             style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#16a34a' }}>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white text-xl">🚌</div>
            <div>
              <p className="text-white font-bold text-base">Abonnement Transport actif</p>
              <p className="text-green-100 text-xs">Navette IFTL — {new Date(abonnement.dateDebut?.toDate?.() || abonnement.dateDebut).toLocaleDateString('fr-MA', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <span className="ml-auto bg-white text-green-700 text-xs font-bold px-3 py-1 rounded-full">Confirmé</span>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center text-green-700 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Point de rassemblement</p>
                <p className="text-slate-800 font-semibold text-sm">{abonnement.pointRassemblement}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 bg-white/60 rounded-lg px-4 py-3">
              Pour modifier votre point de rassemblement ou suspendre votre abonnement, contactez la scolarité.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Suspended subscription ──
  if (abonnement && abonnement.statut === 'suspendu') {
    return (
      <div className="rounded-2xl border border-orange-200 overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: '#ea580c' }}>
          <span className="text-2xl">⏸️</span>
          <div>
            <p className="text-white font-bold">Abonnement suspendu</p>
            <p className="text-orange-100 text-xs">Navette IFTL — {abonnement.pointRassemblement}</p>
          </div>
        </div>
        <div className="px-6 py-5 bg-orange-50">
          <p className="text-sm text-slate-600">Votre abonnement transport est temporairement suspendu. Contactez la scolarité pour le réactiver.</p>
        </div>
      </div>
    );
  }

  // ── Pending request ──
  if (demande) {
    return (
      <div className="space-y-4 pt-2">
        <div className="rounded-2xl border border-blue-100 overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: BLUE }}>
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-white font-bold">Demande en cours de traitement</p>
              <p className="text-blue-200 text-xs">Votre demande a été transmise à la scolarité</p>
            </div>
          </div>
          <div className="px-6 py-5 bg-blue-50 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              </svg>
              <p className="text-sm text-slate-700">Point demandé : <span className="font-semibold">{demande.pointRassemblement}</span></p>
            </div>
            <p className="text-xs text-slate-500 border-t border-blue-100 pt-3">
              La scolarité confirmera votre abonnement prochainement. Vous recevrez une notification dès la confirmation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── No subscription — request form ──
  return (
    <div className="space-y-4 pt-2">
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100" style={{ background: '#f8fafc' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#e0f2fe' }}>🚌</div>
          <div>
            <p className="font-bold text-slate-800">Navette IFTL</p>
            <p className="text-xs text-slate-400">Souscrire à l'abonnement transport</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <p className="text-sm text-slate-600">
            Sélectionnez votre point de rassemblement. La scolarité confirmera votre abonnement et vous recevrez une notification.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Point de rassemblement
            </label>
            <select
              value={point}
              onChange={e => setPoint(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border text-sm text-slate-700 bg-white focus:outline-none transition-all"
              style={{
                borderColor: point ? BLUE : '#e2e8f0',
                boxShadow: point ? `0 0 0 3px ${BLUE}18` : 'none',
              }}
            >
              <option value="">— Choisir un point de rassemblement —</option>
              {POINTS_RASSEMBLEMENT.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-4 py-2 rounded-lg">{error}</p>
          )}

          {submitted ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-xl">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>
              <span className="text-sm font-medium">Demande envoyée avec succès !</span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={submitting || !point}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{
                background: point ? BLUE : '#cbd5e1',
                cursor: point ? 'pointer' : 'not-allowed',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Envoi en cours…' : 'Soumettre ma demande'}
            </button>
          )}

          <p className="text-xs text-center text-slate-400">
            Votre demande sera traitée par l'équipe de scolarité dans les 48 h ouvrables.
          </p>
        </form>
      </div>
    </div>
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
    if (!user?.uid && !studentCode) { setLoadingStudent(false); return; }
    (async () => {
      try {
        // Try by studentId stored in users doc (fastest and most reliable)
        const sid = userProfile?.studentId;
        if (sid) {
          const directSnap = await getDoc(doc(db, 'students', sid));
          if (directSnap.exists()) { setStudent({ id: directSnap.id, ...directSnap.data() }); return; }
        }
        // Try direct doc ID lookup (old format where docId == code)
        if (studentCode) {
          const directSnap = await getDoc(doc(db, 'students', studentCode));
          if (directSnap.exists()) { setStudent({ id: directSnap.id, ...directSnap.data() }); return; }
          // Try by codeApprenant field
          const q1 = query(collection(db, 'students'), where('codeApprenant', '==', studentCode));
          const snap1 = await getDocs(q1);
          if (!snap1.empty) { const d = snap1.docs[0]; setStudent({ id: d.id, ...d.data() }); return; }
          // Legacy: try by 'code' field
          const q2 = query(collection(db, 'students'), where('code', '==', studentCode));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) { const d = snap2.docs[0]; setStudent({ id: d.id, ...d.data() }); }
        }
      } catch (err) { console.error(err); }
      finally { setLoadingStudent(false); }
    })();
  }, [user?.uid, studentCode, userProfile?.studentId]);

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
                {activeTab === 'transport'     && <TransportTab studentId={studentId} studentNom={nom} studentPrenom={prenom} studentCode={studentCode} />}
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
