import {
  collection, addDoc, getDocs, deleteDoc, doc, query, where, writeBatch, getDoc
} from 'firebase/firestore';
import { db } from './firebase';

// ─── Badge catalogue ──────────────────────────────────────────────────────────
// Each entry: key, emoji, titre, description, categorie, color (bg/text)

export const BADGE_CATALOGUE = [
  // Assiduité
  { key: 'assiduite_parfaite',  emoji: '⭐', titre: 'Présence parfaite',    description: 'Aucune absence non justifiée sur la période', categorie: 'assiduite', bg: '#ecfdf5', text: '#065f46', border: '#6ee7b7' },
  { key: 'assiduite_excellent', emoji: '🏆', titre: 'Assiduité exemplaire', description: 'Taux de présence ≥ 95 %',                    categorie: 'assiduite', bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  { key: 'ponctuel',            emoji: '⏱️', titre: 'Toujours à l\'heure',   description: 'Aucun retard enregistré',                    categorie: 'assiduite', bg: '#f0fdf4', text: '#166534', border: '#86efac' },
  // Notes
  { key: 'major_promo',    emoji: '🥇', titre: 'Major de promo',     description: 'Meilleure moyenne générale du groupe',       categorie: 'notes', bg: '#fef3c7', text: '#78350f', border: '#fbbf24' },
  { key: 'top3',           emoji: '🥈', titre: 'Top 3 du groupe',    description: 'Classé parmi les 3 meilleures moyennes',     categorie: 'notes', bg: '#f1f5f9', text: '#334155', border: '#94a3b8' },
  { key: 'mention_tb',     emoji: '🎓', titre: 'Mention Très Bien',  description: 'Moyenne générale ≥ 16 / 20',                 categorie: 'notes', bg: '#eff6ff', text: '#1e40af', border: '#93c5fd' },
  { key: 'mention_bien',   emoji: '📘', titre: 'Mention Bien',       description: 'Moyenne générale ≥ 14 / 20',                 categorie: 'notes', bg: '#eef2ff', text: '#3730a3', border: '#a5b4fc' },
  { key: 'progression',    emoji: '📈', titre: 'En progression',     description: 'Amélioration significative vs période précédente', categorie: 'notes', bg: '#ecfdf5', text: '#065f46', border: '#34d399' },
  // Comportement (manuel)
  { key: 'initiative',     emoji: '💡', titre: 'Esprit d\'initiative', description: 'Fait preuve d\'initiative et de proactivité',    categorie: 'comportement', bg: '#fff7ed', text: '#9a3412', border: '#fdba74' },
  { key: 'travail_equipe', emoji: '🤝', titre: 'Esprit d\'équipe',   description: 'Excellente collaboration avec les pairs',          categorie: 'comportement', bg: '#f0fdfa', text: '#134e4a', border: '#5eead4' },
  { key: 'creativite',     emoji: '🎨', titre: 'Créativité',          description: 'Démontre une pensée créative et originale',        categorie: 'comportement', bg: '#fdf4ff', text: '#6b21a8', border: '#d8b4fe' },
  { key: 'leadership',     emoji: '🦅', titre: 'Leadership',          description: 'Fait preuve de leadership naturel',               categorie: 'comportement', bg: '#fff1f2', text: '#9f1239', border: '#fda4af' },
  { key: 'rigueur',        emoji: '📐', titre: 'Rigueur & Méthode',   description: 'Travail rigoureux et méthodique',                 categorie: 'comportement', bg: '#f8fafc', text: '#1e293b', border: '#cbd5e1' },
  { key: 'engagement',     emoji: '🔥', titre: 'Engagement total',    description: 'Implication exemplaire dans la formation',        categorie: 'comportement', bg: '#fff7ed', text: '#c2410c', border: '#fb923c' },
  { key: 'excellence',     emoji: '✨', titre: 'Excellence',          description: 'Travaux d\'une qualité remarquable',              categorie: 'comportement', bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
];

export const getBadge = (key) => BADGE_CATALOGUE.find(b => b.key === key);

// ─── Firestore CRUD ───────────────────────────────────────────────────────────

export const badgesService = {
  async getByStudent(studentId) {
    const q = query(collection(db, 'badges'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    const list = [];
    snap.forEach(d => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => {
      const ta = a.createdAt?.toDate?.() ?? new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate?.() ?? new Date(b.createdAt || 0);
      return tb - ta;
    });
    return list;
  },

  async award(studentId, badgeKey, opts = {}) {
    const def = getBadge(badgeKey);
    if (!def) throw new Error(`Badge inconnu: ${badgeKey}`);
    // Prevent duplicate auto badges (same key, same anneeAcademique)
    if (opts.anneeAcademique && opts.source !== 'manual') {
      const q = query(
        collection(db, 'badges'),
        where('studentId', '==', studentId),
        where('key', '==', badgeKey)
      );
      const snap = await getDocs(q);
      const dup = snap.docs.find(d => d.data().anneeAcademique === opts.anneeAcademique);
      if (dup) return { id: dup.id, ...dup.data() }; // already awarded
    }
    const data = {
      studentId,
      key: badgeKey,
      titre: def.titre,
      emoji: def.emoji,
      categorie: def.categorie,
      source: opts.source || 'auto',
      anneeAcademique: opts.anneeAcademique || null,
      groupeId: opts.groupeId || null,
      attribueParId: opts.attribueParId || 'system',
      attribueParNom: opts.attribueParNom || 'Système',
      note: opts.note || '',
      createdAt: new Date(),
    };
    const ref = await addDoc(collection(db, 'badges'), data);
    return { id: ref.id, ...data };
  },

  async revoke(badgeId) {
    await deleteDoc(doc(db, 'badges', badgeId));
  },

  async awardBulk(entries) {
    const batch = writeBatch(db);
    for (const e of entries) {
      const def = getBadge(e.key);
      if (!def) continue;
      const ref = doc(collection(db, 'badges'));
      batch.set(ref, {
        studentId: e.studentId,
        key: e.key,
        titre: def.titre,
        emoji: def.emoji,
        categorie: def.categorie,
        source: e.source || 'auto',
        anneeAcademique: e.anneeAcademique || null,
        groupeId: e.groupeId || null,
        attribueParId: e.attribueParId || 'system',
        attribueParNom: e.attribueParNom || 'Système',
        note: e.note || '',
        createdAt: new Date(),
      });
    }
    await batch.commit();
  },
};

// ─── Auto-compute badges from presences ───────────────────────────────────────
// Returns array of { studentId, key } to award

export function computeAssiduitesBadges(presences, anneeAcademique) {
  // presences: array of { studentId, statut }
  const byStudent = {};
  for (const p of presences) {
    if (!byStudent[p.studentId]) byStudent[p.studentId] = { total: 0, present: 0, anjs: 0, retards: 0 };
    byStudent[p.studentId].total++;
    if (p.statut === 'present') byStudent[p.studentId].present++;
    if (p.statut === 'absent_non_justifie') byStudent[p.studentId].anjs++;
    if (p.statut === 'retard') byStudent[p.studentId].retards++;
  }
  const toAward = [];
  for (const [studentId, s] of Object.entries(byStudent)) {
    if (s.total === 0) continue;
    const tauxPresence = s.present / s.total;
    if (s.anjs === 0) toAward.push({ studentId, key: 'assiduite_parfaite', anneeAcademique });
    if (tauxPresence >= 0.95) toAward.push({ studentId, key: 'assiduite_excellent', anneeAcademique });
    if (s.retards === 0) toAward.push({ studentId, key: 'ponctuel', anneeAcademique });
  }
  return toAward;
}

// ─── Auto-compute badges from moyennes (grouped by groupeId) ─────────────────
// moyennes: [{ studentId, moyenne }] — already computed per group

export function computeNotesBadges(moyennes, anneeAcademique, groupeId) {
  const sorted = [...moyennes].filter(m => m.moyenne != null).sort((a, b) => b.moyenne - a.moyenne);
  const toAward = [];
  sorted.forEach((m, idx) => {
    if (idx === 0) toAward.push({ studentId: m.studentId, key: 'major_promo', anneeAcademique, groupeId });
    if (idx < 3)  toAward.push({ studentId: m.studentId, key: 'top3',        anneeAcademique, groupeId });
    if (m.moyenne >= 16) toAward.push({ studentId: m.studentId, key: 'mention_tb',   anneeAcademique, groupeId });
    if (m.moyenne >= 14 && m.moyenne < 16) toAward.push({ studentId: m.studentId, key: 'mention_bien', anneeAcademique, groupeId });
  });
  return toAward;
}
