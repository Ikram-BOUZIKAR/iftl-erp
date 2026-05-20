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
    } catch (err) {
      setError('Email ou mot de passe incorrect. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand / visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-700 to-violet-800 flex-col justify-between p-12">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 bg-white/5 rounded-full" />

        {/* Logo */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm tracking-tighter">IF</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">IFTL</p>
              <p className="text-indigo-200 text-xs font-medium">Institut de Formation</p>
            </div>
          </div>
        </div>

        {/* Center content */}
        <div className="relative space-y-6">
          <div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Système de gestion<br />pédagogique
            </h2>
            <p className="text-indigo-200 mt-4 text-base leading-relaxed max-w-xs">
              Gérez les plannings, l'émargement et le suivi des absences depuis une plateforme unifiée.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {['Planning EDT', 'Émargement', 'Alertes absences', 'Rapports PDF'].map(f => (
              <span key={f} className="text-xs font-medium bg-white/15 text-white px-3 py-1.5 rounded-full backdrop-blur">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom — CNDP */}
        <div className="relative">
          <div className="flex items-start gap-3 bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Protection des données</p>
              <p className="text-indigo-200 text-xs mt-0.5 leading-relaxed">
                Traitement conforme à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel.
              </p>
              <p className="text-indigo-300 text-xs mt-1 font-medium">Autorisation CNDP n° A-PO-268/2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-slate-50">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-sm">IF</span>
          </div>
          <div>
            <p className="text-slate-800 font-bold text-lg leading-none">IFTL</p>
            <p className="text-slate-400 text-xs">Institut de Formation</p>
          </div>
        </div>

        <div className="w-full max-w-md">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Bienvenue</h1>
            <p className="text-slate-500 mt-1 text-sm">Connectez-vous à votre espace pédagogique</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Adresse email
              </label>
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
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
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
                  className="w-full pl-10 pr-11 py-3 border border-slate-300 rounded-xl bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm shadow-sm shadow-indigo-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion en cours…
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Candidature link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Vous souhaitez candidater ?{' '}
              <Link to="/candidature" className="text-indigo-600 font-medium hover:text-indigo-700 hover:underline">
                Déposer une candidature →
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

        {/* CNDP desktop bottom */}
        <div className="hidden lg:block mt-10 text-center">
          <p className="text-xs text-slate-400">
            Loi n° 09-08 relative à la protection des données · Autorisation CNDP n° A-PO-268/2024
          </p>
        </div>
      </div>
    </div>
  );
}
