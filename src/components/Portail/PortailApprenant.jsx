import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const BLUE = '#005989';
const BG = '#faf9f5';

const TABS = [
  { id: 'profil',        label: 'Mon Profil' },
  { id: 'planning',      label: 'Mon Planning' },
  { id: 'resultats',     label: 'Mes Résultats' },
  { id: 'absences',      label: 'Mes Absences' },
  { id: 'ressources',    label: 'Ressources' },
  { id: 'notifications', label: 'Notifications' },
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
    return new Date(dateStr).toLocaleDateString('fr-MA', {
      weekday: 'short', day: '2-digit', month: 'short',
    });
  } catch {
    return dateStr;
  }
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

// ── Helpers for multi-field Firestore queries ──────────────────────────────────
// Since we don't know which identifier field the collection uses, we try multiple.

async function fetchByMultipleKeys(collName, keys) {
  // keys: array of { field, value }
  const seen = new Set();
  const results = [];
  await Promise.all(
    keys.filter(k => k.value).map(async ({ field, value }) => {
      try {
        const q = query(collection(db, collName), where(field, '==', value));
        const snap = await getDocs(q);
        snap.forEach(d => {
          if (!seen.has(d.id)) {
            seen.add(d.id);
            results.push({ id: d.id, ...d.data() });
          }
        });
      } catch {
        // Silently ignore field/index errors
      }
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
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  const studentCode = userProfile?.studentCode || userProfile?.codeApprenant;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          telephone: form.telephone,
          photo:     form.photo,
          updatedAt: new Date(),
        });
      }
      if (studentCode) {
        const studentRef = student?.id
          ? doc(db, 'students', student.id)
          : doc(db, 'students', studentCode);
        await updateDoc(studentRef, {
          telephone: form.telephone,
          ville:     form.ville,
          adresse:   form.adresse,
          updatedAt: new Date(),
        });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const InfoRow = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:items-center py-3 border-b border-slate-100 last:border-0 gap-0.5">
      <span className="text-xs font-medium text-slate-400 sm:w-40 shrink-0 uppercase tracking-wider">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
    </div>
  );

  const FieldInput = ({ label, value, onChange, type = 'text', placeholder }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none transition-all"
        onFocus={e => { e.target.style.borderColor = BLUE; e.target.style.boxShadow = `0 0 0 3px ${BLUE}18`; }}
        onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
      />
    </div>
  );

  const fullName = `${student?.prenom || userProfile?.prenom || ''} ${student?.nom || userProfile?.nom || ''}`.trim();
  const filiere = [student?.anneeFormation, student?.niveau].filter(Boolean).join(' ');

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
          <InfoRow label="Sexe"           value={student?.sexe} />
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
          <FieldInput label="Téléphone" value={form.telephone} onChange={v => setForm(f => ({ ...f, telephone: v }))}
            type="tel" placeholder="+212 6XX XXX XXX" />
          <FieldInput label="Ville" value={form.ville} onChange={v => setForm(f => ({ ...f, ville: v }))}
            placeholder="Votre ville" />
          <FieldInput label="Adresse" value={form.adresse} onChange={v => setForm(f => ({ ...f, adresse: v }))}
            placeholder="Votre adresse complète" />
          <FieldInput label="Photo (URL)" value={form.photo} onChange={v => setForm(f => ({ ...f, photo: v }))}
            type="url" placeholder="https://..." />

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60"
            style={{ background: BLUE }}
          >
            {saving ? 'Enregistrement…' : saved ? 'Modifications enregistrées' : 'Enregistrer les modifications'}
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
        const q = query(collection(db, 'sessions'), where('groupeId', '==', groupeId));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        const today = new Date().toISOString().split('T')[0];
        const upcoming = list
          .filter(s => (s.date || '') >= today)
          .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
          .slice(0, 60);
        setSessions(upcoming);
      } catch (err) {
        console.error('Planning load error:', err);
      } finally {
        setLoading(false);
      }
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
          <div key={s.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden flex">
            <div className="px-4 py-4 shrink-0 text-center border-r border-slate-100 min-w-[68px]"
                 style={{ background: `${BLUE}07` }}>
              {d ? (
                <>
                  <p className="text-xs font-semibold text-slate-400">
                    {d.toLocaleDateString('fr-MA', { month: 'short' }).toUpperCase()}
                  </p>
                  <p className="text-2xl font-black leading-none mt-0.5" style={{ color: BLUE }}>
                    {d.getDate()}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {d.toLocaleDateString('fr-MA', { weekday: 'short' })}
                  </p>
                </>
              ) : (
                <p className="text-xl font-bold text-slate-300">—</p>
              )}
            </div>
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {s.module || s.moduleId || s.libelle || 'Module'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {s.heureDebut && s.heureFin ? `${s.heureDebut} – ${s.heureFin}` : s.heureDebut || ''}
                    {s.salle ? ` · Salle ${s.salle}` : ''}
                  </p>
                  {s.intervenant && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{s.intervenant}</p>
                  )}
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
  if (isNaN(v)) return '#94a3b8';
  return v >= 10 ? '#16a34a' : '#dc2626';
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
          { field: 'studentId',    value: studentId },
          { field: 'studentCode',  value: studentCode },
          { field: 'codeApprenant',value: studentCode },
        ];
        const [bulls, rawNotes] = await Promise.all([
          fetchByMultipleKeys('bulletins', keys),
          fetchByMultipleKeys('notes',     keys),
        ]);
        setBulletins(bulls);
        setNotes(rawNotes);
      } catch (err) {
        console.error('Resultats load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, studentCode]);

  if (loading) return <Spinner />;
  if (bulletins.length === 0 && notes.length === 0)
    return <EmptyState message="Aucun résultat disponible pour le moment." />;

  return (
    <div className="space-y-5">
      {bulletins.map(bull => {
        const modules = Array.isArray(bull.modules) ? bull.modules : [];
        const moy = bull.moyenneGenerale ?? bull.moyenne;
        const mention = bull.mention || bull.mentionGenerale;
        const decision = bull.decisionLabel || bull.decision;
        const annee = bull.anneeFormation || bull.anneeAcademique || '';
        const filiere = bull.filiere || '';
        return (
          <div key={bull.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Bulletin header */}
            <div className="px-5 py-4 border-b border-slate-100"
                 style={{ background: 'linear-gradient(135deg,#005989,#0077b6)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-bold text-sm">Relevé de notes {annee}</p>
                  {filiere && <p className="text-white/70 text-xs mt-0.5">{filiere}</p>}
                </div>
                <div className="text-right">
                  {moy !== undefined && (
                    <p className="text-2xl font-black text-white">
                      {parseFloat(moy).toFixed(2)}
                      <span className="text-xs font-normal text-white/70 ml-1">/20</span>
                    </p>
                  )}
                  {mention && <p className="text-white/80 text-xs">{mention}</p>}
                </div>
              </div>
              {decision && (
                <div className="mt-3">
                  <DecisionBadge decision={decision} />
                </div>
              )}
            </div>
            {/* Module list */}
            {modules.length > 0 && (
              <div className="divide-y divide-slate-50">
                {modules.map((m, i) => {
                  const nom  = m.nom  || m.module || m.libelle || m.moduleId || `Module ${i+1}`;
                  const note = m.note ?? m.moyenne ?? m.moyenneModule;
                  const coef = m.coefficient ?? m.coef ?? 1;
                  return (
                    <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 font-medium truncate">{nom}</p>
                        {coef > 1 && (
                          <p className="text-xs text-slate-400">Coef. {coef}</p>
                        )}
                      </div>
                      <span className="text-base font-black shrink-0"
                            style={{ color: note !== undefined ? moyColor(note) : '#cbd5e1' }}>
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

      {/* Raw notes fallback (when no bulletin available yet) */}
      {bulletins.length === 0 && notes.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700">Notes en cours de semestre</p>
            <p className="text-xs text-slate-400 mt-0.5">Le bulletin définitif sera disponible en fin de semestre.</p>
          </div>
          <div className="divide-y divide-slate-50">
            {notes.map(n => {
              const label = n.module || n.moduleId || n.evaluationId || n.libelle || 'Évaluation';
              const note  = n.note ?? n.moyenne;
              return (
                <div key={n.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-700 truncate flex-1">{label}</p>
                  <span className="text-base font-black shrink-0"
                        style={{ color: note !== undefined ? moyColor(note) : '#cbd5e1' }}>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const keys = [
          { field: 'studentId',    value: studentId },
          { field: 'studentCode',  value: studentCode },
          { field: 'codeApprenant',value: studentCode },
        ];
        const all = await fetchByMultipleKeys('presences', keys);
        // Keep only absence records
        const absent = all.filter(p =>
          p.present === false || p.statut === 'absent' || p.absent === true
        );
        setAbsences(absent);
      } catch (err) {
        console.error('Absences load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, studentCode]);

  if (loading) return <Spinner />;

  // Group by module
  const byModule = {};
  absences.forEach(p => {
    const mod = p.module || p.moduleId || p.libelle || 'Module inconnu';
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
      {/* Summary badge */}
      <div className="rounded-2xl p-5 border" style={{ background: globalAlert.bg, borderColor: globalAlert.border }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: globalAlert.text }}>
              Total absences
            </p>
            <p className="text-4xl font-black mt-1 leading-none" style={{ color: globalAlert.text }}>
              {total}
            </p>
            <p className="text-xs mt-1" style={{ color: globalAlert.text }}>
              séance{total !== 1 ? 's' : ''} d'absence enregistrée{total !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                 style={{ background: 'white', borderColor: globalAlert.border }}>
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: globalAlert.text }} />
              <span className="text-xs font-semibold" style={{ color: globalAlert.text }}>
                {globalAlert.label}
              </span>
            </div>
            <p className="text-xs mt-2 text-slate-400">Seuil rouge : 5 abs.</p>
            <p className="text-xs text-slate-400">Seuil orange : 3 abs.</p>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState message="Aucune absence enregistrée. Continuez ainsi !" />
      ) : (
        Object.entries(byModule).map(([mod, list]) => {
          const alert = alertColors(list.length);
          return (
            <div key={mod} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
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
                    {a.heureDebut && a.heureFin && (
                      <span className="text-slate-400">{a.heureDebut} – {a.heureFin}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Ressources numériques ──────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'scholarvox',
    name: 'ScholarVox',
    tagline: 'Bibliothèque numérique',
    description: 'Accès illimité à des milliers d\'ouvrages académiques, manuels et ressources pédagogiques en ligne.',
    url: 'https://international.scholarvox.com/',
    bgGradient: 'linear-gradient(135deg, #e65c00 0%, #f9a825 100%)',
    iconBg: 'rgba(255,255,255,0.15)',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect x="6" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.9"/>
        <rect x="10" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.6"/>
        <rect x="14" y="8" width="28" height="36" rx="3" fill="white" fillOpacity="0.3"/>
        <path d="M10 16h16M10 22h14M10 28h12" stroke="#e65c00" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    badge: 'Catalogue',
    badgeColor: '#fff7ed',
    badgeText: '#ea580c',
  },
  {
    id: 'altissia',
    name: 'ALTISSIA',
    tagline: 'Language empowers people',
    description: 'Apprenez et perfectionnez vos langues étrangères avec la plateforme e-learning interactive ALTISSIA.',
    url: 'https://learn.altissia.org/platform/login?interfaceLg=fr_FR',
    bgGradient: 'linear-gradient(135deg, #162a4a 0%, #1e3a6e 100%)',
    iconBg: 'rgba(157,196,31,0.2)',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        {/* ALTISSIA geometric A logo */}
        <rect x="10" y="8" width="28" height="28" rx="5" fill="#9dc41f" opacity="0.9"/>
        <path d="M24 12 L32 32 M24 12 L16 32 M19 24 L29 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    badge: 'Langues',
    badgeColor: 'rgba(157,196,31,0.2)',
    badgeText: '#9dc41f',
  },
];

function RessourcesTab() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 font-medium px-1 pb-1">
        Plateformes numériques accessibles avec votre compte IFTL
      </p>
      {PLATFORMS.map(p => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          style={{ background: p.bgGradient }}
        >
          <div className="p-5 flex gap-4 items-start">
            <div className="shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
                 style={{ background: p.iconBg }}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-white font-black text-lg leading-tight">{p.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: p.badgeColor, color: p.badgeText }}>
                  {p.badge}
                </span>
              </div>
              <p className="text-white/70 text-xs font-medium mb-2">{p.tagline}</p>
              <p className="text-white/80 text-sm leading-relaxed">{p.description}</p>
            </div>
          </div>
          <div className="px-5 pb-4">
            <span className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Accéder à la plateforme
            </span>
          </div>
        </a>
      ))}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-2">
        <p className="text-xs text-blue-700 font-medium">
          💡 Pour accéder à ces plateformes, utilisez vos identifiants IFTL communiqués par l'administration.
          En cas de problème, contactez <a href="mailto:scolarite@iftl.ma" className="underline">scolarite@iftl.ma</a>.
        </p>
      </div>
    </div>
  );
}

// ── Notifications (examens à venir) ────────────────────────────────────────────

function NotificationsTab({ groupeId }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupeId) { setLoading(false); return; }
    (async () => {
      try {
        const q = query(collection(db, 'sessions'), where('groupeId', '==', groupeId));
        const snap = await getDocs(q);
        const today = new Date().toISOString().split('T')[0];
        const list = [];
        snap.forEach(d => {
          const data = { id: d.id, ...d.data() };
          if ((data.date || '') < today) return;
          const t = (data.type || '').toUpperCase();
          if (t.includes('EFM') || t.includes('EFF') || t.includes('CC')) {
            list.push(data);
          }
        });
        list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        setExams(list);
      } catch (err) {
        console.error('Notifications load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupeId]);

  if (loading) return <Spinner />;
  if (!groupeId) return <EmptyState message="Groupe non défini. Contactez l'administration." />;
  if (exams.length === 0) return <EmptyState message="Aucun examen à venir pour le moment." />;

  const daysUntilLabel = (dateStr) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    if (diff <= 7) return `Dans ${diff} jours`;
    return null;
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400 font-medium px-1">
        {exams.length} examen{exams.length > 1 ? 's' : ''} à venir
      </p>
      {exams.map(exam => {
        const colors = getTypeColors(exam.type);
        const d = exam.date ? new Date(exam.date) : null;
        const urgency = daysUntilLabel(exam.date);
        return (
          <div key={exam.id} className="bg-white rounded-2xl border overflow-hidden flex"
               style={{ borderColor: colors.border }}>
            <div className="px-4 py-4 shrink-0 text-center min-w-[64px]"
                 style={{ background: colors.bg }}>
              {d ? (
                <>
                  <p className="text-xl font-black leading-none" style={{ color: colors.text }}>
                    {d.getDate()}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: colors.text }}>
                    {d.toLocaleDateString('fr-MA', { month: 'short' })}
                  </p>
                </>
              ) : (
                <p className="text-xl font-bold" style={{ color: colors.text }}>?</p>
              )}
            </div>
            <div className="flex-1 p-4 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {exam.module || exam.moduleId || exam.libelle || 'Module'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {exam.heureDebut && exam.heureFin
                      ? `${exam.heureDebut} – ${exam.heureFin}`
                      : ''}
                    {exam.salle ? ` · Salle ${exam.salle}` : ''}
                  </p>
                  {urgency && (
                    <p className="text-xs font-bold mt-1.5" style={{ color: colors.text }}>
                      {urgency}
                    </p>
                  )}
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
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PortailApprenant({ auth }) {
  const { user, userProfile, logout } = auth;
  const [activeTab, setActiveTab] = useState('profil');
  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);

  const studentCode = userProfile?.studentCode || userProfile?.codeApprenant;

  useEffect(() => {
    if (!studentCode) { setLoadingStudent(false); return; }
    (async () => {
      try {
        // Try document ID lookup first (most efficient)
        const directRef = doc(db, 'students', studentCode);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          setStudent({ id: directSnap.id, ...directSnap.data() });
          return;
        }
        // Fall back to field query
        const q = query(collection(db, 'students'), where('code', '==', studentCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const d = snap.docs[0];
          setStudent({ id: d.id, ...d.data() });
        }
      } catch (err) {
        console.error('Student load error:', err);
      } finally {
        setLoadingStudent(false);
      }
    })();
  }, [studentCode]);

  const prenom = userProfile?.prenom || student?.prenom || '';
  const nom    = userProfile?.nom    || student?.nom    || '';
  const displayName = `${prenom} ${nom}`.trim() || 'Apprenant';
  const initials = ((prenom[0] || '?') + (nom[0] || '?')).toUpperCase();
  const photo = student?.photo || userProfile?.photo;

  const groupeId   = student?.groupeId;
  const studentId  = student?.id || studentCode;

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold overflow-hidden"
                 style={{ background: BLUE }}>
              {photo
                ? <img src={photo} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{displayName}</p>
              <p className="text-xs text-slate-400 truncate">{studentCode || userProfile?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="shrink-0 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </header>

      {/* Accent strip */}
      <div className="h-0.5" style={{ background: `linear-gradient(to right, ${BLUE}, #0388c8)` }} />

      <main className="max-w-2xl mx-auto px-4 py-5">
        {loadingStudent ? (
          <Spinner />
        ) : (
          <>
            {/* Welcome banner */}
            <div className="rounded-2xl p-5 mb-5 text-white overflow-hidden relative"
                 style={{ background: `linear-gradient(135deg, ${BLUE} 0%, #0077bb 100%)` }}>
              <div className="relative z-10">
                <p className="text-sm font-medium opacity-75">Bienvenue,</p>
                <p className="text-2xl font-black mt-0.5 leading-tight">{displayName}</p>
                {student && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {student.anneeFormation && (
                      <span className="text-xs bg-white/20 rounded-full px-3 py-1 font-medium">
                        {student.anneeFormation}
                      </span>
                    )}
                    {student.niveau && (
                      <span className="text-xs bg-white/20 rounded-full px-3 py-1 font-medium">
                        {student.niveau}
                      </span>
                    )}
                    {student.groupeId && (
                      <span className="text-xs bg-white/20 rounded-full px-3 py-1 font-medium">
                        Groupe {student.groupeId}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {/* Decorative circle */}
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 bg-white" />
              <div className="absolute -right-4 bottom-0 w-20 h-20 rounded-full opacity-10 bg-white" />
            </div>

            {/* Tab bar */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5"
                 style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {TABS.map(tab => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0"
                    style={active
                      ? { background: BLUE, color: 'white', boxShadow: `0 4px 12px ${BLUE}40` }
                      : { background: 'white', color: '#64748b', border: '1px solid #e2e8f0' }
                    }
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab panels */}
            {activeTab === 'profil' && (
              <ProfilTab
                student={student}
                userProfile={userProfile}
                userId={user?.uid}
              />
            )}
            {activeTab === 'planning' && (
              <PlanningTab groupeId={groupeId} />
            )}
            {activeTab === 'resultats' && (
              <ResultatsTab studentId={studentId} studentCode={studentCode} />
            )}
            {activeTab === 'absences' && (
              <AbsencesTab studentId={studentId} studentCode={studentCode} />
            )}
            {activeTab === 'ressources' && (
              <RessourcesTab />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab groupeId={groupeId} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
