import { useState } from 'react';
import { doc, runTransaction, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { generateRecuOfficielIFTL } from '../../services/pdfService';
import { montantEnLettres } from '../../utils/montantEnLettres';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const MODE_OPTIONS = [
  { value: 'Virement bancaire', label: 'Virement bancaire' },
  { value: 'Espèces', label: 'Espèces' },
  { value: 'Chèque', label: 'Chèque' },
  { value: 'CMI / TPE', label: 'CMI / TPE' },
];

const TYPE_FRAIS_OPTIONS = [
  { value: "frais d'inscription", label: "Frais d'inscription" },
  { value: 'frais de scolarité', label: 'Frais de scolarité' },
  { value: 'acompte sur frais de scolarité', label: 'Acompte sur frais de scolarité' },
  { value: 'solde de frais de scolarité', label: 'Solde de frais de scolarité' },
];

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

async function nextRecuCounter(prefix) {
  const counterField = prefix === 'LC' ? 'lc_2026' : 'mlai_2026';
  const counterRef = doc(db, 'settings', 'recu_counters');
  let newNum;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data()[counterField] || 0) : 0;
    newNum = current + 1;
    tx.set(counterRef, { [counterField]: newNum }, { merge: true });
  });
  const year = new Date().getFullYear();
  const padded = String(newNum).padStart(3, '0');
  return `${prefix}${padded}/${year}`;
}

/**
 * Modal to generate an official IFTL payment receipt.
 *
 * Props:
 *   prefix:     'LC' | 'MLAI'
 *   cycle:      e.g. 'Licence CNAM' | 'Mastère MLAI'
 *   nom:        student last name
 *   prenom:     student first name
 *   cin:        CIN
 *   codeApprenant: code (may be empty)
 *   promotion:  academic year e.g. '2026-2027'
 *   montantInit: pre-filled amount
 *   branding:   branding object (optional)
 *   onClose:    callback
 */
export default function ModalRecuOfficiel({
  prefix,
  cycle,
  nom,
  prenom,
  cin,
  codeApprenant,
  promotion,
  montantInit,
  branding,
  onClose,
}) {
  const [montant, setMontant] = useState(montantInit || '');
  const [typeFrais, setTypeFrais] = useState("frais d'inscription");
  const [modePaiement, setModePaiement] = useState('Virement bancaire');
  const [refOperation, setRefOperation] = useState('');
  const [banque, setBanque] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputClass = 'w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989]';
  const selectClass = 'w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] bg-white';
  const labelClass = 'block text-xs font-semibold text-slate-700 mb-1.5';

  const handleGenerate = async () => {
    const montantNum = Number(montant);
    if (!montantNum || montantNum <= 0) {
      setError('Le montant doit être supérieur à 0.');
      return;
    }
    if (!banque.trim()) {
      setError('Banque / Agence est obligatoire.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const refNumero = await nextRecuCounter(prefix);
      const dateEmission = format(new Date(), 'dd MMMM yyyy', { locale: fr });
      generateRecuOfficielIFTL({
        refNumero,
        nom,
        prenom,
        cin,
        codeApprenant,
        cycle,
        promotion,
        montant: montantNum,
        montantLettres: montantEnLettres(montantNum),
        typeFrais,
        modePaiement,
        refOperation,
        banque,
        versePar: `${nom} ${prenom}`.trim(),
        dateEmission,
      }, branding);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Erreur lors de la génération : ' + (err.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">Reçu de Paiement Officiel</h2>
            <p className="text-xs text-slate-500 mt-0.5">{cycle} — {nom} {prenom}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Montant */}
          <div>
            <label className={labelClass}>Montant (DH) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="0"
              step="100"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              className={inputClass}
              placeholder="Ex : 8500"
            />
            {montant > 0 && (
              <p className="text-xs text-slate-500 mt-1 italic">{montantEnLettres(Number(montant))}</p>
            )}
          </div>

          {/* Type de frais */}
          <div>
            <label className={labelClass}>Type de frais</label>
            <select value={typeFrais} onChange={e => setTypeFrais(e.target.value)} className={selectClass}>
              {TYPE_FRAIS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Mode de paiement */}
          <div>
            <label className={labelClass}>Mode de paiement</label>
            <select value={modePaiement} onChange={e => setModePaiement(e.target.value)} className={selectClass}>
              {MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Référence */}
          <div>
            <label className={labelClass}>Référence / N° Chèque</label>
            <input
              type="text"
              value={refOperation}
              onChange={e => setRefOperation(e.target.value)}
              className={inputClass}
              placeholder="N° de chèque ou référence virement"
            />
          </div>

          {/* Banque */}
          <div>
            <label className={labelClass}>Banque / Agence <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={banque}
              onChange={e => setBanque(e.target.value)}
              className={inputClass}
              placeholder="Ex : CIH Bank — Agence Nouaceur"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2 text-sm font-semibold bg-[#005989] hover:bg-[#004a73] text-white rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Génération…
              </>
            ) : (
              <>📄 Générer le Reçu</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
