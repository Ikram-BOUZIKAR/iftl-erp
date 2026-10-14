import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

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
  success:   '#059669',
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
  const [form, setForm] = useState({ nom: '', prenom: '', cin: '', niveau: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.nom.trim())    e.nom    = 'Obligatoire';
    if (!form.prenom.trim()) e.prenom = 'Obligatoire';
    if (!form.cin.trim())    e.cin    = 'Obligatoire';
    if (!form.niveau)        e.niveau = 'Sélectionner un niveau';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await addDoc(collection(db, 'justificatifs_paiement'), {
        nom:         form.nom.trim().toUpperCase(),
        prenom:      form.prenom.trim(),
        cin:         form.cin.trim().toUpperCase(),
        niveau:      form.niveau,
        niveauLabel: NIVEAUX.find(n => n.value === form.niveau)?.label || form.niveau,
        statut:      'en_attente',
        createdAt:   new Date(),
      });
      setDone(true);
    } catch (err) {
      alert('Erreur lors de l\'envoi : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: tok.blueTint, fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ background: tok.blueDeep, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src="/Logo IFTL avec Signature.png" alt="IFTL" style={{ height: 40, objectFit: 'contain' }} />
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#fff' }}>Dépôt justificatif de paiement</p>
          <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>Institut de Formation Transport & Logistique</p>
        </div>
      </header>

      {/* Card */}
      <div style={{ maxWidth: 460, margin: '48px auto', padding: '0 16px 48px' }}>
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
                Demande envoyée !
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 14, color: tok.muted, lineHeight: 1.6 }}>
                Votre dépôt de justificatif a bien été enregistré. L'équipe IFTL le traitera dans les plus brefs délais.
              </p>
              <button
                onClick={() => { setForm({ nom: '', prenom: '', niveau: '' }); setDone(false); }}
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
                Renseignez vos informations pour déposer votre justificatif de paiement.
              </p>

              <form onSubmit={handleSubmit} noValidate>
                <Field label="Nom" required error={errors.nom}>
                  <input
                    type="text" value={form.nom}
                    onChange={e => set('nom', e.target.value)}
                    placeholder="Votre nom de famille"
                    style={{ ...inputS, borderColor: errors.nom ? tok.error : tok.border, textTransform: 'uppercase' }}
                  />
                </Field>

                <Field label="Prénom" required error={errors.prenom}>
                  <input
                    type="text" value={form.prenom}
                    onChange={e => set('prenom', e.target.value)}
                    placeholder="Votre prénom"
                    style={{ ...inputS, borderColor: errors.prenom ? tok.error : tok.border }}
                  />
                </Field>

                <Field label="CIN" required error={errors.cin}>
                  <input
                    type="text" value={form.cin}
                    onChange={e => set('cin', e.target.value.toUpperCase())}
                    placeholder="Ex : BE123456"
                    maxLength={20}
                    style={{ ...inputS, borderColor: errors.cin ? tok.error : tok.border, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                </Field>

                <Field label="Niveau" required error={errors.niveau}>
                  <select
                    value={form.niveau}
                    onChange={e => set('niveau', e.target.value)}
                    style={{ ...inputS, borderColor: errors.niveau ? tok.error : tok.border }}>
                    <option value="">Sélectionner votre niveau…</option>
                    {NIVEAUX.map(n => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                </Field>

                <button
                  type="submit"
                  disabled={saving}
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
