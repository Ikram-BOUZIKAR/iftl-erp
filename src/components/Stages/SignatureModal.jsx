import { useState } from 'react';
import { sendForSignature, checkSignatureStatus, confirmSignatureInFirestore } from '../../services/signatureService';
import { IS_DEMO, INSTITUTE_NAME } from '../../utils/brandingConfig';
import { useToast } from '../UI/Toast';

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

const ROLES = [
  { value: 'apprenant',  label: 'Apprenant(e)' },
  { value: 'tuteur',     label: 'Tuteur entreprise' },
  { value: 'direction',  label: 'Direction / Scolarité' },
];

const STATUS_CONFIG = {
  pending:     { label: 'En attente de signature', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  signed:      { label: 'Convention signée ✓',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  demo_signed: { label: 'Signature simulée ✓ (démo)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  refused:     { label: 'Signature refusée',        color: 'bg-red-50 text-red-700 border-red-200' },
  expired:     { label: 'Demande expirée',          color: 'bg-slate-50 text-slate-500 border-slate-200' },
};

/**
 * Modal to initiate and track electronic signature of a stage convention.
 *
 * Props:
 *  - stage      {object}   Stage document from Firestore
 *  - onClose    {function}
 *  - onSigned   {function} Called when signature is confirmed
 */
export default function SignatureModal({ stage, onClose, onSigned }) {
  const toast = useToast();

  const [signers, setSigners] = useState([
    { name: `${stage.studentPrenom || ''} ${stage.studentNom || ''}`.trim(), email: '', role: 'apprenant' },
    { name: stage.tuteurEntreprise || '', email: stage.emailTuteur || '', role: 'tuteur' },
  ]);
  const [status, setStatus]   = useState(stage.signatureStatus || null);
  const [loading, setLoading] = useState(false);
  const [signatureId, setSignatureId] = useState(stage.signatureId || null);

  const updateSigner = (idx, field, value) => {
    setSigners(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addSigner = () => {
    setSigners(prev => [...prev, { name: '', email: '', role: 'direction' }]);
  };

  const removeSigner = (idx) => {
    setSigners(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    const validSigners = signers.filter(s => s.name.trim() && s.email.trim());
    if (validSigners.length === 0) {
      toast.error('Ajoutez au moins un signataire avec nom et email.');
      return;
    }
    setLoading(true);
    try {
      const documentName = `Convention_Stage_${stage.studentNom || 'apprenant'}_${stage.entreprise || 'entreprise'}.pdf`.replace(/\s+/g, '_');
      const { signatureId: newId } = await sendForSignature({
        documentName,
        documentBase64: '',
        signers: validSigners,
        stageId: stage.id,
      });
      setSignatureId(newId);
      setStatus('pending');
      toast.success(IS_DEMO
        ? 'Signature simulée envoyée (mode démo)'
        : `Demande de signature envoyée à ${validSigners.length} signataire(s)`);
    } catch (err) {
      toast.error('Erreur envoi signature : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!signatureId) return;
    setLoading(true);
    try {
      const newStatus = await checkSignatureStatus(signatureId);
      if (newStatus) {
        setStatus(newStatus);
        if (newStatus === 'signed' || newStatus === 'demo_signed') {
          await confirmSignatureInFirestore(stage.id, newStatus);
          toast.success('Convention marquée comme signée !');
          onSigned?.();
        }
      }
    } catch (err) {
      toast.error('Erreur vérification : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const alreadySigned = status === 'signed' || status === 'demo_signed';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 overflow-y-auto py-4">
      <div className="bg-white rounded-2xl max-w-lg w-full mx-4 p-6 shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#005989]/10 rounded-lg text-[#005989]"><PenIcon /></span>
            <div>
              <h2 className="text-base font-bold text-slate-800">Signature électronique</h2>
              <p className="text-xs text-slate-400">Convention de stage</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Demo banner */}
        {IS_DEMO && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
            ⚠️ Mode Démonstration — Signature simulée, aucune action réelle
          </div>
        )}

        {/* Stage summary */}
        <div className="mb-5 p-3 bg-slate-50 rounded-xl text-sm">
          <p className="font-semibold text-slate-700">
            {stage.studentPrenom} {stage.studentNom}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {stage.entreprise}{stage.ville ? ` — ${stage.ville}` : ''}
            {stage.dateDebut ? ` · Du ${new Date(stage.dateDebut).toLocaleDateString('fr-FR')}` : ''}
            {stage.dateFin ? ` au ${new Date(stage.dateFin).toLocaleDateString('fr-FR')}` : ''}
          </p>
        </div>

        {/* Status badge */}
        {status && STATUS_CONFIG[status] && (
          <div className={`mb-4 px-3 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 ${STATUS_CONFIG[status].color}`}>
            {alreadySigned && <CheckCircleIcon />}
            {STATUS_CONFIG[status].label}
          </div>
        )}

        {/* Signers */}
        {!alreadySigned && (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Signataires</p>
                <button
                  type="button"
                  onClick={addSigner}
                  className="text-xs text-[#005989] hover:underline font-medium"
                >
                  + Ajouter
                </button>
              </div>
              <div className="space-y-2">
                {signers.map((signer, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                    <input
                      type="text"
                      value={signer.name}
                      onChange={e => updateSigner(idx, 'name', e.target.value)}
                      placeholder="Nom complet"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#005989]"
                    />
                    <input
                      type="email"
                      value={signer.email}
                      onChange={e => updateSigner(idx, 'email', e.target.value)}
                      placeholder="email@exemple.com"
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#005989]"
                    />
                    <select
                      value={signer.role}
                      onChange={e => updateSigner(idx, 'role', e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#005989] bg-white"
                    >
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    {signers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSigner(idx)}
                        className="text-red-400 hover:text-red-600 text-xs p-1"
                        title="Retirer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Send button */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              {status === 'pending' && signatureId ? (
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors disabled:opacity-60"
                >
                  {loading ? 'Vérification…' : 'Vérifier le statut'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#005989] hover:bg-[#004a73] text-white rounded-xl transition-colors disabled:opacity-60"
                >
                  <PenIcon />
                  {loading ? 'Envoi…' : IS_DEMO ? 'Simuler la signature' : 'Envoyer pour signature'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Signed state */}
        {alreadySigned && (
          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-[#005989] text-white rounded-xl hover:bg-[#004a73] transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
