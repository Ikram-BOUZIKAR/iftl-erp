/**
 * PlanningAutoModal — wizard de planification automatique intelligente.
 *
 * Étape 1 : sélection de l'affectation (module + intervenant + groupe + h restantes)
 *           + éventuelle extension multi-groupes (même cours, grande salle)
 * Étape 2 : disponibilités (grille jour × période) + date début, salle, type
 * Étape 3 : aperçu des séances générées → confirmation → batch Firestore
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  collection, getDocs, query, where, writeBatch, doc, Timestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { affectationsService } from '../../services/firestore';
import { useToast } from '../UI/Toast';

// ── Créneaux (copie de PlanningPage) ─────────────────────────────────────────
const DAY_SLOTS = [
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }], // Lun
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }], // Mar
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }], // Mer
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '13:15', end: '14:45' }, { start: '15:00', end: '16:30' }], // Jeu
  [{ start: '09:00', end: '10:30' }, { start: '10:45', end: '12:15' }, { start: '14:15', end: '15:45' }, { start: '16:00', end: '17:30' }], // Ven
  [{ start: '09:00', end: '11:00' }, { start: '11:15', end: '13:15' }, { start: '14:15', end: '17:30' }],                                    // Sam
];
const DAY_LABELS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// slot indices par période
const PERIOD_SLOTS = {
  matin:  [0, 1],
  apm:    [2, 3],
};

// Grande salle = peut accueillir plusieurs groupes simultanément
const GRANDES_SALLES = ['Grande Salle 01', 'Grande Salle 02', 'Amphi'];

const SALLE_GROUPS = [
  { label: 'Grandes salles (multi-groupes)', salles: ['Grande Salle 01', 'Grande Salle 02', 'Amphi'] },
  { label: 'Bloc 3x / Pédagogie', salles: ['33', '34', '35', '36', '43', '44', '45', '46'] },
  { label: 'Autres salles', salles: ['21', '22', '24', '25', '26'] },
  { label: 'Salles spécialisées', salles: ['Entrepôt', 'Salle Info 7', 'Salle Info 16', 'Salle Simu 6', 'Salle Simu 9', 'Pistes'] },
];

const SALLE_PRESETS = SALLE_GROUPS.flatMap(g => g.salles);

const TYPES = [
  { id: 'cours', label: 'Cours' },
  { id: 'tp',    label: 'TP' },
  { id: 'td',    label: 'TD' },
  { id: 'cc',    label: 'CC' },
  { id: 'efm',   label: 'EFM' },
  { id: 'eff',   label: 'EFF' },
];

const ANNEE = '2026-2027';

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMin(time) {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
function slotH(slot) { return (toMin(slot.end) - toMin(slot.start)) / 60; }

// JS getDay() : 0=dim, 1=lun … → convert to Mon=0..Sat=5..Sun=6
function jsDayToIndex(jsDay) { return (jsDay + 6) % 7; }

function dateKey(dateStr, heureDebut) { return `${dateStr}|${heureDebut}`; }

// ── Algorithme de génération ──────────────────────────────────────────────────
function generateSessions({
  moduleId, intervenantId, groupeIds,
  masseHoraire, heuresFaites,
  availableKeys,   // Set of "dayIndex|slotIndex"
  startDate,
  salle, type,
  existingSessions, // [{groupeId, date: 'yyyy-MM-dd', heureDebut, intervenantId}]
}) {
  let remaining = Math.max(0, masseHoraire - heuresFaites);
  const generated = [];
  let current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  // Build conflict lookup: "dateStr|heureDebut" → Set<groupeId>
  const groupConflicts = {};
  const intervenantConflicts = new Set();
  for (const s of existingSessions) {
    const k = dateKey(s.date, s.heureDebut);
    if (!groupConflicts[k]) groupConflicts[k] = new Set();
    groupConflicts[k].add(s.groupeId);
    if (s.intervenantId && s.intervenantId === intervenantId) {
      intervenantConflicts.add(k);
    }
  }

  const MAX_DAYS = 700;
  let daysScanned = 0;

  while (remaining > 0.05 && daysScanned < MAX_DAYS) {
    const dayIndex = jsDayToIndex(current.getDay());
    const slotsForDay = DAY_SLOTS[dayIndex];
    const dateStr = format(current, 'yyyy-MM-dd');

    if (slotsForDay && dayIndex <= 5) { // Mon–Sat only
      for (let si = 0; si < slotsForDay.length; si++) {
        if (!availableKeys.has(`${dayIndex}|${si}`)) continue;

        const slot = slotsForDay[si];
        const k    = dateKey(dateStr, slot.start);

        // Intervenant conflict with OTHER groups (not the ones in our batch)
        const intervenantBusy = intervenantId &&
          intervenantConflicts.has(k) &&
          // Only block if the conflicting session is for a DIFFERENT group
          [...(groupConflicts[k] || [])].some(gId => !groupeIds.includes(gId));

        // Group conflict (existing sessions)
        const groupBusy = groupeIds.some(gId => groupConflicts[k]?.has(gId));

        // Generated sessions conflicts
        const genKey = k;
        const genGroupBusy = generated.some(s => s._key === genKey && groupeIds.includes(s.groupeId));
        // Intervenant busy from already-generated sessions (different module)
        const genIntervenantBusy = intervenantId && generated.some(
          s => s._key === genKey && s.intervenantId === intervenantId && !groupeIds.includes(s.groupeId)
        );

        if (intervenantBusy || groupBusy || genGroupBusy || genIntervenantBusy) continue;

        // ✅ Slot available — add one session per group
        const h = slotH(slot);
        for (const gId of groupeIds) {
          generated.push({
            _key: genKey,
            _tempId: `${dateStr}_${slot.start}_${gId}_${Math.random().toString(36).slice(2, 6)}`,
            groupeId: gId,
            moduleId,
            intervenantId: intervenantId || '',
            date: dateStr,
            heureDebut: slot.start,
            heureFin: slot.end,
            type,
            salle,
            note: '',
            statut: 'planifiee',
          });
        }
        remaining -= h;
        if (remaining <= 0.05) break;
      }
    }

    current = addDays(current, 1);
    daysScanned++;
  }

  return generated;
}

// ── UI Components ─────────────────────────────────────────────────────────────
function Ico({ path, size = 'w-4 h-4', stroke = 'currentColor', sw = 1.5 }) {
  return (
    <svg className={size} fill="none" stroke={stroke} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={path} />
    </svg>
  );
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.min(100, Math.round(100 * done / total)) : 0;
  const color = pct >= 100 ? '#94a3b8' : pct >= 80 ? '#f59e0b' : '#005989';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Step 1: Sélection affectation ─────────────────────────────────────────────
function Step1({ modules, groupes, intervenants, onNext, onClose }) {
  const [affectations, setAffectations] = useState([]);
  const [allSessions,  setAllSessions]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);   // affectation choisie
  const [extraGroups,  setExtraGroups]  = useState([]);     // groupeIds supplémentaires
  const [searchQ,      setSearchQ]      = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [affs, sessions] = await Promise.all([
          affectationsService.getAll(ANNEE),
          getDocs(collection(db, 'sessions')).then(s => s.docs.map(d => ({ id: d.id, ...d.data() }))),
        ]);
        setAffectations(affs);
        setAllSessions(sessions.map(s => ({
          ...s,
          date: s.date?.toDate ? format(s.date.toDate(), 'yyyy-MM-dd') : (s.date || ''),
        })));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const enriched = useMemo(() => affectations.map(a => {
    const mod  = modules.find(m => m.id === a.moduleId);
    const grp  = groupes.find(g => g.id === a.groupeId);
    const intv = intervenants.find(i => i.id === a.intervenantId);
    const done = affectationsService.computeHeuresFaites(a, allSessions);
    const remaining = Math.max(0, (a.masseHoraire || 0) - done);
    return { ...a, moduleName: mod?.nom || a.moduleId, groupeNom: grp?.nom || '—',
             filiere: grp?.filiere || '', intervenantNom: intv ? `${intv.prenom} ${intv.nom}` : '—',
             heuresFaites: done, remaining };
  }), [affectations, allSessions, modules, groupes, intervenants]);

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return enriched;
    const q = searchQ.toLowerCase();
    return enriched.filter(a =>
      a.moduleName.toLowerCase().includes(q) ||
      a.groupeNom.toLowerCase().includes(q) ||
      a.intervenantNom.toLowerCase().includes(q) ||
      a.filiere.toLowerCase().includes(q)
    );
  }, [enriched, searchQ]);

  // Groups that share the same module + intervenant (for multi-group)
  const compatibleGroups = useMemo(() => {
    if (!selected) return [];
    return groupes.filter(g =>
      g.id !== selected.groupeId &&
      affectations.some(a => a.moduleId === selected.moduleId && a.intervenantId === selected.intervenantId && a.groupeId === g.id)
    );
  }, [selected, affectations, groupes]);

  const toggleExtra = (gId) => {
    setExtraGroups(prev => prev.includes(gId) ? prev.filter(x => x !== gId) : [...prev, gId]);
  };

  const allGroupeIds = selected ? [selected.groupeId, ...extraGroups] : [];

  const canNext = selected && selected.remaining > 0.05;

  const handleNext = () => {
    onNext({ affectation: selected, allGroupeIds, allSessions });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-base font-bold text-slate-800">Sélectionner l'affectation</h2>
        <p className="text-xs text-slate-400 mt-0.5">Choisissez le module à planifier — seules les affectations avec des heures restantes sont présentées</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Ico path="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" size="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Rechercher module, groupe, intervenant…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#005989] bg-white"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading && <div className="py-8 text-center text-slate-400 text-sm">Chargement…</div>}
        {!loading && filtered.length === 0 && (
          <div className="py-8 text-center text-slate-400 text-sm">Aucune affectation trouvée</div>
        )}
        {filtered.map(a => {
          const isSelected = selected?.id === a.id;
          const finished = a.remaining <= 0.05;
          return (
            <button
              key={a.id}
              onClick={() => { if (!finished) { setSelected(a); setExtraGroups([]); } }}
              disabled={finished}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                finished ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50' :
                isSelected ? 'border-[#005989] bg-blue-50/60' : 'border-slate-200 bg-white hover:border-[#005989]/40'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate">{a.moduleName}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-slate-500">
                    <span className="font-medium text-[#005989]">{a.groupeNom}</span>
                    {a.filiere && <span className="text-slate-400">{a.filiere}</span>}
                    <span>👤 {a.intervenantNom}</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar done={a.heuresFaites} total={a.masseHoraire || 0} />
                    <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                      <span>{a.heuresFaites}h / {a.masseHoraire}h</span>
                      <span className={`font-semibold ${a.remaining <= 0 ? 'text-slate-400' : 'text-[#005989]'}`}>
                        {a.remaining > 0 ? `${Math.round(a.remaining * 10) / 10}h restantes` : 'Terminé'}
                      </span>
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[#005989] flex items-center justify-center shrink-0 mt-0.5">
                    <Ico path="M5 13l4 4L19 7" size="w-3 h-3" stroke="white" sw={2.5} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Multi-group option */}
      {selected && compatibleGroups.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
            <Ico path="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" size="w-3.5 h-3.5" stroke="#92400e" />
            Cours mutualisé — groupes supplémentaires
          </div>
          <div className="text-xs text-amber-700 mb-2">
            Ces groupes ont le même module avec le même intervenant. Vous pouvez les planifier simultanément dans une grande salle.
          </div>
          <div className="flex flex-wrap gap-2">
            {compatibleGroups.map(g => (
              <button
                key={g.id}
                onClick={() => toggleExtra(g.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  extraGroups.includes(g.id)
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : 'bg-white border-amber-300 text-amber-700 hover:border-amber-500'
                }`}
              >
                {g.nom}
              </button>
            ))}
          </div>
          {extraGroups.length > 0 && (
            <p className="text-xs text-amber-700 mt-2">
              ⚠️ Pensez à choisir une grande salle (Salle 01, Salle 02, Amphi) à l'étape suivante.
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
          Annuler
        </button>
        <div className="flex-1" />
        <button
          onClick={handleNext}
          disabled={!canNext}
          className="px-5 py-2 bg-[#005989] text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#004a73] transition-colors flex items-center gap-2"
        >
          Suivant
          <Ico path="M9 5l7 7-7 7" size="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Disponibilités + contraintes ──────────────────────────────────────
function Step2({ affectation, allGroupeIds, allSessions, modules, groupes, intervenants, onNext, onBack }) {
  // availKeys: Set of "dayIndex|slotIndex"
  const [availKeys, setAvailKeys] = useState(() => new Set());
  const [startDate,  setStartDate]  = useState(() => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [salle,      setSalle]      = useState('');
  const [salleCustom, setSalleCustom] = useState('');
  const [salleMode,  setSalleMode]  = useState('preset'); // 'preset' | 'custom'
  const [type,       setType]       = useState('cours');
  const [skipVac,    setSkipVac]    = useState(true);

  const toggleCell = (dayIndex, period) => {
    setAvailKeys(prev => {
      const next = new Set(prev);
      const slots = PERIOD_SLOTS[period] || [];
      const daySlots = DAY_SLOTS[dayIndex] || [];
      const actualSlots = slots.filter(si => si < daySlots.length);
      const allOn = actualSlots.every(si => next.has(`${dayIndex}|${si}`));
      actualSlots.forEach(si => {
        if (allOn) next.delete(`${dayIndex}|${si}`);
        else next.add(`${dayIndex}|${si}`);
      });
      return next;
    });
  };

  const isCellOn = (dayIndex, period) => {
    const slots = PERIOD_SLOTS[period] || [];
    const daySlots = DAY_SLOTS[dayIndex] || [];
    const actualSlots = slots.filter(si => si < daySlots.length);
    return actualSlots.length > 0 && actualSlots.every(si => availKeys.has(`${dayIndex}|${si}`));
  };

  const isCellPartial = (dayIndex, period) => {
    const slots = PERIOD_SLOTS[period] || [];
    const daySlots = DAY_SLOTS[dayIndex] || [];
    const actualSlots = slots.filter(si => si < daySlots.length);
    const count = actualSlots.filter(si => availKeys.has(`${dayIndex}|${si}`)).length;
    return count > 0 && count < actualSlots.length;
  };

  const finalSalle = salleMode === 'preset' ? salle : salleCustom;
  const isMultiGroup = allGroupeIds.length > 1;
  const isLargeSalle = GRANDES_SALLES.includes(finalSalle);

  // Warn if multi-group without grande salle
  const multiGroupWarning = isMultiGroup && !isLargeSalle && finalSalle;

  const canNext = availKeys.size > 0 && startDate;

  const mod  = modules.find(m => m.id === affectation.moduleId);
  const intv = intervenants.find(i => i.id === affectation.intervenantId);
  const grps = allGroupeIds.map(gId => groupes.find(g => g.id === gId)?.nom || gId);

  const handleNext = () => {
    onNext({ availKeys, startDate, salle: finalSalle, type, skipVac });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-base font-bold text-slate-800">Disponibilités &amp; contraintes</h2>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <span className="text-xs bg-blue-50 text-[#005989] px-2.5 py-1 rounded-full font-medium border border-blue-100">
            {mod?.nom || affectation.moduleId}
          </span>
          {grps.map(g => (
            <span key={g} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{g}</span>
          ))}
          {intv && (
            <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium border border-green-100">
              👤 {intv.prenom} {intv.nom}
            </span>
          )}
          <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-semibold border border-orange-100">
            {Math.round(affectation.remaining * 10) / 10}h à planifier
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5 pr-1">
        {/* Disponibilités grid */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Disponibilités de l'intervenant</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-separate" style={{ borderSpacing: '4px' }}>
              <thead>
                <tr>
                  <th className="text-left text-xs text-slate-400 font-medium pb-1 pl-1 w-24" />
                  <th className="text-center text-xs text-slate-500 font-semibold pb-1 px-2">Matin<br /><span className="font-normal text-slate-400 text-[10px]">09h – 12h15</span></th>
                  <th className="text-center text-xs text-slate-500 font-semibold pb-1 px-2">Après-midi<br /><span className="font-normal text-slate-400 text-[10px]">13h15 – 17h30</span></th>
                </tr>
              </thead>
              <tbody>
                {DAY_LABELS.map((day, di) => (
                  <tr key={di}>
                    <td className="text-xs font-semibold text-slate-600 pl-1 pr-2 py-0.5 whitespace-nowrap">{day}</td>
                    {['matin', 'apm'].map(period => {
                      const on      = isCellOn(di, period);
                      const partial = isCellPartial(di, period);
                      const daySlots = DAY_SLOTS[di] || [];
                      const actualSlots = (PERIOD_SLOTS[period] || []).filter(si => si < daySlots.length);
                      if (actualSlots.length === 0) return (
                        <td key={period} className="text-center">
                          <div className="w-full h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <span className="text-[10px] text-slate-300">—</span>
                          </div>
                        </td>
                      );
                      return (
                        <td key={period} className="text-center">
                          <button
                            onClick={() => toggleCell(di, period)}
                            className="w-full h-9 rounded-lg border-2 text-xs font-semibold transition-all"
                            style={on
                              ? { background: '#005989', borderColor: '#005989', color: '#fff' }
                              : partial
                              ? { background: '#dbeafe', borderColor: '#93c5fd', color: '#1d4ed8' }
                              : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#94a3b8' }
                            }
                          >
                            {on ? '✓' : partial ? '~' : '+'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {availKeys.size === 0 && (
            <p className="text-xs text-red-500 mt-1">Sélectionnez au moins un créneau</p>
          )}
        </div>

        {/* Date de départ */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date de départ</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#005989]"
          />
        </div>

        {/* Salle */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
            Salle {isMultiGroup && <span className="text-amber-600">· Cours mutualisé — grande salle recommandée</span>}
          </label>
          <div className="space-y-2 mb-2">
            {SALLE_GROUPS.map(group => (
              <div key={group.label}>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{group.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {group.salles.map(s => (
                    <button
                      key={s}
                      onClick={() => { setSalle(s); setSalleMode('preset'); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        salleMode === 'preset' && salle === s
                          ? (GRANDES_SALLES.includes(s) ? 'bg-amber-600 border-amber-600 text-white' : 'bg-[#005989] border-[#005989] text-white')
                          : 'bg-white border-slate-200 text-slate-600 hover:border-[#005989]/50'
                      }`}
                    >
                      {GRANDES_SALLES.includes(s) ? `🏛️ ${s}` : s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => { setSalleMode('custom'); setSalle(''); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                salleMode === 'custom'
                  ? 'bg-slate-700 border-slate-700 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              Saisie libre
            </button>
          </div>
          {salleMode === 'custom' && (
            <input
              value={salleCustom}
              onChange={e => setSalleCustom(e.target.value)}
              placeholder="Ex: Salle 12, Labo info…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#005989]"
            />
          )}
          {multiGroupWarning && (
            <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
              <Ico path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size="w-3.5 h-3.5" />
              Cours mutualisé sur plusieurs groupes — choisissez une grande salle (Salle 01, Salle 02 ou Amphi)
            </p>
          )}
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Type de séance</label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  type === t.id
                    ? 'bg-[#001829] border-[#001829] text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={skipVac}
              onChange={e => setSkipVac(e.target.checked)}
              className="w-4 h-4 rounded accent-[#005989]"
            />
            <span className="text-sm text-slate-700">Ignorer les jours fériés et vacances</span>
          </label>
          <p className="text-xs text-slate-400 ml-6.5 mt-0.5">Les créneaux tombant sur une période de vacances enregistrée seront sautés automatiquement</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5">
          <Ico path="M15 19l-7-7 7-7" />
          Retour
        </button>
        <div className="flex-1" />
        <button
          onClick={handleNext}
          disabled={!canNext}
          className="px-5 py-2 bg-[#005989] text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#004a73] transition-colors flex items-center gap-2"
        >
          Générer l'aperçu
          <Ico path="M13 10V3L4 14h7v7l9-11h-7z" />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Aperçu + confirmation ─────────────────────────────────────────────
function Step3({ preview, setPreview, affectation, allGroupeIds, modules, groupes, intervenants, onConfirm, onBack, saving }) {
  const mod  = modules.find(m => m.id === affectation.moduleId);
  const intv = intervenants.find(i => i.id === affectation.intervenantId);

  const totalH = preview.reduce((acc, s) => {
    // count per unique date+slot (not per group)
    return acc;
  }, null);

  // Unique sessions (1 slot = N groups = N docs, but count hours once)
  const uniqueSlots = useMemo(() => {
    const seen = new Set();
    return preview.filter(s => {
      const k = `${s.date}|${s.heureDebut}|${s.groupeId}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [preview]);

  const totalHours = uniqueSlots.reduce((acc, s) => acc + slotH({ start: s.heureDebut, end: s.heureFin }), 0);

  const byDate = useMemo(() => {
    const map = {};
    for (const s of preview) {
      const k = `${s.date}|${s.heureDebut}`;
      if (!map[k]) map[k] = { date: s.date, heureDebut: s.heureDebut, heureFin: s.heureFin, groups: [] };
      const grp = groupes.find(g => g.id === s.groupeId);
      map[k].groups.push(grp?.nom || s.groupeId);
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date) || a.heureDebut.localeCompare(b.heureDebut));
  }, [preview, groupes]);

  const removeSlot = (dateStr, heureDebut) => {
    setPreview(prev => prev.filter(s => !(s.date === dateStr && s.heureDebut === heureDebut)));
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-base font-bold text-slate-800">Aperçu du planning généré</h2>
        <div className="flex flex-wrap gap-2 mt-1.5">
          <span className="text-xs bg-blue-50 text-[#005989] px-2.5 py-1 rounded-full font-medium border border-blue-100">
            {mod?.nom || affectation.moduleId}
          </span>
          <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-semibold border border-green-100">
            {byDate.length} séance{byDate.length > 1 ? 's' : ''} · {Math.round(totalHours * 10) / 10}h planifiées
          </span>
          {preview.length === 0 && (
            <span className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full font-semibold border border-red-100">
              Aucune séance générée — vérifiez les disponibilités
            </span>
          )}
        </div>
      </div>

      {byDate.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-3">
          <div className="text-4xl">🤔</div>
          <p className="text-slate-600 font-medium">Aucun créneau disponible trouvé</p>
          <p className="text-sm text-slate-400 max-w-xs">
            Vérifiez les disponibilités sélectionnées ou élargissez la plage de jours. Des conflits existants peuvent bloquer tous les créneaux.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {byDate.map(({ date, heureDebut, heureFin, groups }) => {
            const d = new Date(date + 'T00:00:00');
            const dateLabel = format(d, 'EEE dd MMM', { locale: fr });
            const h = slotH({ start: heureDebut, end: heureFin });
            return (
              <div key={`${date}|${heureDebut}`}
                   className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 group">
                <div className="w-28 shrink-0">
                  <div className="text-sm font-semibold text-slate-800 capitalize">{dateLabel}</div>
                  <div className="text-xs text-slate-400">{heureDebut} – {heureFin} · {h}h</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {groups.map(g => (
                    <span key={g} className="text-xs bg-blue-50 text-[#005989] px-2 py-0.5 rounded-full font-medium">{g}</span>
                  ))}
                </div>
                <button
                  onClick={() => removeSlot(date, heureDebut)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                  title="Supprimer ce créneau"
                >
                  <Ico path="M6 18L18 6M6 6l12 12" size="w-3.5 h-3.5" sw={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {byDate.length > 0 && (
        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-[#005989]">
          <div className="font-semibold">
            {preview.length} document{preview.length > 1 ? 's' : ''} Firestore seront créés
          </div>
          <div className="text-xs text-blue-500 mt-0.5">
            {byDate.length} créneau{byDate.length > 1 ? 'x' : ''} × {allGroupeIds.length} groupe{allGroupeIds.length > 1 ? 's' : ''} · {Math.round(totalHours * 10) / 10}h · Masse restante : {Math.round((affectation.remaining - totalHours) * 10) / 10}h après planification
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex gap-2 pt-2 border-t border-slate-100">
        <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5">
          <Ico path="M15 19l-7-7 7-7" />
          Retour
        </button>
        <div className="flex-1" />
        <button
          onClick={onConfirm}
          disabled={preview.length === 0 || saving}
          className="px-6 py-2 bg-[#001829] text-white text-sm font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#00304d] transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Création…
            </>
          ) : (
            <>
              <Ico path="M5 13l4 4L19 7" sw={2.5} />
              Créer {preview.length} séance{preview.length > 1 ? 's' : ''}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function PlanningAutoModal({ modules, groupes, intervenants, onClose, onCreated }) {
  const toast = useToast();
  const [step,        setStep]        = useState(1);
  const [affectation, setAffectation] = useState(null);
  const [allGroupeIds, setAllGroupeIds] = useState([]);
  const [allSessions, setAllSessions]  = useState([]);
  const [preview,     setPreview]     = useState([]);
  const [saving,      setSaving]      = useState(false);

  // Step 2 → Step 3: run algorithm
  const handleStep2Next = useCallback(async ({ availKeys, startDate, salle, type, skipVac }) => {
    // Load existing sessions for conflict detection
    let existingSessions = allSessions;
    if (existingSessions.length === 0) {
      try {
        const snap = await getDocs(collection(db, 'sessions'));
        existingSessions = snap.docs.map(d => {
          const data = d.data();
          const date = data.date?.toDate ? format(data.date.toDate(), 'yyyy-MM-dd') : (data.date || '');
          return { id: d.id, ...data, date };
        });
      } catch { /* ignore */ }
    }

    // Also load vacances if skipVac
    let vacanceKeys = new Set();
    if (skipVac) {
      try {
        const snap = await getDocs(collection(db, 'vacances'));
        snap.forEach(d => {
          const { debut, fin } = d.data();
          let cur = new Date(debut + 'T00:00:00');
          const end = new Date(fin + 'T00:00:00');
          while (cur <= end) {
            vacanceKeys.add(format(cur, 'yyyy-MM-dd'));
            cur = addDays(cur, 1);
          }
        });
      } catch { /* ignore */ }
    }

    // Build availKeys that also excludes vacances
    const filteredAvailKeys = skipVac
      ? new Set([...availKeys]) // we'll check vacances per date in algo
      : availKeys;

    const generated = generateSessions({
      moduleId:     affectation.moduleId,
      intervenantId: affectation.intervenantId,
      groupeIds:    allGroupeIds,
      masseHoraire: affectation.masseHoraire,
      heuresFaites: affectation.heuresFaites,
      availableKeys: filteredAvailKeys,
      startDate,
      salle,
      type,
      existingSessions: skipVac
        ? existingSessions  // vacances handled below
        : existingSessions,
    }).filter(s => !skipVac || !vacanceKeys.has(s.date));

    setPreview(generated);
    setStep(3);
  }, [affectation, allGroupeIds, allSessions]);

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Batch write in chunks of 500 (Firestore limit)
      const CHUNK = 500;
      for (let i = 0; i < preview.length; i += CHUNK) {
        const batch = writeBatch(db);
        const chunk = preview.slice(i, i + CHUNK);
        for (const s of chunk) {
          const ref = doc(collection(db, 'sessions'));
          batch.set(ref, {
            groupeId:     s.groupeId,
            moduleId:     s.moduleId,
            intervenantId: s.intervenantId || '',
            date:         Timestamp.fromDate(new Date(s.date + 'T00:00:00')),
            heureDebut:   s.heureDebut,
            heureFin:     s.heureFin,
            type:         s.type || 'cours',
            salle:        s.salle || '',
            note:         '',
            statut:       'planifiee',
            emargementOuvert: false,
            anneeAcademique: ANNEE,
            createdAt:    new Date(),
          });
        }
        await batch.commit();
      }
      toast.success(`${preview.length} séance${preview.length > 1 ? 's' : ''} créée${preview.length > 1 ? 's' : ''} avec succès !`);
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error('Erreur lors de la création : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const STEP_LABELS = ['Affectation', 'Disponibilités', 'Aperçu'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#001829] flex items-center justify-center">
              <Ico path="M13 10V3L4 14h7v7l9-11h-7z" size="w-4 h-4" stroke="#f5c845" sw={2} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">Planification automatique</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {STEP_LABELS.map((label, i) => (
                  <span key={i} className={`text-xs font-medium ${i + 1 === step ? 'text-[#005989]' : i + 1 < step ? 'text-slate-400' : 'text-slate-300'}`}>
                    {i > 0 && <span className="mx-1 text-slate-200">›</span>}
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <Ico path="M6 18L18 6M6 6l12 12" sw={2} />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="flex gap-0 shrink-0">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-0.5" style={{ background: s <= step ? '#005989' : '#e2e8f0' }} />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden px-6 py-5 flex flex-col">
          {step === 1 && (
            <Step1
              modules={modules} groupes={groupes} intervenants={intervenants}
              onNext={({ affectation: aff, allGroupeIds: gIds, allSessions: sess }) => {
                setAffectation(aff);
                setAllGroupeIds(gIds);
                setAllSessions(sess);
                setStep(2);
              }}
              onClose={onClose}
            />
          )}
          {step === 2 && affectation && (
            <Step2
              affectation={affectation} allGroupeIds={allGroupeIds} allSessions={allSessions}
              modules={modules} groupes={groupes} intervenants={intervenants}
              onNext={handleStep2Next}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && affectation && (
            <Step3
              preview={preview} setPreview={setPreview}
              affectation={affectation} allGroupeIds={allGroupeIds}
              modules={modules} groupes={groupes} intervenants={intervenants}
              onConfirm={handleConfirm}
              onBack={() => setStep(2)}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
