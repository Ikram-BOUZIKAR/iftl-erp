import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';

const BRAND = { blue: '#005989', yellow: '#f5c845', red: '#c8141b', green: '#c8d45d', orange: '#d75930' };

const ROLES = [
  {
    id: 'intervenant',
    label: 'Intervenant',
    icon: '🧑‍🏫',
    desc: 'Formateur ou enseignant à l\'IFTL',
    color: BRAND.blue,
  },
  {
    id: 'apprenant',
    label: 'Apprenant',
    icon: '🎓',
    desc: 'Étudiant inscrit à l\'IFTL',
    color: BRAND.green,
    colorDark: '#2d6a2d',
  },
  {
    id: 'parent',
    label: 'Parent / Tuteur',
    icon: '👨‍👩‍👧',
    desc: 'Parent ou tuteur d\'un apprenant',
    color: BRAND.orange,
  },
];

function Input({ label, hint, error, icon, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          {...props}
          onFocus={e => { setFocused(true); props.onFocus?.(e); }}
          onBlur={e => { setFocused(false); props.onBlur?.(e); }}
          className={`w-full ${icon ? 'pl-10' : 'pl-3.5'} pr-4 py-3 border rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm transition-all outline-none ${
            error ? 'border-red-400' : focused ? 'border-[#005989]' : 'border-slate-300'
          }`}
          style={focused && !error ? { boxShadow: '0 0 0 3px rgba(0,89,137,0.12)' } : {}}
        />
      </div>
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1=role, 2=form
  const [role, setRole] = useState('');
  const [form, setForm] = useState({
    prenom: '', nom: '', email: '', password: '', confirmPassword: '',
    codeApprenant: '', specialite: '', telephone: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.prenom.trim()) errs.prenom = 'Requis';
    if (!form.nom.trim()) errs.nom = 'Requis';
    if (!form.email.trim()) errs.email = 'Requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email invalide';
    if (!form.password) errs.password = 'Requis';
    else if (form.password.length < 6) errs.password = 'Minimum 6 caractères';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Les mots de passe ne correspondent pas';
    if ((role === 'apprenant' || role === 'parent') && !form.codeApprenant.trim())
      errs.codeApprenant = 'Code apprenant requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      // Verify code apprenant if needed
      if (role === 'apprenant' || role === 'parent') {
        const code = form.codeApprenant.trim().toUpperCase();
        const snap = await getDoc(doc(db, 'students', code));
        if (!snap.exists()) {
          // Also try searching by codeApprenant field
          const q = query(collection(db, 'students'), where('codeApprenant', '==', code));
          const res = await getDocs(q);
          if (res.empty) {
            setErrors(e => ({ ...e, codeApprenant: 'Code apprenant introuvable dans notre base' }));
            setLoading(false);
            return;
          }
        }
      }

      // Create Firebase Auth account
      const { user } = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);

      // Write to Firestore with pending status
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: form.email.trim().toLowerCase(),
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        role,
        statut: 'pending',
        telephone: form.telephone.trim() || null,
        ...(role === 'intervenant' && { specialite: form.specialite.trim() || null }),
        ...((role === 'apprenant' || role === 'parent') && {
          codeApprenant: form.codeApprenant.trim().toUpperCase()
        }),
        createdAt: new Date().toISOString(),
        validatedAt: null,
        validatedBy: null,
      });

      // Sign out immediately — account must be validated first
      await auth.signOut();
      setDone(true);

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setErrors(e => ({ ...e, email: 'Cette adresse email est déjà utilisée' }));
      } else {
        setErrors(e => ({ ...e, general: err.message }));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
               style={{ background: '#f0fdf4' }}>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Demande envoyée !</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Votre compte a été créé avec succès. Un administrateur va examiner votre demande et
            activer votre accès dans les plus brefs délais.
          </p>
          <div className="rounded-xl p-4 mb-6 text-left"
               style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Récapitulatif</p>
            <p className="text-sm text-slate-700"><span className="font-medium">Nom :</span> {form.prenom} {form.nom}</p>
            <p className="text-sm text-slate-700 mt-1"><span className="font-medium">Email :</span> {form.email}</p>
            <p className="text-sm text-slate-700 mt-1"><span className="font-medium">Rôle :</span> {ROLES.find(r => r.id === role)?.label}</p>
          </div>
          <Link to="/login"
                className="w-full flex items-center justify-center py-3 rounded-xl text-white font-semibold text-sm"
                style={{ background: BRAND.blue }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  // ── Step 1 — Role selection ─────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                 style={{ background: BRAND.yellow }}>
              <span className="font-black text-sm" style={{ color: BRAND.blue }}>IF</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Créer un compte</h1>
            <p className="text-slate-500 text-sm mt-1">Qui êtes-vous ?</p>
          </div>

          {/* Role cards */}
          <div className="space-y-3 mb-6">
            {ROLES.map(r => (
              <button
                key={r.id}
                onClick={() => { setRole(r.id); setStep(2); }}
                className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border-2 text-left transition-all hover:border-[#005989] hover:shadow-md group"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                     style={{ background: `${r.color}15` }}>
                  {r.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 group-hover:text-[#005989] transition-colors">
                    {r.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-[#005989] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>

          {/* Admin note */}
          <div className="rounded-xl p-3.5 flex gap-3"
               style={{ background: '#fffbeb', border: `1px solid ${BRAND.yellow}50` }}>
            <span className="text-base shrink-0">ℹ️</span>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tous les comptes sont <strong>validés par un administrateur</strong> avant activation.
              Les comptes administrateur sont créés manuellement.
            </p>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: BRAND.blue }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── Step 2 — Form ───────────────────────────────────────────────────────────
  const selectedRole = ROLES.find(r => r.id === role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                 style={{ background: `${selectedRole.color}15` }}>
              {selectedRole.icon}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Compte {selectedRole.label}</h1>
              <p className="text-sm text-slate-500">Remplissez vos informations</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          {/* Nom & Prénom */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={form.prenom} onChange={e => set('prenom', e.target.value)}
              placeholder="Prénom" error={errors.prenom} />
            <Input label="Nom" value={form.nom} onChange={e => set('nom', e.target.value)}
              placeholder="Nom" error={errors.nom} />
          </div>

          {/* Email */}
          <Input
            label="Adresse email"
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            placeholder={role === 'intervenant' ? 'prenom.nom@iftl.ma' : 'votre@email.com'}
            hint={role === 'intervenant' ? 'De préférence votre adresse @iftl.ma' : undefined}
            error={errors.email}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />

          {/* Téléphone */}
          <Input
            label="Téléphone (optionnel)"
            type="tel"
            value={form.telephone}
            onChange={e => set('telephone', e.target.value)}
            placeholder="+212 6XX XXX XXX"
          />

          {/* Code apprenant pour apprenant/parent */}
          {(role === 'apprenant' || role === 'parent') && (
            <Input
              label={role === 'parent' ? 'Code apprenant de votre enfant' : 'Votre code apprenant'}
              value={form.codeApprenant}
              onChange={e => set('codeApprenant', e.target.value.toUpperCase())}
              placeholder="Ex: TS0123 ou MAR655197"
              hint="Code figurant sur votre carte étudiant ou relevé de notes"
              error={errors.codeApprenant}
              icon={<span className="text-xs font-bold">🎓</span>}
            />
          )}

          {/* Spécialité pour intervenant */}
          {role === 'intervenant' && (
            <Input
              label="Spécialité / Matière enseignée"
              value={form.specialite}
              onChange={e => set('specialite', e.target.value)}
              placeholder="Ex: Logistique, Transport, Anglais…"
            />
          )}

          {/* Mot de passe */}
          <div className="pt-1 border-t border-slate-100">
            <Input
              label="Mot de passe"
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Minimum 6 caractères"
              error={errors.password}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
          </div>
          <Input
            label="Confirmer le mot de passe"
            type="password"
            value={form.confirmPassword}
            onChange={e => set('confirmPassword', e.target.value)}
            placeholder="Répéter le mot de passe"
            error={errors.confirmPassword}
          />

          {/* General error */}
          {errors.general && (
            <div className="flex gap-2 p-3 rounded-xl text-sm"
                 style={{ background: '#fef2f2', border: '1px solid #fecaca', color: BRAND.red }}>
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {errors.general}
            </div>
          )}

          {/* Pending notice */}
          <div className="rounded-xl p-3 flex gap-2.5"
               style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700">
              Votre compte sera <strong>en attente de validation</strong> par un administrateur avant de pouvoir accéder à la plateforme.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: selectedRole.color, boxShadow: `0 4px 14px ${selectedRole.color}40` }}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Création en cours…
              </>
            ) : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold hover:underline" style={{ color: BRAND.blue }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
