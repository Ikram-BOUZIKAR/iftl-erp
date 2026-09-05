import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';

/**
 * Outil de réparation des affectations de groupes.
 * L'admin importe un CSV (export du tableur de classe) pour identifier
 * les affectations incorrectes et les corriger en masse.
 *
 * Format CSV attendu :
 *   codeApprenant,groupe
 *   TS0342,TS.A
 *   TS0266,TS.E
 *   ...
 *
 * Le champ "groupe" doit correspondre au nom (ou partiel) d'un groupe Firestore.
 */

function parseGroupCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const unquote = v => v.trim().replace(/^"|"$/g, '');
  const headers = lines[0].split(sep).map(h => unquote(h).toLowerCase());
  const codeIdx = headers.findIndex(h => h.includes('code'));
  const groupIdx = headers.findIndex(h => h.includes('group') || h.includes('groupe'));
  if (codeIdx < 0 || groupIdx < 0) return null;
  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(unquote);
    return { code: (cols[codeIdx] || '').toUpperCase(), groupe: cols[groupIdx] || '' };
  }).filter(r => r.code && r.groupe);
}

function downloadTemplate() {
  const lines = [
    'codeApprenant,groupe',
    'TS0342,TS.A',
    'TS0378,TS.A',
    'TS0266,TS.E',
    'TS0281,TS.E',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'canevas_repartition_groupes.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function Spinner() {
  return <div className="w-5 h-5 border-2 border-[#005989] border-t-transparent rounded-full animate-spin" />;
}

export default function RepairGroupesPage() {
  const toast = useToast();

  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [csvRows, setCsvRows] = useState(null);  // parsed CSV
  const [csvError, setCsvError] = useState('');
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [gSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'groupes')),
          getDocs(collection(db, 'students')),
        ]);
        setGroups(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        toast.error('Erreur chargement : ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvError('');
    setCsvRows(null);
    setDone(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rows = parseGroupCSV(ev.target.result);
      if (rows === null) {
        setCsvError('Colonnes introuvables. Le CSV doit avoir au moins "codeApprenant" et "groupe".');
      } else if (rows.length === 0) {
        setCsvError('Aucune ligne valide trouvée dans le fichier.');
      } else {
        setCsvRows(rows);
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // For each CSV row, find student + correct group, detect mismatch
  const analysis = useMemo(() => {
    if (!csvRows) return null;
    const studentByCode = {};
    for (const s of students) {
      const c = (s.codeApprenant || s.code || '').toUpperCase();
      if (c) studentByCode[c] = s;
    }
    const results = [];
    for (const row of csvRows) {
      const student = studentByCode[row.code];
      if (!student) { results.push({ ...row, status: 'notfound' }); continue; }
      // Find matching Firestore group (case-insensitive partial match on nom)
      const matchedGroup = groups.find(g =>
        (g.nom || '').toLowerCase().includes(row.groupe.toLowerCase()) ||
        row.groupe.toLowerCase().includes((g.nom || '').toLowerCase())
      );
      if (!matchedGroup) { results.push({ ...row, student, status: 'nomatch' }); continue; }
      if (student.groupeId === matchedGroup.id) {
        results.push({ ...row, student, matchedGroup, status: 'ok' });
      } else {
        const currentGroup = groups.find(g => g.id === student.groupeId);
        results.push({ ...row, student, matchedGroup, currentGroup, status: 'mismatch' });
      }
    }
    return results;
  }, [csvRows, students, groups]);

  const mismatches = analysis?.filter(r => r.status === 'mismatch') || [];
  const notFound = analysis?.filter(r => r.status === 'notfound') || [];
  const noMatch = analysis?.filter(r => r.status === 'nomatch') || [];

  const handleApply = async () => {
    if (!mismatches.length) return;
    setApplying(true);
    try {
      const BATCH_SIZE = 500;
      let fixed = 0;
      for (let i = 0; i < mismatches.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        for (const r of mismatches.slice(i, i + BATCH_SIZE)) {
          batch.update(doc(db, 'students', r.student.id), {
            groupeId: r.matchedGroup.id,
            updatedAt: new Date(),
          });
          fixed++;
        }
        await batch.commit();
      }
      setDone(fixed);
      toast.success(`${fixed} apprenant${fixed > 1 ? 's' : ''} corrigé${fixed > 1 ? 's' : ''}`);
      // Reload
      const sSnap = await getDocs(collection(db, 'students'));
      setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCsvRows(null);
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Réparation des affectations de groupes</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Importez un fichier CSV listant les codes apprenants et leur groupe correct.
          L'outil détecte et corrige les mauvaises affectations en masse.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center flex flex-col items-center gap-3"><Spinner /><p className="text-slate-400 text-sm">Chargement…</p></div>
      ) : (
        <div className="space-y-5">
          {/* Step 1: Download template */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-slate-800">1. Télécharger le canevas CSV</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Colonnes requises : <code className="bg-slate-100 px-1 rounded">codeApprenant</code> et <code className="bg-slate-100 px-1 rounded">groupe</code>.
                Le nom de groupe doit correspondre (même partiellement) au nom du groupe dans l'ERP.
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger le canevas
            </button>
          </div>

          {/* Firestore groups reference */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Groupes disponibles dans l'ERP</p>
            <div className="flex flex-wrap gap-2">
              {groups.sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(g => (
                <span key={g.id} className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-600 font-medium">{g.nom}</span>
              ))}
            </div>
          </div>

          {/* Step 2: Upload CSV */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <p className="font-semibold text-slate-800">2. Importer votre fichier CSV</p>
            <label className="flex items-center justify-center gap-3 border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-[#005989] hover:bg-blue-50/30 transition-colors group">
              <svg className="w-6 h-6 text-slate-400 group-hover:text-[#005989]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm text-slate-500 group-hover:text-[#005989]">
                {csvRows ? `${csvRows.length} lignes chargées — cliquer pour changer` : 'Cliquer pour sélectionner un fichier CSV'}
              </span>
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
            {csvError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{csvError}</p>
            )}
          </div>

          {/* Step 3: Preview & fix */}
          {analysis && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-slate-800">3. Résultats de l'analyse</p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-700 font-medium">{mismatches.length} à corriger</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">{analysis.filter(r => r.status === 'ok').length} corrects</span>
                    {notFound.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{notFound.length} codes introuvables</span>}
                    {noMatch.length > 0 && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">{noMatch.length} groupes non reconnus</span>}
                  </div>
                </div>
                {mismatches.length > 0 && !done && (
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60"
                  >
                    {applying ? <><Spinner />Correction…</> : `Corriger ${mismatches.length} affectation${mismatches.length > 1 ? 's' : ''}`}
                  </button>
                )}
              </div>

              {done != null && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm font-semibold text-emerald-800">{done} affectation{done > 1 ? 's' : ''} corrigée{done > 1 ? 's' : ''}.</p>
                </div>
              )}

              {mismatches.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-red-50 border-b border-slate-200 px-4 py-2">
                    <p className="text-xs font-semibold text-red-700">Affectations incorrectes à corriger</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Code</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Apprenant</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Groupe actuel</th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Groupe correct</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mismatches.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-4 py-2"><span className="font-mono text-xs text-[#005989] bg-blue-50 px-1.5 py-0.5 rounded">{r.code}</span></td>
                          <td className="px-4 py-2 font-medium text-slate-800">{r.student?.nom} {r.student?.prenom}</td>
                          <td className="px-4 py-2"><span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">{r.currentGroup?.nom || '—'}</span></td>
                          <td className="px-4 py-2"><span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">{r.matchedGroup?.nom}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {noMatch.length > 0 && (
                <div className="border border-amber-200 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 px-4 py-2">
                    <p className="text-xs font-semibold text-amber-700">Groupes non reconnus (aucun groupe ERP ne correspond)</p>
                  </div>
                  <div className="divide-y divide-amber-100 max-h-32 overflow-y-auto">
                    {noMatch.map((r, i) => (
                      <div key={i} className="px-4 py-1.5 text-xs text-slate-600">
                        <span className="font-mono font-semibold">{r.code}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="text-amber-700">{r.groupe}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
