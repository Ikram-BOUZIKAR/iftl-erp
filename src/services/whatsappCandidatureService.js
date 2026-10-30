/**
 * whatsappCandidatureService.js
 *
 * Notifications WhatsApp candidatures via UltraMsg.
 * La config est stockée dans Firestore settings/ultramsg → { instance, token }
 * et lue à l'exécution — jamais dans le bundle.
 *
 * Idempotence :
 *   - confirmation soumission : candidature.waConfirmationSent === true
 *   - convocation             : candidature.convocation.waEnvoyee === true
 *   - résultat                : candidature.lastStatutWASent === statut
 */

import { doc, getDoc, updateDoc } from 'firebase/firestore';

// ─── Config ────────────────────────────────────────────────────────────────────

async function getUltraMsgConfig(db) {
  const snap = await getDoc(doc(db, 'settings', 'ultramsg'));
  if (!snap.exists()) throw new Error('Configuration UltraMsg manquante (settings/ultramsg).');
  const { instance, token } = snap.data() || {};
  if (!instance || !token) throw new Error('Champs instance et token requis dans settings/ultramsg.');
  return { instance, token };
}

// ─── Normalisation numéro Maroc ────────────────────────────────────────────────

function normalizePhone(raw) {
  if (!raw) return null;
  let p = String(raw).replace(/[\s\-().]/g, '');
  if (p.startsWith('00212')) return '+212' + p.slice(5);
  if (p.startsWith('+212')) return p;
  if (/^0[5-7]\d{8}$/.test(p)) return '+212' + p.slice(1);
  if (/^\d{9}$/.test(p)) return '+212' + p;
  return p.startsWith('+') ? p : null;
}

// ─── Envoi brut ────────────────────────────────────────────────────────────────

async function sendWhatsApp(db, to, message) {
  const phone = normalizePhone(to);
  if (!phone) throw new Error(`Numéro invalide : ${to}`);
  const { instance, token } = await getUltraMsgConfig(db);
  const body = new URLSearchParams({ token, to: phone, body: message });
  const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => res.status);
    throw new Error(`UltraMsg erreur ${res.status} : ${err}`);
  }
  const json = await res.json().catch(() => ({}));
  if (json.sent === false || json.error) throw new Error(json.error || 'Envoi échoué');
  return json;
}

// ─── Templates ─────────────────────────────────────────────────────────────────

const INST = 'IFTL';
const SUIVI_URL = 'https://erp-pedago-iftl.web.app/suivi-candidature';

function msgConfirmation(c) {
  return `Bonjour ${c.prenom || c.nom},\n\nVotre dossier de candidature à l'${INST} a bien été reçu (réf. ${c.cin || c.id}).\n\nNous vous contacterons sous 48h. En attendant, suivez votre dossier sur :\n${SUIVI_URL}\n\n🎓 ${INST}`;
}

function msgConvocation(c, conv) {
  const date = conv.dateEntretien || '';
  const heure = conv.heureEntretien ? ` à ${conv.heureEntretien}` : '';
  const salle = conv.salle ? `\nSalle : ${conv.salle}` : '';
  const code = conv.codeExamen ? `\nCode candidat : ${conv.codeExamen}` : '';
  const note = conv.noteConvocation ? `\n\n📌 ${conv.noteConvocation}` : '';
  return `Bonjour ${c.prenom || c.nom},\n\nVous êtes convoqué(e) pour un entretien de sélection le ${date}${heure}.${salle}${code}${note}\n\n📍 ${INST} – Nouaceur, Casablanca`;
}

const MSG_RESULTAT = {
  admis:         c => `Félicitations ${c.prenom || c.nom} ! 🎉\n\nVotre candidature à l'${INST} a été acceptée.\nConnectez-vous pour finaliser votre inscription :\n${SUIVI_URL}`,
  refuse:        c => `Bonjour ${c.prenom || c.nom},\n\nNous avons examiné votre dossier avec attention mais ne pouvons pas y donner suite pour cette session. Nous vous souhaitons bonne continuation.\n\n${INST}`,
  liste_attente: c => `Bonjour ${c.prenom || c.nom},\n\nVotre dossier est en liste d'attente. Nous vous contacterons rapidement si une place se libère.\n\n${INST}`,
  valide:        c => `Bonjour ${c.prenom || c.nom},\n\nVotre dossier a été validé. L'étape suivante est la convocation pour un entretien. Nous vous contacterons prochainement.\n\n${INST}`,
  incomplet:     c => `Bonjour ${c.prenom || c.nom},\n\nVotre dossier de candidature est incomplet. Merci de vous connecter pour ajouter les pièces manquantes :\n${SUIVI_URL}\n\n${INST}`,
};

// ─── Fonctions publiques ───────────────────────────────────────────────────────

/**
 * Envoie un WhatsApp de confirmation de soumission.
 * Idempotent : ne renvoie pas si candidature.waConfirmationSent === true.
 */
export async function sendConfirmationCandidatureWA(db, candidature) {
  if (candidature.waConfirmationSent) return;
  if (!candidature.telephone) return;
  await sendWhatsApp(db, candidature.telephone, msgConfirmation(candidature));
  await updateDoc(doc(db, 'candidatures', candidature.id), { waConfirmationSent: true });
}

/**
 * Envoie un WhatsApp de convocation.
 * Idempotent : ne renvoie pas si convocation.waEnvoyee === true.
 */
export async function sendConvocationWA(db, candidature, convData) {
  if (candidature.convocation?.waEnvoyee) return;
  if (!candidature.telephone) return;
  await sendWhatsApp(db, candidature.telephone, msgConvocation(candidature, convData));
  await updateDoc(doc(db, 'candidatures', candidature.id), {
    'convocation.waEnvoyee': true,
  });
}

/**
 * Envoie un WhatsApp de résultat (admis / refusé / liste_attente / valide / incomplet).
 * Idempotent : ne renvoie pas si lastStatutWASent === statut.
 */
export async function sendResultatWA(db, candidature, statut) {
  if (candidature.lastStatutWASent === statut) return;
  if (!candidature.telephone) return;
  const template = MSG_RESULTAT[statut];
  if (!template) return;
  await sendWhatsApp(db, candidature.telephone, template(candidature));
  await updateDoc(doc(db, 'candidatures', candidature.id), { lastStatutWASent: statut });
}
