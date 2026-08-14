import { useState, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sendPlanningEmail, getEmailJSConfig } from '../../services/emailService';

// ── helpers ───────────────────────────────────────────────────────────────────
function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function sortSessions(sessions) {
  return [...sessions].sort((a, b) => {
    const da = new Date(a.date).getTime() + timeToMin(a.heureDebut) * 60000;
    const db = new Date(b.date).getTime() + timeToMin(b.heureDebut) * 60000;
    return da - db;
  });
}

function getModuleName(modules, id) {
  const m = modules.find(x => x.id === id);
  return m ? m.nom : (id || '—');
}

function getGroupeName(groupes, id) {
  return groupes.find(g => g.id === id)?.nom || '—';
}

const TYPE_LABEL = { cours: 'Cours', tp: 'TP', td: 'TD', exam: 'Examen' };

function buildPlanningHTML(sessions, modules, groupes) {
  const rows = sortSessions(sessions).map(s => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;">${format(new Date(s.date), 'EEEE dd/MM', { locale: fr })}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-family:monospace;">${s.heureDebut} – ${s.heureFin}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;">${getModuleName(modules, s.module)}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;">${getGroupeName(groupes, s.groupeId)}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;">${TYPE_LABEL[s.type] || s.type}</td>
      <td style="padding:8px 12px;border:1px solid #e2e8f0;">${s.salle || '—'}</td>
    </tr>`).join('');
  return `<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;font-size:14px;">
    <thead><tr style="background:#005989;color:white;">
      <th style="padding:10px 12px;border:1px solid #004a73;text-align:left;">Jour</th>
      <th style="padding:10px 12px;border:1px solid #004a73;text-align:left;">Horaire</th>
      <th style="padding:10px 12px;border:1px solid #004a73;text-align:left;">Module</th>
      <th style="padding:10px 12px;border:1px solid #004a73;text-align:left;">Groupe</th>
      <th style="padding:10px 12px;border:1px solid #004a73;text-align:left;">Type</th>
      <th style="padding:10px 12px;border:1px solid #004a73;text-align:left;">Salle</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildAndDownloadPDF(intervenant, sessions, modules, groupes, weekStart) {
  const weekEnd = addDays(weekStart, 6);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.setTextColor(0, 89, 137);
  doc.text('IFTL Formation Professionnelle', 14, 20);

  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  doc.text(`Planning de ${intervenant.prenom} ${intervenant.nom}`, 14, 30);

  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    `Semaine du ${format(weekStart, 'dd MMMM', { locale: fr })} au ${format(weekEnd, 'dd MMMM yyyy', { locale: fr })}`,
    14, 38
  );

  const rows = sortSessions(sessions).map(s => [
    format(new Date(s.date), 'EEE dd/MM', { locale: fr }),
    `${s.heureDebut} – ${s.heureFin}`,
    getModuleName(modules, s.module),
    getGroupeName(groupes, s.groupeId),
    TYPE_LABEL[s.type] || s.type,
    s.salle || '—',
  ]);

  autoTable(doc, {
    startY: 44,
    head: [['Jour', 'Horaire', 'Module', 'Groupe', 'Type', 'Salle']],
    body: rows,
    headStyles: { fillColor: [0, 89, 137], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [240, 248, 255] },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 26 }, 2: { cellWidth: 55 }, 3: { cellWidth: 42 }, 4: { cellWidth: 18 }, 5: { cellWidth: 22 } },
  });

  doc.save(`planning_${intervenant.nom}_${format(weekStart, 'ddMMyyyy')}.pdf`);
}

// ── Icons ─────────────────────────────────────────────────────────────────────
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

function PdfIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function PlanningNotificationModal({ sessions, intervenants, modules, groupes, weekStart, onClose }) {
  const cfg = getEmailJSConfig();
  const weekEnd = addDays(weekStart, 6);

  // Group sessions by intervenantId
  const byIntervenant = useMemo(() => {
    const map = {};
    for (const s of sessions) {
      if (!s.intervenantId) continue;
      if (!map[s.intervenantId]) map[s.intervenantId] = [];
      map[s.intervenantId].push(s);
    }
    return map;
  }, [sessions]);

  // List of intervenants with sessions this week
  const activeIntervenants = useMemo(() =>
    intervenants
      .filter(i => byIntervenant[i.id]?.length > 0)
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || '')),
    [intervenants, byIntervenant]
  );

  const [selected, setSelected] = useState(() => new Set(activeIntervenants.map(i => i.id)));
  const [status, setStatus] = useState({}); // id → 'sending' | 'sent' | 'error' | 'no_email'
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState(null); // { intervenant, html }

  const toggleAll = () => {
    if (selected.size === activeIntervenants.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(activeIntervenants.map(i => i.id)));
    }
  };

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSend = async () => {
    if (!cfg?.publicKey) {
      alert('Configuration EmailJS manquante. Allez dans Paramètres > Notifications.');
      return;
    }
    setSending(true);
    const toSend = activeIntervenants.filter(i => selected.has(i.id));
    for (const inv of toSend) {
      if (!inv.email) {
        setStatus(s => ({ ...s, [inv.id]: 'no_email' }));
        continue;
      }
      setStatus(s => ({ ...s, [inv.id]: 'sending' }));
      try {
        const ivSessions = byIntervenant[inv.id] || [];
        const html = buildPlanningHTML(ivSessions, modules, groupes);
        await sendPlanningEmail({
          to_email: inv.email,
          to_name: `${inv.prenom} ${inv.nom}`,
          semaine_debut: format(weekStart, 'dd/MM/yyyy'),
          semaine_fin: format(weekEnd, 'dd/MM/yyyy'),
          nb_seances: ivSessions.length,
          planning_html: html,
        });
        setStatus(s => ({ ...s, [inv.id]: 'sent' }));
      } catch {
        setStatus(s => ({ ...s, [inv.id]: 'error' }));
      }
    }
    setSending(false);
  };

  const handleDownloadPDF = (inv) => {
    buildAndDownloadPDF(inv, byIntervenant[inv.id] || [], modules, groupes, weekStart);
  };

  const sentCount = Object.values(status).filter(v => v === 'sent').length;
  const selectedWithEmail = activeIntervenants.filter(i => selected.has(i.id) && i.email).length;
  const selectedNoEmail = activeIntervenants.filter(i => selected.has(i.id) && !i.email).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Notifier les intervenants</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Semaine du <span className="font-semibold">{format(weekStart, 'dd MMMM', { locale: fr })}</span>{' '}
              au <span className="font-semibold">{format(weekEnd, 'dd MMMM yyyy', { locale: fr })}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* EmailJS warning */}
        {!cfg?.publicKey && (
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            ⚠️ EmailJS non configuré. Allez dans <strong>Paramètres → Notifications</strong> pour activer l'envoi d'emails.
            Vous pouvez néanmoins télécharger les PDFs.
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {activeIntervenants.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm">Aucun intervenant assigné à des séances cette semaine.</p>
            </div>
          ) : (
            <>
              {/* Select all */}
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <input
                  type="checkbox"
                  id="selectAll"
                  checked={selected.size === activeIntervenants.length}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-[#005989] rounded"
                />
                <label htmlFor="selectAll" className="text-sm font-semibold text-slate-700 cursor-pointer">
                  Sélectionner tous ({activeIntervenants.length})
                </label>
              </div>

              {activeIntervenants.map(inv => {
                const ivSessions = byIntervenant[inv.id] || [];
                const st = status[inv.id];
                return (
                  <div
                    key={inv.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                      selected.has(inv.id) ? 'border-[#005989]/30 bg-[#005989]/4' : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(inv.id)}
                      onChange={() => toggle(inv.id)}
                      className="w-4 h-4 accent-[#005989] rounded shrink-0"
                    />
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700 shrink-0">
                      {inv.prenom?.[0]}{inv.nom?.[0]}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{inv.prenom} {inv.nom}</p>
                      <p className={`text-xs ${inv.email ? 'text-slate-500' : 'text-amber-600'}`}>
                        {inv.email || '⚠ Email manquant'}
                      </p>
                    </div>
                    {/* Session count */}
                    <span className="text-xs font-semibold text-[#005989] bg-[#005989]/10 px-2 py-0.5 rounded-full shrink-0">
                      {ivSessions.length} séance{ivSessions.length > 1 ? 's' : ''}
                    </span>
                    {/* Status */}
                    {st === 'sending' && <span className="text-xs text-slate-400 shrink-0">Envoi…</span>}
                    {st === 'sent' && <span className="text-xs text-emerald-600 font-semibold shrink-0">✓ Envoyé</span>}
                    {st === 'error' && <span className="text-xs text-red-500 font-semibold shrink-0">✗ Erreur</span>}
                    {st === 'no_email' && <span className="text-xs text-amber-600 shrink-0">Sans email</span>}
                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setPreview({ inv, html: buildPlanningHTML(ivSessions, modules, groupes) })}
                        title="Aperçu"
                        className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-[#005989]/10 rounded-lg transition-colors text-xs"
                      >
                        👁
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        title="Télécharger PDF"
                        className="p-1.5 text-slate-400 hover:text-[#005989] hover:bg-[#005989]/10 rounded-lg transition-colors"
                      >
                        <PdfIcon />
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          {sentCount > 0 && (
            <p className="text-xs text-emerald-600 font-medium mb-3">
              ✓ {sentCount} email{sentCount > 1 ? 's' : ''} envoyé{sentCount > 1 ? 's' : ''} avec succès
            </p>
          )}
          {selectedNoEmail > 0 && (
            <p className="text-xs text-amber-600 mb-3">
              ⚠ {selectedNoEmail} intervenant{selectedNoEmail > 1 ? 's' : ''} sans adresse email (seront ignorés)
            </p>
          )}
          <div className="flex justify-between items-center gap-3">
            <p className="text-xs text-slate-400">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''} · {selectedWithEmail} avec email
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={handleSend}
                disabled={sending || selected.size === 0 || !cfg?.publicKey}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#005989] hover:bg-[#004a73] rounded-xl transition-colors disabled:opacity-50"
              >
                <SendIcon />
                {sending ? 'Envoi en cours…' : `Envoyer (${selectedWithEmail})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h3 className="text-sm font-bold text-slate-800">
                Aperçu — {preview.inv.prenom} {preview.inv.nom}
              </h3>
              <button onClick={() => setPreview(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <CloseIcon />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div dangerouslySetInnerHTML={{ __html: preview.html }} />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => handleDownloadPDF(preview.inv)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-[#005989] text-[#005989] hover:bg-[#005989]/5 rounded-xl transition-colors"
              >
                <PdfIcon />
                Télécharger PDF
              </button>
              <button onClick={() => setPreview(null)} className="px-4 py-2 text-sm font-medium text-white bg-[#005989] hover:bg-[#004a73] rounded-xl transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
