import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../UI/LanguageSwitcher';
import { useBranding } from '../../contexts/BrandingContext';
import { IS_DEMO } from '../../utils/brandingConfig';

function Ico({ path, path2, size = 'w-6 h-6', stroke = 'currentColor', strokeWidth = 1.5 }) {
  return (
    <svg className={size} fill="none" stroke={stroke} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={path} />
      {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d={path2} />}
    </svg>
  );
}

// ── Demo role selector (rendered only when VITE_EMAIL_DOMAIN is set) ──────────
const DEMO_ROLES = [
  {
    id: 'direction', label: 'Direction', pw: 'DirectionDemo@2025!',
    color: '#1a5f8a', bg: '#eaf4fb',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
  {
    id: 'scolarite', label: 'Scolarité', pw: 'ScolariteDemo@2025!',
    color: '#0d7a55', bg: '#eafaf4',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    id: 'intervenant', label: 'Formateur', pw: 'IntervenantDemo@2025!',
    color: '#7c3aed', bg: '#f5f0ff',
    icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  },
  {
    id: 'apprenant', label: 'Apprenant', pw: 'ApprenantDemo@2025!',
    color: '#b45309', bg: '#fffbeb',
    icon: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  },
];

function DemoRoleSelector({ onQuickLogin }) {
  const [active, setActive] = useState(null);
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', whiteSpace: 'nowrap' }}>
          Explorer la démonstration
        </span>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {DEMO_ROLES.map(({ id, label, pw, color, bg, icon }) => (
          <button
            key={id} type="button"
            disabled={active !== null}
            onClick={async () => {
              setActive(id);
              await onQuickLogin(id, pw);
              setActive(null);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '10px 12px', borderRadius: 10,
              background: bg, border: `1.5px solid ${color}28`,
              color, fontWeight: 600, fontSize: 12.5,
              cursor: active ? 'wait' : 'pointer',
              transition: 'transform .12s, box-shadow .12s',
              opacity: active && active !== id ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${color}28`; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            {active === id
              ? <div style={{ width: 14, height: 14, border: `2px solid ${color}40`, borderTopColor: color, borderRadius: '50%', animation: 'spin .7s linear infinite', flexShrink: 0 }} />
              : <svg style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
            }
            {label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 9.5, color: '#94a3b8', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
        Données 100 % fictives — aucun compte réel
      </p>
    </div>
  );
}

// ── Hero photo (left panel background) ────────────────────────────────────────
// Unsplash free-use photos (licence Unsplash, attribution ci-dessous).
// Photo 1 — graduation caps throwing  (by MD_DURAN on Unsplash)
// Photo 2 — person holding academic hat (expressive, recommandé)
// Pour obtenir l'URL CDN : ouvrir la page Unsplash → clic droit photo → "Copier l'adresse de l'image"
// Remplacer null par l'URL copiée (commence par https://images.unsplash.com/photo-...)
const HERO_PHOTO_URL =
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1' +
  '?auto=format&fit=crop&w=1920&q=85';
// ^ URL de secours connue (remplacer par l'URL CDN copiée depuis le navigateur si différente)

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  dark:    '#0f1729',
  violet:  '#1B1464',
  violet2: '#2C2085',
  coral:   '#FF6B35',
  teal:    '#00C9A7',
  yellow:  '#f5c845',
  navy:    '#001829',
  inputBg: '#f8fafc',
  inputBorder: '#e2e8f0',
  fg:      '#0f172a',
  fg2:     '#475569',
  fg3:     '#94a3b8',
};

const inputBase = {
  width: '100%',
  background: C.inputBg,
  border: `1.5px solid ${C.inputBorder}`,
  borderRadius: 12,
  color: C.fg,
  fontSize: 14,
  padding: '13px 13px 13px 42px',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color .15s, background .15s',
};

// ── Portal card component (left panel) ────────────────────────────────────────
function PortalCard({ icon, label, title, subtitle, accent, to, onClick }) {
  const inner = (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        cursor: 'pointer', textDecoration: 'none',
        transition: 'background .15s, border-color .15s',
        color: 'inherit',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = `${accent}40`; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg style={{ width: 16, height: 16 }} fill="none" stroke={accent} strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: `${accent}cc`, marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, flexShrink: 0 }}>→</div>
    </div>
  );

  if (to) {
    return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  }
  return inner;
}

// ── Main component ─────────────────────────────────────────────────────────────
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
  const [isMobile, setIsMobile]         = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [photoLoaded, setPhotoLoaded]   = useState(false);
  const emailRef = useRef(null);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const { branding } = useBranding();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Preload hero photo — apply only on successful load, keep gradient on error
  useEffect(() => {
    if (!HERO_PHOTO_URL) return;
    const img = new Image();
    img.onload  = () => setPhotoLoaded(true);
    img.onerror = () => setPhotoLoaded(false);
    img.src = HERO_PHOTO_URL;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const EMAIL_DOMAIN = import.meta.env.VITE_EMAIL_DOMAIN;
      const loginEmail = email.includes('@') || !EMAIL_DOMAIN
        ? email
        : `${email}@${EMAIL_DOMAIN}`;
      await auth.login(loginEmail, password);
      window.location.replace('/');
    } catch {
      setError(t('login.err_invalid_creds'));
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
      setError(t('login.err_email_not_found'));
    } finally {
      setResetLoading(false);
    }
  };

  const focusForm = () => {
    if (emailRef.current) {
      emailRef.current.focus();
      emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Brand accent — falls back to violet if no branding colour set
  const brandAccent = branding.primaryColor || C.violet;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      fontFamily: 'inherit',
    }}>

      {/* ══ LEFT PANEL — dark, portals ══════════════════════════════════════ */}
      <div style={{
        background: C.dark,
        backgroundImage: photoLoaded ? `url(${HERO_PHOTO_URL})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isMobile ? 'flex-start' : 'center',
        padding: isMobile ? '24px 20px 20px' : '48px 40px',
        overflow: 'hidden',
        minHeight: isMobile ? 'auto' : '100vh',
      }}>
        {/* Photo overlay + gradient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          {/* Dark overlay when photo is loaded, for text readability */}
          {photoLoaded && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,12,30,0.68)' }} />
          )}
          <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '60%', paddingBottom: '60%', borderRadius: '50%', background: `radial-gradient(circle, ${C.violet}${photoLoaded ? '44' : '55'} 0%, transparent 70%)` }} />
          <div style={{ position: 'absolute', bottom: '-15%', left: '-15%', width: '55%', paddingBottom: '55%', borderRadius: '50%', background: `radial-gradient(circle, ${C.coral}${photoLoaded ? '18' : '20'} 0%, transparent 70%)` }} />
        </div>

        {/* Language switcher — top right of left panel */}
        <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 50 }}>
          <LanguageSwitcher />
        </div>

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 20 : 36 }}>
          {branding.logoURL ? (
            <img src={branding.logoURL} alt="Logo" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.violet}, ${C.violet2})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 17, letterSpacing: 1,
              boxShadow: `0 4px 16px ${C.violet}66`,
            }}>
              {(branding.instituteName || 'ERP').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>
              {branding.instituteName || 'ERP Étudiant Cloud'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>Plateforme pédagogique</div>
          </div>
        </div>

        {/* Headline — hidden on mobile to save space */}
        {!isMobile && (
          <div style={{ position: 'relative', zIndex: 1, marginBottom: 32 }}>
            <div style={{ fontSize: 'clamp(22px,2.5vw,32px)', fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 10, textWrap: 'balance' }}>
              La formation digitale,{' '}
              <span style={{ color: C.coral }}>réinventée.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, maxWidth: '36ch' }}>
              Gérez candidatures, scolarité et pédagogie depuis une seule plateforme sécurisée.
            </div>
          </div>
        )}

        {/* Portal label */}
        <div style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>
          Choisissez votre espace
        </div>

        {/* Portal cards */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PortalCard
            to="/candidature"
            label="Portail 1"
            title="Candidature & Admissions"
            subtitle="Déposer un dossier, suivre son avancement"
            accent={C.coral}
            icon="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
          <PortalCard
            to="/resultats"
            label="Portail 2"
            title="Résultats & Espace Étudiant"
            subtitle="Consulter notes, absences, planning"
            accent={C.teal}
            icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
          <PortalCard
            onClick={focusForm}
            label="Portail 3"
            title="Espace Management"
            subtitle="Direction, scolarité, formateurs"
            accent="rgba(255,255,255,0.65)"
            icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </div>

        {/* ── Demo booking CTA — visible uniquement en mode démo ─────────── */}
        {IS_DEMO && <div style={{ position: 'relative', zIndex: 1, marginTop: 20 }}>
          <a
            href="https://calendly.com/erp-eduteck/30min"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff', textDecoration: 'none',
              fontSize: 12, fontWeight: 600,
              transition: 'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
          >
            <svg style={{ width: 15, height: 15, flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t('login.book_demo')}
          </a>
          <div style={{ marginTop: 8, textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.30)' }}>
            {t('login.contact_label')} : erp.eduteck@gmail.com
          </div>
        </div>}

        {/* Powered by */}
        {!isMobile && (
          <div style={{ position: 'relative', zIndex: 1, marginTop: 'auto', paddingTop: 20, fontSize: 9.5, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
            ERP Pédagogique — Smart. Scalable. Multilingual.
          </div>
        )}
      </div>

      {/* ══ RIGHT PANEL — white, login form ═════════════════════════════════ */}
      <div style={{
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '28px 20px 32px' : '40px 40px',
        minHeight: isMobile ? 'auto' : '100vh',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {resetMode ? (
            /* ── Password reset form ── */
            <div>
              <button
                onClick={() => { setResetMode(false); setResetSent(false); setError(''); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: C.fg3, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24, padding: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = '#334155'}
                onMouseLeave={e => e.currentTarget.style.color = C.fg3}
              >
                <Ico path="M10 19l-7-7m0 0l7-7m-7 7h18" size="w-4 h-4" /> {t('login.back')}
              </button>

              {resetSent ? (
                <div style={{ padding: '20px', borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', textAlign: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <Ico path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" size="w-5 h-5" stroke="#16a34a" />
                  </div>
                  <p style={{ fontWeight: 700, color: '#15803d', marginBottom: 4 }}>{t('login.email_sent')}</p>
                  <p style={{ fontSize: 12, color: '#4ade80' }}>{t('login.check_email')} <strong style={{ color: '#15803d' }}>{resetEmail}</strong></p>
                </div>
              ) : (
                <form onSubmit={handleReset}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: brandAccent, marginBottom: 8 }}>Récupération</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: C.fg, marginBottom: 4, lineHeight: 1.2 }}>Mot de passe oublié</div>
                  <p style={{ fontSize: 12, color: C.fg2, marginBottom: 20 }}>{t('login.reset_instructions')}</p>
                  <input
                    type="email" required value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ ...inputBase, paddingLeft: 14, marginBottom: 12 }}
                    onFocus={e => e.target.style.borderColor = brandAccent}
                    onBlur={e  => e.target.style.borderColor = C.inputBorder}
                  />
                  {error && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 12 }}>{error}</p>}
                  <button
                    type="submit" disabled={resetLoading}
                    style={{ width: '100%', padding: '13px', background: C.yellow, color: C.navy, border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {resetLoading
                      ? <><div style={{ width: 16, height: 16, border: `2px solid ${C.navy}40`, borderTopColor: C.navy, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> {t('login.sending')}</>
                      : t('login.send_link')}
                  </button>
                </form>
              )}
            </div>
          ) : (
            /* ── Login form ── */
            <form onSubmit={handleLogin}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: brandAccent, marginBottom: 8 }}>
                {t('login.pro_login')}
              </div>
              <div style={{ fontWeight: 800, fontSize: 26, color: C.fg, marginBottom: 2, lineHeight: 1.15 }}>Bienvenue</div>
              <div style={{ fontSize: 13, color: C.fg3, marginBottom: 28 }}>Connectez-vous à votre espace management</div>

              {/* Email */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.fg3, marginBottom: 6 }}>
                  {import.meta.env.VITE_EMAIL_DOMAIN ? t('login.identifier', 'Identifiant') : t('login.email')}
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.fg3, display: 'flex', pointerEvents: 'none' }}>
                    <Ico path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" size="w-4 h-4" />
                  </span>
                  <input
                    ref={emailRef}
                    type="text" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={import.meta.env.VITE_EMAIL_DOMAIN ? 'ex: admin' : 'you@example.com'}
                    required autoComplete="username"
                    style={inputBase}
                    onFocus={e => e.target.style.borderColor = brandAccent}
                    onBlur={e  => e.target.style.borderColor = C.inputBorder}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: C.fg3 }}>{t('login.password')}</span>
                  <button type="button" onClick={() => { setResetMode(true); setResetEmail(email); setError(''); }}
                    style={{ fontSize: 11.5, fontWeight: 600, color: brandAccent, background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.75 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
                  >{t('login.forgot')}</button>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: C.fg3, display: 'flex', pointerEvents: 'none' }}>
                    <Ico path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" size="w-4 h-4" />
                  </span>
                  <input
                    type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                    style={{ ...inputBase, paddingRight: 44 }}
                    onFocus={e => e.target.style.borderColor = brandAccent}
                    onBlur={e  => e.target.style.borderColor = C.inputBorder}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.fg3, padding: 4, display: 'flex' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#475569'}
                    onMouseLeave={e => e.currentTarget.style.color = C.fg3}
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
                <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#fefce8', border: '1px solid #fde68a', color: '#92400e', fontSize: 12, marginTop: 12 }}>
                  <Ico path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#d97706" />
                  {t('login.err_pending')}
                </div>
              )}
              {error && (
                <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, marginTop: 12 }}>
                  <Ico path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size="w-4 h-4 shrink-0 mt-0.5" stroke="#dc2626" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '14.5px 20px',
                  background: C.yellow, color: C.navy,
                  border: 'none', borderRadius: 12,
                  fontWeight: 800, fontSize: 15,
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: `0 4px 20px ${C.yellow}35`,
                  marginTop: 18, transition: 'transform .15s, box-shadow .15s',
                  opacity: loading ? 0.65 : 1,
                }}
                onMouseEnter={e => !loading && (e.currentTarget.style.boxShadow = `0 7px 28px ${C.yellow}50`)}
                onMouseLeave={e => !loading && (e.currentTarget.style.boxShadow = `0 4px 20px ${C.yellow}35`)}
              >
                {loading
                  ? <><div style={{ width: 17, height: 17, border: `2px solid ${C.navy}30`, borderTopColor: C.navy, borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> {t('login.signing_in')}</>
                  : <>{t('login.sign_in')} <Ico path="M13 7l5 5m0 0l-5 5m5-5H6" size="w-4 h-4" stroke={C.navy} strokeWidth={2.5} /></>
                }
              </button>

              {/* Demo role selector — visible only in demo builds */}
              {import.meta.env.VITE_EMAIL_DOMAIN && (
                <DemoRoleSelector onQuickLogin={async (identifier, pw) => {
                  setError('');
                  setLoading(true);
                  try {
                    const domain = import.meta.env.VITE_EMAIL_DOMAIN;
                    await auth.login(`${identifier}@${domain}`, pw);
                    window.location.replace('/');
                  } catch {
                    setError('Connexion démo échouée. Contactez l\'administrateur.');
                    setLoading(false);
                  }
                }} />
              )}

              {/* Register link */}
              {!import.meta.env.VITE_EMAIL_DOMAIN && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1', fontSize: 10, margin: '16px 0' }}>
                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} /> ou <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                  </div>
                  <Link
                    to="/register"
                    style={{ width: '100%', padding: '12px 20px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, color: '#64748b', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none', transition: 'background .15s, color .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
                  >
                    <Ico path="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" size="w-4 h-4 shrink-0" />
                    {t('login.create_account')}
                  </Link>
                </>
              )}
            </form>
          )}

          {/* CNDP */}
          <div style={{ marginTop: 20, fontSize: 9, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.7 }}>
            {IS_DEMO
              ? 'Données de démonstration — aucune donnée réelle · Protection RGPD'
              : t('login.cndp_notice')}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
