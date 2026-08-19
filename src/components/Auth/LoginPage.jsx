import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

function Ico({ path, path2, size = 'w-6 h-6', stroke = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg className={size} fill="none" stroke={stroke} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={path} />
      {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={path2} />}
    </svg>
  );
}

const P = {
  blue:   { brand: '#005989', dark: '#001829' },
  green:  { brand: '#c8d45d', dark: '#141f0a' },
  yellow: { brand: '#f5c845', dark: '#1a1200' },
};

/* Triangle de coupe diagonal — posé en bas de la zone couleur */
function DiagCut({ dark }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-14 sm:h-16 lg:h-20 pointer-events-none z-10"
      style={{ background: dark, clipPath: 'polygon(0 100%, 100% 0%, 100% 100%)' }}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────────
export default function LoginPage({ auth }) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [resetMode, setResetMode]       = useState(false);
  const [resetEmail, setResetEmail]     = useState('');
  const [resetSent, setResetSent]       = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const firebaseUser = await auth.login(email, password);
      const snap = await getDoc(doc(db, 'users', firebaseUser.uid));
      const role = snap.data()?.role;
      if (role === 'intervenant') navigate('/portail-intervenant');
      else if (role === 'apprenant') navigate('/portail-apprenant');
      else navigate('/');
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
          PANNEAU 1 — Consulter mes résultats — BLEU
      ══════════════════════════════════════════════════════════════════════ */}
      <Link
        to="/resultats"
        className="group w-full lg:w-1/3 flex flex-col overflow-hidden cursor-pointer select-none"
        style={{ background: P.blue.dark }}
      >
        {/* Zone couleur */}
        <div
          className="relative flex flex-col items-center justify-center pt-10 pb-24 sm:pb-28 lg:pb-32 px-8 text-center"
          style={{ background: P.blue.brand }}
        >
          <div
            className="absolute top-4 right-5 text-[96px] font-black leading-none select-none pointer-events-none text-white"
            style={{ opacity: 0.08, fontFamily: 'system-ui' }}
          >01</div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <span className="text-lg sm:text-xl font-black tracking-wide uppercase text-white">
              Portail de résultats
            </span>

            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border-2 border-white/25 transition-transform duration-300 group-hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.14)' }}
            >
              <Ico
                path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                size="w-9 h-9" stroke="white" strokeWidth={1.5}
              />
            </div>
          </div>

          <DiagCut dark={P.blue.dark} />
        </div>

        {/* Zone sombre */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-10 gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-[1.1] tracking-tight">
              Consulter<br />mes résultats
            </h2>
            <p className="text-sm mt-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Notes · Bulletins · Planning · Absences
            </p>
          </div>

          <div
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-black transition-all duration-300 group-hover:gap-4"
            style={{ background: P.yellow.brand, color: P.blue.dark }}
          >
            Accéder
            <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke={P.blue.dark} strokeWidth={2.5} />
          </div>
        </div>
      </Link>

      {/* ══════════════════════════════════════════════════════════════════════
          PANNEAU 2 — Candidature — VERT
      ══════════════════════════════════════════════════════════════════════ */}
      <Link
        to="/candidature"
        className="group w-full lg:w-1/3 flex flex-col overflow-hidden cursor-pointer select-none"
        style={{ background: P.green.dark }}
      >
        {/* Zone couleur */}
        <div
          className="relative flex flex-col items-center justify-center pt-10 pb-24 sm:pb-28 lg:pb-32 px-8 text-center"
          style={{ background: P.green.brand }}
        >
          <div
            className="absolute top-4 right-5 text-[96px] font-black leading-none select-none pointer-events-none"
            style={{ color: P.green.dark, opacity: 0.1, fontFamily: 'system-ui' }}
          >02</div>

          <div className="relative z-10 flex flex-col items-center gap-4">
            <span className="text-lg sm:text-xl font-black tracking-wide uppercase" style={{ color: P.green.dark }}>
              Candidature
            </span>

            <div
              className="w-20 h-20 rounded-full flex items-center justify-center border-2 transition-transform duration-300 group-hover:scale-110"
              style={{ background: `${P.green.dark}1A`, borderColor: `${P.green.dark}30` }}
            >
              <Ico
                path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                size="w-9 h-9" stroke={P.green.dark} strokeWidth={1.5}
              />
            </div>
          </div>

          <DiagCut dark={P.green.dark} />
        </div>

        {/* Zone sombre */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-10 gap-6">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-[1.1] tracking-tight">
              Candidater<br />à une formation
            </h2>
            <p className="text-sm mt-2.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              6 filières · Transport &amp; Logistique
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {['TMLI','LIPF','GOL','ECMD','DMVT','LE','CTM','CTP'].map(f => (
              <span
                key={f}
                className="text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.75)', letterSpacing: '0.06em' }}
              >{f}</span>
            ))}
          </div>

          <div
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full text-sm font-black transition-all duration-300 group-hover:gap-4"
            style={{ background: P.green.brand, color: P.green.dark }}
          >
            Déposer ma candidature
            <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke={P.green.dark} strokeWidth={2.5} />
          </div>
        </div>
      </Link>

      {/* ══════════════════════════════════════════════════════════════════════
          PANNEAU 3 — Connexion — JAUNE
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="w-full lg:w-1/3 flex flex-col overflow-hidden"
        style={{ background: P.yellow.dark }}
      >
        {/* Zone couleur */}
        <div
          className="relative flex flex-col items-center justify-center pt-10 pb-24 sm:pb-28 lg:pb-32 px-8 text-center"
          style={{ background: P.yellow.brand }}
        >
          <div
            className="absolute top-4 right-5 text-[96px] font-black leading-none select-none pointer-events-none"
            style={{ color: P.yellow.dark, opacity: 0.08, fontFamily: 'system-ui' }}
          >03</div>

          <div className="relative z-10 flex flex-col items-center gap-3">
            <span className="text-lg sm:text-xl font-black tracking-wide uppercase" style={{ color: P.blue.dark }}>
              Espace Professionnel
            </span>

            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: P.blue.dark }}
            >
              <span className="font-black text-sm" style={{ color: P.yellow.brand }}>IF</span>
            </div>

            <div>
              <h2
                className="text-2xl sm:text-3xl font-black leading-[1.1] tracking-tight"
                style={{ color: P.blue.dark }}
              >
                Connexion<br />au compte
              </h2>
              <p className="text-xs mt-1.5" style={{ color: `${P.blue.dark}99` }}>
                Administration · Intervenants · Apprenants
              </p>
            </div>
          </div>

          <DiagCut dark={P.yellow.dark} />
        </div>

        {/* Zone sombre — formulaire */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-8 py-8">
          <div className="w-full max-w-sm mx-auto">

            {resetMode ? (
              /* ── Mode reset ───────────────────────────────────────────── */
              <div>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                  className="flex items-center justify-center gap-1.5 text-sm font-medium mb-6 mx-auto transition"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                >
                  <Ico path="M10 19l-7-7m0 0l7-7m-7 7h18" size="w-4 h-4" /> Retour
                </button>

                {resetSent ? (
                  <div
                    className="p-5 rounded-2xl text-center"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'rgba(34,197,94,0.18)' }}>
                      <Ico path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size="w-6 h-6" stroke="#22c55e" />
                    </div>
                    <p className="font-bold text-white mb-1">Email envoyé !</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Vérifiez <strong className="text-white">{resetEmail}</strong>
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReset} className="space-y-4">
                    <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Entrez votre email pour recevoir un lien de réinitialisation.
                    </p>
                    <input
                      type="email" required value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="vous@iftl.ma"
                      className="w-full px-4 py-3 rounded-xl text-sm text-white text-center focus:outline-none transition"
                      style={{ background: 'rgba(255,255,255,0.09)', border: '1px solid rgba(255,255,255,0.13)' }}
                      onFocus={e => e.target.style.border = `1px solid ${P.yellow.brand}70`}
                      onBlur={e  => e.target.style.border = '1px solid rgba(255,255,255,0.13)'}
                    />
                    {error && <p className="text-xs text-center" style={{ color: '#f87171' }}>{error}</p>}
                    <button
                      type="submit" disabled={resetLoading}
                      className="w-full py-3 font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition"
                      style={{ background: P.yellow.brand, color: P.yellow.dark }}
                    >
                      {resetLoading
                        ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Envoi…</>
                        : 'Envoyer le lien'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* ── Formulaire connexion ─────────────────────────────────── */
              <form onSubmit={handleLogin} className="space-y-4">

                {/* Email */}
                <div>
                  <label
                    className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 text-center"
                    style={{ color: 'rgba(255,255,255,0.38)' }}
                  >Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none"
                      style={{ color: 'rgba(255,255,255,0.28)' }}>
                      <Ico path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size="w-4 h-4" />
                    </div>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="vous@iftl.ma" required autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white focus:outline-none transition"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.11)' }}
                      onFocus={e => e.target.style.border = `1px solid ${P.yellow.brand}65`}
                      onBlur={e  => e.target.style.border = '1px solid rgba(255,255,255,0.11)'}
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className="text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'rgba(255,255,255,0.38)' }}
                    >Mot de passe</label>
                    <button
                      type="button"
                      onClick={() => { setResetMode(true); setResetEmail(email); setError(''); }}
                      className="text-xs font-semibold transition"
                      style={{ color: `${P.yellow.brand}90` }}
                      onMouseEnter={e => e.currentTarget.style.color = P.yellow.brand}
                      onMouseLeave={e => e.currentTarget.style.color = `${P.yellow.brand}90`}
                    >Oublié ?</button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none"
                      style={{ color: 'rgba(255,255,255,0.28)' }}>
                      <Ico path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size="w-4 h-4" />
                    </div>
                    <input
                      type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 rounded-xl text-sm text-white focus:outline-none transition"
                      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.11)' }}
                      onFocus={e => e.target.style.border = `1px solid ${P.yellow.brand}65`}
                      onBlur={e  => e.target.style.border = '1px solid rgba(255,255,255,0.11)'}
                    />
                    <button
                      type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute inset-y-0 right-3.5 flex items-center transition"
                      style={{ color: 'rgba(255,255,255,0.28)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.28)'}
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
                  <div
                    className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
                    style={{ background: 'rgba(234,179,8,0.11)', border: '1px solid rgba(234,179,8,0.22)', color: '#fde047' }}
                  >
                    <Ico path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#fde047" />
                    <span>Compte en attente de validation par un administrateur.</span>
                  </div>
                )}

                {/* Erreur */}
                {error && (
                  <div
                    className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs"
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5' }}
                  >
                    <Ico path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#fca5a5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Bouton connexion */}
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 font-black rounded-xl text-sm flex items-center justify-center gap-2.5 disabled:opacity-50 transition-all"
                  style={{ background: P.yellow.brand, color: P.yellow.dark, boxShadow: `0 6px 22px ${P.yellow.brand}45` }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = `0 8px 28px ${P.yellow.brand}65`)}
                  onMouseLeave={e => !loading && (e.currentTarget.style.boxShadow = `0 6px 22px ${P.yellow.brand}45`)}
                >
                  {loading
                    ? <><div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" /> Connexion…</>
                    : <>Se connecter <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke={P.yellow.dark} strokeWidth={2.5} /></>
                  }
                </button>

                {/* Séparateur */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.22)' }}>ou</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                </div>

                {/* Créer un compte */}
                <Link
                  to="/register"
                  className="w-full py-3 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.65)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                >
                  <Ico path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" size="w-4 h-4 shrink-0" />
                  Créer un compte
                </Link>
              </form>
            )}
          </div>

          {/* Footer CNDP */}
          <div className="mt-8 pt-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.18)' }}>
              Loi n° 09-08 · Protection des données personnelles<br />
              Autorisation CNDP n° A-PO-268/2024
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
