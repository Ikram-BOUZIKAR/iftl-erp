import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  Timestamp,
  writeBatch
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
    const q = query(collection(db, 'groupes'), orderBy('nom', 'asc'));
    const snapshot = await getDocs(q);
    let groupes = [];
    snapshot.forEach(d => groupes.push({ id: d.id, ...d.data() }));
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
    const q = query(collection(db, 'intervenants'), where('actif', '==', true), orderBy('nom', 'asc'));
    const snapshot = await getDocs(q);
    const intervenants = [];
    snapshot.forEach(d => intervenants.push({ id: d.id, ...d.data() }));
    return intervenants;
  },
  async getAllIncludingInactive() {
    const q = query(collection(db, 'intervenants'), orderBy('nom', 'asc'));
    const snapshot = await getDocs(q);
    const intervenants = [];
    snapshot.forEach(d => intervenants.push({ id: d.id, ...d.data() }));
    return intervenants;
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
    const q = query(collection(db, 'presences'), where('studentId', '==', studentId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const presences = [];
    snapshot.forEach(d => presences.push({ id: d.id, ...d.data() }));
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
  async updateStatus(id, newStatus) {
    await updateDoc(doc(db, 'candidatures', id), { statut: newStatus, dateTraitement: new Date() });
    return { id, statut: newStatus };
  },
  async convertToStudent(candidatureId, extraData = {}) {
    const candSnap = await getDoc(doc(db, 'candidatures', candidatureId));
    if (!candSnap.exists()) throw new Error('Candidature non trouvée');
    const cand = candSnap.data();
    const studentData = {
      nom: cand.nom,
      prenom: cand.prenom,
      email: cand.email,
      telephone: cand.telephone || '',
      cin: cand.cin || '',
      dateNaissance: cand.dateNaissance || '',
      filiere: cand.filiere || '',
      niveau: cand.niveau || '',
      photoURL: cand.photoURL || '',
      statut: 'actif',
      ...extraData
    };
    const studentRef = await addDoc(collection(db, 'students'), { ...studentData, createdAt: new Date(), updatedAt: new Date() });
    await updateDoc(doc(db, 'candidatures', candidatureId), { statut: 'accepte', studentId: studentRef.id, dateTraitement: new Date() });
    return { id: studentRef.id, ...studentData };
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
  logs: logsService
};
