import { useState } from 'react';
import { sendAbsenceEmail } from '../../services/emailService';

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

/**
 * absences: array of enriched absence records with:
 *   { id, studentId, nom, prenom, email, module, date (Date), heureDebut, heureFin, groupe, statut }
 */
export default function AbsenceNotificationModal({ db, absences, onClose }) {
  const withEmail = absences.filter(a => a.email);

  const [selected, setSelected] = useState(() => new Set(withEmail.map(a => a.id)));
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({}); // id → 'sending' | 'sent' | 'error'
  const [sending, setSending] = useState(false);

  const toggleAll = () => {
    if (selected.size === withEmail.length) setSelected(new Set());
    else setSelected(new Set(withEmail.map(a => a.id)));
  };

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return String(d); }
  };

  const handleSend = async () => {
    setSending(true);
    const toSend = withEmail.filter(a => selected.has(a.id));
    for (const abs of toSend) {
      setStatus(s => ({ ...s, [abs.id]: 'sending' }));
      try {
        await sendAbsenceEmail(db, {
          toEmail: abs.email,
          toName: `${abs.prenom} ${abs.nom}`,
          moduleNom: abs.module || '—',
          dateSeance: formatDate(abs.date),
          heureDebut: abs.heureDebut || '',
          heureFin: abs.heureFin || '',
          groupeNom: abs.groupe || '',
          messageCustom: message,
        });
        setStatus(s => ({ ...s, [abs.id]: 'sent' }));
      } catch {
        setStatus(s => ({ ...s, [abs.id]: 'error' }));
      }
    }
    setSending(false);
  };

  const sentCount = Object.values(status).filter(v => v === 'sent').length;
  const noEmailCount = absences.filter(a => !a.email).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Notifier les absents</h2>
            <p className="text-xs text-slate-500 mt-0.5">{absences.length} absence{absences.length > 1 ? 's' : ''} · {withEmail.length} avec email</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Custom message */}
        <div className="px-6 pt-4 shrink-0">
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message personnalisé (optionnel)</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={2}
            placeholder="Ex: Merci de justifier votre absence auprès du secrétariat…"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 focus:border-[#005989] resize-none"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {withEmail.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-sm">Aucun apprenant absent n'a d'adresse email renseignée.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <input
                  type="checkbox"
                  id="absSelectAll"
                  checked={selected.size === withEmail.length}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-[#005989] rounded"
                />
                <label htmlFor="absSelectAll" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Tout sélectionner ({withEmail.length})
                </label>
              </div>

              {withEmail.map(abs => {
                const st = status[abs.id];
                return (
                  <div
                    key={abs.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      selected.has(abs.id) ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(abs.id)}
                      onChange={() => toggle(abs.id)}
                      className="w-4 h-4 accent-red-500 rounded shrink-0"
                    />
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-xs font-bold text-red-700 shrink-0">
                      {abs.prenom?.[0]}{abs.nom?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{abs.prenom} {abs.nom}</p>
                      <p className="text-xs text-slate-500 truncate">{abs.email}</p>
                      <p className="text-xs text-slate-400 truncate">{abs.module} · {abs.groupe}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      abs.statut === 'absent_justifie' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {abs.statut === 'retard' ? 'Retard' : abs.statut === 'absent_justifie' ? 'Justifiée' : 'Abs.'}
                    </span>
                    {st === 'sending' && <span className="text-xs text-slate-400 shrink-0">Envoi…</span>}
                    {st === 'sent' && <span className="text-xs text-emerald-600 font-semibold shrink-0">✓</span>}
                    {st === 'error' && <span className="text-xs text-red-500 font-semibold shrink-0">✗</span>}
                  </div>
                );
              })}

              {noEmailCount > 0 && (
                <p className="text-xs text-amber-600 pt-1">
                  {noEmailCount} apprenant{noEmailCount > 1 ? 's' : ''} sans email non affiché{noEmailCount > 1 ? 's' : ''}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          {sentCount > 0 && (
            <p className="text-xs text-emerald-600 font-medium mb-3">
              ✓ {sentCount} notification{sentCount > 1 ? 's' : ''} envoyée{sentCount > 1 ? 's' : ''}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              Fermer
            </button>
            <button
              onClick={handleSend}
              disabled={sending || selected.size === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
            >
              <SendIcon />
              {sending ? 'Envoi…' : `Notifier (${selected.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
