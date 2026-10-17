import { useState, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useBranding } from '../../contexts/BrandingContext';
import { getCurrencySymbol } from '../../utils/currency';

const INST_NAME = import.meta.env.VITE_DEFAULT_INSTITUTE_NAME || 'IFTL';

const NIVEAUX = [
  { value: 'licence_cnam',         label: 'Licence CNAM' },
  { value: 'licence_transitaire',  label: 'Licence Transitaire' },
  { value: 'mastere_mlai',         label: 'Mastère MLAI' },
];

const tok = {
  blue:      '#005989',
  blueDeep:  '#003c5a',
  blueTint:  '#f0f6fb',
  surface:   '#ffffff',
  ink:       '#1a2c3d',
  muted:     '#5e7a91',
  border:    '#dce8f0',
  error:     '#dc2626',
};

const inputS = {
  width: '100%', fontSize: 14, fontFamily: 'inherit',
  border: `1.5px solid ${tok.border}`, borderRadius: 10,
  padding: '11px 14px', outline: 'none',
  background: tok.surface, color: tok.ink,
  transition: 'border-color .15s',
  boxSizing: 'border-box', appearance: 'none',
};

// Compress image on canvas or read PDF as base64 data URL
function toBase64(file) {
  return new Promise((resolve, reject) => {
    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = url;
    } else {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', marginBottom: 6,
        fontSize: 12, fontWeight: 700, color: tok.muted,
        textTransform: 'uppercase', letterSpacing: '0.07em',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        {label} {required && <span style={{ color: tok.error }}>*</span>}
      </label>
      {children}
      {error && <p style={{ margin: '5px 0 0', fontSize: 12, color: tok.error }}>{error}</p>}
    </div>
  );
}

export default function JustificatifPaiementPortail() {
  const { branding } = useBranding();
  const currSymbol = getCurrencySymbol(branding.devise);
  const [form, setForm] = useState({ nom: '', prenom: '', cin: '', telephone: '', niveau: '', montantPaye: '' });
  const [fichier, setFichier] = useState(null);
  const [errors, setErrors]   = useState({});
  const [saving, setSaving]   = useState(false);
  const [done, setDone]       = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const fileRef = useRef(null);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // For PDFs limit to 700KB (base64 ~933KB < Firestore 1MB doc limit)
    if (f.type === 'application/pdf' && f.size > 700 * 1024) {
      setErrors(er => ({ ...er, fichier: 'PDF trop lourd (max 700 Ko). Prenez une photo du reçu en JPEG/PNG.' }));
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setErrors(er => ({ ...er, fichier: 'Fichier trop lourd (max 8 Mo pour les images)' }));
      return;
    }
    setFichier(f);
    setErrors(er => ({ ...er, fichier: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.nom.trim())    e.nom     = 'Obligatoire';
    if (!form.prenom.trim()) e.prenom  = 'Obligatoire';
    if (!form.cin.trim())    e.cin     = 'Obligatoire';
    if (!form.telephone.trim()) e.telephone = 'Obligatoire';
    if (!form.niveau)        e.niveau  = 'Sélectionner un niveau';
    if (!form.montantPaye || isNaN(Number(form.montantPaye)) || Number(form.montantPaye) <= 0)
      e.montantPaye = 'Indiquer le montant payé';
    if (!fichier)            e.fichier = 'Veuillez joindre votre justificatif';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const dataUrl = await toBase64(fichier);
      await addDoc(collection(db, 'justificatifs_paiement'), {
        nom:             form.nom.trim().toUpperCase(),
        prenom:          form.prenom.trim(),
        cin:             form.cin.trim().toUpperCase(),
        telephone:       form.telephone.trim(),
        niveau:          form.niveau,
        niveauLabel:     NIVEAUX.find(n => n.value === form.niveau)?.label || form.niveau,
        montantPaye:     Number(form.montantPaye),
        justificatifData: dataUrl,
        justificatifNom:  fichier.name,
        justificatifType: fichier.type,
        statut:          'en_attente',
        createdAt:       new Date(),
      });
      setDone(true);
    } catch (err) {
      setSubmitError(err?.message || 'Erreur lors de l\'envoi. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm({ nom: '', prenom: '', cin: '', telephone: '', niveau: '', montantPaye: '' });
    setFichier(null);
    setErrors({});
    setSubmitError(null);
    setDone(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: tok.blueTint, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <header style={{ background: tok.blueDeep, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {import.meta.env.VITE_DEFAULT_LOGO_URL
          ? <img src={import.meta.env.VITE_DEFAULT_LOGO_URL} alt={INST_NAME} style={{ height: 40, objectFit: 'contain' }} />
          : <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>{INST_NAME}</span>
        }
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>Dépôt justificatif de paiement</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{INST_NAME}</p>
        </div>
      </header>

      <div style={{ maxWidth: 460, margin: '40px auto', padding: '0 16px 48px' }}>
        <div style={{
          background: tok.surface, borderRadius: 20,
          boxShadow: '0 4px 24px rgba(0,89,137,0.10)',
          padding: '36px 32px',
        }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', fontSize: 30,
              }}>✓</div>
              <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: tok.ink }}>
                Dépôt envoyé !
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: tok.muted, lineHeight: 1.6 }}>
                Votre justificatif a bien été reçu. L'équipe {INST_NAME} le traitera dans les plus brefs délais.
              </p>
              <button onClick={reset}
                style={{
                  background: tok.blue, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}>
                Nouveau dépôt
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: tok.ink }}>
                Informations
              </h2>
              <p style={{ margin: '0 0 28px', fontSize: 13, color: tok.muted }}>
                Renseignez vos informations et joignez votre reçu de paiement.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <Field label="Nom" required error={errors.nom}>
                  <input type="text" value={form.nom}
                    onChange={e => set('nom', e.target.value)}
                    placeholder="Votre nom de famille"
                    style={{ ...inputS, borderColor: errors.nom ? tok.error : tok.border, textTransform: 'uppercase' }} />
                </Field>

                <Field label="Prénom" required error={errors.prenom}>
                  <input type="text" value={form.prenom}
                    onChange={e => set('prenom', e.target.value)}
                    placeholder="Votre prénom"
                    style={{ ...inputS, borderColor: errors.prenom ? tok.error : tok.border }} />
                </Field>

                <Field label="CIN" required error={errors.cin}>
                  <input type="text" value={form.cin}
                    onChange={e => set('cin', e.target.value.toUpperCase())}
                    placeholder="Ex : BE123456"
                    maxLength={20}
                    style={{ ...inputS, borderColor: errors.cin ? tok.error : tok.border, textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                </Field>

                <Field label="Téléphone" required error={errors.telephone}>
                  <input type="tel" value={form.telephone}
                    onChange={e => set('telephone', e.target.value)}
                    placeholder="Ex : 06 12 34 56 78"
                    style={{ ...inputS, borderColor: errors.telephone ? tok.error : tok.border }} />
                </Field>

                <Field label={`Montant payé (${currSymbol})`} required error={errors.montantPaye}>
                  <div style={{ position: 'relative' }}>
                    <input type="number" min="1" step="1" value={form.montantPaye}
                      onChange={e => set('montantPaye', e.target.value)}
                      placeholder="Ex : 3500"
                      style={{ ...inputS, borderColor: errors.montantPaye ? tok.error : tok.border, paddingRight: 54 }} />
                    <span style={{
                      position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 12, fontWeight: 700, color: tok.muted, pointerEvents: 'none',
                    }}>{currSymbol}</span>
                  </div>
                </Field>

                <Field label="Niveau" required error={errors.niveau}>
                  <select value={form.niveau} onChange={e => set('niveau', e.target.value)}
                    style={{ ...inputS, borderColor: errors.niveau ? tok.error : tok.border }}>
                    <option value="">Sélectionner votre niveau…</option>
                    {NIVEAUX.map(n => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </Field>

                {/* File picker */}
                <Field label="Justificatif de paiement" required error={errors.fichier}>
                  <input ref={fileRef} type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={handleFile}
                    style={{ display: 'none' }} />
                  <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                      border: `2px dashed ${errors.fichier ? tok.error : fichier ? tok.blue : tok.border}`,
                      borderRadius: 12, padding: '20px 16px', textAlign: 'center',
                      cursor: 'pointer', background: fichier ? '#f0f9ff' : '#fafbfc',
                      transition: 'all .2s',
                    }}>
                    {fichier ? (
                      <div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tok.blue }}>
                          📎 {fichier.name}
                        </p>
                        <p style={{ margin: '4px 0 0', fontSize: 11, color: tok.muted }}>
                          {(fichier.size / 1024).toFixed(0)} Ko — Cliquer pour changer
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p style={{ margin: 0, fontSize: 24 }}>📤</p>
                        <p style={{ margin: '8px 0 4px', fontSize: 14, fontWeight: 700, color: tok.ink }}>
                          Cliquer pour choisir un fichier
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: tok.muted }}>
                          JPEG · PNG · PDF
                        </p>
                      </div>
                    )}
                  </div>
                </Field>

                {submitError && (
                  <div style={{
                    marginBottom: 14, padding: '12px 14px',
                    background: '#fef2f2', border: `1.5px solid ${tok.error}`,
                    borderRadius: 10, fontSize: 13, color: tok.error, fontWeight: 600,
                  }}>
                    ⚠️ {submitError}
                  </div>
                )}

                <button type="submit" disabled={saving}
                  style={{
                    width: '100%', marginTop: 8,
                    background: saving ? '#7aafcc' : tok.blue,
                    color: '#fff', border: 'none', borderRadius: 12,
                    padding: '13px 0', fontSize: 15, fontWeight: 700,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'background .2s',
                  }}>
                  {saving ? 'Envoi en cours…' : 'Déposer le justificatif'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
