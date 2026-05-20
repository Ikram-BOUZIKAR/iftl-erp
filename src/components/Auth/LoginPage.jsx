import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

// ── SVG icon helper ────────────────────────────────────────────────────────────
function Ico({ path, path2, size = 'w-4 h-4', color }) {
  return (
    <svg
      className={size}
      fill="none"
      stroke={color || 'currentColor'}
      viewBox="0 0 24 24"
      style={color ? { color } : undefined}
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
      {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path2} />}
    </svg>
  );
}

// ── Données ────────────────────────────────────────────────────────────────────
const FEATURES = [
  { path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Emplois du temps & planification' },
  { path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', label: 'Émargement & suivi des présences' },
  { path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', label: 'Gestion des apprenants & groupes' },
  { path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', label: 'Notes, évaluations & bulletins' },
  { path: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Facturation & suivi des paiements' },
  { path: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', label: 'Candidatures & inscriptions en ligne' },
];

const FILIERES = [
  { code: 'OTM',  label: 'Organisateur Transport & Messagerie' },
  { code: 'OFLP', label: 'Opérateur Freight Logistique & Portuaire' },
  { code: 'AEL',  label: 'Agent Exploitation Logistique' },
  { code: 'ECOM', label: 'E-Commerce & Distribution Digitale' },
  { code: 'ADEE', label: 'Agent Déclarant en Douane & Échanges Ext.' },
  { code: 'LIC',  label: 'Licence Gestion Logistique & Transport' },
];


// ── Composants utilitaires ────────────────────────────────────────────────────
function Spinner() {
  return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />;
}

function Alert({ type, children }) {
  const cfg = {
    error:   { bg: '#fef2f2', border: '#fecaca', text: '#c8141b', iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    warning: { bg: '#fffbeb', border: '#fde68a', text: '#92400e', iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  }[type];
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
      <Ico path={cfg.iconPath} size="w-4 h-4 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function FieldLabel({ text, required }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
      {text}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

const INPUT_CLS = 'w-full border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] transition';

// ── LoginPage ─────────────────────────────────────────────────────────────────
export default function LoginPage({ auth }) {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [rememberMe, setRememberMe]   = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [resetMode, setResetMode]     = useState(false);
  const [resetEmail, setResetEmail]   = useState('');
  const [resetSent, setResetSent]     = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/');
    } catch {
      setError('Identifiants incorrects. Vérifiez votre email et votre mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(getAuth(), resetEmail);
      setResetSent(true);
    } catch {
      setError('Adresse email introuvable ou invalide.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ══ Panneau gauche — identité IFTL ══════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(150deg, #005989 0%, #003f6b 50%, #00294a 100%)' }}
      >
        {/* Grille décorative */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.8) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
        {/* Cercles */}
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full opacity-[0.06]" style={{ background: '#f5c845' }} />
        <div className="absolute top-1/2 -right-48 w-96 h-96 rounded-full opacity-[0.04]" style={{ background: '#c8d45d' }} />
        <div className="absolute -bottom-32 left-1/4 w-80 h-80 rounded-full opacity-[0.06]" style={{ background: '#f5c845' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
            style={{ background: '#f5c845' }}>
            <span className="font-black text-[14px]" style={{ color: '#005989' }}>IF</span>
          </div>
          <div>
            <p className="text-white font-black text-xl leading-none tracking-wider">IFTL</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'rgba(245,200,69,0.8)' }}>
              Institut de Formation · Transport & Logistique
            </p>
          </div>
        </div>

        {/* Contenu central */}
        <div className="relative space-y-8">
          {/* Badge + titre */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
              style={{ background: 'rgba(245,200,69,0.15)', color: '#f5c845', border: '1px solid rgba(245,200,69,0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Plateforme ERP pédagogique · 2025–2026
            </div>
            <h2 className="text-[2.4rem] font-extrabold text-white leading-[1.15] tracking-tight">
              Pilotez votre<br />
              établissement<br />
              <span style={{ color: '#f5c845' }}>avec précision</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Une solution intégrée pour gérer chaque dimension pédagogique, administrative et financière.
            </p>
          </div>

          {/* Fonctionnalités */}
          <div className="space-y-2.5">
            {FEATURES.map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(245,200,69,0.12)' }}>
                  <Ico path={f.path} size="w-3.5 h-3.5" color="#f5c845" />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Filières */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2.5"
              style={{ color: 'rgba(255,255,255,0.3)' }}>Filières professionnelles</p>
            <div className="flex flex-wrap gap-1.5">
              {FILIERES.map(f => (
                <span key={f.code} title={f.label}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg cursor-default"
                  style={{ background: 'rgba(0,89,137,0.5)', color: 'rgba(245,200,69,0.9)', border: '1px solid rgba(245,200,69,0.2)' }}>
                  {f.code}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CNDP */}
        <div className="relative">
          <div className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(200,212,93,0.15)' }}>
              <Ico path="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" size="w-4 h-4" color="#c8d45d" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Protection des données personnelles</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.42)' }}>
                Traitement conforme à la loi n° 09-08 relative à la protection des personnes physiques.
              </p>
              <p className="text-xs font-semibold mt-1.5" style={{ color: '#c8d45d' }}>
                Autorisation CNDP n° A-PO-268/2024
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ Panneau droit — formulaire ═══════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto px-6 py-10 bg-slate-50 min-h-screen">

        {/* Logo mobile */}
        <div className="lg:hidden flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg"
            style={{ background: '#005989' }}>
            <span className="font-black text-base" style={{ color: '#f5c845' }}>IF</span>
          </div>
          <p className="font-black text-xl text-slate-800">IFTL</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xs leading-relaxed">
            Institut de Formation dans les métiers du Transport et de la Logistique
          </p>
        </div>

        <div className="w-full max-w-[400px] my-auto">

          {/* ── Mode reset mot de passe ──────────────────────────────────── */}
          {resetMode ? (
            <div>
              <button onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition mb-6">
                <Ico path="M10 19l-7-7m0 0l7-7m-7 7h18" size="w-4 h-4" />
                Retour à la connexion
              </button>

              {resetSent ? (
                <div className="rounded-2xl p-8 text-center"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: '#dcfce7' }}>
                    <Ico path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size="w-7 h-7" color="#16a34a" />
                  </div>
                  <p className="font-bold text-green-800 text-lg mb-1">Email envoyé !</p>
                  <p className="text-sm text-green-700 leading-relaxed">
                    Un lien de réinitialisation a été envoyé à <strong>{resetEmail}</strong>.
                    Vérifiez votre boîte mail.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800">Mot de passe oublié</h1>
                    <p className="text-slate-500 mt-1 text-sm">Entrez votre email pour recevoir un lien de réinitialisation.</p>
                  </div>
                  <form onSubmit={handleReset} className="space-y-4">
                    <div>
                      <FieldLabel text="Adresse email" required />
                      <div className="relative">
                        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                          <Ico path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size="w-4 h-4" />
                        </div>
                        <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                          placeholder="vous@iftl.ma" className={`${INPUT_CLS} pl-10 pr-4 py-3`} />
                      </div>
                    </div>
                    {error && <Alert type="error">{error}</Alert>}
                    <button type="submit" disabled={resetLoading}
                      className="w-full py-3 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition"
                      style={{ background: '#005989', boxShadow: '0 4px 14px rgba(0,89,137,0.3)' }}>
                      {resetLoading ? <><Spinner /> Envoi…</> : 'Envoyer le lien de réinitialisation'}
                    </button>
                  </form>
                </>
              )}
            </div>

          ) : (
            <>
              <div className="mb-7">
                <h1 className="text-2xl font-bold text-slate-800">Connexion</h1>
                <p className="text-slate-500 mt-1 text-sm">Accédez à votre espace pédagogique unifié</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <FieldLabel text="Adresse email" required />
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                      <Ico path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size="w-4 h-4" />
                    </div>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="vous@iftl.ma" required autoComplete="email"
                      className={`${INPUT_CLS} pl-10 pr-4 py-3`} />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <FieldLabel text="Mot de passe" required />
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                      <Ico path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size="w-4 h-4" />
                    </div>
                    <input type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required autoComplete="current-password"
                      className={`${INPUT_CLS} pl-10 pr-11 py-3`} />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition">
                      {showPwd
                        ? <Ico path="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" size="w-4 h-4" />
                        : <Ico path="M15 12a3 3 0 11-6 0 3 3 0 016 0z" path2="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" size="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 accent-[#005989] cursor-pointer" />
                    <span className="text-sm text-slate-600">Se souvenir de moi</span>
                  </label>
                  <button type="button"
                    onClick={() => { setResetMode(true); setResetEmail(email); setError(''); }}
                    className="text-sm font-semibold text-[#005989] hover:text-[#004070] transition">
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Compte en attente */}
                {auth.pendingAccount && (
                  <Alert type="warning">
                    <strong>Compte en attente de validation.</strong> Un administrateur doit approuver votre accès.
                  </Alert>
                )}

                {/* Erreur */}
                {error && <Alert type="error">{error}</Alert>}

                {/* Submit */}
                <button type="submit" disabled={loading}
                  className="w-full py-3 px-4 text-white font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                  style={{ background: '#005989', boxShadow: '0 4px 14px rgba(0,89,137,0.3)' }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.background = '#004070')}
                  onMouseLeave={e => !loading && (e.currentTarget.style.background = '#005989')}
                >
                  {loading ? (
                    <><Spinner /> Connexion en cours…</>
                  ) : (
                    <>
                      Se connecter
                      <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Séparateur */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">ou</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Actions secondaires */}
              <div className="space-y-2.5">
                <Link to="/register"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-sm transition-all border-2"
                  style={{ borderColor: '#005989', color: '#005989' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#005989'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#005989'; }}
                >
                  <Ico path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" size="w-4 h-4 shrink-0" />
                  Créer un compte
                </Link>
                <div className="grid grid-cols-2 gap-2.5">
                  <Link to="/resultats"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-sm border bg-white hover:bg-slate-50 transition"
                    style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
                    <Ico path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size="w-3.5 h-3.5 shrink-0" />
                    Mes résultats
                  </Link>
                  <Link to="/candidature"
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-medium text-sm border bg-white hover:bg-slate-50 transition"
                    style={{ borderColor: '#e2e8f0', color: '#64748b' }}>
                    <Ico path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" size="w-3.5 h-3.5 shrink-0" />
                    Candidater
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* CNDP mobile */}
          <div className="mt-8 lg:hidden pt-5 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              Données protégées · Loi n° 09-08 · Autorisation CNDP n° A-PO-268/2024
            </p>
          </div>
        </div>

        {/* CNDP desktop */}
        <div className="hidden lg:block mt-8 text-center">
          <p className="text-xs text-slate-400">
            Loi n° 09-08 · Protection des données · CNDP n° A-PO-268/2024
          </p>
        </div>
      </div>
    </div>
  );
}
