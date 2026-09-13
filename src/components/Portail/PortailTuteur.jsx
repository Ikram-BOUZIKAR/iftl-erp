import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { sendEmail } from '../../services/emailService';

const NAVY  = '#001829';
const BLUE  = '#005989';
const YELLOW = '#f5c845';

function Ico({ path, path2, size = 'w-5 h-5', stroke = 'currentColor', sw = 1.5 }) {
  return (
    <svg className={size} fill="none" stroke={stroke} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={path} />
      {path2 && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={sw} d={path2} />}
    </svg>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Badge({ label, color = '#64748b', bg = '#f1f5f9' }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: bg, color }}>
      {label}
    </span>
  );
}

// ── StudentInfoCard ──────────────────────────────────────────────────────────
function StudentInfoCard({ student, groupe }) {
  if (!student) return null;
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0"
             style={{ background: BLUE }}>
          {student.prenom?.[0]}{student.nom?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-slate-800">{student.prenom} {student.nom}</h2>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {student.code && <Badge label={`Code : ${student.code}`} color={BLUE} bg="#eff6ff" />}
            {student.filiere && <Badge label={student.filiere} />}
            {groupe && <Badge label={groupe.nom} color="#047857" bg="#ecfdf5" />}
            {student.statut && (
              <Badge
                label={student.statut}
                color={student.statut === 'actif' ? '#047857' : '#92400e'}
                bg={student.statut === 'actif' ? '#ecfdf5' : '#fffbeb'}
              />
            )}
          </div>
        </div>
      </div>
      {(student.email || student.telephone) && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm text-slate-600">
          {student.email && (
            <div className="flex items-center gap-2">
              <Ico path="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" size="w-4 h-4" />
              <span className="truncate">{student.email}</span>
            </div>
          )}
          {student.telephone && (
            <div className="flex items-center gap-2">
              <Ico path="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" size="w-4 h-4" />
              <span>{student.telephone}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── AbsencesTab ──────────────────────────────────────────────────────────────
function AbsencesTab({ studentId }) {
  const [presences, setPresences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    (async () => {
      try {
        const q = query(collection(db, 'presences'), where('studentId', '==', studentId));
        const snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        all.sort((a, b) => {
          const da = a.date?.toDate?.() || new Date(a.date || 0);
          const db_ = b.date?.toDate?.() || new Date(b.date || 0);
          return db_ - da;
        });
        setPresences(all);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [studentId]);

  const absences = presences.filter(p => p.statut === 'absent');
  const retards  = presences.filter(p => p.statut === 'retard');
  const total    = presences.length;
  const presents = presences.filter(p => p.statut === 'present').length;

  const score = absences.length + retards.length * 0.5;
  const riskLevel = score >= 5 ? 'danger' : score >= 3 ? 'warning' : 'ok';
  const riskColor = { ok: '#047857', warning: '#92400e', danger: '#991b1b' }[riskLevel];
  const riskBg    = { ok: '#ecfdf5', warning: '#fffbeb', danger: '#fef2f2' }[riskLevel];
  const riskLabel = { ok: 'Assiduité correcte', warning: 'Vigilance absences', danger: 'Situation critique' }[riskLevel];

  if (loading) return <div className="py-12 text-center text-slate-400">Chargement…</div>;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Présences', value: presents, color: '#047857', bg: '#ecfdf5' },
          { label: 'Absences', value: absences.length, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Retards', value: retards.length, color: '#d97706', bg: '#fffbeb' },
          { label: 'Total séances', value: total, color: '#475569', bg: '#f1f5f9' },
        ].map(({ label, value, color, bg }) => (
          <Card key={label} className="p-4 text-center">
            <div className="text-2xl font-black" style={{ color }}>{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </Card>
        ))}
      </div>

      {/* Risk level */}
      <div className="rounded-xl p-4 flex items-center gap-3" style={{ background: riskBg, border: `1px solid ${riskColor}30` }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: riskColor + '20' }}>
          <Ico path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" size="w-4 h-4" stroke={riskColor} />
        </div>
        <div>
          <div className="text-sm font-bold" style={{ color: riskColor }}>{riskLabel}</div>
          <div className="text-xs mt-0.5" style={{ color: riskColor + 'aa' }}>
            Score : {score} pt{score !== 1 ? 's' : ''} (1 pt / absence · 0,5 pt / retard)
          </div>
        </div>
      </div>

      {/* Absence list */}
      {absences.length === 0 && retards.length === 0 ? (
        <Card className="p-8 text-center text-slate-400 text-sm">Aucune absence enregistrée</Card>
      ) : (
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Détail des absences et retards</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {presences.filter(p => p.statut !== 'present').map(p => {
              const d = p.date?.toDate?.() || new Date(p.date || 0);
              const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
              const isAbsent = p.statut === 'absent';
              return (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${isAbsent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isAbsent ? 'Absent' : 'Retard'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{p.moduleNom || p.titre || 'Séance'}</div>
                    <div className="text-xs text-slate-400">{dateStr}{p.heureDebut ? ` · ${p.heureDebut}` : ''}</div>
                  </div>
                  {p.justifie && (
                    <span className="text-xs text-green-600 font-medium">Justifiée</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── PlanningTab ──────────────────────────────────────────────────────────────
function PlanningTab({ student }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student?.groupeId) { setLoading(false); return; }
    (async () => {
      try {
        const now = new Date();
        const fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        const q = query(
          collection(db, 'sessions'),
          where('groupeId', '==', student.groupeId),
          orderBy('date', 'desc')
        );
        const snap = await getDocs(q);
        const all = snap.docs.map(d => {
          const data = d.data();
          const date = data.date?.toDate?.() || new Date(data.date || 0);
          return { id: d.id, ...data, date };
        });
        setSessions(all.slice(0, 30));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [student?.groupeId]);

  if (loading) return <div className="py-12 text-center text-slate-400">Chargement…</div>;
  if (!student?.groupeId) return <Card className="p-8 text-center text-slate-400 text-sm">Aucun groupe associé à cet apprenant.</Card>;

  const upcoming = sessions.filter(s => s.date >= new Date());
  const past = sessions.filter(s => s.date < new Date());

  return (
    <div className="space-y-4">
      {upcoming.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Prochaines séances</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {upcoming.slice(0, 10).map(s => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </Card>
      )}
      {past.length > 0 && (
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Séances passées</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {past.slice(0, 20).map(s => (
              <SessionRow key={s.id} session={s} past />
            ))}
          </div>
        </Card>
      )}
      {sessions.length === 0 && (
        <Card className="p-8 text-center text-slate-400 text-sm">Aucune séance planifiée</Card>
      )}
    </div>
  );
}

function SessionRow({ session, past }) {
  const dateStr = session.date instanceof Date
    ? session.date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
    : '—';
  return (
    <div className={`px-5 py-3 flex items-center gap-3 ${past ? 'opacity-60' : ''}`}>
      <div className="w-10 text-center shrink-0">
        <div className="text-xs font-bold" style={{ color: BLUE }}>
          {session.date instanceof Date ? session.date.toLocaleDateString('fr-FR', { day: '2-digit' }) : '—'}
        </div>
        <div className="text-xs text-slate-400">
          {session.date instanceof Date ? session.date.toLocaleDateString('fr-FR', { month: 'short' }) : ''}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{session.moduleNom || session.titre || 'Séance'}</div>
        <div className="text-xs text-slate-400">
          {session.heureDebut && session.heureFin ? `${session.heureDebut} – ${session.heureFin}` : ''}
          {session.intervenantNom ? ` · ${session.intervenantNom}` : ''}
          {session.salle ? ` · Salle ${session.salle}` : ''}
        </div>
      </div>
    </div>
  );
}

// ── EmailTab ─────────────────────────────────────────────────────────────────
function EmailTab({ tuteurUser, student }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    setError('');
    try {
      const tuteurNom = `${tuteurUser?.prenom || ''} ${tuteurUser?.nom || ''}`.trim() || 'Tuteur';
      const studentNom = student ? `${student.prenom || ''} ${student.nom || ''}`.trim() : '—';
      const htmlContent = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:0"><div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><div style="background:linear-gradient(135deg,#002d47,#005989);padding:24px 32px"><h1 style="color:#f5c845;margin:0;font-size:22px;font-weight:900;letter-spacing:2px">IFTL</h1><p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:12px">Message d'un tuteur/parent</p></div><div style="padding:28px 32px"><p style="color:#334155;line-height:1.6"><strong>De :</strong> ${tuteurNom} (${tuteurUser?.email || ''})</p><p style="color:#334155;line-height:1.6"><strong>Apprenant concerné :</strong> ${studentNom}${student?.code ? ` (${student.code})` : ''}</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/><h2 style="color:#001829;margin:0 0 12px;font-size:16px">${subject}</h2><div style="color:#334155;line-height:1.7;white-space:pre-wrap">${message}</div><hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/><p style="color:#64748b;font-size:12px">Ce message a été envoyé depuis le portail tuteur IFTL.</p></div><div style="background:#001829;padding:14px 24px;text-align:center;color:rgba(255,255,255,0.4);font-size:11px">IFTL — Loi n°09-08 — CNDP A-PO-268/2024</div></div></body></html>`;
      await sendEmail(db, {
        to: 'scolarite@iftl.ma',
        toName: 'Scolarité IFTL',
        subject: `[Tuteur] ${subject}`,
        htmlContent,
        textContent: `De : ${tuteurNom} (${tuteurUser?.email || ''})\nApprenant : ${studentNom}\n\n${message}`,
      });

      // Log the contact
      try {
        await addDoc(collection(db, 'appels_tuteurs'), {
          tuteurId: tuteurUser?.uid,
          tuteurNom,
          tuteurEmail: tuteurUser?.email,
          studentId: student?.id,
          studentNom,
          studentCode: student?.code,
          objet: subject,
          type: 'email',
          createdAt: new Date(),
        });
      } catch { /* non-blocking */ }

      setSent(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Card className="p-8 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#ecfdf5' }}>
          <Ico path="M5 13l4 4L19 7" size="w-7 h-7" stroke="#047857" sw={2.5} />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Message envoyé</h3>
        <p className="text-slate-500 text-sm mb-6">L'équipe de scolarité a reçu votre message et vous répondra prochainement.</p>
        <button
          onClick={() => setSent(false)}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: BLUE }}
        >
          Envoyer un autre message
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Contacter la scolarité</h3>
        <p className="text-xs text-slate-400 mt-0.5">Votre message sera transmis à scolarite@iftl.ma</p>
      </div>
      <form onSubmit={handleSend} className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Objet</label>
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Ex: Justificatif d'absence, demande de rendez-vous…"
            required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white outline-none focus:border-[#005989]"
            style={{ transition: 'border-color .15s' }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Écrivez votre message ici…"
            required
            rows={6}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-800 bg-white outline-none focus:border-[#005989] resize-none"
            style={{ transition: 'border-color .15s' }}
          />
        </div>
        {error && (
          <div className="flex gap-2 p-3 rounded-xl text-sm bg-red-50 border border-red-200 text-red-700">
            <Ico path="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" size="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={sending || !subject.trim() || !message.trim()}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: BLUE }}
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Envoi…
            </>
          ) : (
            <>
              <Ico path="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" size="w-4 h-4" />
              Envoyer à la scolarité
            </>
          )}
        </button>
      </form>
    </Card>
  );
}

// ── Main PortailTuteur ────────────────────────────────────────────────────────
const TABS = [
  { id: 'absences', label: 'Absences', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'planning', label: 'Planning',  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'contact',  label: 'Contacter la scolarité', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

export default function PortailTuteur({ auth }) {
  const [tuteurUser, setTuteurUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [groupe, setGroupe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('absences');

  useEffect(() => {
    const uid = auth?.user?.uid;
    if (!uid) return;
    (async () => {
      try {
        // Load tuteur user record
        const userSnap = await getDoc(doc(db, 'users', uid));
        if (!userSnap.exists()) return;
        const userData = { uid, ...userSnap.data() };
        setTuteurUser(userData);

        // Find linked student
        const code = userData.codeApprenant || userData.studentCode;
        if (!code) { setLoading(false); return; }

        // Try by document id first, then by 'code' field
        let studentData = null;
        const byId = await getDoc(doc(db, 'students', code));
        if (byId.exists()) {
          studentData = { id: byId.id, ...byId.data() };
        } else {
          const q = query(collection(db, 'students'), where('code', '==', code));
          const snap = await getDocs(q);
          if (!snap.empty) studentData = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
        setStudent(studentData);

        // Load groupe
        if (studentData?.groupeId) {
          const gSnap = await getDoc(doc(db, 'groupes', studentData.groupeId));
          if (gSnap.exists()) setGroupe({ id: gSnap.id, ...gSnap.data() });
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [auth?.user?.uid]);

  const handleLogout = useCallback(async () => {
    await auth.logout?.();
  }, [auth]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: `${BLUE}40`, borderTopColor: 'transparent' }} />
          <p className="text-slate-500 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="shadow-sm" style={{ background: NAVY }}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0"
                 style={{ background: YELLOW, color: NAVY }}>
              IF
            </div>
            <div>
              <div className="font-bold text-white text-sm leading-tight">IFTL</div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Espace tuteur</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-semibold text-white leading-tight">
                {tuteurUser?.prenom} {tuteurUser?.nom}
              </div>
              <div className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Parent / Tuteur</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.08)' }}
              title="Déconnexion"
            >
              <Ico path="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" size="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* No student linked */}
        {!student && !loading && (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Aucun apprenant lié</h3>
            <p className="text-slate-500 text-sm">
              Votre compte n'est pas encore lié à un apprenant.
              Contactez la scolarité : <a href="mailto:scolarite@iftl.ma" className="text-[#005989] font-medium">scolarite@iftl.ma</a>
            </p>
          </Card>
        )}

        {student && (
          <>
            <StudentInfoCard student={student} groupe={groupe} />

            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-slate-200 p-1.5 shadow-sm overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap"
                  style={activeTab === tab.id
                    ? { background: BLUE, color: '#fff', boxShadow: `0 2px 8px ${BLUE}40` }
                    : { color: '#64748b' }
                  }
                >
                  <Ico path={tab.icon} size="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'absences' && <AbsencesTab studentId={student.id} />}
            {activeTab === 'planning'  && <PlanningTab student={student} />}
            {activeTab === 'contact'   && <EmailTab tuteurUser={tuteurUser} student={student} />}
          </>
        )}

        {/* Contact link even without student */}
        {!student && (
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Contacter la scolarité</h3>
            </div>
            <EmailTab tuteurUser={tuteurUser} student={null} />
          </Card>
        )}
      </main>
    </div>
  );
}
