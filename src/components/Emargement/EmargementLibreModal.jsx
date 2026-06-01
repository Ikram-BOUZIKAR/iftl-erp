import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { sessionsService } from '../../services/firestore';
import { useToast } from '../UI/Toast';

const NIVEAU_ORDER = ['TS 1A', 'TS 2A', 'Technicien', 'T', 'Qualification', 'Licence', 'Mastère'];
const TYPES = [
  { value: 'cours', label: 'Cours'  },
  { value: 'tp',    label: 'TP'     },
  { value: 'td',    label: 'TD'     },
  { value: 'exam',  label: 'Examen' },
];
const ALL_SLOTS = [
  { label: 'C1 Lun–Jeu',   start: '09:00', end: '10:30' },
  { label: 'C2 Lun–Jeu',   start: '10:45', end: '12:15' },
  { label: 'C3 Lun–Jeu',   start: '13:15', end: '14:45' },
  { label: 'C4 Lun–Jeu',   start: '15:00', end: '16:30' },
  { label: 'C3 Vendredi',  start: '14:15', end: '15:45' },
  { label: 'C4 Vendredi',  start: '16:00', end: '17:30' },
  { label: 'C1 Samedi',    start: '09:00', end: '11:00' },
  { label: 'C2 Samedi',    start: '11:15', end: '13:15' },
  { label: 'C3 Samedi',    start: '14:15', end: '17:30' },
  { label: 'Dim matin',    start: '09:00', end: '13:00' },
];

export default function EmargementLibreModal({ groupes, intervenants, onClose }) {
  const navigate = useNavigate();
  const toast    = useToast();

  const [form, setForm] = useState({
    niveau:        '',
    groupeId:      '',
    intervenantId: '',
    moduleId:      '',
    type:          'cours',
    date:          new Date().toISOString().split('T')[0],
    heureDebut:    '09:00',
    heureFin:      '10:30',
    salle:         '',
    contenuSeance: '',
    objectifs:     '',
  });
  const [modules, setModules] = useState([]);
  const [saving,  setSaving]  = useState(false);

  const niveaux = [...new Set(groupes.map(g => g.niveau).filter(Boolean))]
    .sort((a, b) => {
      const ai = NIVEAU_ORDER.indexOf(a);
      const bi = NIVEAU_ORDER.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  const groupesFiltres = form.niveau ? groupes.filter(g => g.niveau === form.niveau) : groupes;
  const selectedGroupe = groupes.find(g => g.id === form.groupeId);

  useEffect(() => {
    if (!selectedGroupe?.filiereCode) { setModules([]); return; }
    getDocs(query(
      collection(db, 'modules'),
      where('filiereCode', '==', selectedGroupe.filiereCode),
      orderBy('code', 'asc')
    )).then(snap => {
      const mods = [];
      snap.forEach(d => mods.push({ id: d.id, ...d.data() }));
      setModules(mods);
    }).catch(() => setModules([]));
  }, [selectedGroupe?.filiereCode]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.groupeId || !form.date || !form.heureDebut) {
      toast.error('Groupe, date et créneau sont obligatoires');
      return;
    }
    setSaving(true);
    try {
      const mod = modules.find(m => m.id === form.moduleId);
      const moduleLabel = mod ? `${mod.code} — ${mod.nom}` : (form.moduleId || 'Séance libre');
      const session = await sessionsService.create({
        groupeId:      form.groupeId,
        intervenantId: form.intervenantId || null,
        module:        moduleLabel,
        moduleId:      form.moduleId || null,
        type:          form.type,
        date:          form.date,
        heureDebut:    form.heureDebut,
        heureFin:      form.heureFin,
        salle:         form.salle,
        contenuSeance: form.contenuSeance,
        objectifs:     form.objectifs,
        statut:        'en_cours',
      });
      navigate(`/emargement/${session.id}`);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
      setSaving(false);
    }
  };

  const inp = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] bg-white';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-[#005989] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base">Nouvelle feuille d'émargement libre</h2>
            <p className="text-[11px] opacity-70 mt-0.5">Créez une feuille sans passer par le planning</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg opacity-75 hover:opacity-100 hover:bg-white/20 transition text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Niveau + Groupe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Niveau</label>
              <select value={form.niveau} onChange={e => { set('niveau', e.target.value); set('groupeId', ''); }} className={inp}>
                <option value="">Tous les niveaux</option>
                {niveaux.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Groupe <span className="text-red-500">*</span>
              </label>
              <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)} className={inp} required>
                <option value="">— Sélectionner —</option>
                {groupesFiltres.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Module + Intervenant */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Module</label>
              <select value={form.moduleId} onChange={e => set('moduleId', e.target.value)} className={inp}>
                <option value="">— Sélectionner —</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.code} — {m.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Intervenant</label>
              <select value={form.intervenantId} onChange={e => set('intervenantId', e.target.value)} className={inp}>
                <option value="">— Sélectionner —</option>
                {intervenants.map(i => <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Type</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => set('type', t.value)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
                    form.type === t.value
                      ? 'bg-[#005989] text-white border-[#005989]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-[#005989]/30'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Salle</label>
              <input type="text" placeholder="Ex: Salle A, Lab 1…" value={form.salle} onChange={e => set('salle', e.target.value)} className={inp} />
            </div>
          </div>

          {/* Créneaux */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Créneau horaire <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SLOTS.map(sl => (
                <button key={`${sl.start}-${sl.end}`} type="button"
                  onClick={() => { set('heureDebut', sl.start); set('heureFin', sl.end); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    form.heureDebut === sl.start && form.heureFin === sl.end
                      ? 'bg-[#005989] text-white border-[#005989] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#005989]/40 hover:bg-[#005989]/5'
                  }`}>
                  {sl.label} · {sl.start}–{sl.end}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5">
              Sélectionné : <span className="font-semibold text-[#005989]">{form.heureDebut} → {form.heureFin}</span>
            </p>
          </div>

          {/* Contenu de la séance */}
          <div className="rounded-xl border border-[#005989]/20 bg-[#005989]/3 p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#005989] uppercase tracking-wide mb-1.5">
                📝 Contenu de la séance
              </label>
              <textarea
                rows={4}
                value={form.contenuSeance}
                onChange={e => set('contenuSeance', e.target.value)}
                placeholder="Décrivez le contenu de la séance : sujets traités, activités, supports utilisés, exercices, évaluations…"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] resize-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#005989] uppercase tracking-wide mb-1.5">
                🎯 Objectifs pédagogiques
              </label>
              <textarea
                rows={2}
                value={form.objectifs}
                onChange={e => set('objectifs', e.target.value)}
                placeholder="Compétences visées, objectifs d'apprentissage attendus…"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] resize-none bg-white"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2 text-sm font-bold text-white bg-[#005989] hover:bg-[#004a73] rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Création…' : 'Créer la feuille d\'émargement →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
