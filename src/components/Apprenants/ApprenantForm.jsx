import { useState } from 'react';

const FILIERES = ['Développement Digital', 'Infrastructure Digitale', 'Gestion', 'Marketing', 'Comptabilité'];
const NIVEAUX = ['Technicien Spécialisé', 'Technicien', 'Qualification'];

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

  const field = (label, key, type = 'text', required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: undefined })); }}
        className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors[key] ? 'border-red-400' : 'border-gray-300'}`}
      />
      {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Modifier l\'apprenant' : 'Ajouter un apprenant'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {field('Nom', 'nom', 'text', true)}
            {field('Prénom', 'prenom', 'text', true)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('Email', 'email', 'email', true)}
            {field('Téléphone', 'telephone', 'tel')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {field('CIN', 'cin')}
            {field('Date de naissance', 'dateNaissance', 'date')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Filière</label>
              <select
                value={form.filiere}
                onChange={e => setForm(f => ({ ...f, filiere: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="">— Sélectionner —</option>
                {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Niveau</label>
              <select
                value={form.niveau}
                onChange={e => setForm(f => ({ ...f, niveau: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="">— Sélectionner —</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Groupe</label>
              <select
                value={form.groupeId}
                onChange={e => setForm(f => ({ ...f, groupeId: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="">— Sans groupe —</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={form.statut}
                onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none"
              >
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
                <option value="archive">Archivé</option>
              </select>
            </div>
          </div>

          {field('URL Photo de profil', 'photoURL', 'url')}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
              {saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
