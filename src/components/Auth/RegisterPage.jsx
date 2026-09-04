import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../services/firebase';
import { sendEmail } from '../../services/emailService';

const BRAND = { blue: '#005989', yellow: '#f5c845', red: '#c8141b', green: '#c8d45d', orange: '#d75930' };

const ROLES = [
  {
    id: 'intervenant',
    label: 'Intervenant',
    icon: '🧑‍🏫',
    desc: 'Formateur ou enseignant',
    color: BRAND.blue,
  },
  {
    id: 'apprenant',
    label: 'Apprenant',
    icon: '🎓',
    desc: 'Étudiant inscrit',
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
    let firebaseUser = null;

    try {
      // 1. Create Firebase Auth account first (so the user is authenticated for Firestore reads)
      const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
      firebaseUser = credential.user;

      // 2. Verify code apprenant (now authenticated — Firestore rules allow read)
      if (role === 'apprenant' || role === 'parent') {
        const code = form.codeApprenant.trim().toUpperCase();

        // Check if code already has a registered account (duplicate detection)
        const dupSnap = await getDocs(query(collection(db, 'users'), where('studentCode', '==', code)));
        if (!dupSnap.empty) {
          await firebaseUser.delete();
          setErrors(e => ({
            ...e,
            codeApprenant: 'Un compte avec ce code existe déjà. Contactez l\'administration (scolarite@iftl.ma) pour récupérer vos accès.',
          }));
          setLoading(false);
          return;
        }

        // Verify the code exists in students collection
        const snap = await getDoc(doc(db, 'students', code));
        if (!snap.exists()) {
          const q = query(collection(db, 'students'), where('code', '==', code));
          const res = await getDocs(q);
          if (res.empty) {
            await firebaseUser.delete();
            setErrors(e => ({ ...e, codeApprenant: 'Code apprenant introuvable. Vérifiez votre code ou contactez l\'administration.' }));
            setLoading(false);
            return;
          }
        }
      }

      // 3. Write Firestore user document (authenticated, write succeeds)
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        email: form.email.trim().toLowerCase(),
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        role,
        statut: 'pending',
        telephone: form.telephone.trim() || null,
        ...(role === 'intervenant' && { specialite: form.specialite.trim() || null }),
        ...((role === 'apprenant' || role === 'parent') && {
          studentCode:   form.codeApprenant.trim().toUpperCase(),
          codeApprenant: form.codeApprenant.trim().toUpperCase(),
        }),
        createdAt: new Date().toISOString(),
        validatedAt: null,
        validatedBy: null,
      });

      // 4. Notify scolarite (non-blocking — ignore failures if Brevo not configured)
      try {
        const roleLabel = ROLES.find(r => r.id === role)?.label || role;
        await sendEmail(db, {
          to: 'scolarite@iftl.ma',
          toName: 'Scolarité IFTL',
          subject: `Nouvelle demande de compte — ${form.prenom} ${form.nom} (${roleLabel})`,
          htmlContent: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0"><div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg,#002d47,#005989);padding:24px 32px"><h1 style="color:#f5c845;margin:0;font-size:22px;font-weight:900;letter-spacing:2px">IFTL</h1><p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px">Institut de Formation en Transport &amp; Logistique</p></div><div style="padding:28px 32px"><h2 style="color:#001829;margin:0 0 16px;font-size:18px">Nouvelle demande de compte</h2><p style="color:#334155;line-height:1.6">Un nouveau compte est en attente de validation dans l'interface d'administration (Paramètres → Utilisateurs → En attente).</p><table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden"><tr style="background:#f8fafc"><td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;width:130px;border-bottom:1px solid #e2e8f0">Nom</td><td style="padding:10px 14px;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0">${form.prenom} ${form.nom}</td></tr><tr><td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Email</td><td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0">${form.email}</td></tr><tr style="background:#f8fafc"><td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Rôle demandé</td><td style="padding:10px 14px;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0">${roleLabel}</td></tr>${form.telephone ? `<tr><td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600">Téléphone</td><td style="padding:10px 14px;font-size:13px">${form.telephone}</td></tr>` : ''}${form.codeApprenant ? `<tr style="background:#f8fafc"><td style="padding:10px 14px;font-size:13px;color:#64748b;font-weight:600">Code apprenant</td><td style="padding:10px 14px;font-size:13px;font-weight:700">${form.codeApprenant}</td></tr>` : ''}</table><p style="color:#64748b;font-size:13px;line-height:1.6">Connectez-vous à l'interface d'administration pour valider ou refuser ce compte.</p></div><div style="background:#001829;padding:14px 24px;text-align:center;color:rgba(255,255,255,0.4);font-size:11px">IFTL — Loi n°09-08 — CNDP A-PO-268/2024</div></div></body></html>`,
          logToFirestore: false,
        });
      } catch { /* non-blocking */ }

      // 5. Sign out immediately — account must be validated by admin first
      await auth.signOut();
      setDone(true);

    } catch (err) {
      // Clean up auth user if Firestore write failed
      if (firebaseUser && err.code !== 'auth/email-already-in-use') {
        try { await firebaseUser.delete(); } catch {}
      }
      if (err.code === 'auth/email-already-in-use') {
        setErrors(e => ({ ...e, email: 'Cette adresse email est déjà utilisée. Contactez l\'administration pour récupérer vos accès.' }));
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
            Votre demande est en cours de validation par l'administration. Vous recevrez un accès sous peu.
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
            <div className="mx-auto mb-4">
              <img src="/Logo IFTL avec Signature.png" alt="IFTL" style={{ width: 140, height: 'auto', display: 'block' }} />
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
            hint={role === 'intervenant' ? 'Adresse professionnelle de préférence' : undefined}
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
