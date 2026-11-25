# Architecture et Préparation Commerciale — EduCloud

*Document technique destiné à l'équipe commerciale et aux prospects ayant des questions techniques*

---

## 1. Vue d'ensemble de l'architecture

EduCloud est une **Single Page Application (SPA)** React hébergée en CDN (Firebase Hosting), avec une base de données temps réel Firebase Firestore. Il n'y a pas de serveur applicatif intermédiaire : toute la logique métier s'exécute dans le navigateur et communique directement avec Firebase.

```
┌─────────────────────────────────────────────────────────┐
│                    NAVIGATEUR / APP MOBILE               │
│                                                          │
│  React 19 + Tailwind CSS 4 + Zustand + date-fns         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐  │
│  │ Planning │  │  Notes   │  │Paiement│  │Portails  │  │
│  │ Émarg.   │  │Bulletins │  │Factures│  │Publics   │  │
│  │ Absences │  │ Relevés  │  │Stages  │  │Apprenants│  │
│  └──────────┘  └──────────┘  └────────┘  └──────────┘  │
│                                                          │
│  PDF: jsPDF 4 + jspdf-autotable 5                       │
│  Excel: xlsx 0.18   Charts: Recharts 3                  │
└─────────────────┬────────────────────────────────────────┘
                  │ HTTPS/WebSocket
                  ▼
┌─────────────────────────────────────────────────────────┐
│                 FIREBASE (Google Cloud)                   │
│                                                          │
│  ┌─────────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Firestore DB   │  │   Auth   │  │    Storage     │  │
│  │  42 collections │  │ Email/PW │  │ Docs/Photos    │  │
│  │  RBAC rules     │  │          │  │                │  │
│  └─────────────────┘  └──────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────┘
                  │
                  ▼ API REST externe
┌─────────────────────────────────────────────────────────┐
│              BREVO (Sendinblue)                          │
│         Service d'envoi d'emails transactionnels         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Stack technique détaillée

### Frontend

| Technologie | Version | Rôle |
|---|---|---|
| React | 19 | Framework UI |
| Vite | 8 | Build tool + Dev server |
| Tailwind CSS | 4 | Styles utilitaires |
| React Router | 7 | Routing client-side |
| Zustand | 5 | État global (stores) |
| i18next | — | Internationalisation FR/EN/AR |
| date-fns | 4 | Manipulation des dates |
| axios | — | Requêtes HTTP externes (Brevo) |
| jsPDF | 4 | Génération PDF côté client |
| jspdf-autotable | 5 | Tableaux dans les PDF |
| xlsx | 0.18.5 | Export/import Excel |
| Recharts | 3 | Graphiques (BarChart, PieChart, AreaChart…) |

### Backend / Infrastructure

| Technologie | Version | Rôle |
|---|---|---|
| Firebase Auth | 12 | Authentification |
| Firestore | 12 | Base de données NoSQL temps réel |
| Firebase Storage | 12 | Stockage fichiers (docs, photos) |
| Firebase Hosting | — | Hébergement CDN global |
| Firebase Emulators | — | Développement et tests locaux |

### Mobile

| Technologie | Version | Rôle |
|---|---|---|
| Capacitor | 8.5 | Wrapper iOS/Android |
| @capacitor/android | 8.5 | Build Android natif |
| @capacitor/ios | 8.5 | Build iOS natif |

### Services externes

| Service | Rôle | Intégration |
|---|---|---|
| Brevo (Sendinblue) | Emails transactionnels | API REST via axios |

---

## 3. Projets Firebase

| Environnement | Projet Firebase | Hosting |
|---|---|---|
| **Production** | `erp-pedago-iftl` | `erp-pedago-iftl` |
| **Démo** | `edupilot-demo` | `edupilot-demo` |

Les deux environnements sont entièrement séparés : bases de données distinctes, authentifications distinctes.

---

## 4. Collections Firestore et structure des données

### Collections principales (42 au total)

| Groupe | Collections |
|---|---|
| Identité | `users`, `students`, `groupes`, `intervenants`, `modules` |
| Pédagogie | `sessions`, `planning`, `presences`, `affectations`, `calendrier` |
| Évaluation | `evaluations`, `notes`, `bulletins`, `historique_notes`, `releves` |
| Administratif | `candidatures`, `candidature_index`, `inscriptions`, `reinscriptions` |
| Financier | `factures`, `paiements`, `justificatifs_paiement` |
| Vie scolaire | `stages`, `documents`, `ressources`, `badges` |
| Transport | `vehicules`, `transport_abonnements`, `transport_demandes` |
| RH | `personnel`, `entreprises` |
| Formation continue | `formations`, `sessions_fc`, `devis_fc`, `conventions`, `attestations` |
| Communication | `annonces`, `notifications`, `taches`, `emails_log` |
| Analyse | `rapports`, `concours` |
| Configuration | `settings/branding`, `settings/brevo`, `settings/reinscription_config` |
| Sécurité | `logs_audit` |

### Modèle apprenant (`students`)
```json
{
  "nom": "string",
  "prenom": "string",
  "codeApprenant": "TS0342",
  "email": "string",
  "telephone": "string",
  "dateNaissance": "string",
  "cin": "string",
  "genre": "M|F",
  "ville": "string",
  "adresse": "string",
  "groupeId": "firestore-id",
  "niveau": "1A TS | 2A TS | Licence | Mastère",
  "filiere": "string",
  "statut": "actif|inactif",
  "photoURL": "storage-url",
  "anneeFormation": "2026-2027",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### Modèle session EDT (`sessions`)
```json
{
  "date": "Timestamp",
  "heureDebut": "08:30",
  "heureFin": "10:30",
  "module": "string",
  "moduleId": "firestore-id",
  "groupeId": "firestore-id",
  "intervenantId": "firestore-id",
  "salle": "string",
  "type": "cours|TP|TD|examen|rattrapage",
  "statut": "planifiee|en_cours|terminee|annulee",
  "emargementOuvert": false,
  "createdAt": "Timestamp"
}
```

---

## 5. Sécurité — Règles Firestore (RBAC)

Trois fonctions utilitaires dans `firestore.rules` :

```javascript
function isAdmin()    { return request.auth != null && get(/users/$(request.auth.uid)).data.role == 'admin'; }
function hasRole(r)   { return request.auth != null && get(/users/$(request.auth.uid)).data.role == r; }
function isAuth()     { return request.auth != null; }
```

**Principe de moindre privilège** :
- Les apprenants lisent uniquement leurs propres données (notes, bulletins, absences, profil)
- Les données financières (factures, paiements) sont inaccessibles aux apprenants et intervenants
- La clé API Brevo n'est accessible qu'aux rôles `admin` et `direction`
- Les portails publics (candidatures, réinscriptions) permettent uniquement la création, jamais la lecture de tiers
- Un utilisateur ne peut pas modifier son propre rôle
- Toutes les actions sensibles sont journalisées dans `logs_audit` (écriture staff uniquement, lecture admin uniquement)

---

## 6. Génération des documents PDF

Toute la génération PDF est **côté client** (navigateur) via jsPDF 4. Aucun serveur d'impression n'est nécessaire.

Le fichier `src/services/pdfService.js` (2 052 lignes) centralise tous les templates. Chaque document intègre :
- En-tête institutionnel (logo IFTL, bande bleue `#005989`, barre jaune `#DCB924`)
- Informations de l'établissement
- Pied de page avec numéro de page

Les 12 types de documents générés ne nécessitent aucune connexion réseau au moment de la génération — tout s'effectue dans le navigateur, hors ligne si nécessaire.

---

## 7. Architecture des emails transactionnels

Les emails sont envoyés via l'**API REST Brevo**, directement depuis le navigateur (client-side). La clé API est stockée dans Firestore (`settings/brevo`) et lue au runtime — elle n'est **jamais embarquée dans le bundle JavaScript déployé**.

11 fonctions d'envoi dans `src/services/emailService.js`. Chaque email est journalisé dans `emails_log`.

**Point de vigilance commercial** : cette architecture client-side nécessite que la clé API Brevo soit correctement configurée côté Firestore. Si Brevo n'est pas configuré, les emails ne partent pas mais l'application continue de fonctionner normalement.

---

## 8. Mode démo

Le build démo (`npm run build:demo`) utilise des alias Vite pour remplacer deux fichiers de données :

| Fichier production | Fichier démo |
|---|---|
| `src/data/portailData.js` | `src/data/portailData.demo.js` |
| `src/data/seedData.js` | `src/data/seedData.demo.js` |

Le projet Firebase cible `edupilot-demo`, entièrement isolé. Le déploiement démo est une opération sans risque pour les données de production.

---

## 9. Application mobile

- **App ID** : `ma.iftl.erp`
- **Nom affiché** : "IFTL ERP"
- **Plateformes** : Android (build présent dans `android/`) + iOS
- **Couleur splash** : `#003d63` (bleu foncé IFTL)
- **Technologie** : Capacitor 8.5 — wrapping WebView de l'application React

L'application mobile est **fonctionnellement identique** à la version web. La même base de code produit les deux.

---

## 10. Internationalisation

- **Stack** : react-i18next + i18next
- **Langues** : `fr.js`, `en.js`, `ar.js` dans `src/i18n/locales/`
- Les dates utilisent `date-fns` avec les locales correspondantes (fr, enUS, ar)
- La direction d'affichage RTL (arabe) est supportée

---

## 11. White-label et personnalisation

Le contexte `BrandingContext` (`src/contexts/BrandingContext.jsx`) charge dynamiquement depuis Firestore `settings/branding` :
- Couleur principale
- Logo (URL Firebase Storage)
- Nom de l'établissement

Ces paramètres sont injectés dans toute l'interface, y compris les documents PDF générés.

**Un même code source peut donc servir plusieurs établissements** avec des identités visuelles distinctes, à condition de déployer sur des projets Firebase séparés.

---

## 12. Risques techniques à documenter avant la vente

| Risque | Description | Mitigation |
|---|---|---|
| **Dépendance Google** | Toute l'infrastructure repose sur Firebase (Google). Une interruption de Firebase impacterait l'accès à l'application. | Firebase SLA 99.95%. Aucun incident long n'est documenté sur cette durée de service. |
| **Emails client-side** | Les emails sont envoyés depuis le navigateur via la clé API Brevo stockée en Firestore. Cela crée une légère fenêtre de risque si les règles Firestore sont mal configurées. | Règles Firestore testées et documentées. Accès à la clé limité à `admin` et `direction`. |
| **Génération PDF sans serveur** | La génération PDF s'effectue dans le navigateur. Pour des documents très longs (> 100 étudiants), cela peut être lent sur des appareils anciens. | Observé en pratique jusqu'à 200+ étudiants sans problème sur machine standard. |
| **Pas de backup automatique** | Firestore ne propose pas de backup temps réel natif dans la formule gratuite (Spark). | La formule Blaze propose des backups planifiés. À recommander en production. |
| **Architecture single-tenant** | Chaque établissement nécessite son propre projet Firebase. Il n'y a pas de multi-tenant natif. | Prévu en architecture : le BrandingContext permet le white-label, mais les données sont isolées par projet Firebase. |

---

## 13. Prérequis pour un déploiement client

1. **Compte Google** pour créer un projet Firebase
2. **Forfait Blaze** Firebase (pay-as-you-go) recommandé pour la production (backups, Storage illimité, fonctions avancées)
3. **Compte Brevo** pour les emails transactionnels (offre gratuite : 300 emails/jour)
4. **Domaine personnalisé** (optionnel) pour Firebase Hosting (ex: erp.monecole.ma)
5. **Certificat Apple Developer** (99$/an) pour publier sur l'App Store iOS

---

## 14. Performances et limites

| Indicateur | Valeur observée / estimée |
|---|---|
| Apprenants supportés | Illimité (Firestore scalable) |
| Temps de chargement initial | < 3 secondes (bundle SPA ~500KB gzippé) |
| Génération PDF | < 2 secondes pour un bulletin standard |
| Sessions EDT chargées en mémoire | Semaine en cours uniquement (requête Firestore filtrée) |
| Concurrent users | Dépend du forfait Firebase Blaze (illimité en pratique) |

---

*Document réservé à l'équipe commerciale et partenaires techniques agréés.*
