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
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';

export const studentsService = {
  async getAll(filters = {}) {
    try {
      const q = query(collection(db, 'students'), orderBy('nom', 'asc'));
      const snapshot = await getDocs(q);
      let students = [];
      snapshot.forEach(doc => {
        students.push({ id: doc.id, ...doc.data() });
      });
      if (filters.filiere) students = students.filter(s => s.filiere === filters.filiere);
      if (filters.statut) students = students.filter(s => s.statut === filters.statut);
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
    const docRef = await addDoc(collection(db, 'students'), { ...data, createdAt: new Date(), updatedAt: new Date() });
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

export const intervenantsService = {
  async getAll() {
    const q = query(collection(db, 'intervenants'), where('actif', '==', true), orderBy('nom', 'asc'));
    const snapshot = await getDocs(q);
    const intervenants = [];
    snapshot.forEach(doc => intervenants.push({ id: doc.id, ...doc.data() }));
    return intervenants;
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'intervenants'), { ...data, createdAt: new Date() });
    return { id: docRef.id, ...data };
  },
  async update(id, data) {
    const docRef = doc(db, 'intervenants', id);
    await updateDoc(docRef, data);
    return { id, ...data };
  }
};

export const edtService = {
  async getWeek(startDate = new Date()) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
    const q = query(
      collection(db, 'edt'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    const edt = [];
    snapshot.forEach(doc => edt.push({ id: doc.id, ...doc.data() }));
    return edt;
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'edt'), { ...data, createdAt: new Date(), updatedAt: new Date() });
    return { id: docRef.id, ...data };
  },
  async update(id, data) {
    const docRef = doc(db, 'edt', id);
    await updateDoc(docRef, { ...data, updatedAt: new Date() });
    return { id, ...data };
  }
};

export const candidaturesService = {
  async getAll(filters = {}) {
    const q = query(collection(db, 'candidatures'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    let candidatures = [];
    snapshot.forEach(doc => candidatures.push({ id: doc.id, ...doc.data() }));
    if (filters.statut) candidatures = candidatures.filter(c => c.statut === filters.statut);
    return candidatures;
  },
  async create(data) {
    const docRef = await addDoc(collection(db, 'candidatures'), { ...data, statut: 'recu', createdAt: new Date() });
    return { id: docRef.id, ...data };
  },
  async updateStatus(id, newStatus) {
    const docRef = doc(db, 'candidatures', id);
    await updateDoc(docRef, { statut: newStatus, dateTraitement: new Date() });
    return { id, statut: newStatus };
  }
};

export const logsService = {
  async log(action, userId, details = {}) {
    await addDoc(collection(db, 'logs_audit'), { action, userId, details, timestamp: new Date(), ip: 'unknown' });
  }
};

export default { students: studentsService, intervenants: intervenantsService, edt: edtService, candidatures: candidaturesService, logs: logsService };
