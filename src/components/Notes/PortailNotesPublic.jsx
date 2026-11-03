import { useState, useEffect, useRef } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, getDoc, doc,
  query, where, serverTimestamp,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { auth, db } from '../../services/firebase';

function genCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return 'IFTL-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const INST_NAME = import.meta.env.VITE_DEFAULT_INSTITUTE_NAME || 'IFTL';
const INST_LOGO = import.meta.env.VITE_DEFAULT_LOGO_URL || null;

const PROGRAMMES = [
  { value: '1A_TS',               label: '1ère Année TS',                  annee: '2026-2027' },
  { value: '2A_TS',               label: '2ème Année TS',                  annee: '2026-2027' },
  { value: 'TechnicienQ',         label: 'Technicien + Qualification',     annee: '2026-2027' },
  { value: 'licence_cnam',        label: 'Licence CNAM',                   annee: '2025-2026' },
  { value: 'licence_transitaire', label: 'Licence Transitaire',            annee: '2025-2026' },
  { value: 'mastere',             label: 'Mastère / Master',               annee: '2025-2026' },
];

const EVAL_TYPES = [
  { value: 'CC',            label: 'Contrôle Continu',          color: '#6366f1' },
  { value: 'EFM',           label: 'Examen Final de Module',     color: '#0891b2' },
  { value: 'EFF',           label: 'Examen de Fin de Formation', color: '#7c3aed' },
  { value: 'RATTRAPAGE',    label: 'Rattrapage',                 color: '#d97706' },
  { value: 'PARTICIPATION', label: 'Participation / Discipline', color: '#059669' },
  { value: 'TD',            label: 'Travaux Dirigés',            color: '#0d6efd' },
  { value: 'SOUTENANCE',    label: 'Soutenance',                 color: '#dc2626' },
];

const C = {
  brand:        '#005989',
  brandDeep:    '#003c5a',
  brandMid:     '#0072b1',
  brandLight:   '#e8f4fb',
  brandTint:    '#f0f7fc',
  bg:           '#f4f7fb',
  card:         '#ffffff',
  cardBorder:   'rgba(0,89,137,0.10)',
  cardShadow:   '0 8px 40px rgba(0,89,137,0.10)',
  inputBorder:  '#dce8f0',
  ink:          '#0f2137',
  inkMid:       '#2d4a60',
  muted:        '#6b8fa6',
  success:      '#059669',
  successBg:    '#d1fae5',
  successBorder:'#6ee7b7',
  warning:      '#d97706',
  error:        '#dc2626',
  errorBg:      '#fee2e2',
};

const font = "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif";
const inputBase = {
  width: '100%', fontFamily: font, fontSize: 14, fontWeight: 500,
  color: C.ink, background: C.card,
  border: `1.5px solid ${C.inputBorder}`, borderRadius: 10,
  padding: '11px 14px', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.18s, box-shadow 0.18s', appearance: 'none',
};

const STEPS = [
  { n: 1, icon: '👤', label: 'Identification' },
  { n: 2, icon: '📚', label: 'Sélection' },
  { n: 3, icon: '✏️', label: 'Saisie des notes' },
];

// ── Micro-components ────────────────────────────────────────────
function NoteStatus({ note }) {
  if (note === '' || note === null || note === undefined) return null;
  const n = parseFloat(note);
  if (isNaN(n)) return null;
  const color = n >= 10 ? C.success : n >= 8 ? C.warning : C.error;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%', fontSize: 11, fontWeight: 800, background: color, color: '#fff', flexShrink: 0 }}>
      {n >= 10 ? '✓' : n >= 8 ? '~' : '✗'}
    </span>
  );
}

function Badge({ type }) {
  const t = EVAL_TYPES.find(e => e.value === type) || EVAL_TYPES[0];
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', background: t.color + '22', color: t.color, border: `1px solid ${t.color}44` }}>
      {t.label}
    </span>
  );
}

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, padding: '0 4px' }}>
      {STEPS.map((s, i) => {
        const done = step > s.n, active = step === s.n;
        return (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: done ? 15 : 14, fontWeight: 800, background: done ? C.success : active ? `linear-gradient(135deg, ${C.brand}, ${C.brandMid})` : '#eef2f7', color: (done || active) ? '#fff' : C.muted, boxShadow: active ? `0 4px 14px ${C.brand}50` : 'none', transition: 'all 0.3s' }}>{done ? '✓' : s.icon}</div>
              <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', color: active ? C.ink : done ? C.success : C.muted }}>{s.label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 2, marginInline: 10, background: done ? C.success : '#eef2f7', borderRadius: 2, transition: 'background 0.4s' }} />}
          </div>
        );
      })}
    </div>
  );
}

function Label({ children, required }) {
  return (
    <label style={{ display: 'block', marginBottom: 7, fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>
      {children}{required && <span style={{ color: C.error, marginLeft: 3 }}>*</span>}
    </label>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {error && <p style={{ margin: '5px 0 0', fontSize: 12, color: C.error }}>⚠ {error}</p>}
    </div>
  );
}

function FInput({ style: sx, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <input {...props}
      onFocus={e => { setFocused(true); props.onFocus?.(e); }}
      onBlur={e => { setFocused(false); props.onBlur?.(e); }}
      style={{ ...inputBase, ...sx, borderColor: focused ? C.brand : C.inputBorder, boxShadow: focused ? `0 0 0 3px ${C.brand}22` : 'none' }}
    />
  );
}

function FSelect({ style: sx, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <select {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{ ...inputBase, ...sx, paddingRight: 36, borderColor: focused ? C.brand : C.inputBorder, boxShadow: focused ? `0 0 0 3px ${C.brand}22` : 'none', cursor: props.disabled ? 'not-allowed' : 'pointer', opacity: props.disabled ? 0.5 : 1 }}
      />
      <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 12, pointerEvents: 'none' }}>▾</span>
    </div>
  );
}

function Spinner({ size = 20, color = C.brand }) {
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: '50%', border: `2.5px solid ${color}30`, borderTopColor: color, animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />;
}

function Btn({ children, onClick, variant = 'primary', disabled, loading, full, style: sx }) {
  const base = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: font, fontWeight: 700, borderRadius: 12, padding: '13px 20px', width: full ? '100%' : 'auto', cursor: (disabled || loading) ? 'not-allowed' : 'pointer', border: 'none', fontSize: 14, transition: 'all 0.18s', letterSpacing: '0.01em', ...sx };
  if (variant === 'primary') Object.assign(base, { background: (disabled || loading) ? '#9fc8de' : `linear-gradient(135deg, ${C.brand} 0%, ${C.brandMid} 100%)`, color: '#fff', boxShadow: (disabled || loading) ? 'none' : `0 4px 14px ${C.brand}40` });
  if (variant === 'ghost')   Object.assign(base, { background: 'transparent', color: C.brand, border: `1.5px solid ${C.inputBorder}` });
  if (variant === 'success') Object.assign(base, { background: `linear-gradient(135deg, #059669, #10b981)`, color: '#fff', boxShadow: '0 4px 14px rgba(5,150,105,0.35)' });
  return <button onClick={!disabled && !loading ? onClick : undefined} style={base}>{loading && <Spinner size={17} color="#fff" />}{children}</button>;
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
export default function PortailNotesPublic() {
  const [step, setStep]         = useState(0); // 0 = code, 1-3 = wizard, 4 = success
  const [ready, setReady]       = useState(false);
  const [authErr, setAuthErr]   = useState(null);
  const topRef                  = useRef(null);

  // Step 0 — Code d'accès
  const [codeInput, setCodeInput]     = useState('');
  const [codeError, setCodeError]     = useState('');
  const [codeChecking, setCodeChecking] = useState(false);
  const [storedCode, setStoredCode]   = useState(null);
  const [showCode, setShowCode]       = useState(false);

  // Step 0 — Mode modification
  const [modifMode, setModifMode]       = useState(false);
  const [modifCode, setModifCode]       = useState('');
  const [modifLoading, setModifLoading] = useState(false);
  const [modifError, setModifError]     = useState('');

  // Submission tracking
  const [editId, setEditId]               = useState(null);   // Firestore doc ID en cours de modification
  const [submissionCode, setSubmissionCode] = useState('');

  // Data
  const [groupes, setGroupes]             = useState([]);
  const [intervenants, setIntervenants]   = useState([]);
  const [modules, setModules]             = useState([]);
  const [students, setStudents]           = useState([]);
  const [loadingData, setLoadingData]     = useState(false);

  // Step 1 — Identification
  const [intervenantId, setIntervenantId]       = useState('');
  const [intervenantNom, setIntervenantNom]     = useState('');
  const [intervenantAutre, setIntervenantAutre] = useState('');
  const [date, setDate]                         = useState(() => new Date().toISOString().slice(0, 10));
  const [e1, setE1]                             = useState({});

  // Step 2 — Sélection
  const [programme, setProgramme]       = useState('1A_TS');
  const [anneeSelectee, setAnneeSelectee] = useState('2026-2027');
  const [groupeId, setGroupeId]       = useState('');
  const [groupeNom, setGroupeNom]     = useState('');
  const [moduleId, setModuleId]       = useState('');
  const [moduleNom, setModuleNom]     = useState('');
  const [moduleAutre, setModuleAutre] = useState('');
  const [evalType, setEvalType]       = useState('CC');
  const [semestre, setSemestre]       = useState('S1');
  const [e2, setE2]                   = useState({});

  // Step 3 — Saisie
  const [notes, setNotes]             = useState({});
  const [saving, setSaving]           = useState(false);
  const [saveErr, setSaveErr]         = useState(null);
  const [search, setSearch]           = useState('');
  const [filterAbsent, setFilterAbsent] = useState(false);

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Anonymous auth + load initial data
  useEffect(() => {
    signInAnonymously(auth)
      .then(async () => {
        const [gSnap, iSnap, codeSnap] = await Promise.all([
          getDocs(collection(db, 'groupes')),
          getDocs(collection(db, 'intervenants')),
          getDoc(doc(db, 'settings', 'portail_notes')),
        ]);
        setGroupes(gSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
        setIntervenants(
          iSnap.docs.map(d => {
            const d2 = d.data();
            const nom = [d2.prenom, d2.nom].filter(Boolean).join(' ') || d2.nomComplet || d.id;
            return { id: d.id, nom };
          }).sort((a, b) => a.nom.localeCompare(b.nom))
        );
        const code = codeSnap.exists() ? codeSnap.data().codeAcces : null;
        setStoredCode(code);
        setReady(true);
      })
      .catch(err => {
        console.error(err);
        setAuthErr('Impossible de se connecter au serveur. Rechargez la page.');
      });
  }, []);

  // Verify code
  const handleCodeSubmit = () => {
    if (!codeInput.trim()) { setCodeError('Veuillez saisir le code d\'accès.'); return; }
    setCodeChecking(true);
    setTimeout(() => {
      if (!storedCode) {
        // No code configured → open access
        setStep(1); scrollTop();
      } else if (codeInput.trim().toLowerCase() === storedCode.trim().toLowerCase()) {
        setCodeError('');
        setStep(1); scrollTop();
      } else {
        setCodeError("Code incorrect. Contactez l'équipe pédagogique.");
      }
      setCodeChecking(false);
    }, 400);
  };

  // Lookup existing submission by tracking code
  const handleModifLookup = async () => {
    const code = modifCode.trim().toUpperCase();
    if (!code) { setModifError('Saisissez votre code de suivi.'); return; }
    setModifLoading(true); setModifError('');
    try {
      const snap = await getDocs(query(collection(db, 'saisie_notes_portail'), where('codeModification', '==', code)));
      if (snap.empty) { setModifError("Code introuvable. Vérifiez votre code ou contactez l'équipe pédagogique."); setModifLoading(false); return; }
      const sub = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (sub.statut === 'importé') {
        setModifError("Cette saisie a déjà été intégrée dans le système. Contactez l'équipe pédagogique pour toute modification.");
        setModifLoading(false); return;
      }
      if (sub.statut === 'rejeté') {
        setModifError("Cette saisie a été rejetée. Effectuez une nouvelle saisie ou contactez l'équipe pédagogique.");
        setModifLoading(false); return;
      }
      // Pre-fill form
      setEditId(sub.id);
      setSubmissionCode(code);
      setIntervenantId('__autre__');
      setIntervenantAutre(sub.intervenantNom || '');
      setDate(sub.date || new Date().toISOString().slice(0, 10));
      setEvalType(sub.type || 'CC');
      setSemestre(sub.semestre || 'S1');
      // Load groupe + students + modules
      await onGroupeChange(sub.groupeId);
      setModuleId('__autre__');
      setModuleAutre(sub.moduleNom || '');
      setGroupeNom(sub.groupeNom || '');
      // Pre-fill notes after students load
      if (sub.notes?.length) {
        const init = {};
        sub.notes.forEach(n => { init[n.studentId] = { note: n.note !== null && n.note !== undefined ? String(n.note) : '', absent: Boolean(n.absent) }; });
        setNotes(init);
      }
      setStep(1); scrollTop();
    } catch (err) {
      console.error(err);
      setModifError('Erreur de connexion. Réessayez.');
    } finally { setModifLoading(false); }
  };

  // Load modules + students on groupe change
  const onGroupeChange = async id => {
    const g = groupes.find(x => x.id === id);
    setGroupeId(id); setGroupeNom(g?.nom || '');
    setModuleId(''); setModuleNom(''); setModuleAutre('');
    setStudents([]); setModules([]); setE2({});
    if (!id) return;
    setLoadingData(true);
    try {
      const [sSnap, sessSnap] = await Promise.all([
        getDocs(query(collection(db, 'students'), where('groupeId', '==', id))),
        getDocs(query(collection(db, 'sessions'), where('groupeId', '==', id))),
      ]);
      setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
      const modMap = new Map();
      sessSnap.docs.forEach(d => {
        const s = d.data();
        if (s.moduleId && !modMap.has(s.moduleId)) modMap.set(s.moduleId, { id: s.moduleId, nom: s.module || s.moduleNom || s.moduleId });
      });
      if (modMap.size === 0) {
        const mSnap = await getDocs(collection(db, 'modules'));
        mSnap.docs.forEach(d => {
          const m = d.data();
          modMap.set(d.id, { id: d.id, nom: [m.code, m.nom].filter(Boolean).join(' — ') || d.id });
        });
      }
      setModules(Array.from(modMap.values()).sort((a, b) => a.nom.localeCompare(b.nom)));
    } catch (err) { console.error(err); }
    finally { setLoadingData(false); }
  };

  const effectiveIntervenantNom = intervenantId === '__autre__' ? intervenantAutre : intervenantNom;
  const effectiveModuleNom      = moduleId === '__autre__' ? moduleAutre : moduleNom;
  const anneeAcademique         = anneeSelectee;
  const programmeLabel          = PROGRAMMES.find(p => p.value === programme)?.label || '';

  // Sync year default when programme changes
  useEffect(() => {
    const defaultAnnee = PROGRAMMES.find(p => p.value === programme)?.annee || '2026-2027';
    setAnneeSelectee(defaultAnnee);
  }, [programme]);

  // Init notes
  useEffect(() => {
    const init = {};
    students.forEach(s => { init[s.id] = { note: '', absent: false }; });
    setNotes(init); setSearch('');
  }, [students]);

  const setNote = (sid, field, val) => setNotes(prev => ({ ...prev, [sid]: { ...prev[sid], [field]: val } }));
  const markAllAbsent = () => setNotes(prev => { const n = { ...prev }; students.forEach(s => { n[s.id] = { note: '', absent: true }; }); return n; });
  const clearAll      = () => setNotes(prev => { const n = { ...prev }; students.forEach(s => { n[s.id] = { note: '', absent: false }; }); return n; });

  const filledCount = Object.values(notes).filter(v => v.absent || (v.note !== '' && v.note !== null)).length;
  const absentCount = Object.values(notes).filter(v => v.absent).length;
  const noteCount   = filledCount - absentCount;
  const avgNote = (() => {
    const vals = Object.values(notes).filter(v => !v.absent && v.note !== '' && v.note !== null && !isNaN(parseFloat(v.note))).map(v => parseFloat(v.note));
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) : null;
  })();

  const validate1 = () => {
    const e = {};
    if (!intervenantId) e.intervenant = 'Sélectionnez un(e) intervenant(e)';
    else if (intervenantId === '__autre__' && !intervenantAutre.trim()) e.intervenant = 'Saisissez votre nom complet';
    if (!date) e.date = 'Obligatoire';
    return e;
  };
  const validate2 = () => {
    const e = {};
    if (!groupeId) e.groupe = 'Sélectionnez un groupe';
    if (!moduleId) e.module = 'Sélectionnez un module';
    else if (moduleId === '__autre__' && !moduleAutre.trim()) e.module = 'Saisissez le nom du module';
    return e;
  };

  const handleSubmit = async () => {
    setSaveErr(null);
    if (filledCount === 0) { setSaveErr('Saisissez au moins une note ou marquez un absent.'); return; }
    setSaving(true);
    try {
      const payload = {
        intervenantNom: effectiveIntervenantNom.trim(),
        date, groupeId, groupeNom,
        moduleId:   moduleId === '__autre__' ? '__autre__' : moduleId,
        moduleNom:  effectiveModuleNom.trim(),
        type: evalType, semestre,
        programme, programmeLabel,
        anneeAcademique,
        statut: 'en_attente',
        notes: students.map(s => {
          const v = notes[s.id] || { note: '', absent: false };
          return { studentId: s.id, nom: s.nom || '', prenom: s.prenom || '', code: s.code || '', note: v.absent ? null : (v.note === '' ? null : parseFloat(v.note)), absent: Boolean(v.absent) };
        }),
      };
      if (editId) {
        // Modification d'une saisie existante
        await updateDoc(doc(db, 'saisie_notes_portail', editId), { ...payload, updatedAt: serverTimestamp() });
        setSubmissionCode(submissionCode); // keep existing code
      } else {
        // Nouvelle saisie
        const code = genCode();
        const ref = await addDoc(collection(db, 'saisie_notes_portail'), {
          ...payload,
          codeModification: code,
          createdAt: serverTimestamp(),
        });
        setSubmissionCode(code);
        setEditId(ref.id);
      }
      setStep(4); scrollTop();
    } catch (err) {
      console.error(err);
      setSaveErr('Erreur lors de l\'envoi : ' + (err.message || 'Réessayez'));
    } finally { setSaving(false); }
  };

  const resetAll = () => {
    setStep(1); setIntervenantId(''); setIntervenantNom(''); setIntervenantAutre('');
    setDate(new Date().toISOString().slice(0, 10));
    setProgramme('1A_TS'); setAnneeSelectee('2026-2027');
    setGroupeId(''); setGroupeNom(''); setModuleId(''); setModuleNom(''); setModuleAutre('');
    setEvalType('CC'); setSemestre('S1'); setStudents([]); setNotes({});
    setE1({}); setE2({}); setSaveErr(null); setSearch('');
    setEditId(null); setSubmissionCode('');
    setModifMode(false); setModifCode(''); setModifError('');
  };

  const goStep = n => { setStep(n); scrollTop(); };

  const visibleStudents = students.filter(s => {
    const q = search.toLowerCase();
    const match = !q || [s.nom, s.prenom, s.code].some(x => (x || '').toLowerCase().includes(q));
    return match && (!filterAbsent || notes[s.id]?.absent);
  });

  const typeInfo = EVAL_TYPES.find(t => t.value === evalType) || EVAL_TYPES[0];

  return (
    <div ref={topRef} style={{ minHeight: '100vh', background: C.bg, fontFamily: font, WebkitFontSmoothing: 'antialiased' }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .pn-animate { animation: fadeUp 0.35s cubic-bezier(.4,0,.2,1) both; }
        .pn-note-input:focus { border-color: ${C.brand} !important; box-shadow: 0 0 0 3px ${C.brand}22 !important; outline: none; }
        .pn-row:hover { background: ${C.brandTint} !important; }
        .pn-qbtn:hover { opacity: 0.82; }
      `}</style>

      {/* HEADER */}
      <header style={{ background: `linear-gradient(135deg, ${C.brandDeep} 0%, ${C.brand} 100%)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          {INST_LOGO
            ? <img src={INST_LOGO} alt={INST_NAME} style={{ height: 48, objectFit: 'contain', filter: 'brightness(0) invert(1)', flexShrink: 0 }} />
            : <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: '#fff', flexShrink: 0 }}>{INST_NAME.slice(0, 2)}</div>
          }
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>Portail de Saisie des Notes</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.60)' }}>{INST_NAME} · Année académique {anneeAcademique}</p>
          </div>
          {step >= 1 && step < 4 && (
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Étape</p>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#fff' }}>{step}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>/3</span></p>
            </div>
          )}
        </div>
        {step >= 1 && step < 4 && (
          <div style={{ height: 3, background: 'rgba(255,255,255,0.15)' }}>
            <div style={{ height: '100%', background: 'rgba(255,255,255,0.85)', width: `${(step / 3) * 100}%`, transition: 'width 0.4s cubic-bezier(.4,0,.2,1)' }} />
          </div>
        )}
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px 64px' }}>

        {authErr && <div style={{ background: C.errorBg, border: '1px solid #fca5a5', borderRadius: 14, padding: '16px 20px', marginBottom: 24, color: C.error, fontSize: 14, fontWeight: 500 }}>⚠ {authErr}</div>}

        {!ready && !authErr && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spinner size={36} />
            <p style={{ marginTop: 18, color: C.muted, fontSize: 14, fontWeight: 500 }}>Connexion au serveur…</p>
          </div>
        )}

        {/* ═══ STEP 0 — CODE D'ACCÈS + MODE MODIF ═══════════════ */}
        {ready && step === 0 && (
          <div className="pn-animate">
            <div style={{ background: C.card, borderRadius: 24, boxShadow: C.cardShadow, border: `1px solid ${C.cardBorder}`, padding: '44px 32px', textAlign: 'center' }}>
              {/* Lock icon */}
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.brandLight, border: `2px solid ${C.brand}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 22px' }}>
                {modifMode ? '✏️' : '🔐'}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 12, padding: 4, maxWidth: 320, margin: '0 auto 28px', gap: 4 }}>
                {[
                  { key: false, label: '📝 Nouvelle saisie' },
                  { key: true,  label: '✏️ Modifier ma saisie' },
                ].map(t => (
                  <button key={String(t.key)} onClick={() => { setModifMode(t.key); setModifError(''); setCodeError(''); }}
                    style={{ flex: 1, fontFamily: font, fontSize: 12, fontWeight: 700, padding: '8px 6px', borderRadius: 9, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: modifMode === t.key ? C.card : 'transparent',
                      color: modifMode === t.key ? C.brand : C.muted,
                      boxShadow: modifMode === t.key ? '0 1px 6px rgba(0,0,0,0.1)' : 'none',
                    }}>{t.label}</button>
                ))}
              </div>

              {!modifMode ? (
                <>
                  <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: C.ink }}>Accès réservé</h1>
                  <p style={{ margin: '0 0 28px', fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                    Ce portail est réservé aux intervenant(e)s de {INST_NAME}.<br />
                    Saisissez le code d'accès communiqué par l'équipe pédagogique.
                  </p>
                  <div style={{ maxWidth: 320, margin: '0 auto' }}>
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                      <FInput
                        type={showCode ? 'text' : 'password'}
                        value={codeInput}
                        onChange={e => { setCodeInput(e.target.value); setCodeError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
                        placeholder="Code d'accès"
                        autoFocus
                        style={{ textAlign: 'center', fontSize: 18, fontWeight: 800, letterSpacing: '0.12em', paddingRight: 44 }}
                      />
                      <button onClick={() => setShowCode(v => !v)} tabIndex={-1}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: C.muted }}>
                        {showCode ? '🙈' : '👁'}
                      </button>
                    </div>
                    {codeError && <div style={{ background: C.errorBg, border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: C.error, fontSize: 13, fontWeight: 600 }}>⚠ {codeError}</div>}
                    {!storedCode && ready && <p style={{ fontSize: 12, color: C.warning, marginBottom: 14 }}>⚠ Aucun code configuré — accès libre.</p>}
                    <Btn full onClick={handleCodeSubmit} loading={codeChecking}>
                      {codeChecking ? 'Vérification…' : 'Accéder au portail →'}
                    </Btn>
                  </div>
                </>
              ) : (
                <>
                  <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: C.ink }}>Modifier une saisie</h1>
                  <p style={{ margin: '0 0 28px', fontSize: 14, color: C.muted, lineHeight: 1.7 }}>
                    Saisissez le code de suivi reçu après votre dépôt.<br />
                    La modification n'est possible que tant que la saisie<br />n'a pas été validée par l'équipe pédagogique.
                  </p>
                  <div style={{ maxWidth: 320, margin: '0 auto' }}>
                    <FInput
                      type="text"
                      value={modifCode}
                      onChange={e => { setModifCode(e.target.value.toUpperCase()); setModifError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleModifLookup()}
                      placeholder="IFTL-XXXXXX"
                      autoFocus
                      style={{ textAlign: 'center', fontSize: 18, fontWeight: 800, letterSpacing: '0.12em', marginBottom: 16, fontFamily: 'monospace' }}
                    />
                    {modifError && (
                      <div style={{ background: modifError.includes('intégrée') || modifError.includes('rejetée') ? '#fef3c7' : C.errorBg, border: `1px solid ${modifError.includes('intégrée') || modifError.includes('rejetée') ? '#fde68a' : '#fca5a5'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: modifError.includes('intégrée') || modifError.includes('rejetée') ? C.warning : C.error, fontSize: 13, fontWeight: 600, lineHeight: 1.6 }}>
                        {modifError.includes('intégrée') || modifError.includes('rejetée') ? 'ℹ️' : '⚠'} {modifError}
                      </div>
                    )}
                    <Btn full onClick={handleModifLookup} loading={modifLoading}>
                      {modifLoading ? 'Recherche…' : 'Retrouver ma saisie →'}
                    </Btn>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 1 — IDENTIFICATION ═════════════════════════ */}
        {ready && step === 1 && (
          <div className="pn-animate">
            <Stepper step={1} />
            <div style={{ background: C.card, borderRadius: 20, boxShadow: C.cardShadow, border: `1px solid ${C.cardBorder}`, padding: '32px 28px' }}>
              <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 900, color: C.ink }}>Identification</h1>
              <p style={{ margin: '0 0 28px', fontSize: 13, color: C.muted }}>Sélectionnez votre nom dans la liste ou choisissez "Autre".</p>

              <Field label="Intervenant(e)" required error={e1.intervenant}>
                <FSelect
                  value={intervenantId}
                  onChange={e => {
                    const id = e.target.value;
                    setIntervenantId(id);
                    if (id !== '__autre__') {
                      const iv = intervenants.find(x => x.id === id);
                      setIntervenantNom(iv?.nom || '');
                    } else { setIntervenantNom(''); }
                  }}
                  autoFocus
                >
                  <option value="">— Sélectionner —</option>
                  {intervenants.map(iv => <option key={iv.id} value={iv.id}>{iv.nom}</option>)}
                  <option value="__autre__">✏️ Autre (non listé)</option>
                </FSelect>
              </Field>

              {intervenantId === '__autre__' && (
                <Field label="Votre nom complet" required>
                  <FInput
                    type="text"
                    value={intervenantAutre}
                    onChange={e => setIntervenantAutre(e.target.value)}
                    placeholder="Prénom NOM"
                    autoFocus
                  />
                </Field>
              )}

              <Field label="Date de la séance" required error={e1.date}>
                <FInput type="date" value={date} onChange={e => setDate(e.target.value)} />
              </Field>

              <Btn full onClick={() => { const e = validate1(); if (Object.keys(e).length) { setE1(e); return; } setE1({}); goStep(2); }}>
                Continuer → Choisir le groupe
              </Btn>
            </div>
          </div>
        )}

        {/* ═══ STEP 2 — SÉLECTION ══════════════════════════════ */}
        {ready && step === 2 && (
          <div className="pn-animate">
            <Stepper step={2} />

            {/* Recap mini-card */}
            <div style={{ background: `linear-gradient(135deg, ${C.brandLight}, ${C.brandTint})`, border: `1px solid ${C.brand}22`, borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: C.ink, fontSize: 14 }}>{effectiveIntervenantNom || '—'}</p>
                <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{date}</p>
              </div>
              <button onClick={() => goStep(1)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: C.brand, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font, padding: '6px 10px', borderRadius: 8 }}>Modifier</button>
            </div>

            <div style={{ background: C.card, borderRadius: 20, boxShadow: C.cardShadow, border: `1px solid ${C.cardBorder}`, padding: '32px 28px' }}>
              <h2 style={{ margin: '0 0 24px', fontSize: 18, fontWeight: 900, color: C.ink }}>Groupe, module &amp; évaluation</h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Programme / Niveau" required>
                  <FSelect value={programme} onChange={e => setProgramme(e.target.value)}>
                    {PROGRAMMES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </FSelect>
                </Field>
                <Field label="Année académique" required>
                  <FSelect value={anneeSelectee} onChange={e => setAnneeSelectee(e.target.value)}>
                    <option value="2025-2026">2025-2026</option>
                    <option value="2026-2027">2026-2027</option>
                  </FSelect>
                </Field>
              </div>

              <Field label="Groupe" required error={e2.groupe}>
                <FSelect value={groupeId} onChange={e => onGroupeChange(e.target.value)}>
                  <option value="">— Sélectionner un groupe —</option>
                  {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                </FSelect>
              </Field>

              {loadingData && <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: -12, color: C.muted, fontSize: 13 }}><Spinner size={16} /> Chargement…</div>}
              {!loadingData && students.length > 0 && (
                <div style={{ marginBottom: 16, marginTop: -12 }}>
                  <span style={{ background: C.successBg, border: `1px solid ${C.successBorder}`, color: C.success, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>✓ {students.length} apprenant(s)</span>
                </div>
              )}

              <Field label="Module concerné" required error={e2.module}>
                <FSelect
                  value={moduleId}
                  onChange={e => {
                    const id = e.target.value;
                    setModuleId(id);
                    if (id !== '__autre__') setModuleNom(modules.find(m => m.id === id)?.nom || '');
                    else setModuleNom('');
                  }}
                  disabled={!groupeId || loadingData}
                >
                  <option value="">— Sélectionner un module —</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                  <option value="__autre__">✏️ Autre (non listé)</option>
                </FSelect>
              </Field>

              {moduleId === '__autre__' && (
                <Field label="Nom du module (tel qu'affiché sur votre planning)" required>
                  <FInput
                    type="text"
                    value={moduleAutre}
                    onChange={e => setModuleAutre(e.target.value)}
                    placeholder="Ex: Réglementation Douanière"
                    autoFocus
                  />
                </Field>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Type d'évaluation">
                  <FSelect value={evalType} onChange={e => setEvalType(e.target.value)}>
                    {EVAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </FSelect>
                </Field>
                <Field label="Semestre">
                  <FSelect value={semestre} onChange={e => setSemestre(e.target.value)}>
                    <option value="S1">Semestre 1</option>
                    <option value="S2">Semestre 2</option>
                    <option value="Annuel">Annuel</option>
                  </FSelect>
                </Field>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                <span style={{ fontSize: 12, color: C.muted }}>Type sélectionné :</span>
                <Badge type={evalType} />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <Btn variant="ghost" onClick={() => goStep(1)} style={{ flex: 1 }}>← Retour</Btn>
                <Btn style={{ flex: 2 }} onClick={() => {
                  const e = validate2();
                  if (Object.keys(e).length) { setE2(e); return; }
                  if (students.length === 0) { setE2({ groupe: 'Aucun apprenant dans ce groupe.' }); return; }
                  setE2({}); goStep(3);
                }}>
                  Saisir les notes →
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — SAISIE ════════════════════════════════ */}
        {ready && step === 3 && (
          <div className="pn-animate">
            <Stepper step={3} />

            {/* Stats bar */}
            <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.cardBorder}`, boxShadow: '0 2px 16px rgba(0,89,137,0.08)', padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 800, color: C.ink, fontSize: 14 }}>{groupeNom}</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}>{effectiveModuleNom}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <Badge type={evalType} />
                  <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, padding: '3px 10px', background: '#f1f5f9', borderRadius: 20 }}>{semestre}</span>
                  <button onClick={() => goStep(2)} style={{ background: 'transparent', border: 'none', color: C.brand, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font, padding: '4px 8px', borderRadius: 8 }}>Modifier</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.inputBorder}`, flexWrap: 'wrap' }}>
                {[
                  { label: 'Total', value: students.length, color: C.inkMid },
                  { label: 'Notes saisies', value: noteCount, color: C.brand },
                  { label: 'Absents', value: absentCount, color: C.warning },
                  ...(avgNote !== null ? [{ label: 'Moy. provisoire', value: `${avgNote}/20`, color: C.success }] : []),
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: s.color, lineHeight: 1 }}>{s.value}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Table card */}
            <div style={{ background: C.card, borderRadius: 20, boxShadow: C.cardShadow, border: `1px solid ${C.cardBorder}`, overflow: 'hidden' }}>
              {/* Toolbar */}
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.inputBorder}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 13, pointerEvents: 'none' }}>🔍</span>
                  <input type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputBase, paddingLeft: 32, fontSize: 13 }} />
                </div>
                <button className="pn-qbtn" onClick={markAllAbsent} style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.warning, background: '#fffbeb', border: `1px solid #fde68a`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>Tout absent</button>
                <button className="pn-qbtn" onClick={clearAll} style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.muted, background: '#f8fafc', border: `1px solid ${C.inputBorder}`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Réinitialiser</button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.brandTint }}>
                      <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Apprenant</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', width: 130, fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Note / 20</th>
                      <th style={{ padding: '10px 20px', textAlign: 'center', width: 80, fontSize: 11, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Absent(e)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStudents.length === 0 && (
                      <tr><td colSpan={3} style={{ padding: '32px', textAlign: 'center', color: C.muted, fontSize: 14 }}>{search ? 'Aucun résultat.' : 'Aucun apprenant.'}</td></tr>
                    )}
                    {visibleStudents.map((s, i) => {
                      const entry = notes[s.id] || { note: '', absent: false };
                      const nf = parseFloat(entry.note);
                      const isInvalid = entry.note !== '' && !entry.absent && !isNaN(nf) && (nf < 0 || nf > 20);
                      return (
                        <tr key={s.id} className="pn-row" style={{ borderTop: `1px solid ${C.inputBorder}`, background: entry.absent ? '#fffbeb' : i % 2 ? '#fafbfc' : C.card, transition: 'background 0.15s' }}>
                          <td style={{ padding: '10px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: entry.absent ? '#fed7aa' : C.brandLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: entry.absent ? C.warning : C.brand }}>
                                {(s.nom || '?').slice(0, 1)}{(s.prenom || '').slice(0, 1)}
                              </div>
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, color: C.ink, fontSize: 14 }}>{s.nom} {s.prenom}</p>
                                {s.code && <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{s.code}</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '8px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <input type="number" min="0" max="20" step="0.25" value={entry.note} onChange={e => setNote(s.id, 'note', e.target.value)} disabled={entry.absent} className="pn-note-input"
                                style={{ width: 80, textAlign: 'center', fontFamily: font, fontSize: 15, fontWeight: 700, border: `1.5px solid ${isInvalid ? C.error : C.inputBorder}`, borderRadius: 10, padding: '8px 6px', background: entry.absent ? '#fef3c7' : C.card, color: entry.absent ? C.warning : C.ink, opacity: entry.absent ? 0.5 : 1, transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                                placeholder="—"
                              />
                              <NoteStatus note={entry.note} />
                            </div>
                          </td>
                          <td style={{ padding: '8px 20px', textAlign: 'center' }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input type="checkbox" checked={entry.absent} onChange={e => setNote(s.id, 'absent', e.target.checked)} style={{ display: 'none' }} />
                              <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${entry.absent ? C.warning : C.inputBorder}`, background: entry.absent ? '#fef3c7' : C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, transition: 'all 0.15s' }}>
                                {entry.absent ? '⚠' : ''}
                              </span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {students.length > 0 && (
                <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.inputBorder}`, background: C.brandTint, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <p style={{ margin: 0, fontSize: 12, color: C.muted, flex: 1 }}>
                    <strong style={{ color: C.ink }}>{filledCount}</strong> / {students.length} saisie(s)
                    {absentCount > 0 && <> · <strong style={{ color: C.warning }}>{absentCount} absent(s)</strong></>}
                  </p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: C.muted }}>
                    <input type="checkbox" checked={filterAbsent} onChange={e => setFilterAbsent(e.target.checked)} style={{ accentColor: C.warning, width: 14, height: 14 }} />
                    Absents seulement
                  </label>
                </div>
              )}
            </div>

            {saveErr && <div style={{ marginTop: 16, background: C.errorBg, border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', color: C.error, fontSize: 13, fontWeight: 500 }}>⚠ {saveErr}</div>}

            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={() => goStep(2)} style={{ flex: 1 }}>← Retour</Btn>
              <Btn variant={filledCount > 0 ? 'success' : 'primary'} onClick={handleSubmit} loading={saving} style={{ flex: 2 }}>
                {saving ? 'Envoi…' : `Transmettre ${filledCount > 0 ? `${filledCount} note(s)` : 'les notes'} ✓`}
              </Btn>
            </div>
            <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 14 }}>
              Notes vérifiées et validées par l'équipe pédagogique avant intégration.
            </p>
          </div>
        )}

        {/* ═══ STEP 4 — SUCCÈS ══════════════════════════════════ */}
        {ready && step === 4 && (
          <div className="pn-animate">
            <div style={{ background: C.card, borderRadius: 24, boxShadow: '0 16px 64px rgba(0,89,137,0.14)', border: `1px solid ${C.cardBorder}`, padding: '48px 32px', textAlign: 'center' }}>
              <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg, ${C.successBg}, #ecfdf5)`, border: `2px solid ${C.successBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(5,150,105,0.20)' }}>✓</div>
              <h2 style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 900, color: C.ink }}>Notes transmises !</h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: C.muted, lineHeight: 1.8 }}>
                <strong style={{ color: C.ink }}>{effectiveModuleNom}</strong><br />
                Groupe : <strong style={{ color: C.ink }}>{groupeNom}</strong>
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
                {[
                  { label: programmeLabel, icon: '🎓' },
                  { label: semestre, icon: '📅' },
                  { label: typeInfo.label, icon: '📝' },
                  { label: effectiveIntervenantNom, icon: '👤' },
                  { label: date, icon: '🗓' },
                ].filter(p => p.label).map(p => (
                  <span key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 5, background: C.brandLight, borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: C.inkMid }}>{p.icon} {p.label}</span>
                ))}
              </div>
              {/* Code de suivi */}
              {submissionCode && (
                <div style={{ background: `linear-gradient(135deg, ${C.brandLight}, #e0f2fe)`, border: `1.5px solid ${C.brand}30`, borderRadius: 16, padding: '18px 20px', marginBottom: 20 }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>🔖 Votre code de suivi</p>
                  <p style={{ margin: '0 0 10px', fontSize: 24, fontWeight: 900, color: C.brand, letterSpacing: '0.12em', fontFamily: 'monospace' }}>{submissionCode}</p>
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                    Conservez ce code pour modifier votre saisie si nécessaire<br />
                    (tant qu'elle n'a pas été validée par l'équipe pédagogique).
                  </p>
                  <button onClick={() => navigator.clipboard?.writeText(submissionCode)}
                    style={{ fontFamily: font, fontSize: 12, fontWeight: 700, padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${C.brand}40`, background: C.card, color: C.brand, cursor: 'pointer' }}>
                    📋 Copier le code
                  </button>
                </div>
              )}

              <div style={{ background: C.brandTint, borderRadius: 14, padding: '14px 18px', marginBottom: 28, fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
                🔒 En attente de validation par l'équipe pédagogique avant intégration.
              </div>
              <Btn full onClick={resetAll}>Effectuer une nouvelle saisie</Btn>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#b0c4d3', marginTop: 36 }}>
          {INST_NAME} · Institut de Formation en Transport et Logistique · {anneeAcademique}
        </p>
      </div>
    </div>
  );
}
