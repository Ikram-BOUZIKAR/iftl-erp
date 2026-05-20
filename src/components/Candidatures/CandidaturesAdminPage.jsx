import { useState } from 'react';
import { useCandidatures, useGroupes } from '../../hooks/useData';
import { candidaturesService } from '../../services/firestore';
import { useToast } from '../UI/Toast';

const STATUT_STYLES = {
  recu: { badge: 'bg-slate-100 text-slate-600', label: 'Reçu' },
  en_cours: { badge: 'bg-blue-100 text-blue-700', label: 'En cours' },
  accepte: { badge: 'bg-emerald-100 text-emerald-700', label: 'Accepté' },
  refuse: { badge: 'bg-red-100 text-red-600', label: 'Refusé' },
};

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function CandidaturesAdminPage() {
  const toast = useToast();
  const { data: candidatures, loading, refetch } = useCandidatures();
  const { data: groupes } = useGroupes();
  const [filterStatut, setFilterStatut] = useState('');
  const [search, setSearch] = useState('');
  const [converting, setConverting] = useState(null);
  const [convertForm, setConvertForm] = useState({ groupeId: '', statut: 'actif' });
  const [convertSaving, setConvertSaving] = useState(false);

  const filtered = candidatures.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.nom?.toLowerCase().includes(q) || c.prenom?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
    const matchStatut = !filterStatut || c.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const updateStatut = async (id, statut, label) => {
    try {
      await candidaturesService.updateStatus(id, statut);
      refetch();
      toast.success(`Candidature marquée comme "${label}"`);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleConvert = async () => {
    if (!converting) return;
    setConvertSaving(true);
    try {
      await candidaturesService.convertToStudent(converting.id, convertForm);
      refetch();
      setConverting(null);
      toast.success(`${converting.prenom} ${converting.nom} ajouté comme apprenant !`);
    } catch (err) {
      toast.error('Erreur lors de la conversion : ' + err.message);
    } finally {
      setConvertSaving(false);
    }
  };

  const pendingCount = candidatures.filter(c => c.statut === 'recu' || c.statut === 'en_cours').length;

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Candidatures</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${filtered.length} candidature${filtered.length !== 1 ? 's' : ''}`}
            {pendingCount > 0 && (
              <span className="ml-2 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {pendingCount} en attente
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input type="text" placeholder="Rechercher par nom, email…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors" />
        </div>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
          <option value="">Tous les statuts</option>
          <option value="recu">Reçu</option>
          <option value="en_cours">En cours</option>
          <option value="accepte">Accepté</option>
          <option value="refuse">Refusé</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-slate-700 font-semibold">Aucune candidature</p>
            <p className="text-slate-400 text-sm mt-1">Les candidatures soumises via le formulaire public apparaîtront ici.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Candidat</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Filière</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(c => {
                const st = STATUT_STYLES[c.statut] || STATUT_STYLES.recu;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {c.nom?.[0]}{c.prenom?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{c.nom} {c.prenom}</p>
                          <p className="text-xs text-slate-400">{c.email} {c.telephone ? `· ${c.telephone}` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">
                      <p className="text-sm">{c.filiere || '—'}</p>
                      {c.niveau && <p className="text-xs text-slate-400">{c.niveau}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell text-xs">
                      {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.badge}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {c.statut === 'recu' && (
                          <button onClick={() => updateStatut(c.id, 'en_cours', 'En cours')}
                            className="text-xs font-medium px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Traiter
                          </button>
                        )}
                        {c.statut !== 'accepte' && c.statut !== 'refuse' && (
                          <>
                            <button onClick={() => { setConverting(c); setConvertForm({ groupeId: '', statut: 'actif' }); }}
                              className="text-xs font-medium px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                              → Apprenant
                            </button>
                            <button onClick={() => updateStatut(c.id, 'refuse', 'Refusé')}
                              className="text-xs font-medium px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                              Refuser
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Convert modal */}
      {converting && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Convertir en apprenant</h2>
              <button onClick={() => setConverting(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700 shrink-0">
                  {converting.nom?.[0]}{converting.prenom?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{converting.nom} {converting.prenom}</p>
                  <p className="text-xs text-slate-500">{converting.email}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Cet apprenant sera créé avec les informations de sa candidature.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Assigner au groupe</label>
                <select value={convertForm.groupeId} onChange={e => setConvertForm(f => ({ ...f, groupeId: e.target.value }))}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">— Sans groupe pour l'instant —</option>
                  {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setConverting(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleConvert} disabled={convertSaving}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-60">
                {convertSaving ? 'Conversion…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
