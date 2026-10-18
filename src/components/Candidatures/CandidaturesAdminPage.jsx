import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCandidatures, useGroupes } from '../../hooks/useData';
import { candidaturesService, historiqueService } from '../../services/firestore';
import { useToast } from '../UI/Toast';
import { sendCandidatureStatut } from '../../services/emailService';
import { useTranslation } from 'react-i18next';

const BRAND = '#005989';

const STATUTS = {
  soumise:        { label: 'Soumise',            cls: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500',     pipe: 1 },
  en_verification:{ label: 'En vérification',    cls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500',    pipe: 2 },
  incomplet:      { label: 'Incomplet',          cls: 'bg-orange-100 text-orange-700',  dot: 'bg-orange-500',   pipe: 2 },
  complet:        { label: 'Complet',            cls: 'bg-teal-100 text-teal-700',      dot: 'bg-teal-500',     pipe: 3 },
  non_eligible:   { label: 'Non éligible',       cls: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',    pipe: 3 },
  valide:         { label: 'Validé',             cls: 'bg-emerald-100 text-emerald-700',dot: 'bg-emerald-500',  pipe: 4 },
  convoque:       { label: 'Convoqué(e)',        cls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500',   pipe: 5 },
  admis:          { label: 'Admis(e)',           cls: 'bg-green-100 text-green-700',    dot: 'bg-green-500',    pipe: 6 },
  liste_attente:  { label: "Liste d'attente",    cls: 'bg-purple-100 text-purple-700',  dot: 'bg-purple-500',   pipe: 6 },
  refuse:         { label: 'Refusé(e)',          cls: 'bg-red-100 text-red-600',        dot: 'bg-red-500',      pipe: 6 },
  retire:         { label: 'Retiré(e)',          cls: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',    pipe: 6 },
  brouillon:      { label: 'Brouillon',          cls: 'bg-slate-50 text-slate-400',     dot: 'bg-slate-300',    pipe: 0 },
  // Legacy aliases (backwards compat)
  recu:           { label: 'Soumise',            cls: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500',     pipe: 1 },
  en_cours:       { label: 'En vérification',    cls: 'bg-amber-100 text-amber-700',    dot: 'bg-amber-500',    pipe: 2 },
  accepte:        { label: 'Admis(e)',           cls: 'bg-green-100 text-green-700',    dot: 'bg-green-500',    pipe: 6 },
  doublon:        { label: 'Doublon',            cls: 'bg-slate-100 text-slate-500',    dot: 'bg-slate-400',    pipe: 6 },
};

const DOCS_LABELS = {
  cin_recto:   'CIN Recto',
  cin_verso:   'CIN Verso',
  bac:         'Relevé de notes / Bac',
  photo:       "Photo d'identité",
  cv:          'CV',
  attestation: 'Attestation de travail',
};

const DOCS_CHECKLIST_KEYS = ['cin_recto', 'cin_verso', 'bac', 'photo', 'cv', 'attestation'];

const HISTORY_ACTION_LABELS = {
  status_change:      'Changement de statut',
  complement_request: 'Demande de compléments',
  doc_validated:      'Document validé',
  message_sent:       'Message envoyé',
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

function fmtDateTime(val) {
  if (!val) return '—';
  const d = val?.toDate ? val.toDate() : new Date(val);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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

function StatusBadge({ statut }) {
  const st = STATUTS[statut] || STATUTS.recu;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${st.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
      {st.label}
    </span>
  );
}

function getNextActions(statut) {
  switch (statut) {
    case 'soumise':
    case 'recu':
      return ['en_verification'];
    case 'en_verification':
    case 'en_cours':
      return ['complet', 'complement_request', 'non_eligible'];
    case 'incomplet':
      return ['en_verification', 'complet', 'refuse'];
    case 'complet':
      return ['valide', 'non_eligible', 'refuse'];
    case 'valide':
      return ['convoque', 'admis', 'liste_attente', 'refuse'];
    case 'convoque':
      return ['admis', 'liste_attente', 'refuse'];
    case 'admis':
    case 'accepte':
      return ['convert'];
    default:
      return [];
  }
}

export default function CandidaturesAdminPage() {
  const toast = useToast();
  const { t } = useTranslation();
  const { data: candidatures, loading, refetch } = useCandidatures();
  const { unique: uniqueGroupes } = useGroupes();

  const [search, setSearch]             = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterFiliere, setFilterFiliere] = useState('');
  const [filterVille, setFilterVille]   = useState('');
  const [filterAnnee, setFilterAnnee]   = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]   = useState('');
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [selected, setSelected]         = useState(null);
  const [adminMsg, setAdminMsg]         = useState('');
  const [savingMsg, setSavingMsg]       = useState(false);
  const [activeTab, setActiveTab]       = useState('info');
  const [history, setHistory]           = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [converting, setConverting]     = useState(null);
  const [convertForm, setConvertForm]   = useState({ groupeId: '' });
  const [convertSaving, setConvertSaving] = useState(false);
  const [motifRefus, setMotifRefus]     = useState('');
  const [showRefusModal, setShowRefusModal] = useState(null);
  const [showComplementModal, setShowComplementModal] = useState(null);
  const [complementForm, setComplementForm] = useState({ docs: [], deadline: '', note: '' });
  const [complementSaving, setComplementSaving] = useState(false);
  const [bulkAction, setBulkAction]     = useState('');

  const filieres = [...new Set(candidatures.map(c => c.filiere || c.niveauFormation).filter(Boolean))].sort();
  const villes   = [...new Set(candidatures.map(c => c.ville).filter(Boolean))].sort();
  const annees   = [...new Set(candidatures.map(c => c.anneeEntree).filter(Boolean))].sort();

  const filtered = candidatures.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q
      || `${c.nom} ${c.prenom}`.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.cin?.toLowerCase().includes(q)
      || c.telephone?.includes(q)
      || c.ref?.toLowerCase().includes(q);
    const matchS   = !filterStatut  || c.statut === filterStatut;
    const matchF   = !filterFiliere || (c.filiere || c.niveauFormation) === filterFiliere;
    const matchV   = !filterVille   || c.ville === filterVille;
    const matchA   = !filterAnnee   || c.anneeEntree === filterAnnee;
    const cDate    = fmtDateISO(c.createdAt);
    const matchDfr = !filterDateFrom || cDate >= filterDateFrom;
    const matchDto = !filterDateTo   || cDate <= filterDateTo;
    return matchQ && matchS && matchF && matchV && matchA && matchDfr && matchDto;
  });

  const kpis = {
    total:    candidatures.length,
    aTraiter: candidatures.filter(c => ['soumise','recu','en_verification','en_cours','incomplet','complet','valide','convoque'].includes(c.statut)).length,
    valide:   candidatures.filter(c => ['valide','convoque'].includes(c.statut)).length,
    admis:    candidatures.filter(c => ['admis','accepte'].includes(c.statut)).length,
    refuse:   candidatures.filter(c => c.statut === 'refuse').length,
  };

  const allChecked  = filtered.length > 0 && filtered.every(c => selectedIds.has(c.id));
  const someChecked = filtered.some(c => selectedIds.has(c.id));
  const toggleAll   = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.id)));
  };
  const toggleOne = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const loadHistory = useCallback(async (cId) => {
    if (!cId) return;
    setHistoryLoading(true);
    try {
      const items = await historiqueService.getAll(cId);
      setHistory(items);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && selected) loadHistory(selected.id);
  }, [activeTab, selected, loadHistory]);

  const updateStatut = async (c, statut, extra = {}) => {
    try {
      const ancienStatut = c.statut;
      await updateDoc(doc(db, 'candidatures', c.id), { statut, dateTraitement: new Date(), ...extra });
      await historiqueService.add(c.id, {
        action: 'status_change',
        ancienStatut,
        nouveauStatut: statut,
        note: extra.note || null,
      });
      if (selected?.id === c.id) setSelected(s => ({ ...s, statut, ...extra }));
      refetch();
      toast.success(`${c.prenom} ${c.nom} → ${STATUTS[statut]?.label || statut}`);
      if (c.email) {
        sendCandidatureStatut(db, {
          email: c.email, prenom: c.prenom, nom: c.nom, ref: c.ref,
          filiere: c.filiere || c.niveauFormation, statut,
        }).catch(() => {});
      }
    } catch (err) { toast.error(err.message); }
  };

  const handleRefuser = async () => {
    if (!showRefusModal) return;
    const c = showRefusModal;
    const motif = motifRefus.trim() || null;
    try {
      await updateDoc(doc(db, 'candidatures', c.id), { statut: 'refuse', motifRefus: motif, dateTraitement: new Date() });
      await historiqueService.add(c.id, { action: 'status_change', ancienStatut: c.statut, nouveauStatut: 'refuse', note: motif });
      if (selected?.id === c.id) setSelected(s => ({ ...s, statut: 'refuse' }));
      refetch();
      toast.success('Candidature refusée.');
      if (c.email) {
        sendCandidatureStatut(db, {
          email: c.email, prenom: c.prenom, nom: c.nom, ref: c.ref,
          filiere: c.filiere || c.niveauFormation, statut: 'refuse', motif,
        }).catch(() => {});
      }
    } catch (err) { toast.error(err.message); }
    setShowRefusModal(null);
    setMotifRefus('');
  };

  const viewFile = async (docKey) => {
    if (selected?.fichierUrls?.[docKey]) {
      window.open(selected.fichierUrls[docKey], '_blank');
      return;
    }
    try {
      const snap = await getDoc(doc(db, 'candidatures', selected.id, 'fichiers', docKey));
      if (snap.exists()) {
        window.open(snap.data().data, '_blank');
      } else {
        toast.error('Document non disponible.');
      }
    } catch { toast.error('Impossible d\'ouvrir le document.'); }
  };

  const handleComplement = async () => {
    if (!showComplementModal) return;
    const c = showComplementModal;
    setComplementSaving(true);
    try {
      await candidaturesService.requestComplement(c.id, {
        docsManquants: complementForm.docs,
        deadline: complementForm.deadline || null,
        note: complementForm.note.trim() || null,
        ancienStatut: c.statut,
      });
      if (selected?.id === c.id) setSelected(s => ({
        ...s,
        statut: 'incomplet',
        complementDeadline: complementForm.deadline || null,
        complementNote: complementForm.note.trim() || null,
        complementDocs: complementForm.docs,
      }));
      refetch();
      toast.success('Demande de compléments envoyée.');
      if (c.email) {
        sendCandidatureStatut(db, {
          email: c.email, prenom: c.prenom, nom: c.nom, ref: c.ref,
          filiere: c.filiere || c.niveauFormation, statut: 'incomplet',
        }).catch(() => {});
      }
    } catch (err) { toast.error(err.message); }
    finally { setComplementSaving(false); }
    setShowComplementModal(null);
    setComplementForm({ docs: [], deadline: '', note: '' });
  };

  const handleDocValidation = async (docKey, newState) => {
    if (!selected) return;
    const updated = { ...(selected.docsValidation || {}), [docKey]: newState };
    try {
      await candidaturesService.updateDocs(selected.id, updated);
      await historiqueService.add(selected.id, {
        action: 'doc_validated', docKey, newState,
        ancienStatut: selected.statut, nouveauStatut: selected.statut,
      });
      setSelected(s => ({ ...s, docsValidation: updated }));
      toast.success(`${DOCS_LABELS[docKey]} : ${newState === 'valide' ? 'validé' : newState === 'refuse' ? 'refusé' : 'en attente'}`);
    } catch (err) { toast.error(err.message); }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        await updateDoc(doc(db, 'candidatures', id), { statut: bulkAction, dateTraitement: new Date() });
        const c = candidatures.find(x => x.id === id);
        if (c?.email) {
          sendCandidatureStatut(db, {
            email: c.email, prenom: c.prenom, nom: c.nom, ref: c.ref,
            filiere: c.filiere || c.niveauFormation, statut: bulkAction,
          }).catch(() => {});
        }
      }
      toast.success(`${selectedIds.size} dossier(s) → ${STATUTS[bulkAction]?.label}`);
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
      await historiqueService.add(selected.id, {
        action: 'message_sent', ancienStatut: selected.statut, nouveauStatut: selected.statut, note: adminMsg.trim(),
      });
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
    if (selected?.id === c.id) { setSelected(null); return; }
    setSelected(c);
    setAdminMsg(c.adminMessage || '');
    setActiveTab('info');
    setHistory([]);
  };

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
    a.href = url; a.download = `candidatures_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  function WorkflowButtons({ c, compact = false }) {
    const actions = getNextActions(c.statut);
    const btnCls = compact
      ? 'text-xs px-2 py-1 rounded-lg font-medium transition'
      : 'text-xs px-2.5 py-1.5 rounded-xl font-medium transition';
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {actions.includes('en_verification') && (
          <button onClick={() => updateStatut(c, 'en_verification')}
            className={`${btnCls} bg-amber-500 hover:bg-amber-600 text-white`}>
            Vérifier
          </button>
        )}
        {actions.includes('complet') && (
          <button onClick={() => updateStatut(c, 'complet')}
            className={`${btnCls} bg-teal-600 hover:bg-teal-700 text-white`}>
            ✓ Complet
          </button>
        )}
        {actions.includes('complement_request') && (
          <button onClick={() => { setShowComplementModal(c); setComplementForm({ docs: [], deadline: '', note: '' }); }}
            className={`${btnCls} bg-orange-500 hover:bg-orange-600 text-white`}>
            Compléments
          </button>
        )}
        {actions.includes('valide') && (
          <button onClick={() => updateStatut(c, 'valide')}
            className={`${btnCls} bg-emerald-600 hover:bg-emerald-700 text-white`}>
            ✓ Valider
          </button>
        )}
        {actions.includes('convoque') && (
          <button onClick={() => updateStatut(c, 'convoque')}
            className={`${btnCls} bg-purple-600 hover:bg-purple-700 text-white`}>
            Convoquer
          </button>
        )}
        {actions.includes('admis') && (
          <button onClick={() => updateStatut(c, 'admis')}
            className={`${btnCls} bg-green-600 hover:bg-green-700 text-white`}>
            ✓ Admettre
          </button>
        )}
        {actions.includes('non_eligible') && (
          <button onClick={() => updateStatut(c, 'non_eligible')}
            className={`${btnCls} bg-slate-500 hover:bg-slate-600 text-white`}>
            Non éligible
          </button>
        )}
        {actions.includes('liste_attente') && (
          <button onClick={() => updateStatut(c, 'liste_attente')}
            className={`${btnCls} bg-purple-600 hover:bg-purple-700 text-white`}>
            Liste attente
          </button>
        )}
        {!['admis','accepte','refuse','retire','non_eligible'].includes(c.statut) && (
          <button onClick={() => setShowRefusModal(c)}
            className={`${btnCls} bg-red-600 hover:bg-red-700 text-white`}>
            ✗ Refuser
          </button>
        )}
        {actions.includes('convert') && (
          <button onClick={() => { setConverting(c); setConvertForm({ groupeId: '' }); }}
            className={`${btnCls} bg-[#005989] hover:bg-[#004a73] text-white`}>
            → Inscrire
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-800">{t('candidaturesAdmin.title')}</h1>
          <p className="text-slate-400 text-sm">Traitement des dossiers de préinscription</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition font-medium">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exporter CSV
          </button>
          <div className="text-xs text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
            {candidatures.length} dossiers
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total',     value: kpis.total,    color: BRAND,     icon: '📋' },
          { label: 'À traiter', value: kpis.aTraiter, color: '#d97706', icon: '📥' },
          { label: 'Validés',   value: kpis.valide,   color: '#0d9488', icon: '✔' },
          { label: 'Admis',     value: kpis.admis,    color: '#16a34a', icon: '🎓' },
          { label: 'Refusés',   value: kpis.refuse,   color: '#dc2626', icon: '✗' },
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
            <option value="">{t('candidaturesAdmin.all_statuses')}</option>
            {Object.entries(STATUTS).filter(([k]) => !['recu','en_cours','accepte','doublon'].includes(k)).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select value={filterAnnee} onChange={e => setFilterAnnee(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
            <option value="">Toutes années</option>
            {annees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
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
            <option value="en_verification">En vérification</option>
            <option value="admis">Admettre</option>
            <option value="refuse">Refuser</option>
            <option value="liste_attente">Liste d'attente</option>
            <option value="retire">Retirer</option>
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
              <p className="text-slate-500 font-medium mt-3">{t('candidaturesAdmin.no_candidatures')}</p>
              <p className="text-slate-400 text-xs mt-1">Les dossiers soumis via le formulaire public apparaîtront ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left w-8">
                      <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = !allChecked && someChecked; }}
                        onChange={toggleAll} className="w-3.5 h-3.5 rounded accent-[#005989] cursor-pointer" />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">{t('candidaturesAdmin.col_name')}</th>
                    <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">{t('candidaturesAdmin.col_filiere')}</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">{t('candidaturesAdmin.col_date')}</th>
                    <th className="px-4 py-3 text-left font-semibold">{t('candidaturesAdmin.col_status')}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(c => {
                    const isActive = selected?.id === c.id;
                    return (
                      <tr key={c.id} className={`transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
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
                          <span className="text-xs text-slate-600 leading-tight line-clamp-2">{c.filiere || c.niveauFormation || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell cursor-pointer" onClick={() => handleOpenDetail(c)}>
                          {fmtDate(c.createdAt)}
                        </td>
                        <td className="px-4 py-3 cursor-pointer" onClick={() => handleOpenDetail(c)}>
                          <StatusBadge statut={c.statut} />
                          {c.adminMessage && (
                            <svg className="w-3 h-3 text-amber-400 inline ml-1" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                          )}
                          {c.complementDocs?.length > 0 && c.statut === 'incomplet' && (
                            <span className="ml-1 text-[10px] bg-orange-100 text-orange-600 px-1 rounded">Compléments requis</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <WorkflowButtons c={c} compact />
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
                <StatusBadge statut={selected.statut} />
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-lg leading-none">×</button>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg mb-2">
                {selected.prenom?.[0]}{selected.nom?.[0]}
              </div>
              <h3 className="text-white font-bold text-base">{selected.prenom} {selected.nom}</h3>
              {selected.ref && <p className="text-white/60 text-xs font-mono mt-0.5">Réf: {selected.ref}</p>}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {[
                { key: 'info',    label: 'Dossier' },
                { key: 'docs',    label: 'Pièces' },
                { key: 'history', label: 'Historique' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 py-2 text-xs font-semibold transition ${activeTab === tab.key
                    ? 'text-[#005989] border-b-2 border-[#005989] -mb-px'
                    : 'text-slate-400 hover:text-slate-600'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto max-h-[65vh]">

              {/* Tab: Dossier */}
              {activeTab === 'info' && (
                <div className="p-4 space-y-3 text-xs">
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">Identité</p>
                  <Row label="Email"          val={selected.email} />
                  <Row label="Tél."           val={selected.telephone} />
                  <Row label="CIN"            val={selected.cin} />
                  <Row label="Date naissance" val={selected.dateNaissance} />
                  <Row label="Sexe"           val={selected.sexe} />
                  <Row label="Nationalité"    val={selected.nationalite} />
                  <Row label="Adresse"        val={selected.adresse} />
                  <Row label="Ville"          val={selected.ville} />
                  <Row label="Situation pro." val={selected.situationPro} />

                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Baccalauréat</p>
                    <Row label="Niveau scolaire" val={selected.niveauScolaire || selected.niveau} />
                    <Row label="Spécialité"      val={selected.specBac} />
                    <Row label="Mention"         val={selected.mentionBac} />
                    <Row label="Moyenne"         val={selected.moyenneBac ? `${selected.moyenneBac}/20` : null} />
                    <Row label="Année bac"       val={selected.anneeBac} />
                    <Row label="Établissement"   val={selected.etablissement} />
                    <Row label="Massar"          val={selected.massar} />
                  </div>

                  <div className="border-t border-slate-100 pt-2 mt-2">
                    <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Formation souhaitée</p>
                    <Row label="Programme"   val={selected.programType}   bold />
                    <Row label="Filière"     val={selected.filiere}       bold />
                    <Row label="Année"       val={selected.anneeEntree} />
                    {selected.dateCourte1 && <Row label="Date courte 1" val={selected.dateCourte1} />}
                    {selected.dateCourte2 && <Row label="Date courte 2" val={selected.dateCourte2} />}
                  </div>

                  {(selected.hebergement || selected.transport || selected.besoinsSpecifiques || selected.sourceInfo) && (
                    <div className="border-t border-slate-100 pt-2 mt-2">
                      <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Compléments</p>
                      <Row label="Hébergement"         val={selected.hebergement} />
                      <Row label="Transport"           val={selected.transport} />
                      <Row label="Besoins spécifiques" val={selected.besoinsSpecifiques} />
                      <Row label="Source d'info"       val={selected.sourceInfo} />
                    </div>
                  )}

                  {selected.motivations && (
                    <div className="border-t border-slate-100 pt-2 mt-2">
                      <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Motivations</p>
                      <p className="text-slate-600 leading-relaxed">{selected.motivations}</p>
                    </div>
                  )}

                  {selected.urgenceNom && (
                    <div className="border-t border-slate-100 pt-2 mt-2">
                      <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Contact d'urgence</p>
                      <Row label="Nom"  val={selected.urgenceNom} />
                      <Row label="Tél." val={selected.urgenceTel} />
                      <Row label="Lien" val={selected.urgenceLien} />
                    </div>
                  )}

                  {selected.motifRefus && (
                    <div className="border-t border-slate-100 pt-2 mt-2">
                      <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Motif de refus</p>
                      <p className="text-red-500 leading-relaxed">{selected.motifRefus}</p>
                    </div>
                  )}

                  {selected.statut === 'incomplet' && selected.complementDocs?.length > 0 && (
                    <div className="border-t border-orange-100 pt-2 mt-2 bg-orange-50 -mx-4 px-4 py-2">
                      <p className="text-orange-600 font-semibold uppercase tracking-wide text-[10px] mb-1">Compléments requis</p>
                      {selected.complementDeadline && (
                        <p className="text-orange-500 text-[10px] mb-1">Date limite : {fmtDate(selected.complementDeadline)}</p>
                      )}
                      <ul className="list-disc list-inside space-y-0.5">
                        {selected.complementDocs.map(d => (
                          <li key={d} className="text-orange-700 text-[10px]">{DOCS_LABELS[d] || d}</li>
                        ))}
                      </ul>
                      {selected.complementNote && (
                        <p className="text-slate-600 mt-1 italic">{selected.complementNote}</p>
                      )}
                    </div>
                  )}

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

                  <div className="border-t border-slate-100 pt-3 mt-2">
                    <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-2">Actions</p>
                    <WorkflowButtons c={selected} />
                  </div>

                  <p className="text-slate-300 text-[10px] text-center pt-1">Soumis le {fmtDate(selected.createdAt)}</p>
                </div>
              )}

              {/* Tab: Pièces */}
              {activeTab === 'docs' && (
                <div className="p-4 space-y-2 text-xs">
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-2">Vérification des pièces</p>
                  {DOCS_CHECKLIST_KEYS.map(key => {
                    const hasFile = selected.fichierKeys?.includes(key) || !!selected.fichierUrls?.[key];
                    const state   = selected.docsValidation?.[key] || (hasFile ? 'en_attente' : 'absent');
                    const stateStyles = {
                      valide:     'bg-green-50 border-green-200',
                      refuse:     'bg-red-50 border-red-200',
                      en_attente: 'bg-white border-slate-200',
                      absent:     'bg-slate-50 border-slate-100',
                    };
                    const stateLabel = {
                      valide:     '✓ Validé',
                      refuse:     '✗ Refusé',
                      en_attente: '… En attente',
                      absent:     '— Absent',
                    };
                    return (
                      <div key={key} className={`rounded-xl border p-2.5 ${stateStyles[state] || stateStyles.absent}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <p className="font-semibold text-slate-700">{DOCS_LABELS[key]}</p>
                            <p className={`text-[10px] mt-0.5 ${
                              state === 'valide' ? 'text-green-600'
                              : state === 'refuse' ? 'text-red-500'
                              : state === 'absent' ? 'text-slate-400'
                              : 'text-amber-600'
                            }`}>{stateLabel[state] || state}</p>
                          </div>
                          {hasFile && (
                            <button onClick={() => viewFile(key)}
                              className="text-[#005989] hover:underline text-[10px] shrink-0">Voir</button>
                          )}
                        </div>
                        {hasFile && state !== 'absent' && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleDocValidation(key, 'valide')} disabled={state === 'valide'}
                              className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition">
                              Valider
                            </button>
                            <button onClick={() => handleDocValidation(key, 'refuse')} disabled={state === 'refuse'}
                              className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition">
                              Rejeter
                            </button>
                            <button onClick={() => handleDocValidation(key, 'en_attente')} disabled={state === 'en_attente'}
                              className="flex-1 py-1 text-[10px] font-semibold rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 disabled:opacity-40 transition">
                              Remettre
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {selected.fichierUrls && Object.keys(selected.fichierUrls).filter(k => !DOCS_CHECKLIST_KEYS.includes(k)).length > 0 && (
                    <div className="mt-2">
                      <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-1">Autres documents</p>
                      {Object.entries(selected.fichierUrls).filter(([k]) => !DOCS_CHECKLIST_KEYS.includes(k)).map(([key, url]) => (
                        <a key={key} href={url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-100 hover:border-[#005989]/30 hover:bg-blue-50/30 transition group mb-1">
                          <svg className="w-3 h-3 text-[#005989] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span className="text-slate-600 group-hover:text-[#005989] transition flex-1">{DOCS_LABELS[key] || key}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Historique */}
              {activeTab === 'history' && (
                <div className="p-4 text-xs">
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-3">Historique du dossier</p>
                  {historyLoading ? (
                    <div className="py-6 text-center"><div className="w-5 h-5 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" /></div>
                  ) : history.length === 0 ? (
                    <p className="text-slate-400 text-center py-6">Aucun événement enregistré.</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map(h => (
                        <div key={h.id} className="border border-slate-100 rounded-xl p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-slate-700">{HISTORY_ACTION_LABELS[h.action] || h.action}</span>
                            <span className="text-slate-400 text-[10px]">{fmtDateTime(h.createdAt)}</span>
                          </div>
                          {h.ancienStatut && h.nouveauStatut && h.ancienStatut !== h.nouveauStatut && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <StatusBadge statut={h.ancienStatut} />
                              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                              <StatusBadge statut={h.nouveauStatut} />
                            </div>
                          )}
                          {h.action === 'complement_request' && h.docsManquants?.length > 0 && (
                            <p className="text-orange-600 mt-1">Pièces : {h.docsManquants.map(d => DOCS_LABELS[d] || d).join(', ')}</p>
                          )}
                          {h.action === 'doc_validated' && (
                            <p className={`mt-1 ${h.newState === 'valide' ? 'text-green-600' : 'text-red-500'}`}>
                              {DOCS_LABELS[h.docKey] || h.docKey} : {h.newState === 'valide' ? 'validé' : 'refusé'}
                            </p>
                          )}
                          {h.note && <p className="text-slate-500 mt-1 italic">"{h.note}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

      {/* Complement modal */}
      {showComplementModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-1">Demande de compléments</h3>
            <p className="text-sm text-slate-500 mb-4">{showComplementModal.prenom} {showComplementModal.nom}</p>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Documents manquants</label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {DOCS_CHECKLIST_KEYS.map(key => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={complementForm.docs.includes(key)}
                    onChange={e => setComplementForm(f => ({
                      ...f,
                      docs: e.target.checked ? [...f.docs, key] : f.docs.filter(d => d !== key),
                    }))}
                    className="w-3.5 h-3.5 rounded accent-[#005989]" />
                  <span className="text-xs text-slate-700">{DOCS_LABELS[key]}</span>
                </label>
              ))}
            </div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Date limite</label>
            <input type="date" value={complementForm.deadline} onChange={e => setComplementForm(f => ({ ...f, deadline: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] mb-3" />
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Message au candidat</label>
            <textarea value={complementForm.note} onChange={e => setComplementForm(f => ({ ...f, note: e.target.value }))} rows={2}
              placeholder="Merci de fournir les documents manquants avant la date indiquée…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setShowComplementModal(null)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">Annuler</button>
              <button onClick={handleComplement} disabled={complementSaving || complementForm.docs.length === 0}
                className="flex-1 bg-orange-500 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-orange-600 disabled:opacity-40 transition">
                {complementSaving ? 'Envoi…' : 'Envoyer la demande'}
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
              {uniqueGroupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
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
