import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useStudents, useGroupes } from '../../hooks/useData';
import { studentsService } from '../../services/firestore';
import ApprenantForm from './ApprenantForm';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// ─── Niveaux ──────────────────────────────────────────────────────────────────
const NIVEAUX = [
  { key: '1A TS',           label: '1ère Année TS',      subtitle: 'Technicien Spécialisé — 1ère année',    color: '#005989', bg: '#e8f4fb', icon: '1' },
  { key: '2A TS',           label: '2ème Année TS',      subtitle: 'Technicien Spécialisé — 2ème année',    color: '#0d9488', bg: '#f0fdfa', icon: '2' },
  { key: 'Licence CNAM',    label: 'Licence CNAM',       subtitle: 'Licence Professionnelle (CNAM)',         color: '#7c3aed', bg: '#f5f3ff', icon: 'L' },
  { key: 'Licence ISTL',    label: 'Licence ISTL',       subtitle: 'Licence Professionnelle (ISTL)',         color: '#b45309', bg: '#fffbeb', icon: 'L' },
  { key: 'Mastère ESLI MLAI', label: 'Mastère ESLI MLAI', subtitle: 'Mastère Spécialisé Logistique & IA',  color: '#9f1239', bg: '#fff1f2', icon: 'M' },
];

// Toutes les valeurs de niveau acceptées (y compris anciennes)
const NIVEAUX_VALIDES = NIVEAUX.map(n => n.key).concat([
  'Licence Transitaire', 'Mastère ISLI', // anciennes valeurs
]);

// Normalise les anciens noms vers les nouveaux
function normalizeNiveau(raw) {
  if (!raw) return '';
  if (raw === 'Licence Transitaire') return 'Licence ISTL';
  if (raw === 'Mastère ISLI') return 'Mastère ESLI MLAI';
  return raw;
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
const CSV_HEADERS = ['nom','prenom','codeApprenant','email','telephone','dateNaissance','cin','genre','ville','adresse','groupe','niveau'];

function downloadCSVTemplate() {
  const rows = [
    CSV_HEADERS,
    ['BEN ALI','Mohamed','TS0417','mohamed.benali@email.com','0612345678','2004-03-15','BE123456','M','Casablanca','123 Rue de la Paix','TS.A','1A TS'],
    ['IDRISSI','Fatima','TS0418','fatima.idrissi@email.com','0698765432','2003-07-22','CI654321','F','Rabat','45 Av Hassan II','TS.B','2A TS'],
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'canevas_apprenants_iftl.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const parseRow = (line) => {
    const cells = []; let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === sep && !inQ) { cells.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cells.push(cur.trim()); return cells;
  };
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = parseRow(line); const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
}

function validateRow(row, existingCodes) {
  const errors = [];
  if (!row.nom?.trim()) errors.push('Nom requis');
  if (!row.prenom?.trim()) errors.push('Prénom requis');
  if (!row.codeapprenant?.trim()) errors.push('Code apprenant requis');
  const niv = normalizeNiveau((row.niveau || '').trim());
  if (row.niveau && !NIVEAUX_VALIDES.includes(niv) && !NIVEAUX_VALIDES.includes(row.niveau)) {
    errors.push(`Niveau invalide: "${row.niveau}"`);
  }
  const isDuplicate = existingCodes.has((row.codeapprenant || '').trim().toUpperCase());
  return { errors, isDuplicate };
}

function rowToPayload(row, groupes) {
  const code = (row.codeapprenant || row['code apprenant'] || '').trim();
  const groupeNom = (row.groupe || '').trim().toLowerCase();
  let groupeId = '';
  if (groupeNom) {
    const found = groupes.find(g =>
      (g.nom || '').toLowerCase() === groupeNom ||
      (g.nom || '').toLowerCase().includes(groupeNom) ||
      groupeNom.includes((g.nom || '').toLowerCase())
    );
    if (found) groupeId = found.id;
  }
  const niveau = normalizeNiveau((row.niveau || '').trim());
  const anneeFormation = niveau === '1A TS' ? '1' : niveau === '2A TS' ? '2' : '';
  return {
    nom: (row.nom || '').trim().toUpperCase(),
    prenom: (row.prenom || '').trim(),
    codeApprenant: code.toUpperCase(),
    email: (row.email || '').trim(),
    telephone: (row.telephone || '').trim(),
    dateNaissance: (row.datenaissance || row['date naissance'] || row['date de naissance'] || '').trim(),
    cin: (row.cin || '').trim().toUpperCase(),
    genre: (row.genre || row.sexe || '').trim(),
    ville: (row.ville || '').trim(),
    adresse: (row.adresse || '').trim(),
    groupeId, groupeNomSource: groupeNom, niveau, anneeFormation, statut: 'actif',
  };
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function ImportApprenantsModal({ groupes, existingStudents, onClose, onDone }) {
  const toast = useToast();
  const fileRef = useRef();
  const [step, setStep] = useState('upload');
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const existingCodeMap = new Map(existingStudents.map(s => [(s.codeApprenant || '').toUpperCase(), s.id]));
  const existingCodes = new Set(existingCodeMap.keys());

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { toast.error('Fichier vide ou format invalide'); return; }
      const enriched = parsed.map((row, idx) => {
        const { errors, isDuplicate } = validateRow(row, existingCodes);
        const payload = rowToPayload(row, groupes);
        return { _idx: idx + 2, raw: row, payload, errors, isDuplicate };
      });
      setRows(enriched); setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const valid = rows.filter(r => !r.errors.length && !r.isDuplicate);
  const duplicates = rows.filter(r => !r.errors.length && r.isDuplicate);
  const errors = rows.filter(r => r.errors.length);

  const handleImport = async (includeUpdates) => {
    setImporting(true); setStep('importing');
    try {
      let created = 0, updated = 0;
      for (const r of valid) {
        const { groupeNomSource, ...payload } = r.payload;
        await addDoc(collection(db, 'students'), { ...payload, createdAt: new Date(), updatedAt: new Date() });
        created++;
      }
      if (includeUpdates) {
        const batch = writeBatch(db);
        for (const r of duplicates) {
          const id = existingCodeMap.get(r.payload.codeApprenant.toUpperCase());
          if (!id) continue;
          const { groupeNomSource, ...payload } = r.payload;
          batch.update(doc(db, 'students', id), { ...payload, updatedAt: new Date() });
          updated++;
        }
        if (updated) await batch.commit();
      }
      setResult({ created, updated }); setStep('done'); onDone();
    } catch (err) {
      toast.error('Erreur import : ' + err.message); setStep('preview');
    } finally { setImporting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Importer des apprenants</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fichier CSV — colonnes : {CSV_HEADERS.join(', ')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 'upload' && (
            <div className="space-y-5">
              <button onClick={downloadCSVTemplate} className="flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-lg transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Télécharger le canevas CSV
              </button>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-10 text-center cursor-pointer transition-colors">
                <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                <p className="text-sm font-medium text-slate-600">Cliquez pour sélectionner un fichier CSV</p>
                <p className="text-xs text-slate-400 mt-1">Séparateur virgule ou point-virgule, encodage UTF-8</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
              </div>
            </div>
          )}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {valid.length} nouveau{valid.length !== 1 ? 'x' : ''}
                </span>
                {duplicates.length > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> {duplicates.length} doublon{duplicates.length !== 1 ? 's' : ''}</span>}
                {errors.length > 0 && <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700"><span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" /> {errors.length} erreur{errors.length !== 1 ? 's' : ''}</span>}
              </div>
              <div className="rounded-xl border border-slate-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Ligne','Nom Prénom','Code','Groupe','Niveau','Statut'].map(h => <th key={h} className="text-left px-3 py-2 text-slate-500 font-semibold uppercase whitespace-nowrap">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(r => (
                      <tr key={r._idx} className={r.errors.length ? 'bg-red-50' : r.isDuplicate ? 'bg-amber-50' : ''}>
                        <td className="px-3 py-2 text-slate-400">{r._idx}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">{r.payload.nom} {r.payload.prenom}</td>
                        <td className="px-3 py-2 font-mono text-indigo-700">{r.payload.codeApprenant || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {r.payload.groupeId ? <span className="text-emerald-700">{groupes.find(g => g.id === r.payload.groupeId)?.nom}</span>
                            : r.payload.groupeNomSource ? <span className="text-amber-600">{r.payload.groupeNomSource} <span className="text-slate-400">(non trouvé)</span></span> : '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.payload.niveau || '—'}</td>
                        <td className="px-3 py-2">
                          {r.errors.length ? <span className="text-red-600 font-medium">{r.errors[0]}</span>
                            : r.isDuplicate ? <span className="text-amber-600 font-medium">Doublon</span>
                            : <span className="text-emerald-600 font-medium">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {step === 'importing' && <div className="py-12 text-center"><div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /><p className="text-slate-600 text-sm mt-3">Import en cours…</p></div>}
          {step === 'done' && result && (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-lg font-bold text-slate-800">Import terminé</p>
              <p className="text-sm text-slate-500">{result.created} créé{result.created !== 1 ? 's' : ''}{result.updated > 0 ? ` · ${result.updated} mis à jour` : ''}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-slate-600 hover:text-slate-800 font-medium">{step === 'done' ? 'Fermer' : 'Annuler'}</button>
          {step === 'upload' && <button onClick={() => fileRef.current?.click()} className="text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">Choisir un fichier</button>}
          {step === 'preview' && (
            <div className="flex gap-2">
              {duplicates.length > 0 && <button onClick={() => handleImport(true)} className="text-sm font-medium px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors">Créer + mettre à jour ({valid.length + duplicates.length})</button>}
              {valid.length > 0 && <button onClick={() => handleImport(false)} disabled={importing} className="text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50">Importer {valid.length} nouveau{valid.length !== 1 ? 'x' : ''}</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Statut badge ─────────────────────────────────────────────────────────────
function StatutBadge({ statut }) {
  const map = { actif: 'bg-emerald-100 text-emerald-700', inactif: 'bg-slate-100 text-slate-600', archive: 'bg-amber-100 text-amber-700', laureat: 'bg-violet-100 text-violet-700' };
  const labels = { actif: 'Actif', inactif: 'Inactif', archive: 'Archivé', laureat: 'Lauréat 🎓' };
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${map[statut] || 'bg-slate-100 text-slate-600'}`}>{labels[statut] || statut}</span>;
}

// ─── Selector de niveau (écran d'accueil) ─────────────────────────────────────
function NiveauSelector({ students, groupes, onSelect, onAdd, onImport }) {
  // Compter par niveau normalisé
  const counts = useMemo(() => {
    const c = {};
    students.forEach(s => {
      const n = normalizeNiveau(s.niveau) || '_autre';
      c[n] = (c[n] || 0) + 1;
    });
    return c;
  }, [students]);

  const totalActifs = students.filter(s => s.statut === 'actif').length;
  const total = students.length;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Apprenants</h1>
          <p className="text-slate-500 text-sm mt-0.5">{total} inscrits · {totalActifs} actifs — Choisissez un niveau pour afficher la liste</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onImport} className="inline-flex items-center gap-2 px-3 py-2 border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importer CSV
          </button>
          <button onClick={onAdd} className="inline-flex items-center gap-2 px-3 py-2 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
            Ajouter
          </button>
        </div>
      </div>

      {/* Niveau cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {NIVEAUX.map(niv => {
          const count = counts[niv.key] || 0;
          const actifs = students.filter(s => normalizeNiveau(s.niveau) === niv.key && s.statut === 'actif').length;
          // Groupes distincts pour ce niveau
          const groupIds = new Set(students.filter(s => normalizeNiveau(s.niveau) === niv.key && s.groupeId).map(s => s.groupeId));
          const groupNames = [...groupIds].map(id => groupes.find(g => g.id === id)?.nom).filter(Boolean);

          return (
            <button
              key={niv.key}
              onClick={() => onSelect(niv.key)}
              className="group text-left w-full bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all p-5 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black" style={{ background: niv.bg, color: niv.color }}>
                  {niv.icon}
                </div>
                <span className="text-2xl font-black" style={{ color: niv.color }}>{count}</span>
              </div>
              <div>
                <p className="font-bold text-slate-800 group-hover:text-[#005989] transition-colors">{niv.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{niv.subtitle}</p>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">{actifs} actif{actifs !== 1 ? 's' : ''}</span>
                {groupNames.length > 0 && (
                  <span className="text-slate-400 truncate max-w-[160px]">{groupNames.slice(0,3).join(' · ')}{groupNames.length > 3 ? '…' : ''}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: niv.color }}>
                Voir la liste
                <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}

        {/* "Autre / non défini" si des apprenants n'ont pas de niveau */}
        {(counts['_autre'] || 0) > 0 && (
          <button onClick={() => onSelect('_autre')} className="group text-left w-full bg-white rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 shadow-sm p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black bg-slate-100 text-slate-500">?</div>
              <span className="text-2xl font-black text-slate-400">{counts['_autre']}</span>
            </div>
            <div>
              <p className="font-bold text-slate-600">Niveau non défini</p>
              <p className="text-xs text-slate-400 mt-0.5">Apprenants sans niveau renseigné</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">Voir la liste <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></div>
          </button>
        )}
      </div>

      {/* Bouton tout voir */}
      <div className="flex justify-center pt-2">
        <button onClick={() => onSelect('_tous')} className="text-sm text-slate-500 hover:text-[#005989] font-medium transition-colors flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          Afficher tous les apprenants ({total})
        </button>
      </div>
    </div>
  );
}

// ─── Liste des apprenants d'un niveau ─────────────────────────────────────────
function NiveauListView({ niveau, students, groupes, onBack, onEdit, onDelete, onAdd }) {
  const [search, setSearch] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterStatut, setFilterStatut] = useState('actif');

  const niveauInfo = NIVEAUX.find(n => n.key === niveau);
  const title = niveau === '_tous' ? 'Tous les apprenants'
    : niveau === '_autre' ? 'Niveau non défini'
    : niveauInfo?.label || niveau;

  const niveauStudents = useMemo(() => {
    if (niveau === '_tous') return students;
    if (niveau === '_autre') return students.filter(s => !s.niveau || !NIVEAUX.find(n => n.key === normalizeNiveau(s.niveau)));
    return students.filter(s => normalizeNiveau(s.niveau) === niveau);
  }, [students, niveau]);

  const groupesNiveau = useMemo(() => {
    const ids = new Set(niveauStudents.filter(s => s.groupeId).map(s => s.groupeId));
    return groupes.filter(g => ids.has(g.id));
  }, [niveauStudents, groupes]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return niveauStudents.filter(s => {
      const matchSearch = !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q)
        || s.email?.toLowerCase().includes(q) || s.cin?.toLowerCase().includes(q)
        || s.codeApprenant?.toLowerCase().includes(q) || s.telephone?.includes(q);
      const matchGroupe = !filterGroupe || s.groupeId === filterGroupe;
      const matchStatut = !filterStatut || s.statut === filterStatut;
      return matchSearch && matchGroupe && matchStatut;
    }).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  }, [niveauStudents, search, filterGroupe, filterStatut]);

  const fmt = (ds) => {
    if (!ds) return '—';
    const d = new Date(ds + 'T12:00:00');
    return isNaN(d) ? ds : d.toLocaleDateString('fr-FR');
  };

  return (
    <div className="space-y-4 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#005989] font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Niveaux
          </button>
          <span className="text-slate-300">/</span>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{title}</h1>
            <p className="text-slate-500 text-xs mt-0.5">{filtered.length} apprenant{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''} · {niveauStudents.length} au total</p>
          </div>
        </div>
        <button onClick={onAdd} className="inline-flex items-center gap-2 px-3 py-2 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          Ajouter
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-wrap gap-2">
        <div className="flex-1 min-w-48 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <input type="text" placeholder="Nom, prénom, code, CIN, tél…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989] transition-colors" />
        </div>
        <select value={filterGroupe} onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 bg-white">
          <option value="">Tous les groupes</option>
          {groupesNiveau.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/30 bg-white">
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
          <option value="archive">Archivé</option>
          <option value="laureat">Lauréat 🎓</option>
        </select>
      </div>

      {/* Table complète scolarité */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><span className="text-2xl">🎓</span></div>
            <p className="text-slate-700 font-semibold">{search ? `Aucun résultat pour "${search}"` : 'Aucun apprenant à afficher'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">#</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Code</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Nom & Prénom</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">CIN</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Date naiss.</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Téléphone</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Email</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Groupe</th>
                  <th className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Statut</th>
                  <th className="text-right px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s, idx) => {
                  const groupe = groupes.find(g => g.id === s.groupeId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 text-slate-400 text-xs tabular-nums">{idx + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-xs font-semibold text-[#005989] bg-[#e8f4fb] px-1.5 py-0.5 rounded">{s.codeApprenant || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: niveauInfo?.bg || '#f1f5f9', color: niveauInfo?.color || '#64748b' }}>
                            {s.nom?.[0]}{s.prenom?.[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm leading-tight">{s.nom} {s.prenom}</p>
                            {s.genre && <span className="text-[10px] text-slate-400">{s.genre === 'M' ? '♂' : s.genre === 'F' ? '♀' : ''}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-slate-600 whitespace-nowrap">{s.cin || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{fmt(s.dateNaissance)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">{s.telephone || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[160px] truncate" title={s.email}>{s.email || '—'}</td>
                      <td className="px-3 py-2.5">
                        {groupe ? (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">{groupe.nom}</span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-3 py-2.5"><StatutBadge statut={s.statut} /></td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/apprenants/${s.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">Voir</Link>
                          <button onClick={() => onEdit(s)} className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors">Modifier</button>
                          <button onClick={() => onDelete(s.id, `${s.nom} ${s.prenom}`)} className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors">Suppr.</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-400 text-right">{filtered.length} apprenant{filtered.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ApprenantsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: students, loading, refetch } = useStudents();
  const { data: groupes } = useGroupes();
  const [selectedNiveau, setSelectedNiveau] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const handleDelete = async (id, nom) => {
    const ok = await confirm({
      title: 'Supprimer cet apprenant ?',
      message: `"${nom}" sera définitivement supprimé. Cette action est irréversible.`,
      danger: true,
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await studentsService.delete(id);
      refetch();
      toast.success('Apprenant supprimé');
    } catch (err) {
      toast.error('Erreur lors de la suppression : ' + err.message);
    }
  };

  const handleSave = async (data) => {
    try {
      if (editing) {
        await studentsService.update(editing.id, data);
        toast.success('Apprenant modifié avec succès');
      } else {
        await studentsService.create(data);
        toast.success('Apprenant ajouté avec succès');
      }
      setShowForm(false);
      setEditing(null);
      refetch();
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    }
  };

  const openAdd = () => { setEditing(null); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setShowForm(true); };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 text-sm mt-3">Chargement des apprenants…</p>
      </div>
    );
  }

  return (
    <>
      {selectedNiveau ? (
        <NiveauListView
          niveau={selectedNiveau}
          students={students}
          groupes={groupes}
          onBack={() => setSelectedNiveau(null)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onAdd={openAdd}
        />
      ) : (
        <NiveauSelector
          students={students}
          groupes={groupes}
          onSelect={setSelectedNiveau}
          onAdd={openAdd}
          onImport={() => setShowImport(true)}
        />
      )}

      {showForm && (
        <ApprenantForm
          initial={editing}
          groupes={groupes}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {showImport && (
        <ImportApprenantsModal
          groupes={groupes}
          existingStudents={students}
          onClose={() => setShowImport(false)}
          onDone={() => { refetch(); }}
        />
      )}
    </>
  );
}
