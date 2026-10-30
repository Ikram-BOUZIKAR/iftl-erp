import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import POPULATION_2026 from '../../data/population-2026-2027.json';

const ANNEE_DEFAUT = '2026-2027';
const BATCH_SIZE = 499;

// ── Parser CSV pour les imports futurs ───────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const parse = l => { const c=[],re=new RegExp(`("(?:[^"]|"")*"|[^${sep}]*)${sep}?`,'g'); let m; while((m=re.exec(l))&&m[0]!=='')c.push(m[1].replace(/^"|"$/g,'').replace(/""/g,'"').trim()); return c; };
  const headers = parse(lines[0]).map(h => h.toLowerCase().replace(/[éèê]/g,'e').replace(/[àâ]/g,'a').replace(/[^a-z0-9]/g,''));
  return lines.slice(1).filter(l=>l.trim()).map(line => {
    const cells = parse(line); const obj = {};
    headers.forEach((h,i) => { obj[h] = cells[i]||''; });
    return obj;
  });
}

function csvToStudents(rows, annee) {
  return rows.map(r => ({
    nom:           (r.nom||r.name||'').toUpperCase().trim(),
    prenom:        (r.prenom||r.firstname||r.prénom||'').trim(),
    codeApprenant: (r.codeapprenant||r.code||r.matricule||'').trim(),
    cin:           (r.cin||'').trim(),
    groupe:        (r.groupe||r.group||'').trim(),
    niveau:        (r.niveau||r.level||'').trim(),
    filiereCode:   (r.filierecode||r.filiere||r.code_filiere||'').trim().toUpperCase(),
    anneeAcademique: annee,
    anneeFormation:  (r.niveau||'').includes('2A') ? '2' : (r.niveau||'').includes('1A') ? '1' : '',
    statut: 'actif',
  })).filter(s => s.codeApprenant && s.nom);
}

const BADGE = {
  '2A TS':  'bg-violet-100 text-violet-700 border-violet-200',
  '1A TS':  'bg-blue-100 text-blue-700 border-blue-200',
  'QUALIF': 'bg-amber-100 text-amber-700 border-amber-200',
};

function Spinner({ small }) {
  const sz = small ? 'w-4 h-4 border-2' : 'w-6 h-6 border-2';
  return <div className={`${sz} border-[#005989] border-t-transparent rounded-full animate-spin`} />;
}

export default function ImportPopulationPage() {
  const toast   = useToast();
  const confirm = useConfirm();
  const fileRef = useRef(null);

  const [tab, setTab]                   = useState('2026');  // '2026' | 'new'
  const [groupesMap, setGroupesMap]     = useState(null);
  const [existingCodes, setExistingCodes] = useState(null);
  const [loading, setLoading]           = useState(true);
  const [importing, setImporting]       = useState(false);
  const [result, setResult]             = useState(null);
  const [filterNiveau, setFilterNiveau] = useState('tous');
  // Pour import CSV nouvelle année
  const [csvStudents, setCsvStudents]   = useState(null);
  const [csvAnnee, setCsvAnnee]         = useState('2027-2028');

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [groupesSnap, studentsSnap] = await Promise.all([
          getDocs(collection(db, 'groupes')),
          getDocs(collection(db, 'students')),
        ]);
        const map = {};
        groupesSnap.docs.forEach(d => {
          const data = d.data();
          if (data.nom) map[data.nom] = { id: d.id, nom: data.nom };
        });
        setGroupesMap(map);
        setExistingCodes(new Set(
          studentsSnap.docs.map(d => (d.data().codeApprenant || '').toUpperCase()).filter(Boolean)
        ));
      } catch (err) {
        toast.error('Erreur chargement : ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Handler CSV nouvelle année ────────────────────────────────────────────
  const handleCSVFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result);
      const students = csvToStudents(rows, csvAnnee);
      setCsvStudents(students);
      if (students.length === 0) toast.error('Aucun étudiant trouvé dans le CSV.');
      else toast.success(`${students.length} étudiants lus depuis le CSV.`);
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // ── Calcul des étudiants à importer ──────────────────────────────────────
  const sourceData = tab === '2026' ? POPULATION_2026 : (csvStudents || []);

  const enriched = useMemo(() => {
    if (!groupesMap || !existingCodes) return [];
    return sourceData.map(s => {
      const groupeInfo = groupesMap[s.groupe];
      return {
        ...s,
        groupeId:    groupeInfo?.id || '',
        groupeFound: !!groupeInfo,
        duplicate:   existingCodes.has(s.codeApprenant.toUpperCase()),
      };
    });
  }, [groupesMap, existingCodes]);

  const toImport  = useMemo(() => enriched.filter(s => !s.duplicate), [enriched]);
  const dupes     = useMemo(() => enriched.filter(s => s.duplicate), [enriched]);
  const noGroupe  = useMemo(() => toImport.filter(s => !s.groupeFound), [toImport]);

  const filtered = useMemo(() => {
    if (filterNiveau === 'tous') return toImport;
    return toImport.filter(s => s.niveau === filterNiveau);
  }, [toImport, filterNiveau]);

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (toImport.length === 0) return;
    const ok = await confirm({
      title: 'Importer la population',
      message: `Créer ${toImport.length} apprenant(s) dans Firestore (${anneeLabel || ANNEE_DEFAUT}) ?`,
      confirmText: 'Importer',
      confirmClass: 'bg-[#005989] hover:bg-[#004a73] text-white',
    });
    if (!ok) return;

    setImporting(true);
    let created = 0;
    const errors = [];
    const chunks = [];
    for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
      chunks.push(toImport.slice(i, i + BATCH_SIZE));
    }

    try {
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const s of chunk) {
          const ref = doc(collection(db, 'students'));
          const { duplicate, groupeFound, ...payload } = s;
          batch.set(ref, payload);
          created++;
        }
        await batch.commit();
      }
      setResult({ created, errors: [] });
      toast.success(`${created} apprenant(s) importé(s).`);
      // Refresh existing codes
      const snap = await getDocs(collection(db, 'students'));
      setExistingCodes(new Set(
        snap.docs.map(d => (d.data().codeApprenant || '').toUpperCase()).filter(Boolean)
      ));
    } catch (err) {
      toast.error('Erreur import : ' + err.message);
      setResult({ created, errors: [err.message] });
    } finally {
      setImporting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-3 text-slate-500">
      <Spinner /><span>Chargement des données Firestore…</span>
    </div>
  );

  const niveaux = ['tous', '2A TS', '1A TS', 'QUALIF'];
  const anneeLabel = tab === '2026' ? ANNEE_DEFAUT : csvAnnee;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import population apprenants</h1>
        <p className="text-slate-500 text-sm mt-1">
          Importe les apprenants dans Firestore et les lie à leurs groupes.
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button onClick={() => { setTab('2026'); setResult(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === '2026' ? 'bg-white shadow-sm text-[#005989]' : 'text-slate-500 hover:text-slate-700'}`}>
          {ANNEE_DEFAUT} <span className="ml-1 text-xs font-normal text-slate-400">({POPULATION_2026.length} étudiants)</span>
        </button>
        <button onClick={() => { setTab('new'); setResult(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === 'new' ? 'bg-white shadow-sm text-[#005989]' : 'text-slate-500 hover:text-slate-700'}`}>
          Nouvelle année
        </button>
      </div>

      {/* Zone nouvelle année */}
      {tab === 'new' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
          <p className="font-semibold text-blue-800 text-sm">Import pour une nouvelle année scolaire</p>
          <p className="text-blue-700 text-xs">Préparez un CSV avec les colonnes : <code className="bg-blue-100 px-1 rounded">nom, prenom, codeApprenant, groupe, niveau, filiereCode</code></p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-blue-800">Année :</label>
              <input type="text" value={csvAnnee} onChange={e => setCsvAnnee(e.target.value)}
                className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm w-28 bg-white focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <button onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Choisir CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVFile} className="hidden" />
            {csvStudents && <span className="text-sm text-blue-700 font-medium">{csvStudents.length} étudiants chargés</span>}
          </div>
        </div>
      )}

      {/* Résultat */}
      {result && (
        <div className={`rounded-xl border p-4 ${result.errors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="font-semibold text-green-800">✓ {result.created} apprenant(s) créé(s).</p>
          {result.errors.map((e, i) => <p key={i} className="text-red-700 text-sm mt-1">{e}</p>)}
          {result.errors.length === 0 && (
            <p className="text-green-700 text-sm mt-1">
              Allez sur <a href="/apprenants" className="underline font-medium">Apprenants</a> pour vérifier.
            </p>
          )}
        </div>
      )}

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-3xl font-black text-[#005989]">{toImport.length}</p>
          <p className="text-sm text-slate-500 mt-1">À importer</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
          <p className="text-3xl font-black text-emerald-600">{dupes.length}</p>
          <p className="text-sm text-slate-500 mt-1">Déjà existants (ignorés)</p>
        </div>
        <div className={`bg-white border rounded-xl p-4 text-center shadow-sm ${noGroupe.length > 0 ? 'border-amber-300' : 'border-slate-200'}`}>
          <p className={`text-3xl font-black ${noGroupe.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{noGroupe.length}</p>
          <p className="text-sm text-slate-500 mt-1">Groupe non trouvé</p>
          {noGroupe.length > 0 && <p className="text-xs text-amber-600 mt-0.5">Créez les groupes d'abord</p>}
        </div>
      </div>

      {/* Bouton import */}
      {toImport.length > 0 && !result && (
        <button
          onClick={handleImport}
          disabled={importing}
          className="w-full flex items-center justify-center gap-3 py-3 bg-[#005989] hover:bg-[#004a73] disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition-colors"
        >
          {importing ? <><Spinner small /> Import en cours…</> : `↑ Importer ${toImport.length} apprenants dans Firestore`}
        </button>
      )}

      {toImport.length === 0 && dupes.length === enriched.length && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-green-700 font-semibold">✓ Tous les apprenants sont déjà dans Firestore.</p>
        </div>
      )}

      {/* Filtres niveau */}
      <div className="flex gap-2 flex-wrap">
        {niveaux.map(n => (
          <button key={n} onClick={() => setFilterNiveau(n)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${filterNiveau === n ? 'bg-[#005989] text-white border-[#005989]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
            {n === 'tous' ? `Tous (${toImport.length})` : `${n} (${toImport.filter(s => s.niveau === n).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm">Liste à importer ({filtered.length})</h2>
        </div>
        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Aucun étudiant à importer pour ce filtre.</p>
          ) : filtered.map(s => (
            <div key={s.codeApprenant} className="flex items-center gap-3 px-5 py-2.5">
              <span className="font-mono text-xs text-slate-400 w-16 shrink-0">{s.codeApprenant}</span>
              <span className="font-semibold text-slate-800 text-sm w-40 shrink-0 truncate">{s.nom} {s.prenom}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${BADGE[s.niveau] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{s.niveau}</span>
              <span className={`text-xs font-mono flex-1 truncate ${s.groupeFound ? 'text-slate-500' : 'text-amber-600 font-semibold'}`}>
                {s.groupe}{!s.groupeFound && ' ⚠ groupe introuvable'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {dupes.length > 0 && (
        <details className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm">
          <summary className="cursor-pointer font-medium text-slate-600">{dupes.length} doublon(s) ignoré(s)</summary>
          <div className="mt-2 text-slate-500 space-y-0.5">
            {dupes.map(s => <p key={s.codeApprenant}>{s.codeApprenant} — {s.nom} {s.prenom}</p>)}
          </div>
        </details>
      )}
    </div>
  );
}
