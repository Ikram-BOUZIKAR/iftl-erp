import { useState } from 'react';
import { useCandidatures, useGroupes } from '../../hooks/useData';
import { candidaturesService } from '../../services/firestore';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

const BRAND = '#005989';

const STATUTS = {
  recu:         { label: 'Reçu',         cls: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  en_cours:     { label: 'En traitement',cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  accepte:      { label: 'Admis',        cls: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  refuse:       { label: 'Refusé',       cls: 'bg-red-100 text-red-600',     dot: 'bg-red-500' },
  doublon:      { label: 'Doublon',      cls: 'bg-slate-100 text-slate-500', dot: 'bg-slate-400' },
  liste_attente:{ label: 'Liste attente',cls: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
};

const PROGRAM_LABELS = {
  'Formation Professionnelle - TS':           { color: '#005989', short: 'TS' },
  'Formation Professionnelle - Technicien':   { color: '#0077b6', short: 'Tech' },
  'Formation Professionnelle - Qualification':{ color: '#d97706', short: 'Qual' },
  'Formation Supérieure':                     { color: '#7c3aed', short: 'Sup' },
  'Formation Qualifiante':                    { color: '#059669', short: 'Qual' },
  'Formation de Courte Durée':                { color: '#16a34a', short: 'Courte' },
  'Formation Professionnelle':                { color: '#005989', short: 'FP' },
};

function fmtDate(val) {
  if (!val) return '—';
  if (val?.toDate) return val.toDate().toLocaleDateString('fr-FR');
  return new Date(val).toLocaleDateString('fr-FR');
}

export default function CandidaturesAdminPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: candidatures, loading, refetch } = useCandidatures();
  const { data: groupes } = useGroupes();

  const [filterStatut, setFilterStatut] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [converting, setConverting] = useState(null);
  const [convertForm, setConvertForm] = useState({ groupeId: '' });
  const [convertSaving, setConvertSaving] = useState(false);
  const [motifRefus, setMotifRefus] = useState('');
  const [showRefusModal, setShowRefusModal] = useState(null);

  const filtered = candidatures.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q
      || `${c.nom} ${c.prenom}`.toLowerCase().includes(q)
      || c.email?.toLowerCase().includes(q)
      || c.cin?.toLowerCase().includes(q)
      || c.telephone?.includes(q)
      || c.ref?.toLowerCase().includes(q);
    const matchS = !filterStatut || c.statut === filterStatut;
    const matchP = !filterProgram || (c.programType || '').includes(filterProgram);
    return matchQ && matchS && matchP;
  });

  const kpis = {
    total: candidatures.length,
    recu: candidatures.filter(c => c.statut === 'recu').length,
    accepte: candidatures.filter(c => c.statut === 'accepte').length,
    refuse: candidatures.filter(c => c.statut === 'refuse').length,
  };

  const updateStatut = async (c, statut) => {
    try {
      await candidaturesService.updateStatus(c.id, statut);
      if (selected?.id === c.id) setSelected(s => ({ ...s, statut }));
      refetch();
      toast.success(`Candidature de ${c.prenom} ${c.nom} : ${STATUTS[statut]?.label}`);
    } catch (err) { toast.error(err.message); }
  };

  const handleRefuser = async () => {
    if (!showRefusModal) return;
    await updateStatut(showRefusModal, 'refuse');
    setShowRefusModal(null);
    setMotifRefus('');
  };

  const handleConvert = async () => {
    if (!converting) return;
    setConvertSaving(true);
    try {
      await candidaturesService.convertToStudent(converting.id, convertForm);
      refetch();
      setConverting(null);
      toast.success(`${converting.prenom} ${converting.nom} ajouté comme apprenant !`);
    } catch (err) { toast.error(err.message); }
    finally { setConvertSaving(false); }
  };

  const programTypes = [...new Set(candidatures.map(c => c.programType).filter(Boolean))];

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Candidatures</h1>
          <p className="text-slate-400 text-sm">Traitement des dossiers de préinscription</p>
        </div>
        <div className="text-xs text-slate-400 bg-white border border-slate-200 rounded-xl px-3 py-1.5">
          {candidatures.length} dossiers reçus
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: kpis.total, color: BRAND, icon: '📋' },
          { label: 'À traiter', value: kpis.recu, color: '#2563eb', icon: '📥' },
          { label: 'Admis', value: kpis.accepte, color: '#16a34a', icon: '✅' },
          { label: 'Refusés', value: kpis.refuse, color: '#dc2626', icon: '❌' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
            <span className="text-2xl">{k.icon}</span>
            <div>
              <p className="text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
              <p className="text-xs font-medium text-slate-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, CIN, téléphone, référence…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#005989]" />
        </div>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
          <option value="">Tous statuts</option>
          {Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white">
          <option value="">Tous programmes</option>
          {programTypes.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* List + Detail panel */}
      <div className={`flex gap-4 ${selected ? 'items-start' : ''}`}>

        {/* Table */}
        <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all ${selected ? 'flex-1' : 'w-full'}`}>
          {loading ? (
            <div className="py-16 text-center"><div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="text-4xl">📋</span>
              <p className="text-slate-500 font-medium mt-3">Aucune candidature</p>
              <p className="text-slate-400 text-xs mt-1">Les dossiers soumis via le formulaire public apparaîtront ici.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">Candidat</th>
                    <th className="px-4 py-3 text-left font-semibold hidden lg:table-cell">Formation</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Statut</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(c => {
                    const st = STATUTS[c.statut] || STATUTS.recu;
                    const prog = PROGRAM_LABELS[c.programType];
                    const isActive = selected?.id === c.id;
                    return (
                      <tr key={c.id}
                        onClick={() => setSelected(isActive ? null : c)}
                        className={`cursor-pointer transition-colors ${isActive ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: BRAND }}>
                              {c.prenom?.[0]}{c.nom?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{c.prenom} {c.nom}</p>
                              <p className="text-xs text-slate-400">{c.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell max-w-[200px]">
                          {prog && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white mr-1" style={{ background: prog.color }}>
                              {prog.short}
                            </span>
                          )}
                          <span className="text-xs text-slate-600 leading-tight line-clamp-2">{c.filiere || c.niveauFormation || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">{fmtDate(c.createdAt)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {c.statut === 'recu' && (
                              <button onClick={() => updateStatut(c, 'en_cours')}
                                className="text-xs px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition">
                                Traiter
                              </button>
                            )}
                            {!['accepte','refuse'].includes(c.statut) && (
                              <>
                                <button onClick={() => updateStatut(c, 'accepte')}
                                  className="text-xs px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition">
                                  ✓ Admettre
                                </button>
                                <button onClick={() => setShowRefusModal(c)}
                                  className="text-xs px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition">
                                  ✗ Refuser
                                </button>
                              </>
                            )}
                            {c.statut === 'accepte' && (
                              <button onClick={() => { setConverting(c); setConvertForm({ groupeId: '' }); }}
                                className="text-xs px-2.5 py-1.5 bg-[#005989] hover:bg-[#004a73] text-white rounded-lg font-medium transition">
                                → Inscrire
                              </button>
                            )}
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

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-[#005989] to-[#003d63] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUTS[selected.statut]?.cls || 'bg-white/20 text-white'}`}>
                  {STATUTS[selected.statut]?.label}
                </span>
                <button onClick={() => setSelected(null)} className="text-white/60 hover:text-white text-lg leading-none">×</button>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-black text-lg mb-2">
                {selected.prenom?.[0]}{selected.nom?.[0]}
              </div>
              <h3 className="text-white font-bold text-base">{selected.prenom} {selected.nom}</h3>
              {selected.ref && <p className="text-white/60 text-xs font-mono mt-0.5">Réf: {selected.ref}</p>}
            </div>

            <div className="p-4 space-y-3 text-xs overflow-y-auto max-h-[70vh]">
              <Row label="Email" val={selected.email} />
              <Row label="Tél." val={selected.telephone} />
              <Row label="CIN" val={selected.cin} />
              <Row label="Date naissance" val={selected.dateNaissance} />
              <Row label="Ville" val={selected.ville} />
              <Row label="Niveau bac" val={selected.niveau} />
              <Row label="Spécialité bac" val={selected.specBac} />
              <Row label="Moy. bac" val={selected.moyenneBac ? `${selected.moyenneBac}/20` : null} />
              <div className="border-t border-slate-100 pt-2 mt-2">
                <Row label="Programme" val={selected.programType} bold />
                <Row label="Filière" val={selected.filiere} bold />
                <Row label="Niveau" val={selected.niveauFormation} />
                <Row label="Année" val={selected.anneeEntree} />
              </div>
              {selected.motivations && (
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <p className="text-slate-500 font-semibold uppercase tracking-wide text-[10px] mb-1">Motivations</p>
                  <p className="text-slate-600 leading-relaxed">{selected.motivations}</p>
                </div>
              )}
              {selected.urgenceNom && (
                <div className="border-t border-slate-100 pt-2 mt-2">
                  <p className="text-slate-500 font-semibold uppercase tracking-wide text-[10px] mb-1">Contact d'urgence</p>
                  <Row label="Nom" val={selected.urgenceNom} />
                  <Row label="Tél." val={selected.urgenceTel} />
                  <Row label="Lien" val={selected.urgenceLien} />
                </div>
              )}
              <div className="border-t border-slate-100 pt-3 mt-2 flex gap-2 flex-wrap">
                {!['accepte','refuse'].includes(selected.statut) && (
                  <>
                    <button onClick={() => { updateStatut(selected, 'accepte'); }}
                      className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-green-700 transition">
                      ✓ Admettre
                    </button>
                    <button onClick={() => setShowRefusModal(selected)}
                      className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-xl hover:bg-red-700 transition">
                      ✗ Refuser
                    </button>
                  </>
                )}
                {selected.statut === 'accepte' && (
                  <button onClick={() => { setConverting(selected); setConvertForm({ groupeId: '' }); }}
                    className="w-full bg-[#005989] text-white text-xs font-bold py-2 rounded-xl hover:bg-[#004a73] transition">
                    → Inscrire comme apprenant
                  </button>
                )}
              </div>
              <p className="text-slate-300 text-[10px] text-center">Soumis le {fmtDate(selected.createdAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Refus modal */}
      {showRefusModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-1">Refuser la candidature</h3>
            <p className="text-sm text-slate-500 mb-4">{showRefusModal.prenom} {showRefusModal.nom} — {showRefusModal.filiere}</p>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Motif de refus (optionnel)</label>
            <textarea value={motifRefus} onChange={e => setMotifRefus(e.target.value)} rows={3}
              placeholder="Dossier incomplet, niveau insuffisant, quota atteint…"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setShowRefusModal(null); setMotifRefus(''); }}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">Annuler</button>
              <button onClick={handleRefuser}
                className="flex-1 bg-red-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-red-700 transition">
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to student modal */}
      {converting && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-slate-800 mb-1">Inscrire comme apprenant</h3>
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl p-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center text-sm font-bold text-green-700 shrink-0">
                {converting.prenom?.[0]}{converting.nom?.[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">{converting.prenom} {converting.nom}</p>
                <p className="text-xs text-slate-500">{converting.filiere}</p>
              </div>
            </div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Assigner au groupe</label>
            <select value={convertForm.groupeId} onChange={e => setConvertForm(f => ({ ...f, groupeId: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] mb-4">
              <option value="">— Sans groupe pour l'instant —</option>
              {groupes.map(g => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setConverting(null)}
                className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">Annuler</button>
              <button onClick={handleConvert} disabled={convertSaving}
                className="flex-1 bg-[#005989] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#004a73] disabled:opacity-60 transition">
                {convertSaving ? 'Inscription…' : 'Créer le dossier apprenant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, val, bold }) {
  if (!val) return null;
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`text-right ${bold ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{val}</span>
    </div>
  );
}
