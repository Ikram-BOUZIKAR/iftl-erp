import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { IS_DEMO } from '../utils/brandingConfig';

const YOUSIGN_BASE_URL = import.meta.env.VITE_YOUSIGN_BASE_URL || 'https://api-sandbox.yousign.app/v3';
const YOUSIGN_API_KEY  = import.meta.env.VITE_YOUSIGN_API_KEY  || '';

// ─── Demo helpers ─────────────────────────────────────────────────────────────

let _demoCounter = 1000;
function mockSignatureId() {
  return `demo-sig-${Date.now()}-${_demoCounter++}`;
}

// ─── YouSign API helpers ───────────────────────────────────────────────────────

async function yousignFetch(path, options = {}) {
  const res = await fetch(`${YOUSIGN_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouSign API error ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a document for electronic signature.
 * @param {object} params
 * @param {string} params.documentName   Filename shown to signers (e.g. "Convention_Stage_DUPONT.pdf")
 * @param {string} params.documentBase64 Base64-encoded PDF content (without data: prefix)
 * @param {Array}  params.signers        [{name, email, role}]
 * @param {string} [params.stageId]      Firestore stage document ID to update on completion
 * @returns {Promise<{signatureId: string}>}
 */
export async function sendForSignature({ documentName, documentBase64, signers, stageId }) {
  if (IS_DEMO || !YOUSIGN_API_KEY) {
    return _sendForSignatureDemo({ documentName, signers, stageId });
  }
  return _sendForSignatureYouSign({ documentName, documentBase64, signers, stageId });
}

async function _sendForSignatureDemo({ documentName, signers, stageId }) {
  await new Promise(r => setTimeout(r, 1200));
  const signatureId = mockSignatureId();
  if (stageId) {
    await updateDoc(doc(db, 'stages', stageId), {
      signatureId,
      signatureStatus: 'pending',
      signatureSigners: signers,
      signatureDocumentName: documentName,
      signatureCreatedAt: new Date().toISOString(),
    });
  }
  return { signatureId };
}

async function _sendForSignatureYouSign({ documentName, documentBase64, signers, stageId }) {
  // 1. Create signature request
  const request = await yousignFetch('/signature_requests', {
    method: 'POST',
    body: JSON.stringify({
      name: documentName,
      delivery_mode: 'email',
      timezone: 'Africa/Casablanca',
    }),
  });
  const requestId = request.id;

  // 2. Upload document
  await yousignFetch(`/signature_requests/${requestId}/documents`, {
    method: 'POST',
    body: JSON.stringify({
      name: documentName,
      content: documentBase64,
      nature: 'signable_document',
    }),
  });

  // 3. Add signers
  for (const signer of signers) {
    await yousignFetch(`/signature_requests/${requestId}/signers`, {
      method: 'POST',
      body: JSON.stringify({
        info: { first_name: signer.name.split(' ')[0] || signer.name, last_name: signer.name.split(' ').slice(1).join(' ') || '-', email: signer.email },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'no_otp',
      }),
    });
  }

  // 4. Activate (sends emails to signers)
  await yousignFetch(`/signature_requests/${requestId}/activate`, { method: 'PUT' });

  if (stageId) {
    await updateDoc(doc(db, 'stages', stageId), {
      signatureId: requestId,
      signatureStatus: 'pending',
      signatureSigners: signers,
      signatureDocumentName: documentName,
      signatureCreatedAt: new Date().toISOString(),
    });
  }

  return { signatureId: requestId };
}

/**
 * Check status of a signature request.
 * Returns 'pending' | 'signed' | 'refused' | 'expired' | 'demo'
 */
export async function checkSignatureStatus(signatureId) {
  if (!signatureId) return null;
  if (signatureId.startsWith('demo-sig-')) {
    await new Promise(r => setTimeout(r, 800));
    return 'demo_signed';
  }
  if (!YOUSIGN_API_KEY) return null;
  try {
    const request = await yousignFetch(`/signature_requests/${signatureId}`);
    const statusMap = {
      draft: 'pending',
      ongoing: 'pending',
      done: 'signed',
      refused: 'refused',
      expired: 'expired',
      canceled: 'refused',
    };
    return statusMap[request.status] || request.status;
  } catch {
    return null;
  }
}

/**
 * Persist a confirmed signature status back to Firestore.
 */
export async function confirmSignatureInFirestore(stageId, status) {
  if (!stageId) return;
  await updateDoc(doc(db, 'stages', stageId), {
    signatureStatus: status,
    signedAt: status === 'signed' || status === 'demo_signed' ? new Date().toISOString() : null,
    conventionSignee: status === 'signed' || status === 'demo_signed',
  });
}
