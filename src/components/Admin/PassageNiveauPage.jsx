import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const NIVEAUX = [
  { value: '1A TS',              label: '1ère année TS' },
  { value: '2A TS',              label: '2ème année TS' },
  { value: 'Licence CNAM',       label: 'Licence CNAM' },
  { value: 'Licence Transitaire',label: 'Licence Transitaire' },
  { value: 'Mastère ISLI',       label: 'Mastère ISLI' },
];

function Spinner() {
  return <div className="w-5 h-5 border-2 border-[#005989] border-t-transparent rounded-full animate-spin" />;
}

export default function PassageNiveauPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedGroupeId, setSelectedGroupeId] = useState('');
  const [filterNiveauActuel, setFilterNiveauActuel] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  // Target
  const [targetNiveau, setTargetNiveau] = useState('');
  const [targetGroupeId, setTargetGroupeId] = useState('');

  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [gSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'groupes')),
          getDocs(collection(db, 'students')),
        ]);
        setGroups(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        toast.error('Erreur : ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (selectedGroupeId && s.groupeId !== selectedGroupeId) return false;
      if (filterNiveauActuel && s.niveau !== filterNiveauActuel) return false;
      return true;
    }).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [students, selectedGroupeId, filterNiveauActuel]);

  const allSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentIds.has(s.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredStudents.forEach(s => next.delete(s.id));
        return next;
      });
    } else {
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        filteredStudents.forEach(s => next.add(s.id));
        return next;
      });
    }
  };

  const toggleOne = (id) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedStudents = students.filter(s => selectedStudentIds.has(s.id));

  const handleApply = async () => {
    if (!selectedStudents.length || !targetNiveau) return;
    const ok = await confirm({
      title: 'Confirmer le passage de niveau',
      message: `${selectedStudents.length} apprenant${selectedStudents.length > 1 ? 's' : ''} seront mis à jour vers "${targetNiveau}"${targetGroupeId ? ' et changés de groupe' : ''}.`,
      confirmLabel: 'Confirmer',
    });
    if (!ok) return;

    setApplying(true);
    try {
      const BATCH_SIZE = 500;
      let updated = 0;
      for (let i = 0; i < selectedStudents.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = selectedStudents.slice(i, i + BATCH_SIZE);
        for (const s of chunk) {
          const updates = { niveau: targetNiveau, updatedAt: new Date() };
          if (targetGroupeId) updates.groupeId = targetGroupeId;
          // Update anneeFormation based on niveau
          if (targetNiveau === '1A TS') updates.anneeFormation = '1';
          else if (targetNiveau === '2A TS') updates.anneeFormation = '2';
          batch.update(doc(db, 'students', s.id), updates);
          updated++;
        }
        await batch.commit();
      }
      setDone(updated);
      setSelectedStudentIds(new Set());
      toast.success(`${updated} apprenant${updated > 1 ? 's' : ''} mis à jour vers "${targetNiveau}"`);
      // Reload students
      const sSnap = await getDocs(collection(db, 'students'));
      setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  const getGroupName = (id) => groups.find(g => g.id === id)?.nom || '—';

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Passage au niveau suivant</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Sélectionnez des apprenants et mettez à jour leur niveau de formation.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-slate-400 text-sm">Chargement…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: filters + student list */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
              <select
                value={selectedGroupeId}
                onChange={e => { setSelectedGroupeId(e.target.value); setSelectedStudentIds(new Set()); }}
                className="flex-1 min-w-44 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
              >
                <option value="">Tous les groupes</option>
                {groups.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(g => (
                  <option key={g.id} value={g.id}>{g.nom}</option>
                ))}
              </select>
              <select
                value={filterNiveauActuel}
                onChange={e => { setFilterNiveauActuel(e.target.value); setSelectedStudentIds(new Set()); }}
                className="flex-1 min-w-44 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
              >
                <option value="">Tous les niveaux</option>
                {NIVEAUX.map(n => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
                <option value="">— Non défini</option>
              </select>
              <span className="self-center text-xs text-slate-400">
                {filteredStudents.length} apprenant{filteredStudents.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Student table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="rounded border-slate-300 text-[#005989] focus:ring-[#005989]"
                      />
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Apprenant</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Code</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Groupe</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Niveau actuel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                        Aucun apprenant trouvé
                      </td>
                    </tr>
                  ) : filteredStudents.map(s => (
                    <tr
                      key={s.id}
                      className={`cursor-pointer transition-colors ${selectedStudentIds.has(s.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      onClick={() => toggleOne(s.id)}
                    >
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={() => toggleOne(s.id)}
                          className="rounded border-slate-300 text-[#005989] focus:ring-[#005989]"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800">
                        {s.nom} {s.prenom}
                      </td>
                      <td className="px-4 py-2.5 hidden sm:table-cell">
                        <span className="font-mono text-xs text-[#005989] bg-blue-50 px-1.5 py-0.5 rounded">
                          {s.codeApprenant || s.code || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs hidden md:table-cell">
                        {getGroupName(s.groupeId)}
                      </td>
                      <td className="px-4 py-2.5">
                        {s.niveau ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{s.niveau}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Non défini</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: action panel */}
          <div className="space-y-4">
            {/* Selection summary */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Sélection</p>
              <p className="text-2xl font-bold text-[#005989]">{selectedStudentIds.size}</p>
              <p className="text-sm text-slate-500">apprenant{selectedStudentIds.size !== 1 ? 's' : ''} sélectionné{selectedStudentIds.size !== 1 ? 's' : ''}</p>
              {selectedStudentIds.size > 0 && (
                <button
                  onClick={() => setSelectedStudentIds(new Set())}
                  className="text-xs text-slate-400 hover:text-slate-600 mt-2 underline"
                >
                  Désélectionner tout
                </button>
              )}
            </div>

            {/* Target level */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nouveau niveau</p>
              <div className="space-y-2">
                {NIVEAUX.map(n => (
                  <label key={n.value} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${targetNiveau === n.value ? 'border-[#005989] bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="targetNiveau"
                      value={n.value}
                      checked={targetNiveau === n.value}
                      onChange={() => setTargetNiveau(n.value)}
                      className="text-[#005989] focus:ring-[#005989]"
                    />
                    <span className={`text-sm font-medium ${targetNiveau === n.value ? 'text-[#005989]' : 'text-slate-700'}`}>{n.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Target group (optional) */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nouveau groupe <span className="font-normal normal-case text-slate-400">(optionnel)</span></p>
              <select
                value={targetGroupeId}
                onChange={e => setTargetGroupeId(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
              >
                <option value="">— Conserver le groupe actuel —</option>
                {groups.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(g => (
                  <option key={g.id} value={g.id}>{g.nom}</option>
                ))}
              </select>
            </div>

            {/* Apply button */}
            <button
              onClick={handleApply}
              disabled={!selectedStudentIds.size || !targetNiveau || applying}
              className="w-full py-3 text-sm font-bold bg-[#005989] hover:bg-[#004a73] text-white rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {applying ? (
                <><Spinner /> Mise à jour…</>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3 3L22 4" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                  </svg>
                  Passer au niveau suivant
                </>
              )}
            </button>

            {done != null && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-sm font-semibold text-emerald-800">
                  ✓ {done} apprenant{done > 1 ? 's' : ''} mis à jour
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
