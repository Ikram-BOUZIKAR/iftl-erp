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

const NAVY  = '#001829';
const NAVY2 = '#001f36';
const BLUE  = '#005989';
const YELLOW = '#f5c845';
const LIME   = '#c8d45d';
const LIME_DK = '#141f0a';

// ── Shared input / button components ──────────────────────────────────────────
const inputBase = {
  width: '100%',
  background: 'rgba(255,255,255,0.055)',
  border: '1.5px solid rgba(255,255,255,0.09)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 14,
  padding: '13px 13px 13px 42px',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color .15s, background .15s',
};

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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: NAVY, fontFamily: 'inherit', color: '#fff' }}>

      {/* ══ TOP BAR: two portal panels side by side ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flexShrink: 0, height: '30vh', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Portail Résultats */}
        <Link
          to="/resultats"
          style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '0 40px', textDecoration: 'none', position: 'relative', overflow: 'hidden', borderRight: '1px solid rgba(255,255,255,0.08)', transition: 'filter .2s' }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
          onMouseLeave={e => e.currentTarget.style.filter = ''}
        >
          <div style={{ position: 'absolute', inset: 0, background: BLUE, opacity: 0.18, transition: 'opacity .2s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.28'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.18'} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <Ico path="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" size="w-6 h-6" stroke="white" strokeWidth={1.75} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,89,137,0.75)', marginBottom: 4 }}>Portail résultats</div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(18px,2.5vw,28px)', lineHeight: 1.1, color: '#fff' }}>Consulter<br/>mes résultats</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 4 }}>Notes · Bulletins · Planning · Absences</div>
          </div>
          <div style={{ marginLeft: 'auto', flexShrink: 0, position: 'relative', zIndex: 1, opacity: 0.35 }}>
            <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-6 h-6" strokeWidth={1.75} />
          </div>
        </Link>

        {/* Candidature */}
        <Link
          to="/candidature"
          style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '0 40px', textDecoration: 'none', position: 'relative', overflow: 'hidden', transition: 'filter .2s' }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.08)'}
          onMouseLeave={e => e.currentTarget.style.filter = ''}
        >
          <div style={{ position: 'absolute', inset: 0, background: LIME, opacity: 0.12 }} />
          <div style={{ width: 52, height: 52, borderRadius: 14, background: LIME, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <Ico path="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" size="w-6 h-6" stroke={LIME_DK} strokeWidth={1.75} />
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: `rgba(200,212,93,0.8)`, marginBottom: 4 }}>Candidature</div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(18px,2.5vw,28px)', lineHeight: 1.1, color: '#fff' }}>Candidater<br/>à une formation</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 4 }}>Transport · Logistique · 6 filières</div>
          </div>
          <div style={{ marginLeft: 'auto', flexShrink: 0, position: 'relative', zIndex: 1, opacity: 0.35 }}>
            <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-6 h-6" strokeWidth={1.75} />
          </div>
        </Link>
      </div>

      {/* ══ BOTTOM: IFTL branding + login form ══ */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', background: NAVY2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 72, width: '100%', maxWidth: 820 }}>

          {/* Brand block */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ width: 56, height: 56, borderRadius: 15, background: YELLOW, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 17, color: NAVY, marginBottom: 16, letterSpacing: '-0.02em' }}>IF</div>
            <div style={{ fontWeight: 900, fontSize: 'clamp(34px,4.5vw,54px)', lineHeight: 1, letterSpacing: '-0.03em', color: '#fff', marginBottom: 6 }}>IFTL</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.65, maxWidth: 200 }}>Institut de Formation dans les métiers Transport &amp; Logistique</div>
          </div>

          {/* Separator */}
          <div style={{ width: 1, height: 200, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          {/* Form */}
          <div style={{ flex: 1, maxWidth: 380 }}>
            {resetMode ? (
              <div>
                <button
                  onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 20, padding: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
                >
                  <Ico path="M10 19l-7-7m0 0l7-7m-7 7h18" size="w-4 h-4" /> Retour
                </button>

                {resetSent ? (
                  <div style={{ padding: '20px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Ico path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size="w-5 h-5" stroke="#22c55e" />
                    </div>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>Email envoyé !</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Vérifiez <strong style={{ color: '#fff' }}>{resetEmail}</strong></p>
                  </div>
                ) : (
                  <form onSubmit={handleReset}>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 16 }}>Entrez votre email pour recevoir un lien de réinitialisation.</p>
                    <input
                      type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                      placeholder="vous@iftl.ma"
                      style={{ ...inputBase, paddingLeft: 14, marginBottom: 12 }}
                      onFocus={e => e.target.style.borderColor = `${YELLOW}65`}
                      onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
                    />
                    {error && <p style={{ fontSize: 12, color: '#fca5a5', marginBottom: 12 }}>{error}</p>}
                    <button
                      type="submit" disabled={resetLoading}
                      style={{ width: '100%', padding: '13px', background: YELLOW, color: NAVY, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                      {resetLoading ? <><div style={{ width: 16, height: 16, border: `2px solid ${NAVY}40`, borderTopColor: NAVY, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Envoi…</> : 'Envoyer le lien'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleLogin}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: YELLOW, marginBottom: 10 }}>Connexion professionnelle</div>

                {/* Email */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>Email</div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.22)', display: 'flex', pointerEvents: 'none' }}>
                      <Ico path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size="w-4 h-4" />
                    </span>
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="vous@iftl.ma" required autoComplete="email"
                      style={inputBase}
                      onFocus={e => e.target.style.borderColor = `${YELLOW}50`}
                      onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={{ marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>Mot de passe</span>
                    <button type="button" onClick={() => { setResetMode(true); setResetEmail(email); setError(''); }}
                      style={{ fontSize: 11.5, fontWeight: 600, color: `${YELLOW}88`, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = YELLOW}
                      onMouseLeave={e => e.currentTarget.style.color = `${YELLOW}88`}
                    >Oublié ?</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.22)', display: 'flex', pointerEvents: 'none' }}>
                      <Ico path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size="w-4 h-4" />
                    </span>
                    <input
                      type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••" required autoComplete="current-password"
                      style={{ ...inputBase, paddingRight: 44 }}
                      onFocus={e => e.target.style.borderColor = `${YELLOW}50`}
                      onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.09)'}
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.25)', padding: 4, display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.65)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.25)'}
                    >
                      {showPwd
                        ? <Ico path="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" size="w-4 h-4" />
                        : <Ico path="M15 12a3 3 0 11-6 0 3 3 0 016 0z" path2="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" size="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>

                {/* Pending / Error */}
                {auth.pendingAccount && (
                  <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(234,179,8,0.11)', border: '1px solid rgba(234,179,8,0.22)', color: '#fde047', fontSize: 12, marginTop: 12 }}>
                    <Ico path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#fde047" />
                    Compte en attente de validation par un administrateur.
                  </div>
                )}
                {error && (
                  <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#fca5a5', fontSize: 12, marginTop: 12 }}>
                    <Ico path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#fca5a5" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit" disabled={loading}
                  style={{ width: '100%', padding: '14.5px 20px', background: YELLOW, color: NAVY, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 20px ${YELLOW}35`, marginTop: 16, transition: 'transform .15s, box-shadow .15s', opacity: loading ? 0.65 : 1 }}
                  onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = `0 7px 28px ${YELLOW}50`)}
                  onMouseLeave={e => !loading && (e.currentTarget.style.boxShadow = `0 4px 20px ${YELLOW}35`)}
                >
                  {loading
                    ? <><div style={{ width: 17, height: 17, border: `2px solid ${NAVY}30`, borderTopColor: NAVY, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> Connexion…</>
                    : <>Se connecter <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke={NAVY} strokeWidth={2.5} /></>
                  }
                </button>

                {/* Divider + register */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'rgba(255,255,255,0.16)', fontSize: 10, margin: '16px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} /> ou <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                </div>
                <Link
                  to="/register"
                  style={{ width: '100%', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', border: '1.5px solid rgba(255,255,255,0.09)', borderRadius: 12, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', transition: 'background .15s, color .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
                >
                  <Ico path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" size="w-4 h-4 shrink-0" />
                  Créer un compte
                </Link>
              </form>
            )}

            {/* CNDP */}
            <div style={{ marginTop: 20, fontSize: 9, color: 'rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 1.7 }}>
              Loi n° 09-08 · Protection des données personnelles · CNDP n° A-PO-268/2024
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
