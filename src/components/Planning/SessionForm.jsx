import { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';
import { intervenantsService, affectationsService } from '../../services/firestore';

const ANNEE_COURANTE = '2026-2027';

const TYPES = [
  { value: 'cours',     label: 'Cours',     color: 'bg-[#005989] text-white'  },
  { value: 'tp',        label: 'TP',        color: 'bg-[#8a9a0a] text-white'  },
  { value: 'td',        label: 'TD',        color: 'bg-[#d4a000] text-white'  },
  { value: 'exam',      label: 'Examen',    color: 'bg-red-500 text-white'    },
  { value: 'efm',       label: 'EFM',       color: 'bg-orange-500 text-white' },
  { value: 'eff',       label: 'EFF',       color: 'bg-rose-700 text-white'   },
  { value: 'cc',        label: 'Contrôle Continu', color: 'bg-violet-500 text-white' },
  { value: 'seminaire', label: 'Séminaire', color: 'bg-teal-500 text-white'   },
];
const STATUTS = [
  { value: 'planifiee', label: 'Planifiée' },
  { value: 'en_cours',  label: 'En cours'  },
  { value: 'terminee',  label: 'Terminée'  },
  { value: 'annulee',   label: 'Annulée'   },
];

const SPECIALITES = [
  'Développement Web', 'Réseaux & Systèmes', 'Bases de données',
  'Algorithmique', 'Gestion de projet', 'Marketing Digital', 'Comptabilité', 'Autre',
];

// Créneaux prédéfinis
const PLANNING_SLOTS = [
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

const ALL_TIMES = [...new Set(PLANNING_SLOTS.flatMap(s => [s.start, s.end]))].sort();

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

// ── Mini-modal: Nouvel intervenant ──────────────────────────────────────────
function NouvelIntervenantModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nom: '', prenom: '', specialite: '', email: '', telephone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.prenom.trim()) { setError('Nom et prénom obligatoires'); return; }
    setSaving(true);
    try {
      const created = await intervenantsService.create({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        specialite: form.specialite,
        actif: true,
      });
      onCreated(created);
    } catch (err) {
      setError('Erreur : ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-800">Nouvel intervenant</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                value={form.nom}
                onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                autoFocus
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                value={form.prenom}
                onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                required
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.telephone}
                onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Spécialité</label>
              <select
                value={form.specialite}
                onChange={e => setForm(f => ({ ...f, specialite: e.target.value }))}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] bg-white"
              >
                <option value="">—</option>
                {SPECIALITES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-bold text-white bg-[#005989] hover:bg-[#004a73] rounded-xl transition-colors disabled:opacity-60"
            >
              {saving ? 'Ajout…' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── SessionForm ───────────────────────────────────────────────────────────────
export default function SessionForm({ initial, groupes, intervenants, modules = [], defaultDate, onSave, onClose, onIntervenantCreated }) {
  const resolvedDate = initial?.date
    ? format(new Date(initial.date), 'yyyy-MM-dd')
    : (defaultDate ? format(new Date(defaultDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

  const [form, setForm] = useState({
    date:               resolvedDate,
    heureDebut:         initial?.heureDebut || '08:00',
    heureFin:           initial?.heureFin   || '10:00',
    module:             initial?.moduleId   || initial?.module || '',
    type:               initial?.type       || 'cours',
    groupeId:           initial?.groupeId   || '',
    intervenantId:      initial?.intervenantId || '',
    salle:              initial?.salle      || '',
    statut:             initial?.statut     || 'planifiee',
    notes:              initial?.notes      || '',
    contenuPedagogique: initial?.contenuPedagogique || '',
    syllabusURL:        initial?.syllabusURL || '',
    ficheSeanceURL:     initial?.ficheSeanceURL || '',
    syllabusNom:        initial?.syllabusNom || '',
    ficheSeanceNom:     initial?.ficheSeanceNom || '',
  });
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [conflicts, setConflicts] = useState(null);
  const [errors, setErrors] = useState({});
  const [showNewIntervenant, setShowNewIntervenant] = useState(false);
  const [newlyAdded, setNewlyAdded] = useState([]);
  const [uploadingSyllabus, setUploadingSyllabus] = useState(false);
  const [uploadingFiche, setUploadingFiche] = useState(false);
  const syllabusInputRef = useRef(null);
  const ficheInputRef = useRef(null);
  const [groupAffectations, setGroupAffectations] = useState([]);
  const [loadingAff, setLoadingAff] = useState(false);

  useEffect(() => {
    if (!form.groupeId) { setGroupAffectations([]); return; }
    let cancelled = false;
    setLoadingAff(true);
    affectationsService.getAll(ANNEE_COURANTE)
      .then(all => { if (!cancelled) setGroupAffectations(all.filter(a => a.groupeId === form.groupeId)); })
      .catch(() => { if (!cancelled) setGroupAffectations([]); })
      .finally(() => { if (!cancelled) setLoadingAff(false); });
    return () => { cancelled = true; };
  }, [form.groupeId]);

  // Modules available for the selected group (filtered by affectations when configured)
  const filteredModules = useMemo(() => {
    if (!form.groupeId || loadingAff || groupAffectations.length === 0) return modules;
    const moduleIds = new Set(groupAffectations.map(a => a.moduleId));
    return modules.filter(m => moduleIds.has(m.id));
  }, [form.groupeId, groupAffectations, loadingAff, modules]);

  const handleModuleChange = (moduleId) => {
    set('module', moduleId);
    if (moduleId && form.groupeId && groupAffectations.length > 0) {
      const aff = groupAffectations.find(a => a.moduleId === moduleId);
      if (aff?.intervenantId) set('intervenantId', aff.intervenantId);
    }
  };

  // Merge prop list with locally-created intervenants, avoiding duplicates
  const allIntervenants = useMemo(() => {
    const ids = new Set(intervenants.map(i => i.id));
    return [...intervenants, ...newlyAdded.filter(i => !ids.has(i.id))];
  }, [intervenants, newlyAdded]);

  const validate = () => {
    const e = {};
    if (!form.module.trim()) e.module   = 'Obligatoire';
    if (!form.date)           e.date    = 'Obligatoire';
    if (!form.groupeId)       e.groupeId = 'Obligatoire';
    return e;
  };

  const checkConflicts = async () => {
    if (!form.date) return null;
    try {
      const dateTs = Timestamp.fromDate(new Date(form.date));
      const snap = await getDocs(query(collection(db, 'sessions'), where('date', '==', dateTs)));
      const result = { salle: null, intervenant: null };
      snap.forEach(d => {
        if (initial?.id && d.id === initial.id) return;
        const s = d.data();
        if (s.statut === 'annulee') return;
        const overlaps = s.heureDebut < form.heureFin && s.heureFin > form.heureDebut;
        if (!overlaps) return;
        if (form.salle?.trim() && s.salle?.trim() && form.salle.trim().toLowerCase() === s.salle.trim().toLowerCase()) {
          result.salle = { module: s.module, groupe: s.groupeId, heure: `${s.heureDebut}–${s.heureFin}`, salle: s.salle };
        }
        if (form.intervenantId && s.intervenantId && form.intervenantId === s.intervenantId) {
          result.intervenant = { module: s.module, groupe: s.groupeId, heure: `${s.heureDebut}–${s.heureFin}` };
        }
      });
      return result.salle || result.intervenant ? result : null;
    } catch { return null; }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setChecking(true);
    const conflict = await checkConflicts();
    setChecking(false);
    if (conflict) { setConflicts(conflict); return; }
    setSaving(true);
    try {
      const data = { ...form };
      if (modules.length > 0 && form.module) {
        const mod = modules.find(m => m.id === form.module);
        if (mod) {
          data.module = `${mod.code} — ${mod.nom}`;
          data.moduleId = mod.id;
        }
      }
      await onSave(data);
    } finally { setSaving(false); }
  };

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    setErrors(er => ({ ...er, [key]: undefined }));
    setConflicts(null);
  };

  const inputCls = (key) =>
    `w-full text-sm border rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] transition-colors bg-white ${
      errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-200'
    }`;

  const selectedType = TYPES.find(t => t.value === form.type) || TYPES[0];

  const handleIntervenantCreated = (newIntervenant) => {
    setNewlyAdded(prev => [...prev, newIntervenant]);
    set('intervenantId', newIntervenant.id);
    setShowNewIntervenant(false);
    onIntervenantCreated?.();
  };

  const uploadFile = async (file, folder, setUploading, urlKey, nomKey) => {
    setUploading(true);
    try {
      const path = `sessions/${folder}/${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setForm(f => ({ ...f, [urlKey]: url, [nomKey]: file.name }));
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

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
            {/* No-affectation banner */}
            {form.groupeId && !loadingAff && groupAffectations.length === 0 && modules.length > 0 && (
              <div className="mb-2 flex items-start gap-2 rounded-xl border border-orange-300 bg-orange-50 px-3 py-2.5">
                <span className="text-orange-500 mt-0.5 text-sm shrink-0">⚠</span>
                <div className="flex-1 text-xs text-orange-800">
                  <strong>Aucune affectation configurée pour ce groupe.</strong>
                  {' '}Configurez d'abord la masse horaire avant de planifier des séances.{' '}
                  <a href="/masse-horaire" className="underline font-semibold hover:text-orange-900">
                    Configurer les affectations →
                  </a>
                </div>
              </div>
            )}
            {loadingAff ? (
              <div className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 text-slate-400 bg-slate-50">
                Chargement des modules…
              </div>
            ) : filteredModules.length > 0 ? (
              <select value={form.module} onChange={e => handleModuleChange(e.target.value)} className={inputCls('module')}>
                <option value="">— Sélectionner un module —</option>
                {filteredModules.map(m => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
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
              Créneau horaire
            </label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {PLANNING_SLOTS.map(sl => (
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
            <div className="flex gap-2">
              <select
                value={form.intervenantId}
                onChange={e => set('intervenantId', e.target.value)}
                className={`${inputCls('')} flex-1`}
              >
                <option value="">— Sélectionner —</option>
                {allIntervenants.map(i => (
                  <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewIntervenant(true)}
                title="Ajouter un nouvel intervenant"
                className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-[#005989] hover:border-[#005989] hover:bg-[#005989]/5 transition-colors flex-shrink-0"
              >
                <PlusIcon />
              </button>
            </div>
            {newlyAdded.length > 0 && form.intervenantId && newlyAdded.find(i => i.id === form.intervenantId) && (
              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                <span>✓</span>
                <span>Nouvel intervenant ajouté et sélectionné</span>
              </p>
            )}
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

          {/* Contenu pédagogique */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Contenu pédagogique / Plan du cours
            </label>
            <textarea
              value={form.contenuPedagogique}
              onChange={e => set('contenuPedagogique', e.target.value)}
              rows={5}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] resize-y"
              placeholder={"Objectifs de la séance…\nPlan du cours :\n  1. \n  2. \nActivités / exercices…"}
            />
          </div>

          {/* Documents pédagogiques */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Documents pédagogiques</label>

            {/* Syllabus */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">Syllabus</p>
                {form.syllabusURL ? (
                  <a href={form.syllabusURL} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#005989] underline truncate block">
                    {form.syllabusNom || 'Voir le fichier'}
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">Aucun fichier</p>
                )}
              </div>
              <input
                ref={syllabusInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, 'syllabus', setUploadingSyllabus, 'syllabusURL', 'syllabusNom');
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={uploadingSyllabus}
                onClick={() => syllabusInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#005989] text-[#005989] rounded-lg hover:bg-[#005989]/5 transition-colors disabled:opacity-50 shrink-0"
              >
                {uploadingSyllabus ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                )}
                {uploadingSyllabus ? 'Envoi…' : form.syllabusURL ? 'Remplacer' : 'Uploader'}
              </button>
            </div>

            {/* Fiche de séance */}
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">Fiche de séance</p>
                {form.ficheSeanceURL ? (
                  <a href={form.ficheSeanceURL} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-[#005989] underline truncate block">
                    {form.ficheSeanceNom || 'Voir le fichier'}
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">Aucun fichier</p>
                )}
              </div>
              <input
                ref={ficheInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadFile(file, 'fiches', setUploadingFiche, 'ficheSeanceURL', 'ficheSeanceNom');
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={uploadingFiche}
                onClick={() => ficheInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#005989] text-[#005989] rounded-lg hover:bg-[#005989]/5 transition-colors disabled:opacity-50 shrink-0"
              >
                {uploadingFiche ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                  </svg>
                )}
                {uploadingFiche ? 'Envoi…' : form.ficheSeanceURL ? 'Remplacer' : 'Uploader'}
              </button>
            </div>
          </div>

          {/* Conflict banner */}
          {conflicts && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 space-y-1.5">
              <p className="text-sm font-bold text-amber-800 flex items-center gap-1.5">⚠️ Conflit détecté sur ce créneau</p>
              {conflicts.salle && (
                <p className="text-xs text-amber-700">
                  <strong>Salle "{conflicts.salle.salle}"</strong> déjà réservée — {conflicts.salle.module} ({conflicts.salle.heure})
                </p>
              )}
              {conflicts.intervenant && (
                <p className="text-xs text-amber-700">
                  <strong>Intervenant</strong> déjà affecté à une autre séance — {conflicts.intervenant.module} ({conflicts.intervenant.heure})
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setConflicts(null)}
                  className="text-xs font-semibold text-amber-700 underline">Modifier les champs</button>
                <button type="button" onClick={async () => { setConflicts(null); setSaving(true); try { const data={...form}; if(modules.length>0&&form.module){const mod=modules.find(m=>m.id===form.module);if(mod){data.module=`${mod.code} — ${mod.nom}`;data.moduleId=mod.id;}} await onSave(data); } finally { setSaving(false); } }}
                  className="text-xs font-semibold text-red-600 underline">Créer quand même</button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving || checking}
              className={`px-6 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-60 ${selectedType.color.replace('text-white', '').trim()} hover:opacity-90`}>
              {checking ? 'Vérification…' : saving ? 'Enregistrement…' : initial?.id ? 'Modifier' : 'Créer la séance'}
            </button>
          </div>
        </form>
      </div>

      {/* Mini-modal nouvel intervenant — z-index supérieur au formulaire */}
      {showNewIntervenant && (
        <NouvelIntervenantModal
          onClose={() => setShowNewIntervenant(false)}
          onCreated={handleIntervenantCreated}
        />
      )}
    </div>
  );
}
