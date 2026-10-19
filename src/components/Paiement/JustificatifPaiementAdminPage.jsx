import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useBranding } from '../../contexts/BrandingContext';
import ModalRecuOfficiel from './ModalRecuOfficiel';
import { formatCurrency } from '../../utils/currency';

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
    if (!map[key].nom && d.nom) map[key].nom = d.nom;
  });
  return Object.values(map).map(e => {
    const tarif = TARIFS[e.niveau] || 0;
    // Cash réel encaissé (dépôts validés, hors bourse)
    const totalValide = e.depots
      .filter(d => d.statut === 'valide' && d.type !== 'bourse')
      .reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
    // Montant exonéré (bourses/exonérations — distinct du cash)
    const montantBourse = e.depots
      .filter(d => d.type === 'bourse')
      .reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
    const totalTous = e.depots.filter(d => d.type !== 'bourse').reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
    // Restant = tarif − cash encaissé − montant exonéré
    const restant = Math.max(0, tarif - totalValide - montantBourse);
    const hasBourse = montantBourse > 0;
    return { ...e, tarif, totalValide, totalTous, restant, hasBourse, montantBourse };
  });
}

function BourseModal({ onClose, onSaved }) {
  const toast = useToast();
  const { branding } = useBranding();
  const fmtMAD = (n) => formatCurrency(n, branding.devise);
  const [form, setForm] = useState({
    nom: '', prenom: '', cin: '', telephone: '',
    niveau: 'licence_cnam', typeBourse: 'totale',
    montantBourse: TARIFS.licence_cnam, organismeBoursier: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => {
    const next = { ...prev, [k]: v };
    if (k === 'niveau' && next.typeBourse === 'totale') next.montantBourse = TARIFS[v] || 0;
    if (k === 'typeBourse' && v === 'totale') next.montantBourse = TARIFS[next.niveau] || 0;
    return next;
  });

  const handleSave = async () => {
    if (!form.nom.trim() || !form.cin.trim() || !form.niveau) {
      toast.error('Nom, CIN et niveau sont obligatoires'); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, 'justificatifs_paiement'), {
        type: 'bourse',
        nom: form.nom.toUpperCase().trim(),
        prenom: form.prenom.trim(),
        cin: form.cin.toUpperCase().trim(),
        telephone: form.telephone.trim(),
        niveau: form.niveau,
        niveauLabel: NIVEAUX_LABELS[form.niveau],
        montantPaye: Number(form.montantBourse) || 0,
        typeBourse: form.typeBourse,
        organismeBoursier: form.organismeBoursier.trim(),
        statut: 'valide',
        createdAt: new Date(),
      });
      toast.success('Bourse enregistrée');
      onSaved(); onClose();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Nouvelle exonération / bourse</h2>
            <p className="text-xs text-slate-500 mt-0.5">Validé automatiquement · aucun justificatif requis</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nom *</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value.toUpperCase())}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 uppercase"
                placeholder="NOM" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Prénom</label>
              <input value={form.prenom} onChange={e => set('prenom', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                placeholder="Prénom" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">CIN *</label>
              <input value={form.cin} onChange={e => set('cin', e.target.value.toUpperCase())}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 uppercase font-mono"
                placeholder="AB123456" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Téléphone</label>
              <input value={form.telephone} onChange={e => set('telephone', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                placeholder="06XXXXXXXX" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Niveau *</label>
            <select value={form.niveau} onChange={e => set('niveau', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 bg-white">
              <option value="licence_cnam">Licence CNAM — 30 000 MAD</option>
              <option value="licence_transitaire">Licence Transitaire — 34 000 MAD</option>
              <option value="mastere_mlai">Mastère MLAI — 43 500 MAD</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Type d'exonération</label>
            <div className="flex gap-2">
              {[
                { v: 'totale',    label: 'Totale', desc: fmtMAD(TARIFS[form.niveau]) + ' exonérés' },
                { v: 'partielle', label: 'Partielle', desc: 'Montant personnalisé' },
              ].map(opt => (
                <button key={opt.v} type="button" onClick={() => set('typeBourse', opt.v)}
                  className={`flex-1 text-left px-3 py-2.5 rounded-xl border-2 transition-all ${
                    form.typeBourse === opt.v
                      ? 'border-violet-500 bg-violet-50 text-violet-800'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}>
                  <p className="text-xs font-bold">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Montant exonéré (MAD)</label>
              <input type="number" min="0" value={form.montantBourse}
                onChange={e => set('montantBourse', e.target.value)}
                disabled={form.typeBourse === 'totale'}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 tabular-nums disabled:bg-slate-50 disabled:text-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Organisme / Motif</label>
              <input value={form.organismeBoursier} onChange={e => set('organismeBoursier', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
                placeholder="Ex: Bourse ONOUSC" />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 bg-violet-600 hover:bg-violet-700">
            {saving ? 'Enregistrement…' : 'Enregistrer la bourse'}
          </button>
        </div>
      </div>
    </div>
  );
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

function generateRecu(etudiant, devise = 'MAD') {
  const fmtMAD = (n) => formatCurrency(n, devise);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const today = new Date();
  const dateEdition = today.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const dateSlug = today.toISOString().slice(0, 10).replace(/-/g, '');
  const refRecu = `REC-${etudiant.cin}-${dateSlug}`;
  const PW = 210;
  const M = 20;
  const CW = PW - M * 2;

  // ── En-tête ──────────────────────────────────────────────────────────
  doc.setFillColor(0, 89, 137);
  doc.rect(0, 0, PW, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(import.meta.env.VITE_DEFAULT_INSTITUTE_NAME || 'Institut de Formation', M, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('REÇU DE PAIEMENT', M, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(refRecu, PW - M, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(`Date d'édition : ${dateEdition}`, PW - M, 22, { align: 'right' });

  // ── Bloc apprenant ────────────────────────────────────────────────────
  let y = 44;
  doc.setFillColor(240, 246, 252);
  doc.roundedRect(M, y, CW, 28, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 89, 137);
  doc.text('INFORMATIONS APPRENANT', M + 5, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Nom & Prénom : ${etudiant.nom} ${etudiant.prenom}`, M + 5, y + 14);
  doc.text(`CIN : ${etudiant.cin}`, M + 5, y + 20);
  doc.text(`Niveau : ${etudiant.niveauLabel}`, M + 70, y + 14);
  if (etudiant.telephone) doc.text(`Tél. : ${etudiant.telephone}`, M + 70, y + 20);

  // ── Tableau dépôts validés ────────────────────────────────────────────
  y += 36;
  const depotsValides = (etudiant.depots || [])
    .filter(d => d.statut === 'valide' && d.type !== 'bourse')
    .sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt ?? 0);
      const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt ?? 0);
      return ta - tb;
    });
  const depotsEnAttente = (etudiant.depots || []).filter(d => d.statut === 'en_attente' && d.type !== 'bourse');

  const tableRows = depotsValides.map((d, i) => {
    const refDep = `DEP-${(d.id || '').substring(0, 8).toUpperCase()}`;
    const dt = d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt ?? 0);
    return [
      String(i + 1).padStart(2, '0'),
      dt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      refDep,
      fmtMAD(Number(d.montantPaye) || 0),
    ];
  });
  if (etudiant.hasBourse) {
    const bd = (etudiant.depots || []).find(d => d.type === 'bourse');
    const lbl = bd?.typeBourse === 'totale' ? 'Exonération totale' : 'Bourse partielle';
    const org = bd?.organismeBoursier ? ` — ${bd.organismeBoursier}` : '';
    const dtB = bd?.createdAt?.toDate ? bd.createdAt.toDate() : new Date(bd?.createdAt ?? 0);
    tableRows.push([
      '—',
      bd ? dtB.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
      lbl + org,
      fmtMAD(etudiant.montantBourse),
    ]);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 89, 137);
  doc.text('DÉTAIL DES PAIEMENTS VALIDÉS', M, y + 5);
  y += 9;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Date', 'Référence dépôt', 'Montant']],
    body: tableRows.length > 0 ? tableRows : [['—', '—', 'Aucun paiement validé', '0 MAD']],
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [51, 65, 85] },
    headStyles: { fillColor: [0, 89, 137], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 34 },
      2: { cellWidth: 90 },
      3: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Récapitulatif ─────────────────────────────────────────────────────
  const summaryH = etudiant.hasBourse ? 40 : 32;
  doc.setFillColor(240, 246, 252);
  doc.roundedRect(M, y, CW, summaryH, 3, 3, 'F');
  const col2 = PW - M - 6;
  let yy = y + 8;
  const summaryLines = [
    ['Tarif de la formation', fmtMAD(etudiant.tarif)],
    ['Cash encaissé (paiements validés)', fmtMAD(etudiant.totalValide)],
  ];
  if (etudiant.hasBourse) summaryLines.push(['Exonération / bourse', fmtMAD(etudiant.montantBourse)]);
  doc.setFontSize(8.5);
  summaryLines.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(label, M + 5, yy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(val, col2, yy, { align: 'right' });
    yy += 7;
  });
  const rc = etudiant.restant === 0 ? [5, 150, 105] : [220, 38, 38];
  doc.setDrawColor(...rc);
  doc.line(M + 5, yy - 1, col2, yy - 1);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...rc);
  const restantLabel = etudiant.restant === 0 ? 'Soldé — Aucun montant dû ✓' : 'Montant restant à régler';
  doc.text(restantLabel, M + 5, yy + 6);
  if (etudiant.restant > 0) doc.text(fmtMAD(etudiant.restant), col2, yy + 6, { align: 'right' });

  y = yy + 18;

  // Note dépôts en attente
  if (depotsEnAttente.length > 0) {
    const totalAtt = depotsEnAttente.reduce((s, d) => s + (Number(d.montantPaye) || 0), 0);
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Note : ${depotsEnAttente.length} dépôt(s) en cours de vérification (${fmtMAD(totalAtt)}) ne sont pas comptabilisés dans ce reçu.`,
      M, y, { maxWidth: CW }
    );
    y += 10;
  }

  // ── Pied de page ─────────────────────────────────────────────────────
  y = Math.max(y + 4, 268);
  doc.setDrawColor(210, 225, 240);
  doc.line(M, y, PW - M, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Document généré le ${dateEdition}  ·  Réf. ${refRecu}`, M, y + 5);
  doc.text('Ce document est généré automatiquement par EduCloud ERP Pédagogique.', M, y + 10);

  doc.save(`Recu_${etudiant.cin}_${today.toISOString().slice(0, 10)}.pdf`);
}

export default function JustificatifPaiementAdminPage() {
  const toast = useToast();
  const { branding } = useBranding();
  const fmtMAD = (n) => formatCurrency(n, branding.devise);
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [view, setView]         = useState('etudiants'); // 'etudiants' | 'depots'
  const [niveauFilter, setNiveauFilter] = useState('tous');
  const [statutFilter, setStatutFilter] = useState('tous'); // pour vue dépôts
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState({}); // CIN → bool
  const [showBourseModal, setShowBourseModal] = useState(false);
  const [selectedForRecuIFTL, setSelectedForRecuIFTL] = useState(null);
  const [editingAmount, setEditingAmount] = useState(null); // { id, value }

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

  const saveMontant = async (id) => {
    const val = Number(editingAmount.value);
    if (isNaN(val) || val < 0) { toast.error('Montant invalide'); return; }
    try {
      await updateDoc(doc(db, 'justificatifs_paiement', id), { montantPaye: val, updatedAt: new Date() });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, montantPaye: val } : d));
      setEditingAmount(null);
      toast.success('Montant mis à jour');
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
  const totalEncaisse  = filteredStudents.reduce((s, e) => s + e.totalValide, 0);
  const totalExonere   = filteredStudents.reduce((s, e) => s + e.montantBourse, 0);
  const totalRestant   = filteredStudents.reduce((s, e) => s + e.restant, 0);
  const nPayes         = filteredStudents.filter(e => e.restant === 0 && e.tarif > 0).length;
  const nPartiel       = filteredStudents.filter(e => e.restant > 0 && (e.totalValide > 0 || e.montantBourse > 0)).length;
  const nRien          = filteredStudents.filter(e => e.totalValide === 0 && e.montantBourse === 0).length;
  const nBoursiers     = filteredStudents.filter(e => e.hasBourse).length;

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
          <button onClick={() => setShowBourseModal(true)}
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors bg-violet-600 hover:bg-violet-700">
            + Bourse / Exonération
          </button>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Cash encaissé',       value: fmtMAD(totalEncaisse), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Total exonéré',        value: fmtMAD(totalExonere),  color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
            { label: 'Restant à régler',     value: fmtMAD(totalRestant),  color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
            { label: 'Soldés / Exonérés',    value: nPayes,                color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Paiement partiel',     value: nPartiel,              color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
            { label: 'Aucun règlement',      value: nRien,                 color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
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
                  const pct          = e.tarif > 0 ? Math.min(100, Math.round(e.totalValide / e.tarif * 100)) : 0;
                  const solde        = e.restant === 0 && e.tarif > 0;
                  const partiel      = !solde && e.totalValide > 0;
                  const exoTotal     = solde && e.hasBourse && e.montantBourse >= e.tarif;
                  const exoPartiel   = e.hasBourse && !exoTotal;
                  const rowBg        = solde ? 'bg-emerald-50/40' : partiel ? 'bg-amber-50/30' : '';
                  const open         = expanded[e.cin];
                  return [
                    <tr key={e.cin} onClick={() => toggle(e.cin)}
                      className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50/80 transition-colors ${rowBg}`}>
                      <td className="px-4 py-3 text-slate-400">
                        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-800">{e.nom} {e.prenom}</p>
                          {exoTotal  && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 tracking-wide">EXONÉRÉ TOTAL</span>}
                          {exoPartiel && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 tracking-wide">BOURSE PARTIELLE</span>}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">{e.cin} {e.telephone ? `· ${e.telephone}` : ''}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{e.niveauLabel}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <p className="font-semibold text-emerald-700">{fmtMAD(e.totalValide)}</p>
                        {e.hasBourse && (
                          <p className="text-[10px] text-violet-600 font-semibold mt-0.5">+ {fmtMAD(e.montantBourse)} exo</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{fmtMAD(e.tarif)}</td>
                      <td className={`px-4 py-3 text-right font-bold tabular-nums ${solde ? 'text-emerald-600' : partiel ? 'text-amber-600' : 'text-red-600'}`}>
                        {exoTotal ? '✓ Exonéré' : solde ? '✓ Soldé' : fmtMAD(e.restant)}
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
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                {e.depots.length} dépôt(s)
                              </p>
                              <button
                                onClick={ev => { ev.stopPropagation(); generateRecu(e, branding.devise); }}
                                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#005989] border border-[#005989]/30 rounded-lg hover:bg-[#005989]/8 transition-colors">
                                📄 Reçu PDF
                              </button>
                              {(e.niveau === 'licence_cnam' || e.niveau === 'mastere_mlai') && (
                                <button
                                  onClick={ev => { ev.stopPropagation(); setSelectedForRecuIFTL(e); }}
                                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors">
                                  🏛 Reçu IFTL
                                </button>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              {e.depots.map(d => (
                                <div key={d.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${d.type === 'bourse' ? 'bg-violet-50 border-violet-100' : 'bg-white border-slate-100'}`}>
                                  {d.type === 'bourse' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">
                                      {d.typeBourse === 'totale' ? 'Exonération totale' : 'Bourse partielle'}
                                    </span>
                                  ) : (
                                    <Badge statut={d.statut} />
                                  )}
                                  <span className="text-xs text-slate-500">{formatDate(d.createdAt)}</span>
                                  {d.type === 'bourse' && d.organismeBoursier && (
                                    <span className="text-xs text-violet-600 font-medium">{d.organismeBoursier}</span>
                                  )}
                                  {editingAmount?.id === d.id ? (
                                    <div className="flex items-center gap-1.5 ml-auto" onClick={ev => ev.stopPropagation()}>
                                      <input
                                        type="number" min="0" autoFocus
                                        value={editingAmount.value}
                                        onChange={e => setEditingAmount(prev => ({ ...prev, value: e.target.value }))}
                                        onKeyDown={e => { if (e.key === 'Enter') saveMontant(d.id); if (e.key === 'Escape') setEditingAmount(null); }}
                                        className="w-28 text-sm border border-[#005989] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 tabular-nums text-right"
                                      />
                                      <button onClick={() => saveMontant(d.id)}
                                        className="px-2 py-1 text-xs font-semibold text-white bg-[#005989] rounded-lg hover:bg-[#005989]/90">
                                        ✓
                                      </button>
                                      <button onClick={() => setEditingAmount(null)}
                                        className="px-2 py-1 text-xs text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200">
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 ml-auto" onClick={ev => ev.stopPropagation()}>
                                      <span className={`font-semibold tabular-nums ${d.type === 'bourse' ? 'text-violet-700' : 'text-slate-800'}`}>
                                        {fmtMAD(d.montantPaye)}
                                      </span>
                                      {d.type !== 'bourse' && (
                                        <button
                                          onClick={() => setEditingAmount({ id: d.id, value: d.montantPaye ?? '' })}
                                          className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors">
                                          Modifier
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {d.justificatifData && (
                                    <button onClick={ev => { ev.stopPropagation(); const w = window.open('', '_blank'); d.justificatifType?.startsWith('image/') ? w.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${d.justificatifData}" style="max-width:100%;max-height:100vh" /></body></html>`) : w.document.write(`<html><body style="margin:0"><embed src="${d.justificatifData}" width="100%" height="100%" /></body></html>`); }}
                                      className="text-xs text-[#005989] hover:underline font-semibold">
                                      Voir
                                    </button>
                                  )}
                                  <div className="flex gap-1 ml-2" onClick={ev => ev.stopPropagation()}>
                                    {d.type !== 'bourse' && d.statut === 'en_attente' && <>
                                      <button onClick={() => updateStatut(d.id, 'valide')}
                                        className="px-2 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100">
                                        Valider
                                      </button>
                                      <button onClick={() => updateStatut(d.id, 'refuse')}
                                        className="px-2 py-0.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100">
                                        Refuser
                                      </button>
                                    </>}
                                    {d.type !== 'bourse' && d.statut !== 'en_attente' && (
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
                    <td className="px-4 py-3 text-right">
                      {editingAmount?.id === d.id ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <input
                            type="number" min="0" autoFocus
                            value={editingAmount.value}
                            onChange={e => setEditingAmount(prev => ({ ...prev, value: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') saveMontant(d.id); if (e.key === 'Escape') setEditingAmount(null); }}
                            className="w-28 text-sm border border-[#005989] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 tabular-nums text-right"
                          />
                          <button onClick={() => saveMontant(d.id)}
                            className="px-2 py-1 text-xs font-semibold text-white bg-[#005989] rounded-lg hover:bg-[#005989]/90">✓</button>
                          <button onClick={() => setEditingAmount(null)}
                            className="px-2 py-1 text-xs text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <span className="font-semibold text-slate-800 tabular-nums">{d.montantPaye ? fmtMAD(d.montantPaye) : '—'}</span>
                          {d.type !== 'bourse' && (
                            <button
                              onClick={() => setEditingAmount({ id: d.id, value: d.montantPaye ?? '' })}
                              className="px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors">
                              Modifier
                            </button>
                          )}
                        </div>
                      )}
                    </td>
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

      {showBourseModal && (
        <BourseModal
          onClose={() => setShowBourseModal(false)}
          onSaved={fetchData}
        />
      )}
      {selectedForRecuIFTL && (
        <ModalRecuOfficiel
          prefix={selectedForRecuIFTL.niveau === 'licence_cnam' ? 'LC' : 'MLAI'}
          cycle={selectedForRecuIFTL.niveau === 'licence_cnam' ? 'Licence CNAM' : 'Mastère MLAI'}
          nom={selectedForRecuIFTL.nom || ''}
          prenom={selectedForRecuIFTL.prenom || ''}
          cin={selectedForRecuIFTL.cin || ''}
          codeApprenant=""
          promotion="2026-2027"
          montantInit={selectedForRecuIFTL.totalValide || ''}
          branding={branding}
          onClose={() => setSelectedForRecuIFTL(null)}
        />
      )}
    </div>
  );
}
