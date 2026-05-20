import { useState, useRef } from 'react';

import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyZxdpunUpav7IO7fXNTnInbtGpV0lJGNlBjlsz9u3NP6t2QsQcCEt5cRcnTIU3dEIU/exec';

const FILIERES_BY_CAT = {
  'Formation Professionnelle - TS': [
    'Organisateur(trice) des flux en logistique de production',
    'Organisateur(trice) du transport multimodal',
    'Agent(e) d\'exploitation Logistique',
    'E-commerce et Distribution',
    'Agent(e) en Diagnostic et électronique embarquée',
  ],
  'Formation Professionnelle - Technicien': [
    'Exploitant(e) en transport routier',
    'Gestionnaire en entrepôt',
    'Agent(e) de maintenance des véhicules',
  ],
  'Formation Professionnelle - Qualification': [
    'Conducteur(trice) des véhicules de transport de marchandises',
    'Conducteur(trice) des véhicules de transport de personnes',
    'Opérateur(rice) Logistique',
  ],
  'Formation Supérieure': [
    'Manager Logistique & Achats Industrie (Mastère)',
    'Achat et Supply Chain (Licence Pro)',
    'Transitaire et Gestionnaire des Opérations Douanières (Licence Pro)',
    'Logistique et pilotage des flux (Bachelor)',
  ],
  'Formation Qualifiante': [
    'Conducteur(trice) des véhicules de transport de marchandises',
    'Conducteur(trice) des véhicules de transport de personnes',
    'Cariste',
    'Opérateur(rice) Logistique',
    'Gestionnaire en entrepôt',
    'Agent(e) de maintenance des véhicules',
  ],
  'Formation de Courte Durée': [
    'Eco-conduite : initiation/perfectionnement',
    'FQIMO / FCO',
    'Conduite préventive / Sécurité routière',
    'Réglementation Sociale Européenne',
    'Incendie / Évacuation / Secourisme',
    'Conducteur(trice) livreur',
    'Préparateur(trice) de Commandes',
    'Manutentionnaire : étiquetage, emballage, arrimage',
    'Techniques d\'arrimage du chargement',
    'Cariste : Initiation et recyclage',
    'PEMP - Nacelle élévatrice',
  ],
};
const FILIERES = Object.values(FILIERES_BY_CAT).flat();

const NIVEAUX_FORMATION = ['Technicien Spécialisé (Bac+2)', 'Technicien (Bac+1)', 'Qualification'];
const PROGRAM_TYPES = ['Formation Initiale', 'Formation Continue', 'Apprentissage'];
const MENTIONS_BAC = ['Très Bien', 'Bien', 'Assez Bien', 'Passable'];
const TYPES_LYCEE = ['Public', 'Privé', 'Mission étrangère'];
const SOURCES = ['Réseaux sociaux', 'Bouche à oreille', 'Site web IFTL', 'Conseiller orientation', 'Ancien étudiant', 'Autre'];
const SITUATIONS_PRO = ['Étudiant(e)', 'Demandeur d\'emploi', 'Salarié(e)', 'Entrepreneur(e)', 'Autre'];
const ANNEES_ENTREE = ['2025-2026', '2026-2027'];
const LIENS_URGENCE = ['Parent', 'Tuteur', 'Conjoint(e)', 'Frère/Sœur', 'Ami(e)', 'Autre'];

const REQUIRED_DOCS = [
  { key: 'cin_recto', label: 'CIN Recto', categorie: 'cin_recto', required: true },
  { key: 'cin_verso', label: 'CIN Verso', categorie: 'cin_verso', required: true },
  { key: 'bac', label: 'Bac / Relevé de notes', categorie: 'bac', required: true },
  { key: 'photo', label: 'Photo d\'identité', categorie: 'photo', required: true },
  { key: 'cv', label: 'CV (optionnel)', categorie: 'cv', required: false },
  { key: 'attestation', label: 'Attestation de travail (si salarié)', categorie: 'attestation', required: false },
];

const STEPS = [
  { id: 1, label: 'Identité', icon: '👤' },
  { id: 2, label: 'Baccalauréat', icon: '🎓' },
  { id: 3, label: 'Formation', icon: '📚' },
  { id: 4, label: 'Compléments', icon: '📋' },
  { id: 5, label: 'Documents', icon: '📎' },
];

const INITIAL_FORM = {
  // Personal
  nom: '', prenom: '', dateNaissance: '', cin: '', sexe: '', nationalite: 'Marocaine',
  telephone: '', email: '', adresse: '', ville: '',
  // Academic
  niveau: '', specBac: '', moyenneBac: '', mentionBac: '', anneeBac: '',
  typeLycee: '', massar: '', etablissement: '', situationPro: '',
  // Program
  programType: '', niveauFormation: '', filiere: '', anneeEntree: '',
  dateCourte1: '', dateCourte2: '',
  // Extra
  sourceInfo: '', motivations: '', acceptComm: false,
  // Emergency
  urgenceNom: '', urgenceTel: '', urgenceLien: '',
  // Logistics
  hebergement: '', transport: '', besoinsSpecifiques: '',
};

function Err({ msg }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500 mt-1">{msg}</p>;
}

function Field({ label, name, type = 'text', form, set, errors, required, placeholder, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children || (
        <input
          type={type}
          value={form[name]}
          onChange={e => set(name, e.target.value)}
          placeholder={placeholder}
          className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989] transition ${
            errors[name] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        />
      )}
      <Err msg={errors[name]} />
    </div>
  );
}

function Select({ label, name, form, set, errors, required, options, placeholder = '— Choisir —' }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989] transition ${
          errors[name] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Err msg={errors[name]} />
    </div>
  );
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CandidaturePage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState({}); // { key: File }
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ref, doublon }
  const fileRefs = useRef({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  const setFile = (key, file) => setFiles(f => ({ ...f, [key]: file || null }));

  // ── Validation per step ──────────────────────────────────────────────────
  const validateStep = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.nom.trim()) e.nom = 'Obligatoire';
      if (!form.prenom.trim()) e.prenom = 'Obligatoire';
      if (!form.dateNaissance) e.dateNaissance = 'Obligatoire';
      if (!form.cin.trim()) e.cin = 'Obligatoire';
      if (!form.sexe) e.sexe = 'Obligatoire';
      if (!form.telephone.trim()) e.telephone = 'Obligatoire';
      if (!form.email.trim()) e.email = 'Obligatoire';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide';
      if (!form.adresse.trim()) e.adresse = 'Obligatoire';
      if (!form.ville.trim()) e.ville = 'Obligatoire';
    }
    if (s === 2) {
      if (!form.niveau.trim()) e.niveau = 'Obligatoire';
      if (!form.specBac.trim()) e.specBac = 'Obligatoire';
      if (!form.moyenneBac.trim()) e.moyenneBac = 'Obligatoire';
      if (!form.anneeBac.trim()) e.anneeBac = 'Obligatoire';
      if (!form.etablissement.trim()) e.etablissement = 'Obligatoire';
    }
    if (s === 3) {
      if (!form.programType) e.programType = 'Obligatoire';
      if (!form.niveauFormation) e.niveauFormation = 'Obligatoire';
      if (!form.filiere) e.filiere = 'Obligatoire';
      if (!form.anneeEntree) e.anneeEntree = 'Obligatoire';
    }
    if (s === 4) {
      if (!form.motivations.trim()) e.motivations = 'Obligatoire';
      if (!form.urgenceNom.trim()) e.urgenceNom = 'Obligatoire';
      if (!form.urgenceTel.trim()) e.urgenceTel = 'Obligatoire';
      if (!form.urgenceLien) e.urgenceLien = 'Obligatoire';
    }
    if (s === 5) {
      ['cin_recto', 'cin_verso', 'bac', 'photo'].forEach(key => {
        if (!files[key]) e[key] = 'Document requis';
      });
    }
    return e;
  };

  const next = () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prev = () => {
    setErrors({});
    setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    const e = validateStep(5);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      // Convert files to base64
      const fichiers = [];
      for (const doc of REQUIRED_DOCS) {
        const file = files[doc.key];
        if (file) {
          const data = await fileToBase64(file);
          fichiers.push({ categorie: doc.categorie, data, type: file.type, name: file.name });
        }
      }

      const payload = { ...form, fichiers };

      const resp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();

      // Mirror key fields to Firestore for ERP admin dashboard (no base64 files)
      try {
        const { fichiers: _f, ...meta } = payload;
        await addDoc(collection(db, 'candidatures'), {
          ...meta,
          ref: json.ref || json.reference || '',
          statut: json.doublon ? 'doublon' : 'recu',
          nbFichiers: fichiers.length,
          createdAt: new Date(),
        });
      } catch (_e) { /* non-blocking */ }

      setResult(json);
      setStep(6);
    } catch (err) {
      console.error(err);
      alert('Erreur de connexion. Vérifiez votre réseau et réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (step === 6) {
    const isDoublon = result?.doublon === true;
    const ref = result?.ref || result?.reference || '';
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full text-center border border-slate-100">
          {isDoublon ? (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Candidature déjà enregistrée</h2>
              <p className="text-slate-500 mb-3">
                Une candidature avec ce CIN ou cet e-mail existe déjà dans notre système.
              </p>
              {ref && <p className="text-sm font-mono bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-amber-700 inline-block mb-4">Référence : <strong>{ref}</strong></p>}
              <p className="text-sm text-slate-400">Pour toute question, contactez-nous au <a href="tel:+212522078705" className="text-[#005989] font-medium">+212 5220-78705</a></p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Candidature envoyée !</h2>
              {ref && (
                <div className="bg-[#005989]/5 border border-[#005989]/20 rounded-xl px-5 py-3 mb-4 inline-block">
                  <p className="text-xs text-slate-500 mb-0.5">Votre référence</p>
                  <p className="text-xl font-black text-[#005989] tracking-widest">{ref}</p>
                </div>
              )}
              <p className="text-slate-500 text-sm mb-5">
                Un e-mail de confirmation a été envoyé à <strong>{form.email}</strong>.<br />
                Vous recevrez également un message WhatsApp de confirmation.
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-left text-sm space-y-2 mb-6 border border-slate-100">
                <p className="font-semibold text-slate-700 mb-1">Prochaines étapes :</p>
                <p className="text-slate-500 flex gap-2"><span>1️⃣</span> Attendez la confirmation par e-mail (sous 48h)</p>
                <p className="text-slate-500 flex gap-2"><span>2️⃣</span> Réglez les frais d'inscription via le lien de paiement envoyé</p>
                <p className="text-slate-500 flex gap-2"><span>3️⃣</span> Rejoignez notre groupe WhatsApp via le lien communiqué</p>
                <p className="text-slate-500 flex gap-2"><span>4️⃣</span> Présentez-vous le jour de la rentrée à notre campus :<br /><a href="https://maps.app.goo.gl/ZF5NwLnxw8wdAXpJA" target="_blank" rel="noreferrer" className="text-[#005989] underline ml-5">Nouaceur, Casablanca — voir sur Maps</a></p>
              </div>
              <a
                href="https://attijari-payment.cmi.co.ma/fim/paymentLinkService?token=26090MkqC12511771F3U60W3NG3TSH28GTQUU"
                target="_blank"
                rel="noreferrer"
                className="block w-full py-3 bg-[#005989] text-white rounded-xl font-bold hover:bg-[#004a73] transition text-sm mb-3"
              >
                Payer les frais d'inscription →
              </a>
              <button
                onClick={() => { setStep(1); setForm(INITIAL_FORM); setFiles({}); setResult(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 hover:underline transition"
              >
                Soumettre une autre candidature
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Layout wrapper ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="bg-[#005989] text-white font-black text-lg px-3 py-1.5 rounded-lg tracking-wider">IFTL</div>
            <span className="text-slate-300 font-light text-xl">|</span>
            <span className="text-slate-600 font-medium text-sm">Institut de Formation en Techniques Logistiques</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Formulaire de Candidature</h1>
          <p className="text-slate-400 text-sm mt-1">Rejoignez l'excellence — Année {form.anneeEntree || '2025-2026'}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step > s.id ? 'bg-green-500 text-white' :
                  step === s.id ? 'bg-[#005989] text-white ring-4 ring-[#005989]/20' :
                  'bg-white border-2 border-slate-200 text-slate-400'
                }`}>
                  {step > s.id ? '✓' : s.icon}
                </div>
                <span className={`text-xs mt-1 font-medium hidden sm:block ${step === s.id ? 'text-[#005989]' : 'text-slate-400'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded transition-all ${step > s.id ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#005989] to-[#0077b6] px-6 py-4">
            <h2 className="text-white font-bold text-base">{STEPS[step - 1]?.icon} Étape {step} — {STEPS[step - 1]?.label}</h2>
          </div>
          <div className="p-6 space-y-5">

            {/* ── STEP 1: Identité & Coordonnées ─────────────────────── */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nom de famille" name="nom" form={form} set={set} errors={errors} required placeholder="BENALI" />
                  <Field label="Prénom" name="prenom" form={form} set={set} errors={errors} required placeholder="Youssef" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Date de naissance" name="dateNaissance" type="date" form={form} set={set} errors={errors} required />
                  <Field label="Numéro CIN" name="cin" form={form} set={set} errors={errors} required placeholder="AB123456" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Sexe" name="sexe" form={form} set={set} errors={errors} required
                    options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} />
                  <Field label="Nationalité" name="nationalite" form={form} set={set} errors={errors} placeholder="Marocaine" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Téléphone" name="telephone" type="tel" form={form} set={set} errors={errors} required placeholder="06XXXXXXXX" />
                  <Field label="Adresse e-mail" name="email" type="email" form={form} set={set} errors={errors} required placeholder="votre@email.com" />
                </div>
                <Field label="Adresse complète" name="adresse" form={form} set={set} errors={errors} required placeholder="N° rue, quartier…" />
                <Field label="Ville" name="ville" form={form} set={set} errors={errors} required placeholder="Casablanca" />
              </>
            )}

            {/* ── STEP 2: Baccalauréat & Parcours ────────────────────── */}
            {step === 2 && (
              <>
                <Select label="Niveau scolaire actuel" name="niveau" form={form} set={set} errors={errors} required
                  options={['Baccalauréat', 'Bac+1', 'Bac+2', 'Bac+3 et plus']} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Spécialité Bac" name="specBac" form={form} set={set} errors={errors} required placeholder="Sciences Éco., STG, STI…" />
                  <Field label="Mention" name="mentionBac" form={form} set={set} errors={errors}>
                    <select value={form.mentionBac} onChange={e => set('mentionBac', e.target.value)}
                      className="w-full text-sm border rounded-lg px-3 py-2.5 border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#005989]">
                      <option value="">— Optionnel —</option>
                      {MENTIONS_BAC.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Moyenne Bac" name="moyenneBac" form={form} set={set} errors={errors} required placeholder="Ex: 13.5" />
                  <Field label="Année d'obtention" name="anneeBac" form={form} set={set} errors={errors} required placeholder="Ex: 2024" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Type de lycée" name="typeLycee" form={form} set={set} errors={errors} options={TYPES_LYCEE} />
                  <Field label="Code Massar" name="massar" form={form} set={set} errors={errors} placeholder="GXxxxxxxx" />
                </div>
                <Field label="Établissement scolaire" name="etablissement" form={form} set={set} errors={errors} required placeholder="Lycée Al Khawarizmi, Casablanca" />
                <Select label="Situation professionnelle actuelle" name="situationPro" form={form} set={set} errors={errors} options={SITUATIONS_PRO} />
              </>
            )}

            {/* ── STEP 3: Formation souhaitée ─────────────────────────── */}
            {step === 3 && (
              <>
                <Select label="Type de programme" name="programType" form={form} set={set} errors={errors} required options={PROGRAM_TYPES} />
                <Select label="Niveau de formation visé" name="niveauFormation" form={form} set={set} errors={errors} required options={NIVEAUX_FORMATION} />
                <Select label="Filière / Spécialisation" name="filiere" form={form} set={set} errors={errors} required options={FILIERES} />
                <Select label="Année d'entrée souhaitée" name="anneeEntree" form={form} set={set} errors={errors} required options={ANNEES_ENTREE} />

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Dates de formation courte (optionnel)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Date préférentielle 1" name="dateCourte1" type="date" form={form} set={set} errors={errors} />
                    <Field label="Date préférentielle 2" name="dateCourte2" type="date" form={form} set={set} errors={errors} />
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#005989] mb-1">Formation sélectionnée</h3>
                  {form.filiere ? (
                    <p className="text-sm text-slate-700 font-medium">{form.filiere}</p>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Aucune filière sélectionnée</p>
                  )}
                  {form.niveauFormation && <p className="text-xs text-slate-500 mt-0.5">{form.niveauFormation} — {form.programType}</p>}
                </div>
              </>
            )}

            {/* ── STEP 4: Compléments ──────────────────────────────────── */}
            {step === 4 && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">
                    Lettre de motivation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.motivations}
                    onChange={e => set('motivations', e.target.value)}
                    rows={5}
                    placeholder="Décrivez votre projet professionnel, vos atouts et pourquoi vous avez choisi IFTL…"
                    className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none transition ${
                      errors.motivations ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  <Err msg={errors.motivations} />
                </div>

                <Select label="Comment nous avez-vous connu ?" name="sourceInfo" form={form} set={set} errors={errors} options={SOURCES} />

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contact d'urgence</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nom complet" name="urgenceNom" form={form} set={set} errors={errors} required placeholder="Nom du contact" />
                    <Field label="Téléphone" name="urgenceTel" type="tel" form={form} set={set} errors={errors} required placeholder="06XXXXXXXX" />
                  </div>
                  <Select label="Lien de parenté" name="urgenceLien" form={form} set={set} errors={errors} required options={LIENS_URGENCE} />
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Logistique & Besoins</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Select label="Hébergement nécessaire ?" name="hebergement" form={form} set={set} errors={errors}
                      options={[{ value: 'oui', label: 'Oui, je cherche un logement' }, { value: 'non', label: 'Non, j\'ai un logement' }]} />
                    <Select label="Besoin de transport ?" name="transport" form={form} set={set} errors={errors}
                      options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]} />
                  </div>
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Besoins spécifiques (optionnel)</label>
                    <textarea
                      value={form.besoinsSpecifiques}
                      onChange={e => set('besoinsSpecifiques', e.target.value)}
                      rows={2}
                      placeholder="Handicap, régime alimentaire, allergie, autre…"
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.acceptComm}
                    onChange={e => set('acceptComm', e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#005989]"
                  />
                  <span className="text-sm text-slate-500">
                    J'accepte de recevoir des informations sur les formations et événements de l'IFTL par e-mail et WhatsApp.
                  </span>
                </label>
              </>
            )}

            {/* ── STEP 5: Documents ────────────────────────────────────── */}
            {step === 5 && (
              <>
                <p className="text-sm text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                  Veuillez joindre les documents requis. Formats acceptés : <strong>JPG, PNG, PDF</strong> — taille max 5 Mo par fichier.
                </p>
                <div className="space-y-4">
                  {REQUIRED_DOCS.map(doc => {
                    const file = files[doc.key];
                    return (
                      <div key={doc.key} className={`border-2 rounded-xl p-4 transition ${
                        file ? 'border-green-300 bg-green-50' :
                        errors[doc.key] ? 'border-red-300 bg-red-50' :
                        'border-dashed border-slate-200 bg-slate-50 hover:border-[#005989]/40'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {doc.label}
                              {doc.required && <span className="text-red-500 ml-1">*</span>}
                            </p>
                            {file ? (
                              <p className="text-xs text-green-600 mt-0.5 font-medium">✓ {file.name} ({(file.size / 1024).toFixed(0)} Ko)</p>
                            ) : (
                              <p className="text-xs text-slate-400 mt-0.5">Aucun fichier sélectionné</p>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            {file && (
                              <button
                                type="button"
                                onClick={() => setFile(doc.key, null)}
                                className="text-xs text-red-400 hover:text-red-600 font-medium"
                              >
                                Supprimer
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => fileRefs.current[doc.key]?.click()}
                              className="text-xs bg-[#005989] text-white px-3 py-1.5 rounded-lg hover:bg-[#004a73] font-medium transition"
                            >
                              {file ? 'Changer' : 'Choisir'}
                            </button>
                          </div>
                        </div>
                        <input
                          ref={el => { fileRefs.current[doc.key] = el; }}
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={e => {
                            const f = e.target.files[0];
                            if (f && f.size > 5 * 1024 * 1024) {
                              alert('Fichier trop volumineux (max 5 Mo)');
                              return;
                            }
                            setFile(doc.key, f || null);
                            setErrors(er => ({ ...er, [doc.key]: undefined }));
                          }}
                        />
                        <Err msg={errors[doc.key]} />
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 space-y-1">
                  <p className="font-semibold text-slate-600 mb-1">Récapitulatif de votre candidature :</p>
                  <p><strong>Candidat :</strong> {form.prenom} {form.nom}</p>
                  <p><strong>Filière :</strong> {form.filiere || '—'}</p>
                  <p><strong>Niveau :</strong> {form.niveauFormation || '—'}</p>
                  <p><strong>Programme :</strong> {form.programType || '—'}</p>
                  <p><strong>Année :</strong> {form.anneeEntree || '—'}</p>
                </div>
              </>
            )}

          </div>

          {/* Footer navigation */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={prev}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition"
              >
                ← Précédent
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                type="button"
                onClick={next}
                className="flex items-center gap-1.5 bg-[#005989] text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:bg-[#004a73] transition"
              >
                Suivant →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-green-600 text-white text-sm font-bold px-7 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60 transition"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Envoi en cours…</>
                ) : '✓ Soumettre ma candidature'}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Vos données sont traitées de manière confidentielle conformément à la loi 09-08 relative à la protection des données personnelles.
          Pour toute question : <a href="mailto:scolarite@iftl.ma" className="text-[#005989]">scolarite@iftl.ma</a> — Tél. <a href="tel:+212522078705" className="text-[#005989]">+212 5220-78705</a>
        </p>
      </div>
    </div>
  );
}
