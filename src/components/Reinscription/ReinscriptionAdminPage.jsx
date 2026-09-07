import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const STATUTS = {
  en_attente:  { label: 'En attente',   cls: 'bg-amber-100 text-amber-700',   dot: 'bg-amber-500' },
  validee:     { label: 'Validée',      cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  refusee:     { label: 'Refusée',      cls: 'bg-red-100 text-red-600',       dot: 'bg-red-500' },
};

function fmtDate(val) {
  if (!val) return '—';
  if (val?.toDate) return val.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return new Date(val).toLocaleDateString('fr-FR');
}

function StatutBadge({ statut }) {
  const s = STATUTS[statut] || STATUTS.en_attente;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function DetailDrawer({ rec, onClose, onValidate, onRefuse }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="font-bold text-slate-800">{rec.prenom} {rec.nom?.toUpperCase()}</p>
            <p className="text-xs text-slate-400">{rec.cin} · {rec.anneeAcademique}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Statut */}
          <div className="flex items-center justify-between">
            <StatutBadge statut={rec.statut} />
            <p className="text-xs text-slate-400">Reçu le {fmtDate(rec.createdAt)}</p>
          </div>

          {/* Montant */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-medium text-amber-800">Frais de réinscription</p>
            <p className="text-lg font-black text-amber-700">{(rec.montantPaye || 8500).toLocaleString('fr-MA')} DH</p>
          </div>

          {/* Justificatif */}
          {rec.justificatifUrl && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Justificatif de paiement</p>
              {/\.(jpg|jpeg|png|gif|webp)$/i.test(rec.justificatifNom || '') ? (
                <img src={rec.justificatifUrl} alt="Justificatif" className="w-full rounded-xl border border-slate-200 object-contain max-h-64" />
              ) : (
                <a href={rec.justificatifUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-3 border border-slate-200 rounded-xl text-sm text-[#005989] hover:bg-blue-50 transition-colors">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z" />
                  </svg>
                  {rec.justificatifNom || 'Télécharger le justificatif'}
                </a>
              )}
            </div>
          )}

          {/* Contact */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Coordonnées</p>
            <div className="space-y-1.5 text-sm">
              {rec.telephone && <p><span className="text-slate-400 w-24 inline-block">Téléphone</span> <span className="text-slate-700 font-medium">{rec.telephone}</span></p>}
              {rec.email && <p><span className="text-slate-400 w-24 inline-block">Email</span> <span className="text-slate-700 font-medium">{rec.email}</span></p>}
              {rec.adresse && <p><span className="text-slate-400 w-24 inline-block">Adresse</span> <span className="text-slate-700">{rec.adresse}{rec.ville ? ', ' + rec.ville : ''}</span></p>}
            </div>
          </div>

          {/* Contact urgence */}
          {rec.contactUrgenceNom && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Contact d'urgence</p>
              <div className="space-y-1.5 text-sm">
                <p><span className="text-slate-400 w-24 inline-block">Nom</span> <span className="text-slate-700">{rec.contactUrgenceNom}</span></p>
                {rec.contactUrgenceTel && <p><span className="text-slate-400 w-24 inline-block">Téléphone</span> <span className="text-slate-700">{rec.contactUrgenceTel}</span></p>}
                {rec.contactUrgenceLien && <p><span className="text-slate-400 w-24 inline-block">Lien</span> <span className="text-slate-700">{rec.contactUrgenceLien}</span></p>}
              </div>
            </div>
          )}

          {rec.commentaire && (
            <div className="bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Commentaire</p>
              <p className="text-sm text-slate-700">{rec.commentaire}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {rec.statut === 'en_attente' && (
          <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex gap-3">
            <button onClick={() => onRefuse(rec)}
              className="flex-1 py-2.5 border border-red-300 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-50 transition-colors">
              Refuser
            </button>
            <button onClick={() => onValidate(rec)}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Valider
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReinscriptionAdminPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatut, setFilterStatut] = useState('');
  const [filterAnnee, setFilterAnnee] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'reinscriptions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setRecords(data);
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleValidate = async (rec) => {
    const ok = await confirm({
      title: 'Valider cette réinscription ?',
      message: `${rec.prenom} ${rec.nom} sera confirmé(e) pour ${rec.anneeAcademique}.`,
      confirmLabel: 'Valider',
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'reinscriptions', rec.id), {
        statut: 'validee',
        validatedAt: new Date(),
      });
      toast.success(`Réinscription de ${rec.prenom} ${rec.nom} validée`);
      setSelected(null);
      load();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const handleRefuse = async (rec) => {
    const ok = await confirm({
      title: 'Refuser cette réinscription ?',
      message: `La demande de ${rec.prenom} ${rec.nom} sera marquée comme refusée.`,
      danger: true,
      confirmLabel: 'Refuser',
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, 'reinscriptions', rec.id), {
        statut: 'refusee',
        refusedAt: new Date(),
      });
      toast.success(`Demande de ${rec.prenom} ${rec.nom} refusée`);
      setSelected(null);
      load();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const annees = [...new Set(records.map(r => r.anneeAcademique).filter(Boolean))].sort().reverse();

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || `${r.prenom} ${r.nom}`.toLowerCase().includes(q) || r.cin?.toLowerCase().includes(q);
    const matchS = !filterStatut || r.statut === filterStatut;
    const matchA = !filterAnnee || r.anneeAcademique === filterAnnee;
    return matchQ && matchS && matchA;
  });

  const kpis = {
    total: records.length,
    attente: records.filter(r => r.statut === 'en_attente').length,
    validees: records.filter(r => r.statut === 'validee').length,
    refusees: records.filter(r => r.statut === 'refusee').length,
  };

  const portalUrl = `${window.location.origin}/reinscription`;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Réinscriptions</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestion des demandes de réinscription</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(portalUrl); toast.success('Lien copié !'); }}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#005989] text-[#005989] text-sm font-medium rounded-xl hover:bg-blue-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copier le lien portail
          </button>
        </div>
      </div>

      {/* Portal link info */}
      <div className="bg-[#005989]/5 border border-[#005989]/20 rounded-2xl px-4 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 text-[#005989] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#005989]">Lien à envoyer aux apprenants</p>
          <p className="text-xs text-slate-500 font-mono truncate">{portalUrl}</p>
        </div>
        <a href="/reinscription" target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#005989] font-medium hover:underline shrink-0">
          Voir →
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total reçu', value: kpis.total, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' },
          { label: 'En attente', value: kpis.attente, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
          { label: 'Validées', value: kpis.validees, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Refusées', value: kpis.refusees, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl border p-4 ${k.bg}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Nom, CIN…"
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] flex-1 min-w-36"
        />
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {annees.length > 0 && (
          <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Toutes les années</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} dossier{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 font-medium">Aucune demande de réinscription</p>
            <p className="text-slate-400 text-sm mt-1">Les demandes soumises via le portail apparaîtront ici.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Apprenant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Filière</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Année</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date demande</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Justificatif</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#005989]/10 flex items-center justify-center text-xs font-bold text-[#005989] shrink-0">
                        {r.prenom?.[0]}{r.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{r.prenom} {r.nom?.toUpperCase()}</p>
                        <p className="text-xs text-slate-400">{r.cin}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500 text-xs max-w-xs truncate">{r.filiere || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs font-medium">{r.anneeAcademique}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3"><StatutBadge statut={r.statut} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {r.justificatifUrl ? (
                      <a href={r.justificatifUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="text-xs text-[#005989] hover:underline">
                        Voir
                      </a>
                    ) : <span className="text-xs text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    {r.statut === 'en_attente' && (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleRefuse(r)}
                          className="text-xs font-medium text-red-500 hover:text-red-700 transition-colors">
                          Refuser
                        </button>
                        <button onClick={() => handleValidate(r)}
                          className="text-xs font-medium px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors">
                          Valider
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <DetailDrawer
          rec={selected}
          onClose={() => setSelected(null)}
          onValidate={handleValidate}
          onRefuse={handleRefuse}
        />
      )}
    </div>
  );
}
