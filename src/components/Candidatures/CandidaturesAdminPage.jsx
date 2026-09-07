import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCandidatures, useGroupes } from '../../hooks/useData';
import { candidaturesService } from '../../services/firestore';
import { useToast } from '../UI/Toast';

const BRAND = '#005989';

const STATUTS = {
  recu:         { label: 'Reçu',         cls: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  en_cours:     { label: 'En traitement',cls: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  accepte:      { label: 'Admis',        cls: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  refuse:       { label: 'Refusé',       cls: 'bg-red-100 text-red-600',      dot: 'bg-red-500' },
  doublon:      { label: 'Doublon',      cls: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400' },
  liste_attente:{ label: 'Liste attente',cls: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
};

const DOCS_LABELS = {
  cin_recto:   'CIN Recto',
  cin_verso:   'CIN Verso',
  bac:         'Relevé de notes / Bac',
  photo:       'Photo d\'identité',
  cv:          'CV',
  attestation: 'Attestation de travail',
};

function fmtDate(val) {
  if (!val) return '—';
  if (val?.toDate) return val.toDate().toLocaleDateString('fr-FR');
  return new Date(val).toLocaleDateString('fr-FR');
}

function fmtDateISO(val) {
  if (!val) return '';
  if (val?.toDate) return val.toDate().toISOString().slice(0, 10);
  return new Date(val).toISOString().slice(0, 10);
}

function Row({ label, val, bold }) {
  if (!val) return null;
  return (
    <div className="flex justify-between gap-2 py-0.5">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`text-right leading-tight ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{val}</span>
    </div>
  );
}

export default function CandidaturesAdminPage() {
  const toast = useToast();
  const { data: candidatures, loading, refetch } = useCandidatures();
  const { data: groupes } = useGroupes();

  // Filters
  const [search, setSearch]             = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterVille, setFilterVille]   = useState('');
  const [filterAnnee, setFilterAnnee]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]   = useState('');

  // Selection
  const [selectedIds, setSelectedIds]   = useState(new Set());

  // Detail panel
  const [selected, setSelected]         = useState(null);
  const [adminMsg, setAdminMsg]         = useState('');
  const [savingMsg, setSavingMsg]       = useState(false);

  // Modals
  const [converting, setConverting]     = useState(null);
  const [convertForm, setConvertForm]   = useState({ groupeId: '' });
  const [convertSaving, setConvertSaving] = useState(false);
  const [motifRefus, setMotifRefus]     = useState('');
  const [showRefusModal, setShowRefusModal] = useState(null);
  const [bulkAction, setBulkAction]     = useState('');

  // ── Derived lists for filter dropdowns
  const filieres   = [...new Set(candidatures.map(c => c.filiere).filter(Boolean))].sort();
  const villes     = [...new Set(candidatures.map(c => c.ville).filter(Boolean))].sort();
  const annees     = [...new Set(candidatures.map(c => c.anneeEntree).filter(Boolean))].sort();

  // ── Filter
  const filtered = candidatures.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q
      || `${c.nom} ${c.prenom}`.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.cin?.toLowerCase().includes(q)
      || c.telephone?.includes(q)
      || c.ref?.toLowerCase().includes(q);
    const matchS   = !filterStatut  || c.statut === filterStatut;
    const matchF   = !filterFiliere || c.filiere === filterFiliere;
    const matchV   = !filterVille   || c.ville === filterVille;
    const matchA   = !filterAnnee   || c.anneeEntree === filterAnnee;
    const cDate    = fmtDateISO(c.createdAt);
    const matchDfr = !filterDateFrom || cDate >= filterDateFrom;
    const matchDto = !filterDateTo   || cDate <= filterDateTo;
    return matchQ && matchS && matchF && matchV && matchA && matchDfr && matchDto;
  });

  // ── KPIs
  const kpis = {
    total:   candidatures.length,
    recu:    candidatures.filter(c => c.statut === 'recu').length,
    accepte: candidatures.filter(c => c.statut === 'accepte').length,
    refuse:  candidatures.filter(c => c.statut === 'refuse').length,
  };

  // ── Bulk selection helpers
  const allChecked   = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));
  const someChecked  = filtered.some(c => selectedIds.has(c.id));
  const toggleAll    = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };
  const toggleOne    = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Actions
  const updateStatut = async (c, statut) => {
    try {
      await candidaturesService.updateStatus(c.id, statut);
      if (selected?.id === c.id) setSelected(s => ({ ...s, statut }));
      refetch();
      toast.success(`${c.prenom} ${c.nom} : ${STATUTS[statut]?.label}`);
    } catch (err) { toast.error(err.message); }
  };

  const handleRefuser = async () => {
    if (!showRefusModal) return;
    try {
      await updateDoc(doc(db, 'candidatures', showRefusModal.id), {
        statut: 'refuse',
        motifRefus: motifRefus.trim() || null,
        dateTraitement: new Date(),
      });
      if (selected?.id === showRefusModal.id) setSelected(s => ({ ...s, statut: 'refuse' }));
      refetch();
      toast.success(`Candidature refusée.`);
    } catch (err) { toast.error(err.message); }
    setShowRefusModal(null);
    setMotifRefus('');
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'candidatures', id), { statut: bulkAction, dateTraitement: new Date() });
      }
      toast.success(`${selectedIds.size} dossier(s) : ${STATUTS[bulkAction]?.label}`);
      setSelectedIds(new Set());
      setBulkAction('');
      refetch();
    } catch (err) { toast.error(err.message); }
  };

  const handleSaveMessage = async () => {
    if (!selected || !adminMsg.trim()) return;
    setSavingMsg(true);
    try {
      await updateDoc(doc(db, 'candidatures', selected.id), { adminMessage: adminMsg.trim() });
      setSelected(s => ({ ...s, adminMessage: adminMsg.trim() }));
      toast.success('Message enregistré et visible par le candidat.');
    } catch (err) { toast.error(err.message); }
    finally { setSavingMsg(false); }
  };

  const handleConvert = async () => {
    if (!converting) return;
    setConvertSaving(true);
    try {
      await candidaturesService.convertToStudent(converting.id, convertForm);
      refetch();
      setConverting(null);
      toast.success(`${converting.prenom} ${converting.nom} ajouté comme apprenant !`);
    } catch (err) { toast.error(err.message); }
    finally { setConvertSaving(false); }
  };

  const handleOpenDetail = (c) => {
    setSelected(prev => prev?.id === c.id ? null : c);
    setAdminMsg(c.adminMessage || '');
  };

  // ── CSV Export
  const handleExport = () => {
    const cols = ['Réf','Nom','Prénom','CIN','Email','Téléphone','Ville','Filière','Programme','Année','Statut','Date soumission'];
    const rows = filtered.map(c => [
      c.ref || '', c.nom || '', c.prenom || '', c.cin || '', c.email || '',
      c.telephone || '', c.ville || '', c.filiere || '', c.programType || '',
      c.anneeEntree || '', STATUTS[c.statut]?.label || c.statut || '',
      fmtDate(c.createdAt),
    ]);
    const csv = [cols, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `candidatures_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Candidatures</h1>
          <p className="text-slate-400 text-sm">Traitement des dossiers de préinscription</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition font-medium">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exporter CSV
          </button>
          <div className="text-xs text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            {candidatures.length} dossiers reçus
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',    value: kpis.total,   color: BRAND,     icon: '📋' },
          { label: 'À traiter',value: kpis.recu,    color: '#2563eb', icon: '📥' },
          { label: 'Admis',    value: kpis.accepte, color: '#16a34a', icon: '✅' },
          { label: 'Refusés',  value: kpis.refuse,  color: '#dc2626', icon: '❌' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <span className="text-2xl">{k.icon}</span>
            <div>
              <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs font-medium text-slate-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        {/* Row 1 */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, CIN, référence…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005989]" />
          </div>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Tous statuts</option>
            {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Toutes années</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {/* Row 2 */}
        <div className="flex flex-wrap gap-2">
          <select value={filterFiliere} onChange={e => setFilterFiliere(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white flex-1 min-w-48">
            <option value="">Toutes filières</option>
            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filterVille} onChange={e => setFilterVille(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Toutes villes</option>
            {villes.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 whitespace-nowrap">Du</span>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
            <span className="text-xs text-slate-400 whitespace-nowrap">au</span>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
          </div>
          {(filterStatut||filterFiliere||filterVille||filterAnnee||filterDateFrom||filterDateTo||search) && (
            <button onClick={() => { setSearch(''); setFilterStatut(''); setFilterFiliere(''); setFilterVille(''); setFilterAnnee(''); setFilterDateFrom(''); setFilterDateTo(''); }}
              className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl px-3 py-2 transition">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#005989] text-white rounded-2xl px-5 py-3 flex items-center gap-3 flex-wrap shadow-md">
          <span className="text-sm font-bold">{selectedIds.size} dossier(s) sélectionné(s)</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="bg-white/20 border border-white/30 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none flex-1 max-w-48">
            <option value="">— Choisir une action —</option>
            <option value="en_cours">Mettre en traitement</option>
            <option value="accepte">Admettre</option>
            <option value="refuse">Refuser</option>
            <option value="liste_attente">Liste d'attente</option>
          </select>
          <button onClick={handleBulkAction} disabled={!bulkAction}
            className="bg-white text-[#005989] text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-slate-100 transition disabled:opacity-40">
            Appliquer
          </button>
          <button onClick={() => { setSelectedIds(new Set()); setBulkAction(''); }}
            className="text-white/60 hover:text-white text-sm transition ml-auto">
            Annuler
          </button>
        </div>
      )}

      {/* List + Detail panel */}
      <div className={`flex gap-4 ${selected ? 'items-start' : ''}`}>

        {/* Table */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all ${selected ? 'flex-1 min-w-0' : 'w-full'}`}>
          {loading ? (
            <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-4xl">📋</span>
              <p className="text-slate-500 font-medium mt-3">Aucune candidature</p>
              <p className="text-slate-400 text-xs mt-1">Les dossiers soumis via le formulaire public apparaîtront ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-8">
                      <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 rounded accent-[#005989] cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">Candidat</th>
                    <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Filière</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Statut</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(c => {
                    const st      = STATUTS[c.statut] || STATUTS.recu;
                    const isActive = selected?.id === c.id;
                    return (
                      <tr key={c.id}
                        className={`transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleOne(c.id)}
                            className="w-3.5 h-3.5 rounded accent-[#005989] cursor-pointer" />
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => handleOpenDetail(c)}>
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: BRAND }}>
                              {c.prenom?.[0]}{c.nom?.[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 text-sm truncate">{c.prenom} {c.nom}</p>
                              <p className="text-xs text-slate-400 truncate">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell max-w-[200px] cursor-pointer" onClick={() => handleOpenDetail(c)}>
                          <span className="text-xs text-slate-600 leading-tight line-clamp-2">{c.filiere || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell cursor-pointer" onClick={() => handleOpenDetail(c)}>
                          {fmtDate(c.createdAt)}
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => handleOpenDetail(c)}>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                          {c.adminMessage && (
                            <svg className="w-3 h-3 text-amber-400 inline ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {c.statut === 'recu' && (
                              <button onClick={() => updateStatut(c, 'en_cours')}
                                className="text-xs px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition">
                                Traiter
                              </button>
                            )}
                            {!['accepte','refuse'].includes(c.statut) && (
                              <>
                                <button onClick={() => updateStatut(c, 'accepte')}
                                  className="text-xs px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">
                                  ✓ Admettre
                                </button>
                                <button onClick={() => setShowRefusModal(c)}
                                  className="text-xs px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">
                                  ✗ Refuser
                                </button>
                              </>
                            )}
                            {c.statut === 'accepte' && (
                              <button onClick={() => { setConverting(c); setConvertForm({ groupeId: '' }); }}
                                className="text-xs px-2.5 py-1.5 bg-[#005989] hover:bg-[#004a73] text-white rounded-lg font-medium transition">
                                → Inscrire
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-4 py-2 text-xs text-slate-400 border-t border-slate-100">
                {filtered.length} dossier(s) affiché(s) sur {candidatures.length}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#005989] to-[#003d63] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUTS[selected.statut]?.cls || 'bg-white/20 text-white'}`}>
                  {STATUTS[selected.statut]?.label}
                </span>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-lg leading-none">×</button>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg mb-2">
                {selected.prenom?.[0]}{selected.nom?.[0]}
              </div>
              <h3 className="text-white font-bold text-base">{selected.prenom} {selected.nom}</h3>
              {selected.ref && <p className="text-white/60 text-xs font-mono mt-0.5">Réf: {selected.ref}</p>}
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto max-h-[70vh]">
              {/* Identity */}
              <Row label="Email"         val={selected.email} />
              <Row label="Tél."          val={selected.telephone} />
              <Row label="CIN"           val={selected.cin} />
              <Row label="Date naissance"val={selected.dateNaissance} />
              <Row label="Ville"         val={selected.ville} />
              <Row label="Niveau bac"    val={selected.niveauScolaire || selected.niveau} />
              <Row label="Spécialité bac"val={selected.specBac} />
              <Row label="Moy. bac"      val={selected.moyenneBac ? `${selected.moyenneBac}/20` : null} />

              {/* Formation */}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <Row label="Programme"   val={selected.programType}   bold />
                <Row label="Filière"     val={selected.filiere}       bold />
                <Row label="Année"       val={selected.anneeEntree} />
              </div>

              {/* Files */}
              {selected.fichierUrls && Object.keys(selected.fichierUrls).length > 0 && (
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-2">Documents</p>
                  <div className="space-y-1">
                    {Object.entries(selected.fichierUrls).map(([key, url]) => (
                      <a key={key} href={url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-100 hover:border-[#005989]/30 hover:bg-blue-50/30 transition group">
                        <svg className="w-3 h-3 text-[#005989] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span className="text-slate-600 group-hover:text-[#005989] transition flex-1">{DOCS_LABELS[key] || key}</span>
                        <svg className="w-3 h-3 text-slate-300 group-hover:text-[#005989] transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivations */}
              {selected.motivations && (
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Motivations</p>
                  <p className="text-slate-600 leading-relaxed">{selected.motivations}</p>
                </div>
              )}

              {/* Contact urgence */}
              {selected.urgenceNom && (
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Contact d'urgence</p>
                  <Row label="Nom"  val={selected.urgenceNom} />
                  <Row label="Tél." val={selected.urgenceTel} />
                  <Row label="Lien" val={selected.urgenceLien} />
                </div>
              )}

              {/* Admin message */}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1.5">Message au candidat</p>
                <textarea value={adminMsg} onChange={e => setAdminMsg(e.target.value)} rows={3}
                  placeholder="Ce message sera visible par le candidat dans son suivi de dossier…"
                  className="w-full border border-slate-200 rounded-xl px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none mb-1.5" />
                <button onClick={handleSaveMessage} disabled={savingMsg || !adminMsg.trim()}
                  className="w-full bg-[#005989] text-white text-xs font-bold py-2 rounded-xl hover:bg-[#004a73] disabled:opacity-40 transition">
                  {savingMsg ? 'Enregistrement…' : 'Envoyer le message'}
                </button>
              </div>

              {/* Quick actions */}
              <div className="border-t border-slate-100 pt-3 mt-2 flex gap-2 flex-wrap">
                {!['accepte','refuse'].includes(selected.statut) && (
                  <>
                    <button onClick={() => updateStatut(selected, 'accepte')}
                      className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-700 transition">
                      ✓ Admettre
                    </button>
                    <button onClick={() => setShowRefusModal(selected)}
                      className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-red-700 transition">
                      ✗ Refuser
                    </button>
                  </>
                )}
                {selected.statut === 'accepte' && (
                  <button onClick={() => { setConverting(selected); setConvertForm({ groupeId: '' }); }}
                    className="w-full bg-[#005989] text-white text-xs font-bold py-2 rounded-xl hover:bg-[#004a73] transition">
                    → Inscrire comme apprenant
                  </button>
                )}
              </div>
              <p className="text-slate-300 text-[10px] text-center">Soumis le {fmtDate(selected.createdAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Refus modal */}
      {showRefusModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-1">Refuser la candidature</h3>
            <p className="text-sm text-slate-500 mb-4">{showRefusModal.prenom} {showRefusModal.nom} — {showRefusModal.filiere}</p>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Motif de refus (optionnel)</label>
            <textarea value={motifRefus} onChange={e => setMotifRefus(e.target.value)} rows={3}
              placeholder="Dossier incomplet, niveau insuffisant, quota atteint…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setShowRefusModal(null); setMotifRefus(''); }}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">Annuler</button>
              <button onClick={handleRefuser}
                className="flex-1 bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-red-700 transition">
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to student modal */}
      {converting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-1">Inscrire comme apprenant</h3>
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl p-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
                {converting.prenom?.[0]}{converting.nom?.[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{converting.prenom} {converting.nom}</p>
                <p className="text-xs text-slate-500">{converting.filiere}</p>
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Assigner au groupe</label>
            <select value={convertForm.groupeId} onChange={e => setConvertForm(f => ({ ...f, groupeId: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] mb-4">
              <option value="">— Sans groupe pour l'instant —</option>
              {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setConverting(null)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">Annuler</button>
              <button onClick={handleConvert} disabled={convertSaving}
                className="flex-1 bg-[#005989] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#004a73] disabled:opacity-60 transition">
                {convertSaving ? 'Inscription…' : 'Créer le dossier apprenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
