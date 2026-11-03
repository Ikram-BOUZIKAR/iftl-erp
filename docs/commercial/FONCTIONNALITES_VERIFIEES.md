# Inventaire des Fonctionnalités Vérifiées — EduCloud

> Ce document recense uniquement les fonctionnalités dont l'implémentation a été vérifiée dans le code source.
> Chaque entrée indique le fichier de référence principal.

---

## Méthode de vérification

- Lecture directe de `src/App.jsx` (routes), `src/services/firestore.js`, `src/services/pdfService.js`, `src/services/emailService.js`
- Exploration des 37 dossiers composants dans `src/components/`
- Consultation de `firestore.rules` (collections et accès)
- Analyse de `package.json` (dépendances réelles)
- Analyse de `capacitor.config.ts` (mobile)

---

## 1. AUTHENTIFICATION ET CONTRÔLE D'ACCÈS

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Connexion Firebase Email/Mot de passe | `src/hooks/useAuth.js` | ✅ Implémenté |
| Persistance session locale | `src/hooks/useAuth.js` | ✅ Implémenté |
| Blocage des comptes `pending` | `src/hooks/useAuth.js` | ✅ Implémenté |
| Rôle par défaut `apprenant` si profil absent | `src/hooks/useAuth.js` | ✅ Implémenté |
| Redirection vers `/login` si non authentifié | `src/components/Routes/PrivateRoute.jsx` | ✅ Implémenté |
| Redirection vers `/setup` si Firebase non configuré | `src/App.jsx` | ✅ Implémenté |
| 6 rôles : admin, direction, scolarité, intervenant, apprenant, parent | `src/components/Layout/Sidebar.jsx` + `firestore.rules` | ✅ Implémenté |
| Règles Firestore RBAC par collection | `firestore.rules` | ✅ Implémenté |
| Protection contre l'escalade de rôle | `firestore.rules` | ✅ Implémenté |
| Journalisation audit (`logs_audit`) | `src/services/firestore.js` — `logsService` | ✅ Implémenté |

---

## 2. TABLEAU DE BORD

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| KPI : nombre d'apprenants, groupes, sessions du jour | `src/components/Dashboard/Dashboard.jsx` | ✅ Implémenté |
| KPI : alertes absences en temps réel | `src/components/Dashboard/Dashboard.jsx` | ✅ Implémenté |
| Sessions du jour avec badge "LIVE" | `src/components/Dashboard/Dashboard.jsx` | ✅ Implémenté |
| Liste apprenants à risque d'absences | `src/services/absenceService.js` — `getStudentsAtRisk` | ✅ Implémenté |
| Accès rapide aux 6 modules fréquents | `src/components/Dashboard/Dashboard.jsx` | ✅ Implémenté |
| Guide d'onboarding si base vide | `src/components/Dashboard/Dashboard.jsx` | ✅ Implémenté |
| Salutation contextuelle (matin/après-midi/soir) | `src/components/Dashboard/Dashboard.jsx` | ✅ Implémenté |
| Date localisée FR/EN/AR | `src/components/Dashboard/Dashboard.jsx` (date-fns locales) | ✅ Implémenté |

---

## 3. PLANNING (EDT)

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Vue hebdomadaire en grille (6 jours × créneaux) | `src/components/Planning/PlanningPage.jsx` | ✅ Implémenté |
| Filtrage par groupe, intervenant, filière, année | `src/components/Planning/PlanningPage.jsx` | ✅ Implémenté |
| CRUD sessions (créer/modifier/supprimer) | `src/components/Planning/SessionForm.jsx` | ✅ Implémenté |
| Statuts de session (planifiée/en_cours/terminée/annulée) | `src/services/firestore.js` — `sessionsService` | ✅ Implémenté |
| Types de session (cours, TP, TD, examen, rattrapage) | `src/components/Planning/SessionForm.jsx` | ✅ Implémenté |
| Génération automatique du planning | `src/components/Planning/PlanningAutoModal.jsx` | ✅ Implémenté |
| Calendrier académique (jours fériés, événements) | `src/components/Planning/CalendrierAcademique.jsx` | ✅ Implémenté |
| Export PDF planning (un groupe) | `src/services/pdfService.js` — `generatePlanningPDF` | ✅ Implémenté |
| Export PDF planning multi-groupes (couleurs par groupe) | `src/services/pdfService.js` + `PlanningExportModal` | ✅ Implémenté |
| Envoi du planning par email aux intervenants | `src/services/emailService.js` — `sendPlanningEmail` | ✅ Implémenté |
| Masse horaire (affectation module×groupe×intervenant) | `src/components/Planning/MasseHorairePage.jsx` | ✅ Implémenté |
| Calcul heures faites vs planifiées | `src/services/firestore.js` — `affectationsService.computeHeuresFaites` | ✅ Implémenté |
| Planning rentrée consultable par les apprenants | `src/components/Planning/PlanningRentreePage.jsx` | ✅ Implémenté |
| Import EDT depuis fichier externe | `src/components/Admin/EDTImportPage.jsx` | ✅ Implémenté |

---

## 4. ÉMARGEMENT

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Liste des sessions avec filtrage | `src/components/Emargement/EmargementPage.jsx` | ✅ Implémenté |
| Ouverture/fermeture émargement en temps réel | `src/services/firestore.js` — `sessionsService.openEmargement` | ✅ Implémenté |
| Saisie présence individuelle (présent/AJ/ANJ/retard) | `src/components/Emargement/SessionAttendance.jsx` | ✅ Implémenté |
| Heure d'arrivée pour les retards | `src/components/Emargement/SessionAttendance.jsx` | ✅ Implémenté |
| Enregistrement en lot (`bulkUpsert`) | `src/services/firestore.js` — `presencesService.bulkUpsert` | ✅ Implémenté |
| Émargement libre (session hors planning) | `src/components/Emargement/EmargementLibreModal.jsx` | ✅ Implémenté |
| Export feuille d'émargement PDF | `src/services/pdfService.js` — `generateFeuillEmargement` | ✅ Implémenté |
| Badge "LIVE" sur sessions en cours | `src/components/Emargement/EmargementPage.jsx` | ✅ Implémenté |

---

## 5. GESTION DES APPRENANTS

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| CRUD apprenants complet | `src/components/Apprenants/ApprenantsPage.jsx` | ✅ Implémenté |
| Vue par niveau (onglets colorés) | `src/components/Apprenants/ApprenantsPage.jsx` | ✅ Implémenté |
| Filtres (niveau, groupe, statut, texte) | `src/components/Apprenants/ApprenantsPage.jsx` | ✅ Implémenté |
| Import CSV avec validation | `src/components/Apprenants/ApprenantsPage.jsx` | ✅ Implémenté |
| Export CSV de la liste | `src/components/Apprenants/ApprenantsPage.jsx` | ✅ Implémenté |
| Génération email institutionnel automatique | `src/components/Apprenants/ApprenantForm.jsx` | ✅ Implémenté |
| Fiche apprenant (5 onglets) | `src/components/Apprenants/ApprenantDetail.jsx` | ✅ Implémenté |
| Envoi reset mot de passe Firebase | `src/components/Apprenants/ApprenantDetail.jsx` | ✅ Implémenté |
| Génération fiche apprenant PDF | `src/services/pdfService.js` — `generateFicheApprenant` | ✅ Implémenté |
| Attribution de badges gamifiés | `src/services/badgesService.js` | ✅ Implémenté |
| Passage de niveau en masse (`writeBatch`) | `src/components/Admin/PassageNiveauPage.jsx` | ✅ Implémenté |
| Déduplication d'apprenants | `src/components/Admin/DeduplicationPage.jsx` | ✅ Implémenté |

---

## 6. NOTES ET ÉVALUATIONS

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Création d'évaluations (CC, EFM, rattrapage, TP, projet) | `src/components/Notes/NotesPage.jsx` | ✅ Implémenté |
| Saisie des notes en grille | `src/components/Notes/NotesPage.jsx` | ✅ Implémenté |
| Calcul des moyennes avec coefficients | `src/components/Notes/NotesPage.jsx` | ✅ Implémenté |
| Génération bulletin de notes PDF | `src/services/pdfService.js` — `generateBulletin` | ✅ Implémenté |
| Génération PV de délibération PDF | `src/services/pdfService.js` — `generatePV` | ✅ Implémenté |
| Génération relevé 1A TS officiel PDF | `src/services/pdfService.js` — `generateReleve1A` | ✅ Implémenté |
| Génération relevé 2A TS officiel PDF | `src/services/pdfService.js` — `generateReleve2A` | ✅ Implémenté |
| Accès apprenant limité à ses propres notes | `firestore.rules` | ✅ Implémenté |
| Interface de saisie simplifiée pour intervenants | `src/components/Notes/` | ✅ Implémenté |

---

## 7. SUIVI DES ABSENCES

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Calcul score absences (ANJ=1pt, Retard=0.5pt, AJ=0pt) | `src/services/absenceService.js` | ✅ Implémenté |
| Seuils d'alerte (≥3 orange, ≥5 rouge) | `src/services/absenceService.js` — `getStudentsAtRisk` | ✅ Implémenté |
| Rapport consolidé absences par groupe | `src/components/Absences/AbsencesPage.jsx` | ✅ Implémenté |
| Export PDF rapport absences | `src/services/pdfService.js` — `generateAbsenceReport` | ✅ Implémenté |
| Envoi alerte email seuil dépassé | `src/services/emailService.js` — `sendAlertAbsenceEmail` | ✅ Implémenté |
| Envoi notification absence spécifique | `src/services/emailService.js` — `sendAbsenceEmail` | ✅ Implémenté |

---

## 8. CANDIDATURES ET INSCRIPTIONS

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Formulaire candidature public (6 étapes) | `src/components/Candidature/CandidaturePage.jsx` | ✅ Implémenté |
| Upload documents Firebase Storage | `src/components/Candidature/CandidaturePage.jsx` | ✅ Implémenté |
| Suivi candidature par CIN (sans compte) | `src/components/Candidature/SuiviCandidaturePage.jsx` | ✅ Implémenté |
| Back-office gestion des candidatures | `src/components/Candidatures/CandidaturesAdminPage.jsx` | ✅ Implémenté |
| Changement statut avec notification email | `src/services/emailService.js` — `sendCandidatureStatut` | ✅ Implémenté |
| Conversion candidature → étudiant | `src/services/firestore.js` — `candidaturesService.convertToStudent` | ✅ Implémenté |
| Gestion inscriptions officielles | `src/components/Inscriptions/InscriptionsPage.jsx` | ✅ Implémenté |
| Portail réinscription public (3 étapes) | `src/components/Reinscription/ReinscriptionPortail.jsx` | ✅ Implémenté |
| Configuration montant réinscription depuis l'interface | `src/components/Reinscription/ReinscriptionAdminPage.jsx` | ✅ Implémenté |
| Notification réinscription validée/refusée | `src/services/emailService.js` — `sendReinscriptionValidee/Refusee` | ✅ Implémenté |
| Portail justificatif paiement public | `src/components/Paiement/JustificatifPaiementPortail.jsx` | ✅ Implémenté |

---

## 9. FACTURATION ET PAIEMENTS

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| CRUD factures étudiantes | `src/components/Facturation/FacturationPage.jsx` | ✅ Implémenté |
| Modes de paiement (virement, espèces, chèque, CMI) | `src/components/Facturation/FacturationPage.jsx` | ✅ Implémenté |
| Calcul statut automatique (payée/partiellement/retard) | `src/components/Facturation/FacturationPage.jsx` | ✅ Implémenté |
| Génération reçu PDF avec logo | `src/services/pdfService.js` — `generateRecu` | ✅ Implémenté |
| Relance paiement par email automatique | `src/services/emailService.js` — `sendRelancePaiement` | ✅ Implémenté |
| Affichage en DH (format marocain fr-MA) | `src/components/Facturation/FacturationPage.jsx` | ✅ Implémenté |

---

## 10. RESSOURCES HUMAINES

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Fiches RH personnel (CDI, CDD, Vacation, Freelance) | `src/components/RH/RHPage.jsx` | ✅ Implémenté |
| Champs salaire de base et RIB | `src/components/RH/RHPage.jsx` | ✅ Implémenté |
| KPIs RH (effectif, intervenants, administratifs, CDI) | `src/components/RH/RHPage.jsx` | ✅ Implémenté |
| Gestion intervenants (actif/inactif) | `src/components/Intervenants/IntervenantsPage.jsx` | ✅ Implémenté |

---

## 11. FORMATION CONTINUE

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Gestion entreprises clientes (CRUD + CNSS/ICE) | `src/components/FormationContinue/FormationContinuePage.jsx` | ✅ Implémenté |
| Sessions de formation continue | `src/components/FormationContinue/FormationContinuePage.jsx` | ✅ Implémenté |
| Devis formation continue | `src/components/FormationContinue/FormationContinuePage.jsx` | ✅ Implémenté |
| Conventions et attestations | `src/components/FormationContinue/FormationContinuePage.jsx` | ✅ Implémenté |

---

## 12. STAGES

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| CRUD stages par apprenant | `src/components/Stages/StagesPage.jsx` | ✅ Implémenté |
| Types : fin d'année, initiation, alternance | `src/components/Stages/StagesPage.jsx` | ✅ Implémenté |
| Suivi par statut (4 onglets) | `src/components/Stages/StagesPage.jsx` | ✅ Implémenté |
| Champs entreprise, tuteur, dates, secteur, notation | `src/components/Stages/StagesPage.jsx` | ✅ Implémenté |

---

## 13. COMMUNICATION

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Annonces ciblées (par rôle/groupe) | `src/components/Communication/AnnoncesPage.jsx` | ✅ Implémenté |
| 11 templates email transactionnels | `src/services/emailService.js` | ✅ Implémenté |
| Envoi via API Brevo (Sendinblue) | `src/services/emailService.js` | ✅ Implémenté |
| Historique emails envoyés | `emails_log` (Firestore) | ✅ Implémenté |
| Configuration clé API depuis l'interface | `src/components/Emails/EmailsPage.jsx` | ✅ Implémenté |
| Tâches collaboratives (Kanban) | `src/components/Collaboratif/CollaboratifPage.jsx` | ✅ Implémenté |

---

## 14. ANALYSES ET RAPPORTS

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Statistiques effectifs (PieChart, AreaChart) | `src/components/Statistiques/StatistiquesPage.jsx` | ✅ Implémenté |
| Statistiques notes (BarChart distribution) | `src/components/Statistiques/StatistiquesPage.jsx` | ✅ Implémenté |
| Statistiques absences (tendances) | `src/components/Statistiques/StatistiquesPage.jsx` | ✅ Implémenté |
| Statistiques paiements (encaissements, impayés) | `src/components/Statistiques/StatistiquesPage.jsx` | ✅ Implémenté |
| Statistiques intervenants (charge horaire) | `src/components/Statistiques/StatistiquesPage.jsx` | ✅ Implémenté |
| Rapport absences filtrable + export PDF | `src/components/Rapports/RapportsPage.jsx` | ✅ Implémenté |

---

## 15. PORTAILS ET ACCÈS EXTERNES

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Portail apprenant (8 onglets) | `src/components/Portail/PortailApprenant.jsx` | ✅ Implémenté |
| Upload photo de profil (Firebase Storage) | `src/components/Portail/PortailApprenant.jsx` | ✅ Implémenté |
| Génération attestations depuis le portail | `src/components/Portail/PortailApprenant.jsx` | ✅ Implémenté |
| Demande d'abonnement transport depuis le portail | `src/components/Portail/PortailApprenant.jsx` | ✅ Implémenté |
| Portail intervenant (planning + émargement + notes) | `src/components/Portail/PortailIntervenant.jsx` | ✅ Implémenté |
| Portail tuteur entreprise | `src/components/Portail/PortailTuteur.jsx` | ✅ Implémenté |
| Portail résultats public (sans compte) | `src/components/Portail/PortailResultats.jsx` | ✅ Implémenté |

---

## 16. TRANSPORT

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Gestion parc véhicules (CRUD) | `src/components/Transport/TransportPage.jsx` | ✅ Implémenté |
| Abonnements navette apprenants | `src/components/Transport/TransportPage.jsx` | ✅ Implémenté |
| Demandes d'abonnement depuis portail apprenant | `src/components/Transport/TransportPage.jsx` | ✅ Implémenté |
| 4 points de rassemblement prédéfinis | `src/components/Transport/TransportPage.jsx` | ✅ Implémenté |

---

## 17. INFRASTRUCTURE ET TECHNIQUE

| Fonctionnalité | Fichier source | Statut |
|---|---|---|
| Application mobile Android (Capacitor) | `capacitor.config.ts` + `android/` | ✅ Implémenté |
| Application mobile iOS (Capacitor) | `capacitor.config.ts` | ✅ Implémenté |
| Interface en français | `src/i18n/locales/fr.js` | ✅ Implémenté |
| Interface en anglais | `src/i18n/locales/en.js` | ✅ Implémenté |
| Interface en arabe | `src/i18n/locales/ar.js` | ✅ Implémenté |
| White-label (couleurs + logo + nom) | `src/contexts/BrandingContext.jsx` | ✅ Implémenté |
| Mode démo (données synthétiques) | `vite.config.js` (alias conditionnels) | ✅ Implémenté |
| Page de setup guidée (configuration Firebase) | `src/components/Setup/SetupPage.jsx` | ✅ Implémenté |
| Notice RGPD | `src/components/Legal/DataProtectionNotice.jsx` | ✅ Implémenté |

---

## 18. GÉNÉRATION DE DOCUMENTS PDF

12 types de documents PDF générés depuis `src/services/pdfService.js` (2 052 lignes) :

| Document | Fonction | Statut |
|---|---|---|
| Reçu de paiement | `generateRecu` | ✅ |
| Bulletin de notes | `generateBulletin` | ✅ |
| Planning hebdomadaire | `generatePlanningPDF` | ✅ |
| Feuille d'émargement | `generateFeuillEmargement` | ✅ |
| Rapport absences | `generateAbsenceReport` | ✅ |
| PV de délibération | `generatePV` | ✅ |
| Relevé de notes 1A TS | `generateReleve1A` | ✅ |
| Relevé de notes 2A TS | `generateReleve2A` | ✅ |
| Attestation de soutenance | `generateAttestationSoutenance` | ✅ |
| Attestation de réussite | `generateAttestationReussite` | ✅ |
| Document administratif | `generateDocumentAdministratif` | ✅ |
| Fiche apprenant complète | `generateFicheApprenant` | ✅ |

---

## 19. GAMIFICATION

15 badges disponibles via `src/services/badgesService.js` :

| Catégorie | Badges |
|---|---|
| Assiduité | Présence parfaite, Assiduité exemplaire, Toujours à l'heure |
| Notes | Major de promo, Top 3, Mention TB, Mention Bien, En progression |
| Comportement | Esprit d'initiative, Esprit d'équipe, Créativité, Leadership, Rigueur, Engagement total, Excellence |

Attribution protégée anti-doublon par badge et par année académique.

---

## Collections Firestore recensées : 42 collections actives

`users`, `students`, `groupes`, `modules`, `intervenants`, `sessions`, `planning`, `presences`, `affectations`, `candidatures`, `candidature_index`, `reinscriptions`, `justificatifs_paiement`, `inscriptions`, `evaluations`, `notes`, `bulletins`, `historique_notes`, `factures`, `paiements`, `stages`, `documents`, `annonces`, `notifications`, `taches`, `transport_abonnements`, `transport_demandes`, `vehicules`, `personnel`, `entreprises`, `formations`, `sessions_fc`, `devis_fc`, `conventions`, `attestations`, `ressources`, `concours`, `calendrier`, `rapports`, `logs_audit`, `emails_log`, `settings/*` (branding, brevo, reinscription_config), `badges`
