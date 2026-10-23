import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { historiqueService } from '../../services/firestore';
import { sendCandidatureStatut } from '../../services/emailService';
import { useToast } from '../UI/Toast';

export default function ConvocationBatchModal({ candidatures, selectedIds, onClose, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({
    dateEntretien: '',
    heureEntretien: '',
    salle: '',
    codeExamen: '',
    noteConvocation: '',
  });
  const [saving, setSaving] = useState(false);

  const eligible = candidatures.filter(c =>
    selectedIds.has(c.id) && ['valide', 'complet'].includes(c.statut)
  );

  const handleSave = async () => {
    if (!form.dateEntretien) { toast.error('Date de convocation requise.'); return; }
    setSaving(true);
    let ok = 0;
    try {
      for (const c of eligible) {
        const convocation = {
          dateEntretien: form.dateEntretien,
          heureEntretien: form.heureEntretien || '',
          salle: form.salle || '',
          codeExamen: form.codeExamen || '',
          noteConvocation: form.noteConvocation || '',
        };
        await updateDoc(doc(db, 'candidatures', c.id), {
          statut: 'convoque',
          convocation,
          dateTraitement: new Date(),
        });
        await historiqueService.add(c.id, {
          action: 'status_change',
          ancienStatut: c.statut,
          nouveauStatut: 'convoque',
          note: `Convoqué(e) le ${form.dateEntretien}${form.salle ? ' — salle ' + form.salle : ''}`,
        });
        if (c.email) {
          sendCandidatureStatut(db, {
            email: c.email, prenom: c.prenom, nom: c.nom, ref: c.ref,
            filiere: c.filiere || c.niveauFormation, statut: 'convoque',
          }).catch(() => {});
        }
        ok++;
      }
      toast.success(`${ok} candidat(s) convoqué(s).`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <h3 className="font-bold text-slate-800 mb-1">Convocation en lot</h3>
        <p className="text-sm text-slate-500 mb-4">
          {eligible.length} dossier(s) éligible(s) (statut : validé ou complet)
          {selectedIds.size - eligible.length > 0 && (
            <span className="text-amber-600"> — {selectedIds.size - eligible.length} ignoré(s)</span>
          )}
        </p>

        {eligible.length === 0 ? (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-xl px-4 py-3 mb-4">
            Aucun dossier sélectionné n&apos;est au statut &quot;validé&quot; ou &quot;complet&quot;.
          </p>
        ) : (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Date <span className="text-red-400">*</span>
                </label>
                <input type="date" value={form.dateEntretien}
                  onChange={e => setForm(f => ({ ...f, dateEntretien: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Heure</label>
                <input type="time" value={form.heureEntretien}
                  onChange={e => setForm(f => ({ ...f, heureEntretien: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Salle</label>
                <input type="text" value={form.salle} placeholder="Ex : Amphi A"
                  onChange={e => setForm(f => ({ ...f, salle: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Code candidat</label>
                <input type="text" value={form.codeExamen} placeholder="Optionnel"
                  onChange={e => setForm(f => ({ ...f, codeExamen: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989]" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Note aux candidats</label>
              <textarea value={form.noteConvocation} rows={2}
                placeholder="Documents à apporter, code vestimentaire…"
                onChange={e => setForm(f => ({ ...f, noteConvocation: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005989] resize-none" />
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl hover:bg-slate-50">
            Annuler
          </button>
          {eligible.length > 0 && (
            <button onClick={handleSave} disabled={saving || !form.dateEntretien}
              className="flex-1 bg-purple-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-40 transition">
              {saving ? 'Envoi…' : `Convoquer ${eligible.length} dossier(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
