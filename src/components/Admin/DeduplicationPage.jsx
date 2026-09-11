import { useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Dédoublonnage des apprenants</h1>
        <p className="text-sm text-slate-500 mt-1">
          Détecte les apprenants inscrits plusieurs fois (1A TS, 2A TS, Licence…) et permet de supprimer les doublons.
        </p>
      </div>

      <button
        onClick={loadAndDetect}
        disabled={loading}
        className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-sm shadow hover:bg-violet-700 transition disabled:opacity-50">
        {loading ? 'Analyse en cours…' : 'Analyser la liste des apprenants'}
      </button>

      {loading && <Spinner />}

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {groups && !loading && groupCount > 0 && (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              <span className="font-bold text-red-600">{groupCount}</span> doublon(s) détecté(s) —{' '}
              <span className="font-bold">{totalDups}</span> apprenants concernés.
            </p>
            {toDelete.size > 0 && (
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition disabled:opacity-50">
                {deleting ? 'Suppression…' : `Supprimer ${toDelete.size} sélectionné(s)`}
              </button>
            )}
          </div>

          <div className="space-y-4">
            {Object.entries(groups).map(([key, arr]) => {
              const [nom, prenom] = key.split('|');
              return (
                <div key={key} className="bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <p className="font-bold text-slate-800 text-sm capitalize">{prenom} {nom}</p>
                    <span className="ml-auto text-xs text-red-600 font-semibold">{arr.length} entrées</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {arr.map(s => (
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
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Code : {s.code || s.codeApprenant || '—'} ·
                            Filière : {s.filiere || s.niveau || '—'} ·
                            Groupe : {s.groupe || '—'} ·
                            CIN : {s.cin || '—'}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold
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
