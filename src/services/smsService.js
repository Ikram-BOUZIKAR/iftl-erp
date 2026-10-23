import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';
import { IS_DEMO, INSTITUTE_NAME } from '../utils/brandingConfig';

const functions = getFunctions(app, 'europe-west1');

function buildSmsMessage(name, score, groupeName, instituteName) {
  return `[${instituteName}] Bonjour ${name}, votre taux d'absence (score: ${score}) dépasse le seuil autorisé${groupeName ? ` (${groupeName})` : ''}. Merci de vous rapprocher de votre coordinateur.`;
}

/**
 * Send SMS absence alerts to at-risk students.
 * In demo mode: simulates send and returns mock results.
 * In production: calls Firebase Cloud Function 'sendSmsAlerts' (Twilio backend).
 *
 * @param {Array} students - [{name, phone, score, groupeName}]
 * @param {string} [messageTemplate] - Optional custom message (use {name}, {score}, {group} placeholders)
 * @returns {Promise<{sent: number, skipped: number, errors: string[]}>}
 */
export async function sendSmsAbsenceAlerts(students, messageTemplate) {
  if (IS_DEMO) {
    const withPhone = students.filter(s => s.phone);
    console.info(`[DEMO] SMS: would send ${withPhone.length}/${students.length} SMS`, students);
    await new Promise(r => setTimeout(r, 600));
    return { sent: withPhone.length, skipped: students.length - withPhone.length, errors: [] };
  }

  const payload = students.map(s => ({
    name: s.name,
    phone: s.phone,
    score: s.score,
    groupeName: s.groupeName || '',
    message: messageTemplate
      ? messageTemplate.replace('{name}', s.name).replace('{score}', s.score).replace('{group}', s.groupeName || '')
      : buildSmsMessage(s.name, s.score, s.groupeName, INSTITUTE_NAME),
  }));

  const sendSmsAlerts = httpsCallable(functions, 'sendSmsAlerts');
  const result = await sendSmsAlerts({ students: payload, channel: 'sms' });
  return result.data;
}

/**
 * Send WhatsApp absence alerts to at-risk students.
 * Identical contract to sendSmsAbsenceAlerts but uses WhatsApp channel.
 */
export async function sendWhatsappAbsenceAlerts(students, messageTemplate) {
  if (IS_DEMO) {
    const withPhone = students.filter(s => s.phone);
    console.info(`[DEMO] WhatsApp: would send ${withPhone.length}/${students.length} messages`, students);
    await new Promise(r => setTimeout(r, 600));
    return { sent: withPhone.length, skipped: students.length - withPhone.length, errors: [] };
  }

  const payload = students.map(s => ({
    name: s.name,
    phone: s.phone,
    score: s.score,
    groupeName: s.groupeName || '',
    message: messageTemplate
      ? messageTemplate.replace('{name}', s.name).replace('{score}', s.score).replace('{group}', s.groupeName || '')
      : buildSmsMessage(s.name, s.score, s.groupeName, INSTITUTE_NAME),
  }));

  const sendSmsAlerts = httpsCallable(functions, 'sendSmsAlerts');
  const result = await sendSmsAlerts({ students: payload, channel: 'whatsapp' });
  return result.data;
}
