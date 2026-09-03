import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSessions, useGroupes, useIntervenants } from '../../hooks/useData';
import { sessionsService } from '../../services/firestore';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import EmargementLibreModal from './EmargementLibreModal';

const GRANDES_SALLES = ['Grande Salle 01', 'Grande Salle 02', 'Amphi'];

function toJsDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v?.toDate) return v.toDate();
  return new Date(v);
}

const STATUT_STYLES = {
  planifiee: { badge: 'bg-slate-100 text-slate-600', label: 'Planifiée' },
  en_cours: { badge: 'bg-emerald-100 text-emerald-700', label: 'En cours' },
  terminee: { badge: 'bg-blue-100 text-blue-700', label: 'Terminée' },
  annulee: { badge: 'bg-red-100 text-red-600', label: 'Annulée' },
};

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

export default function EmargementPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: sessions, loading, refetch } = useSessions();
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [modules, setModules] = useState([]);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [search, setSearch] = useState('');
  const [showLibreModal, setShowLibreModal] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'modules'), orderBy('code', 'asc')))
      .then(snap => setModules(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
  }, []);

  const getGroupeName = (id) => groupes.find(g => g.id === id)?.nom || '—';
  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : '—';
  };
  const getModuleName = (s) => {
    if (s.moduleId) {
      const m = modules.find(m => m.id === s.moduleId);
      if (m) return m.nom || m.code || s.moduleId;
    }
    return s.module || s.moduleId || '—';
  };
  const getDateStr = (s) => {
    const d = toJsDate(s.date);
    return d ? d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const filtered = sessions.filter(s => {
    const matchStatut = !filterStatut || s.statut === filterStatut;
    const matchGroupe = !filterGroupe || s.groupeId === filterGroupe;
    const q = search.toLowerCase();
    const moduleName = getModuleName(s);
    const matchSearch = !q || moduleName.toLowerCase().includes(q) || s.salle?.toLowerCase().includes(q) ||
      getGroupeName(s.groupeId).toLowerCase().includes(q);
    let matchDate = true;
    if (filterDate === 'today') {
      const d = toJsDate(s.date); d && d.setHours(0, 0, 0, 0);
      matchDate = d && d.getTime() === today.getTime();
    } else if (filterDate === 'week') {
      const d = toJsDate(s.date);
      if (d) { const diff = Math.floor((d - today) / 86400000); matchDate = diff >= -6 && diff <= 6; }
    }
    return matchStatut && matchGroupe && matchSearch && matchDate;
  }).sort((a, b) => {
    const da = toJsDate(a.date) || new Date(0);
    const db_ = toJsDate(b.date) || new Date(0);
    return db_ - da;
  });

  const handleOpenEmargement = async (id, module) => {
    try {
      await sessionsService.openEmargement(id);
      refetch();
      toast.success(`Émargement ouvert pour "${module}"`);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleCloseEmargement = async (id, module) => {
    const ok = await confirm({
      title: 'Clôturer cet émargement ?',
      message: `La feuille de présence de "${module}" sera clôturée. Les apprenants ne pourront plus signer.`,
      confirmLabel: 'Clôturer',
    });
    if (!ok) return;
    try {
      await sessionsService.closeEmargement(id);
      refetch();
      toast.success('Émargement clôturé avec succès');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleDeleteSession = async (s) => {
    const ok = await confirm({
      title: 'Supprimer cette feuille ?',
      message: `"${s.module}" et toutes ses données de présence seront supprimées définitivement.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      const presSnap = await getDocs(query(collection(db, 'presences'), where('sessionId', '==', s.id)));
      await Promise.all(presSnap.docs.map(d => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'sessions', s.id));
      refetch();
      toast.success('Feuille supprimée');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Émargement</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestion des feuilles de présence</p>
        </div>
        <button
          onClick={() => setShowLibreModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#005989] hover:bg-[#004a73] rounded-xl transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle feuille libre
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Rechercher module, groupe, salle…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989] transition-colors"
          />
        </div>
        <select value={filterDate} onChange={e => setFilterDate(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 bg-white">
          <option value="">Toutes les dates</option>
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
        </select>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 bg-white">
          <option value="">Tous les statuts</option>
          <option value="planifiee">Planifiée</option>
          <option value="en_cours">En cours</option>
          <option value="terminee">Terminée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 bg-white">
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✍</span>
            </div>
            <p className="text-slate-700 font-semibold">Aucune séance trouvée</p>
            <p className="text-slate-400 text-sm mt-1">
              <Link to="/planning" className="text-indigo-600 hover:text-indigo-700 font-medium">
                Créer une séance dans le planning →
              </Link>
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Séance</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Intervenant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const st = STATUT_STYLES[s.statut] || { badge: 'bg-slate-100 text-slate-600', label: s.statut };
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{getModuleName(s)}</p>
                        {GRANDES_SALLES.includes(s.salle) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 shrink-0">🏛️ Grande salle</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {getDateStr(s)}
                        {' · '}{s.heureDebut}–{s.heureFin}
                        {s.salle ? ` · ${s.salle}` : ''}
                        {s.type ? ` · ${s.type.toUpperCase()}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{getGroupeName(s.groupeId)}</td>
                    <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{getIntervenantName(s.intervenantId)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>
                        {s.emargementOuvert && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Ouvert
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <Link to={`/emargement/${s.id}`}
                          className="text-xs font-medium px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                          Feuille
                        </Link>
                        {s.statut === 'planifiee' && (
                          <button onClick={() => handleOpenEmargement(s.id, s.module)}
                            className="text-xs font-medium px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                            Ouvrir
                          </button>
                        )}
                        {s.statut === 'en_cours' && (
                          <button onClick={() => handleCloseEmargement(s.id, s.module)}
                            className="text-xs font-medium px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Clôturer
                          </button>
                        )}
                        <button onClick={() => handleDeleteSession(s)}
                          className="text-xs font-medium px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-lg transition-colors">
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {showLibreModal && (
        <EmargementLibreModal
          groupes={groupes}
          intervenants={intervenants}
          onClose={() => setShowLibreModal(false)}
        />
      )}
    </div>
  );
}
