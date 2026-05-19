import { useState } from 'react';
import { format } from 'date-fns';

const TYPES = ['cours', 'tp', 'td', 'exam'];
const STATUTS = ['planifiee', 'en_cours', 'terminee', 'annulee'];
const HOURS = Array.from({ length: 22 }, (_, i) => {
  const h = Math.floor(i / 2) + 8;
  const m = i % 2 === 0 ? '00' : '30';
  return `${String(h).padStart(2, '0')}:${m}`;
});

export default function SessionForm({ initial, groupes, intervenants, defaultDate, onSave, onClose }) {
  const [form, setForm] = useState({
    date: initial?.date ? format(new Date(initial.date), 'yyyy-MM-dd') : (defaultDate ? format(defaultDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
    heureDebut: initial?.heureDebut || '08:00',
    heureFin: initial?.heureFin || '10:00',
    module: initial?.module || '',
    type: initial?.type || 'cours',
    groupeId: initial?.groupeId || '',
    intervenantId: initial?.intervenantId || '',
    salle: initial?.salle || '',
    statut: initial?.statut || 'planifiee',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.module.trim()) e.module = 'Obligatoire';
    if (!form.date) e.date = 'Obligatoire';
    if (!form.groupeId) e.groupeId = 'Obligatoire';
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

  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setErrors(er => ({ ...er, [key]: undefined })); };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{initial ? 'Modifier la séance' : 'Ajouter une séance'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Module / Matière <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.module}
              onChange={e => set('module', e.target.value)}
              placeholder="Ex: Développement Web, Base de données…"
              className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.module ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.module && <p className="text-xs text-red-500 mt-1">{errors.module}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none ${errors.date ? 'border-red-400' : 'border-gray-300'}`} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heure début</label>
              <select value={form.heureDebut} onChange={e => set('heureDebut', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Heure fin</label>
              <select value={form.heureFin} onChange={e => set('heureFin', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Groupe <span className="text-red-500">*</span></label>
              <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)}
                className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none ${errors.groupeId ? 'border-red-400' : 'border-gray-300'}`}>
                <option value="">— Sélectionner —</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
              {errors.groupeId && <p className="text-xs text-red-500 mt-1">{errors.groupeId}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Intervenant</label>
              <select value={form.intervenantId} onChange={e => set('intervenantId', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                <option value="">— Sélectionner —</option>
                {intervenants.map(i => <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Salle</label>
              <input type="text" value={form.salle} onChange={e => set('salle', e.target.value)} placeholder="Ex: Salle A, Lab 1…"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none">
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {saving ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
