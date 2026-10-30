import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { affectationsService } from '../../services/firestore';
import { useGroupes, useIntervenants } from '../../hooks/useData';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const ANNEE = '2026-2027';
const ALERT_HEURES = 4;

function Badge({ children, color = 'slate' }) {
  const colors = {
    green:  'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {children}
    </span>
  );
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.min(100, Math.round(100 * done / total)) : 0;
  const color = pct >= 100 ? 'bg-slate-400' : pct >= 80 ? 'bg-orange-400' : 'bg-[#005989]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 whitespace-nowrap">{pct}%</span>
    </div>
  );
}

// ── Modal Édition (affectation simple) ────────────────────────────────────────
function EditModal({ affectation, intervenants, onSave, onClose }) {
  const [intervenantId, setIntervenantId] = useState(affectation.intervenantId || '');
  const [masseHoraire, setMasseHoraire]   = useState(affectation.masseHoraire || 44);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!intervenantId || !masseHoraire) return;
    setSaving(true);
    try { await onSave({ ...affectation, intervenantId, masseHoraire: parseFloat(masseHoraire) }); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-800">Modifier l'affectation</h3>
        <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 space-y-0.5">
          <p><span className="font-semibold">Module :</span> {affectation.moduleName}</p>
          <p><span className="font-semibold">Groupe :</span> {affectation.groupeNom}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Intervenant</label>
            <select value={intervenantId} onChange={e => setIntervenantId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
              <option value="">— Choisir —</option>
              {[...intervenants].sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(i => (
                <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Masse horaire (h)</label>
            <input type="number" min="0" step="0.5" value={masseHoraire}
              onChange={e => setMasseHoraire(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]"
              placeholder="ex: 24" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={!intervenantId || !masseHoraire || saving}
            className="flex-1 py-2 bg-[#005989] text-white rounded-xl text-sm font-semibold hover:bg-[#004a73] disabled:opacity-40">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Affectation en masse ────────────────────────────────────────────────
function BulkAffectationModal({ modules, groupes, intervenants, onSave, onClose }) {
  const [intervenantId, setIntervenantId] = useState('');
  const [selectedGroupes, setSelectedGroupes] = useState([]);
  // module name (key) → masseHoraire value; deduped by name to avoid filière duplicates
  const [selectedModules, setSelectedModules] = useState({});
  const [globalMH, setGlobalMH] = useState('44');
  const [useGlobalMH, setUseGlobalMH] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');

  // Group all module docs by name — same name can exist per filière
  const modulesByName = useMemo(() => {
    const map = {};
    for (const m of modules) {
      const key = (m.nom || '').trim();
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  }, [modules]);

  // Deduplicated list: one entry per unique name, sorted
  const deduplicatedModules = useMemo(() =>
    Object.keys(modulesByName).sort((a, b) => a.localeCompare(b, 'fr')),
  [modulesByName]);

  const sortedGroupes = useMemo(() =>
    [...groupes].sort((a,b) => (a.nom||'').localeCompare(b.nom||'')),
  [groupes]);
  const sortedInterv = useMemo(() =>
    [...intervenants].sort((a,b) => (a.nom||'').localeCompare(b.nom||'')),
  [intervenants]);

  const filteredModuleNames = useMemo(() => {
    const q = moduleSearch.trim().toLowerCase();
    if (!q) return deduplicatedModules;
    return deduplicatedModules.filter(nom => nom.toLowerCase().includes(q));
  }, [deduplicatedModules, moduleSearch]);

  const toggleGroupe = (id) =>
    setSelectedGroupes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleModule = (nom) =>
    setSelectedModules(prev => {
      const next = { ...prev };
      if (next[nom] !== undefined) { delete next[nom]; } else { next[nom] = globalMH || '44'; }
      return next;
    });

  const selectedNames = Object.keys(selectedModules);
  const totalCombinations = selectedNames.length * selectedGroupes.length;

  const canSave = intervenantId && selectedNames.length > 0 && selectedGroupes.length > 0 &&
    selectedNames.every(nom => parseFloat(useGlobalMH ? globalMH : selectedModules[nom]) > 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      const ops = [];
      for (const nom of selectedNames) {
        const mh = parseFloat(useGlobalMH ? globalMH : selectedModules[nom]);
        const docsForName = modulesByName[nom] || [];
        for (const groupeId of selectedGroupes) {
          // Pick module doc matching the group's filière, fall back to first doc
          const grp = groupes.find(g => g.id === groupeId);
          const bestDoc = (grp?.filiere && docsForName.find(m => m.filiere === grp.filiere))
            || docsForName[0];
          if (bestDoc) {
            ops.push(affectationsService.upsert(intervenantId, bestDoc.id, groupeId, mh, ANNEE));
          }
        }
      }
      await Promise.all(ops);
      onSave(totalCombinations);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-800">Affecter en masse</h3>
            <p className="text-xs text-slate-500 mt-0.5">Un intervenant → plusieurs modules × plusieurs groupes</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Intervenant */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Intervenant <span className="text-red-500">*</span>
            </label>
            <select value={intervenantId} onChange={e => setIntervenantId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989] bg-white">
              <option value="">— Sélectionner un intervenant —</option>
              {sortedInterv.map(i => (
                <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
              ))}
            </select>
          </div>

          {/* Masse horaire globale */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={useGlobalMH} onChange={() => setUseGlobalMH(true)} />
                <span className="font-semibold text-slate-700">Masse horaire unique pour tous les modules</span>
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" checked={!useGlobalMH} onChange={() => setUseGlobalMH(false)} />
                <span className="font-semibold text-slate-700">MH par module</span>
              </label>
            </div>
            {useGlobalMH && (
              <input type="number" min="0" step="0.5" value={globalMH}
                onChange={e => { setGlobalMH(e.target.value); setSelectedModules(prev => Object.fromEntries(Object.keys(prev).map(k => [k, e.target.value]))); }}
                placeholder="Nombre d'heures (ex: 44)"
                className="w-48 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]" />
            )}
          </div>

          {/* Modules */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Modules <span className="text-red-500">*</span>
              {selectedNames.length > 0 && <span className="ml-2 normal-case font-normal text-[#005989]">{selectedNames.length} sélectionné{selectedNames.length > 1 ? 's' : ''}</span>}
            </label>
            <input type="text" value={moduleSearch} onChange={e => setModuleSearch(e.target.value)}
              placeholder="Rechercher un module…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[#005989]" />
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
              {filteredModuleNames.map((nom, i) => {
                const checked = selectedModules[nom] !== undefined;
                return (
                  <label key={nom}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm ${i > 0 ? 'border-t border-slate-100' : ''} ${checked ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => toggleModule(nom)}
                      className="accent-[#005989]" />
                    <span className={`flex-1 ${checked ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                      {nom}
                    </span>
                    {!useGlobalMH && checked && (
                      <input type="number" min="0" step="0.5"
                        value={selectedModules[nom] || ''}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setSelectedModules(prev => ({ ...prev, [nom]: e.target.value }))}
                        placeholder="h"
                        className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#005989]" />
                    )}
                    {useGlobalMH && checked && globalMH && (
                      <span className="text-xs text-[#005989] font-semibold">{globalMH}h</span>
                    )}
                  </label>
                );
              })}
              {filteredModuleNames.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-400">Aucun module trouvé</p>
              )}
            </div>
          </div>

          {/* Groupes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Groupes <span className="text-red-500">*</span>
              {selectedGroupes.length > 0 && <span className="ml-2 normal-case font-normal text-[#005989]">{selectedGroupes.length} sélectionné{selectedGroupes.length > 1 ? 's' : ''}</span>}
            </label>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              {sortedGroupes.map((g, i) => {
                const checked = selectedGroupes.includes(g.id);
                return (
                  <label key={g.id}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm ${i > 0 ? 'border-t border-slate-100' : ''} ${checked ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={checked}
                      onChange={() => toggleGroupe(g.id)}
                      className="accent-[#005989]" />
                    <span className={checked ? 'font-semibold text-slate-800' : 'text-slate-600'}>{g.nom}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {totalCombinations > 0 && (
            <div className="bg-[#005989]/5 border border-[#005989]/20 rounded-xl px-4 py-3 text-sm">
              <span className="font-bold text-[#005989]">{totalCombinations}</span> affectation{totalCombinations > 1 ? 's' : ''} seront créées ou mises à jour
              <span className="text-slate-500 ml-1">({selectedNames.length} module{selectedNames.length > 1 ? 's' : ''} × {selectedGroupes.length} groupe{selectedGroupes.length > 1 ? 's' : ''})</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-end shrink-0">
          <button onClick={onClose}
            className="px-5 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="px-6 py-2 bg-[#005989] text-white rounded-xl text-sm font-bold hover:bg-[#004a73] disabled:opacity-40 transition-colors">
            {saving ? 'Enregistrement…' : `Enregistrer ${totalCombinations > 0 ? `(${totalCombinations})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Alert Banner ──────────────────────────────────────────────────────────────
function AlertBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-sm font-bold text-red-700 mb-2">
        ⚠ {alerts.length} alerte{alerts.length > 1 ? 's' : ''} masse horaire
      </p>
      <ul className="space-y-1">
        {alerts.slice(0, 8).map((a, i) => <li key={i} className="text-xs text-red-600">• {a}</li>)}
        {alerts.length > 8 && <li className="text-xs text-red-400">… et {alerts.length - 8} autres</li>}
      </ul>
    </div>
  );
}

// ── Vue par intervenant ───────────────────────────────────────────────────────
function IntervenantCard({ intv, rows, sessions }) {
  const [open, setOpen] = useState(false);
  const totalMH = rows.reduce((s, r) => s + (r.masseHoraire || 0), 0);

  // Deduplicate sessions taught to multiple groups simultaneously:
  // same intervenant + module + date + heureDebut + heureFin = 1 physical session → count once
  const totalFait = useMemo(() => {
    const seen = new Set();
    let total = 0;
    for (const row of rows) {
      for (const s of sessions) {
        if (s.intervenantId !== intv.id || s.moduleId !== row.moduleId) continue;
        const key = `${s.moduleId}|${s.date || ''}|${s.heureDebut}|${s.heureFin}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const [sh, sm] = (s.heureDebut || '0:0').split(':').map(Number);
        const [eh, em] = (s.heureFin  || '0:0').split(':').map(Number);
        total += (eh * 60 + em - sh * 60 - sm) / 60;
      }
    }
    return Math.round(total * 10) / 10;
  }, [rows, sessions, intv.id]);
  const totalRest = Math.max(0, totalMH - totalFait);
  const pct = totalMH > 0 ? Math.min(100, Math.round(100 * totalFait / totalMH)) : 0;
  const alertCount = rows.filter(r => r.alertFin || r.alertEfm).length;

  // Group rows by module for compact display
  const byModule = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const key = r.moduleId;
      if (!map[key]) map[key] = { nom: r.moduleName, code: r.moduleCode, groupes: [] };
      map[key].groupes.push(r);
    }
    return Object.values(map).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  }, [rows]);

  const barColor = pct >= 100 ? 'bg-slate-400' : pct >= 80 ? 'bg-orange-400' : 'bg-[#005989]';

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${alertCount > 0 ? 'border-red-200' : 'border-slate-200'}`}>
      {/* Header cliquable */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        {/* Avatar initiales */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-[#005989]/10 flex items-center justify-center">
          <span className="text-[#005989] font-bold text-sm">
            {(intv.prenom?.[0] || '?')}{(intv.nom?.[0] || '')}
          </span>
        </div>

        {/* Nom + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">{intv.prenom} {intv.nom}</span>
            {alertCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                ⚠ {alertCount} alerte{alertCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="flex-1 max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{pct}%</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="hidden sm:flex items-center gap-5 text-right shrink-0">
          <div>
            <p className="text-xs text-slate-400">Modules</p>
            <p className="text-sm font-bold text-slate-700">{byModule.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Groupes</p>
            <p className="text-sm font-bold text-slate-700">{rows.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">MH prévues</p>
            <p className="text-sm font-bold text-slate-700 tabular-nums">{totalMH}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Faites</p>
            <p className="text-sm font-bold text-green-700 tabular-nums">{Math.round(totalFait * 10) / 10}h</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Restantes</p>
            <p className={`text-sm font-bold tabular-nums ${totalRest > 0 && totalRest <= 4 ? 'text-red-700' : 'text-slate-600'}`}>
              {Math.round(totalRest * 10) / 10}h
            </p>
          </div>
        </div>

        {/* Chevron */}
        <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Détail expandable */}
      {open && (
        <div className="border-t border-slate-100">
          {/* Stats mobile */}
          <div className="sm:hidden flex gap-4 px-5 py-3 bg-slate-50 text-xs text-slate-500">
            <span><b className="text-slate-700">{totalMH}h</b> prévues</span>
            <span><b className="text-green-700">{Math.round(totalFait * 10) / 10}h</b> faites</span>
            <span><b className="text-slate-600">{Math.round(totalRest * 10) / 10}h</b> restantes</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs whitespace-nowrap">Module</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs whitespace-nowrap">Groupe</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500 text-xs whitespace-nowrap">MH prévues</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500 text-xs whitespace-nowrap">Faites</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-slate-500 text-xs whitespace-nowrap">Restantes</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-xs min-w-[100px]">Progression</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-500 text-xs whitespace-nowrap">EFM</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-slate-500 text-xs whitespace-nowrap">CC</th>
                </tr>
              </thead>
              <tbody>
                {byModule.map(mod => (
                  mod.groupes.map((r, gi) => (
                    <tr key={r.id} className={`border-b border-slate-100 ${r.alertFin ? 'bg-red-50/30' : 'hover:bg-slate-50'}`}>
                      {gi === 0 && (
                        <td className="px-4 py-2.5 font-semibold text-slate-700" rowSpan={mod.groupes.length}>
                          <span className="block truncate max-w-[180px]" title={mod.nom}>{mod.nom}</span>
                          {mod.code && <span className="text-xs text-slate-400 font-normal">{mod.code}</span>}
                        </td>
                      )}
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{r.groupeNom}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700 tabular-nums">{r.masseHoraire}h</td>
                      <td className="px-4 py-2.5 text-right text-green-700 font-semibold tabular-nums">{r.heuresFaites}h</td>
                      <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${r.alertFin ? 'text-red-700' : 'text-slate-600'}`}>
                        {r.alertFin && '⚠ '}{r.heuresRestantes}h
                      </td>
                      <td className="px-4 py-2.5"><ProgressBar done={r.heuresFaites} total={r.masseHoraire} /></td>
                      <td className="px-4 py-2.5 text-center">
                        {r.efmProgramme ? <Badge color="green">✓</Badge> : <Badge color="red">✗</Badge>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {r.ccProgramme ? <Badge color="green">✓</Badge> : <Badge color="orange">✗</Badge>}
                      </td>
                    </tr>
                  ))
                ))}
              </tbody>
              {/* Total ligne */}
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td colSpan={2} className="px-4 py-2.5 font-bold text-slate-600 text-xs">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums text-xs">{totalMH}h</td>
                  <td className="px-4 py-2.5 text-right font-bold text-green-700 tabular-nums text-xs">{Math.round(totalFait * 10) / 10}h</td>
                  <td className={`px-4 py-2.5 text-right font-bold tabular-nums text-xs ${totalRest > 0 && totalRest <= 4 ? 'text-red-700' : 'text-slate-600'}`}>
                    {Math.round(totalRest * 10) / 10}h
                  </td>
                  <td colSpan={3} className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">{pct}%</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MasseHorairePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: groupes, unique: uniqueGroupes } = useGroupes();
  const { data: intervenants } = useIntervenants();

  const [affectations, setAffectations] = useState([]);
  const [modules, setModules]   = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showBulk, setShowBulk] = useState(false);
  const [editAff, setEditAff]   = useState(null);
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterInterv, setFilterInterv] = useState('');
  const [filterAlert, setFilterAlert]   = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'intervenants'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const mSnap = await getDocs(query(collection(db, 'modules'), orderBy('nom', 'asc')));
      const mods = []; mSnap.forEach(d => mods.push({ id: d.id, ...d.data() }));
      setModules(mods);

      const aff = await affectationsService.getAll(ANNEE);
      setAffectations(aff);

      // Load all sessions without year filter: existing sessions were saved without
      // anneeAcademique; the affectation match (moduleId+groupeId+intervenantId) bounds the scope.
      const sSnap = await getDocs(collection(db, 'sessions'));
      const sess = []; sSnap.forEach(d => sess.push({ id: d.id, ...d.data() }));
      setSessions(sess);
    } catch (e) {
      toast.error('Erreur chargement: ' + e.message);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enriched = useMemo(() => {
    const mapped = affectations.map(aff => {
      const mod  = modules.find(m => m.id === aff.moduleId);
      const grp  = groupes.find(g => g.id === aff.groupeId);
      const intv = intervenants.find(i => i.id === aff.intervenantId);

      // Robust session matching: by moduleId (Firestore ID) OR by module display string
      // (sessions saved without moduleId only have `module = "CODE — Nom"`).
      const modMatchFn = (s) => {
        if (s.moduleId && aff.moduleId) return s.moduleId === aff.moduleId;
        // Fallback for legacy sessions without moduleId
        if (mod && s.module) return s.module.startsWith(mod.code + ' ') || s.module === mod.code;
        return false;
      };
      const sessionsPourModule = sessions.filter(s =>
        modMatchFn(s) && s.groupeId === aff.groupeId
      );
      // Compute heuresFaites from matched sessions
      let totalH = 0;
      for (const s of sessionsPourModule) {
        if (!aff.intervenantId || s.intervenantId === aff.intervenantId) {
          const [sh, sm] = (s.heureDebut || '0:0').split(':').map(Number);
          const [eh, em] = (s.heureFin  || '0:0').split(':').map(Number);
          totalH += (eh * 60 + em - sh * 60 - sm) / 60;
        }
      }
      const heuresFaites = Math.round(totalH * 10) / 10;
      const heuresRestantes = Math.max(0, (aff.masseHoraire || 0) - heuresFaites);
      const efmProgramme = sessionsPourModule.some(s => ['efm', 'eff', 'exam'].includes(s.type));
      const ccProgramme  = sessionsPourModule.some(s => s.type === 'cc');
      const moduleCode   = mod?.code || '';
      return {
        ...aff,
        moduleName:     mod?.nom  || aff.moduleId,
        moduleCode,
        groupeNom:      grp?.nom  || aff.groupeId,
        intervenantNom: intv ? `${intv.prenom} ${intv.nom}` : aff.intervenantId,
        heuresFaites,
        heuresRestantes,
        efmProgramme,
        ccProgramme,
        alertFin: heuresRestantes > 0 && heuresRestantes <= ALERT_HEURES,
        alertEfm: !efmProgramme,
        alertCc:  !ccProgramme,
        pctFait: aff.masseHoraire > 0 ? Math.min(100, Math.round(100 * heuresFaites / aff.masseHoraire)) : 0,
      };
    });
    // Mark duplicates: same intervenantId + groupeId + moduleCode (keep first, flag the rest)
    const seen = new Set();
    for (const e of mapped) {
      const key = `${e.intervenantId}|${e.groupeId}|${e.moduleCode}`;
      if (seen.has(key)) {
        e.isDuplicate = true;
      } else {
        seen.add(key);
        e.isDuplicate = false;
      }
    }
    return mapped;
  }, [affectations, modules, groupes, intervenants, sessions]);

  const alerts = useMemo(() => {
    const list = [];
    for (const e of enriched) {
      if (e.alertFin) list.push(`${e.moduleName} (${e.groupeNom}) — ${e.heuresRestantes}h restantes pour ${e.intervenantNom}`);
      if (e.alertEfm) list.push(`${e.moduleName} (${e.groupeNom}) — aucun EFM/EFF programmé`);
    }
    return list;
  }, [enriched]);

  const rows = useMemo(() => enriched.filter(e => {
    if (filterGroupe && e.groupeId !== filterGroupe) return false;
    if (filterInterv && e.intervenantId !== filterInterv) return false;
    if (filterAlert && !e.alertFin && !e.alertEfm) return false;
    return true;
  }), [enriched, filterGroupe, filterInterv, filterAlert]);

  const handleBulkSave = async (count) => {
    toast.success(`${count} affectation${count > 1 ? 's' : ''} enregistrée${count > 1 ? 's' : ''}`);
    setShowBulk(false);
    load();
  };

  const handleEditSave = async (aff) => {
    try {
      await affectationsService.upsert(aff.intervenantId, aff.moduleId, aff.groupeId, aff.masseHoraire, ANNEE);
      toast.success('Affectation modifiée');
      setEditAff(null);
      load();
    } catch (e) { toast.error('Erreur: ' + e.message); }
  };

  const handleDelete = async (aff) => {
    const ok = await confirm({ title: 'Supprimer cette affectation ?', danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await affectationsService.delete(aff.id);
      toast.success('Affectation supprimée');
      load();
    } catch (e) { toast.error('Erreur: ' + e.message); }
  };

  // Synthèse par groupe (cliquable pour filtrer) — exclut les doublons des stats
  const byGroupe = useMemo(() => {
    const map = {};
    for (const e of enriched) {
      if (e.isDuplicate) continue;
      if (!map[e.groupeId]) map[e.groupeId] = { groupeId: e.groupeId, groupeNom: e.groupeNom || e.groupeId, mh: 0, fait: 0, alertes: 0 };
      map[e.groupeId].mh    += e.masseHoraire || 0;
      map[e.groupeId].fait  += e.heuresFaites;
      if (e.alertFin || e.alertEfm) map[e.groupeId].alertes++;
    }
    return Object.values(map)
      .map(g => ({ ...g, mh: Math.round(g.mh * 10) / 10, fait: Math.round(g.fait * 10) / 10, pct: g.mh > 0 ? Math.min(100, Math.round(100 * g.fait / g.mh)) : 0 }))
      .sort((a, b) => a.groupeNom.localeCompare(b.groupeNom, 'fr'));
  }, [enriched]);

  // Vue par intervenant : groupe enriched par intervenantId (respecte filterGroupe)
  const groupedByIntervenant = useMemo(() => {
    const map = {};
    for (const e of enriched) {
      if (filterGroupe && e.groupeId !== filterGroupe) continue;
      if (!map[e.intervenantId]) map[e.intervenantId] = [];
      map[e.intervenantId].push(e);
    }
    return Object.entries(map)
      .map(([id, rows]) => ({
        id,
        intv: intervenants.find(i => i.id === id) || { id, nom: id, prenom: '' },
        rows,
      }))
      .sort((a, b) => (a.intv.nom || '').localeCompare(b.intv.nom || '', 'fr'));
  }, [enriched, intervenants, filterGroupe]);

  const nonDup     = enriched.filter(e => !e.isDuplicate);
  const totalMH    = nonDup.reduce((s, e) => s + (e.masseHoraire || 0), 0);
  const totalFait  = nonDup.reduce((s, e) => s + e.heuresFaites, 0);
  const alertCount = nonDup.filter(e => e.alertFin || e.alertEfm).length;

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Masse Horaire</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Volumes horaires par module, groupe et intervenant — {ANNEE}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle vue */}
          <div className="flex bg-slate-100 rounded-xl p-1 text-sm">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Tableau
            </button>
            <button
              onClick={() => setViewMode('intervenants')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'intervenants' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Par intervenant
            </button>
          </div>
          <button onClick={() => setShowBulk(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl text-sm font-semibold hover:bg-[#004a73] shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Affecter en masse
          </button>
        </div>
      </div>

      {/* Synthèse par groupe */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Synthèse par groupe</h2>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span><span className="font-semibold text-slate-600">{Math.round(totalMH)}h</span> prévues</span>
            <span><span className="font-semibold text-green-700">{Math.round(totalFait * 10) / 10}h</span> effectuées</span>
            {alertCount > 0 && <span className="text-red-600 font-semibold">{alertCount} alerte{alertCount > 1 ? 's' : ''}</span>}
            {filterGroupe && (
              <button onClick={() => setFilterGroupe('')}
                className="text-[#005989] hover:underline font-semibold">
                ✕ Tout afficher
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
          {byGroupe.map(g => (
            <button key={g.groupeId}
              onClick={() => setFilterGroupe(prev => prev === g.groupeId ? '' : g.groupeId)}
              className={`text-left p-3 rounded-xl border transition-all hover:shadow-sm ${
                filterGroupe === g.groupeId
                  ? 'border-[#005989] bg-[#005989]/5 ring-1 ring-[#005989]/20'
                  : 'border-slate-200 hover:border-[#005989]/40 bg-slate-50/50'
              }`}>
              <p className="text-xs font-bold text-slate-700 truncate leading-tight">{g.groupeNom}</p>
              <div className="mt-2 flex items-end justify-between gap-1">
                <span className={`text-xl font-black ${g.pct >= 100 ? 'text-slate-500' : g.pct >= 80 ? 'text-orange-600' : 'text-[#005989]'}`}>
                  {g.pct}%
                </span>
                {g.alertes > 0 && (
                  <span className="text-[10px] text-red-600 font-bold leading-none mb-0.5">{g.alertes}⚠</span>
                )}
              </div>
              <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${g.pct >= 100 ? 'bg-slate-400' : g.pct >= 80 ? 'bg-orange-400' : 'bg-[#005989]'}`}
                  style={{ width: `${g.pct}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 tabular-nums">{g.fait}h / {g.mh}h</p>
            </button>
          ))}
        </div>
      </div>

      <AlertBanner alerts={alerts} />

      {/* Filtres (masqués en vue intervenants) */}
      {viewMode === 'table' && (
        <div className="flex flex-wrap gap-2">
          <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
            <option value="">Tous les groupes</option>
            {[...uniqueGroupes].sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(g => (
              <option key={g.id} value={g.id}>{g.nom}</option>
            ))}
          </select>
          <select value={filterInterv} onChange={e => setFilterInterv(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
            <option value="">Tous les intervenants</option>
            {[...intervenants].sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(i => (
              <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
            <input type="checkbox" checked={filterAlert} onChange={e => setFilterAlert(e.target.checked)} />
            Alertes seulement
          </label>
          {(filterGroupe || filterInterv || filterAlert) && (
            <button onClick={() => { setFilterGroupe(''); setFilterInterv(''); setFilterAlert(false); }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl">
              ✕ Réinitialiser
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-8 h-8 border-[3px] border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : viewMode === 'intervenants' ? (
        /* ── Vue par intervenant ────────────────────────────── */
        groupedByIntervenant.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-2xl mb-2">👤</p>
            <p className="text-slate-600 font-semibold">Aucun intervenant affecté</p>
            <p className="text-slate-400 text-sm mt-1">Cliquez sur "Affecter en masse" pour configurer les volumes horaires.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByIntervenant.map(({ id, intv, rows: intvRows }) => (
              <IntervenantCard key={id} intv={intv} rows={intvRows} sessions={sessions} />
            ))}
            <p className="text-xs text-slate-400 text-center pt-2">
              {groupedByIntervenant.length} intervenant{groupedByIntervenant.length > 1 ? 's' : ''} —
              {' '}{enriched.length} affectation{enriched.length > 1 ? 's' : ''} au total
              {' '}— Alerte fin de module : ≤ {ALERT_HEURES}h restantes
            </p>
          </div>
        )
      ) : (
        /* ── Vue tableau ────────────────────────────────────── */
        rows.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-slate-600 font-semibold">Aucune affectation</p>
            <p className="text-slate-400 text-sm mt-1">Cliquez sur "Affecter en masse" pour configurer les volumes horaires.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Module</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Groupe</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Intervenant</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">MH</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Faites</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Restantes</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap min-w-[120px]">Progression</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">EFM</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">CC</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Statut</th>
                    <th className="px-3 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(e => (
                    <tr key={e.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${e.isDuplicate ? 'bg-amber-50/60' : e.alertFin ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                        <span className="block truncate" title={e.moduleName}>{e.moduleName}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          {e.moduleCode && <span className="text-xs text-slate-400">{e.moduleCode}</span>}
                          {e.isDuplicate && <span className="text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded px-1 py-0.5">⚠ Doublon</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.groupeNom}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.intervenantNom}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap">{e.masseHoraire}h</td>
                      <td className="px-4 py-3 text-right text-green-700 font-semibold tabular-nums whitespace-nowrap">{e.heuresFaites}h</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap ${e.alertFin ? 'text-red-700' : 'text-slate-700'}`}>
                        {e.alertFin && '⚠ '}{e.heuresRestantes}h
                      </td>
                      <td className="px-4 py-3">
                        <ProgressBar done={e.heuresFaites} total={e.masseHoraire} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.efmProgramme ? <Badge color="green">✓</Badge> : <Badge color="red">✗</Badge>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.ccProgramme ? <Badge color="green">✓</Badge> : <Badge color="orange">✗</Badge>}
                      </td>
                      <td className="px-4 py-3">
                        {e.pctFait >= 100
                          ? <Badge color="slate">Terminé</Badge>
                          : e.alertFin
                            ? <Badge color="red">Fin proche</Badge>
                            : e.pctFait >= 75
                              ? <Badge color="orange">En cours</Badge>
                              : <Badge color="blue">En cours</Badge>}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditAff(e)} title="Modifier"
                            className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => handleDelete(e)} title={e.isDuplicate ? 'Supprimer ce doublon' : 'Supprimer'}
                            className={`p-1.5 rounded-lg transition-colors ${e.isDuplicate ? 'text-red-600 bg-red-100 hover:bg-red-200' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
              {rows.length} affectation{rows.length > 1 ? 's' : ''}
              {' '}— Alerte fin de module : ≤ {ALERT_HEURES}h restantes
            </div>
          </div>
        )
      )}

      {showBulk && (
        <BulkAffectationModal
          modules={modules}
          groupes={uniqueGroupes}
          intervenants={intervenants}
          onSave={handleBulkSave}
          onClose={() => setShowBulk(false)}
        />
      )}

      {editAff && (
        <EditModal
          affectation={editAff}
          intervenants={intervenants}
          onSave={handleEditSave}
          onClose={() => setEditAff(null)}
        />
      )}
    </div>
  );
}
