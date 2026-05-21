/**
 * emailService.js
 *
 * Brevo (Sendinblue) transactional email service.
 * The API key is NEVER stored in the JS bundle (no VITE_ env var).
 * It lives in Firestore at settings/brevo → { apiKey: "..." }
 * and is fetched at runtime from the admin-only document.
 */

import { doc, getDoc, setDoc, addDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';

const SENDER = { name: 'IFTL', email: 'ikrambouzi@gmail.com' };
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// ─── Key management ────────────────────────────────────────────────────────────

/**
 * Reads the Brevo API key from Firestore settings/brevo.
 * Throws if the document doesn't exist or apiKey is missing.
 */
export async function getBrevoKey(db) {
  const snap = await getDoc(doc(db, 'settings', 'brevo'));
  if (!snap.exists()) throw new Error('Configuration Brevo manquante. Veuillez la configurer dans Emails → Configuration.');
  const key = snap.data()?.apiKey;
  if (!key) throw new Error('Clé API Brevo non définie. Veuillez la configurer dans Emails → Configuration.');
  return key;
}

/**
 * Saves the Brevo API key to Firestore settings/brevo.
 */
export async function saveBrevoKey(db, apiKey) {
  await setDoc(doc(db, 'settings', 'brevo'), { apiKey }, { merge: true });
}

// ─── Core send function ────────────────────────────────────────────────────────

/**
 * Sends a transactional email via Brevo REST API.
 *
 * @param {object} db - Firestore db instance
 * @param {object} opts
 * @param {string|string[]} opts.to          - recipient email or [{email, name}]
 * @param {string}          opts.toName      - recipient display name (if to is a string)
 * @param {string}          opts.subject
 * @param {string}          opts.htmlContent
 * @param {string}          [opts.textContent]
 * @param {boolean}         [opts.logToFirestore=true]
 */
export async function sendEmail(db, { to, toName, subject, htmlContent, textContent, logToFirestore = true }) {
  const apiKey = await getBrevoKey(db);

  // Normalise recipients
  const recipients = Array.isArray(to)
    ? to
    : [{ email: to, name: toName || to }];

  const payload = {
    sender: SENDER,
    to: recipients,
    subject,
    htmlContent,
    ...(textContent ? { textContent } : {}),
  };

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errMsg = `Brevo API error ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData?.message || errMsg;
    } catch (_) { /* ignore */ }
    throw new Error(errMsg);
  }

  const result = await response.json();

  // Log to Firestore emails_log
  if (logToFirestore) {
    try {
      await addDoc(collection(db, 'emails_log'), {
        to: recipients.map(r => r.email).join(', '),
        toName: recipients.map(r => r.name || r.email).join(', '),
        subject,
        statut: 'envoyé',
        messageId: result.messageId || null,
        sentAt: new Date(),
      });
    } catch (logErr) {
      console.warn('Email log error (non-blocking):', logErr);
    }
  }

  return result;
}

// ─── Email log ─────────────────────────────────────────────────────────────────

/**
 * Fetches sent email history from Firestore emails_log.
 */
export async function getEmailsLog(db) {
  const q = query(collection(db, 'emails_log'), orderBy('sentAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── HTML Templates ────────────────────────────────────────────────────────────

function baseLayout(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#002d47 0%,#005989 100%);padding:28px 32px;text-align:center">
    <h1 style="color:#f5c845;margin:0;font-size:26px;font-weight:900;letter-spacing:2px">IFTL</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;letter-spacing:1px">Institut de Formation Transport &amp; Logistique</p>
  </div>
  <div style="padding:32px 36px;background:#f8fafc;color:#1e293b">
    ${content}
  </div>
  <div style="background:#001829;padding:16px 24px;text-align:center;color:rgba(255,255,255,0.4);font-size:11px">
    IFTL &mdash; Loi n&deg;09-08 &mdash; CNDP A-PO-268/2024 &mdash; <a href="https://iftl.ma" style="color:rgba(255,255,255,0.4)">iftl.ma</a>
  </div>
</div>
</body></html>`;
}

function btnStyle(color = '#005989') {
  return `display:inline-block;background:${color};color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;margin-top:18px`;
}

// ── Relance paiement ──────────────────────────────────────────────────────────

function relancePaiementHtml({ studentPrenom, studentNom, montantDu, echeance, facturRef }) {
  return baseLayout(`
    <p style="font-size:15px;line-height:1.7">Bonjour <strong>${studentPrenom} ${studentNom}</strong>,</p>
    <p style="line-height:1.7">Nous vous rappelons qu'un règlement de
      <strong style="color:#005989">${montantDu}&nbsp;MAD</strong>
      est attendu avant le <strong>${echeance}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
      <tr style="background:#f8fafc">
        <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0">Référence dossier</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;border-bottom:1px solid #e2e8f0">${facturRef || '—'}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;font-size:13px;color:#64748b;font-weight:600">Montant dû</td>
        <td style="padding:12px 16px;font-size:13px;font-weight:700;color:#dc2626">${montantDu}&nbsp;MAD</td>
      </tr>
    </table>
    <p style="line-height:1.7">Merci de régulariser votre situation auprès du secrétariat dans les meilleurs délais.</p>
    <p style="line-height:1.7;color:#64748b;font-size:13px">Pour tout renseignement, contactez-nous à <a href="mailto:scolarite@iftl.ma" style="color:#005989">scolarite@iftl.ma</a>.</p>
    <p style="margin-top:28px;line-height:1.7">Cordialement,<br><strong>L'administration IFTL</strong></p>
  `);
}

/**
 * Sends a payment reminder email.
 */
export async function sendRelancePaiement(db, { studentNom, studentPrenom, studentEmail, montantDu, echeance, facturRef }) {
  return sendEmail(db, {
    to: studentEmail,
    toName: `${studentPrenom} ${studentNom}`,
    subject: `Rappel de règlement — ${montantDu} MAD — IFTL`,
    htmlContent: relancePaiementHtml({ studentPrenom, studentNom, montantDu, echeance, facturRef }),
    textContent: `Bonjour ${studentPrenom} ${studentNom},\n\nNous vous rappelons qu'un règlement de ${montantDu} MAD est attendu avant le ${echeance}.\nRéf. dossier : ${facturRef || '—'}.\n\nMerci de régulariser votre situation auprès du secrétariat.\n\nCordialement,\nL'administration IFTL`,
  });
}

// ── Convocation ───────────────────────────────────────────────────────────────

function convocationHtml({ studentNom, date, heure, salle, objet }) {
  return baseLayout(`
    <p style="font-size:15px;line-height:1.7">Bonjour <strong>${studentNom}</strong>,</p>
    <p style="line-height:1.7">Vous êtes convoqué(e) pour :</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid #005989;border-radius:8px;padding:20px 24px;margin:20px 0">
      <h2 style="margin:0 0 12px;color:#005989;font-size:17px">${objet}</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:80px;font-weight:600">Date</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700">${date}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600">Heure</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700">${heure}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;font-weight:600">Salle</td>
          <td style="padding:6px 0;font-size:13px;font-weight:700">${salle}</td>
        </tr>
      </table>
    </div>
    <p style="line-height:1.7;color:#64748b;font-size:13px">Veuillez vous présenter 10 minutes avant l'heure indiquée, muni(e) de votre carte d'étudiant.</p>
    <p style="margin-top:28px;line-height:1.7">Cordialement,<br><strong>L'administration IFTL</strong></p>
  `);
}

/**
 * Sends an exam / event convocation email.
 */
export async function sendConvocation(db, { studentNom, studentEmail, date, heure, salle, objet }) {
  return sendEmail(db, {
    to: studentEmail,
    toName: studentNom,
    subject: `Convocation — ${objet} — IFTL`,
    htmlContent: convocationHtml({ studentNom, date, heure, salle, objet }),
    textContent: `Bonjour ${studentNom},\n\nVous êtes convoqué(e) pour : ${objet}\nDate : ${date} à ${heure}\nSalle : ${salle}\n\nVeuillez vous présenter 10 minutes avant l'heure indiquée.\n\nCordialement,\nL'administration IFTL`,
  });
}

// ── Bulletin disponible ───────────────────────────────────────────────────────

function bulletinHtml({ studentNom, groupeNom, annee }) {
  return baseLayout(`
    <p style="font-size:15px;line-height:1.7">Bonjour <strong>${studentNom}</strong>,</p>
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:20px 24px;margin:20px 0;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">📋</div>
      <h2 style="margin:0 0 8px;color:#065f46;font-size:18px">Votre bulletin est disponible</h2>
      <p style="color:#047857;margin:0;font-size:14px">${groupeNom} — Année ${annee}</p>
    </div>
    <p style="line-height:1.7">Votre bulletin de notes est désormais disponible sur votre espace étudiant IFTL.</p>
    <p style="line-height:1.7;color:#64748b;font-size:13px">Connectez-vous au portail ou contactez le secrétariat pour en obtenir une copie imprimée.</p>
    <a href="https://iftl.ma" style="${btnStyle()}">Accéder au portail</a>
    <p style="margin-top:28px;line-height:1.7">Cordialement,<br><strong>L'équipe pédagogique IFTL</strong></p>
  `);
}

/**
 * Sends a notification that the bulletin (report card) is available.
 */
export async function sendBulletinNotif(db, { studentNom, studentEmail, groupeNom, annee }) {
  return sendEmail(db, {
    to: studentEmail,
    toName: studentNom,
    subject: `Votre bulletin est disponible — ${groupeNom} — IFTL`,
    htmlContent: bulletinHtml({ studentNom, groupeNom, annee }),
    textContent: `Bonjour ${studentNom},\n\nVotre bulletin de notes est désormais disponible.\nGroupe : ${groupeNom} — Année : ${annee}\n\nConnectez-vous au portail IFTL pour le consulter.\n\nCordialement,\nL'équipe pédagogique IFTL`,
  });
}

// ── Bienvenue ─────────────────────────────────────────────────────────────────

function bienvenueHtml({ studentNom, studentPrenom, filiere, groupe }) {
  return baseLayout(`
    <p style="font-size:15px;line-height:1.7">Bonjour <strong>${studentPrenom} ${studentNom}</strong>,</p>
    <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:8px;padding:24px;margin:20px 0;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">🎉</div>
      <h2 style="margin:0 0 8px;color:#1e40af;font-size:18px">Bienvenue à l'IFTL !</h2>
      <p style="color:#1d4ed8;margin:0;font-size:14px">${filiere}${groupe ? ` — ${groupe}` : ''}</p>
    </div>
    <p style="line-height:1.7">Nous sommes ravis de vous accueillir au sein de l'Institut de Formation Transport &amp; Logistique.</p>
    <p style="line-height:1.7">Votre dossier a été validé et votre inscription est confirmée. Vous serez contacté(e) prochainement pour les détails pratiques de votre rentrée.</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0">
      <p style="margin:0 0 8px;font-weight:600;color:#374151;font-size:14px">Contacts utiles :</p>
      <p style="margin:4px 0;font-size:13px;color:#64748b">Scolarité : <a href="mailto:scolarite@iftl.ma" style="color:#005989">scolarite@iftl.ma</a></p>
      <p style="margin:4px 0;font-size:13px;color:#64748b">Site web : <a href="https://iftl.ma" style="color:#005989">iftl.ma</a></p>
    </div>
    <p style="margin-top:28px;line-height:1.7">Cordialement,<br><strong>La direction IFTL</strong></p>
  `);
}

/**
 * Sends a welcome email to a newly enrolled student.
 */
export async function sendBienvenue(db, { studentNom, studentPrenom, studentEmail, filiere, groupe }) {
  return sendEmail(db, {
    to: studentEmail,
    toName: `${studentPrenom} ${studentNom}`,
    subject: `Bienvenue à l'IFTL, ${studentPrenom} !`,
    htmlContent: bienvenueHtml({ studentNom, studentPrenom, filiere, groupe }),
    textContent: `Bonjour ${studentPrenom} ${studentNom},\n\nBienvenue à l'IFTL ! Votre inscription en ${filiere} est confirmée.\n\nNous vous contacterons prochainement pour les détails de votre rentrée.\n\nCordialement,\nLa direction IFTL`,
  });
}

// ─── Template metadata (used by UI) ───────────────────────────────────────────

export const EMAIL_TEMPLATES = [
  {
    id: 'relance_paiement',
    label: 'Relance paiement',
    description: 'Rappel de règlement à un apprenant',
    icon: '💳',
    fields: [
      { key: 'studentNom',    label: 'Nom',         type: 'text',   required: true },
      { key: 'studentPrenom', label: 'Prénom',       type: 'text',   required: true },
      { key: 'studentEmail',  label: 'Email',        type: 'email',  required: true },
      { key: 'montantDu',     label: 'Montant (MAD)',type: 'number', required: true },
      { key: 'echeance',      label: 'Échéance',     type: 'date',   required: true },
      { key: 'facturRef',     label: 'Réf. dossier', type: 'text',   required: false },
    ],
    sendFn: sendRelancePaiement,
    previewFn: (vals) => relancePaiementHtml(vals),
  },
  {
    id: 'convocation',
    label: 'Convocation examen / événement',
    description: 'Convocation à un examen, jury ou événement',
    icon: '📋',
    fields: [
      { key: 'studentNom',   label: 'Nom complet', type: 'text',  required: true },
      { key: 'studentEmail', label: 'Email',        type: 'email', required: true },
      { key: 'objet',        label: 'Objet',        type: 'text',  required: true },
      { key: 'date',         label: 'Date',         type: 'date',  required: true },
      { key: 'heure',        label: 'Heure',        type: 'time',  required: true },
      { key: 'salle',        label: 'Salle',        type: 'text',  required: true },
    ],
    sendFn: sendConvocation,
    previewFn: (vals) => convocationHtml(vals),
  },
  {
    id: 'bulletin',
    label: 'Bulletin disponible',
    description: 'Notification de disponibilité du bulletin de notes',
    icon: '📊',
    fields: [
      { key: 'studentNom',   label: 'Nom complet', type: 'text',  required: true },
      { key: 'studentEmail', label: 'Email',        type: 'email', required: true },
      { key: 'groupeNom',    label: 'Groupe',       type: 'text',  required: true },
      { key: 'annee',        label: 'Année',        type: 'text',  required: true },
    ],
    sendFn: sendBulletinNotif,
    previewFn: (vals) => bulletinHtml(vals),
  },
  {
    id: 'bienvenue',
    label: 'Bienvenue nouvel inscrit',
    description: 'Email de bienvenue après confirmation d\'inscription',
    icon: '🎉',
    fields: [
      { key: 'studentNom',    label: 'Nom',     type: 'text',  required: true },
      { key: 'studentPrenom', label: 'Prénom',  type: 'text',  required: true },
      { key: 'studentEmail',  label: 'Email',   type: 'email', required: true },
      { key: 'filiere',       label: 'Filière', type: 'text',  required: true },
      { key: 'groupe',        label: 'Groupe',  type: 'text',  required: false },
    ],
    sendFn: sendBienvenue,
    previewFn: (vals) => bienvenueHtml(vals),
  },
];
