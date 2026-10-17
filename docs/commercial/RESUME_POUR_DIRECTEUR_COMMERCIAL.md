# EduCloud — Résumé Exécutif pour le Directeur Commercial

*Document de synthèse — 3 pages*

---

## Ce qu'est EduCloud

EduCloud est un ERP pédagogique complet développé pour les établissements de formation professionnelle et d'enseignement supérieur. Il couvre l'intégralité du cycle de vie d'un apprenant — de la candidature à l'attestation de réussite — dans une seule plateforme accessible depuis navigateur web, tablette et téléphone mobile.

Il est opérationnel en production depuis plusieurs années académiques consécutives dans un établissement de formation marocain (IFTL), avec une base d'utilisateurs réels et des données de production migrées entre années académiques.

---

## Le marché cible

### Segment principal
- Établissements de formation professionnelle privés (Bac+2, Bac+3, Bac+5)
- 50 à 800 apprenants
- Maroc, et plus largement pays francophones d'Afrique du Nord

### Douleurs principales des prospects

1. **Fragmentation des outils** : notes dans Excel, planning sur paper, absences dans un autre fichier, paiements dans un troisième
2. **Absence de portail apprenant** : les étudiants appellent la scolarité pour connaître leurs résultats
3. **Candidatures papier** : piles de dossiers à gérer manuellement
4. **Aucune visibilité en temps réel** : la direction n'a pas de tableau de bord consolidé
5. **Documents officiels laborieux** : bulletins, relevés, PV générés à la main

### Ce que les concurrents proposent (et ce qu'EduCloud fait de plus)

La plupart des solutions du marché marocain se concentrent sur un seul domaine (gestion des notes, ou gestion des paiements). EduCloud est **le seul outil qui couvre les 3 dimensions simultanément** : pédagogique (planning, notes, absences), administrative (candidatures, inscriptions, documents) et financière (facturation, paiements).

---

## Fonctionnalités commercialisables — Ce qui fait la différence

### 1. Portails publics sans compte (avantage unique)

Quatre portails accessibles sans création de compte :
- **Candidature** : le futur étudiant dépose son dossier complet en ligne, upload de documents inclus
- **Suivi de candidature** : il suit son dossier avec son CIN
- **Réinscription** : les étudiants se réinscrivent en ligne et envoient leur justificatif de paiement
- **Résultats** : consultation des résultats officiels

**Impact commercial** : réduction immédiate du trafic à l'accueil et des appels entrants. Argument fort pour les établissements cherchant à moderniser leur image.

### 2. Export PDF multi-groupes avec couleurs (fonctionnalité récente)

Le planning hebdomadaire peut être exporté pour 1, 2 ou N groupes simultanément. Chaque groupe est représenté avec sa propre couleur dans le PDF. Les colonnes de jours sont subdivisées automatiquement.

**Impact commercial** : argument fort pour les coordinateurs pédagogiques et les réunions de pilotage.

### 3. Application mobile native (Android et iOS)

L'application Capacitor produit une app native installable sur Android et iOS à partir du même code source. **App ID : `ma.iftl.erp`**.

**Impact commercial** : les intervenants saisissent l'émargement depuis leur téléphone en salle. Les apprenants consultent leurs notes sans ordinateur.

### 4. Interface trilingue (FR / EN / AR)

Toute l'interface est traduite en français, anglais et arabe, avec support RTL natif pour l'arabe.

**Impact commercial** : différenciateur fort sur le marché marocain. Permet de s'adresser aussi bien aux directions francophones qu'aux communautés arabophones.

### 5. White-label complet

Couleurs, logo, nom de l'établissement configurables depuis l'interface. Tous les documents PDF (bulletins, relevés, reçus, attestations) reprennent automatiquement l'identité visuelle du client.

**Impact commercial** : chaque client perçoit l'outil comme "son" logiciel. Réduit la résistance au changement.

### 6. Gamification

15 badges pour récompenser l'assiduité, les bonnes notes et le comportement. Visibles sur le portail apprenant.

**Impact commercial** : argument différenciateur pour les établissements sensibles à l'engagement des apprenants.

---

## Modèles de déploiement possibles

| Modèle | Description | Profil client |
|---|---|---|
| **SaaS partagé** | Un projet Firebase partagé entre plusieurs établissements (données isolées par Firestore rules) | PME de la formation, budget limité |
| **SaaS dédié** | Un projet Firebase par établissement. Isolation totale. | Établissements moyens à grands (100+ apprenants) |
| **On-premise** | Déploiement sur infrastructure client (possible avec Firebase self-hosted ou substitution Supabase/AppWrite) | Administrations publiques, contraintes de souveraineté |

> *Note technique : le mode "SaaS partagé" nécessite une adaptation architecturale (ajout d'un champ `tenantId` dans chaque collection Firestore). Cette évolution est estimée à 3–5 jours de développement.*

---

## Résumé des chiffres du produit

| Indicateur | Valeur |
|---|---|
| Modules fonctionnels | 24 modules admin + 4 portails publics + 3 portails privés |
| Collections de données | 42 collections Firestore |
| Documents PDF générables | 12 types différents |
| Emails automatiques | 11 déclencheurs |
| Langues | 3 (FR, EN, AR) |
| Rôles utilisateurs | 6 |
| Badges gamifiés | 15 |
| Lignes de code pdfService.js | 2 052 |
| Années académiques en production | Plusieurs (migration réelle entre années) |

---

## Points forts pour le pitch commercial

1. **Opérationnel dès aujourd'hui** — pas un prototype. Données réelles, migrations réelles, bugs réels corrigés.
2. **Couverture fonctionnelle maximale** — de la candidature à l'attestation, tout en un.
3. **Portails publics** — réduction du travail administratif visible immédiatement.
4. **Mobile** — argument fort auprès des établissements avec des intervenants externes.
5. **Multilangue** — différenciateur unique sur le marché francophone marocain.
6. **Mode démo** — démonstration sans risque pour les données de production.

---

## Points à surveiller en négociation

| Sujet | Ce qu'il faut savoir |
|---|---|
| **Hébergement des données** | Firebase (Google) — datacenters en Europe. Convient à la majorité. Pour les institutions publiques marocaines, un hébergement local peut être exigé. Prévoir une discussion sur l'alternative Supabase/AppWrite. |
| **Emails** | Service Brevo requis (offre gratuite 300 emails/jour). Si le client dépasse ou a déjà un provider, prévoir une intégration. |
| **Multi-tenant** | Aujourd'hui, chaque établissement nécessite son propre projet Firebase. Le passage au multi-tenant est une évolution planifiable. |
| **Personnalisation filières** | EduCloud est paramétrable (filières, modules, groupes), mais les templates PDF de relevés de notes sont structurés autour des niveaux TS, Licence, Mastère. Des niveaux très différents (ex: apprentissage court) peuvent nécessiter des ajustements. |
| **Support** | Aucun contrat de support formalisé aujourd'hui. À structurer avant toute commercialisation à grande échelle. |

---

## Proposition de valeur en une phrase

> **EduCloud gère tout le cycle de vie d'un apprenant — de la candidature au diplôme — dans une seule plateforme web et mobile, trilingue et personnalisable, sans installation ni infrastructure à gérer.**

---

## Prochaines étapes recommandées

1. **Structurer l'offre tarifaire** (SaaS mensuel par apprenant ? Forfait annuel par établissement ? Mode dédié vs partagé ?)
2. **Préparer une liste de prospects cibles** (écoles TS et Licences privées au Maroc)
3. **Organiser 3 démos de validation** avec des directeurs d'établissements non IFTL pour identifier les besoins d'adaptation
4. **Définir le contrat de support** (SLA, maintenance, correctifs, évolutions)
5. **Construire un environnement démo permanent** avec données synthétiques réalistes

---

*Document confidentiel — à usage interne de la direction commerciale.*
*Rédigé à partir de l'audit fonctionnel complet du code source, octobre 2026.*
