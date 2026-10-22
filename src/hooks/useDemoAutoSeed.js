import { useEffect, useRef } from 'react';
import { collection, doc, getDocs, query, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../services/firebase';
import { IS_DEMO } from '../utils/brandingConfig';
import {
  SEED_BRANDING, SEED_GROUPES, SEED_STUDENTS,
  SEED_INTERVENANTS, SEED_MODULES, SEED_SESSIONS,
  SEED_PRESENCES, SEED_FACTURES, SEED_JUSTIFICATIFS,
} from '../data/seedData';

const STORAGE_KEY = 'demo_auto_seeded_v1';

async function collectionSize(name) {
  const snap = await getDocs(query(collection(db, name)));
  return snap.size;
}

async function batchImport(collectionName, items, idField = null) {
  const CHUNK = 450;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK).forEach(item => {
      const { id: _id, ...data } = item;
      const ref = idField
        ? doc(db, collectionName, item[idField])
        : doc(collection(db, collectionName));
      batch.set(ref, { ...data, importedAt: new Date() });
    });
    await batch.commit();
  }
}

async function runSeed() {
  // Branding (always overwrite to ensure demo name shows)
  await setDoc(doc(db, 'settings', 'branding'), { ...SEED_BRANDING, importedAt: new Date() });

  if ((await collectionSize('groupes')) === 0)
    await batchImport('groupes', SEED_GROUPES, 'id');

  if ((await collectionSize('students')) < 5)
    await batchImport('students', SEED_STUDENTS, 'codeApprenant');

  if ((await collectionSize('intervenants')) === 0)
    await batchImport('intervenants', SEED_INTERVENANTS, 'id');

  if ((await collectionSize('modules')) === 0)
    await batchImport('modules', SEED_MODULES, 'id');

  if ((await collectionSize('sessions')) === 0) {
    await batchImport('sessions', SEED_SESSIONS, 'id');
    await batchImport('presences', SEED_PRESENCES);
  }

  if ((await collectionSize('factures')) === 0)
    await batchImport('factures', SEED_FACTURES, 'id');

  if ((await collectionSize('justificatifs_paiement')) === 0)
    await batchImport('justificatifs_paiement', SEED_JUSTIFICATIFS);

  try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
}

export function useDemoAutoSeed() {
  const ran = useRef(false);

  useEffect(() => {
    if (!IS_DEMO || ran.current) return;
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch (_) {}

    ran.current = true;
    runSeed().catch(err => console.warn('[demo-seed]', err));
  }, []);
}
