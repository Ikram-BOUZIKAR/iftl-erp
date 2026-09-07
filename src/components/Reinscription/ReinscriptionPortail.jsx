import { useState, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';

const MONTANT = 8500;
const ANNEE_REINSCRIPTION = '2027-2028';

const LIENS_URGENCE = ['Parent', 'Tuteur', 'Conjoint(e)', 'Frère / Sœur', 'Ami(e)', 'Autre'];

function StepDot({ n, active, done }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
      done ? 'bg-[#005989] text-white' : active ? 'bg-[#005989] text-white ring-4 ring-[#005989]/20' : 'bg-slate-100 text-slate-400'
    }`}>
      {done ? '✓' : n}
    </div>
  );
}

function StepBar({ step }) {
  const steps = ['Identification', 'Vos informations', 'Paiement & envoi'];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} />
            <span className={`text-xs font-medium hidden sm:block ${step >= i + 1 ? 'text-[#005989]' : 'text-slate-400'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 transition-colors ${step > i + 1 ? 'bg-[#005989]' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white placeholder-slate-300';
const readonlyCls = 'w-full text-sm border border-slate-100 rounded-xl px-3.5 py-2.5 bg-slate-50 text-slate-600 cursor-default';

export default function ReinscriptionPortail() {
  const [step, setStep] = useState(1);
  const [cin, setCin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  // Step 2 — contact info (rempli par l'apprenant lui-même)
  const [form, setForm] = useState({
    nom: '', prenom: '', telephone: '', email: '',
    adresse: '', ville: '',
    contactUrgenceNom: '', contactUrgenceTel: '', contactUrgenceLien: '',
  });

  // Step 3 — payment proof
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── Step 1: validate CIN format and advance ─────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault();
    const cinNorm = cin.trim().toUpperCase();
    if (!cinNorm) { setError('Veuillez saisir votre numéro CIN.'); return; }
    if (cinNorm.length < 4) { setError('CIN invalide — vérifiez la saisie.'); return; }
    setError('');
    setStep(2);
  };

  // ── Step 3: file selection ──────────────────────────────────────────────────
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

  // ── Step 3: submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Veuillez joindre le justificatif de paiement.'); return; }
    setError('');
    setSubmitting(true);
    try {
      // Upload justificatif to Firebase Storage
      const cinNorm = cin.trim().toUpperCase();
      const ext = file.name.split('.').pop();
      const storageRef = ref(storage, `reinscriptions/${cinNorm}/${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const justificatifUrl = await getDownloadURL(storageRef);

      // Save to Firestore
      await addDoc(collection(db, 'reinscriptions'), {
        cin: cinNorm,
        nom: form.nom.trim().toUpperCase(),
        prenom: form.prenom.trim(),
        anneeAcademique: ANNEE_REINSCRIPTION,
        montantPaye: MONTANT,
        telephone: form.telephone,
        email: form.email,
        adresse: form.adresse,
        ville: form.ville,
        contactUrgenceNom: form.contactUrgenceNom,
        contactUrgenceTel: form.contactUrgenceTel,
        contactUrgenceLien: form.contactUrgenceLien,
        justificatifUrl,
        justificatifNom: file.name,
        statut: 'en_attente',
        createdAt: new Date(),
      });

      setSuccess(true);
    } catch (err) {
      setError('Erreur lors de l\'envoi : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Demande envoyée !</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Votre demande de réinscription pour l'année <strong>{ANNEE_REINSCRIPTION}</strong> a été reçue.
            La scolarité vous contactera sous 48 h pour confirmer votre inscription.
          </p>
          <p className="text-xs text-slate-400 mt-4">
            Conservez votre reçu de paiement jusqu'à confirmation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-[#005989] text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src="/Logo IFTL avec Signature.png" alt="IFTL" className="h-10 object-contain" />
          <div>
            <p className="font-bold text-sm leading-tight">Portail de réinscription</p>
            <p className="text-xs text-white/70">Année académique {ANNEE_REINSCRIPTION}</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
          <StepBar step={step} />

          {/* ── Step 1: CIN ─────────────────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Identification</h2>
                <p className="text-slate-500 text-sm mt-1">Saisissez votre numéro de CIN pour accéder à votre dossier.</p>
              </div>
              <Field label="Numéro CIN" required>
                <input
                  value={cin}
                  onChange={e => setCin(e.target.value.toUpperCase())}
                  placeholder="Ex : AB123456"
                  maxLength={20}
                  className={inputCls + ' text-center tracking-widest text-base font-mono uppercase'}
                  autoFocus
                />
              </Field>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <button
                type="submit"
                disabled={!cin.trim()}
                className="w-full py-3 bg-[#005989] hover:bg-[#004a73] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                Continuer →
              </button>
              <p className="text-center text-xs text-slate-400">
                En difficulté ? Contactez la scolarité à <a href="mailto:scolarite@iftl.ma" className="text-[#005989] underline">scolarite@iftl.ma</a>
              </p>
            </form>
          )}

          {/* ── Step 2: Fill info ───────────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={e => { e.preventDefault(); setStep(3); }} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Vos informations</h2>
                <p className="text-slate-500 text-sm">Renseignez vos coordonnées pour l'année <strong>{ANNEE_REINSCRIPTION}</strong>.</p>
              </div>

              {/* CIN recap */}
              <div className="bg-[#005989]/5 border border-[#005989]/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                <svg className="w-4 h-4 text-[#005989] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                <div>
                  <p className="text-xs text-[#005989] font-semibold">CIN</p>
                  <p className="font-mono font-bold text-slate-800 tracking-wider">{cin.trim().toUpperCase()}</p>
                </div>
                <button type="button" onClick={() => setStep(1)}
                  className="ml-auto text-xs text-slate-400 hover:text-[#005989] transition underline">
                  Modifier
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Prénom" required>
                  <input value={form.prenom} onChange={e => set('prenom', e.target.value)}
                    placeholder="Votre prénom" required className={inputCls} />
                </Field>
                <Field label="Nom" required>
                  <input value={form.nom} onChange={e => set('nom', e.target.value)}
                    placeholder="Votre nom" required className={inputCls} />
                </Field>
                <Field label="Téléphone" required>
                  <input value={form.telephone} onChange={e => set('telephone', e.target.value)}
                    placeholder="06 00 00 00 00" required className={inputCls} />
                </Field>
                <Field label="Email" required>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="vous@email.ma" required className={inputCls} />
                </Field>
                <Field label="Adresse">
                  <input value={form.adresse} onChange={e => set('adresse', e.target.value)}
                    placeholder="Rue, quartier…" className={inputCls} />
                </Field>
                <Field label="Ville">
                  <input value={form.ville} onChange={e => set('ville', e.target.value)}
                    placeholder="Casablanca…" className={inputCls} />
                </Field>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Contact d'urgence</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Nom et prénom">
                    <input value={form.contactUrgenceNom} onChange={e => set('contactUrgenceNom', e.target.value)}
                      placeholder="Nom complet" className={inputCls} />
                  </Field>
                  <Field label="Téléphone">
                    <input value={form.contactUrgenceTel} onChange={e => set('contactUrgenceTel', e.target.value)}
                      placeholder="06 00 00 00 00" className={inputCls} />
                  </Field>
                  <Field label="Lien">
                    <select value={form.contactUrgenceLien} onChange={e => set('contactUrgenceLien', e.target.value)}
                      className={inputCls}>
                      <option value="">— Lien —</option>
                      {LIENS_URGENCE.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </Field>
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                  Retour
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-[#005989] hover:bg-[#004a73] text-white font-semibold rounded-xl transition-colors text-sm">
                  Continuer →
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: Payment + upload ─────────────────────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Paiement de la réinscription</h2>
                <p className="text-slate-500 text-sm">Joignez le justificatif de votre versement pour finaliser votre demande.</p>
              </div>

              {/* Payment info box */}
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-amber-800">Frais de réinscription</p>
                  <p className="text-2xl font-black text-amber-700">{MONTANT.toLocaleString('fr-MA')} DH</p>
                </div>
                <div className="text-xs text-amber-700 space-y-1">
                  <p><span className="font-semibold">Bénéficiaire :</span> IFTL — Institut de Formation aux Métiers du Transport et de la Logistique</p>
                  <p><span className="font-semibold">Mode de paiement :</span> Virement bancaire, chèque ou espèces à la caisse IFTL</p>
                  <p><span className="font-semibold">Référence :</span> {cin.trim().toUpperCase()} — {form.prenom} {form.nom.toUpperCase()}</p>
                </div>
              </div>

              {/* File upload */}
              <div>
                <Field label="Justificatif de paiement" required>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
                      file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-[#005989] hover:bg-blue-50'
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFile}
                      className="hidden"
                    />
                    {file ? (
                      <div className="space-y-2">
                        {filePreview ? (
                          <img src={filePreview} alt="Aperçu" className="max-h-40 mx-auto rounded-lg object-contain" />
                        ) : (
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        )}
                        <p className="text-sm font-medium text-emerald-700">{file.name}</p>
                        <p className="text-xs text-slate-400">Cliquez pour changer</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-700">Cliquez pour joindre le reçu de paiement</p>
                        <p className="text-xs text-slate-400 mt-1">Photo, scan ou PDF — max 5 Mo</p>
                      </>
                    )}
                  </div>
                </Field>
              </div>

              {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>}

              {/* Summary */}
              <div className="bg-slate-50 rounded-2xl p-4 text-sm space-y-2">
                <p className="font-semibold text-slate-700 mb-3">Récapitulatif</p>
                <div className="flex justify-between text-slate-600">
                  <span>Apprenant</span>
                  <span className="font-medium">{form.prenom} {form.nom.toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Année de réinscription</span>
                  <span className="font-medium">{ANNEE_REINSCRIPTION}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Montant</span>
                  <span className="font-bold text-[#005989]">{MONTANT.toLocaleString('fr-MA')} DH</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)}
                  className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                  Retour
                </button>
                <button type="submit" disabled={submitting || !file}
                  className="flex-1 py-2.5 bg-[#005989] hover:bg-[#004a73] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm">
                  {submitting ? 'Envoi en cours…' : 'Soumettre ma demande de réinscription'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          IFTL — Institut de Formation aux Métiers du Transport et de la Logistique · Nouaceur
        </p>
      </main>
    </div>
  );
}
