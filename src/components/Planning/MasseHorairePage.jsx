import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { affectationsService, sessionsService } from '../../services/firestore';
import { useGroupes, useIntervenants } from '../../hooks/useData';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const ANNEE = '2026-2027';
const ALERT_HEURES = 4;

// ── helpers ───────────────────────────────────────────────────────────────────
function parseDuration(heureDebut, heureFin) {
  const [sh, sm] = (heureDebut || '0:0').split(':').map(Number);
  const [eh, em] = (heureFin   || '0:0').split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}

function Badge({ children, color = 'slate' }) {
  const colors = {
    green:  'bg-green-50 text-green-700 border-green-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    slate:  'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colors[color]}`}>
      {children}
    </span>
  );
}

function ProgressBar({ done, total }) {
  const pct = total > 0 ? Math.min(100, Math.round(100 * done / total)) : 0;
  const color = pct >= 100 ? 'bg-slate-400' : pct >= 80 ? 'bg-orange-400' : 'bg-[#005989]';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 whitespace-nowrap">{pct}%</span>
    </div>
  );
}

// ── Modal Affectation ─────────────────────────────────────────────────────────
function AffectationModal({ initial, modules, groupes, intervenants, annee, onSave, onClose }) {
  const [form, setForm] = useState({
    moduleId:      initial?.moduleId      || '',
    groupeId:      initial?.groupeId      || '',
    intervenantId: initial?.intervenantId || '',
    masseHoraire:  initial?.masseHoraire  || '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.moduleId || !form.groupeId || !form.intervenantId || !form.masseHoraire) return;
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800">
          {initial?.id ? 'Modifier' : 'Ajouter'} une affectation
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Module</label>
            <select value={form.moduleId} onChange={e => set('moduleId', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
              <option value="">— Choisir —</option>
              {modules.sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(m => (
                <option key={m.id} value={m.id}>{m.nom} ({m.code||m.id})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Groupe</label>
            <select value={form.groupeId} onChange={e => set('groupeId', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
              <option value="">— Choisir —</option>
              {groupes.sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(g => (
                <option key={g.id} value={g.id}>{g.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Intervenant</label>
            <select value={form.intervenantId} onChange={e => set('intervenantId', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
              <option value="">— Choisir —</option>
              {intervenants.sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(i => (
                <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Masse horaire (heures)</label>
            <input type="number" min="0" step="0.5" value={form.masseHoraire}
              onChange={e => set('masseHoraire', parseFloat(e.target.value) || '')}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]"
              placeholder="ex: 30" />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose}
            className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
          <button onClick={handleSave}
            disabled={!form.moduleId || !form.groupeId || !form.intervenantId || !form.masseHoraire}
            className="flex-1 py-2 bg-[#005989] text-white rounded-xl text-sm font-semibold hover:bg-[#004a73] disabled:opacity-40">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Alerte Banner ─────────────────────────────────────────────────────────────
function AlertBanner({ alerts }) {
  if (!alerts.length) return null;
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
      <p className="text-sm font-bold text-red-700 mb-2">
        ⚠ {alerts.length} alerte{alerts.length > 1 ? 's' : ''} masse horaire
      </p>
      <ul className="space-y-1">
        {alerts.map((a, i) => (
          <li key={i} className="text-xs text-red-600">• {a}</li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MasseHorairePage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: groupes } = useGroupes();
  const { data: intervenants } = useIntervenants();

  const [affectations, setAffectations] = useState([]);
  const [modules, setModules]   = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAff, setEditAff]   = useState(null);
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterInterv, setFilterInterv] = useState('');
  const [filterAlert, setFilterAlert]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Modules
      const mSnap = await getDocs(query(collection(db, 'modules'), orderBy('nom', 'asc')));
      const mods = [];
      mSnap.forEach(d => mods.push({ id: d.id, ...d.data() }));
      setModules(mods);

      // Affectations
      const aff = await affectationsService.getAll(ANNEE);
      setAffectations(aff);

      // Sessions for the year (only those with moduleId set)
      const sSnap = await getDocs(query(collection(db, 'sessions'), where('anneeAcademique', '==', ANNEE)));
      const sess = [];
      sSnap.forEach(d => sess.push({ id: d.id, ...d.data() }));
      setSessions(sess);
    } catch (e) {
      toast.error('Erreur chargement: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Enrich affectations with computed fields
  const enriched = affectations.map(aff => {
    const mod  = modules.find(m => m.id === aff.moduleId);
    const grp  = groupes.find(g => g.id === aff.groupeId);
    const intv = intervenants.find(i => i.id === aff.intervenantId);

    const heuresFaites = affectationsService.computeHeuresFaites(aff, sessions);
    const heuresRestantes = Math.max(0, (aff.masseHoraire || 0) - heuresFaites);

    // Check EFM/CC
    const sessionsPourModule = sessions.filter(s =>
      s.moduleId === aff.moduleId && s.groupeId === aff.groupeId
    );
    const efmProgramme = sessionsPourModule.some(s => ['efm', 'eff', 'exam'].includes(s.type));
    const ccProgramme  = sessionsPourModule.some(s => s.type === 'cc');

    return {
      ...aff,
      moduleName:   mod?.nom  || aff.moduleId,
      groupeNom:    grp?.nom  || aff.groupeId,
      intervenantNom: intv ? `${intv.prenom} ${intv.nom}` : aff.intervenantId,
      heuresFaites,
      heuresRestantes,
      efmProgramme,
      ccProgramme,
      alertFin:   heuresRestantes > 0 && heuresRestantes <= ALERT_HEURES,
      alertEfm:   !efmProgramme,
      alertCc:    !ccProgramme,
      pctFait:    aff.masseHoraire > 0 ? Math.min(100, Math.round(100 * heuresFaites / aff.masseHoraire)) : 0,
    };
  });

  // Build global alerts
  const alerts = [];
  for (const e of enriched) {
    if (e.alertFin) alerts.push(`${e.moduleName} (${e.groupeNom}) — il reste ${e.heuresRestantes}h pour ${e.intervenantNom}`);
    if (e.alertEfm) alerts.push(`${e.moduleName} (${e.groupeNom}) — aucun EFM/EFF programmé`);
  }

  // Filter
  const rows = enriched.filter(e => {
    if (filterGroupe && e.groupeId !== filterGroupe) return false;
    if (filterInterv && e.intervenantId !== filterInterv) return false;
    if (filterAlert && !e.alertFin && !e.alertEfm) return false;
    return true;
  });

  const handleSave = async (form) => {
    try {
      await affectationsService.upsert(
        form.intervenantId, form.moduleId, form.groupeId,
        parseFloat(form.masseHoraire), ANNEE
      );
      toast.success('Affectation enregistrée');
      setShowModal(false); setEditAff(null);
      load();
    } catch (e) { toast.error('Erreur: ' + e.message); }
  };

  const handleDelete = async (aff) => {
    const ok = await confirm({ title: 'Supprimer cette affectation ?', danger: true, confirmLabel: 'Supprimer' });
    if (!ok) return;
    try {
      await affectationsService.delete(aff.id);
      toast.success('Supprimé');
      load();
    } catch (e) { toast.error('Erreur: ' + e.message); }
  };

  // Stats summary
  const totalMH    = enriched.reduce((s, e) => s + (e.masseHoraire || 0), 0);
  const totalFait  = enriched.reduce((s, e) => s + e.heuresFaites, 0);
  const alertCount = enriched.filter(e => e.alertFin || e.alertEfm).length;

  return (
    <div className="space-y-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Masse Horaire</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Suivi des volumes horaires par module et intervenant — {ANNEE}
          </p>
        </div>
        <button
          onClick={() => { setEditAff(null); setShowModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#005989] text-white rounded-xl text-sm font-semibold hover:bg-[#004a73] shadow-sm">
          + Ajouter affectation
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Affectations', value: enriched.length, color: 'text-[#005989]' },
          { label: 'Heures prévues', value: `${totalMH}h`, color: 'text-slate-700' },
          { label: 'Heures effectuées', value: `${Math.round(totalFait * 10) / 10}h`, color: 'text-green-700' },
          { label: 'Alertes actives', value: alertCount, color: alertCount > 0 ? 'text-red-700' : 'text-slate-400' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 font-medium">{k.label}</p>
            <p className={`text-2xl font-black mt-0.5 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alert banner */}
      <AlertBanner alerts={alerts} />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
          <option value="">Tous les groupes</option>
          {groupes.sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(g => (
            <option key={g.id} value={g.id}>{g.nom}</option>
          ))}
        </select>
        <select value={filterInterv} onChange={e => setFilterInterv(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#005989]">
          <option value="">Tous les intervenants</option>
          {intervenants.sort((a,b) => (a.nom||'').localeCompare(b.nom||'')).map(i => (
            <option key={i.id} value={i.id}>{i.prenom} {i.nom}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
          <input type="checkbox" checked={filterAlert} onChange={e => setFilterAlert(e.target.checked)} />
          Alertes seulement
        </label>
        {(filterGroupe || filterInterv || filterAlert) && (
          <button onClick={() => { setFilterGroupe(''); setFilterInterv(''); setFilterAlert(false); }}
            className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl">
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <div className="w-8 h-8 border-3 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-2xl mb-2">📊</p>
          <p className="text-slate-600 font-semibold">Aucune affectation trouvée</p>
          <p className="text-slate-400 text-sm mt-1">Cliquez sur "Ajouter affectation" pour commencer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Module</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Groupe</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Intervenant</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">MH</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Faites</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Restantes</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Progression</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">EFM</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">CC</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Statut</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e, idx) => (
                  <tr key={e.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                    e.alertFin ? 'bg-red-50/50' : ''
                  }`}>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate" title={e.moduleName}>
                      {e.moduleName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.groupeNom}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{e.intervenantNom}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                      {e.masseHoraire}h
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 font-semibold tabular-nums whitespace-nowrap">
                      {e.heuresFaites}h
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums whitespace-nowrap ${
                      e.alertFin ? 'text-red-700' : 'text-slate-700'
                    }`}>
                      {e.alertFin && '⚠ '}{e.heuresRestantes}h
                    </td>
                    <td className="px-4 py-3 min-w-[120px]">
                      <ProgressBar done={e.heuresFaites} total={e.masseHoraire} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.efmProgramme
                        ? <Badge color="green">✓</Badge>
                        : <Badge color="red">✗</Badge>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.ccProgramme
                        ? <Badge color="green">✓</Badge>
                        : <Badge color="orange">✗</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {e.pctFait >= 100
                        ? <Badge color="slate">Terminé</Badge>
                        : e.alertFin
                          ? <Badge color="red">Fin proche</Badge>
                          : e.pctFait >= 75
                            ? <Badge color="orange">En cours</Badge>
                            : <Badge color="blue">En cours</Badge>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditAff(e); setShowModal(true); }}
                          className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer">
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
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
            {rows.length} affectation{rows.length > 1 ? 's' : ''} affichée{rows.length > 1 ? 's' : ''}
            {' '}— Alerte fin de module : ≤ {ALERT_HEURES}h restantes
          </div>
        </div>
      )}

      {showModal && (
        <AffectationModal
          initial={editAff}
          modules={modules}
          groupes={groupes}
          intervenants={intervenants}
          annee={ANNEE}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditAff(null); }}
        />
      )}
    </div>
  );
}
