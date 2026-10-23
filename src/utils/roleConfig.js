/**
 * Mapping rôle → niveaux autorisés.
 * null = accès à tous les niveaux.
 * Les clés niveau correspondent aux valeurs normalisées utilisées dans ApprenantsPage.
 */
export const ROLE_NIVEAUX = {
  admin:           null,
  direction:       null,
  scolarite:       null,
  // Formation Supérieure : Licence CNAM + Licence ISTL (Transitaire) + Mastère
  scolarite_sup:   ['Licence CNAM', 'Licence ISTL', 'Mastère ESLI MLAI'],
  // Directions pédagogiques par partenaire
  dir_mastere:     ['Mastère ESLI MLAI'],
  dir_cnam:        ['Licence CNAM'],
  dir_transitaire: ['Licence ISTL'],
  intervenant:     null,
  apprenant:       null,
  parent:          null,
};

/**
 * Routes autorisées par rôle (null = toutes).
 * Utilisé dans Sidebar et PrivateRoute.
 */
export const ROLE_ROUTES = {
  admin:           null,
  direction:       null,
  scolarite:       null,
  scolarite_sup: [
    '/', '/apprenants', '/groupes', '/notes', '/saisie-notes', '/releves',
    '/absences', '/modules', '/planning', '/masse-horaire',
    '/inscriptions', '/reinscriptions', '/justificatifs-paiement',
    '/annonces', '/statistiques',
  ],
  dir_mastere: [
    '/', '/apprenants', '/notes', '/saisie-notes', '/releves', '/absences', '/modules',
  ],
  dir_cnam: [
    '/', '/apprenants', '/notes', '/saisie-notes', '/releves', '/absences', '/modules',
  ],
  dir_transitaire: [
    '/', '/apprenants', '/notes', '/saisie-notes', '/releves', '/absences', '/modules',
  ],
  intervenant: ['/', '/planning', '/masse-horaire', '/emargement', '/modules', '/notes', '/saisie-notes', '/apprenants', '/annonces'],
  apprenant:   ['/', '/planning', '/notes', '/annonces'],
  parent:      ['/', '/notes', '/annonces'],
};

/** Retourne les niveaux autorisés pour un rôle (null = tous). */
export function getNiveauxAcces(role) {
  return ROLE_NIVEAUX[role] ?? null;
}

/** Vérifie si un niveau est accessible pour un rôle donné. */
export function canSeeNiveau(niveauxAcces, niveau) {
  if (!niveauxAcces) return true; // null = accès total
  return niveauxAcces.includes(niveau);
}

/** Labels français des rôles pour l'UI. */
export const ROLE_LABELS = {
  admin:           'Administrateur',
  direction:       'Direction',
  scolarite:       'Scolarité',
  scolarite_sup:   'Scolarité — Formation Supérieure',
  dir_mastere:     'Direction pédago — Mastère',
  dir_cnam:        'Direction pédago — Licence CNAM',
  dir_transitaire: 'Direction pédago — Licence ISTL',
  intervenant:     'Intervenant(e)',
  apprenant:       'Apprenant(e)',
  parent:          'Parent / Tuteur',
};

export const ALL_ROLES = Object.keys(ROLE_LABELS);
