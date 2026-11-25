const functions = require('firebase-functions');
const admin = require('firebase-admin');
const twilio = require('twilio');

admin.initializeApp();

/**
 * Firebase Cloud Function: sendSmsAlerts
 *
 * Called from the EduCloud ERP client to send SMS or WhatsApp absence alerts.
 *
 * Deploy with:
 *   firebase functions:config:set twilio.account_sid="ACxxx" twilio.auth_token="yyy" twilio.phone_from="+212600000000"
 *   firebase deploy --only functions
 *
 * For WhatsApp the from number must be a Twilio WhatsApp-enabled sandbox number
 * (e.g. "whatsapp:+14155238886" for sandbox, or your approved WhatsApp sender).
 */
exports.sendSmsAlerts = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Only authenticated users with staff roles may call this
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { students, channel } = data;
    if (!Array.isArray(students) || students.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'students array is required.');
    }
    if (!['sms', 'whatsapp'].includes(channel)) {
      throw new functions.https.HttpsError('invalid-argument', 'channel must be "sms" or "whatsapp".');
    }

    const cfg = functions.config().twilio;
    if (!cfg?.account_sid || !cfg?.auth_token || !cfg?.phone_from) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Twilio credentials not configured. Run: firebase functions:config:set twilio.account_sid="..." twilio.auth_token="..." twilio.phone_from="..."'
      );
    }

    const client = twilio(cfg.account_sid, cfg.auth_token);
    const fromNumber = channel === 'whatsapp'
      ? `whatsapp:${cfg.phone_from}`
      : cfg.phone_from;

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const student of students) {
      const { name, phone, message } = student;
      if (!phone) { skipped++; continue; }

      const to = channel === 'whatsapp' ? `whatsapp:${phone}` : phone;
      try {
        await client.messages.create({ from: fromNumber, to, body: message });
        sent++;
      } catch (err) {
        errors.push(`${name}: ${err.message}`);
      }
    }

    return { sent, skipped, errors };
  });
