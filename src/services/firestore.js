import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v?.toDate) return v.toDate();
  return new Date(v);
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsService = {
  async getAll(filters = {}) {
    try {
      const q = query(collection(db, 'students'), orderBy('nom', 'asc'));
      const snapshot = await getDocs(q);
      let students = [];
      snapshot.forEach(d => students.push({ id: d.id, ...d.data() }));
      if (filters.filiere) students = students.filter(s => s.filiere === filters.filiere);
      if (filters.statut) students = students.filter(s => s.statut === filters.statut);
      if (filters.groupeId) students = students.filter(s => s.groupeId === filters.groupeId);
      return students;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },
  async getById(id) {
    const docRef = doc(db, 'students', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'students'), {
      ...data,
      statut: data.statut || 'actif',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: docRef.id, ...data };
  },
  async update(id, data) {
    const docRef = doc(db, 'students', id);
    await updateDoc(docRef, { ...data, updatedAt: new Date() });
    return { id, ...data };
  },
  async delete(id) {
    await deleteDoc(doc(db, 'students', id));
    return true;
  }
};

// ─── Groupes ──────────────────────────────────────────────────────────────────
export const groupesService = {
  async getAll(filters = {}) {
    // No orderBy — fetch all docs regardless of whether they have a 'nom' field, sort in memory
    const snapshot = await getDocs(collection(db, 'groupes'));
    let groupes = [];
    snapshot.forEach(d => groupes.push({ id: d.id, ...d.data() }));
    groupes.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    if (filters.actif !== undefined) groupes = groupes.filter(g => g.actif === filters.actif);
    if (filters.filiere) groupes = groupes.filter(g => g.filiere === filters.filiere);
    return groupes;
  },
  async getById(id) {
    const docSnap = await getDoc(doc(db, 'groupes', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'groupes'), {
      ...data,
      actif: true,
      createdAt: new Date()
    });
    return { id: docRef.id, ...data };
  },
  async update(id, data) {
    await updateDoc(doc(db, 'groupes', id), { ...data, updatedAt: new Date() });
    return { id, ...data };
  },
  async delete(id) {
    await deleteDoc(doc(db, 'groupes', id));
    return true;
  }
};

// ─── Intervenants ─────────────────────────────────────────────────────────────
export const intervenantsService = {
  async getAll() {
    // No where+orderBy on different fields (requires composite index). Fetch all, filter in memory.
    const snapshot = await getDocs(collection(db, 'intervenants'));
    const intervenants = [];
    snapshot.forEach(d => intervenants.push({ id: d.id, ...d.data() }));
    return intervenants
      .filter(i => i.actif !== false)
      .sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  },
  async getAllIncludingInactive() {
    const snapshot = await getDocs(collection(db, 'intervenants'));
    const intervenants = [];
    snapshot.forEach(d => intervenants.push({ id: d.id, ...d.data() }));
    return intervenants.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
  },
  async getById(id) {
    const docSnap = await getDoc(doc(db, 'intervenants', id));
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'intervenants'), { ...data, actif: true, createdAt: new Date() });
    return { id: docRef.id, ...data };
  },
  async update(id, data) {
    await updateDoc(doc(db, 'intervenants', id), { ...data, updatedAt: new Date() });
    return { id, ...data };
  }
};

// ─── Sessions (EDT) ───────────────────────────────────────────────────────────
export const sessionsService = {
  async getAll(filters = {}) {
    let q = query(collection(db, 'sessions'), orderBy('date', 'asc'));
    const snapshot = await getDocs(q);
    let sessions = [];
    snapshot.forEach(d => sessions.push({ id: d.id, ...d.data(), date: toDate(d.data().date) }));
    if (filters.groupeId) sessions = sessions.filter(s => s.groupeId === filters.groupeId);
    if (filters.intervenantId) sessions = sessions.filter(s => s.intervenantId === filters.intervenantId);
    if (filters.statut) sessions = sessions.filter(s => s.statut === filters.statut);
    return sessions;
  },
  async getWeek(startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const q = query(
      collection(db, 'sessions'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    const sessions = [];
    snapshot.forEach(d => sessions.push({ id: d.id, ...d.data(), date: toDate(d.data().date) }));
    return sessions;
  },
  async getById(id) {
    const docSnap = await getDoc(doc(db, 'sessions', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), date: toDate(docSnap.data().date) };
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'sessions'), {
      ...data,
      date: Timestamp.fromDate(new Date(data.date)),
      statut: data.statut || 'planifiee',
      emargementOuvert: false,
      createdAt: new Date()
    });
    return { id: docRef.id, ...data };
  },
  async update(id, data) {
    const payload = { ...data, updatedAt: new Date() };
    if (data.date) payload.date = Timestamp.fromDate(new Date(data.date));
    await updateDoc(doc(db, 'sessions', id), payload);
    return { id, ...data };
  },
  async delete(id) {
    await deleteDoc(doc(db, 'sessions', id));
    return true;
  },
  async openEmargement(id) {
    await updateDoc(doc(db, 'sessions', id), { emargementOuvert: true, statut: 'en_cours', updatedAt: new Date() });
  },
  async closeEmargement(id) {
    await updateDoc(doc(db, 'sessions', id), { emargementOuvert: false, statut: 'terminee', updatedAt: new Date() });
  }
};

// ─── Presences ────────────────────────────────────────────────────────────────
export const presencesService = {
  async getBySession(sessionId) {
    const q = query(collection(db, 'presences'), where('sessionId', '==', sessionId));
    const snapshot = await getDocs(q);
    const presences = [];
    snapshot.forEach(d => presences.push({ id: d.id, ...d.data() }));
    return presences;
  },
  async getByStudent(studentId) {
    // No where+orderBy on different fields. Fetch + sort in memory.
    const q = query(collection(db, 'presences'), where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    const presences = [];
    snapshot.forEach(d => presences.push({ id: d.id, ...d.data() }));
    presences.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt || 0);
      return tb - ta;
    });
    return presences;
  },
  async upsert(sessionId, studentId, statut, extra = {}) {
    const q = query(
      collection(db, 'presences'),
      where('sessionId', '==', sessionId),
      where('studentId', '==', studentId)
    );
    const snapshot = await getDocs(q);
    const data = { sessionId, studentId, statut, ...extra, updatedAt: new Date() };
    if (snapshot.empty) {
      const docRef = await addDoc(collection(db, 'presences'), { ...data, createdAt: new Date() });
      return { id: docRef.id, ...data };
    } else {
      const existing = snapshot.docs[0];
      await updateDoc(doc(db, 'presences', existing.id), data);
      return { id: existing.id, ...data };
    }
  },
  async bulkUpsert(sessionId, entries) {
    const batch = writeBatch(db);
    // First fetch existing
    const q = query(collection(db, 'presences'), where('sessionId', '==', sessionId));
    const snapshot = await getDocs(q);
    const existing = {};
    snapshot.forEach(d => { existing[d.data().studentId] = d.id; });

    for (const entry of entries) {
      const data = { sessionId, studentId: entry.studentId, statut: entry.statut, updatedAt: new Date() };
      if (entry.heureArrivee) data.heureArrivee = entry.heureArrivee;
      if (entry.justification) data.justification = entry.justification;
      if (existing[entry.studentId]) {
        batch.update(doc(db, 'presences', existing[entry.studentId]), data);
      } else {
        const newRef = doc(collection(db, 'presences'));
        batch.set(newRef, { ...data, createdAt: new Date() });
      }
    }
    await batch.commit();
  }
};

// ─── Candidatures ─────────────────────────────────────────────────────────────
export const candidaturesService = {
  async getAll(filters = {}) {
    const q = query(collection(db, 'candidatures'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    let candidatures = [];
    snapshot.forEach(d => candidatures.push({ id: d.id, ...d.data() }));
    if (filters.statut) candidatures = candidatures.filter(c => c.statut === filters.statut);
    return candidatures;
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'candidatures'), {
      ...data,
      statut: 'recu',
      createdAt: new Date()
    });
    return { id: docRef.id, ...data };
  },
  async updateStatus(id, newStatus, { ancienStatut = null, note = null, adminId = null } = {}) {
    await updateDoc(doc(db, 'candidatures', id), { statut: newStatus, dateTraitement: new Date() });
    if (ancienStatut !== null) {
      await historiqueService.add(id, { action: 'status_change', ancienStatut, nouveauStatut: newStatus, note, adminId });
    }
    return { id, statut: newStatus };
  },
  async requestComplement(id, { docsManquants = [], deadline = null, note = null, ancienStatut = null, adminId = null } = {}) {
    await updateDoc(doc(db, 'candidatures', id), {
      statut: 'incomplet',
      complementDocs: docsManquants,
      complementDeadline: deadline,
      complementNote: note,
      dateTraitement: new Date(),
    });
    await historiqueService.add(id, { action: 'complement_request', ancienStatut, nouveauStatut: 'incomplet', docsManquants, note, adminId });
    return { id, statut: 'incomplet' };
  },
  async updateDocs(id, docsValidation) {
    await updateDoc(doc(db, 'candidatures', id), { docsValidation, updatedAt: new Date() });
    return { id, docsValidation };
  },
  async convertToStudent(candidatureId, extraData = {}) {
    const candSnap = await getDoc(doc(db, 'candidatures', candidatureId));
    if (!candSnap.exists()) throw new Error('Candidature non trouvée');
    const cand = candSnap.data();

    // Idempotence: already converted
    if (cand.studentId) {
      const existing = await getDoc(doc(db, 'students', cand.studentId));
      if (existing.exists()) return { id: cand.studentId, ...existing.data() };
    }

    // CIN duplicate check
    const cinNorm = (cand.cin || '').trim().toUpperCase();
    if (cinNorm) {
      const dupQ = query(collection(db, 'students'), where('cin', '==', cinNorm));
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) throw new Error(`Un apprenant avec le CIN ${cinNorm} existe déjà (ID: ${dupSnap.docs[0].id})`);
    }

    // Generate codeApprenant via transaction on counter
    const counterRef = doc(db, 'settings', 'apprenant_counters');
    let codeApprenant = '';
    const year = new Date().getFullYear();

    await runTransaction(db, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      const counters = counterSnap.exists() ? counterSnap.data() : {};
      const key = `seq_${year}`;
      const next = (counters[key] || 0) + 1;
      tx.set(counterRef, { ...counters, [key]: next }, { merge: true });
      codeApprenant = `APP-${year}-${String(next).padStart(4, '0')}`;
    });

    const anneeAcademique = cand.anneeEntree || `${year}-${year + 1}`;
    const studentData = {
      nom: cand.nom,
      prenom: cand.prenom,
      email: cand.email,
      telephone: cand.telephone || '',
      cin: cinNorm,
      dateNaissance: cand.dateNaissance || '',
      sexe: cand.sexe || '',
      nationalite: cand.nationalite || '',
      adresse: cand.adresse || '',
      ville: cand.ville || '',
      filiere: cand.filiere || '',
      niveau: cand.niveauScolaire || cand.niveau || '',
      photoURL: cand.photoURL || '',
      codeApprenant,
      anneeAcademique,
      campagneId: cand.campagneId || '',
      statut: 'actif',
      candidatureRef: candidatureId,
      ...extraData,
    };

    const studentRef = doc(collection(db, 'students'));
    await setDoc(studentRef, { ...studentData, createdAt: new Date(), updatedAt: new Date() });
    await updateDoc(doc(db, 'candidatures', candidatureId), {
      statut: 'inscrite',
      studentId: studentRef.id,
      codeApprenant,
      dateTraitement: new Date(),
    });
    return { id: studentRef.id, ...studentData };
  }
};

// ─── Historique candidature ───────────────────────────────────────────────────
export const historiqueService = {
  async add(candidatureId, entry) {
    const col = collection(db, 'candidatures', candidatureId, 'historique_candidature');
    await addDoc(col, { ...entry, createdAt: new Date() });
  },
  async getAll(candidatureId) {
    const col = collection(db, 'candidatures', candidatureId, 'historique_candidature');
    const q = query(col, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
};

// ─── Affectations (Masse Horaire) ────────────────────────────────────────────
export const affectationsService = {
  async getAll(anneeAcademique) {
    // No orderBy with where to avoid needing a composite index — sort in memory
    const snap = await getDocs(collection(db, 'affectations'));
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    const filtered = anneeAcademique ? items.filter(a => a.anneeAcademique === anneeAcademique) : items;
    return filtered.sort((a, b) => (a.moduleId || '').localeCompare(b.moduleId || ''));
  },
  async upsert(intervenantId, moduleId, groupeId, masseHoraire, anneeAcademique) {
    // Use only one where to avoid composite index; filter remaining in memory
    const q = query(collection(db, 'affectations'), where('moduleId', '==', moduleId));
    const snap = await getDocs(q);
    const existing = snap.docs.find(d => {
      const data = d.data();
      return data.groupeId === groupeId && data.anneeAcademique === anneeAcademique;
    });
    if (existing) {
      await updateDoc(existing.ref, { intervenantId, masseHoraire, updatedAt: new Date() });
      return { id: existing.id };
    }
    const ref = await addDoc(collection(db, 'affectations'), {
      intervenantId, moduleId, groupeId, masseHoraire, anneeAcademique,
      createdAt: new Date(), updatedAt: new Date()
    });
    return { id: ref.id };
  },
  async delete(id) {
    await deleteDoc(doc(db, 'affectations', id));
  },
  // Compute heuresFaites per affectation from sessions list.
  // Pass normalizeDash=true to match groupeId across hyphen/en-dash variants.
  computeHeuresFaites(affectation, sessions, normalizeDash = false) {
    const norm = s => normalizeDash ? (s || '').replace(/[–—]/g, '-').trim().toLowerCase() : s;
    const affGroupNorm = norm(affectation.groupeId);
    const relevant = sessions.filter(s =>
      s.moduleId === affectation.moduleId &&
      norm(s.groupeId) === affGroupNorm &&
      (!affectation.intervenantId || s.intervenantId === affectation.intervenantId)
    );
    let total = 0;
    for (const s of relevant) {
      const [sh, sm] = (s.heureDebut||'0:0').split(':').map(Number);
      const [eh, em] = (s.heureFin||'0:0').split(':').map(Number);
      total += (eh*60+em - sh*60-sm) / 60;
    }
    return Math.round(total * 10) / 10;
  }
};

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const logsService = {
  async log(action, userId, details = {}) {
    await addDoc(collection(db, 'logs_audit'), { action, userId, details, timestamp: new Date(), ip: 'unknown' });
  }
};

export default {
  students: studentsService,
  groupes: groupesService,
  intervenants: intervenantsService,
  sessions: sessionsService,
  presences: presencesService,
  candidatures: candidaturesService,
  historique: historiqueService,
  affectations: affectationsService,
  logs: logsService
};
