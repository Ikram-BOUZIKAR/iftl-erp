import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useGroupes, useIntervenants } from '../../hooks/useData';
import { groupesService } from '../../services/firestore';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const FILIERE_CODES = ['TMLI', 'LIPF', 'GOL', 'GOLE', 'ECMD', 'DMVT', 'LE', 'OFLP', 'AEL', 'ADEE', 'CTM', 'CTP', 'CRM'];
const FILIERE_LABELS = {
  TMLI: 'Transport Multimodal et Logistique Internationale',
  LIPF: 'Logistique Industrielle et Pilotage des Flux',
  GOL:  "Gestionnaire des opérations logistiques et d'entrepôt",
  GOLE: "Gestion des Opérations Logistiques et d'Entrepôt",
  ECMD: 'E-Commerce, Marketing Digital et Distribution',
  DMVT: 'Diagnostic et Maintenance des Véhicules de Transport',
  LE:   "Logistique d'entreposage",
  OFLP: "Opérateur(trice) en Fret et Logistique de la Plateforme",
  AEL:  "Agent(e) d'Exploitation Logistique",
  ADEE: 'Agent(e) Diagnostic Électronique Automobile',
  CTM:  'Conducteur(rice) en transport routier – Option Marchandises',
  CTP:  'Conducteur(rice) en transport routier – Option Personnes',
  CRM:  'Conducteur(trice) Routier(ère) de Marchandises',
};
const FILIERE_TYPE = { TMLI:'Technicien Spécialisé', LIPF:'Technicien Spécialisé', GOL:'Technicien Spécialisé', GOLE:'Technicien Spécialisé', ECMD:'Technicien Spécialisé', DMVT:'Technicien Spécialisé', LE:'Technicien Spécialisé', OFLP:'Technicien Spécialisé', AEL:'Technicien Spécialisé', ADEE:'Technicien Spécialisé', CTM:'Qualification', CTP:'Qualification', CRM:'Qualification' };
const TYPES_FORMATION = ['Technicien Spécialisé', 'Qualification', 'Licence CNAM', 'Licence Transitaire', 'Mastère ESLI MLAI'];
const ANNEES_PROMOTION = ['1ère année', '2ème année'];
const TYPES_AVEC_ANNEE = new Set(['Technicien Spécialisé', 'Qualification', 'Mastère ESLI MLAI']);
const TYPE_COLORS = {
  'Technicien Spécialisé': 'bg-blue-50 text-blue-700 border-blue-200',
  'Qualification': 'bg-amber-50 text-amber-700 border-amber-200',
  'Licence CNAM': 'bg-violet-50 text-violet-700 border-violet-200',
  'Licence Transitaire': 'bg-violet-50 text-violet-700 border-violet-200',
  'Mastère ESLI MLAI': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function EmptyState({ onAdd }) {
  const { t } = useTranslation();
  return (
    <div className="text-center py-16 col-span-3">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">👥</span>
      </div>
      <p className="text-slate-700 font-semibold">{t('groupes.no_groups')}</p>
      <p className="text-slate-400 text-sm mt-1 mb-5">{t('groupes.no_groups_hint')}</p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <PlusIcon />
        {t('groupes.add')}
      </button>
    </div>
  );
}

// ── Panel liste apprenants d'un groupe ────────────────────────────────────────

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  // Try to detect separator
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase()
    .replace(/é|è|ê/g,'e').replace(/à|â/g,'a').replace(/[^a-z0-9]/g,'_'));
  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/^["']|["']$/g,''));
    const row = {};
    headers.forEach((h, i) => { row[h] = cols[i] || ''; });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

function normalizeCSVRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      for (const rk of Object.keys(row)) {
        if (rk === k || rk.includes(k)) return row[rk];
      }
    }
    return '';
  };
  return {
    code:   get('code','id','num','matricule','codeapprenant') || '',
    nom:    get('nom','name','last') || '',
    prenom: get('prenom','first','prénom','prenom') || '',
    cin:    get('cin','cni') || '',
    telephone: get('tel','telephone','phone') || '',
    email:  get('email','mail','courriel') || '',
  };
}

function GroupeDetailPanel({ groupe, onClose, toast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    if (!groupe) return;
    setLoading(true);
    (async () => {
      try {
        // Query by groupeId first, then by groupe name
        const results = [];
        const seen = new Set();
        const addDocs = snap => snap.forEach(d => { if (!seen.has(d.id)) { seen.add(d.id); results.push({ id: d.id, ...d.data() }); } });

        const q1 = await getDocs(query(collection(db, 'students'), where('groupeId', '==', groupe.id)));
        addDocs(q1);
        if (results.length === 0) {
          const q2 = await getDocs(query(collection(db, 'students'), where('groupeId', '==', groupe.nom)));
          addDocs(q2);
        }
        if (results.length === 0) {
          const q3 = await getDocs(query(collection(db, 'students'), where('groupe', '==', groupe.nom)));
          addDocs(q3);
        }
        results.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        setStudents(results);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupe]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      let created = 0, updated = 0, errors = 0;
      for (const raw of rows) {
        const r = normalizeCSVRow(raw);
        if (!r.nom && !r.code) continue;
        const code = (r.code || `${groupe.id}-${r.nom.slice(0,3).toUpperCase()}${Date.now()}`).toUpperCase().trim();
        try {
          const ref = doc(db, 'students', code);
          const snap = await getDocs(query(collection(db, 'students'), where('__name__', '==', code)));
          const payload = {
            groupeId: groupe.id,
            groupe: groupe.nom,
            filiereCode: groupe.filiereCode || '',
            filiere: groupe.filiere || '',
            niveau: groupe.niveau || '',
            anneeAcademique: groupe.annee || '',
            statut: 'actif',
            updatedAt: new Date().toISOString(),
          };
          if (r.nom)    payload.nom    = r.nom.toUpperCase();
          if (r.prenom) payload.prenom = r.prenom;
          if (r.cin)    payload.cin    = r.cin;
          if (r.telephone) payload.telephone = r.telephone;
          if (r.email)  payload.email  = r.email;
          if (snap.empty) {
            payload.code = code;
            payload.createdAt = new Date().toISOString();
            await setDoc(ref, payload);
            created++;
          } else {
            await updateDoc(ref, payload);
            updated++;
          }
        } catch { errors++; }
      }
      setImportResult({ created, updated, errors, total: rows.length });
      toast.success(`Import terminé : ${created} créés, ${updated} mis à jour`);
      // Reload students
      const newSnap = await getDocs(query(collection(db, 'students'), where('groupeId', '==', groupe.id)));
      const arr = [];
      newSnap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (a.nom||'').localeCompare(b.nom||''));
      setStudents(arr);
    } catch (err) {
      toast.error('Erreur import : ' + err.message);
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"
             style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
          <div>
            <p className="text-white font-bold text-base">{groupe.nom}</p>
            <p className="text-indigo-200 text-xs mt-0.5">
              {groupe.filiereCode || ''} {(groupe.typeFormation || groupe.niveau) ? `· ${groupe.typeFormation || groupe.niveau}` : ''} {groupe.anneePromotion ? `· ${groupe.anneePromotion}` : ''} {groupe.annee ? `· ${groupe.annee}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Import bar */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-600">
              {loading ? 'Chargement…' : `${students.length} apprenant${students.length !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-400">CSV accepté : code, nom, prenom, cin, tel, email</p>
          </div>
          <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${importing ? 'opacity-60 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
            </svg>
            {importing ? 'Import…' : 'Importer CSV'}
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>

        {importResult && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700">
            ✓ {importResult.created} créés · {importResult.updated} mis à jour
            {importResult.errors > 0 && ` · ${importResult.errors} erreurs`}
          </div>
        )}

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <p className="text-slate-500 text-sm font-medium">Aucun apprenant dans ce groupe</p>
              <p className="text-slate-400 text-xs mt-1">Importez une liste CSV pour commencer</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-600">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {s.nom} {s.prenom}
                    </p>
                    <p className="text-xs text-slate-400">{s.id} {s.cin ? `· ${s.cin}` : ''}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                    s.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' :
                    s.statut === 'laureat' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {s.statut || 'actif'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const getNiveauKey = (g) => {
  if (g.typeFormation === 'Qualification') return 'QUALIF';
  if (g.anneePromotion === '2ème année') return '2A TS';
  return '1A TS';
};

export default function GroupesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: groupes, loading, refetch } = useGroupes();
  const { data: intervenants } = useIntervenants();
  const [activeTab,      setActiveTab]      = useState('groupes');
  const [showForm,       setShowForm]       = useState(false);
  const [editing,        setEditing]        = useState(null);
  const [form,           setForm]           = useState({ nom: '', filiereCode: '', typeFormation: '', anneePromotion: '', intervenantId: '', annee: '2026-2027', statut: 'actif' });
  const [saving,         setSaving]         = useState(false);
  const [selectedGroupe, setSelectedGroupe] = useState(null);
  const [archives,       setArchives]       = useState([]);
  const [archLoading,    setArchLoading]    = useState(false);
  const [studentCounts,  setStudentCounts]  = useState({});
  const [closedTypes,    setClosedTypes]    = useState(new Set());
  const [closedAnnees,   setClosedAnnees]   = useState(new Set());
  const [closedFilieres, setClosedFilieres] = useState(new Set());

  // Load archived students grouped by promotionLabel
  useEffect(() => {
    if (activeTab !== 'archives') return;
    setArchLoading(true);
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'students'), where('statut', '==', 'laureat')));
        const map = {};
        snap.forEach(d => {
          const s = { id: d.id, ...d.data() };
          const label = s.promotionLabel || s.promotionSortie || 'Non classé';
          if (!map[label]) map[label] = [];
          map[label].push(s);
        });
        // Sort by label descending (most recent first)
        const sorted = Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
        setArchives(sorted);
      } catch (err) { console.error(err); }
      finally { setArchLoading(false); }
    })();
  }, [activeTab]);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'students'));
        const counts = {};
        snap.forEach(d => {
          const gid = d.data().groupeId;
          if (gid) counts[gid] = (counts[gid] || 0) + 1;
        });
        setStudentCounts(counts);
      } catch {}
    })();
  }, []);

  const openAdd = () => {
    setForm({ nom: '', filiereCode: '', typeFormation: '', anneePromotion: '', intervenantId: '', annee: '2026-2027', statut: 'actif' });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (g) => {
    setForm({ nom: g.nom, filiereCode: g.filiereCode || '', typeFormation: g.typeFormation || g.niveau || '', anneePromotion: g.anneePromotion || '', intervenantId: g.intervenantId || '', annee: g.annee || '2026-2027', statut: g.statut || (g.actif === false ? 'inactif' : 'actif') });
    setEditing(g);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      const data = { ...form, actif: form.statut === 'actif', filiere: FILIERE_LABELS[form.filiereCode] || form.filiereCode, niveau: form.typeFormation };
      if (editing) {
        await groupesService.update(editing.id, data);
        toast.success('Groupe modifié');
      } else {
        await groupesService.create(data);
        toast.success('Groupe créé');
      }
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally { setSaving(false); }
  };

  const handleSetStatut = async (g, statut) => {
    try {
      await groupesService.update(g.id, { statut, actif: statut === 'actif' });
      refetch();
      toast.success(statut === 'actif' ? 'Groupe activé' : statut === 'inactif' ? 'Groupe désactivé' : 'Groupe archivé');
    } catch (err) { toast.error('Erreur : ' + err.message); }
  };

  const handleDelete = async (id, nom) => {
    const ok = await confirm({ title: t('groupes.delete_confirm'), message: `"${nom}" sera définitivement supprimé.`, danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try { await groupesService.delete(id); refetch(); toast.success('Groupe supprimé'); }
    catch (err) {
      if (err.code === 'permission-denied') {
        toast.error('Permissions insuffisantes pour supprimer ce groupe.');
      } else {
        toast.error('Erreur : ' + err.message);
      }
    }
  };

  const getIntervenantName = (id) => {
    const i = intervenants.find(x => x.id === id);
    return i ? `${i.prenom} ${i.nom}` : null;
  };

  const groupeStatut = (g) => g.statut || (g.actif === false ? 'inactif' : 'actif');

  const toggleSet = (setter, key) => setter(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const typeColor = (type) => TYPE_COLORS[type] || 'bg-slate-50 text-slate-600 border-slate-200';

  const STATUT_STYLE = {
    actif:    'bg-emerald-100 text-emerald-700',
    inactif:  'bg-amber-100 text-amber-700',
    archive:  'bg-slate-100 text-slate-500',
  };
  const STATUT_LABEL = { actif: 'Actif', inactif: 'Inactif', archive: 'Archivé' };

  const activeGroupes   = groupes.filter(g => groupeStatut(g) === 'actif');
  const inactifGroupes  = groupes.filter(g => groupeStatut(g) === 'inactif');
  const archivedGroupes = groupes.filter(g => groupeStatut(g) === 'archive');

  const renderGroupeCard = (g) => {
    const intervenantName = getIntervenantName(g.intervenantId);
    const st = groupeStatut(g);
    return (
      <div key={g.id} className={`bg-white rounded-xl border shadow-sm p-5 transition-shadow hover:shadow-md ${st === 'actif' ? 'border-slate-200' : st === 'inactif' ? 'border-amber-200' : 'border-slate-100 opacity-60'}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <p className="font-bold text-slate-800 text-base truncate">{g.nom}</p>
            {(g.filiereCode || g.filiere) && <p className="text-sm text-slate-500 mt-0.5 truncate">{FILIERE_LABELS[g.filiereCode] || g.filiere}</p>}
          </div>
          {/* Statut dropdown */}
          <div className="relative group shrink-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full cursor-pointer ${STATUT_STYLE[st] || 'bg-slate-100 text-slate-500'}`}>
              {STATUT_LABEL[st] || st}
            </span>
            <div className="absolute right-0 top-6 bg-white border border-slate-200 rounded-xl shadow-lg z-10 hidden group-hover:block min-w-32 overflow-hidden">
              {['actif','inactif','archive'].map(s => (
                <button key={s} onClick={() => handleSetStatut(g, s)}
                  className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors ${s === st ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}>
                  {s === 'actif' ? '✓ Actif' : s === 'inactif' ? '⏸ Inactif' : '📦 Archiver'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1 mb-4">
          {(g.typeFormation || g.niveau) && <p className="text-xs text-slate-400 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-300"/>{g.typeFormation || g.niveau}{g.anneePromotion ? ` · ${g.anneePromotion}` : ''}</p>}
          {g.annee  && <p className="text-xs text-slate-400 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-300"/>Année {g.annee}</p>}
          {intervenantName && <p className="text-xs text-slate-400 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-slate-300"/>{intervenantName}</p>}
        </div>
        <div className="flex gap-2 pt-3 border-t border-slate-100">
          <button onClick={() => setSelectedGroupe(g)}
            className="flex-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors text-center">
            👥 Liste
          </button>
          <button onClick={() => navigate(`/apprenants?niveau=${getNiveauKey(g)}&groupeId=${g.id}`)}
            className="flex-1 text-xs font-semibold text-[#005989] hover:text-[#004a73] px-3 py-1.5 border border-[#005989]/30 rounded-lg hover:bg-[#005989]/5 transition-colors text-center">
            → Apprenants
          </button>
          <button onClick={() => openEdit(g)}
            className="text-xs font-medium text-slate-600 hover:text-slate-800 px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Modifier
          </button>
          <button onClick={() => handleDelete(g.id, g.nom)}
            className="text-xs font-medium text-red-500 hover:text-red-600 px-3 py-1.5 border border-red-100 rounded-lg hover:bg-red-50 transition-colors">
            Suppr.
          </button>
        </div>
      </div>
    );
  };

  const renderGroupeRow = (g) => {
    const count = studentCounts[g.id] || 0;
    const st = groupeStatut(g);
    return (
      <div key={g.id} className="flex items-center gap-2 p-2.5 bg-white border border-slate-100 rounded-lg hover:border-indigo-100 hover:bg-indigo-50/30 transition-all group">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-slate-800 text-sm">{g.nom}</span>
          {count > 0 && <span className="ml-2 text-xs text-slate-400">{count} apprenant{count !== 1 ? 's' : ''}</span>}
        </div>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${STATUT_STYLE[st] || 'bg-slate-100 text-slate-500'}`}>{STATUT_LABEL[st] || st}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => setSelectedGroupe(g)} title="Liste apprenants" className="text-xs text-indigo-600 hover:text-indigo-700 px-1.5 py-1 border border-indigo-200 rounded hover:bg-indigo-50 transition-colors">👥</button>
          <button onClick={() => navigate(`/apprenants?niveau=${getNiveauKey(g)}&groupeId=${g.id}`)} title="Apprenants" className="text-xs text-[#005989] hover:text-[#004a73] px-1.5 py-1 border border-[#005989]/30 rounded hover:bg-[#005989]/5 transition-colors">→ App</button>
          <button onClick={() => openEdit(g)} title="Modifier" className="text-xs text-slate-500 hover:text-slate-800 px-1.5 py-1 border border-slate-200 rounded hover:bg-slate-50 transition-colors">✏️</button>
          <button onClick={() => handleDelete(g.id, g.nom)} title="Supprimer" className="text-xs text-red-400 hover:text-red-600 px-1.5 py-1 border border-red-100 rounded hover:bg-red-50 transition-colors">🗑</button>
        </div>
      </div>
    );
  };

  const accordionData = useMemo(() => {
    const byType = {};
    for (const g of activeGroupes) {
      const type = g.typeFormation || g.niveau || 'Autres';
      if (!byType[type]) byType[type] = [];
      byType[type].push(g);
    }
    const sortedTypes = [
      ...TYPES_FORMATION.filter(t => byType[t]),
      ...Object.keys(byType).filter(t => !TYPES_FORMATION.includes(t)),
    ];
    return sortedTypes.map(type => {
      const typeGroupes = byType[type];
      const hasAnnee = TYPES_AVEC_ANNEE.has(type);
      if (hasAnnee) {
        const byAnnee = {};
        for (const g of typeGroupes) {
          const annee = g.anneePromotion || 'Non défini';
          if (!byAnnee[annee]) byAnnee[annee] = [];
          byAnnee[annee].push(g);
        }
        const sortedAnnees = [...ANNEES_PROMOTION.filter(a => byAnnee[a]), ...(byAnnee['Non défini'] ? ['Non défini'] : [])];
        return {
          type, hasAnnee: true,
          annees: sortedAnnees.map(annee => {
            const ag = byAnnee[annee];
            const byFil = {};
            for (const g of ag) { const fc = g.filiereCode || 'Autres'; if (!byFil[fc]) byFil[fc] = []; byFil[fc].push(g); }
            return { annee, filieres: Object.entries(byFil).map(([fc, gs]) => ({ fc, groupes: gs })) };
          }),
        };
      } else {
        const byFil = {};
        for (const g of typeGroupes) { const fc = g.filiereCode || 'Autres'; if (!byFil[fc]) byFil[fc] = []; byFil[fc].push(g); }
        return { type, hasAnnee: false, filieres: Object.entries(byFil).map(([fc, gs]) => ({ fc, groupes: gs })) };
      }
    });
  }, [activeGroupes]);

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('groupes.title')}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : `${activeGroupes.length} actif${activeGroupes.length !== 1 ? 's' : ''} · ${inactifGroupes.length} inactif${inactifGroupes.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
          <PlusIcon /> {t('groupes.add')}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-slate-200 pb-0">
        {[
          { id: 'groupes',  label: `Groupes actifs (${activeGroupes.length})` },
          { id: 'inactifs', label: `Inactifs (${inactifGroupes.length})` },
          { id: 'archives', label: 'Archives & Promotions 🎓' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Groupes actifs — accordion */}
      {activeTab === 'groupes' && (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"/>
            </div>
          ) : activeGroupes.length === 0 ? (
            <EmptyState onAdd={openAdd} />
          ) : accordionData.map(({ type, hasAnnee, annees, filieres }) => {
            const typeGroupes = activeGroupes.filter(g => (g.typeFormation || g.niveau || 'Autres') === type);
            const typeTotal = typeGroupes.reduce((s, g) => s + (studentCounts[g.id] || 0), 0);
            const isTypeOpen = !closedTypes.has(type);
            const chevron = (open) => (
              <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${open ? '' : '-rotate-90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
              </svg>
            );
            const renderFil = (fKey, fc, fGroupes) => {
              const isOpen = !closedFilieres.has(fKey);
              const label = FILIERE_LABELS[fc] ? `${fc} — ${FILIERE_LABELS[fc]}` : fc;
              return (
                <div key={fKey} className="border-l-2 border-slate-100 pl-3">
                  <button onClick={() => toggleSet(setClosedFilieres, fKey)}
                    className="flex items-center gap-2 w-full text-left py-1.5 hover:text-slate-800 transition-colors">
                    {chevron(isOpen)}
                    <span className="text-xs font-semibold text-slate-600 truncate flex-1">{label}</span>
                    <span className="text-xs text-slate-400 shrink-0">{fGroupes.length} gr</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-1 pl-4 pb-1.5">
                      {fGroupes.sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map(renderGroupeRow)}
                    </div>
                  )}
                </div>
              );
            };
            return (
              <div key={type} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button onClick={() => toggleSet(setClosedTypes, type)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-slate-50 transition-colors ${isTypeOpen ? 'border-b border-slate-100' : ''}`}>
                  {chevron(isTypeOpen)}
                  <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${typeColor(type)}`}>{type}</span>
                  <span className="text-xs text-slate-500">{typeGroupes.length} groupe{typeGroupes.length !== 1 ? 's' : ''} · {typeTotal} apprenant{typeTotal !== 1 ? 's' : ''}</span>
                </button>
                {isTypeOpen && (
                  <div className="px-4 py-3 space-y-2">
                    {hasAnnee ? annees.map(({ annee, filieres: fils }) => {
                      const anneeKey = `${type}::${annee}`;
                      const isAnneeOpen = !closedAnnees.has(anneeKey);
                      return (
                        <div key={anneeKey} className="space-y-1.5">
                          <button onClick={() => toggleSet(setClosedAnnees, anneeKey)}
                            className="flex items-center gap-2 w-full text-left py-1 hover:text-slate-900 transition-colors">
                            {chevron(isAnneeOpen)}
                            <span className="text-sm font-bold text-slate-700">{annee}</span>
                          </button>
                          {isAnneeOpen && (
                            <div className="space-y-1.5 ml-2">
                              {fils.map(({ fc, groupes: gs }) => renderFil(`${anneeKey}::${fc}`, fc, gs))}
                            </div>
                          )}
                        </div>
                      );
                    }) : filieres.map(({ fc, groupes: gs }) => renderFil(`${type}::${fc}`, fc, gs))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Groupes inactifs */}
      {activeTab === 'inactifs' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {inactifGroupes.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-400 text-sm">Aucun groupe inactif</div>
          ) : inactifGroupes.map(renderGroupeCard)}
          {archivedGroupes.length > 0 && (
            <>
              <div className="col-span-3 text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">Archivés</div>
              {archivedGroupes.map(renderGroupeCard)}
            </>
          )}
        </div>
      )}

      {/* Tab: Archives & Promotions */}
      {activeTab === 'archives' && (
        <div className="space-y-5">
          {archLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : archives.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">Aucune promotion archivée</div>
          ) : archives.map(([label, students]) => (
            <div key={label} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Promotion header */}
              <div className="px-6 py-4 flex items-center justify-between"
                   style={{ background: 'linear-gradient(135deg,#1e3a6e,#005989)' }}>
                <div>
                  <p className="text-white font-black text-lg">Promotion {label}</p>
                  <p className="text-blue-200 text-xs mt-0.5">
                    {students.length} lauréat{students.length !== 1 ? 's' : ''} · Diplômés {label.split('-')[1] || label}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl">🎓</p>
                </div>
              </div>
              {/* Student list */}
              <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                {students.sort((a,b)=>(a.nom||'').localeCompare(b.nom||'')).map((s, i) => (
                  <div key={s.id} className="px-5 py-2.5 flex items-center gap-3">
                    <span className="text-xs text-slate-300 w-6 text-right shrink-0">{i+1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{s.nom} {s.prenom}</p>
                      <p className="text-xs text-slate-400">{s.id} {s.filiereCode ? `· ${s.filiereCode}` : ''} {s.groupeId ? `· ${s.groupeId}` : ''}</p>
                    </div>
                    <span className="text-xs text-violet-600 font-semibold bg-violet-50 px-2 py-0.5 rounded-full shrink-0">Lauréat</span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">Données complètes disponibles dans la section Apprenants</p>
                <span className="text-xs font-bold text-slate-600">{students.length} diplômés</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Groupe detail panel */}
      {selectedGroupe && (
        <GroupeDetailPanel groupe={selectedGroupe} onClose={() => setSelectedGroupe(null)} toast={toast} />
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">{editing ? t('groupes.form_title_edit') : t('groupes.form_title_add')}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom du groupe *</label>
                <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex: ts-a-tmli-1a-2026"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Filière</label>
                  <select value={form.filiereCode} onChange={e => {
                      const code = e.target.value;
                      setForm(f => ({ ...f, filiereCode: code, typeFormation: FILIERE_TYPE[code] || f.typeFormation }));
                    }} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Sélectionner —</option>
                    {FILIERE_CODES.map(code => <option key={code} value={code}>{code} — {FILIERE_LABELS[code]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Type de formation</label>
                  <select value={form.typeFormation} onChange={e => setForm(f => ({ ...f, typeFormation: e.target.value, anneePromotion: '' }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Sélectionner —</option>
                    {TYPES_FORMATION.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {TYPES_AVEC_ANNEE.has(form.typeFormation) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Niveau</label>
                  <div className="flex gap-2">
                    {ANNEES_PROMOTION.map(a => (
                      <button type="button" key={a} onClick={() => setForm(f => ({ ...f, anneePromotion: a }))}
                        className={`flex-1 text-sm font-medium py-2 rounded-lg border transition-colors ${form.anneePromotion === a ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Intervenant</label>
                  <select value={form.intervenantId} onChange={e => setForm(f => ({ ...f, intervenantId: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Sélectionner —</option>
                    {intervenants.map(i => <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Année académique</label>
                  <input type="text" value={form.annee} onChange={e => setForm(f => ({ ...f, annee: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Statut</label>
                <div className="flex gap-2">
                  {['actif','inactif','archive'].map(s => (
                    <button type="button" key={s} onClick={() => setForm(f=>({...f,statut:s}))}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg border transition-colors ${form.statut===s ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {s === 'actif' ? '✓ Actif' : s === 'inactif' ? '⏸ Inactif' : '📦 Archivé'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
                  {saving ? 'Enregistrement…' : editing ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
