import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, writeBatch, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useStudents, useGroupes } from '../../hooks/useData';
import { studentsService } from '../../services/firestore';
import ApprenantForm from './ApprenantForm';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// ─── CSV Import ───────────────────────────────────────────────────────────────
const CSV_HEADERS = ['nom', 'prenom', 'codeApprenant', 'email', 'telephone', 'dateNaissance', 'cin', 'genre', 'ville', 'adresse', 'groupe', 'niveau'];

const NIVEAUX_VALIDES = ['1A TS', '2A TS', 'Licence CNAM', 'Licence Transitaire', 'Mastère ISLI'];

function downloadCSVTemplate() {
  const rows = [
    CSV_HEADERS,
    ['BEN ALI', 'Mohamed', 'TS0417', 'mohamed.benali@email.com', '0612345678', '2004-03-15', 'BE123456', 'M', 'Casablanca', '123 Rue de la Paix', 'TS.A', '1A TS'],
    ['IDRISSI', 'Fatima', 'TS0418', 'fatima.idrissi@email.com', '0698765432', '2003-07-22', 'CI654321', 'F', 'Rabat', '45 Avenue Hassan II', 'TS.B', '1A TS'],
    ['OUALI', 'Youssef', 'TS0419', '', '0611223344', '2004-11-05', 'OA789012', 'M', 'Marrakech', '', 'TS.C', '1A TS'],
  ];
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'canevas_apprenants_iftl.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const parseRow = (line) => {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
      } else if (ch === sep && !inQ) {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    return cells;
  };
  const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cells = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = cells[i] || ''; });
    return obj;
  });
}

function validateRow(row, existingCodes) {
  const errors = [];
  if (!row.nom?.trim()) errors.push('Nom requis');
  if (!row.prenom?.trim()) errors.push('Prénom requis');
  if (!row.codeapprenant?.trim()) errors.push('Code apprenant requis');
  if (row.niveau && !NIVEAUX_VALIDES.includes(row.niveau.trim())) {
    errors.push(`Niveau invalide: "${row.niveau}" (valeurs: ${NIVEAUX_VALIDES.join(', ')})`);
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
  const niveau = (row.niveau || '').trim();
  const anneeFormation = niveau === '1A TS' ? '1' : niveau === '2A TS' ? '2' : '';
  return {
    nom: (row.nom || '').trim().toUpperCase(),
    prenom: (row.prenom || '').trim(),
    codeApprenant: code.toUpperCase(),
    email: (row.email || '').trim(),
    telephone: (row.telephone || '').trim(),
    dateNaissance: (row.datenaissance || row['date naissance'] || row['date de naissance'] || row.datenais || '').trim(),
    cin: (row.cin || '').trim().toUpperCase(),
    genre: (row.genre || row.sexe || '').trim(),
    ville: (row.ville || '').trim(),
    adresse: (row.adresse || '').trim(),
    groupeId,
    groupeNomSource: groupeNom,
    niveau,
    anneeFormation,
    statut: 'actif',
  };
}

function ImportApprenantsModal({ groupes, existingStudents, onClose, onDone }) {
  const toast = useToast();
  const fileRef = useRef();
  const [step, setStep] = useState('upload'); // upload | preview | importing | done
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const existingCodeMap = new Map(
    existingStudents.map(s => [(s.codeApprenant || '').toUpperCase(), s.id])
  );
  const existingCodes = new Set(existingCodeMap.keys());

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const parsed = parseCSV(text);
      if (!parsed.length) { toast.error('Fichier vide ou format invalide'); return; }
      const enriched = parsed.map((row, idx) => {
        const { errors, isDuplicate } = validateRow(row, existingCodes);
        const payload = rowToPayload(row, groupes);
        return { _idx: idx + 2, raw: row, payload, errors, isDuplicate };
      });
      setRows(enriched);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const valid = rows.filter(r => !r.errors.length && !r.isDuplicate);
  const duplicates = rows.filter(r => !r.errors.length && r.isDuplicate);
  const errors = rows.filter(r => r.errors.length);

  const handleImport = async (includeUpdates) => {
    setImporting(true);
    setStep('importing');
    try {
      let created = 0, updated = 0;
      const toCreate = valid;
      const toUpdate = includeUpdates ? duplicates : [];
      const BATCH = 500;
      for (let i = 0; i < toCreate.length; i += BATCH) {
        const chunk = toCreate.slice(i, i + BATCH);
        for (const r of chunk) {
          const { groupeNomSource, ...payload } = r.payload;
          await addDoc(collection(db, 'students'), { ...payload, createdAt: new Date(), updatedAt: new Date() });
          created++;
        }
      }
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const chunk = toUpdate.slice(i, i + BATCH);
        const batch = writeBatch(db);
        for (const r of chunk) {
          const id = existingCodeMap.get(r.payload.codeApprenant.toUpperCase());
          if (!id) continue;
          const { groupeNomSource, ...payload } = r.payload;
          batch.update(doc(db, 'students', id), { ...payload, updatedAt: new Date() });
          updated++;
        }
        await batch.commit();
      }
      setResult({ created, updated });
      setStep('done');
      onDone();
    } catch (err) {
      toast.error('Erreur import : ' + err.message);
      setStep('preview');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Importer des apprenants</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fichier CSV — colonnes: {CSV_HEADERS.join(', ')}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {step === 'upload' && (
            <div className="space-y-5">
              <button
                onClick={downloadCSVTemplate}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:border-indigo-300 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Télécharger le canevas CSV
              </button>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-10 text-center cursor-pointer transition-colors"
              >
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
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {valid.length} nouveau{valid.length !== 1 ? 'x' : ''}
                </span>
                {duplicates.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    {duplicates.length} doublon{duplicates.length !== 1 ? 's' : ''} (code existant)
                  </span>
                )}
                {errors.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                    {errors.length} erreur{errors.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase">Ligne</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase">Nom Prénom</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase">Code</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase hidden sm:table-cell">Groupe</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase hidden sm:table-cell">Niveau</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map(r => (
                      <tr key={r._idx} className={r.errors.length ? 'bg-red-50' : r.isDuplicate ? 'bg-amber-50' : ''}>
                        <td className="px-3 py-2 text-slate-400">{r._idx}</td>
                        <td className="px-3 py-2 font-medium text-slate-800">
                          {r.payload.nom} {r.payload.prenom}
                        </td>
                        <td className="px-3 py-2 font-mono text-indigo-700">{r.payload.codeApprenant || '—'}</td>
                        <td className="px-3 py-2 hidden sm:table-cell text-slate-600">
                          {r.payload.groupeId ? (
                            <span className="text-emerald-700">{groupes.find(g => g.id === r.payload.groupeId)?.nom}</span>
                          ) : r.payload.groupeNomSource ? (
                            <span className="text-amber-600">{r.payload.groupeNomSource} <span className="text-slate-400">(non trouvé)</span></span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2 hidden sm:table-cell text-slate-600">{r.payload.niveau || '—'}</td>
                        <td className="px-3 py-2">
                          {r.errors.length ? (
                            <span className="text-red-600 font-medium">{r.errors[0]}</span>
                          ) : r.isDuplicate ? (
                            <span className="text-amber-600 font-medium">Doublon</span>
                          ) : (
                            <span className="text-emerald-600 font-medium">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {duplicates.length > 0 && (
                <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Les doublons (code déjà existant) peuvent être mis à jour ou ignorés — choisissez ci-dessous.
                </p>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-600 text-sm">Import en cours…</p>
            </div>
          )}

          {step === 'done' && result && (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-lg font-bold text-slate-800">Import terminé</p>
              <p className="text-sm text-slate-500">
                {result.created} créé{result.created !== 1 ? 's' : ''}
                {result.updated > 0 ? ` · ${result.updated} mis à jour` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button onClick={onClose} className="text-sm text-slate-600 hover:text-slate-800 font-medium">
            {step === 'done' ? 'Fermer' : 'Annuler'}
          </button>
          {step === 'preview' && (
            <div className="flex gap-2">
              {duplicates.length > 0 && valid.length === 0 && (
                <button
                  onClick={() => handleImport(true)}
                  className="text-sm font-medium px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                >
                  Mettre à jour {duplicates.length} doublon{duplicates.length !== 1 ? 's' : ''}
                </button>
              )}
              {valid.length > 0 && (
                <>
                  {duplicates.length > 0 && (
                    <button
                      onClick={() => handleImport(true)}
                      className="text-sm font-medium px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors"
                    >
                      Créer + mettre à jour ({valid.length + duplicates.length})
                    </button>
                  )}
                  <button
                    onClick={() => handleImport(false)}
                    disabled={importing}
                    className="text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Importer {valid.length} nouveau{valid.length !== 1 ? 'x' : ''}
                  </button>
                </>
              )}
            </div>
          )}
          {step === 'upload' && (
            <button
              onClick={() => fileRef.current?.click()}
              className="text-sm font-medium px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              Choisir un fichier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function UserPlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function EmptyState({ search, onAdd }) {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🎓</span>
      </div>
      {search ? (
        <>
          <p className="text-slate-700 font-semibold">Aucun résultat pour "{search}"</p>
          <p className="text-slate-400 text-sm mt-1">Essayez avec un autre nom, email ou CIN.</p>
        </>
      ) : (
        <>
          <p className="text-slate-700 font-semibold">Aucun apprenant pour l'instant</p>
          <p className="text-slate-400 text-sm mt-1 mb-5">Commencez par ajouter votre premier apprenant.</p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <UserPlusIcon />
            Ajouter un apprenant
          </button>
        </>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ApprenantsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: students, loading, refetch } = useStudents();
  const { data: groupes } = useGroupes();
  const [search, setSearch] = useState('');
  const [filterGroupe, setFilterGroupe] = useState('');
  const [filterStatut, setFilterStatut] = useState('actif');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.nom?.toLowerCase().includes(q) || s.prenom?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || s.cin?.toLowerCase().includes(q);
    const matchGroupe = !filterGroupe || s.groupeId === filterGroupe;
    const matchStatut = !filterStatut || s.statut === filterStatut;
    return matchSearch && matchGroupe && matchStatut;
  });

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

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Apprenants</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? 'Chargement…' : (() => {
              const actifs = students.filter(s => s.statut === 'actif').length;
              const laureats = students.filter(s => s.statut === 'laureat').length;
              return `${filtered.length} affiché${filtered.length > 1 ? 's' : ''} · ${actifs} actif${actifs > 1 ? 's' : ''} · ${laureats} lauréat${laureats > 1 ? 's' : ''}`;
            })()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-sm font-medium rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Importer CSV
          </button>
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <UserPlusIcon />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Rechercher (nom, prénom, email, CIN)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-sm border border-slate-300 rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={filterGroupe}
          onChange={e => setFilterGroupe(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Tous les groupes</option>
          {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
        </select>
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
          <option value="archive">Archivé</option>
          <option value="laureat">Lauréat 🎓</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm mt-3">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState search={search} onAdd={() => { setEditing(null); setShowForm(true); }} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Apprenant</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden md:table-cell">CIN</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide hidden lg:table-cell">Groupe</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Statut</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(student => {
                const groupe = groupes.find(g => g.id === student.groupeId);
                return (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {student.nom?.[0]}{student.prenom?.[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{student.nom} {student.prenom}</p>
                          <p className="text-xs text-slate-400 sm:hidden">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell text-sm">{student.email}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">{student.cin || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell text-sm">{groupe?.nom || student.filiere || '—'}</td>
                    <td className="px-4 py-3">
                      <StatutBadge statut={student.statut} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link to={`/apprenants/${student.id}`} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors">Voir</Link>
                        <button onClick={() => { setEditing(student); setShowForm(true); }} className="text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors">Modifier</button>
                        <button onClick={() => handleDelete(student.id, `${student.nom} ${student.prenom}`)} className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors">Suppr.</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <ApprenantForm
          initial={editing}
          groupes={groupes}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Import CSV modal */}
      {showImport && (
        <ImportApprenantsModal
          groupes={groupes}
          existingStudents={students}
          onClose={() => setShowImport(false)}
          onDone={() => { refetch(); }}
        />
      )}
    </div>
  );
}

function StatutBadge({ statut }) {
  const map = {
    actif:    'bg-emerald-100 text-emerald-700',
    inactif:  'bg-slate-100 text-slate-600',
    archive:  'bg-amber-100 text-amber-700',
    laureat:  'bg-violet-100 text-violet-700',
  };
  const labels = { actif: 'Actif', inactif: 'Inactif', archive: 'Archivé', laureat: 'Lauréat 🎓' };
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${map[statut] || 'bg-slate-100 text-slate-600'}`}>
      {labels[statut] || statut}
    </span>
  );
}
