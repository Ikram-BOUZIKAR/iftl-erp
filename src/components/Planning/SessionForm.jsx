import { useState } from 'react';
import { format } from 'date-fns';

const TYPES = [
  { value: 'cours', label: 'Cours',  color: 'bg-[#005989] text-white' },
  { value: 'tp',    label: 'TP',     color: 'bg-[#8a9a0a] text-white' },
  { value: 'td',    label: 'TD',     color: 'bg-[#d4a000] text-white' },
  { value: 'exam',  label: 'Examen', color: 'bg-red-500 text-white'   },
];
const STATUTS = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'en_cours',  label: 'En cours'  },
  { value: 'terminee',  label: 'Terminée'  },
  { value: 'annulee',   label: 'Annulée'   },
];

// Créneaux IFTL prédéfinis
const IFTL_SLOTS = [
  { label: 'C1 Lun–Jeu', start: '09:00', end: '10:30' },
  { label: 'C2 Lun–Jeu', start: '10:45', end: '12:15' },
  { label: 'C3 Lun–Jeu', start: '13:15', end: '14:45' },
  { label: 'C4 Lun–Jeu', start: '15:00', end: '16:30' },
  { label: 'C3 Ven',     start: '14:15', end: '15:45' },
  { label: 'C4 Ven',     start: '16:00', end: '17:30' },
  { label: 'C1 Sam',     start: '09:00', end: '11:00' },
  { label: 'C2 Sam',     start: '11:15', end: '13:15' },
  { label: 'C3 Sam',     start: '14:15', end: '17:30' },
  { label: 'Dim matin',  start: '09:00', end: '13:00' },
];

// All unique start times for the select
const ALL_TIMES = [...new Set(IFTL_SLOTS.flatMap(s => [s.start, s.end]))].sort();

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function SessionForm({ initial, groupes, intervenants, modules = [], defaultDate, onSave, onClose }) {
  const resolvedDate = initial?.date
    ? format(new Date(initial.date), 'yyyy-MM-dd')
    : (defaultDate ? format(new Date(defaultDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

  const [form, setForm] = useState({
    date:          resolvedDate,
    heureDebut:    initial?.heureDebut || '08:00',
    heureFin:      initial?.heureFin   || '10:00',
    module:        initial?.module     || '',
    type:          initial?.type       || 'cours',
    groupeId:      initial?.groupeId   || '',
    intervenantId: initial?.intervenantId || '',
    salle:         initial?.salle      || '',
    statut:        initial?.statut     || 'planifiee',
    notes:         initial?.notes      || '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.module.trim()) e.module   = 'Obligatoire';
    if (!form.date)           e.date    = 'Obligatoire';
    if (!form.groupeId)       e.groupeId = 'Obligatoire';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(er => ({ ...er, [key]: undefined }));
  };

  const inputCls = (key) =>
    `w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] transition-colors bg-white ${
      errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-200'
    }`;

  const selectedType = TYPES.find(t => t.value === form.type) || TYPES[0];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

        {/* Header with type color accent */}
        <div className={`px-6 py-4 rounded-t-2xl ${selectedType.color} flex items-center justify-between`}>
          <div>
            <h2 className="text-base font-bold">{initial?.id ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
            <p className="text-xs opacity-75 mt-0.5">{selectedType.label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg opacity-75 hover:opacity-100 hover:bg-white/20 transition">
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Type selector — pill buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Type de séance</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => set('type', t.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                    form.type === t.value
                      ? `${t.color} border-transparent shadow-sm`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Module <span className="text-red-500">*</span>
            </label>
            {modules.length > 0 ? (
              <select value={form.module} onChange={e => set('module', e.target.value)} className={inputCls('module')}>
                <option value="">— Sélectionner un module —</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
              </select>
            ) : (
              <input type="text" value={form.module} onChange={e => set('module', e.target.value)}
                placeholder="Ex: OTM-M01, Logistique…" className={inputCls('module')} />
            )}
            {errors.module && <p className="text-xs text-red-500 mt-1">{errors.module}</p>}
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls('date')} />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Créneau quick-select */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Créneau horaire IFTL
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {IFTL_SLOTS.map(sl => (
                <button key={sl.label} type="button"
                  onClick={() => { set('heureDebut', sl.start); set('heureFin', sl.end); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    form.heureDebut === sl.start && form.heureFin === sl.end
                      ? 'bg-[#005989] text-white border-[#005989]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#005989]/40'
                  }`}>
                  {sl.label} ({sl.start}–{sl.end})
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Début personnalisé</label>
                <select value={form.heureDebut} onChange={e => set('heureDebut', e.target.value)} className={inputCls('')}>
                  {ALL_TIMES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Fin personnalisée</label>
                <select value={form.heureFin} onChange={e => set('heureFin', e.target.value)} className={inputCls('')}>
                  {ALL_TIMES.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Groupe + Salle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Groupe <span className="text-red-500">*</span>
              </label>
              <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)}
                className={inputCls('groupeId')}>
                <option value="">— Sélectionner —</option>
                {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
              {errors.groupeId && <p className="text-xs text-red-500 mt-1">{errors.groupeId}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Salle</label>
              <input type="text" value={form.salle} onChange={e => set('salle', e.target.value)}
                placeholder="Ex: Salle A, Lab 1…" className={inputCls('')} />
            </div>
          </div>

          {/* Intervenant */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Intervenant</label>
            <select value={form.intervenantId} onChange={e => set('intervenantId', e.target.value)} className={inputCls('')}>
              <option value="">— Sélectionner —</option>
              {intervenants.map(i => <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>)}
            </select>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Statut</label>
            <div className="flex gap-2 flex-wrap">
              {STATUTS.map(s => (
                <button key={s.value} type="button"
                  onClick={() => set('statut', s.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    form.statut === s.value
                      ? 'bg-[#005989] text-white border-[#005989]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Notes (optionnel)</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] resize-none"
              placeholder="Informations complémentaires…" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className={`px-6 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-60 ${selectedType.color.replace('text-white', '').trim()} hover:opacity-90`}>
              {saving ? 'Enregistrement…' : initial?.id ? 'Modifier' : 'Créer la séance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
