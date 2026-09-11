import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';

const STATUTS = {
  recu:          { label: 'Reçu',          color: '#2563eb', step: 1 },
  en_cours:      { label: 'En traitement', color: '#d97706', step: 2 },
  accepte:       { label: 'Admis',         color: '#16a34a', step: 3 },
  refuse:        { label: 'Refusé',        color: '#dc2626', step: 3 },
  liste_attente: { label: 'Liste attente', color: '#7c3aed', step: 3 },
  doublon:       { label: 'Doublon',       color: '#64748b', step: 3 },
};

const TIMELINE = [
  { key: 'recu',     label: 'Dossier reçu' },
  { key: 'en_cours', label: 'En traitement' },
  { key: 'final',    label: 'Décision finale' },
];

const DOCS_LABELS = {
  cin_recto:   'CIN Recto',
  cin_verso:   'CIN Verso',
  bac:         'Relevé de notes / Bac',
  photo:       'Photo d\'identité',
  cv:          'CV',
  attestation: 'Attestation de travail',
};

function fmtDate(val) {
  if (!val) return '—';
  if (val?.toDate) return val.toDate().toLocaleDateString('fr-FR');
  return new Date(val).toLocaleDateString('fr-FR');
}

export default function SuiviCandidaturePage() {
  const params = new URLSearchParams(window.location.search);
  const cinFromUrl = params.get('cin') || '';

  const [inputCin, setInputCin]     = useState(cinFromUrl);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [candidature, setCandidature] = useState(null);
  const [searched, setSearched]     = useState(false);

  useEffect(() => {
    if (cinFromUrl) handleSearch(cinFromUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (cinVal) => {
    const cinNorm = (cinVal !== undefined ? cinVal : inputCin).trim().toUpperCase();
    if (!cinNorm) { setError('Veuillez saisir votre CIN.'); return; }
    setLoading(true);
    setError('');
    setCandidature(null);
    setSearched(true);
    try {
      const snap = await getDocs(query(collection(db, 'candidatures'), where('cin', '==', cinNorm)));
      if (snap.empty) {
        setError('Aucune candidature trouvée pour ce CIN. Vérifiez votre saisie ou contactez l\'établissement.');
      } else {
        setCandidature({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const st     = candidature ? (STATUTS[candidature.statut] || STATUTS.recu) : null;
  const stStep = st?.step || 1;
  const isFinal = candidature && ['accepte', 'refuse', 'liste_attente', 'doublon'].includes(candidature.statut);

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e8f4fd 100%)' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #005989, #0077b6)' }}>
              <span className="font-black text-sm text-white tracking-tight">IF</span>
            </div>
            <div className="text-left">
              <p className="font-black text-slate-800 text-lg leading-none">Institut</p>
              <p className="text-xs text-slate-500 mt-0.5">Institut de Formation · Transport & Logistique</p>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Suivi de candidature</h1>
          <p className="text-slate-400 text-sm mt-1">Consultez l'état de votre dossier</p>
        </div>

        {/* CIN search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-5">
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
            Votre numéro CIN
          </label>
          <div className="flex gap-2">
            <input
              value={inputCin}
              onChange={e => setInputCin(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Ex : BE123456"
              className="flex-1 text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/50 focus:border-[#005989] uppercase tracking-wider"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-5 py-2.5 bg-[#005989] hover:bg-[#004a73] text-white text-sm font-bold rounded-xl transition disabled:opacity-60 flex items-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading ? 'Recherche…' : 'Consulter'}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-500 flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </p>
          )}
        </div>

        {/* Result */}
        {candidature && (
          <>
            {/* Status header card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-4">
              <div className="p-5" style={{ background: 'linear-gradient(135deg, #005989, #003d63)' }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Référence dossier</span>
                  <span className="font-mono text-white font-black tracking-widest text-sm">{candidature.ref}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-lg shrink-0">
                    {candidature.prenom?.[0]}{candidature.nom?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-base truncate">{candidature.prenom} {candidature.nom}</p>
                    <p className="text-white/60 text-xs truncate">{candidature.filiere || candidature.niveauFormation || '—'}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">
                    {st?.label}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="p-5">
                <div className="flex items-start">
                  {TIMELINE.map((t, i) => {
                    const isDone   = stStep > i + 1 || (stStep === i + 1 && isFinal && i === 2);
                    const isActive = stStep === i + 1;
                    const isFinalStep = i === 2;
                    const activeSt = isFinalStep && isFinal ? st : { color: '#005989', label: t.label };
                    const dotBg = (isDone || isActive) ? activeSt.color : undefined;

                    return (
                      <div key={t.key} className="flex items-start flex-1">
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                            style={{ background: isDone || isActive ? dotBg : '#f1f5f9' }}>
                            {isDone ? (
                              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                            ) : isActive ? (
                              <span className="w-2 h-2 rounded-full bg-white" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                          </div>
                          <span className={`text-[10px] font-semibold text-center w-16 leading-tight ${isDone || isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                            {isFinalStep && isFinal ? activeSt.label : t.label}
                          </span>
                        </div>
                        {i < TIMELINE.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 mt-4 rounded-full transition-all ${stStep > i + 1 ? 'bg-[#005989]' : 'bg-slate-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Admin message */}
            {candidature.adminMessage && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  Message de l'établissement
                </p>
                <p className="text-sm text-amber-800 leading-relaxed">{candidature.adminMessage}</p>
              </div>
            )}

            {/* Documents */}
            {candidature.fichierUrls && Object.keys(candidature.fichierUrls).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Documents envoyés</p>
                <div className="space-y-2">
                  {Object.entries(candidature.fichierUrls).map(([key, url]) => (
                    <a key={key} href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 hover:border-[#005989]/30 hover:bg-blue-50/30 transition group">
                      <span className="w-7 h-7 rounded-lg bg-[#005989]/10 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5 text-[#005989]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      </span>
                      <span className="text-sm text-slate-600 group-hover:text-[#005989] font-medium transition flex-1">
                        {DOCS_LABELS[key] || key}
                      </span>
                      <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-[#005989] transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Info summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Informations du dossier</p>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Date de soumission', val: fmtDate(candidature.createdAt) },
                  { label: 'Filière souhaitée',  val: candidature.filiere || '—' },
                  { label: 'Type de formation',  val: candidature.programType || '—' },
                  { label: 'Année d\'entrée',    val: candidature.anneeEntree || '—' },
                  { label: 'E-mail',             val: candidature.email },
                  { label: 'Téléphone',          val: candidature.telephone },
                ].map(({ label, val }) => val && (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-slate-400 shrink-0">{label}</span>
                    <span className="text-slate-700 font-medium text-right leading-tight">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-5">
              Une question ?{' '}
              <a href="tel:+212522078705" className="text-[#005989] font-semibold">+212 5220-78705</a>
              {' · '}
              <a href="mailto:contact@iftl.ma" className="text-[#005989] font-semibold">contact@iftl.ma</a>
            </p>
          </>
        )}

        {searched && !loading && !candidature && !error && (
          <div className="text-center py-10 text-slate-400 text-sm">Aucun résultat.</div>
        )}
      </div>
    </div>
  );
}
