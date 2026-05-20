import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function LoginPage({ auth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.login(email, password);
      navigate('/');
    } catch {
      setError('Email ou mot de passe incorrect. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Panneau gauche — Identité IFTL ─────────────────── */}
      <div
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #005989 0%, #003d63 60%, #002d47 100%)' }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ background: '#f5c845' }} />
        <div className="absolute top-1/2 -right-40 w-80 h-80 rounded-full opacity-5" style={{ background: '#c8d45d' }} />
        <div className="absolute -bottom-24 left-1/3 w-72 h-72 rounded-full opacity-10" style={{ background: '#f5c845' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#f5c845' }}>
            <span className="font-black text-sm tracking-tighter" style={{ color: '#005989' }}>IF</span>
          </div>
          <div>
            <p className="text-white font-black text-xl leading-none tracking-wide">IFTL</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#f5c845' }}>ERP — Gestion unifiée</p>
          </div>
        </div>

        {/* Contenu central */}
        <div className="relative space-y-8">
          {/* Nom complet IFTL */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#c8d45d' }}>
              Institut de Formation
            </p>
            <h2 className="text-4xl font-bold text-white leading-tight">
              dans les métiers du<br />
              <span style={{ color: '#f5c845' }}>Transport</span> et de la<br />
              <span style={{ color: '#c8d45d' }}>Logistique</span>
            </h2>
          </div>

          {/* Séparateur */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 opacity-30" style={{ background: '#f5c845' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: '#f5c845' }} />
            <div className="h-px flex-1 opacity-30" style={{ background: '#f5c845' }} />
          </div>

          {/* Description ERP */}
          <div className="space-y-3">
            <p className="text-white/90 text-base leading-relaxed">
              Votre <strong className="text-white">ERP pédagogique</strong> — un outil de gestion unifié conçu pour piloter l'ensemble de vos activités de formation.
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Planification, suivi des apprenants, administration et reporting réunis dans une seule plateforme sécurisée.
            </p>
          </div>

          {/* Badges filières */}
          <div className="flex flex-wrap gap-2">
            {['Transport', 'Logistique', 'Transit', 'Magasinage', 'Supply Chain'].map(f => (
              <span
                key={f}
                className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(245,200,69,0.15)', color: '#f5c845', border: '1px solid rgba(245,200,69,0.3)' }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* CNDP */}
        <div className="relative">
          <div
            className="rounded-xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: 'rgba(200,212,93,0.2)' }}
            >
              <svg className="w-4 h-4" style={{ color: '#c8d45d' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Protection des données personnelles</p>
              <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Traitement conforme à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.
              </p>
              <p className="text-xs font-semibold mt-1.5" style={{ color: '#c8d45d' }}>
                Autorisation CNDP n° A-PO-268/2024
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Panneau droit — Formulaire ──────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50">

        {/* Logo mobile */}
        <div className="lg:hidden flex flex-col items-center mb-10 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg" style={{ background: '#005989' }}>
            <span className="font-black text-base tracking-tighter" style={{ color: '#f5c845' }}>IF</span>
          </div>
          <p className="font-black text-xl text-slate-800">IFTL</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xs text-center leading-relaxed">
            Institut de Formation dans les métiers du Transport et de la Logistique
          </p>
        </div>

        <div className="w-full max-w-[400px]">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Connexion</h1>
            <p className="text-slate-500 mt-1 text-sm">Accédez à votre espace pédagogique unifié</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adresse email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="vous@iftl.ma"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm transition-colors"
                  style={{ outline: 'none' }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(0,89,137,0.15)'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 text-sm"
                  style={{ outline: 'none' }}
                  onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(0,89,137,0.15)'}
                  onBlur={e => e.target.style.boxShadow = 'none'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 right-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#c8141b' }}>
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-white font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              style={{ background: '#005989', boxShadow: '0 4px 14px rgba(0,89,137,0.3)' }}
              onMouseEnter={e => !loading && (e.target.style.background = '#004070')}
              onMouseLeave={e => !loading && (e.target.style.background = '#005989')}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours…
                </>
              ) : 'Se connecter'}
            </button>
          </form>

          {/* Voir résultats */}
          <div className="mt-5">
            <Link
              to="/resultats"
              className="flex items-center justify-center gap-2.5 w-full py-3 px-4 rounded-xl border-2 font-semibold text-sm transition-all"
              style={{ borderColor: '#005989', color: '#005989' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#005989'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#005989'; }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Consulter mes résultats
            </Link>
          </div>

          {/* Lien candidature */}
          <div className="mt-4 text-center">
            <p className="text-sm text-slate-500">
              Candidature à une formation ?{' '}
              <Link to="/candidature" className="font-semibold hover:underline" style={{ color: '#005989' }}>
                Déposer votre dossier →
              </Link>
            </p>
          </div>

          {/* CNDP mobile */}
          <div className="mt-8 lg:hidden pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-400 leading-relaxed">
              Données protégées · Loi n° 09-08 · Autorisation CNDP n° A-PO-268/2024
            </p>
          </div>
        </div>

        {/* CNDP desktop */}
        <div className="hidden lg:block mt-10 text-center">
          <p className="text-xs text-slate-400">
            Loi n° 09-08 relative à la protection des données · Autorisation CNDP n° A-PO-268/2024
          </p>
        </div>
      </div>
    </div>
  );
}
