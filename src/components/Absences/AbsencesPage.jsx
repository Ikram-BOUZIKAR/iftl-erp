import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useStudents, useSessions, useGroupes } from '../../hooks/useData';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import { getAlertLevel, computeAbsenceScore } from '../../services/absenceService';
import { sendAlertAbsenceEmail } from '../../services/emailService';
import AbsenceNotificationModal from '../Notifications/AbsenceNotificationModal';

const MOIS_OPTIONS = [
  { value: '', label: 'Tous les mois' },
  { value: '0', label: 'Janvier' },
  { value: '1', label: 'Février' },
  { value: '2', label: 'Mars' },
  { value: '3', label: 'Avril' },
  { value: '4', label: 'Mai' },
  { value: '5', label: 'Juin' },
  { value: '6', label: 'Juillet' },
  { value: '7', label: 'Août' },
  { value: '8', label: 'Septembre' },
  { value: '9', label: 'Octobre' },
  { value: '10', label: 'Novembre' },
  { value: '11', label: 'Décembre' },
];

const RISK_STYLES = {
  ok: { cls: 'bg-emerald-100 text-emerald-700', label: 'Normal' },
  warning: { cls: 'bg-amber-100 text-amber-700', label: 'Vigilance' },
  danger: { cls: 'bg-red-100 text-red-700', label: 'Critique' },
};

const THRESHOLD_ABSENCES = 3;

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function Spinner() {
  return <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" />;
}

function KpiCard({ label, value, sub, color }) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
  };
  return (
    <div className={`rounded-2xl border p-5 ${colorMap[color] || 'bg-slate-50 border-slate-200 text-slate-700'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function JustifyModal({ presence, onClose, onSave }) {
  const [motif, setMotif] = useState(presence.motif || '');
  const [docRef, setDocRef] = useState(presence.docRef || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(presence.id, motif, docRef);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800">Justifier l'absence</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Motif de justification *</label>
            <textarea
              value={motif}
              onChange={e => setMotif(e.target.value)}
              required
              rows={3}
              placeholder="Maladie, événement familial, convocation administrative…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Référence du justificatif</label>
            <input
              type="text"
              value={docRef}
              onChange={e => setDocRef(e.target.value)}
              placeholder="N° certificat médical, N° document…"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60">
              {saving ? 'Enregistrement…' : 'Justifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AbsencesPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const { data: students } = useStudents();
  const { data: sessions } = useSessions();
  const { data: groupes } = useGroupes();

  const [presences, setPresences] = useState([]);
  const [loadingPresences, setLoadingPresences] = useState(true);

  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterMois, setFilterMois] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterJustifie, setFilterJustifie] = useState('');

  const [justifyTarget, setJustifyTarget] = useState(null);

  const fetchPresences = useCallback(async () => {
    setLoadingPresences(true);
    try {
      const q = query(
        collection(db, 'presences'),
        where('statut', 'in', ['absent', 'retard', 'absent_non_justifie', 'absent_justifie'])
      );
      const snap = await getDocs(q);
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      // Sort in memory — no composite index needed
      data.sort((a, b) => {
        const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt || 0);
        return tb - ta;
      });
      setPresences(data);
    } catch (err) {
      toast.error('Erreur lors du chargement des absences : ' + err.message);
    } finally {
      setLoadingPresences(false);
    }
  }, []);

  useEffect(() => { fetchPresences(); }, [fetchPresences]);

  // Build enriched absence rows
  const enriched = useMemo(() => {
    return presences.map(p => {
      const session = sessions.find(s => s.id === p.sessionId);
      const student = students.find(s => s.id === p.studentId);
      const groupe = groupes.find(g => g.id === (student?.groupeId || session?.groupeId));
      const isRetard = p.statut === 'retard';
      const isJustifie = p.statut === 'absent_justifie' || p.justifie === true;
      const sessionDate = session?.date ? new Date(session.date) : null;
      return { ...p, session, student, groupe, isRetard, isJustifie, sessionDate };
    });
  }, [presences, sessions, students, groupes]);

  // Filtered list
  const filtered = useMemo(() => {
    return enriched.filter(row => {
      if (filterGroupe && row.groupe?.id !== filterGroupe) return false;
      if (filterMois !== '' && row.sessionDate) {
        if (row.sessionDate.getMonth() !== parseInt(filterMois, 10)) return false;
      }
      if (filterType === 'absence' && row.isRetard) return false;
      if (filterType === 'retard' && !row.isRetard) return false;
      if (filterJustifie === 'oui' && !row.isJustifie) return false;
      if (filterJustifie === 'non' && row.isJustifie) return false;
      return true;
    });
  }, [enriched, filterGroupe, filterMois, filterType, filterJustifie]);

  // KPIs — current month
  const kpis = useMemo(() => {
    const now = new Date();
    const thisMois = enriched.filter(r => r.sessionDate && r.sessionDate.getMonth() === now.getMonth() && r.sessionDate.getFullYear() === now.getFullYear());
    const total = thisMois.length;
    const injustifiees = thisMois.filter(r => !r.isRetard && !r.isJustifie).length;
    const retards = thisMois.filter(r => r.isRetard).length;

    // Students above threshold (total absences across all time)
    const byStudent = {};
    for (const r of enriched) {
      if (!r.isRetard) {
        const sid = r.studentId;
        byStudent[sid] = (byStudent[sid] || 0) + 1;
      }
    }
    const atRisk = Object.values(byStudent).filter(count => count >= THRESHOLD_ABSENCES).length;

    return { total, injustifiees, retards, atRisk };
  }, [enriched]);

  // Per-student summary
  const studentSummary = useMemo(() => {
    const byStudent = {};
    for (const row of enriched) {
      const sid = row.studentId;
      if (!byStudent[sid]) {
        byStudent[sid] = {
          student: row.student,
          groupe: row.groupe,
          totalAbsences: 0,
          justifiees: 0,
          injustifiees: 0,
          retards: 0,
        };
      }
      if (row.isRetard) {
        byStudent[sid].retards += 1;
      } else {
        byStudent[sid].totalAbsences += 1;
        if (row.isJustifie) byStudent[sid].justifiees += 1;
        else byStudent[sid].injustifiees += 1;
      }
    }
    return Object.values(byStudent)
      .filter(r => r.student)
      .sort((a, b) => b.injustifiees - a.injustifiees);
  }, [enriched]);

  const handleToggleJustifie = async (row) => {
    if (!row.isJustifie) {
      setJustifyTarget(row);
    } else {
      const ok = await confirm({
        title: 'Retirer la justification ?',
        message: 'Cette absence redeviendra non justifiée.',
        danger: true,
        confirmLabel: 'Retirer',
      });
      if (!ok) return;
      try {
        await updateDoc(doc(db, 'presences', row.id), {
          statut: 'absent',
          justifie: false,
          motif: '',
          docRef: '',
          updatedAt: new Date(),
        });
        toast.success('Justification retirée');
        fetchPresences();
      } catch (err) {
        toast.error('Erreur : ' + err.message);
      }
    }
  };

  const handleJustifySave = async (presenceId, motif, docRef) => {
    await updateDoc(doc(db, 'presences', presenceId), {
      statut: 'absent_justifie',
      justifie: true,
      motif,
      docRef,
      updatedAt: new Date(),
    });
    toast.success('Absence justifiée');
    fetchPresences();
  };

  const handleExport = () => {
    const headers = ['Apprenant', 'Groupe', 'Date', 'Module', 'Type', 'Justifiée', 'Motif', 'Réf. document'];
    const rows = filtered.map(row => [
      `${row.student?.prenom || ''} ${row.student?.nom || ''}`.trim(),
      row.groupe?.nom || '',
      row.sessionDate ? row.sessionDate.toLocaleDateString('fr-FR') : '',
      row.session?.module || '',
      row.isRetard ? 'Retard' : 'Absence',
      row.isJustifie ? 'Oui' : 'Non',
      row.motif || '',
      row.docRef || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `absences_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [showNotify, setShowNotify] = useState(false);
  const [sendingAlerts, setSendingAlerts] = useState(false);

  const handleSendRiskAlerts = async () => {
    setSendingAlerts(true);
    try {
      // Compute score per student from all enriched presences
      const scoreMap = {};
      for (const row of enriched) {
        const sid = row.studentId;
        if (!scoreMap[sid]) scoreMap[sid] = { score: 0, student: row.student };
        scoreMap[sid].score += computeAbsenceScore(row.statut);
      }
      const targets = Object.values(scoreMap).filter(({ score }) => score >= 3);
      if (targets.length === 0) { toast.info('Aucun apprenant au-dessus du seuil.'); return; }
      let sent = 0, skipped = 0;
      const alertedAt = new Date();
      for (const { score, student } of targets) {
        if (!student?.email) { skipped++; continue; }
        const threshold = score >= 5 ? 5 : 3;
        const name = `${student.prenom || ''} ${student.nom || ''}`.trim();
        await sendAlertAbsenceEmail(db, { toEmail: student.email, toName: name, score, threshold });
        // Write traceability back to all presences for this student
        const studentPresences = enriched.filter(r => r.studentId === student.id);
        if (studentPresences.length > 0) {
          const batch = writeBatch(db);
          for (const p of studentPresences) {
            batch.update(doc(db, 'presences', p.id), { alertSentAt: alertedAt, alertScore: score });
          }
          await batch.commit();
        }
        sent++;
      }
      toast.success(`${sent} alerte${sent > 1 ? 's' : ''} envoyée${sent > 1 ? 's' : ''}${skipped > 0 ? ` · ${skipped} sans email` : ''}`);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSendingAlerts(false);
    }
  };

  // Build list of enriched absences for the notification modal
  const absencesForNotif = useMemo(() => filtered.map(row => ({
    id: row.id,
    studentId: row.studentId,
    nom: row.student?.nom || '',
    prenom: row.student?.prenom || '',
    email: row.student?.email || '',
    module: row.session?.module || '',
    date: row.sessionDate,
    heureDebut: row.session?.heureDebut || '',
    heureFin: row.session?.heureFin || '',
    groupe: row.groupe?.nom || '',
    statut: row.statut,
  })), [filtered]);

  const currentMonthLabel = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestion des absences</h1>
          <p className="text-slate-500 text-sm mt-0.5">Suivi des présences, retards et justifications</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSendRiskAlerts}
            disabled={sendingAlerts || enriched.length === 0}
            title="Envoie automatiquement un email aux apprenants ≥ 3 pts d'absence"
            className="inline-flex items-center gap-2 px-4 py-2 border border-amber-400 text-amber-700 hover:bg-amber-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
          >
            {sendingAlerts ? '⏳ Envoi…' : '⚠️ Alerter apprenants à risque'}
          </button>
          <button
            onClick={() => setShowNotify(true)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-400 text-red-600 hover:bg-red-50 text-sm font-medium rounded-xl transition-colors disabled:opacity-40"
          >
            ✉ Notifier les absents ({filtered.length})
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <ExportIcon />
            Exporter
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={`Absences — ${currentMonthLabel}`}
          value={kpis.total}
          sub="total ce mois"
          color="blue"
        />
        <KpiCard
          label="Injustifiées"
          value={kpis.injustifiees}
          sub="ce mois, sans justificatif"
          color="red"
        />
        <KpiCard
          label="Retards"
          value={kpis.retards}
          sub="retards enregistrés ce mois"
          color="amber"
        />
        <KpiCard
          label={`Apprenants > ${THRESHOLD_ABSENCES} absences`}
          value={kpis.atRisk}
          sub="total cumulé, seuil dépassé"
          color="violet"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <select
          value={filterGroupe}
          onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select
          value={filterMois}
          onChange={e => setFilterMois(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          {MOIS_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Absence & Retard</option>
          <option value="absence">Absences seulement</option>
          <option value="retard">Retards seulement</option>
        </select>
        <select
          value={filterJustifie}
          onChange={e => setFilterJustifie(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
        >
          <option value="">Justifiée / Non</option>
          <option value="oui">Justifiées</option>
          <option value="non">Non justifiées</option>
        </select>
        {(filterGroupe || filterMois !== '' || filterType || filterJustifie) && (
          <button
            onClick={() => { setFilterGroupe(''); setFilterMois(''); setFilterType(''); setFilterJustifie(''); }}
            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors"
          >
            Réinitialiser
          </button>
        )}
        <span className="ml-auto self-center text-xs text-slate-400">{filtered.length} enregistrement{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Main table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Registre des absences et retards</p>
        </div>
        {loadingPresences ? (
          <div className="p-12 text-center"><Spinner /><p className="text-slate-400 text-sm mt-3">Chargement…</p></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-700 font-semibold">Aucune absence enregistrée</p>
            <p className="text-slate-400 text-sm mt-1">Ajustez les filtres ou vérifiez les séances d'émargement.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Apprenant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Date / Séance</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Justifiée</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Motif</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    {row.student ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#005989]/10 flex items-center justify-center text-xs font-bold text-[#005989] shrink-0">
                          {row.student.prenom?.[0]}{row.student.nom?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{row.student.prenom} {row.student.nom}</p>
                          {row.student.cin && <p className="text-xs text-slate-400">{row.student.cin}</p>}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">ID: {row.studentId?.slice(0, 8)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-600">{row.groupe?.nom || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-slate-700">
                      {row.sessionDate ? row.sessionDate.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                    </p>
                    {row.session?.module && <p className="text-xs text-slate-400 mt-0.5">{row.session.module}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {row.isRetard ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Retard</span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Absence</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleJustifie(row)}
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                        row.isJustifie
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {row.isJustifie && <CheckIcon />}
                      {row.isJustifie ? 'Oui' : 'Non'}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-xs text-slate-500 max-w-xs truncate">{row.motif || '—'}</p>
                    {row.docRef && <p className="text-xs text-[#005989] font-mono mt-0.5">{row.docRef}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!row.isJustifie && (
                      <button
                        onClick={() => setJustifyTarget(row)}
                        className="text-xs font-medium px-3 py-1.5 bg-[#005989] hover:bg-[#004a73] text-white rounded-lg transition-colors"
                      >
                        Justifier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Per-student summary */}
      {studentSummary.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Récapitulatif par apprenant</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Apprenant</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total abs.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Justifiées</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Injustifiées</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Retards</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Niveau de risque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studentSummary.map(row => {
                const riskLevel = getAlertLevel(row.injustifiees + row.retards * 0.5);
                const riskStyle = RISK_STYLES[riskLevel] || RISK_STYLES.ok;
                return (
                  <tr key={row.student?.id || Math.random()} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#005989]/10 flex items-center justify-center text-xs font-bold text-[#005989] shrink-0">
                          {row.student?.prenom?.[0]}{row.student?.nom?.[0]}
                        </div>
                        <p className="font-medium text-slate-800">{row.student?.prenom} {row.student?.nom}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-600">{row.groupe?.nom || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${row.totalAbsences >= THRESHOLD_ABSENCES ? 'text-red-600' : 'text-slate-700'}`}>
                        {row.totalAbsences}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-emerald-600 font-medium">{row.justifiees}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-sm font-medium ${row.injustifiees > 0 ? 'text-red-600' : 'text-slate-500'}`}>{row.injustifiees}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-sm font-medium ${row.retards > 0 ? 'text-amber-600' : 'text-slate-500'}`}>{row.retards}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskStyle.cls}`}>{riskStyle.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Justify modal */}
      {justifyTarget && (
        <JustifyModal
          presence={justifyTarget}
          onClose={() => setJustifyTarget(null)}
          onSave={handleJustifySave}
        />
      )}

      {/* Absence notification modal */}
      {showNotify && (
        <AbsenceNotificationModal
          db={db}
          absences={absencesForNotif}
          onClose={() => setShowNotify(false)}
        />
      )}
    </div>
  );
}
