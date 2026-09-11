import { useState } from 'react';
import { collection, writeBatch, doc, getDocs, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { SEED_GROUPES, SEED_STUDENTS } from '../../data/seedData';

const BRAND = { blue: '#005989', yellow: '#f5c845', red: '#c8141b', green: '#c8d45d', orange: '#d75930' };

function Step({ num, title, desc, status, onRun, loading }) {
  const statusCfg = {
    idle:    { bg: '#f8fafc', brd: '#e2e8f0', badge: 'bg-slate-100 text-slate-500' },
    running: { bg: '#eff6ff', brd: '#bfdbfe', badge: 'bg-blue-100 text-blue-700' },
    done:    { bg: '#f0fdf4', brd: '#bbf7d0', badge: 'bg-green-100 text-green-700' },
    error:   { bg: '#fef2f2', brd: '#fecaca', badge: 'bg-red-100 text-red-700' },
  };
  const cfg = statusCfg[status] || statusCfg.idle;

  return (
    <div className="rounded-xl p-4 border transition-all" style={{ background: cfg.bg, borderColor: cfg.brd }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
               style={{ background: status === 'done' ? BRAND.green : status === 'error' ? BRAND.red : BRAND.blue }}>
            {status === 'done' ? '✓' : status === 'error' ? '!' : num}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </div>
        </div>
        <button
          onClick={onRun}
          disabled={loading || status === 'done'}
          className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: status === 'done' ? BRAND.green : BRAND.blue }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              En cours…
            </span>
          ) : status === 'done' ? 'Terminé ✓' : 'Lancer'}
        </button>
      </div>
    </div>
  );
}

async function batchWrite(collectionName, items, idField = null) {
  const BATCH_SIZE = 450;
  let count = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + BATCH_SIZE);
    for (const item of chunk) {
      const { id: _id, ...data } = item;
      const ref = idField ? doc(db, collectionName, item[idField]) : doc(collection(db, collectionName));
      batch.set(ref, { ...data, importedAt: new Date() });
      count++;
    }
    await batch.commit();
  }
  return count;
}

async function checkExisting(collectionName) {
  const snap = await getDocs(query(collection(db, collectionName)));
  return snap.size;
}

export default function ImportDataPage() {
  const [steps, setSteps] = useState({ groupes: 'idle', students: 'idle' });
  const [loading, setLoading] = useState({ groupes: false, students: false });
  const [results, setResults] = useState({});
  const [log, setLog] = useState([]);

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev, { msg, type, ts: new Date().toLocaleTimeString() }]);
  };

  const runStep = async (step) => {
    setLoading(prev => ({ ...prev, [step]: true }));
    setSteps(prev => ({ ...prev, [step]: 'running' }));
    addLog(`Démarrage : import ${step}…`);

    try {
      if (step === 'groupes') {
        const existing = await checkExisting('groupes');
        if (existing > 0) {
          addLog(`⚠ ${existing} groupes déjà présents — import ignoré`, 'warn');
        } else {
          const count = await batchWrite('groupes', SEED_GROUPES, 'id');
          addLog(`✓ ${count} groupes importés`, 'ok');
          setResults(prev => ({ ...prev, groupes: count }));
        }
      }

      if (step === 'students') {
        const existing = await checkExisting('students');
        if (existing > 10) {
          addLog(`⚠ ${existing} apprenants déjà présents — import ignoré`, 'warn');
        } else {
          const count = await batchWrite('students', SEED_STUDENTS, 'codeApprenant');
          addLog(`✓ ${count} apprenants importés`, 'ok');
          setResults(prev => ({ ...prev, students: count }));
        }
      }

      setSteps(prev => ({ ...prev, [step]: 'done' }));
    } catch (err) {
      console.error(err);
      addLog(`✗ Erreur : ${err.message}`, 'error');
      setSteps(prev => ({ ...prev, [step]: 'error' }));
    } finally {
      setLoading(prev => ({ ...prev, [step]: false }));
    }
  };

  const runAll = async () => {
    await runStep('groupes');
    await runStep('students');
  };

  const logColors = { info: 'text-slate-600', ok: 'text-green-700', warn: 'text-amber-700', error: 'text-red-700' };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Import des données</h1>
        <p className="text-sm text-slate-500 mt-1">
          Importer les apprenants et groupes depuis les listes officielles 2025-2026
        </p>
      </div>

      {/* Warning */}
      <div className="rounded-xl p-4 flex gap-3"
           style={{ background: '#fffbeb', border: `1px solid ${BRAND.yellow}` }}>
        <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: BRAND.orange }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="text-sm font-semibold" style={{ color: BRAND.orange }}>Opération irréversible</p>
          <p className="text-xs text-slate-600 mt-0.5">
            L'import ne s'exécute qu'une seule fois : si des données existent déjà, l'opération est ignorée.
            <br />Données : <strong>149 apprenants 1A TS</strong> + <strong>142 apprenants 2A TS</strong> + <strong>55 Licence CNAM</strong> = 346 apprenants · 14 groupes.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <Step
          num="1" title="Import des groupes" status={steps.groupes} loading={loading.groupes}
          desc={`14 groupes (1A TS, 2A TS, Licence CNAM) — ${SEED_GROUPES.length} entrées`}
          onRun={() => runStep('groupes')}
        />
        <Step
          num="2" title="Import des apprenants" status={steps.students} loading={loading.students}
          desc={`346 apprenants avec CIN, code, filière et groupe — ${SEED_STUDENTS.length} entrées`}
          onRun={() => runStep('students')}
        />
      </div>

      {/* All-in-one button */}
      <button
        onClick={runAll}
        disabled={Object.values(loading).some(Boolean) || Object.values(steps).every(s => s === 'done')}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
        style={{ background: BRAND.blue }}
      >
        {Object.values(steps).every(s => s === 'done')
          ? '✓ Import terminé'
          : Object.values(loading).some(Boolean)
            ? 'Import en cours…'
            : 'Tout importer en une fois'}
      </button>

      {/* Log */}
      {log.length > 0 && (
        <div className="rounded-xl bg-slate-900 p-4 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Journal</p>
          {log.map((entry, i) => (
            <div key={i} className="flex gap-2 text-xs font-mono">
              <span className="text-slate-500 shrink-0">{entry.ts}</span>
              <span className={logColors[entry.type]}>{entry.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
