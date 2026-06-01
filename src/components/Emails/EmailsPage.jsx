import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import {
  sendEmail,
  sendRelancePaiement,
  sendConvocation,
  sendBulletinNotif,
  sendBienvenue,
  saveBrevoKey,
  getEmailsLog,
  EMAIL_TEMPLATES,
} from '../../services/emailService';

// ─── Icons ────────────────────────────────────────────────────────────────────

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ small = false }) {
  return (
    <div
      className={`${small ? 'w-4 h-4 border-2' : 'w-5 h-5 border-2'} border-white border-t-transparent rounded-full animate-spin inline-block`}
    />
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'composer', label: 'Composer un email' },
  { id: 'templates', label: 'Templates' },
  { id: 'historique', label: 'Historique' },
  { id: 'config', label: 'Configuration' },
];

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
      {TABS.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
            active === tab.id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Preview modal ────────────────────────────────────────────────────────────

function PreviewModal({ html, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-semibold text-slate-800">Aperçu du template</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <iframe
            title="Email preview"
            srcDoc={html}
            className="w-full h-[600px] border border-slate-200 rounded-lg"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Label + input helpers ────────────────────────────────────────────────────

function Label({ children, required }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input({ ...props }) {
  return (
    <input
      {...props}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989] bg-white text-slate-800 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
    />
  );
}

function Select({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989] bg-white text-slate-800 disabled:bg-slate-50"
    >
      {children}
    </select>
  );
}

function PrimaryButton({ children, loading, onClick, type = 'button', disabled, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      style={{ background: '#005989' }}
    >
      {loading ? <Spinner small /> : children}
    </button>
  );
}

// ─── Tab 1: Composer ──────────────────────────────────────────────────────────

function ComposerTab({ students, groupes, intervenants }) {
  const toast = useToast();

  const [recipientMode, setRecipientMode] = useState('student'); // 'student' | 'intervenant' | 'manual'
  const [selectedGroupeId, setSelectedGroupeId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedIntervenantId, setSelectedIntervenantId] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);

  // Filter students by groupe
  const filteredStudents = selectedGroupeId
    ? students.filter(s => s.groupeId === selectedGroupeId)
    : students;

  // Resolve recipient
  function getRecipient() {
    if (recipientMode === 'manual') {
      return { email: manualEmail.trim(), name: manualName.trim() || manualEmail.trim() };
    }
    if (recipientMode === 'student') {
      const s = students.find(st => st.id === selectedStudentId);
      if (!s) return null;
      return { email: s.email, name: `${s.prenom || ''} ${s.nom || ''}`.trim() };
    }
    if (recipientMode === 'intervenant') {
      const iv = intervenants.find(i => i.id === selectedIntervenantId);
      if (!iv) return null;
      return { email: iv.email, name: `${iv.prenom || ''} ${iv.nom || ''}`.trim() };
    }
    return null;
  }

  async function handleSend(e) {
    e.preventDefault();
    const recipient = getRecipient();
    if (!recipient?.email) { toast.error('Veuillez sélectionner un destinataire.'); return; }
    if (!subject.trim()) { toast.error('Veuillez saisir un objet.'); return; }
    if (!htmlContent.trim()) { toast.error('Veuillez rédiger le contenu de l\'email.'); return; }

    setSending(true);
    try {
      await sendEmail(db, {
        to: recipient.email,
        toName: recipient.name,
        subject: subject.trim(),
        htmlContent,
      });
      toast.success(`Email envoyé à ${recipient.email}`);
      setSubject('');
      setHtmlContent('');
    } catch (err) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  const previewHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${htmlContent}</body></html>`;

  return (
    <div className="space-y-6">
      {showPreview && (
        <PreviewModal html={previewHtml} onClose={() => setShowPreview(false)} />
      )}

      <form onSubmit={handleSend} className="space-y-5">
        {/* Recipient mode selector */}
        <div>
          <Label>Destinataire</Label>
          <div className="flex gap-2 mb-3">
            {[
              { id: 'student', label: 'Apprenant' },
              { id: 'intervenant', label: 'Intervenant' },
              { id: 'manual', label: 'Email manuel' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setRecipientMode(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  recipientMode === m.id
                    ? 'border-[#005989] bg-[#005989]/10 text-[#005989]'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {recipientMode === 'student' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Filtrer par groupe</Label>
                <Select value={selectedGroupeId} onChange={e => { setSelectedGroupeId(e.target.value); setSelectedStudentId(''); }}>
                  <option value="">Tous les groupes</option>
                  {groupes.map(g => (
                    <option key={g.id} value={g.id}>{g.nom}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label required>Apprenant</Label>
                <Select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                  <option value="">Choisir un apprenant…</option>
                  {filteredStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.prenom} {s.nom} {s.email ? `— ${s.email}` : '(sans email)'}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          )}

          {recipientMode === 'intervenant' && (
            <div>
              <Label required>Intervenant</Label>
              <Select value={selectedIntervenantId} onChange={e => setSelectedIntervenantId(e.target.value)}>
                <option value="">Choisir un intervenant…</option>
                {intervenants.map(iv => (
                  <option key={iv.id} value={iv.id}>
                    {iv.prenom} {iv.nom} {iv.email ? `— ${iv.email}` : '(sans email)'}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {recipientMode === 'manual' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label required>Adresse email</Label>
                <Input
                  type="email"
                  placeholder="nom@example.com"
                  value={manualEmail}
                  onChange={e => setManualEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Nom affiché</Label>
                <Input
                  type="text"
                  placeholder="Nom Prénom (optionnel)"
                  value={manualName}
                  onChange={e => setManualName(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Subject */}
        <div>
          <Label required>Objet</Label>
          <Input
            type="text"
            placeholder="Objet de l'email…"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        {/* Content */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label required>Contenu (HTML accepté)</Label>
            {htmlContent && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="flex items-center gap-1.5 text-xs text-[#005989] font-medium hover:underline"
              >
                <EyeIcon />
                Aperçu
              </button>
            )}
          </div>
          <textarea
            value={htmlContent}
            onChange={e => setHtmlContent(e.target.value)}
            rows={10}
            placeholder="Rédigez votre email ici… Vous pouvez utiliser du HTML."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#005989]/30 focus:border-[#005989] font-mono resize-y"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <PrimaryButton type="submit" loading={sending}>
            <SendIcon />
            Envoyer
          </PrimaryButton>
          {htmlContent && (
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              <EyeIcon />
              Aperçu
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─── Tab 2: Templates ─────────────────────────────────────────────────────────

function TemplateCard({ template, students, groupes, intervenants }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [values, setValues] = useState({});
  const [sending, setSending] = useState(false);

  // Student quick-fill
  const [selectedGroupeId, setSelectedGroupeId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  const filteredStudents = selectedGroupeId
    ? students.filter(s => s.groupeId === selectedGroupeId)
    : students;

  function handleStudentPick(studentId) {
    setSelectedStudentId(studentId);
    const s = students.find(st => st.id === studentId);
    if (!s) return;
    setValues(prev => ({
      ...prev,
      studentNom: s.nom || '',
      studentPrenom: s.prenom || '',
      studentEmail: s.email || '',
    }));
  }

  function handleChange(key, val) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  function handlePreview() {
    try {
      const html = template.previewFn(values);
      setPreviewHtml(html);
    } catch (e) {
      setPreviewHtml('<p>Remplissez les champs pour voir l\'aperçu.</p>');
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    // Validate required fields
    for (const f of template.fields) {
      if (f.required && !values[f.key]) {
        toast.error(`Champ requis : ${f.label}`);
        return;
      }
    }
    setSending(true);
    try {
      await template.sendFn(db, values);
      toast.success(`Email "${template.label}" envoyé avec succès.`);
      setValues({});
      setOpen(false);
    } catch (err) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSending(false);
    }
  }

  // Has student fields
  const hasStudentFields = template.fields.some(f =>
    ['studentNom', 'studentPrenom', 'studentEmail'].includes(f.key)
  );

  return (
    <>
      {previewHtml && (
        <PreviewModal html={previewHtml} onClose={() => setPreviewHtml(null)} />
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#005989]/10 flex items-center justify-center shrink-0 text-xl">
            {template.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-800 text-sm">{template.label}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{template.description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              <EyeIcon />
              Aperçu
            </button>
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition"
              style={{ background: '#005989' }}
            >
              <SendIcon />
              Envoyer
              <span className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}>
                <ChevronDownIcon />
              </span>
            </button>
          </div>
        </div>

        {/* Form */}
        {open && (
          <div className="border-t border-slate-100 px-5 py-5 bg-slate-50">
            <form onSubmit={handleSend} className="space-y-4">
              {/* Student quick-fill if applicable */}
              {hasStudentFields && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-medium text-blue-700 mb-2">Sélection rapide depuis la liste</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={selectedGroupeId}
                      onChange={e => { setSelectedGroupeId(e.target.value); setSelectedStudentId(''); }}
                    >
                      <option value="">Tous les groupes</option>
                      {groupes.map(g => (
                        <option key={g.id} value={g.id}>{g.nom}</option>
                      ))}
                    </Select>
                    <Select
                      value={selectedStudentId}
                      onChange={e => handleStudentPick(e.target.value)}
                    >
                      <option value="">Choisir un apprenant…</option>
                      {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.prenom} {s.nom}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              {/* Template fields */}
              <div className="grid grid-cols-2 gap-3">
                {template.fields.map(field => (
                  <div key={field.key}>
                    <Label required={field.required}>{field.label}</Label>
                    <Input
                      type={field.type}
                      value={values[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.label}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <PrimaryButton type="submit" loading={sending}>
                  <SendIcon />
                  Envoyer
                </PrimaryButton>
                <button
                  type="button"
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-white transition"
                >
                  <EyeIcon />
                  Aperçu
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="ml-auto px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-600 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}

function TemplatesTab({ students, groupes, intervenants }) {
  return (
    <div className="space-y-4">
      {EMAIL_TEMPLATES.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          students={students}
          groupes={groupes}
          intervenants={intervenants}
        />
      ))}
    </div>
  );
}

// ─── Tab 3: Historique ────────────────────────────────────────────────────────

function StatusBadge({ statut }) {
  const styles = {
    envoyé: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    erreur: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${styles[statut] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
      {statut}
    </span>
  );
}

function HistoriqueTab() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmailsLog(db);
      setLogs(data);
    } catch (err) {
      toast.error(`Erreur chargement historique : ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  function formatDate(val) {
    if (!val) return '—';
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <div className="w-6 h-6 border-2 border-[#005989] border-t-transparent rounded-full animate-spin mr-2" />
        Chargement…
      </div>
    );
  }

  if (!logs.length) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="font-medium">Aucun email envoyé pour le moment.</p>
        <p className="text-sm mt-1">Les emails envoyés depuis cette interface apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{logs.length} email{logs.length > 1 ? 's' : ''} trouvé{logs.length > 1 ? 's' : ''}</p>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshIcon />
          Actualiser
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Destinataire</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Objet</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition">
                <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(log.sentAt)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 text-sm truncate max-w-[160px]">{log.toName || log.to}</p>
                  <p className="text-xs text-slate-400 truncate max-w-[160px]">{log.to}</p>
                </td>
                <td className="px-4 py-3 text-slate-600 truncate max-w-[200px]">{log.subject}</td>
                <td className="px-4 py-3"><StatusBadge statut={log.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab 4: Configuration ─────────────────────────────────────────────────────

function ConfigTab() {
  const toast = useToast();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load existing key (masked placeholder) on mount
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'brevo'));
        if (snap.exists() && snap.data()?.apiKey) {
          // Don't expose the actual key; just signal it exists
          setApiKey('');
          setLoaded(true);
        }
      } catch (_) {}
    })();
  }, []);

  async function handleSave() {
    if (!apiKey.trim()) { toast.error('La clé API ne peut pas être vide.'); return; }
    setSaving(true);
    try {
      await saveBrevoKey(db, apiKey.trim());
      toast.success('Clé API Brevo enregistrée avec succès.');
      setLoaded(true);
      setApiKey('');
    } catch (err) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      await sendEmail(db, {
        to: 'directeur@iftl.ma',
        toName: 'Direction',
        subject: 'Test de configuration Brevo — ERP',
        htmlContent: `<div style="font-family:Arial,sans-serif;padding:24px">
          <h2 style="color:#005989">Test de configuration Brevo</h2>
          <p>Cet email confirme que la configuration Brevo est opérationnelle sur l'ERP.</p>
          <p style="color:#64748b;font-size:13px">Envoyé le ${new Date().toLocaleString('fr-FR')}</p>
        </div>`,
        textContent: 'Test de configuration Brevo — ERP. La configuration est opérationnelle.',
      });
      toast.success('Email de test envoyé à directeur@iftl.ma');
    } catch (err) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* API Key card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#005989]/10 flex items-center justify-center text-[#005989]">
            <KeyIcon />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Clé API Brevo</h3>
            <p className="text-xs text-slate-500 mt-0.5">Stockée dans Firestore, jamais dans le bundle JS</p>
          </div>
          {loaded && (
            <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <CheckIcon />
              Configurée
            </span>
          )}
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Label required>Nouvelle clé API</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={loaded ? 'Saisir une nouvelle clé pour la remplacer…' : 'xkeysib-…'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <EyeIcon />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Récupérez votre clé sur{' '}
              <a
                href="https://app.brevo.com/settings/keys/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#005989] hover:underline"
              >
                app.brevo.com/settings/keys/api
              </a>
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <PrimaryButton onClick={handleSave} loading={saving} disabled={!apiKey.trim()}>
              <CheckIcon />
              Enregistrer la clé
            </PrimaryButton>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !loaded}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? <Spinner small /> : <SendIcon />}
              Tester la configuration
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
          <InfoIcon />
          Instructions de configuration
        </div>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Créez un compte sur <strong>brevo.com</strong> (gratuit jusqu'à 300 emails/jour).</li>
          <li>Dans votre tableau de bord Brevo, allez dans <strong>SMTP &amp; API → Clés API</strong>.</li>
          <li>Créez une nouvelle clé API et copiez-la.</li>
          <li>Collez-la dans le champ ci-dessus et cliquez sur <strong>Enregistrer</strong>.</li>
          <li>Vérifiez votre domaine expéditeur (<code>iftl.ma</code>) dans <strong>Expéditeurs &amp; IP</strong>.</li>
          <li>Cliquez sur <strong>Tester la configuration</strong> pour valider l'envoi.</li>
        </ol>
      </div>

      {/* Security info */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
        <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
          <KeyIcon />
          Sécurité
        </div>
        <p className="text-sm text-amber-800">
          La clé API est stockée dans <strong>Firestore</strong> dans le document{' '}
          <code className="bg-amber-100 px-1 rounded">settings/brevo</code>, protégé par les règles de sécurité
          Firebase (accès admin uniquement). Elle n'est <strong>jamais</strong> incluse dans le bundle JavaScript
          envoyé au navigateur.
        </p>
      </div>

      {/* Sender config */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h4 className="font-semibold text-slate-800 text-sm mb-3">Expéditeur configuré</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-0.5">Nom</p>
            <p className="font-semibold text-slate-800">Institut</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-0.5">Adresse email</p>
            <p className="font-semibold text-slate-800">no-reply@iftl.ma</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Pour modifier l'expéditeur, éditez la constante <code>SENDER</code> dans{' '}
          <code>src/services/emailService.js</code>.
        </p>
      </div>
    </div>
  );
}

// ─── Main EmailsPage ───────────────────────────────────────────────────────────

export default function EmailsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('composer');

  // Shared data
  const [students, setStudents] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [intervenants, setIntervenants] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setDataLoading(true);
      try {
        const [studSnap, grpSnap, intSnap] = await Promise.all([
          getDocs(query(collection(db, 'students'), orderBy('nom', 'asc'))),
          getDocs(query(collection(db, 'groupes'), orderBy('nom', 'asc'))),
          getDocs(query(collection(db, 'intervenants'), orderBy('nom', 'asc'))),
        ]);
        setStudents(studSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setGroupes(grpSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setIntervenants(intSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        toast.error(`Erreur chargement données : ${err.message}`);
      } finally {
        setDataLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Emails</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Envoi d'emails transactionnels via Brevo (Sendinblue)
          </p>
        </div>
        {dataLoading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-4 h-4 border-2 border-[#005989] border-t-transparent rounded-full animate-spin" />
            Chargement des données…
          </div>
        )}
      </div>

      {/* Tabs */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {activeTab === 'composer' && (
          <ComposerTab
            students={students}
            groupes={groupes}
            intervenants={intervenants}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab
            students={students}
            groupes={groupes}
            intervenants={intervenants}
          />
        )}
        {activeTab === 'historique' && <HistoriqueTab />}
        {activeTab === 'config' && <ConfigTab />}
      </div>
    </div>
  );
}
