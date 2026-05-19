import { useState } from 'react';
import { candidaturesService } from '../../services/firestore';

const FILIERES = ['Développement Digital', 'Infrastructure Digitale', 'Gestion', 'Marketing', 'Comptabilité'];
const NIVEAUX = ['Technicien Spécialisé', 'Technicien', 'Qualification'];

export default function CandidaturePage() {
  const [step, setStep] = useState(1); // 1: form, 2: success
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', telephone: '', cin: '', dateNaissance: '',
    filiere: '', niveau: '', message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.nom.trim()) e.nom = 'Obligatoire';
    if (!form.prenom.trim()) e.prenom = 'Obligatoire';
    if (!form.email.trim()) e.email = 'Obligatoire';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide';
    if (!form.telephone.trim()) e.telephone = 'Obligatoire';
    if (!form.cin.trim()) e.cin = 'Obligatoire';
    if (!form.dateNaissance) e.dateNaissance = 'Obligatoire';
    if (!form.filiere) e.filiere = 'Obligatoire';
    if (!form.niveau) e.niveau = 'Obligatoire';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      await candidaturesService.create(form);
      setStep(2);
    } catch (err) {
      alert('Erreur lors de l\'envoi. Vérifiez votre connexion et réessayez.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(er => ({ ...er, [key]: undefined })); };

  const field = (label, key, type = 'text', required = false, placeholder = '') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 ${
          errors[key] ? 'border-red-400 bg-red-50' : 'border-gray-300'
        }`}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  if (step === 2) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Candidature envoyée !</h2>
          <p className="text-gray-500 mb-6">
            Votre candidature a bien été reçue. Notre équipe pédagogique vous contactera à l'adresse <strong>{form.email}</strong> dans les meilleurs délais.
          </p>
          <button
            onClick={() => { setStep(1); setForm({ nom: '', prenom: '', email: '', telephone: '', cin: '', dateNaissance: '', filiere: '', niveau: '', message: '' }); }}
            className="text-sm text-gray-500 hover:underline"
          >
            Soumettre une autre candidature
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gray-900 text-white font-black text-2xl px-4 py-2 rounded-xl mb-4">IFTL</div>
          <h1 className="text-3xl font-bold text-gray-900">Formulaire de candidature</h1>
          <p className="text-gray-500 mt-2">Remplissez ce formulaire pour soumettre votre candidature. Tous les champs marqués * sont obligatoires.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
          {/* Personal info */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Informations personnelles</h2>
            <div className="grid grid-cols-2 gap-4">
              {field('Nom', 'nom', 'text', true, 'Votre nom de famille')}
              {field('Prénom', 'prenom', 'text', true, 'Votre prénom')}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {field('Email', 'email', 'email', true, 'exemple@email.com')}
              {field('Téléphone', 'telephone', 'tel', true, '06XXXXXXXX')}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {field('Numéro CIN', 'cin', 'text', true, 'AB123456')}
              {field('Date de naissance', 'dateNaissance', 'date', true)}
            </div>
          </div>

          {/* Formation */}
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Formation souhaitée</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filière <span className="text-red-500">*</span></label>
                <select value={form.filiere} onChange={e => set('filiere', e.target.value)}
                  className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.filiere ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                  <option value="">— Choisir —</option>
                  {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                {errors.filiere && <p className="text-xs text-red-500 mt-1">{errors.filiere}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Niveau <span className="text-red-500">*</span></label>
                <select value={form.niveau} onChange={e => set('niveau', e.target.value)}
                  className={`w-full text-sm border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 ${errors.niveau ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
                  <option value="">— Choisir —</option>
                  {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                {errors.niveau && <p className="text-xs text-red-500 mt-1">{errors.niveau}</p>}
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message / Motivation (optionnel)</label>
            <textarea
              value={form.message}
              onChange={e => set('message', e.target.value)}
              rows={4}
              placeholder="Décrivez votre parcours, vos motivations, vos objectifs…"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 transition text-sm"
          >
            {submitting ? 'Envoi en cours…' : 'Soumettre ma candidature'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Vos données sont traitées de manière confidentielle et uniquement dans le cadre de votre candidature.
        </p>
      </div>
    </div>
  );
}
