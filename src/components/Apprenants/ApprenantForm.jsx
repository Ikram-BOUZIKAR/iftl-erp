import { useState } from 'react';

const FILIERE_CODES = ['TMLI', 'LIPF', 'GOL', 'ECMD', 'DMVT', 'LE', 'CTM', 'CTP'];
const FILIERE_LABELS = {
  TMLI: 'Management Logistique & Industriel',
  LIPF: 'Logistique Industrielle & Pilotage des Flux',
  GOL: 'Gestion des Opérations Logistiques',
  ECMD: 'E-Commerce & Marketing Digital',
  DMVT: 'Distribution, Merchandising & Vente par Internet',
  LE: 'Logistique & Exploitation',
  CTM: 'Conducteur – Transport de Marchandises',
  CTP: 'Conducteur – Transport de Personnes',
};
const NIVEAUX = ['Technicien Spécialisé', 'Technicien', 'Qualification'];
const MENTIONS_BAC = ['Passable', 'Assez Bien', 'Bien', 'Très Bien', 'Excellent'];

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="text-xs font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2 mb-3 mt-2">
      {title}
    </div>
  );
}

export default function ApprenantForm({ initial, groupes, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: initial?.nom || '',
    prenom: initial?.prenom || '',
    email: initial?.email || '',
    telephone: initial?.telephone || '',
    cin: initial?.cin || '',
    dateNaissance: initial?.dateNaissance || '',
    adresse: initial?.adresse || '',
    ville: initial?.ville || '',
    nomPere: initial?.nomPere || '',
    telephonePere: initial?.telephonePere || '',
    nomMere: initial?.nomMere || '',
    telephoneMere: initial?.telephoneMere || '',
    typeBac: initial?.typeBac || '',
    mentionBac: initial?.mentionBac || '',
    etablissementBac: initial?.etablissementBac || '',
    anneeBac: initial?.anneeBac || '',
    filiere: initial?.filiere || '',
    niveau: initial?.niveau || '',
    groupeId: initial?.groupeId || '',
    anneeAcademique: initial?.anneeAcademique || '2026-2027',
    statut: initial?.statut || 'actif',
    sessionConcours: initial?.sessionConcours || '',
    scoreAdmission: initial?.scoreAdmission || '',
    noteOral: initial?.noteOral !== undefined ? initial.noteOral : 12,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.nom.trim()) e.nom = 'Obligatoire';
    if (!form.prenom.trim()) e.prenom = 'Obligatoire';
    if (!form.email.trim()) e.email = 'Obligatoire';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(er => ({ ...er, [key]: undefined }));
  };

  const inputClass = (key) =>
    `w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 transition-colors ${
      errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  const selectClass =
    'w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white transition-colors';

  const Field = ({ label, fieldKey, type = 'text', required = false, placeholder = '' }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[fieldKey]}
        onChange={e => set(fieldKey, e.target.value)}
        placeholder={placeholder}
        className={inputClass(fieldKey)}
      />
      {errors[fieldKey] && <p className="text-xs text-red-500 mt-1">{errors[fieldKey]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-800">
            {initial ? "Modifier l'apprenant" : 'Ajouter un apprenant'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Section Identité */}
          <SectionHeader title="Identité" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom" fieldKey="nom" required />
            <Field label="Prénom" fieldKey="prenom" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email" fieldKey="email" type="email" required />
            <Field label="Téléphone" fieldKey="telephone" type="tel" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="CIN" fieldKey="cin" />
            <Field label="Date de naissance" fieldKey="dateNaissance" type="date" />
          </div>

          {/* Section Adresse */}
          <SectionHeader title="Adresse" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Adresse" fieldKey="adresse" />
            <Field label="Ville" fieldKey="ville" />
          </div>

          {/* Section Famille */}
          <SectionHeader title="Famille" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom du père" fieldKey="nomPere" />
            <Field label="Téléphone père" fieldKey="telephonePere" type="tel" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nom de la mère" fieldKey="nomMere" />
            <Field label="Téléphone mère" fieldKey="telephoneMere" type="tel" />
          </div>

          {/* Section Baccalauréat */}
          <SectionHeader title="Baccalauréat" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type / Série de bac" fieldKey="typeBac" placeholder="Bac Sciences Maths, Bac SVT…" />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mention</label>
              <select value={form.mentionBac} onChange={e => set('mentionBac', e.target.value)} className={selectClass}>
                <option value="">— Sélectionner —</option>
                {MENTIONS_BAC.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Établissement" fieldKey="etablissementBac" />
            <Field label="Année du bac" fieldKey="anneeBac" placeholder="2023" />
          </div>

          {/* Section Scolarité */}
          <SectionHeader title="Scolarité" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Filière</label>
              <select value={form.filiere} onChange={e => set('filiere', e.target.value)} className={selectClass}>
                <option value="">— Sélectionner —</option>
                {FILIERE_CODES.map(code => (
                  <option key={code} value={code}>{code} — {FILIERE_LABELS[code]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Niveau</label>
              <select value={form.niveau} onChange={e => set('niveau', e.target.value)} className={selectClass}>
                <option value="">— Sélectionner —</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Groupe</label>
              <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)} className={selectClass}>
                <option value="">— Sans groupe —</option>
                {(groupes || []).map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
            <Field label="Année académique" fieldKey="anneeAcademique" placeholder="2026-2027" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)} className={selectClass}>
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="archive">Archivé</option>
              </select>
            </div>
          </div>

          {/* Section Admission / Concours */}
          <SectionHeader title="Admission / Concours" />
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <Field label="Session concours" fieldKey="sessionConcours" placeholder="Juin 2026" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Score admission /20</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.01}
                value={form.scoreAdmission}
                onChange={e => set('scoreAdmission', e.target.value)}
                className={inputClass('scoreAdmission')}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Note oral /20</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.01}
                value={form.noteOral}
                onChange={e => set('noteOral', e.target.value)}
                className={inputClass('noteOral')}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60"
            >
              {saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
