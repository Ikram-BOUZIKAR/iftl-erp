import { useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';

// Mappe typeFormation → clé niveau canonique (même logique que GroupesPage)
function resolveNiveauCanonique(raw) {
  if (!raw) return '';
  const VALIDES = ['1A TS','2A TS','Licence CNAM','Licence ISTL','Mastère ESLI MLAI','QUALIF'];
  if (VALIDES.includes(raw)) return raw;
  if (raw === 'Technicien Spécialisé') return '1A TS'; // heuristique (pas d'anneePromotion ici)
  if (raw === 'Qualification')         return 'QUALIF';
  if (raw === 'Licence Transitaire')   return 'Licence ISTL';
  if (raw === 'Mastère ISLI')          return 'Mastère ESLI MLAI';
  if (raw === 'Licence CNAM')          return 'Licence CNAM';
  return raw;
}
const NIVEAUX_VALIDES = new Set(['1A TS','2A TS','Licence CNAM','Licence ISTL','Mastère ESLI MLAI','QUALIF']);

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 rounded-full animate-spin border-[3px] border-slate-200 border-t-violet-600" />
    </div>
  );
}

const FILIERES = ['1A TS', '2A TS', 'Licence', 'Licence CNAM', ''];

function normalize(s) {
  return String(s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function dupKey(s) {
  // Key by (nom, prenom) — same person if name matches regardless of group
  return `${normalize(s.nom)}|${normalize(s.prenom)}`;
}

export default function DeduplicationPage() {
  const [loading,    setLoading]    = useState(false);
  const [groups,     setGroups]     = useState(null); // { key: [student, ...] }
  const [toDelete,   setToDelete]   = useState(new Set());
  const [deleting,   setDeleting]   = useState(false);
  const [msg,        setMsg]        = useState('');
  const [repairing,  setRepairing]  = useState(false);
  const [repairMsg,  setRepairMsg]  = useState('');

  const loadAndDetect = async () => {
    setLoading(true); setMsg('');
    try {
      const snap = await getDocs(collection(db, 'students'));
      const all  = snap.docs.map(d => ({ _id: d.id, ...d.data() }));

      // Group by normalized name key
      const byName = {};
      for (const s of all) {
        const k = dupKey(s);
        if (!byName[k]) byName[k] = [];
        byName[k].push(s);
      }

      // Keep only groups with more than 1 entry
      const dups = {};
      for (const [k, arr] of Object.entries(byName)) {
        if (arr.length > 1) dups[k] = arr.sort((a, b) =>
          String(a.groupe || '').localeCompare(String(b.groupe || ''))
        );
      }

      setGroups(dups);
      const total = Object.values(dups).reduce((s, a) => s + a.length, 0);
      if (total === 0) setMsg('✓ Aucun doublon détecté dans la liste des apprenants.');
    } catch (err) {
      setMsg('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDelete = (id) => {
    setToDelete(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // Répare les niveaux incorrects ("Technicien Spécialisé" → "1A TS", etc.)
  const repairNiveaux = async () => {
    setRepairing(true); setRepairMsg('');
    try {
      const snap = await getDocs(collection(db, 'students'));
      const toFix = [];
      snap.forEach(d => {
        const s = d.data();
        const niv = s.niveau || '';
        if (!NIVEAUX_VALIDES.has(niv) && niv) {
          const fixed = resolveNiveauCanonique(niv);
          if (fixed !== niv) toFix.push({ id: d.id, newNiveau: fixed, oldNiveau: niv });
        }
      });
      if (toFix.length === 0) { setRepairMsg('✓ Tous les niveaux sont déjà corrects.'); setRepairing(false); return; }
      // also fix codeApprenant missing
      const toFixCode = [];
      snap.forEach(d => {
        const s = d.data();
        if (!s.codeApprenant && s.code) toFixCode.push({ id: d.id, code: s.code });
      });
      // Batch writes (500 max par batch)
      const allFixes = [
        ...toFix.map(f => ({ id: f.id, data: { niveau: f.newNiveau, updatedAt: new Date() } })),
        ...toFixCode.map(f => ({ id: f.id, data: { codeApprenant: f.code, updatedAt: new Date() } })),
      ];
      let done = 0;
      for (let i = 0; i < allFixes.length; i += 400) {
        const chunk = allFixes.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach(({ id, data }) => batch.update(doc(db, 'students', id), data));
        await batch.commit();
        done += chunk.length;
      }
      setRepairMsg(`✓ ${toFix.length} niveau(x) corrigé(s) · ${toFixCode.length} champ codeApprenant ajouté(s)`);
    } catch (err) {
      setRepairMsg('Erreur : ' + err.message);
    } finally { setRepairing(false); }
  };

  const confirmDelete = async () => {
    if (toDelete.size === 0) return;
    if (!window.confirm(`Supprimer définitivement ${toDelete.size} apprenant(s) sélectionné(s) ?`)) return;
    setDeleting(true);
    let ok = 0;
    for (const id of toDelete) {
      try { await deleteDoc(doc(db, 'students', id)); ok++; } catch { /* ignore */ }
    }
    setMsg(`✓ ${ok} apprenant(s) supprimé(s).`);
    setToDelete(new Set());
    await loadAndDetect();
    setDeleting(false);
  };

  const totalDups  = groups ? Object.values(groups).reduce((s, a) => s + a.length, 0) : 0;
  const groupCount = groups ? Object.keys(groups).length : 0;

  // Score de complétude — favorise : niveau canonique correct, codeApprenant, cin, etc.
  const completenessScore = (s) => {
    let score = ['cin', 'filiere', 'groupe', 'email', 'telephone']
      .filter(f => s[f] && String(s[f]).trim()).length;
    if (s.codeApprenant && String(s.codeApprenant).trim()) score += 3; // champ normalisé
    else if (s.code && String(s.code).trim())             score += 1;  // ancien champ
    if (NIVEAUX_VALIDES.has(s.niveau))  score += 3; // niveau canonique correct
    else if (s.niveau && String(s.niveau).trim()) score += 0; // niveau invalide, pas de bonus
    return score;
  };

  // Auto-sélection : garde le meilleur (score max) par groupe, sélectionne tous les autres
  const autoSelect = () => {
    const ids = new Set();
    for (const arr of Object.values(groups || {})) {
      const sorted = [...arr].sort((a, b) => completenessScore(b) - completenessScore(a));
      sorted.slice(1).forEach(s => ids.add(s._id)); // tous sauf le 1er (meilleur score)
    }
    setToDelete(ids);
  };

  // Sélectionner tous les IDs de tous les groupes
  const selectAll = () => {
    const ids = new Set();
    for (const arr of Object.values(groups || {})) arr.forEach(s => ids.add(s._id));
    setToDelete(ids);
  };

  const clearAll = () => setToDelete(new Set());

  // Sélectionner tous sauf le 1er d'un groupe spécifique
  const selectGroupExceptFirst = (arr) => {
    setToDelete(prev => {
      const n = new Set(prev);
      arr.slice(1).forEach(s => n.add(s._id));
      return n;
    });
  };

  // Sélectionner / désélectionner tout un groupe
  const toggleGroupAll = (arr) => {
    const allChecked = arr.every(s => toDelete.has(s._id));
    setToDelete(prev => {
      const n = new Set(prev);
      if (allChecked) arr.forEach(s => n.delete(s._id));
      else arr.forEach(s => n.add(s._id));
      return n;
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Dédoublonnage des apprenants</h1>
        <p className="text-sm text-slate-500 mt-1">
          Détecte les apprenants inscrits plusieurs fois (1A TS, 2A TS, Licence…) et permet de supprimer les doublons.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={loadAndDetect}
          disabled={loading}
          className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm shadow hover:bg-violet-700 transition disabled:opacity-50">
          {loading ? 'Analyse en cours…' : 'Analyser la liste des apprenants'}
        </button>
        <button
          onClick={repairNiveaux}
          disabled={repairing}
          className="px-5 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow hover:bg-teal-700 transition disabled:opacity-50"
          title="Corrige les niveaux incorrect (ex: 'Technicien Spécialisé' → '1A TS') et ajoute le champ codeApprenant manquant">
          {repairing ? 'Réparation…' : '🔧 Réparer les niveaux'}
        </button>
      </div>

      {repairMsg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${repairMsg.startsWith('✓') ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {repairMsg}
        </div>
      )}

      {loading && <Spinner />}

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {groups && !loading && groupCount > 0 && (
        <>
          {/* Résumé + actions de masse */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-700">
                <span className="font-bold text-red-600">{groupCount}</span> doublon(s) —{' '}
                <span className="font-bold">{totalDups}</span> apprenants concernés
                {toDelete.size > 0 && (
                  <span className="ml-2 font-bold text-red-700">· {toDelete.size} sélectionné(s)</span>
                )}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={autoSelect}
                className="px-3 py-1.5 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition">
                ✦ Auto-sélection intelligente
              </button>
              <button
                onClick={selectAll}
                className="px-3 py-1.5 bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition">
                Tout sélectionner ({totalDups})
              </button>
              {toDelete.size > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 bg-white text-slate-600 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 transition">
                  Tout désélectionner
                </button>
              )}
              {toDelete.size > 0 && (
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition disabled:opacity-50 ml-auto">
                  {deleting ? 'Suppression…' : `🗑 Supprimer ${toDelete.size} sélectionné(s)`}
                </button>
              )}
            </div>
            <p className="text-[11px] text-amber-700">
              <strong>Auto-sélection intelligente</strong> : garde l'entrée la plus complète (code, CIN, filière, groupe…) par doublon et sélectionne toutes les autres. Vérifiez avant de supprimer.
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(groups).map(([key, arr]) => {
              const [nom, prenom] = key.split('|');
              const allGroupChecked = arr.every(s => toDelete.has(s._id));
              const someGroupChecked = arr.some(s => toDelete.has(s._id));
              return (
                <div key={key} className="bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-3 flex-wrap">
                    {/* Checkbox groupe : sélectionne/désélectionne tout le groupe */}
                    <input
                      type="checkbox"
                      checked={allGroupChecked}
                      ref={el => { if (el) el.indeterminate = someGroupChecked && !allGroupChecked; }}
                      onChange={() => toggleGroupAll(arr)}
                      className="w-4 h-4 rounded accent-red-600 shrink-0"
                      title="Tout sélectionner / désélectionner dans ce groupe"
                    />
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <p className="font-bold text-slate-800 text-sm capitalize">{prenom} {nom}</p>
                    <span className="text-xs text-red-600 font-semibold">{arr.length} entrées</span>
                    {/* Bouton "garder le 1er" par groupe */}
                    <button
                      onClick={() => selectGroupExceptFirst(arr)}
                      className="ml-auto text-[11px] text-violet-600 font-semibold hover:text-violet-800 transition underline underline-offset-2">
                      Garder le 1er, sélectionner les autres
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {arr.map((s, i) => (
                      <div key={s._id} className={`flex items-center gap-3 px-4 py-3 ${toDelete.has(s._id) ? 'bg-red-50/60' : ''}`}>
                        <input
                          type="checkbox"
                          checked={toDelete.has(s._id)}
                          onChange={() => toggleDelete(s._id)}
                          className="w-4 h-4 rounded accent-red-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700">
                            {s.prenom} {s.nom}
                            {i === 0 && <span className="ml-2 text-[10px] bg-violet-100 text-violet-700 font-bold px-1.5 py-0.5 rounded-full">le plus complet</span>}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Code : {s.code || s.codeApprenant || '—'} ·
                            Filière : {s.filiere || s.niveau || '—'} ·
                            Groupe : {s.groupe || '—'} ·
                            CIN : {s.cin || '—'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0
                          ${s.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' :
                            s.statut === 'archive' ? 'bg-slate-100 text-slate-500' :
                            'bg-amber-100 text-amber-700'}`}>
                          {s.statut || 'actif'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400">
                      Cochez les entrées à supprimer · Conservez celle avec les informations les plus complètes
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
