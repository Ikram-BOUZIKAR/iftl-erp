import { useState, useEffect } from 'react';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DEFAULT_CONFIG = {
  anneeReinscription: '2026-2027',
  montant: 8500,
  actif: true,
  beneficiaire: 'Société de Gestion des Établissements de Formation Logistique (SGEFL)',
};

const LIENS_URGENCE = ['Parent', 'Tuteur', 'Conjoint(e)', 'Frère / Sœur', 'Ami(e)', 'Autre'];

const NIVEAUX = [
  '2ème Année TS',
  '2ème Année T',
  '2ème Année Q',
  'Mastère 1ère Année',
  'Mastère 2ème Année',
];

const FILIERES = [
  'Conducteur(rice) en transport routier – Option Marchandises',
  'Conducteur(rice) en transport routier – Option Personnes',
  'Logistique d\'entreposage',
  'Transport Multimodal et Logistique Internationale',
  'Logistique Industrielle et Pilotage des Flux',
  'Gestionnaire des opérations logistiques et d\'entrepôt',
  'E-Commerce, Marketing Digital et Distribution',
  'Diagnostic et Maintenance des Véhicules de Transport',
];

const STEPS_META = [
  { n: 1, label: 'Identification', desc: 'Votre numéro CIN' },
  { n: 2, label: 'Informations', desc: 'Coordonnées & niveau' },
  { n: 3, label: 'Paiement', desc: 'Justificatif de versement' },
];

/* ─── Design tokens ──────────────────────────────────────────────── */
const tok = {
  blue:      '#005989',
  blueDeep:  '#003c5a',
  blueLight: '#0077b6',
  blueTint:  '#f0f6fb',
  surface:   '#ffffff',
  ink:       '#1a2c3d',
  muted:     '#5e7a91',
  border:    '#dce8f0',
  success:   '#059669',
  amber:     '#d97706',
  amberBg:   '#fffbeb',
  amberBorder:'#fcd34d',
};

/* ─── Shared styles ──────────────────────────────────────────────── */
const inputS = {
  width: '100%', fontSize: 14, fontFamily: 'inherit',
  border: `1.5px solid ${tok.border}`, borderRadius: 10,
  padding: '11px 14px', outline: 'none',
  background: tok.surface, color: tok.ink,
  transition: 'border-color .15s, box-shadow .15s',
  boxSizing: 'border-box', appearance: 'none',
};

/* ─── Sub-components ─────────────────────────────────────────────── */
function SidebarTimeline({ step }) {
  return (
    <div>
      {STEPS_META.map((s, i) => {
        const done   = step > s.n;
        const active = step === s.n;
        return (
          <div key={s.n} style={{ display: 'flex', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                background: active ? '#fff' : done ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)',
                color: active ? tok.blue : done ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.38)',
                boxShadow: active ? '0 0 0 4px rgba(255,255,255,0.18)' : 'none',
                transition: 'all .2s',
              }}>
                {done ? '✓' : s.n}
              </div>
              {i < STEPS_META.length - 1 && (
                <div style={{
                  width: 2, minHeight: 30, margin: '5px 0',
                  background: done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.14)',
                  transition: 'background .3s',
                }} />
              )}
            </div>
            <div style={{ paddingTop: 5, paddingBottom: i < STEPS_META.length - 1 ? 30 : 0 }}>
              <p style={{
                margin: 0, fontSize: 14, lineHeight: 1.2,
                fontWeight: active ? 700 : done ? 600 : 400,
                color: active ? '#fff' : done ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.38)',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>{s.label}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{s.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileHeader({ step, annee }) {
  return (
    <header style={{
      background: tok.blueDeep, padding: '16px 20px', position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <img src="/Logo IFTL avec Signature.png" alt="IFTL" style={{ height: 36, objectFit: 'contain' }} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Réinscription</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{annee}</p>
        </div>
      </div>
      {/* horizontal step dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS_META.map((s, i) => (
          <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS_META.length - 1 ? 1 : 'none' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: step > s.n ? 'rgba(255,255,255,0.2)' : step === s.n ? '#fff' : 'rgba(255,255,255,0.1)',
              color: step >= s.n ? (step === s.n ? tok.blue : '#fff') : 'rgba(255,255,255,0.35)',
            }}>
              {step > s.n ? '✓' : s.n}
            </div>
            {i < STEPS_META.length - 1 && (
              <div style={{ flex: 1, height: 2, margin: '0 6px', background: step > s.n ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.12)' }} />
            )}
          </div>
        ))}
      </div>
    </header>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
      <div style={{ width: 3, height: 18, borderRadius: 2, background: tok.blue, flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: tok.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
      </p>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 12, fontWeight: 600, color: tok.muted,
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}{required && <span style={{ color: '#e53e3e', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10,
      padding: '12px 16px', fontSize: 14, color: '#b91c1c', display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
      <span>{msg}</span>
    </div>
  );
}

function Btn({ onClick, type = 'button', disabled, variant = 'primary', fullWidth, children }) {
  const base = {
    padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .15s',
    border: 'none', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', gap: 8, whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
  };
  if (variant === 'primary') return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...base, width: '100%', background: disabled ? '#a0aec0' : tok.blue, color: '#fff',
      boxShadow: disabled ? 'none' : `0 1px 3px rgba(0,89,137,.25)`,
    }}>{children}</button>
  );
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...base, background: 'transparent', color: tok.muted,
      border: `1.5px solid ${tok.border}`,
    }}>{children}</button>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function ReinscriptionPortail() {
  const [config, setConfig]         = useState(DEFAULT_CONFIG);
  const [configLoading, setConfigLoading] = useState(true);
  const [isMobile, setIsMobile]     = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'reinscription_config'))
      .then(snap => { if (snap.exists()) setConfig({ ...DEFAULT_CONFIG, ...snap.data() }); })
      .catch(() => {})
      .finally(() => setConfigLoading(false));

    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const fn = e => setIsMobile(e.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const [step, setStep]             = useState(1);
  const [cin, setCin]               = useState('');
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    nom: '', prenom: '', telephone: '', email: '',
    adresse: '', ville: '',
    niveauReinscription: '', filiere: '',
    contactUrgenceNom: '', contactUrgenceTel: '', contactUrgenceLien: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSearch = (e) => {
    e.preventDefault();
    const cinNorm = cin.trim().toUpperCase();
    if (!cinNorm || cinNorm.length < 4) { setError('CIN invalide — vérifiez la saisie.'); return; }
    setError('');
    setStep(2);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('Le fichier dépasse 5 Mo.'); return; }
    setFile(f);
    setError('');
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setFilePreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  };

  const handleStep2 = (e) => {
    e.preventDefault();
    if (!form.niveauReinscription) { setError('Veuillez sélectionner votre niveau de réinscription.'); return; }
    setError('');
    setStep(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const cinNorm = cin.trim().toUpperCase();
      await addDoc(collection(db, 'reinscriptions'), {
        cin: cinNorm,
        nom: form.nom.trim().toUpperCase(),
        prenom: form.prenom.trim(),
        anneeAcademique: config.anneeReinscription,
        niveauReinscription: form.niveauReinscription,
        filiere: form.filiere,
        montantPaye: config.montant,
        telephone: form.telephone,
        email: form.email,
        adresse: form.adresse,
        ville: form.ville,
        contactUrgenceNom: form.contactUrgenceNom,
        contactUrgenceTel: form.contactUrgenceTel,
        contactUrgenceLien: form.contactUrgenceLien,
        justificatifStatut: 'a_fournir',
        statut: 'en_attente',
        createdAt: new Date(),
      });
      setSuccess(true);
    } catch (err) {
      setError("Erreur lors de l'envoi : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Full-page states ────────────────────────────────────────── */
  if (configLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tok.blueTint, fontFamily: "'Inter', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: `3px solid ${tok.border}`, borderTopColor: tok.blue, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: tok.muted, fontSize: 14 }}>Chargement du portail…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!config.actif) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tok.blueTint, fontFamily: "'Inter', sans-serif", padding: 24 }}>
      <div style={{ background: tok.surface, borderRadius: 20, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: tok.blueTint, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={tok.muted} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        </div>
        <img src="/Logo IFTL avec Signature.png" alt="IFTL" style={{ height: 36, objectFit: 'contain', marginBottom: 20, opacity: 0.7 }} />
        <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800, color: tok.ink, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Campagne fermée</h2>
        <p style={{ margin: '0 0 8px', fontSize: 15, color: tok.muted, lineHeight: 1.6 }}>
          Les réinscriptions pour l'année <strong style={{ color: tok.ink }}>{config.anneeReinscription}</strong> ne sont pas encore ouvertes.
        </p>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: tok.muted }}>Contactez la scolarité pour plus d'informations.</p>
        <a href="mailto:scolarite@iftl.ma" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px',
          background: tok.blueTint, border: `1.5px solid ${tok.border}`, borderRadius: 10,
          fontSize: 14, fontWeight: 600, color: tok.blue, textDecoration: 'none',
        }}>scolarite@iftl.ma</a>
      </div>
    </div>
  );

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: tok.blueTint, fontFamily: "'Inter', sans-serif", padding: 24 }}>
      <div style={{ background: tok.surface, borderRadius: 20, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={tok.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 800, color: tok.ink, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Demande envoyée !</h2>
        <p style={{ margin: '0 0 8px', fontSize: 15, color: tok.muted, lineHeight: 1.7 }}>
          Votre demande de réinscription pour <strong style={{ color: tok.ink }}>{form.niveauReinscription}</strong> — année <strong style={{ color: tok.ink }}>{config.anneeReinscription}</strong> a été reçue.
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: tok.muted, lineHeight: 1.6 }}>
          La scolarité vous contactera sous <strong>48 h</strong> pour confirmation.
        </p>
        <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '14px 18px', marginBottom: 32, textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
            <strong>Important :</strong> apportez votre reçu de virement bancaire ou chèque à la scolarité IFTL pour finaliser votre dossier.
          </p>
        </div>
        <div style={{ padding: '16px 20px', background: tok.blueTint, borderRadius: 12, display: 'inline-block', width: '100%', boxSizing: 'border-box' }}>
          <p style={{ margin: 0, fontSize: 13, color: tok.muted }}>Référence · <strong style={{ color: tok.ink, fontFamily: 'monospace' }}>{cin.trim().toUpperCase()}</strong> — {form.prenom} {form.nom.toUpperCase()}</p>
        </div>
      </div>
    </div>
  );

  /* ── Form grid layout ─────────────────────────────────────────── */
  const cinNorm = cin.trim().toUpperCase();

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; }
        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: ${tok.blue} !important;
          box-shadow: 0 0 0 3px rgba(0,89,137,0.12) !important;
        }
        button:focus-visible { outline: 2px solid ${tok.blue}; outline-offset: 2px; }
        .reinsc-sidebar {
          width: 280px;
          flex-shrink: 0;
          position: sticky;
          top: 0;
          height: 100vh;
          padding: 44px 32px;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(circle, rgba(255,255,255,0.065) 1px, transparent 1px) 0 0 / 22px 22px,
            linear-gradient(160deg, ${tok.blueDeep} 0%, ${tok.blue} 55%, ${tok.blueLight} 100%);
          overflow: hidden;
        }
        .reinsc-mobile-header { display: none; }
        @media (max-width: 767px) {
          .reinsc-sidebar { display: none; }
          .reinsc-mobile-header { display: block; }
          .reinsc-main { padding: 24px 20px !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .form-step { animation: fadeUp 0.25s ease both; }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Inter', sans-serif", background: tok.blueTint }}>

        {/* ── Left sidebar ── */}
        <div className="reinsc-sidebar">
          {/* Logo */}
          <div style={{ marginBottom: 44 }}>
            <img src="/Logo IFTL avec Signature.png" alt="IFTL" style={{ height: 42, objectFit: 'contain', marginBottom: 24, filter: 'brightness(0) invert(1)' }} />
            <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.25, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Portail de<br/>Réinscription
            </h1>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.12)', borderRadius: 20, padding: '4px 12px',
              fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.06em',
            }}>ANNÉE {config.anneeReinscription}</span>
          </div>

          {/* Vertical step timeline */}
          <SidebarTimeline step={step} />

          {/* Bottom contact */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 24 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Besoin d'aide ?</p>
            <a href="mailto:scolarite@iftl.ma" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>
              scolarite@iftl.ma
            </a>
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>IFTL · Nouaceur</p>
          </div>
        </div>

        {/* ── Mobile header ── */}
        <div className="reinsc-mobile-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 30 }}>
          <MobileHeader step={step} annee={config.anneeReinscription} />
        </div>

        {/* ── Right form panel ── */}
        <div className="reinsc-main" style={{
          flex: 1, overflowY: 'auto', padding: '52px 64px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ width: '100%', maxWidth: 520, paddingTop: isMobile ? 100 : 0 }}>

            {/* ── Step 1: CIN ── */}
            {step === 1 && (
              <form className="form-step" onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: tok.blue, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Étape 1</p>
                  <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: tok.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", textWrap: 'balance' }}>Identification</h2>
                  <p style={{ margin: 0, fontSize: 15, color: tok.muted, lineHeight: 1.6 }}>Saisissez votre numéro de CIN pour accéder au formulaire de réinscription.</p>
                </div>

                <div style={{ background: tok.surface, borderRadius: 16, border: `1.5px solid ${tok.border}`, padding: '32px 28px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <Field label="Numéro CIN" required>
                    <input
                      value={cin}
                      onChange={e => setCin(e.target.value.toUpperCase())}
                      placeholder="Ex : AB123456"
                      maxLength={20}
                      autoFocus
                      style={{
                        ...inputS, textAlign: 'center', letterSpacing: '0.15em',
                        fontSize: 20, fontWeight: 700, fontFamily: 'monospace', padding: '14px 18px',
                      }}
                    />
                  </Field>
                  <p style={{ margin: '10px 0 0', fontSize: 12, color: tok.muted, textAlign: 'center' }}>
                    Carte nationale d'identité marocaine — ex. AB123456, C123456, K123456
                  </p>
                </div>

                <ErrorBox msg={error} />

                <Btn type="submit" variant="primary" disabled={!cin.trim()} style={{ width: '100%' }}>
                  Continuer →
                </Btn>
              </form>
            )}

            {/* ── Step 2: Informations ── */}
            {step === 2 && (
              <form className="form-step" onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: tok.blue, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Étape 2</p>
                  <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: tok.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", textWrap: 'balance' }}>Vos informations</h2>
                  <p style={{ margin: 0, fontSize: 15, color: tok.muted, lineHeight: 1.6 }}>Renseignez vos coordonnées pour l'année <strong style={{ color: tok.ink }}>{config.anneeReinscription}</strong>.</p>
                </div>

                {/* CIN pill */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: `${tok.blue}12`, border: `1.5px solid ${tok.blue}28`, borderRadius: 12, padding: '12px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={tok.blue} strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, color: tok.blue, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CIN</p>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: tok.ink, fontFamily: 'monospace', letterSpacing: '0.1em' }}>{cinNorm}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setStep(1); setError(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: tok.muted, padding: '4px 8px', borderRadius: 6, fontFamily: 'inherit' }}>
                    Modifier
                  </button>
                </div>

                {/* Niveau / Filière */}
                <div style={{ background: tok.surface, borderRadius: 16, border: `1.5px solid ${tok.border}`, padding: '24px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <SectionTitle>Réinscription en</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Niveau" required>
                      <select value={form.niveauReinscription} onChange={e => set('niveauReinscription', e.target.value)} required style={{ ...inputS, cursor: 'pointer' }}>
                        <option value="">— Sélectionner —</option>
                        {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </Field>
                    <Field label="Filière">
                      <select value={form.filiere} onChange={e => set('filiere', e.target.value)} style={{ ...inputS, cursor: 'pointer' }}>
                        <option value="">— Optionnel —</option>
                        {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Identity */}
                <div style={{ background: tok.surface, borderRadius: 16, border: `1.5px solid ${tok.border}`, padding: '24px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <SectionTitle>État civil</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <Field label="Prénom" required>
                      <input value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Votre prénom" required style={inputS} />
                    </Field>
                    <Field label="Nom" required>
                      <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Votre nom" required style={inputS} />
                    </Field>
                    <Field label="Téléphone" required>
                      <input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 00 00 00 00" required style={inputS} />
                    </Field>
                    <Field label="Email" required>
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="vous@email.ma" required style={inputS} />
                    </Field>
                    <Field label="Adresse">
                      <input value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="Rue, quartier…" style={inputS} />
                    </Field>
                    <Field label="Ville">
                      <input value={form.ville} onChange={e => set('ville', e.target.value)} placeholder="Casablanca…" style={inputS} />
                    </Field>
                  </div>
                </div>

                {/* Contact urgence */}
                <div style={{ background: tok.surface, borderRadius: 16, border: `1.5px solid ${tok.border}`, padding: '24px 24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <SectionTitle>Contact d'urgence</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                    <Field label="Nom et prénom">
                      <input value={form.contactUrgenceNom} onChange={e => set('contactUrgenceNom', e.target.value)} placeholder="Nom complet" style={inputS} />
                    </Field>
                    <Field label="Téléphone">
                      <input value={form.contactUrgenceTel} onChange={e => set('contactUrgenceTel', e.target.value)} placeholder="06 00 00 00 00" style={inputS} />
                    </Field>
                    <Field label="Lien">
                      <select value={form.contactUrgenceLien} onChange={e => set('contactUrgenceLien', e.target.value)} style={{ ...inputS, cursor: 'pointer' }}>
                        <option value="">— Lien —</option>
                        {LIENS_URGENCE.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <ErrorBox msg={error} />

                <div style={{ display: 'flex', gap: 12 }}>
                  <Btn variant="ghost" onClick={() => { setStep(1); setError(''); }}>← Retour</Btn>
                  <div style={{ flex: 1 }}>
                    <Btn type="submit" variant="primary">Continuer →</Btn>
                  </div>
                </div>
              </form>
            )}

            {/* ── Step 3: Payment confirmation ── */}
            {step === 3 && (
              <form className="form-step" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                <div>
                  <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: tok.blue, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Étape 3</p>
                  <h2 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 800, color: tok.ink, fontFamily: "'Plus Jakarta Sans', sans-serif", textWrap: 'balance' }}>Paiement</h2>
                  <p style={{ margin: 0, fontSize: 15, color: tok.muted, lineHeight: 1.6 }}>Effectuez votre versement selon les informations ci-dessous, puis soumettez votre demande.</p>
                </div>

                {/* Receipt-style payment box */}
                <div style={{ background: tok.surface, borderRadius: 16, overflow: 'hidden', border: `1.5px solid ${tok.border}`, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <div style={{ background: tok.blue, padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Frais de réinscription</p>
                    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                      {config.montant.toLocaleString('fr-MA')} <span style={{ fontSize: 14 }}>DH</span>
                    </p>
                  </div>
                  <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { k: 'Bénéficiaire', v: config.beneficiaire },
                      { k: 'Mode de paiement', v: 'Virement bancaire ou chèque' },
                      { k: 'Référence à indiquer', v: `${cinNorm} — ${form.prenom} ${form.nom.toUpperCase()}` },
                    ].map(({ k, v }) => (
                      <div key={k} style={{ display: 'grid', gridTemplateColumns: '148px 1fr', gap: 12, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: tok.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{k}</span>
                        <span style={{ fontSize: 13, fontWeight: 500, color: tok.ink, lineHeight: 1.5 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Physical receipt notice */}
                <div style={{ display: 'flex', gap: 14, background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 14, padding: '16px 18px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#92400e' }}>Conservez votre reçu de paiement</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#92400e', lineHeight: 1.6 }}>
                      Apportez le justificatif original (reçu de virement ou chèque remis) à la <strong>scolarité IFTL</strong> lors de votre prochaine visite pour valider votre inscription.
                    </p>
                  </div>
                </div>

                {/* Summary recap */}
                <div style={{ background: tok.surface, borderRadius: 14, border: `1.5px solid ${tok.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 20px', borderBottom: `1px solid ${tok.border}`, background: tok.blueTint }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: tok.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Récapitulatif de votre demande</p>
                  </div>
                  <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { k: 'Apprenant', v: `${form.prenom} ${form.nom.toUpperCase()}` },
                      { k: 'CIN', v: cinNorm },
                      { k: 'Niveau', v: form.niveauReinscription, accent: true },
                      form.filiere && { k: 'Filière', v: form.filiere },
                      { k: 'Année académique', v: config.anneeReinscription },
                    ].filter(Boolean).map(({ k, v, accent }) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
                        <span style={{ fontSize: 13, color: tok.muted }}>{k}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: accent ? tok.blue : tok.ink }}>{v}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${tok.border}`, paddingTop: 10, marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 13, color: tok.muted }}>Montant à verser</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: tok.blue, fontFamily: "'Plus Jakarta Sans', sans-serif", fontVariantNumeric: 'tabular-nums' }}>{config.montant.toLocaleString('fr-MA')} DH</span>
                    </div>
                  </div>
                </div>

                <ErrorBox msg={error} />

                <div style={{ display: 'flex', gap: 12 }}>
                  <Btn variant="ghost" onClick={() => { setStep(2); setError(''); }}>← Retour</Btn>
                  <div style={{ flex: 1 }}>
                    <Btn type="submit" variant="primary" disabled={submitting}>
                      {submitting
                        ? <><span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} /> Envoi en cours…</>
                        : 'Soumettre ma demande'
                      }
                    </Btn>
                  </div>
                </div>

                <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: tok.muted }}>
                  En soumettant, vous confirmez que les informations fournies sont exactes.
                </p>
              </form>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
