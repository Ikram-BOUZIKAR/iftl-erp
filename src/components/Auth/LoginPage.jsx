import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

function Ico({ path, path2, size = 'w-6 h-6', stroke = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg className={size} fill="none" stroke={stroke} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={path} />
      {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={path2} />}
    </svg>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;
}

// ──────────────────────────────────────────────────────────────────────────────
export default function LoginPage({ auth }) {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [resetMode, setResetMode]   = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent]   = useState(false);
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
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">

      {/* ══════════════════════════════════════════════════════════════════════
          PANNEAU 1 — Consulter mes résultats
      ══════════════════════════════════════════════════════════════════════ */}
      <Link
        to="/resultats"
        className="group relative flex flex-col justify-between overflow-hidden
                   lg:w-1/3 min-h-[240px] lg:min-h-screen
                   cursor-pointer select-none"
        style={{ background: 'linear-gradient(175deg, #001829 0%, #002d47 40%, #005989 100%)' }}
      >
        {/* Grille de fond */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Cercle décoratif large */}
        <div
          className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full transition-transform duration-700 group-hover:scale-110"
          style={{ background: 'radial-gradient(circle, rgba(0,119,182,0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-16 -left-20 w-48 h-48 rounded-full opacity-10"
          style={{ background: '#f5c845' }}
        />

        {/* Numéro watermark */}
        <div className="absolute top-6 right-6 text-[120px] font-black leading-none select-none pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.04)', fontFamily: 'system-ui' }}>
          01
        </div>

        {/* Contenu haut */}
        <div className="relative p-8 lg:p-10 pt-10 flex-1 flex flex-col justify-center lg:justify-start">
          {/* Indicateur de numéro */}
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xs font-black tracking-[0.2em] uppercase"
              style={{ color: 'rgba(245,200,69,0.7)' }}>01</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(245,200,69,0.2)' }} />
          </div>

          {/* Icône */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <Ico
              path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              size="w-8 h-8" stroke="rgba(245,200,69,0.9)" strokeWidth={1.5}
            />
          </div>

          {/* Titre */}
          <h2 className="text-3xl lg:text-4xl font-black text-white leading-[1.1] tracking-tight mb-4">
            Consulter<br />mes<br />résultats
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Notes, bulletins scolaires et attestations de formation.
          </p>
        </div>

        {/* CTA bas */}
        <div className="relative p-8 lg:p-10 pb-10">
          <div
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 group-hover:pl-7"
            style={{ background: 'rgba(245,200,69,0.15)', border: '1px solid rgba(245,200,69,0.25)' }}
          >
            <span className="text-sm font-bold" style={{ color: '#f5c845' }}>Accéder</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(245,200,69,0.2)' }}>
              <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke="#f5c845" strokeWidth={2} />
            </div>
          </div>
        </div>
      </Link>

      {/* ══════════════════════════════════════════════════════════════════════
          PANNEAU 2 — Candidater
      ══════════════════════════════════════════════════════════════════════ */}
      <Link
        to="/candidature"
        className="group relative flex flex-col justify-between overflow-hidden
                   lg:w-1/3 min-h-[240px] lg:min-h-screen
                   cursor-pointer select-none"
        style={{ background: 'linear-gradient(175deg, #5c3a00 0%, #9a6500 40%, #c8860a 80%, #f5c845 100%)' }}
      >
        {/* Grille */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Cercles décoratifs */}
        <div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-20 transition-transform duration-700 group-hover:scale-110"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-20 -left-16 w-48 h-48 rounded-full opacity-10"
          style={{ background: '#003d63' }} />

        {/* Numéro watermark */}
        <div className="absolute top-6 right-6 text-[120px] font-black leading-none select-none pointer-events-none"
          style={{ color: 'rgba(0,0,0,0.06)', fontFamily: 'system-ui' }}>
          02
        </div>

        {/* Contenu */}
        <div className="relative p-8 lg:p-10 pt-10 flex-1 flex flex-col justify-center lg:justify-start">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xs font-black tracking-[0.2em] uppercase"
              style={{ color: 'rgba(0,45,71,0.6)' }}>02</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,45,71,0.15)' }} />
          </div>

          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110"
            style={{ background: 'rgba(0,0,0,0.12)', border: '1px solid rgba(0,0,0,0.1)' }}
          >
            <Ico
              path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              size="w-8 h-8" stroke="rgba(0,45,71,0.85)" strokeWidth={1.5}
            />
          </div>

          <h2 className="text-3xl lg:text-4xl font-black leading-[1.1] tracking-tight mb-4"
            style={{ color: '#002233' }}>
            Candidater<br />à une<br />formation
          </h2>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(0,45,71,0.6)' }}>
            6 filières professionnelles en Transport & Logistique.
          </p>

          {/* Filières */}
          <div className="flex flex-wrap gap-1.5">
            {['OTM','OFLP','AEL','ECOM','ADEE','LIC'].map(f => (
              <span key={f} className="text-[10px] font-black px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(0,45,71,0.12)', color: '#002233', letterSpacing: '0.05em' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="relative p-8 lg:p-10 pb-10">
          <div
            className="flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 group-hover:pl-7"
            style={{ background: 'rgba(0,45,71,0.12)', border: '1px solid rgba(0,45,71,0.18)' }}
          >
            <span className="text-sm font-bold" style={{ color: '#002233' }}>Déposer ma candidature</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(0,45,71,0.12)' }}>
              <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke="#002233" strokeWidth={2} />
            </div>
          </div>
        </div>
      </Link>

      {/* ══════════════════════════════════════════════════════════════════════
          PANNEAU 3 — Connexion
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative flex flex-col overflow-hidden lg:w-1/3 min-h-screen"
        style={{ background: 'linear-gradient(175deg, #0f1923 0%, #1a2e3f 50%, #243b50 100%)' }}
      >
        {/* Grille */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
        <div
          className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #005989 0%, transparent 70%)' }}
        />

        {/* Numéro watermark */}
        <div className="absolute top-6 right-6 text-[120px] font-black leading-none select-none pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.03)', fontFamily: 'system-ui' }}>
          03
        </div>

        <div className="relative flex flex-col h-full p-8 lg:p-10">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xs font-black tracking-[0.2em] uppercase"
              style={{ color: 'rgba(245,200,69,0.6)' }}>03</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(245,200,69,0.15)' }} />
          </div>

          {/* Logo + titre */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0"
                style={{ background: '#f5c845' }}>
                <span className="font-black text-xs" style={{ color: '#003d63' }}>IF</span>
              </div>
              <div>
                <p className="text-white font-black text-base leading-none">IFTL</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Espace pédagogique
                </p>
              </div>
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-white leading-[1.1] tracking-tight">
              Connexion<br />au compte
            </h2>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Administration, intervenants & apprenants
            </p>
          </div>

          {/* ── Formulaire ─────────────────────────────────────────────── */}
          {resetMode ? (
            <div className="flex-1">
              <button onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                className="flex items-center gap-1.5 text-sm font-medium mb-5 transition"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
              >
                <Ico path="M10 19l-7-7m0 0l7-7m-7 7h18" size="w-4 h-4" />
                Retour
              </button>

              {resetSent ? (
                <div className="p-5 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                    style={{ background: 'rgba(34,197,94,0.15)' }}>
                    <Ico path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size="w-6 h-6" stroke="#22c55e" />
                  </div>
                  <p className="font-bold text-white mb-1">Email envoyé !</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Vérifiez <strong className="text-white">{resetEmail}</strong>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Entrez votre email pour recevoir un lien de réinitialisation.
                  </p>
                  <input type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    placeholder="vous@iftl.ma"
                    className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f5c845]/40 transition"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                  />
                  {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}
                  <button type="submit" disabled={resetLoading}
                    className="w-full py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
                    style={{ background: '#f5c845', color: '#002233' }}>
                    {resetLoading ? <><div className="w-4 h-4 border-2 border-[#002233]/30 border-t-[#002233] rounded-full animate-spin" /> Envoi…</> : 'Envoyer le lien'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="flex-1 flex flex-col justify-center space-y-4">

              {/* Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-1.5"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <Ico path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size="w-4 h-4" />
                  </div>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="vous@iftl.ma" required autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'white',
                      outline: 'none',
                    }}
                    onFocus={e => e.target.style.border = '1px solid rgba(245,200,69,0.5)'}
                    onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(255,255,255,0.4)' }}>Mot de passe</label>
                  <button type="button"
                    onClick={() => { setResetMode(true); setResetEmail(email); setError(''); }}
                    className="text-xs font-semibold transition"
                    style={{ color: 'rgba(245,200,69,0.7)' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#f5c845'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,200,69,0.7)'}
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none"
                    style={{ color: 'rgba(255,255,255,0.3)' }}>
                    <Ico path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size="w-4 h-4" />
                  </div>
                  <input type={showPwd ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-sm focus:outline-none transition"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    onFocus={e => e.target.style.border = '1px solid rgba(245,200,69,0.5)'}
                    onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.1)'}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute inset-y-0 right-3.5 flex items-center transition"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
                  >
                    {showPwd
                      ? <Ico path="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" size="w-4 h-4" />
                      : <Ico path="M15 12a3 3 0 11-6 0 3 3 0 016 0z" path2="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" size="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Compte en attente */}
              {auth.pendingAccount && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
                  style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.25)', color: '#fde047' }}>
                  <Ico path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#fde047" />
                  <span>Compte en attente de validation par un administrateur.</span>
                </div>
              )}

              {/* Erreur */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                  <Ico path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#fca5a5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Bouton connexion */}
              <button type="submit" disabled={loading}
                className="w-full py-3.5 font-black rounded-xl text-sm flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all"
                style={{ background: '#f5c845', color: '#001829', boxShadow: '0 6px 20px rgba(245,200,69,0.3)' }}
                onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = '0 8px 28px rgba(245,200,69,0.45)')}
                onMouseLeave={e => !loading && (e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,200,69,0.3)')}
              >
                {loading
                  ? <><div className="w-4 h-4 border-2 border-[#001829]/30 border-t-[#001829] rounded-full animate-spin" /> Connexion…</>
                  : <>Se connecter <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke="#001829" strokeWidth={2.5} /></>
                }
              </button>

              {/* Séparateur */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>ou</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Créer un compte */}
              <Link to="/register"
                className="w-full py-3 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >
                <Ico path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" size="w-4 h-4 shrink-0" />
                Créer un compte
              </Link>
            </form>
          )}

          {/* Footer CNDP */}
          <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] leading-relaxed text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Loi n° 09-08 · Protection des données personnelles<br />
              Autorisation CNDP n° A-PO-268/2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
