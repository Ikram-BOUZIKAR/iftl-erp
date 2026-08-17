# Stratégie de lancement — marque EdTech (crèches, écoles, centres/organismes de formation, enseignement supérieur)

Document de travail. Périmètre : positionnement, nom de marque, architecture technique, sitemap, page commerciale ERP, boutique, SEO, feuille de route budget 0 MAD. Ne couvre pas le volet juridique (statut auto-entrepreneur / société en liquidation), traité séparément — voir rappel en fin de document.

État de référence de l'ERP au 17/08/2026 (dépôt `iftl-erp`, branche `main`) : React 19 + Vite + Firebase (Auth, Firestore, Storage, Hosting), déployé sur `erp-pedago-iftl.web.app`. Livré : authentification, RBAC (admin / scolarité / direction / apprenant), dashboard, design minimaliste gris/blanc. En chantier selon `RECAP_FINAL.md` : Intervenants, Emploi du temps, Candidatures. **La page commerciale ERP doit être rédigée à partir de cette liste réelle, pas d'une liste de fonctionnalités supposée.**

---

## 1. Nom de marque — shortlist

Recherche rapide (web) pour écarter les collisions évidentes. Ne remplace pas une vérification formelle OMPIC (Maroc) + INPI (France) + réservation de domaine avant tout usage commercial ou dépôt.

| Nom | Verdict recherche | Collision trouvée |
|---|---|---|
| Eduvance | ❌ écarter | Société EdTech établie (Inde) |
| Skolia | ❌ écarter | Très proche de "Skolla EdTech" (Asie du Sud-Est) |
| Scolaris | ❌ écarter | Logiciel de vie scolaire existant (scolaris.info) — collision directe avec votre secteur |
| Eduneo | ❌ écarter | Société française de e-learning déjà connue sous ce nom |
| Eduxia | ❌ écarter | Plusieurs plateformes déjà actives sous ce nom |
| **Campusys** | ✅ pas de collision directe | "Campus" seul est très saturé (Campus Cafe, CampusGroup…), mais "Campusys" comme forme composée est libre |
| **Educio** | ✅ pas de collision directe | — |
| **Skolix** | ✅ pas de collision directe | — |
| **Nexcole** | ✅ pas de collision directe | — |

**Recommandation** : prioriser **Educio** ou **Skolix** — courts, prononçables en français/anglais, ne collent pas à un seul produit (contrairement à "Campusys" qui sonne très ERP/back-office et moins bien pour la partie boutique/formation/IA). Avant de trancher, vérifier dans cet ordre (gratuit, ~30 min) :
1. Disponibilité `.com` (+ `.ma`) — registrar au choix.
2. Réseaux sociaux (Instagram, LinkedIn, X) — cohérence du handle.
3. Recherche OMPIC (Maroc) et INPI (France) — absence de marque déposée identique/similaire dans la classe logiciels/formation.
4. Google + réseaux — absence d'usage actif non recensé par la recherche web générale.

Aucun de ces 4 noms n'est validé juridiquement à ce stade — seulement "pas de collision visible en recherche ouverte".

---

## 2. Architecture technique

Contrainte : budget de démarrage ≈ 0 MAD, ERP existant à ne pas reconstruire, séparation site vitrine / ERP.

```
domaine.com            → site vitrine + boutique (WordPress + WooCommerce)
domaine.com/boutique    → boutique intégrée (même install WP)
erp.domaine.com         → ERP existant (ce dépôt, inchangé)
```

**Point clé, spécifique à votre stack actuelle** : l'ERP est déjà déployé sur Firebase Hosting (`erp-pedago-iftl.web.app`). Le brancher sur `erp.domaine.com` ne demande **aucun développement** :
1. Acheter/pointer le domaine.
2. Dans Firebase Hosting → "Ajouter un domaine personnalisé" → `erp.domaine.com`.
3. Créer l'enregistrement DNS fourni par Firebase chez le registrar (ou dans Cloudflare, en mode **DNS uniquement**, pas proxifié — Firebase gère lui-même le TLS et le CDN pour ce sous-domaine).

Pour le site vitrine WordPress, Cloudflare peut rester en mode proxifié (orange) sur `domaine.com` et `www` pour le CDN/WAF/SSL gratuits.

**Hébergement à 0 MAD immédiat** : ne pas payer 959,52 MAD d'avance maintenant. Séquence recommandée :
1. **Phase 0 (0 MAD)** : page de pré-lancement une-page (capture d'email / demande de démo) sur Cloudflare Pages (gratuit, illimité en trafic raisonnable) le temps de finaliser le nom et l'identité.
2. **Phase 1** : dès la première vente ERP ou le premier revenu boutique, basculer sur hébergement WordPress mutualisé payant (Hostinger, o2switch ou OVH — comparer le prix réel mensuel sans engagement long avant de choisir, pas seulement le tarif d'appel).
3. Ne pas s'engager sur un forfait 48 mois tant que le modèle n'est pas validé par des ventes réelles.

---

## 3. Sitemap / navigation

```
Accueil
Solutions
 ├─ Admissions & inscriptions
 ├─ Gestion pédagogique
 ├─ Gestion administrative
 ├─ Finance
 ├─ RH
 ├─ Planning
 ├─ Examens
 └─ Reporting & Data
ERP                     → page commerciale dédiée, CTA "Demander une démo"
Intelligence Artificielle
Formations
Accompagnement
Boutique                → /boutique (WooCommerce)
Secteurs
 ├─ Crèches
 ├─ Écoles
 ├─ Collèges / lycées
 ├─ Centres de formation
 ├─ Organismes de formation
 ├─ Enseignement supérieur
 └─ Universités
Ressources / Blog
À propos
Contact
Demander une démo        → CTA global, présent dans le header sur toutes les pages
```

Chaque page "Secteur" reprend le même canevas (problème type → solutions applicables → CTA) mais avec des exemples et un vocabulaire propres au secteur, pour éviter le duplicate content pointé au point 8.

---

## 4. UX/UI

Deux options, à trancher avant le développement du thème WordPress :

- **Option A — cohérence avec l'ERP** : reprendre la base minimaliste gris/blanc déjà choisie pour l'ERP (`RECAP_FINAL.md` : "design finalisé... plus de modifications de couleurs/dégradés attendues"). Avantage : cohérence de marque du premier contact (site) jusqu'au produit (ERP). Risque : un site vitrine 100% gris/blanc peut manquer de caractère pour vendre une offre premium à 25 000 MAD.
- **Option B — identité de marque distincte** : le site vitrine porte une palette et une typographie propres à la marque (à définir une fois le nom choisi), l'ERP garde son style produit interne. C'est le schéma standard éditeur logiciel (site marketing ≠ style de l'outil).

Recommandation : **Option B**, en réutilisant la rigueur (gris/blanc, pas de superflu) comme contrainte de discipline visuelle plutôt que comme palette imposée.

---

## 5. Page commerciale ERP — structure

Ne pas rédiger le contenu final avant d'avoir la liste réelle des modules livrés. Structure prête à recevoir ce contenu :

1. **Hero** — promesse + CTA unique "Demander une démonstration" (pas de bouton d'achat direct à 25 000 MAD).
2. **Problème** — charge administrative manuelle dans un établissement (inscriptions, absences, bulletins, paiements).
3. **Fonctionnalités livrées aujourd'hui** — à lister depuis l'état réel du dépôt (actuellement : authentification sécurisée, gestion des rôles admin/scolarité/direction/apprenant, tableau de bord). Ne pas annoncer Intervenants / Emploi du temps / Candidatures comme livrés tant qu'ils ne le sont pas — les présenter comme "à venir" si mentionnés.
4. **Modèle commercial** — licence unique ≈ 25 000 MAD, pas d'abonnement obligatoire, assistance facultative ≈ 5 000 MAD/an, prestations sur devis (formation, personnalisation, migration, support).
5. **Tunnel** — formulaire de demande de démo → email de confirmation → créneau → démo → devis.
6. **Preuve sociale** — dès qu'un premier établissement utilise le produit (même en pilote), un encart dédié.
7. **FAQ** — licence vs abonnement, hébergement des données, migration depuis Excel, délai de mise en place.

---

## 6. Boutique (WooCommerce)

Catégories alignées sur le menu "Solutions" :

| Catégorie | Fourchette de prix | Exemples |
|---|---|---|
| Admissions & inscriptions | 29–799 MAD | préinscription automatisée, suivi candidatures |
| Gestion pédagogique | 29–799 MAD | absences, bulletins, planning examens |
| Administration | 29–799 MAD | dossiers étudiants, documents, reporting |
| Finance | 29–799 MAD | suivi paiements, relances |
| RH / Formateurs | 29–799 MAD | gestion intervenants, plannings |
| Dashboards & KPI | 29–799 MAD | dashboard direction |
| Solutions métier | 2 900–9 900 MAD | modules admissions/pédagogie/administration complets |
| Formations | selon durée/format | IA enseignants, Excel avancé, M365/Google Workspace Education |

Le téléchargement automatique post-paiement (WooCommerce + extension de produits téléchargeables) n'est à activer qu'une fois un moyen de paiement en ligne opérationnel (cf. point 9) — en attendant, livraison manuelle par email après virement/paiement.

---

## 7. Intelligence artificielle

Court terme (0 MAD, pas de développement) : formations IA + packs de prompts métiers (admission, pédagogie, direction) vendus comme produits boutique ou modules de formation — valorise l'axe IA sans dépendance technique.

Moyen terme (dépend du calendrier de développement de l'ERP) : assistant Direction en langage naturel sur les KPI, assistant administratif de génération de documents, assistant pédagogique. À ne pas afficher sur le site tant qu'aucun prototype n'existe — le distinguer clairement de l'offre "formation IA", disponible immédiatement.

---

## 8. Architecture SEO

Une page = une intention de recherche réelle, pas de duplication mécanique par ville/secteur.

**Maroc**
`/erp-scolaire-maroc` · `/logiciel-gestion-scolaire-maroc` · `/logiciel-centre-formation-maroc` · `/logiciel-gestion-pedagogique` · `/gestion-inscriptions-ecole` · `/gestion-absences-scolaires` · `/planning-examens` · `/tableau-de-bord-ecole` · `/formation-ia-enseignants` · `/ia-administration-scolaire` · `/microsoft-365-education`

**France**
`/logiciel-organisme-de-formation` · `/erp-organisme-de-formation` · `/digitalisation-organisme-de-formation` · `/logiciel-gestion-centre-de-formation`

Contenu pilier associé (blog, gratuit, mène vers un outil/formation/solution) :
- Digitaliser une école / un centre de formation
- Excel ou ERP : que choisir ?
- Automatiser les inscriptions
- KPI à suivre dans un établissement
- IA dans l'administration scolaire — cas d'usage
- Construire un tableau de bord pédagogique

---

## 9. Paiements

- **Ventes B2B (ERP, solutions métier)** : démonstration → devis → facture → virement. Pas besoin de carte bancaire en ligne à ce stade.
- **Boutique (petits produits)** : paiement en ligne à intégrer plus tard. À étudier avant intégration WooCommerce : CMI (Centre Monétique Interbancaire, solution marocaine la plus courante pour les paiements CB locaux), et une solution internationale compatible (Stripe n'est pas disponible nativement au Maroc pour un compte marocain — à vérifier au moment venu, ne pas supposer sa disponibilité). Un compte bancaire personnel ne se connecte pas directement à WooCommerce — il faut un agrégateur de paiement.

---

## 10. Feuille de route (budget 0 MAD au départ)

| # | Étape | Coût |
|---|---|---|
| 1 | Choisir le nom (shortlist §1) + vérifications OMPIC/INPI/domaine | 0 MAD |
| 2 | Réserver le domaine + comptes réseaux sociaux | coût domaine uniquement (~qqs dizaines de MAD/an) |
| 3 | Page de pré-lancement (Cloudflare Pages) + formulaire demande de démo | 0 MAD |
| 4 | Pointer `erp.domaine.com` vers l'ERP existant (Firebase Hosting) | 0 MAD |
| 5 | Construire le site WordPress complet (sitemap §3) sur hébergement gratuit/test | 0 MAD |
| 6 | Rédiger la page ERP avec la liste réelle de fonctionnalités | 0 MAD |
| 7 | Ouvrir la boutique (sans paiement en ligne, livraison manuelle) | 0 MAD |
| 8 | Publier les premières pages SEO + contenu pilier | 0 MAD |
| 9 | Prospection, premières démos, premières ventes | 0 MAD |
| 10 | Basculer sur hébergement payant + paiement en ligne | dès les premiers revenus |

---

## Rappel — point juridique à ne pas oublier

Avant toute facturation sous statut auto-entrepreneur : vérifier la compatibilité avec la société en liquidation, et retenir **une seule activité AE** (probablement "développement/conseil informatique", la formation pesant moins lourd dans le CA prévisionnel — cf. discussion précédente). Ce point n'est pas traité dans ce document et reste à valider avant la première facture.
