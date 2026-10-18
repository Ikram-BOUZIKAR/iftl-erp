import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

// ── Statuts (nouveaux + aliases legacy) ──────────────────────────────────────
const STATUTS = {
  soumise:        { label: 'Soumise',           color: '#2563eb', step: 1 },
  en_verification:{ label: 'En vérification',   color: '#d97706', step: 2 },
  incomplet:      { label: 'Compléments requis', color: '#ea580c', step: 2 },
  complet:        { label: 'Dossier complet',   color: '#0d9488', step: 3 },
  non_eligible:   { label: 'Non éligible',      color: '#64748b', step: 5 },
  valide:         { label: 'Dossier validé',    color: '#059669', step: 4 },
  convoque:       { label: 'Convoqué(e)',       color: '#7c3aed', step: 4 },
  admis:          { label: 'Admis(e) ✓',       color: '#16a34a', step: 5 },
  liste_attente:  { label: 'Liste d\'attente',  color: '#7c3aed', step: 5 },
  refuse:         { label: 'Refusé(e)',         color: '#dc2626', step: 5 },
  retire:         { label: 'Dossier retiré',    color: '#64748b', step: 5 },
  brouillon:      { label: 'Brouillon',         color: '#94a3b8', step: 0 },
  // Legacy
  recu:           { label: 'Soumise',           color: '#2563eb', step: 1 },
  en_cours:       { label: 'En vérification',   color: '#d97706', step: 2 },
  accepte:        { label: 'Admis(e) ✓',       color: '#16a34a', step: 5 },
  doublon:        { label: 'Doublon',           color: '#64748b', step: 5 },
};

// ── Timeline : 5 étapes ───────────────────────────────────────────────────────
const TIMELINE = [
  { key: 'soumise',       label: 'Soumis' },
  { key: 'verification',  label: 'Vérification' },
  { key: 'complet',       label: 'Complet' },
  { key: 'valide',        label: 'Validé' },
  { key: 'decision',      label: 'Décision' },
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

// ── Messages contextuels selon le statut ──────────────────────────────────────
function StatusMessage({ candidature }) {
  const st = candidature.statut;

  if (st === 'admis' || st === 'accepte') return (
    <div className="rounded-2xl p-4 mb-4 border border-green-200 bg-green-50">
      <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        🎓 Félicitations !
      </p>
      <p className="text-sm text-green-800 leading-relaxed">
        Votre candidature a été acceptée. L&apos;établissement vous contactera prochainement pour les démarches d&apos;inscription.
      </p>
    </div>
  );

  if (st === 'convoque') return (
    <div className="rounded-2xl p-4 mb-4 border border-purple-200 bg-purple-50">
      <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        📅 Convocation
      </p>
      <p className="text-sm text-purple-800 leading-relaxed">
        Vous avez été convoqué(e) pour un entretien ou un test d&apos;admission. Consultez vos emails ou contactez l&apos;établissement pour les détails.
      </p>
    </div>
  );

  if (st === 'valide') return (
    <div className="rounded-2xl p-4 mb-4 border border-emerald-200 bg-emerald-50">
      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
        ✔ Dossier validé
      </p>
      <p className="text-sm text-emerald-800 leading-relaxed">
        Votre dossier a été validé. Vous serez prochainement convoqué(e) pour la suite du processus d&apos;admission.
      </p>
    </div>
  );

  if (st === 'refuse') return (
    <div className="rounded-2xl p-4 mb-4 border border-red-200 bg-red-50">
      <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-1">Décision défavorable</p>
      <p className="text-sm text-red-700 leading-relaxed">
        Votre candidature n&apos;a pas été retenue pour cette session.
        {candidature.motifRefus && <span className="block mt-1 font-medium">Motif : {candidature.motifRefus}</span>}
      </p>
    </div>
  );

  if (st === 'liste_attente') return (
    <div className="rounded-2xl p-4 mb-4 border border-purple-200 bg-purple-50">
      <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1">Liste d&apos;attente</p>
      <p className="text-sm text-purple-800 leading-relaxed">
        Votre dossier est sur liste d&apos;attente. Vous serez contacté(e) en cas de place disponible.
      </p>
    </div>
  );

  return null;
}

export default function SuiviCandidaturePage() {
  const { t } = useTranslation();
  const params    = new URLSearchParams(window.location.search);
  const cinFromUrl = params.get('cin') || '';

  const [inputCin, setInputCin]       = useState(cinFromUrl);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [candidature, setCandidature] = useState(null);
  const [searched, setSearched]       = useState(false);

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
      const indexSnap = await getDoc(doc(db, 'candidature_index', cinNorm));
      const candidatureId = indexSnap.exists() ? indexSnap.data().candidatureId : cinNorm;
      const candidatureSnap = await getDoc(doc(db, 'candidatures', candidatureId));
      if (!candidatureSnap.exists()) {
        setError('Aucune candidature trouvée pour ce CIN. Vérifiez votre saisie ou contactez l\'établissement.');
      } else {
        setCandidature({ id: candidatureSnap.id, ...candidatureSnap.data() });
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const st     = candidature ? (STATUTS[candidature.statut] || STATUTS.recu) : null;
  const stStep = st?.step || 1;
  const isFinalStep = candidature && ['admis','accepte','refuse','liste_attente','retire','non_eligible','doublon'].includes(candidature.statut);

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e8f4fd 100%)' }}>
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, var(--brand-primary, #005989), var(--brand-primary-dark, #003d63))' }}>
              <span className="font-black text-sm text-white tracking-tight">EP</span>
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{t('candidaturePublic.track_title')}</h1>
          <p className="text-slate-400 text-sm mt-1">Consultez l&apos;état de votre dossier</p>
        </div>

        {/* CIN search */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-5">
          <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
            {t('candidaturePublic.track_email')}
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
              {t('candidaturePublic.track_search')}
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
                  <span className="ml-auto shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-white/25 text-white">
                    {st?.label}
                  </span>
                </div>
              </div>

              {/* Timeline 5 étapes */}
              <div className="px-4 pt-5 pb-4">
                <div className="flex items-start">
                  {TIMELINE.map((step, i) => {
                    const stepNum  = i + 1;
                    const isDone   = stStep > stepNum;
                    const isActive = stStep === stepNum;
                    const isFinal  = i === TIMELINE.length - 1;
                    const dotColor = isDone || isActive
                      ? (isFinal && isFinalStep ? st?.color : '#005989')
                      : undefined;

                    return (
                      <div key={step.key} className="flex items-start flex-1">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                            style={{ background: isDone || isActive ? dotColor : '#f1f5f9' }}>
                            {isDone ? (
                              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                            ) : isActive ? (
                              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                          </div>
                          <span className={`text-[9px] font-semibold text-center leading-tight w-12 ${isDone || isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                            {isFinal && isFinalStep ? st?.label : step.label}
                          </span>
                        </div>
                        {i < TIMELINE.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-1 mt-3.5 rounded-full transition-all ${stStep > stepNum ? 'bg-[#005989]' : 'bg-slate-200'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Message contextuel selon statut */}
            <StatusMessage candidature={candidature} />

            {/* ── Compléments requis ── */}
            {candidature.statut === 'incomplet' && candidature.complementDocs?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
                <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  Documents manquants
                </p>
                {candidature.complementDeadline && (
                  <p className="text-xs text-orange-600 mb-2 font-medium">
                    📅 Date limite : <strong>{fmtDate(candidature.complementDeadline)}</strong>
                  </p>
                )}
                <ul className="space-y-1 mb-3">
                  {candidature.complementDocs.map(d => (
                    <li key={d} className="flex items-center gap-2 text-sm text-orange-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                      {DOCS_LABELS[d] || d}
                    </li>
                  ))}
                </ul>
                {candidature.complementNote && (
                  <p className="text-sm text-orange-700 italic border-t border-orange-200 pt-2 mt-2">
                    &ldquo;{candidature.complementNote}&rdquo;
                  </p>
                )}
                <p className="text-xs text-orange-600 mt-2">
                  Merci de contacter l&apos;établissement ou de déposer vos documents complétés.
                </p>
              </div>
            )}

            {/* Message de l'établissement */}
            {candidature.adminMessage && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  Message de l&apos;établissement
                </p>
                <p className="text-sm text-amber-800 leading-relaxed">{candidature.adminMessage}</p>
              </div>
            )}

            {/* Documents envoyés + état de validation */}
            {(() => {
              const keys = candidature.fichierKeys ||
                (candidature.fichierUrls ? Object.keys(candidature.fichierUrls) : []);
              if (!keys.length) return null;
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Documents envoyés</p>
                  <div className="space-y-2">
                    {keys.map(key => {
                      const valState = candidature.docsValidation?.[key];
                      const valStyles = {
                        valide:     { cls: 'text-green-600 bg-green-50',  label: '✓ Validé' },
                        refuse:     { cls: 'text-red-500 bg-red-50',     label: '✗ Rejeté' },
                        en_attente: { cls: 'text-amber-600 bg-amber-50', label: '… En attente' },
                      };
                      const vs = valStyles[valState];
                      const legacyUrl = candidature.fichierUrls?.[key];
                      return (
                        <div key={key} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100">
                          <span className="w-7 h-7 rounded-lg bg-[#005989]/10 flex items-center justify-center shrink-0">
                            <svg className="w-3.5 h-3.5 text-[#005989]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </span>
                          <span className="text-sm text-slate-600 font-medium flex-1">{DOCS_LABELS[key] || key}</span>
                          <div className="flex items-center gap-2">
                            {vs && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${vs.cls}`}>{vs.label}</span>
                            )}
                            {legacyUrl && (
                              <a href={legacyUrl} target="_blank" rel="noreferrer"
                                className="text-[#005989] hover:underline text-xs">Voir</a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Infos du dossier */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Informations du dossier</p>
              <div className="space-y-2.5 text-sm">
                {[
                  { label: 'Date de soumission', val: fmtDate(candidature.createdAt) },
                  { label: 'Filière souhaitée',  val: candidature.filiere || candidature.niveauFormation || '—' },
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
              Une question ? Contactez l&apos;établissement.
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
