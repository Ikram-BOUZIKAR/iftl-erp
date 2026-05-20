import { useState } from 'react';

const FILIERES = ['Développement Digital', 'Infrastructure Digitale', 'Gestion', 'Marketing', 'Comptabilité'];
const NIVEAUX = ['Technicien Spécialisé', 'Technicien', 'Qualification'];

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
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
    filiere: initial?.filiere || '',
    niveau: initial?.niveau || '',
    groupeId: initial?.groupeId || '',
    photoURL: initial?.photoURL || '',
    statut: initial?.statut || 'actif',
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

  const Field = ({ label, fieldKey, type = 'text', required = false }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[fieldKey]}
        onChange={e => { setForm(f => ({ ...f, [fieldKey]: e.target.value })); setErrors(er => ({ ...er, [fieldKey]: undefined })); }}
        className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
          errors[fieldKey] ? 'border-red-400 bg-red-50' : 'border-slate-300'
        }`}
      />
      {errors[fieldKey] && <p className="text-xs text-red-500 mt-1">{errors[fieldKey]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-slate-800">
            {initial ? 'Modifier l\'apprenant' : 'Ajouter un apprenant'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Filière</label>
              <select value={form.filiere} onChange={e => setForm(f => ({ ...f, filiere: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">— Sélectionner —</option>
                {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Niveau</label>
              <select value={form.niveau} onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">— Sélectionner —</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Groupe</label>
              <select value={form.groupeId} onChange={e => setForm(f => ({ ...f, groupeId: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="">— Sans groupe —</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Statut</label>
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="archive">Archivé</option>
              </select>
            </div>
          </div>

          <Field label="URL Photo de profil" fieldKey="photoURL" type="url" />

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
