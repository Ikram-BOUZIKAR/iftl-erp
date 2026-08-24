import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { presencesService, studentsService } from '../../services/firestore';
import { format, isToday, isTomorrow, isPast, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '../UI/Toast';
import { HelpButton } from '../UI/HelpGuide';

const BLUE = '#005989';

// ── Icons ──────────────────────────────────────────────────────────────────────
function IcoCal()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>; }
function IcoPen()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>; }
function IcoUser()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>; }
function IcoLogout() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>; }
function IcoMenu()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>; }
function IcoClose()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>; }
function IcoStats()  { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>; }
function IcoPlus()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>; }

const TABS = [
  { id: 'planning',      label: 'Mon Planning',   short: 'Planning',  Icon: IcoCal   },
  { id: 'emargement',   label: 'Émargement',      short: 'Émarger',   Icon: IcoPen   },
  { id: 'statistiques', label: 'Statistiques',    short: 'Stats',     Icon: IcoStats },
  { id: 'profil',       label: 'Mon Profil',      short: 'Profil',    Icon: IcoUser  },
];

const TYPE_COLOR = {
  cours:     'bg-[#005989] text-white',
  tp:        'bg-[#8a9a0a] text-white',
  td:        'bg-[#d4a000] text-white',
  exam:      'bg-red-500 text-white',
  efm:       'bg-orange-500 text-white',
  eff:       'bg-rose-700 text-white',
  cc:        'bg-violet-500 text-white',
  seminaire: 'bg-teal-500 text-white',
};

const SESSION_TYPES = [
  { value: 'cours',     label: 'Cours' },
  { value: 'tp',        label: 'TP' },
  { value: 'td',        label: 'TD' },
  { value: 'exam',      label: 'Examen' },
  { value: 'efm',       label: 'EFM' },
  { value: 'cc',        label: 'Contrôle continu' },
  { value: 'seminaire', label: 'Séminaire' },
];

const STATUT_BTN = [
  { value: 'present',             short: 'P',   cls: 'bg-emerald-500 text-white' },
  { value: 'retard',              short: 'R',   cls: 'bg-amber-500 text-white'   },
  { value: 'absent_justifie',     short: 'AJ',  cls: 'bg-blue-500 text-white'    },
  { value: 'absent_non_justifie', short: 'ANJ', cls: 'bg-red-500 text-white'     },
];

function sessionDate(s) {
  return s.date?.toDate ? s.date.toDate() : new Date(s.date);
}

function dateLabel(d) {
  if (isToday(d)) return "Aujourd'hui";
  if (isTomorrow(d)) return 'Demain';
  return format(d, 'EEEE d MMMM', { locale: fr });
}

function parseHours(heureDebut, heureFin) {
  if (!heureDebut || !heureFin) return 0;
  const [h1, m1] = heureDebut.split(':').map(Number);
  const [h2, m2] = heureFin.split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
}

// ── Inline feuille d'émargement ──────────────────────────────────────────────
function EmargementPanel({ session, onClose, toast }) {
  const [students, setStudents]     = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');

  useEffect(() => {
    if (!session) return;
    let unsub;
    (async () => {
      const studData = session.groupeId ? await studentsService.getAll({ groupeId: session.groupeId }) : [];
      const active = studData.filter(s => s.statut === 'actif');
      setStudents(active);

      const init = {};
      for (const s of active) init[s.id] = { statut: 'present', heureArrivee: '', justification: '' };
      setAttendance(init);

      unsub = onSnapshot(
        query(collection(db, 'presences'), where('sessionId', '==', session.id)),
        snap => {
          setAttendance(prev => {
            const next = { ...prev };
            snap.forEach(d => {
              const p = d.data();
              if (next[p.studentId] !== undefined)
                next[p.studentId] = { statut: p.statut, heureArrivee: p.heureArrivee || '', justification: p.justification || '' };
            });
            return next;
          });
        }
      );
      setLoading(false);
    })();
    return () => unsub?.();
  }, [session]);

  const setStatut = (sid, statut) => setAttendance(prev => ({ ...prev, [sid]: { ...prev[sid], statut } }));
  const setExtra  = (sid, key, val) => setAttendance(prev => ({ ...prev, [sid]: { ...prev[sid], [key]: val } }));
  const markAll   = (statut) => {
    const next = {};
    for (const s of students) next[s.id] = { ...attendance[s.id], statut };
    setAttendance(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = students.map(s => ({
        studentId: s.id,
        statut: attendance[s.id]?.statut || 'present',
        heureArrivee: attendance[s.id]?.heureArrivee || '',
        justification: attendance[s.id]?.justification || '',
      }));
      await presencesService.bulkUpsert(session.id, entries);
      toast.success('Feuille sauvegardée ✓');
    } catch (err) { toast.error('Erreur : ' + err.message); }
    finally { setSaving(false); }
  };

  const displayed = students.filter(s => {
    const q = search.toLowerCase();
    return !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q);
  });

  const stats = {
    present: students.filter(s => attendance[s.id]?.statut === 'present').length,
    retard:  students.filter(s => attendance[s.id]?.statut === 'retard').length,
    aj:      students.filter(s => attendance[s.id]?.statut === 'absent_justifie').length,
    anj:     students.filter(s => attendance[s.id]?.statut === 'absent_non_justifie').length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start gap-3"
             style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base truncate">{session.module}</p>
            <p className="text-blue-200 text-xs mt-0.5">
              {dateLabel(sessionDate(session))} · {session.heureDebut}–{session.heureFin}
              {session.salle ? ` · ${session.salle}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1 shrink-0"><IcoClose /></button>
        </div>

        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex gap-4 text-xs font-semibold">
          <span className="text-emerald-600">{stats.present} P</span>
          <span className="text-amber-600">{stats.retard} R</span>
          <span className="text-blue-600">{stats.aj} AJ</span>
          <span className="text-red-600">{stats.anj} ANJ</span>
          <span className="text-slate-400 ml-auto">{students.length} apprenants</span>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
          {STATUT_BTN.map(s => (
            <button key={s.value} onClick={() => markAll(s.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${s.cls} opacity-80 hover:opacity-100`}>
              Tous {s.short}
            </button>
          ))}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher…"
            className="ml-auto text-xs border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 w-36" />
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: BLUE, borderTopColor: 'transparent' }} />
            </div>
          ) : displayed.map((s, i) => {
            const att = attendance[s.id] || { statut: 'present' };
            return (
              <div key={s.id} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-300 w-5 shrink-0 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{s.nom} {s.prenom}</p>
                    <p className="text-xs text-slate-400">{s.codeApprenant || s.id}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {STATUT_BTN.map(btn => (
                      <button key={btn.value} onClick={() => setStatut(s.id, btn.value)}
                        className={`w-9 h-8 rounded-lg text-xs font-bold transition-all ${att.statut === btn.value ? btn.cls + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                        {btn.short}
                      </button>
                    ))}
                  </div>
                </div>
                {att.statut === 'retard' && (
                  <div className="mt-2 ml-8 flex items-center gap-2">
                    <label className="text-xs text-slate-500 shrink-0">Heure :</label>
                    <input type="time" value={att.heureArrivee || ''} onChange={e => setExtra(s.id, 'heureArrivee', e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                  </div>
                )}
                {att.statut === 'absent_justifie' && (
                  <div className="mt-2 ml-8">
                    <input type="text" value={att.justification || ''} onChange={e => setExtra(s.id, 'justification', e.target.value)}
                      placeholder="Motif de justification…"
                      className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-white flex gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Fermer
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-60"
            style={{ background: BLUE }}>
            {saving ? 'Sauvegarde…' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Nouvelle séance modal ─────────────────────────────────────────────────────
function NouvelleSeanceModal({ intervenant, groupes, onCreated, onClose }) {
  const toast = useToast();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    module: '',
    groupeId: '',
    date: today,
    heureDebut: '08:30',
    heureFin: '10:30',
    salle: '',
    type: 'cours',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.module.trim()) { toast.error('Le nom du module est requis'); return; }
    if (!form.groupeId) { toast.error('Sélectionnez un groupe'); return; }
    if (!form.date) { toast.error('La date est requise'); return; }
    if (!form.heureDebut || !form.heureFin) { toast.error('Les horaires sont requis'); return; }
    setSaving(true);
    try {
      const payload = {
        module: form.module.trim(),
        groupeId: form.groupeId,
        intervenantId: intervenant.id,
        date: Timestamp.fromDate(new Date(form.date)),
        heureDebut: form.heureDebut,
        heureFin: form.heureFin,
        salle: form.salle.trim(),
        type: form.type,
        statut: 'en_cours',
        emargementOuvert: true,
        createdBy: 'intervenant',
        createdAt: new Date(),
      };
      const ref = await addDoc(collection(db, 'sessions'), payload);
      const session = { id: ref.id, ...payload, date: new Date(form.date) };
      toast.success('Séance créée — feuille ouverte');
      onCreated(session);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';
  const inputCls = 'w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989] transition-colors';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between"
             style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
          <div>
            <p className="text-white font-bold text-base">Nouvelle séance</p>
            <p className="text-blue-200 text-xs mt-0.5">Créer et ouvrir la feuille immédiatement</p>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white p-1"><IcoClose /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Intervenant — grisé, non modifiable */}
          <div>
            <label className={labelCls}>Intervenant</label>
            <div className="w-full text-sm border border-slate-100 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-400 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                {intervenant.prenom?.[0]}{intervenant.nom?.[0]}
              </span>
              {intervenant.prenom} {intervenant.nom}
              <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">Vous</span>
            </div>
          </div>

          {/* Module */}
          <div>
            <label className={labelCls}>Module / Matière <span className="text-red-400">*</span></label>
            <input type="text" value={form.module} onChange={e => set('module', e.target.value)}
              placeholder="Ex : Transport International, Logistique…"
              className={inputCls} required />
          </div>

          {/* Groupe */}
          <div>
            <label className={labelCls}>Groupe <span className="text-red-400">*</span></label>
            <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)} className={inputCls} required>
              <option value="">Sélectionner un groupe…</option>
              {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Date <span className="text-red-400">*</span></label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inputCls} required />
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Début <span className="text-red-400">*</span></label>
              <input type="time" value={form.heureDebut} onChange={e => set('heureDebut', e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Fin <span className="text-red-400">*</span></label>
              <input type="time" value={form.heureFin} onChange={e => set('heureFin', e.target.value)} className={inputCls} required />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className={labelCls}>Type de séance</label>
            <div className="flex flex-wrap gap-2">
              {SESSION_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => set('type', t.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    form.type === t.value
                      ? 'border-[#005989] bg-[#005989] text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#005989]/40'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Salle */}
          <div>
            <label className={labelCls}>Salle</label>
            <input type="text" value={form.salle} onChange={e => set('salle', e.target.value)}
              placeholder="Ex : Salle A, Amphi 1…"
              className={inputCls} />
          </div>
        </form>

        <div className="px-5 py-4 border-t border-slate-100 bg-white flex gap-3">
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: BLUE }}>
            <IcoPen />
            {saving ? 'Création…' : 'Créer et faire l\'appel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Planning tab ──────────────────────────────────────────────────────────────
function PlanningTab({ sessions, onOpenEmargement, onNouvelleSeance }) {
  const upcoming = sessions.filter(s => {
    const d = sessionDate(s);
    return !isPast(d) || isToday(d);
  }).sort((a, b) => sessionDate(a) - sessionDate(b));

  const past = sessions.filter(s => {
    const d = sessionDate(s);
    return isPast(d) && !isToday(d);
  }).sort((a, b) => sessionDate(b) - sessionDate(a)).slice(0, 10);

  const renderCard = (s) => {
    const d = sessionDate(s);
    const typeCls = TYPE_COLOR[(s.type || '').toLowerCase()] || 'bg-slate-500 text-white';
    return (
      <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex gap-4">
        <div className="shrink-0 w-14 text-center">
          <p className="text-xs font-semibold text-slate-400 uppercase">{format(d, 'EEE', { locale: fr })}</p>
          <p className="text-2xl font-black text-slate-800">{format(d, 'd')}</p>
          <p className="text-xs text-slate-400">{format(d, 'MMM', { locale: fr })}</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${typeCls}`}>{s.type?.toUpperCase()}</span>
            {isToday(d) && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 shrink-0">Aujourd'hui</span>}
          </div>
          <p className="font-semibold text-slate-800 text-sm truncate">{s.module}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {s.heureDebut}–{s.heureFin}
            {s.salle ? ` · ${s.salle}` : ''}
            {s.type ? ` · ${parseHours(s.heureDebut, s.heureFin).toFixed(1)}h` : ''}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-end justify-between">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            s.statut === 'en_cours' ? 'bg-emerald-100 text-emerald-700' :
            s.statut === 'terminee' ? 'bg-slate-100 text-slate-500' :
            s.statut === 'annulee'  ? 'bg-red-100 text-red-500' :
            'bg-blue-50 text-blue-600'
          }`}>
            {s.statut === 'en_cours' ? '● En cours' : s.statut === 'terminee' ? 'Terminée' : s.statut === 'annulee' ? 'Annulée' : 'Planifiée'}
          </span>
          {s.statut === 'en_cours' && (
            <button onClick={() => onOpenEmargement(s)}
              className="mt-2 text-xs font-bold px-3 py-1.5 text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: BLUE }}>
              Signer ✍
            </button>
          )}
          {s.statut === 'terminee' && (
            <button onClick={() => onOpenEmargement(s)}
              className="mt-2 text-xs font-medium px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
              Voir
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick action */}
      <button onClick={onNouvelleSeance}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-2xl hover:opacity-90 transition-opacity shadow-sm"
        style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
        <IcoPlus />
        Nouvelle séance / Appel rapide
      </button>

      {upcoming.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Prochaines séances ({upcoming.length})</p>
          {upcoming.map(renderCard)}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400">
          <p className="text-lg mb-1">📅</p>
          <p className="text-sm">Aucune séance à venir</p>
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Séances passées</p>
          {past.map(renderCard)}
        </div>
      )}
    </div>
  );
}

// ── Emargement tab ────────────────────────────────────────────────────────────
function EmargementTab({ sessions, onOpenEmargement, onNouvelleSeance }) {
  const open   = sessions.filter(s => s.statut === 'en_cours');
  const recent = sessions.filter(s => s.statut === 'terminee')
    .sort((a, b) => sessionDate(b) - sessionDate(a)).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Quick create */}
      <button onClick={onNouvelleSeance}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-2xl hover:opacity-90 transition-opacity shadow-sm"
        style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
        <IcoPlus />
        Créer une feuille d'émargement
      </button>

      {open.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Séances ouvertes — signez maintenant
          </p>
          {open.map(s => (
            <div key={s.id} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm truncate">{s.module}</p>
                <p className="text-xs text-slate-500">{dateLabel(sessionDate(s))} · {s.heureDebut}–{s.heureFin}</p>
              </div>
              <button onClick={() => onOpenEmargement(s)}
                className="shrink-0 px-4 py-2 text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: BLUE }}>
                ✍ Signer
              </button>
            </div>
          ))}
        </div>
      )}

      {recent.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Feuilles récentes</p>
          {recent.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 text-sm truncate">{s.module}</p>
                <p className="text-xs text-slate-400">
                  {format(sessionDate(s), 'd MMM yyyy', { locale: fr })} · {s.heureDebut}–{s.heureFin}
                  {s.salle ? ` · ${s.salle}` : ''}
                </p>
              </div>
              <button onClick={() => onOpenEmargement(s)}
                className="shrink-0 text-xs font-medium px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-colors">
                Voir / Corriger
              </button>
            </div>
          ))}
        </div>
      )}

      {open.length === 0 && recent.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">✍</p>
          <p className="font-medium">Aucune feuille disponible</p>
          <p className="text-sm mt-1">Créez une séance ou attendez l'ouverture par l'administration</p>
        </div>
      )}
    </div>
  );
}

// ── Statistiques tab ──────────────────────────────────────────────────────────
function StatistiquesTab({ sessions, intervenant }) {
  const now = new Date();

  const monthlyData = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      if (s.statut === 'annulee') continue;
      const d = sessionDate(s);
      const key = format(d, 'yyyy-MM');
      if (!map[key]) map[key] = { heures: 0, seances: 0, label: format(d, 'MMM yyyy', { locale: fr }) };
      map[key].heures += parseHours(s.heureDebut, s.heureFin);
      map[key].seances++;
    }
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, ...v, heures: Math.round(v.heures * 10) / 10 }));
  }, [sessions]);

  const totalHeures = useMemo(() =>
    sessions.filter(s => s.statut === 'terminee').reduce((acc, s) => acc + parseHours(s.heureDebut, s.heureFin), 0),
    [sessions]);

  const heuresCeMois = useMemo(() => {
    const thisMonth = format(now, 'yyyy-MM');
    return sessions
      .filter(s => s.statut !== 'annulee' && format(sessionDate(s), 'yyyy-MM') === thisMonth)
      .reduce((acc, s) => acc + parseHours(s.heureDebut, s.heureFin), 0);
  }, [sessions]);

  const groupesUniques = useMemo(() => new Set(sessions.map(s => s.groupeId).filter(Boolean)).size, [sessions]);

  const seancesCeMois = useMemo(() => {
    const thisMonth = format(now, 'yyyy-MM');
    return sessions.filter(s => s.statut !== 'annulee' && format(sessionDate(s), 'yyyy-MM') === thisMonth).length;
  }, [sessions]);

  const tarifHoraire = intervenant?.tauxHoraire || 0;
  const montantTotal = tarifHoraire ? Math.round(totalHeures * tarifHoraire) : 0;
  const montantCeMois = tarifHoraire ? Math.round(heuresCeMois * tarifHoraire) : 0;

  const maxHeures = Math.max(...monthlyData.map(m => m.heures), 1);

  const StatCard = ({ label, value, sub, color = BLUE }) => (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-black" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Heures enseignées" value={`${Math.round(totalHeures * 10) / 10}h`} sub="Séances terminées" />
        <StatCard label="Ce mois" value={`${Math.round(heuresCeMois * 10) / 10}h`} sub={`${seancesCeMois} séance${seancesCeMois !== 1 ? 's' : ''}`} color="#059669" />
        <StatCard label="Groupes suivis" value={groupesUniques} sub="Groupes distincts" color="#7c3aed" />
        <StatCard label="Total séances" value={sessions.filter(s => s.statut !== 'annulee').length} sub="Hors annulées" color="#d97706" />
      </div>

      {/* Payment section */}
      {tarifHoraire > 0 && (
        <div className="bg-gradient-to-br from-[#002d47] to-[#005989] rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-3">Rémunération estimée</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-black">{montantTotal.toLocaleString('fr-MA')} <span className="text-lg font-semibold text-blue-200">DH</span></p>
              <p className="text-blue-300 text-xs mt-0.5">Total heures terminées</p>
            </div>
            <div>
              <p className="text-3xl font-black">{montantCeMois.toLocaleString('fr-MA')} <span className="text-lg font-semibold text-blue-200">DH</span></p>
              <p className="text-blue-300 text-xs mt-0.5">Ce mois</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-blue-300 text-xs">Tarif horaire</span>
            <span className="text-white font-bold text-sm">{tarifHoraire} DH/h</span>
          </div>
        </div>
      )}

      {/* Monthly chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-bold text-slate-800 text-sm">Masse horaire mensuelle</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {monthlyData.slice(-8).map(m => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20 shrink-0 capitalize">{m.label}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(4, (m.heures / maxHeures) * 100)}%`, background: BLUE }}>
                    <span className="text-white text-[10px] font-bold">{m.heures}h</span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 w-12 text-right">{m.seances} séance{m.seances !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown by type */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="font-bold text-slate-800 text-sm">Répartition par type</p>
          </div>
          <div className="divide-y divide-slate-50">
            {Object.entries(
              sessions.filter(s => s.statut !== 'annulee').reduce((acc, s) => {
                const t = s.type || 'autre';
                if (!acc[t]) acc[t] = { heures: 0, seances: 0 };
                acc[t].heures += parseHours(s.heureDebut, s.heureFin);
                acc[t].seances++;
                return acc;
              }, {})
            ).sort(([, a], [, b]) => b.heures - a.heures).map(([type, data]) => (
              <div key={type} className="px-5 py-3 flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_COLOR[type] || 'bg-slate-500 text-white'}`}>
                  {type.toUpperCase()}
                </span>
                <span className="flex-1 text-sm text-slate-600">{data.seances} séance{data.seances !== 1 ? 's' : ''}</span>
                <span className="text-sm font-bold text-slate-800">{Math.round(data.heures * 10) / 10}h</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-sm">Aucune donnée disponible</p>
        </div>
      )}
    </div>
  );
}

// ── Profil tab ─────────────────────────────────────────────────────────────────
function ProfilTab({ intervenant, auth, sessions }) {
  const totalH = sessions.filter(s => s.statut === 'terminee')
    .reduce((acc, s) => acc + parseHours(s.heureDebut, s.heureFin), 0);

  return (
    <div className="space-y-4 max-w-lg">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
             style={{ background: 'linear-gradient(135deg,#002d47,#005989)' }}>
          {(intervenant?.prenom?.[0] || '?').toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">{intervenant?.prenom} {intervenant?.nom}</p>
          <p className="text-sm text-slate-400">{intervenant?.specialite || 'Intervenant IFTL'}</p>
          {intervenant?.email && <p className="text-xs text-slate-400 mt-0.5">{intervenant.email}</p>}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {[
          { label: 'Téléphone',           value: intervenant?.telephone },
          { label: 'Spécialité',           value: intervenant?.specialite },
          { label: 'Total séances',        value: `${sessions.length} séances` },
          { label: 'Heures enseignées',    value: `${Math.round(totalH * 10) / 10} h` },
          intervenant?.tauxHoraire ? { label: 'Taux horaire', value: `${intervenant.tauxHoraire} DH/h` } : null,
        ].filter(Boolean).filter(r => r.value).map(row => (
          <div key={row.label} className="px-5 py-3 flex items-center justify-between border-b border-slate-50 last:border-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{row.label}</span>
            <span className="text-sm font-medium text-slate-700">{row.value}</span>
          </div>
        ))}
      </div>

      <button onClick={auth.logout}
        className="w-full mt-2 px-4 py-3 border border-red-200 text-red-500 hover:bg-red-50 rounded-2xl text-sm font-semibold transition-colors flex items-center justify-center gap-2">
        <IcoLogout />
        Se déconnecter
      </button>
    </div>
  );
}

// ── Sidebar link ──────────────────────────────────────────────────────────────
function SideNavLink({ tab, active, badge, onClick }) {
  const { Icon, label } = tab;
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left relative"
      style={active ? { background: 'rgba(255,255,255,0.16)', color: 'white' } : { color: 'rgba(255,255,255,0.55)' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'white'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
    >
      {active && <span className="absolute left-0 w-1 h-6 rounded-r-full bg-white" />}
      <Icon />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PortailIntervenant({ auth }) {
  const toast = useToast();
  const [intervenant, setIntervenant]   = useState(null);
  const [sessions, setSessions]         = useState([]);
  const [groupes, setGroupes]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);
  const [activeTab, setActiveTab]       = useState('planning');
  const [selectedSession, setSelectedSession]   = useState(null);
  const [showNouvelleSeance, setShowNouvelleSeance] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen]   = useState(false);

  const loadData = useCallback(async () => {
    const email = auth.user?.email;
    if (!email) return;
    setLoading(true);
    try {
      // Load intervenant doc
      const intSnap = await getDocs(query(collection(db, 'intervenants'), where('email', '==', email)));
      if (intSnap.empty) { setNotFound(true); setLoading(false); return; }
      const intDoc = { id: intSnap.docs[0].id, ...intSnap.docs[0].data() };
      setIntervenant(intDoc);

      // Load sessions + groupes in parallel
      const [sessSnap, groupeSnap] = await Promise.all([
        getDocs(query(collection(db, 'sessions'), where('intervenantId', '==', intDoc.id))),
        getDocs(collection(db, 'groupes')),
      ]);

      const list = [];
      sessSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setSessions(list.sort((a, b) => sessionDate(b) - sessionDate(a)));

      const grpList = [];
      groupeSnap.forEach(d => grpList.push({ id: d.id, ...d.data() }));
      setGroupes(grpList.filter(g => g.actif !== false).sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
    } catch (err) {
      toast.error('Erreur chargement : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCount = sessions.filter(s => s.statut === 'en_cours').length;
  const initials  = (intervenant?.prenom?.[0] || '?').toUpperCase();

  const handleSeanceCreated = (session) => {
    setSessions(prev => [session, ...prev]);
    setShowNouvelleSeance(false);
    setSelectedSession(session);
  };

  const tabTitles = {
    planning: 'Mon Planning',
    emargement: 'Feuilles de présence',
    statistiques: 'Mes Statistiques',
    profil: 'Mon Profil',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100">
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: BLUE, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Compte non lié</h2>
          <p className="text-sm text-slate-500 mb-4">
            Aucun profil intervenant trouvé pour <strong>{auth.user?.email}</strong>.<br />
            Contactez l'administration.
          </p>
          <button onClick={auth.logout} className="px-4 py-2 text-white rounded-xl text-sm font-medium" style={{ background: BLUE }}>
            Se déconnecter
          </button>
        </div>
      </div>
    );
  }

  const sidebarContent = (onLinkClick) => (
    <>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
            <span className="text-white font-black text-base">IF</span>
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">IFTL</p>
            <p className="text-blue-300 text-[10px] leading-tight">Portail Intervenant</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
               style={{ background: 'rgba(255,255,255,0.15)' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold truncate">{intervenant?.prenom} {intervenant?.nom}</p>
            <p className="text-blue-300 text-xs truncate">{intervenant?.specialite || 'Intervenant'}</p>
          </div>
        </div>
      </div>

      {/* Quick action */}
      <div className="px-3 pt-3">
        <button onClick={() => { setShowNouvelleSeance(true); onLinkClick?.(); }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ background: 'rgba(255,255,255,0.12)', color: 'white' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
          <IcoPlus />
          Nouvelle séance
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 relative">
        {TABS.map(tab => (
          <SideNavLink key={tab.id} tab={tab} active={activeTab === tab.id}
            badge={tab.id === 'emargement' ? openCount : 0}
            onClick={() => { setActiveTab(tab.id); onLinkClick?.(); }} />
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <button onClick={auth.logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-300 transition-all"
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
          <IcoLogout /> Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#f1f5f9' }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-64 z-40 shadow-2xl"
             style={{ background: 'linear-gradient(180deg,#002d47 0%,#00436e 60%,#005989 100%)' }}>
        {sidebarContent(null)}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative w-64 flex flex-col h-full shadow-2xl z-10"
                 style={{ background: 'linear-gradient(180deg,#002d47 0%,#005989 100%)' }}>
            <div className="absolute top-4 right-4">
              <button onClick={() => setMobileSidebarOpen(false)} className="text-white/60 hover:text-white p-1"><IcoClose /></button>
            </div>
            {sidebarContent(() => setMobileSidebarOpen(false))}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">

        {/* Mobile top header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <button onClick={() => setMobileSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-slate-100"><IcoMenu /></button>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: BLUE }}>
                  <span className="text-white font-black text-xs">IF</span>
                </div>
                <span className="font-bold text-slate-800 text-sm">Portail Intervenant</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {openCount > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                  {openCount} ouverte{openCount > 1 ? 's' : ''}
                </span>
              )}
              <HelpButton role="intervenant" color="#005989" />
              <button onClick={() => setShowNouvelleSeance(true)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600" title="Nouvelle séance">
                <IcoPlus />
              </button>
              <button onClick={auth.logout} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><IcoLogout /></button>
            </div>
          </div>
        </header>

        {/* Desktop page header */}
        <div className="hidden lg:block px-8 pt-8 pb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
            {TABS.find(t => t.id === activeTab)?.label}
          </p>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-black text-slate-800">{tabTitles[activeTab]}</h1>
            <div className="flex items-center gap-3">
              {activeTab === 'emargement' && openCount > 0 && (
                <span className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {openCount} séance{openCount > 1 ? 's' : ''} ouverte{openCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 px-4 lg:px-8 pb-24 lg:pb-10 pt-4 lg:pt-0">
          <div className="max-w-3xl">
            {activeTab === 'planning' && (
              <PlanningTab sessions={sessions} onOpenEmargement={setSelectedSession} onNouvelleSeance={() => setShowNouvelleSeance(true)} />
            )}
            {activeTab === 'emargement' && (
              <EmargementTab sessions={sessions} onOpenEmargement={setSelectedSession} onNouvelleSeance={() => setShowNouvelleSeance(true)} />
            )}
            {activeTab === 'statistiques' && (
              <StatistiquesTab sessions={sessions} intervenant={intervenant} />
            )}
            {activeTab === 'profil' && (
              <ProfilTab intervenant={intervenant} auth={auth} sessions={sessions} />
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-lg">
        <div className="flex">
          {TABS.map(tab => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 relative"
                style={{ color: active ? BLUE : '#94a3b8' }}>
                <tab.Icon />
                <span className="text-[9px] font-semibold leading-none">{tab.short}</span>
                {tab.id === 'emargement' && openCount > 0 && (
                  <span className="absolute top-1 right-3 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {openCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Nouvelle séance modal */}
      {showNouvelleSeance && intervenant && (
        <NouvelleSeanceModal
          intervenant={intervenant}
          groupes={groupes}
          onCreated={handleSeanceCreated}
          onClose={() => setShowNouvelleSeance(false)}
        />
      )}

      {/* Emargement panel modal */}
      {selectedSession && (
        <EmargementPanel session={selectedSession} onClose={() => setSelectedSession(null)} toast={toast} />
      )}
    </div>
  );
}
