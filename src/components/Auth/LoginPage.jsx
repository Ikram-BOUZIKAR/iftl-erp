import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

// ── SVG icon helper ────────────────────────────────────────────────────────────
function Ico({ path, path2, size = 'w-5 h-5', color }) {
  return (
    <svg className={size} fill="none" stroke={color || 'currentColor'} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path} />
      {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={path2} />}
    </svg>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />;
}

const INPUT_CLS = 'w-full border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] transition';

// ── Page principale ────────────────────────────────────────────────────────────
export default function LoginPage({ auth }) {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
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
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.');
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
      setError('Adresse email introuvable.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ══ PANNEAU 1 — Consulter mes résultats ═══════════════════════════════ */}
      <Link
        to="/resultats"
        className="group relative flex flex-col justify-between overflow-hidden
                   lg:w-[27%] min-h-[200px] lg:min-h-screen p-8 lg:p-10
                   transition-all duration-300 hover:lg:w-[30%]"
        style={{ background: 'linear-gradient(160deg, #002d47 0%, #005989 60%, #0077b6 100%)' }}
      >
        {/* Décors */}
        <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-[0.07]"
          style={{ background: '#f5c845' }} />
        <div className="absolute top-1/3 -left-10 w-40 h-40 rounded-full opacity-[0.05]"
          style={{ background: '#fff' }} />

        {/* Contenu */}
        <div className="relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Portail élève
          </div>

          {/* Icône */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(255,255,255,0.12)' }}>
            <Ico path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size="w-7 h-7" color="white" />
          </div>

          <h2 className="text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-3">
            Consulter<br />mes résultats
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Accédez à vos notes, bulletins scolaires et attestations de formation.
          </p>
        </div>

        {/* CTA */}
        <div className="relative mt-8">
          <div className="flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-3 transition-all">
            Accéder à mes résultats
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/15 group-hover:bg-white/25 transition">
              <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" color="white" />
            </div>
          </div>
        </div>
      </Link>

      {/* ══ PANNEAU 2 — Candidater ════════════════════════════════════════════ */}
      <Link
        to="/candidature"
        className="group relative flex flex-col justify-between overflow-hidden
                   lg:w-[27%] min-h-[200px] lg:min-h-screen p-8 lg:p-10
                   transition-all duration-300 hover:lg:w-[30%]"
        style={{ background: 'linear-gradient(160deg, #b38600 0%, #d4a017 40%, #f5c845 100%)' }}
      >
        {/* Décors */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.15]"
          style={{ background: '#fff' }} />
        <div className="absolute bottom-1/4 -left-8 w-32 h-32 rounded-full opacity-[0.1]"
          style={{ background: '#003d63' }} />

        {/* Contenu */}
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(0,61,99,0.15)', color: '#003d63' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#003d63' }} />
            Admissions ouvertes
          </div>

          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(0,0,0,0.1)' }}>
            <Ico path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" size="w-7 h-7" color="#003d63" />
          </div>

          <h2 className="text-2xl lg:text-3xl font-extrabold leading-tight mb-3"
            style={{ color: '#002d47' }}>
            Candidater<br />à une formation
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(0,45,71,0.65)' }}>
            Rejoignez l'IFTL — 6 filières professionnelles en Transport & Logistique.
          </p>

          {/* Filières */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {['OTM','OFLP','AEL','ECOM','ADEE','LIC'].map(f => (
              <span key={f}
                className="text-[11px] font-black px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(0,45,71,0.12)', color: '#002d47' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="relative mt-8">
          <div className="flex items-center gap-2 font-semibold text-sm group-hover:gap-3 transition-all"
            style={{ color: '#002d47' }}>
            Déposer ma candidature
            <div className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ background: 'rgba(0,45,71,0.12)' }}>
              <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" color="#002d47" />
            </div>
          </div>
        </div>
      </Link>

      {/* ══ PANNEAU 3 — Connexion ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 lg:p-12 min-h-screen">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #005989, #0077b6)' }}>
            <span className="font-black text-sm text-white tracking-tight">IF</span>
          </div>
          <div>
            <p className="font-black text-slate-800 text-lg leading-none">IFTL</p>
            <p className="text-xs text-slate-400 mt-0.5">Institut de Formation · Transport & Logistique</p>
          </div>
        </div>

        <div className="w-full max-w-[360px]">

          {/* ── Mode reset ──────────────────────────────────────────────── */}
          {resetMode ? (
            <>
              <button onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition mb-6">
                <Ico path="M10 19l-7-7m0 0l7-7m-7 7h18" size="w-4 h-4" />
                Retour
              </button>

              {resetSent ? (
                <div className="text-center py-6 px-4 rounded-2xl"
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Ico path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size="w-6 h-6" color="#16a34a" />
                  </div>
                  <p className="font-bold text-green-800">Email envoyé !</p>
                  <p className="text-sm text-green-700 mt-1">Vérifiez votre boîte mail — <strong>{resetEmail}</strong></p>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-slate-800 mb-1">Réinitialiser le mot de passe</h1>
                  <p className="text-slate-500 text-sm mb-5">Entrez votre email pour recevoir un lien.</p>
                  <form onSubmit={handleReset} className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                        <Ico path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size="w-4 h-4" />
                      </div>
                      <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                        placeholder="vous@iftl.ma" className={`${INPUT_CLS} pl-10 pr-4 py-3`} />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <button type="submit" disabled={resetLoading}
                      className="w-full py-3 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: '#005989' }}>
                      {resetLoading ? <><Spinner /> Envoi…</> : 'Envoyer le lien'}
                    </button>
                  </form>
                </>
              )}
            </>
          ) : (
            <>
              {/* ── Formulaire connexion ──────────────────────────────── */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Connexion</h1>
                <p className="text-slate-400 text-sm mt-1">Accédez à votre espace pédagogique</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Adresse email
                  </label>
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
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                    Mot de passe
                  </label>
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

                {/* Mot de passe oublié */}
                <div className="flex justify-end">
                  <button type="button"
                    onClick={() => { setResetMode(true); setResetEmail(email); setError(''); }}
                    className="text-xs font-semibold text-[#005989] hover:text-[#004070] transition">
                    Mot de passe oublié ?
                  </button>
                </div>

                {/* Compte en attente */}
                {auth.pendingAccount && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}>
                    <Ico path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size="w-4 h-4 shrink-0 mt-0.5" />
                    <span><strong>Compte en attente.</strong> Un administrateur doit valider votre accès.</span>
                  </div>
                )}

                {/* Erreur */}
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl text-xs"
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#c8141b' }}>
                    <Ico path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Bouton connexion */}
                <button type="submit" disabled={loading}
                  className="w-full py-3 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition"
                  style={{ background: 'linear-gradient(135deg, #005989, #0077b6)', boxShadow: '0 4px 14px rgba(0,89,137,0.3)' }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={e => !loading && (e.currentTarget.style.opacity = '1')}
                >
                  {loading
                    ? <><Spinner /> Connexion…</>
                    : <>Se connecter <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" /></>
                  }
                </button>
              </form>

              {/* Séparateur */}
              <div className="my-5 flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">ou</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Créer un compte */}
              <Link to="/register"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm transition border-2"
                style={{ borderColor: '#005989', color: '#005989' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#005989'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#005989'; }}
              >
                <Ico path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" size="w-4 h-4 shrink-0" />
                Créer un compte
              </Link>
            </>
          )}

          {/* CNDP */}
          <p className="text-center text-[11px] text-slate-400 mt-8 leading-relaxed">
            Loi n° 09-08 · Protection des données<br />
            Autorisation CNDP n° A-PO-268/2024
          </p>
        </div>
      </div>
    </div>
  );
}
