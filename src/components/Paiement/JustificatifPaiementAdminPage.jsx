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

function fmtMAD(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('fr-MA', { style: 'decimal', minimumFractionDigits: 0 }).format(n) + ' MAD';
}

export default function JustificatifPaiementAdminPage() {
  const toast = useToast();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('tous');
  const [search, setSearch] = useState('');
  const [showFinance, setShowFinance] = useState(false);

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatut = async (id, statut) => {
    try {
      await updateDoc(doc(db, 'justificatifs_paiement', id), { statut, updatedAt: new Date() });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
      toast.success(statut === 'valide' ? 'Justificatif validé' : statut === 'refuse' ? 'Justificatif refusé' : 'Remis en attente');
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

  // Finance stats
  const totalMontantValide  = docs.filter(d => d.statut === 'valide')
    .reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
  const totalMontantAttente = docs.filter(d => d.statut === 'en_attente')
    .reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
  const totalMontantAll     = docs.reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);

  const byNiveau = Object.entries(NIVEAUX_LABELS).map(([key, label]) => {
    const items = docs.filter(d => d.niveau === key);
    return {
      label,
      total: items.length,
      valide: items.filter(d => d.statut === 'valide').length,
      montant: items.filter(d => d.statut === 'valide')
        .reduce((s, d) => s + (Number(d.montantPaye) || 0), 0),
    };
  }).filter(n => n.total > 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Justificatifs de paiement</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dépôts reçus — Licence CNAM · Licence Transitaire · Mastère MLAI</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFinance(v => !v)}
            className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors ${showFinance ? 'bg-[#005989] text-white border-[#005989]' : 'text-[#005989] border-[#005989]/30 hover:bg-[#005989]/5'}`}>
            {showFinance ? 'Masquer finances' : 'Suivi financier'}
          </button>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-semibold text-[#005989] border border-[#005989]/30 rounded-xl hover:bg-[#005989]/5 transition-colors">
            Actualiser
          </button>
        </div>
      </div>

      {/* Financial dashboard */}
      {showFinance && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <h2 className="font-bold text-slate-700 text-base">Suivi des montants</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Total validé</p>
              <p className="text-2xl font-black text-emerald-700">{fmtMAD(totalMontantValide)}</p>
              <p className="text-xs text-emerald-600 mt-1">{counts.valide} dépôt(s) validé(s)</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">En attente de validation</p>
              <p className="text-2xl font-black text-amber-700">{fmtMAD(totalMontantAttente)}</p>
              <p className="text-xs text-amber-600 mt-1">{counts.en_attente} dépôt(s) en attente</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total déclaré (tous)</p>
              <p className="text-2xl font-black text-slate-700">{fmtMAD(totalMontantAll)}</p>
              <p className="text-xs text-slate-500 mt-1">{counts.tous} dépôt(s) au total</p>
            </div>
          </div>

          {byNiveau.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Par filière</p>
              <div className="space-y-2">
                {byNiveau.map(n => (
                  <div key={n.label} className="flex items-center gap-3">
                    <p className="text-sm text-slate-700 w-48 shrink-0">{n.label}</p>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#005989] rounded-full"
                        style={{ width: n.total > 0 ? `${(n.valide / n.total) * 100}%` : '0%' }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 w-20 text-right">{n.valide}/{n.total}</p>
                    <p className="text-xs font-semibold text-emerald-700 w-28 text-right">{fmtMAD(n.montant)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status chips */}
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
        placeholder="Rechercher par nom, prénom, CIN ou niveau…"
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prénom</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CIN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Téléphone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Niveau</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Justificatif</th>
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
                  <td className="px-4 py-3 text-slate-600">{d.telephone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {NIVEAUX_LABELS[d.niveau] || d.niveauLabel || d.niveau}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">
                    {d.montantPaye ? fmtMAD(d.montantPaye) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {d.justificatifData ? (
                      <button
                        onClick={() => {
                          const w = window.open('', '_blank');
                          if (d.justificatifType?.startsWith('image/')) {
                            w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${d.justificatifData}" style="max-width:100%;max-height:100vh;object-fit:contain" /></body></html>`);
                          } else {
                            w.document.write(`<html><body style="margin:0"><embed src="${d.justificatifData}" width="100%" height="100%" type="application/pdf" /></body></html>`);
                          }
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#005989] hover:underline">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Voir
                      </button>
                    ) : <span className="text-xs text-slate-400">—</span>}
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
