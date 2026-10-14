import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';

const TARIFS = {
  licence_cnam:        30000,
  licence_transitaire: 34000,
  mastere_mlai:        43500,
};

const NIVEAUX_LABELS = {
  licence_cnam:        'Licence CNAM',
  licence_transitaire: 'Licence Transitaire',
  mastere_mlai:        'Mastère MLAI',
};

const STATUT_META = {
  en_attente: { label: 'En attente', bg: 'bg-amber-100', text: 'text-amber-800' },
  valide:     { label: 'Validé',     bg: 'bg-emerald-100', text: 'text-emerald-800' },
  refuse:     { label: 'Refusé',     bg: 'bg-red-100',     text: 'text-red-700' },
};

function Badge({ statut }) {
  const m = STATUT_META[statut] || STATUT_META.en_attente;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('fr-MA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMAD(n) {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-MA').format(n) + ' MAD';
}

// Group all deposits by CIN, compute totals
function groupByCin(docs) {
  const map = {};
  docs.forEach(d => {
    const key = (d.cin || d.id).toUpperCase();
    if (!map[key]) {
      map[key] = {
        cin: d.cin,
        nom: d.nom,
        prenom: d.prenom,
        telephone: d.telephone,
        niveau: d.niveau,
        niveauLabel: d.niveauLabel || NIVEAUX_LABELS[d.niveau] || d.niveau,
        depots: [],
      };
    }
    map[key].depots.push(d);
    // Keep most recent info
    if (!map[key].nom && d.nom) map[key].nom = d.nom;
  });
  return Object.values(map).map(e => {
    const tarif = TARIFS[e.niveau] || 0;
    const totalValide = e.depots
      .filter(d => d.statut === 'valide')
      .reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
    const totalTous = e.depots.reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
    const restant = Math.max(0, tarif - totalValide);
    return { ...e, tarif, totalValide, totalTous, restant };
  });
}

function exportCSV(rows, niveauFilter) {
  const data = rows.map(r => ({
    Nom:         r.nom || '',
    Prénom:      r.prenom || '',
    CIN:         r.cin || '',
    Téléphone:   r.telephone || '',
    Niveau:      r.niveauLabel || '',
    'Total validé (MAD)': r.totalValide,
    'Tarif total (MAD)':  r.tarif,
    'Restant (MAD)':      r.restant,
    'Nb dépôts':          r.depots.length,
  }));
  const header = Object.keys(data[0]).join(';');
  const body   = data.map(r => Object.values(r).join(';')).join('\n');
  const blob   = new Blob(['﻿' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href = url;
  a.download = `paiements_${niveauFilter}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function JustificatifPaiementAdminPage() {
  const toast = useToast();
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('etudiants'); // 'etudiants' | 'depots'
  const [niveauFilter, setNiveauFilter] = useState('tous');
  const [statutFilter, setStatutFilter] = useState('tous'); // pour vue dépôts
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState({}); // CIN → bool

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
      toast.success(statut === 'valide' ? 'Validé' : statut === 'refuse' ? 'Refusé' : 'Remis en attente');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const supprimerDoc = async (id, label) => {
    if (!window.confirm(`Supprimer le dépôt de ${label} ? Irréversible.`)) return;
    try {
      await deleteDoc(doc(db, 'justificatifs_paiement', id));
      setDocs(prev => prev.filter(d => d.id !== id));
      toast.success('Dépôt supprimé');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  // ── Vue par étudiant ────────────────────────────────────────────────────────
  const students = groupByCin(docs);

  const filteredStudents = students.filter(s => {
    if (niveauFilter !== 'tous' && s.niveau !== niveauFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q) || s.cin?.toLowerCase().includes(q);
    }
    return true;
  });

  // Summary stats
  const totalEncaisse = filteredStudents.reduce((s, e) => s + e.totalValide, 0);
  const totalRestant  = filteredStudents.reduce((s, e) => s + e.restant, 0);
  const nPayes        = filteredStudents.filter(e => e.restant === 0 && e.tarif > 0).length;
  const nPartiel      = filteredStudents.filter(e => e.restant > 0 && e.totalValide > 0).length;
  const nRien         = filteredStudents.filter(e => e.totalValide === 0).length;

  // ── Vue par dépôt ───────────────────────────────────────────────────────────
  const filteredDepots = docs.filter(d => {
    if (niveauFilter !== 'tous' && d.niveau !== niveauFilter) return false;
    if (statutFilter !== 'tous' && d.statut !== statutFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return d.nom?.toLowerCase().includes(q) || d.prenom?.toLowerCase().includes(q) || d.cin?.toLowerCase().includes(q);
    }
    return true;
  });

  const toggle = cin => setExpanded(e => ({ ...e, [cin]: !e[cin] }));

  const niveauChips = [
    { key: 'tous', label: 'Tous' },
    { key: 'licence_cnam',        label: 'Licence CNAM' },
    { key: 'licence_transitaire', label: 'Licence Transitaire' },
    { key: 'mastere_mlai',        label: 'Mastère MLAI' },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Suivi des paiements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Licence CNAM · Licence Transitaire · Mastère MLAI</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => exportCSV(filteredStudents, niveauFilter)}
            className="px-4 py-2 text-sm font-semibold text-emerald-700 border border-emerald-300 rounded-xl hover:bg-emerald-50 transition-colors">
            ↓ Exporter CSV
          </button>
          <button onClick={fetchData}
            className="px-4 py-2 text-sm font-semibold text-[#005989] border border-[#005989]/30 rounded-xl hover:bg-[#005989]/5 transition-colors">
            Actualiser
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {view === 'etudiants' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total encaissé',   value: fmtMAD(totalEncaisse), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Restant à payer',  value: fmtMAD(totalRestant),  color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
            { label: 'Soldés',           value: nPayes,                 color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Paiement partiel', value: nPartiel,               color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
            { label: 'Aucun paiement',   value: nRien,                  color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
          ].map(c => (
            <div key={c.label} className={`rounded-xl border p-3 ${c.bg}`}>
              <p className={`text-xl font-black ${c.color} tabular-nums`}>{c.value}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        {/* View toggle */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {[{ key: 'etudiants', label: 'Par étudiant' }, { key: 'depots', label: 'Par dépôt' }].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === v.key ? 'bg-white text-[#005989] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {v.label}
            </button>
          ))}
        </div>

        {/* Niveau chips */}
        <div className="flex gap-2 flex-wrap">
          {niveauChips.map(c => (
            <button key={c.key} onClick={() => setNiveauFilter(c.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                niveauFilter === c.key
                  ? 'bg-[#005989] text-white border-[#005989]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#005989]/40'
              }`}>
              {c.label}
            </button>
          ))}
          {view === 'depots' && (
            <div className="ml-auto flex gap-1">
              {['tous', 'en_attente', 'valide', 'refuse'].map(s => (
                <button key={s} onClick={() => setStatutFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    statutFilter === s
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}>
                  {s === 'tous' ? 'Tous' : STATUT_META[s]?.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher nom, prénom, CIN…"
          className="w-full text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989]" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-4 border-[#005989] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'etudiants' ? (

        /* ── VUE PAR ÉTUDIANT ─────────────────────────────────────────── */
        filteredStudents.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">Aucun étudiant trouvé</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8" />
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Étudiant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Niveau</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payé</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tarif</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Restant</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Progression</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(e => {
                  const pct     = e.tarif > 0 ? Math.min(100, Math.round(e.totalValide / e.tarif * 100)) : 0;
                  const solde   = e.restant === 0 && e.tarif > 0;
                  const partiel = !solde && e.totalValide > 0;
                  const rowBg   = solde ? 'bg-emerald-50/40' : partiel ? 'bg-amber-50/30' : '';
                  const open    = expanded[e.cin];
                  return [
                    <tr key={e.cin} onClick={() => toggle(e.cin)}
                      className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50/80 transition-colors ${rowBg}`}>
                      <td className="px-4 py-3 text-slate-400">
                        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{e.nom} {e.prenom}</p>
                        <p className="text-xs text-slate-500 font-mono">{e.cin} {e.telephone ? `· ${e.telephone}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{e.niveauLabel}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">{fmtMAD(e.totalValide)}</td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{fmtMAD(e.tarif)}</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${solde ? 'text-emerald-600' : partiel ? 'text-amber-600' : 'text-red-600'}`}>
                        {solde ? '✓ Soldé' : fmtMAD(e.restant)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                            <div className={`h-full rounded-full transition-all ${solde ? 'bg-emerald-500' : partiel ? 'bg-amber-400' : 'bg-slate-200'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right tabular-nums">{pct}%</span>
                        </div>
                      </td>
                    </tr>,
                    open && (
                      <tr key={`${e.cin}-detail`}>
                        <td colSpan={7} className="px-0 py-0 bg-slate-50 border-b border-slate-200">
                          <div className="px-12 py-3">
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                              {e.depots.length} dépôt(s)
                            </p>
                            <div className="space-y-1.5">
                              {e.depots.map(d => (
                                <div key={d.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-slate-100">
                                  <Badge statut={d.statut} />
                                  <span className="text-xs text-slate-500">{formatDate(d.createdAt)}</span>
                                  <span className="font-semibold text-slate-800 tabular-nums ml-auto">{fmtMAD(d.montantPaye)}</span>
                                  {d.justificatifData && (
                                    <button onClick={ev => { ev.stopPropagation(); const w = window.open('', '_blank'); d.justificatifType?.startsWith('image/') ? w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${d.justificatifData}" style="max-width:100%;max-height:100vh" /></body></html>`) : w.document.write(`<html><body style="margin:0"><embed src="${d.justificatifData}" width="100%" height="100%" /></body></html>`); }}
                                      className="text-xs text-[#005989] hover:underline font-semibold">
                                      Voir
                                    </button>
                                  )}
                                  <div className="flex gap-1 ml-2" onClick={ev => ev.stopPropagation()}>
                                    {d.statut === 'en_attente' && <>
                                      <button onClick={() => updateStatut(d.id, 'valide')}
                                        className="px-2 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100">
                                        Valider
                                      </button>
                                      <button onClick={() => updateStatut(d.id, 'refuse')}
                                        className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100">
                                        Refuser
                                      </button>
                                    </>}
                                    {d.statut !== 'en_attente' && (
                                      <button onClick={() => updateStatut(d.id, 'en_attente')}
                                        className="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100">
                                        Réinitialiser
                                      </button>
                                    )}
                                    <button onClick={() => supprimerDoc(d.id, `${e.nom} ${e.prenom}`)}
                                      className="p-0.5 text-slate-300 hover:text-red-500 transition-colors">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  ];
                })}
              </tbody>
            </table>
          </div>
        )

      ) : (

        /* ── VUE PAR DÉPÔT ────────────────────────────────────────────── */
        filteredDepots.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">Aucun dépôt trouvé</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nom</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CIN</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Téléphone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Niveau</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Montant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fichier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDepots.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{d.nom}</p>
                      <p className="text-xs text-slate-500">{d.prenom}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 tracking-wide">{d.cin || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{d.telephone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{NIVEAUX_LABELS[d.niveau] || d.niveauLabel || d.niveau}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums">{d.montantPaye ? fmtMAD(d.montantPaye) : '—'}</td>
                    <td className="px-4 py-3">
                      {d.justificatifData ? (
                        <button onClick={() => { const w = window.open('', '_blank'); d.justificatifType?.startsWith('image/') ? w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${d.justificatifData}" style="max-width:100%;max-height:100vh" /></body></html>`) : w.document.write(`<html><body style="margin:0"><embed src="${d.justificatifData}" width="100%" height="100%" /></body></html>`); }}
                          className="text-xs font-semibold text-[#005989] hover:underline">Voir</button>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(d.createdAt)}</td>
                    <td className="px-4 py-3"><Badge statut={d.statut} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 justify-end items-center">
                        {d.statut === 'en_attente' && <>
                          <button onClick={() => updateStatut(d.id, 'valide')}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100">
                            Valider
                          </button>
                          <button onClick={() => updateStatut(d.id, 'refuse')}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
                            Refuser
                          </button>
                        </>}
                        {d.statut !== 'en_attente' && (
                          <button onClick={() => updateStatut(d.id, 'en_attente')}
                            className="px-2.5 py-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100">
                            Réinitialiser
                          </button>
                        )}
                        <button onClick={() => supprimerDoc(d.id, `${d.nom} ${d.prenom}`)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
        )
      )}
    </div>
  );
}
