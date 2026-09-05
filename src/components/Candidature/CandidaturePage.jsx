import { useState, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyZxdpunUpav7IO7fXNTnInbtGpV0lJGNlBjlsz9u3NP6t2QsQcCEt5cRcnTIU3dEIU/exec';

// ── Données référentiels ───────────────────────────────────────────────────────
const FILIERES_BY_CAT = {
  'Technicien Spécialisé (Bac+2)': [
    'Technicien Spécialisé en Management Logistique & Industriel (TMLI)',
    'Technicien Spécialisé en Logistique Industrielle & Pilotage des Flux (LIPF)',
    'Technicien Spécialisé en Gestion des Opérations Logistiques (GOL)',
    'Technicien Spécialisé en E-Commerce & Marketing Digital (ECMD)',
    'Technicien Spécialisé en Distribution, Merchandising & Vente par Internet (DMVT)',
  ],
  'Technicien (Bac+1)': [
    'Technicien en Logistique & Exploitation (LE)',
  ],
  'Qualification': [
    'Conducteur des véhicules de transport de marchandises (CTM)',
    'Conducteur des véhicules de transport de personnes (CTP)',
  ],
  'Formation Supérieure (CNAM)': [
    'Licence Professionnelle – Logistique & Pilotage des Flux (LIC)',
  ],
  'Formation Continue / Qualifiante': [
    'Eco-conduite : initiation / perfectionnement',
    'FCO / FQIMO Marchandises',
    'FCO / FQIMO Voyageurs',
    'Conduite préventive & Sécurité routière',
    'Réglementation Sociale Européenne',
    'Incendie / Évacuation / Secourisme',
    'Cariste : initiation & recyclage',
    'PEMP – Nacelle élévatrice',
    'Préparateur de Commandes',
    'Techniques d\'arrimage du chargement',
  ],
};

const PROGRAM_TYPES   = ['Formation Initiale', 'Formation Continue', 'Apprentissage'];
const NIVEAUX_BAC     = ['Baccalauréat', 'Bac+1', 'Bac+2', 'Bac+3 et plus'];
const MENTIONS_BAC    = ['Très Bien', 'Bien', 'Assez Bien', 'Passable'];
const TYPES_LYCEE     = ['Public', 'Privé', 'Mission étrangère'];
const SOURCES         = ['Réseaux sociaux', 'Bouche à oreille', 'Site web Institut', 'Conseiller orientation', 'Ancien étudiant', 'Autre'];
const SITUATIONS_PRO  = ['Étudiant(e)', 'Demandeur d\'emploi', 'Salarié(e)', 'Entrepreneur(e)', 'Autre'];
const ANNEES_ENTREE   = ['2026-2027', '2027-2028'];
const LIENS_URGENCE   = ['Parent', 'Tuteur', 'Conjoint(e)', 'Frère / Sœur', 'Ami(e)', 'Autre'];

const DOCS = [
  { key: 'cin_recto',    label: 'CIN Recto',                   required: true },
  { key: 'cin_verso',    label: 'CIN Verso',                   required: true },
  { key: 'bac',          label: 'Relevé de notes / Bac',       required: true },
  { key: 'photo',        label: 'Photo d\'identité',           required: true },
  { key: 'cv',           label: 'CV',                          required: false },
  { key: 'attestation',  label: 'Attestation de travail',      required: false },
];

const INITIAL = {
  nom: '', prenom: '', dateNaissance: '', cin: '', sexe: '', nationalite: 'Marocaine',
  telephone: '', email: '', adresse: '', ville: '',
  niveauScolaire: '', specBac: '', moyenneBac: '', mentionBac: '', anneeBac: '',
  typeLycee: '', massar: '', etablissement: '', situationPro: '',
  programType: '', categorie: '', filiere: '', anneeEntree: '',
  dateCourte1: '', dateCourte2: '',
  motivations: '', sourceInfo: '', acceptComm: false,
  urgenceNom: '', urgenceTel: '', urgenceLien: '',
  hebergement: '', transport: '', besoinsSpecifiques: '',
};

// ── Icônes SVG ─────────────────────────────────────────────────────────────────
const STEP_ICONS = [
  // Identité
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  // Baccalauréat
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3.33 2 8.67 2 12 0v-5"/></svg>,
  // Formation
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  // Compléments
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>,
  // Documents
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
];

const STEPS = [
  { label: 'Identité' },
  { label: 'Baccalauréat' },
  { label: 'Formation' },
  { label: 'Compléments' },
  { label: 'Documents' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Err({ msg }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </p>
  );
}

function Label({ text, required }) {
  return (
    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
      {text}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

const INPUT_BASE = 'w-full text-sm border rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/50 focus:border-[#005989] transition bg-white';
const err_cls  = 'border-red-300 bg-red-50/50';
const ok_cls   = 'border-slate-200 hover:border-slate-300';

function TInput({ label, name, type = 'text', form, set, errors, required, placeholder }) {
  return (
    <div>
      <Label text={label} required={required} />
      <input
        type={type} value={form[name]} onChange={e => set(name, e.target.value)}
        placeholder={placeholder}
        className={`${INPUT_BASE} ${errors[name] ? err_cls : ok_cls}`}
      />
      <Err msg={errors[name]} />
    </div>
  );
}

function TSelect({ label, name, form, set, errors, required, options, placeholder = '— Sélectionner —', groups }) {
  const cls = `${INPUT_BASE} ${errors[name] ? err_cls : ok_cls}`;
  return (
    <div>
      <Label text={label} required={required} />
      <select value={form[name]} onChange={e => set(name, e.target.value)} className={cls}>
        <option value="">{placeholder}</option>
        {groups
          ? Object.entries(groups).map(([grp, opts]) => (
              <optgroup key={grp} label={grp}>
                {opts.map(o => <option key={o} value={o}>{o}</option>)}
              </optgroup>
            ))
          : options?.map(o => typeof o === 'string'
              ? <option key={o} value={o}>{o}</option>
              : <option key={o.value} value={o.value}>{o.label}</option>)
        }
      </select>
      <Err msg={errors[name]} />
    </div>
  );
}

function TTextarea({ label, name, form, set, errors, required, placeholder, rows = 4 }) {
  return (
    <div>
      <Label text={label} required={required} />
      <textarea
        value={form[name]} onChange={e => set(name, e.target.value)}
        placeholder={placeholder} rows={rows}
        className={`${INPUT_BASE} resize-none ${errors[name] ? err_cls : ok_cls}`}
      />
      <Err msg={errors[name]} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CandidaturePage() {
  const [step, setStep]           = useState(1);
  const [form, setForm]           = useState(INITIAL);
  const [errors, setErrors]       = useState({});
  const [files, setFiles]         = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]       = useState(null);
  const fileRefs = useRef({});

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(e => ({ ...e, [key]: undefined }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (s) => {
    const e = {};
    if (s === 1) {
      if (!form.nom.trim())           e.nom           = 'Champ obligatoire';
      if (!form.prenom.trim())        e.prenom        = 'Champ obligatoire';
      if (!form.dateNaissance)        e.dateNaissance = 'Champ obligatoire';
      if (!form.cin.trim())           e.cin           = 'Champ obligatoire';
      if (!form.sexe)                 e.sexe          = 'Champ obligatoire';
      if (!form.telephone.trim())     e.telephone     = 'Champ obligatoire';
      if (!form.email.trim())         e.email         = 'Champ obligatoire';
      else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide';
      if (!form.adresse.trim())       e.adresse       = 'Champ obligatoire';
      if (!form.ville.trim())         e.ville         = 'Champ obligatoire';
    }
    if (s === 2) {
      if (!form.niveauScolaire)       e.niveauScolaire  = 'Champ obligatoire';
      if (!form.specBac.trim())       e.specBac         = 'Champ obligatoire';
      if (!form.moyenneBac.trim())    e.moyenneBac      = 'Champ obligatoire';
      if (!form.anneeBac.trim())      e.anneeBac        = 'Champ obligatoire';
      if (!form.etablissement.trim()) e.etablissement   = 'Champ obligatoire';
    }
    if (s === 3) {
      if (!form.programType)          e.programType  = 'Champ obligatoire';
      if (!form.filiere)              e.filiere      = 'Champ obligatoire';
      if (!form.anneeEntree)          e.anneeEntree  = 'Champ obligatoire';
    }
    if (s === 4) {
      if (!form.motivations.trim())   e.motivations  = 'Champ obligatoire';
      if (!form.urgenceNom.trim())    e.urgenceNom   = 'Champ obligatoire';
      if (!form.urgenceTel.trim())    e.urgenceTel   = 'Champ obligatoire';
      if (!form.urgenceLien)          e.urgenceLien  = 'Champ obligatoire';
    }
    if (s === 5) {
      DOCS.filter(d => d.required).forEach(d => {
        if (!files[d.key]) e[d.key] = 'Document requis';
      });
    }
    return e;
  };

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length) { setErrors(e); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setErrors({});
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prev = () => { setErrors({}); setStep(s => s - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmit = async () => {
    const e = validate(5);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const fichiers = [];
      for (const doc of DOCS) {
        const file = files[doc.key];
        if (file) {
          const data = await fileToBase64(file);
          fichiers.push({ categorie: doc.key, data, type: file.type, name: file.name });
        }
      }
      const payload = { ...form, fichiers };
      const resp = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      // Mirror to Firestore (sans fichiers base64)
      try {
        const { fichiers: _f, ...meta } = payload;
        await addDoc(collection(db, 'candidatures'), {
          ...meta,
          ref: json.ref || json.reference || '',
          statut: json.doublon ? 'doublon' : 'recu',
          nbFichiers: fichiers.length,
          createdAt: new Date(),
        });
      } catch { /* non-bloquant */ }
      setResult(json);
      setStep(6);
    } catch {
      alert('Erreur de connexion. Vérifiez votre réseau et réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Écran succès ────────────────────────────────────────────────────────────
  if (step === 6) {
    const isDoublon = result?.doublon === true;
    const ref = result?.ref || result?.reference || '';
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0f0fa 100%)' }}>
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center border border-slate-100">
          {isDoublon ? (
            <>
              <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Candidature déjà reçue</h2>
              <p className="text-slate-500 text-sm mb-4">Une candidature avec ce CIN ou cet e-mail existe déjà dans notre système.</p>
              {ref && <p className="font-mono text-sm bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-amber-700 inline-block mb-4">Réf : <strong>{ref}</strong></p>}
              <p className="text-xs text-slate-400">Contact : <a href="tel:+212522078705" className="text-[#005989] font-semibold">+212 5220-78705</a></p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Candidature envoyée !</h2>
              <p className="text-slate-500 text-sm mb-5">
                Confirmation envoyée à <strong className="text-slate-700">{form.email}</strong><br />et par WhatsApp au <strong className="text-slate-700">{form.telephone}</strong>.
              </p>
              {ref && (
                <div className="bg-[#005989]/5 border border-[#005989]/15 rounded-2xl px-5 py-4 mb-6 inline-block w-full">
                  <p className="text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wider">Votre référence de dossier</p>
                  <p className="text-3xl font-black text-[#005989] tracking-widest">{ref}</p>
                </div>
              )}
              <div className="bg-slate-50 rounded-2xl p-4 text-left text-sm space-y-2.5 mb-6 border border-slate-100">
                <p className="font-bold text-slate-700 mb-2">Prochaines étapes</p>
                {[
                  'Attendez la confirmation par e-mail sous 48h',
                  'Réglez les frais d\'inscription via le lien de paiement',
                  'Rejoignez notre groupe WhatsApp via le lien communiqué',
                  'Présentez-vous le jour de la rentrée — Nouaceur, Casablanca',
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#005989] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-slate-500">{s}</span>
                  </div>
                ))}
              </div>
              <a
                href="https://attijari-payment.cmi.co.ma/fim/paymentLinkService?token=26090MkqC12511771F3U60W3NG3TSH28GTQUU"
                target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-[#005989] text-white rounded-xl font-bold hover:bg-[#004070] transition text-sm mb-3"
              >
                Payer les frais d'inscription
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
              </a>
              <button onClick={() => { setStep(1); setForm(INITIAL); setFiles({}); setResult(null); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition">
                Soumettre une autre candidature
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Formulaire principal ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e8f4fd 100%)' }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #005989, #0077b6)' }}
            >
              <span className="font-black text-sm text-white tracking-tight">IF</span>
            </div>
            <div className="text-left">
              <p className="font-black text-slate-800 text-lg leading-none"> Institut </p>
              <p className="text-xs text-slate-500 mt-0.5">Institut de Formation · Transport & Logistique</p>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Formulaire de candidature</h1>
          <p className="text-slate-400 text-sm mt-1">Année académique {form.anneeEntree || '2025–2026'}</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8 px-1">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const done = step > idx;
            const active = step === idx;
            return (
              <div key={idx} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                    ${done   ? 'bg-green-500 shadow-md shadow-green-200' :
                      active ? 'shadow-lg shadow-[#005989]/25' : 'bg-white border border-slate-200'}
                  `}
                    style={active ? { background: 'linear-gradient(135deg, #005989, #0077b6)' } : {}}>
                    {done ? (
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <span className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-400'}`}>
                        {STEP_ICONS[i]}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold hidden sm:block ${active ? 'text-[#005989]' : done ? 'text-green-600' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full transition-all ${step > idx ? 'bg-green-400' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #005989, #0077b6)' }}>
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white">
              <span className="w-4 h-4">{STEP_ICONS[step - 1]}</span>
            </div>
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Étape {step} sur {STEPS.length}</p>
              <p className="text-white font-bold">{STEPS[step - 1]?.label}</p>
            </div>
            <div className="ml-auto">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 <= step ? 'bg-white' : 'bg-white/25'}`}
                    style={{ width: i + 1 === step ? 20 : 8 }} />
                ))}
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="p-6 space-y-5">

            {/* ── Étape 1 : Identité & Coordonnées ──────────────────────── */}
            {step === 1 && <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TInput label="Nom de famille" name="nom" form={form} set={set} errors={errors} required placeholder="BENALI" />
                <TInput label="Prénom" name="prenom" form={form} set={set} errors={errors} required placeholder="Youssef" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TInput label="Date de naissance" name="dateNaissance" type="date" form={form} set={set} errors={errors} required />
                <TInput label="Numéro CIN" name="cin" form={form} set={set} errors={errors} required placeholder="AB123456" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TSelect label="Sexe" name="sexe" form={form} set={set} errors={errors} required
                  options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} />
                <TInput label="Nationalité" name="nationalite" form={form} set={set} errors={errors} placeholder="Marocaine" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TInput label="Téléphone" name="telephone" type="tel" form={form} set={set} errors={errors} required placeholder="06XXXXXXXX" />
                <TInput label="Adresse e-mail" name="email" type="email" form={form} set={set} errors={errors} required placeholder="vous@email.com" />
              </div>
              <TInput label="Adresse complète" name="adresse" form={form} set={set} errors={errors} required placeholder="N° rue, quartier, commune…" />
              <TInput label="Ville" name="ville" form={form} set={set} errors={errors} required placeholder="Casablanca" />
            </>}

            {/* ── Étape 2 : Baccalauréat ────────────────────────────────── */}
            {step === 2 && <>
              <TSelect label="Niveau scolaire actuel" name="niveauScolaire" form={form} set={set} errors={errors} required options={NIVEAUX_BAC} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TInput label="Spécialité Bac" name="specBac" form={form} set={set} errors={errors} required placeholder="Sciences Éco., STG, STI…" />
                <TSelect label="Mention" name="mentionBac" form={form} set={set} errors={errors} options={MENTIONS_BAC} placeholder="— Optionnel —" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TInput label="Moyenne Bac" name="moyenneBac" form={form} set={set} errors={errors} required placeholder="Ex : 13.50" />
                <TInput label="Année d'obtention" name="anneeBac" form={form} set={set} errors={errors} required placeholder="Ex : 2024" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TSelect label="Type de lycée" name="typeLycee" form={form} set={set} errors={errors} options={TYPES_LYCEE} placeholder="— Optionnel —" />
                <TInput label="Code Massar" name="massar" form={form} set={set} errors={errors} placeholder="GXxxxxxxx" />
              </div>
              <TInput label="Établissement scolaire" name="etablissement" form={form} set={set} errors={errors} required placeholder="Lycée Al Khawarizmi, Casablanca" />
              <TSelect label="Situation professionnelle actuelle" name="situationPro" form={form} set={set} errors={errors} options={SITUATIONS_PRO} placeholder="— Optionnel —" />
            </>}

            {/* ── Étape 3 : Formation souhaitée ─────────────────────────── */}
            {step === 3 && <>
              <TSelect label="Type de programme" name="programType" form={form} set={set} errors={errors} required options={PROGRAM_TYPES} />
              <div>
                <Label text="Filière / Spécialisation" required />
                <select
                  value={form.filiere}
                  onChange={e => set('filiere', e.target.value)}
                  className={`${INPUT_BASE} ${errors.filiere ? err_cls : ok_cls}`}
                >
                  <option value="">— Choisir une filière —</option>
                  {Object.entries(FILIERES_BY_CAT).map(([cat, opts]) => (
                    <optgroup key={cat} label={`▸ ${cat}`}>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </optgroup>
                  ))}
                </select>
                <Err msg={errors.filiere} />
              </div>
              <TSelect label="Année d'entrée souhaitée" name="anneeEntree" form={form} set={set} errors={errors} required options={ANNEES_ENTREE} />
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Dates préférentielles (formation courte)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TInput label="Date préférentielle 1" name="dateCourte1" type="date" form={form} set={set} errors={errors} />
                  <TInput label="Date préférentielle 2" name="dateCourte2" type="date" form={form} set={set} errors={errors} />
                </div>
              </div>
              {form.filiere && (
                <div className="rounded-2xl p-4 flex gap-3" style={{ background: 'linear-gradient(135deg, #f0f8ff, #e8f4fd)', border: '1px solid #bce0f7' }}>
                  <div className="w-8 h-8 rounded-xl bg-[#005989]/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#005989]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3.33 2 8.67 2 12 0v-5"/></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#005989] uppercase tracking-wide mb-0.5">Formation sélectionnée</p>
                    <p className="text-sm font-semibold text-slate-800">{form.filiere}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{form.programType} · {form.anneeEntree}</p>
                  </div>
                </div>
              )}
            </>}

            {/* ── Étape 4 : Compléments ─────────────────────────────────── */}
            {step === 4 && <>
              <TTextarea label="Lettre de motivation" name="motivations" form={form} set={set} errors={errors} required rows={5}
                placeholder="Décrivez votre projet professionnel, vos atouts et pourquoi vous postulez…" />
              <TSelect label="Comment nous avez-vous connu ?" name="sourceInfo" form={form} set={set} errors={errors} options={SOURCES} placeholder="— Optionnel —" />

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact d'urgence</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TInput label="Nom complet" name="urgenceNom" form={form} set={set} errors={errors} required placeholder="Nom du contact" />
                  <TInput label="Téléphone" name="urgenceTel" type="tel" form={form} set={set} errors={errors} required placeholder="06XXXXXXXX" />
                </div>
                <TSelect label="Lien de parenté" name="urgenceLien" form={form} set={set} errors={errors} required options={LIENS_URGENCE} />
              </div>

              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Logistique & besoins</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TSelect label="Hébergement nécessaire ?" name="hebergement" form={form} set={set} errors={errors}
                    options={[{ value: 'oui', label: 'Oui, je cherche un logement' }, { value: 'non', label: 'Non, j\'ai un logement' }]}
                    placeholder="— Optionnel —" />
                  <TSelect label="Besoin de transport ?" name="transport" form={form} set={set} errors={errors}
                    options={[{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }]}
                    placeholder="— Optionnel —" />
                </div>
                <div className="mt-4">
                  <TTextarea label="Besoins spécifiques" name="besoinsSpecifiques" form={form} set={set} errors={errors} rows={2}
                    placeholder="Handicap, régime alimentaire, allergie, autre…" />
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 transition">
                <input type="checkbox" checked={form.acceptComm} onChange={e => set('acceptComm', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[#005989]" />
                <span className="text-sm text-slate-500 leading-relaxed">
                  J'accepte de recevoir des informations sur les formations et événements de l'Institut par e-mail et WhatsApp.
                </span>
              </label>
            </>}

            {/* ── Étape 5 : Documents ───────────────────────────────────── */}
            {step === 5 && <>
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 text-sm text-blue-700">
                <svg className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Formats acceptés : <strong>JPG, PNG, PDF</strong> — taille max <strong>5 Mo</strong> par fichier.</span>
              </div>

              <div className="space-y-3">
                {DOCS.map(doc => {
                  const file = files[doc.key];
                  const hasErr = !!errors[doc.key];
                  return (
                    <div key={doc.key} className={`rounded-2xl p-4 transition-all border-2 ${
                      file    ? 'border-green-300 bg-green-50/50' :
                      hasErr  ? 'border-red-300 bg-red-50/50' :
                      'border-dashed border-slate-200 bg-slate-50 hover:border-[#005989]/40 hover:bg-blue-50/30'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            file ? 'bg-green-100' : hasErr ? 'bg-red-100' : 'bg-white border border-slate-200'
                          }`}>
                            {file ? (
                              <svg className="w-4.5 h-4.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                              <svg className={`w-4 h-4 ${hasErr ? 'text-red-400' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-700 truncate">
                              {doc.label}
                              {doc.required && <span className="text-red-400 ml-1">*</span>}
                            </p>
                            {file
                              ? <p className="text-xs text-green-600 font-medium truncate">{file.name} · {(file.size / 1024).toFixed(0)} Ko</p>
                              : <p className="text-xs text-slate-400">{doc.required ? 'Requis' : 'Optionnel'}</p>
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {file && (
                            <button type="button" onClick={() => { setFiles(f => ({ ...f, [doc.key]: null })); if (fileRefs.current[doc.key]) fileRefs.current[doc.key].value = ''; }}
                              className="text-xs text-red-400 hover:text-red-600 font-medium transition">
                              Retirer
                            </button>
                          )}
                          <button type="button" onClick={() => fileRefs.current[doc.key]?.click()}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
                              file ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-[#005989] text-white hover:bg-[#004070]'
                            }`}>
                            {file ? 'Changer' : 'Choisir'}
                          </button>
                        </div>
                      </div>
                      <Err msg={errors[doc.key]} />
                      <input ref={el => { fileRefs.current[doc.key] = el; }} type="file"
                        accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                        onChange={e => {
                          const f = e.target.files[0];
                          if (f && f.size > 5 * 1024 * 1024) { alert('Fichier trop volumineux (max 5 Mo)'); return; }
                          setFiles(prev => ({ ...prev, [doc.key]: f || null }));
                          setErrors(prev => ({ ...prev, [doc.key]: undefined }));
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Récapitulatif */}
              <div className="rounded-2xl p-4 border border-slate-100 bg-slate-50 text-xs space-y-1.5">
                <p className="font-bold text-slate-700 mb-2 text-sm">Récapitulatif de votre dossier</p>
                {[
                  ['Candidat', `${form.prenom} ${form.nom}`],
                  ['Filière', form.filiere || '—'],
                  ['Programme', form.programType || '—'],
                  ['Année', form.anneeEntree || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-slate-400 w-20 shrink-0">{k}</span>
                    <span className="text-slate-700 font-semibold">{v}</span>
                  </div>
                ))}
              </div>
            </>}

          </div>

          {/* Navigation */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
            {step > 1 ? (
              <button type="button" onClick={prev}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-semibold transition">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                Précédent
              </button>
            ) : <div />}

            {step < 5 ? (
              <button type="button" onClick={next}
                className="flex items-center gap-2 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition"
                style={{ background: 'linear-gradient(135deg, #005989, #0077b6)', boxShadow: '0 4px 12px rgba(0,89,137,0.3)' }}>
                Suivant
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 bg-green-600 text-white text-sm font-bold px-7 py-2.5 rounded-xl hover:bg-green-700 disabled:opacity-60 transition shadow-md shadow-green-200">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours…</>
                ) : (
                  <><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg> Soumettre ma candidature</>
                )}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
          Données confidentielles · Loi 09-08 · CNDP n° A-PO-268/2024<br />
          <a href="mailto:scolarite@iftl.ma" className="text-[#005989]">scolarite@iftl.ma</a>
          {' · '}
          <a href="tel:+212522078705" className="text-[#005989]">+212 5220-78705</a>
        </p>
      </div>
    </div>
  );
}
