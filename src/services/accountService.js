import { doc, setDoc, getDocs, query, collection, where } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from './firebase';

const STAFF_ROLES = ['admin', 'direction', 'scolarite'];

/**
 * Creates a Firebase Auth account + Firestore users doc.
 * Uses the REST API so the current admin session is NOT affected.
 * Sends a password-reset email so the new user sets their own password.
 *
 * @param {object} opts
 * @param {string} opts.email        - Email address for the new account
 * @param {string} opts.role         - 'apprenant' | 'parent' | 'intervenant'
 * @param {string} opts.nom
 * @param {string} opts.prenom
 * @param {string} [opts.linkedField] - Firestore field name linking to the profile doc (e.g. 'studentId')
 * @param {string} [opts.linkedId]    - ID of the linked profile doc
 * @param {string} currentUserRole    - Role of the staff member performing the action
 * @returns {{ uid, email } | { alreadyExists: true, email }}
 */
export async function createCompteERP({ email, role, nom, prenom, linkedField, linkedId }, currentUserRole) {
  if (!STAFF_ROLES.includes(currentUserRole)) {
    throw new Error('Permission refusée');
  }
  if (!email?.trim()) throw new Error('Email requis');

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Clé API Firebase manquante');

  // Check no users doc already linked to this profile
  if (linkedField && linkedId) {
    const snap = await getDocs(query(collection(db, 'users'), where(linkedField, '==', linkedId)));
    if (!snap.empty) return { alreadyExists: true, email };
  }

  // Create Firebase Auth user via REST API (doesn't affect current admin session)
  const tempPassword = crypto.randomUUID().replace(/-/g, '') + 'Aa1!';
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password: tempPassword, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    if (data.error?.message === 'EMAIL_EXISTS') return { alreadyExists: true, email };
    throw new Error(data.error?.message || 'Erreur création compte');
  }

  const uid = data.localId;

  // Create users/{uid} Firestore doc
  const userDoc = {
    role,
    email: email.trim(),
    nom: nom || '',
    prenom: prenom || '',
    createdAt: new Date(),
    ...(linkedField && linkedId ? { [linkedField]: linkedId } : {}),
  };
  await setDoc(doc(db, 'users', uid), userDoc);

  // Send password-reset email (acts as "set your password" for new accounts)
  await sendPasswordResetEmail(auth, email.trim());

  return { uid, email: email.trim() };
}
