// Absence counter rules:
// - ANJ (absent non-justifié) = 1 point
// - Retard = 0.5 point
// - AJ (absent justifié) = 0 (doesn't count)
// - Présent = 0
// Alert: >= 3 → warning (yellow), >= 5 → danger (red)

const STATUT_WEIGHT = {
  present: 0,
  absent_justifie: 0,
  absent_non_justifie: 1,
  retard: 0.5
};

export function computeAbsenceScore(statut) {
  return STATUT_WEIGHT[statut] ?? 0;
}

export function getAlertLevel(score) {
  if (score >= 5) return 'danger';
  if (score >= 3) return 'warning';
  return 'ok';
}

export function getAlertColor(level) {
  if (level === 'danger') return 'red';
  if (level === 'warning') return 'yellow';
  return 'green';
}

// Compute per-module absence totals for a student given their presences and sessions
export function computeStudentAbsencesByModule(presences, sessions) {
  const byModule = {};
  for (const p of presences) {
    const session = sessions.find(s => s.id === p.sessionId);
    const module = session?.module || 'Sans module';
    if (!byModule[module]) byModule[module] = { score: 0, anjCount: 0, retardCount: 0, ajCount: 0, total: 0 };
    const score = computeAbsenceScore(p.statut);
    byModule[module].score += score;
    byModule[module].total += 1;
    if (p.statut === 'absent_non_justifie') byModule[module].anjCount += 1;
    if (p.statut === 'retard') byModule[module].retardCount += 1;
    if (p.statut === 'absent_justifie') byModule[module].ajCount += 1;
  }
  // Attach alert level
  for (const mod of Object.keys(byModule)) {
    byModule[mod].alertLevel = getAlertLevel(byModule[mod].score);
  }
  return byModule;
}

// Returns students with their highest alert level across all modules
export function getStudentsAtRisk(students, presences, sessions) {
  const result = [];
  for (const student of students) {
    const studentPresences = presences.filter(p => p.studentId === student.id);
    const byModule = computeStudentAbsencesByModule(studentPresences, sessions);
    const maxScore = Math.max(0, ...Object.values(byModule).map(m => m.score));
    const alertLevel = getAlertLevel(maxScore);
    if (alertLevel !== 'ok') {
      result.push({ ...student, alertLevel, maxScore, byModule });
    }
  }
  return result.sort((a, b) => b.maxScore - a.maxScore);
}
