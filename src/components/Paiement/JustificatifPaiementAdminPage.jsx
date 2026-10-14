import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';

const NIVEAUX_LABELS = {
  licence_cnam:        'Licence CNAM',
  licence_transitaire: 'Licence Transitaire',
  mastere_mlai:        'Mastère MLAI',
};

const STATUT_META = {
  en_attente: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-800' },
  valide:     { label: 'Validé',     bg: 'bg-emerald-100', text: 'text-emerald-800' },
  refuse:     { label: 'Refusé',     bg: 'bg-red-100',     text: 'text-red-700'   },
};

function Badge({ statut }) {
  const m = STATUT_META[statut] || STATUT_META.en_attente;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function JustificatifPaiementAdminPage() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [search, setSearch] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'justificatifs_paiement'), orderBy('createdAt', 'desc')));
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur de chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateStatut = async (id, statut) => {
    try {
      await updateDoc(doc(db, 'justificatifs_paiement', id), { statut, updatedAt: new Date() });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
      toast.success(statut === 'valide' ? 'Justificatif validé' : 'Justificatif refusé');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const filtered = docs.filter(d => {
    if (filter !== 'tous' && d.statut !== filter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        d.nom?.toLowerCase().includes(q) ||
        d.prenom?.toLowerCase().includes(q) ||
        d.cin?.toLowerCase().includes(q) ||
        (NIVEAUX_LABELS[d.niveau] || d.niveauLabel || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    tous:       docs.length,
    en_attente: docs.filter(d => d.statut === 'en_attente').length,
    valide:     docs.filter(d => d.statut === 'valide').length,
    refuse:     docs.filter(d => d.statut === 'refuse').length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Justificatifs de paiement</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dépôts reçus — Licence CNAM · Licence Transitaire · Mastère MLAI</p>
        </div>
        <button
          onClick={fetch}
          className="px-4 py-2 text-sm font-semibold text-[#005989] border border-[#005989]/30 rounded-xl hover:bg-[#005989]/5 transition-colors">
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'tous',       label: 'Total',       color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { key: 'en_attente', label: 'En attente',  color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { key: 'valide',     label: 'Validés',     color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { key: 'refuse',     label: 'Refusés',     color: 'text-red-700',   bg: 'bg-red-50 border-red-200' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilter(s.key)}
            className={`rounded-xl border p-3 text-left transition-all ${s.bg} ${filter === s.key ? 'ring-2 ring-[#005989]/40' : ''}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{counts[s.key]}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher par nom, prénom ou niveau…"
        className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989]"
      />

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-4 border-[#005989] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">Aucun dépôt trouvé</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prénom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CIN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Niveau</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{d.nom}</td>
                  <td className="px-4 py-3 text-slate-700">{d.prenom}</td>
                  <td className="px-4 py-3 font-mono text-sm text-slate-600 tracking-wide">{d.cin || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {NIVEAUX_LABELS[d.niveau] || d.niveauLabel || d.niveau}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(d.createdAt)}</td>
                  <td className="px-4 py-3"><Badge statut={d.statut} /></td>
                  <td className="px-4 py-3">
                    {d.statut === 'en_attente' && (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => updateStatut(d.id, 'valide')}
                          className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                          Valider
                        </button>
                        <button
                          onClick={() => updateStatut(d.id, 'refuse')}
                          className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                          Refuser
                        </button>
                      </div>
                    )}
                    {d.statut !== 'en_attente' && (
                      <button
                        onClick={() => updateStatut(d.id, 'en_attente')}
                        className="px-3 py-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                        Réinitialiser
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
