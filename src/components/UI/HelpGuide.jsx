import { useState } from 'react';
import { createPortal } from 'react-dom';

function IcoClose() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>; }
function IcoChevron({ open }) { return <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>; }
function IcoDownload() { return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>; }

// ── Guide content per role ────────────────────────────────────────────────────

const GUIDE_CONTENT = {
  intervenant: {
    title: 'Guide Intervenant',
    subtitle: 'Comment utiliser votre portail',
    color: '#005989',
    sections: [
      {
        icon: '📅',
        title: 'Mon Planning',
        description: 'Consultez toutes vos séances programmées par l\'administration.',
        steps: [
          { label: 'Séances à venir', detail: 'La liste affiche vos prochaines séances en premier avec la date, l\'horaire, le groupe et la salle.' },
          { label: 'Séances passées', detail: 'Les 10 dernières séances passées sont visibles pour révision et correction d\'émargement.' },
          { label: 'Statut en cours', detail: 'Quand une séance passe en "En cours", un bouton "Signer" apparaît pour démarrer la feuille de présence.' },
        ]
      },
      {
        icon: '✍️',
        title: 'Émargement — Faire l\'appel',
        description: 'Enregistrez les présences de vos apprenants en temps réel.',
        steps: [
          { label: 'Ouvrir une feuille', detail: 'Cliquez sur "Signer" sur une séance "En cours". Si vous êtes en dernière minute, utilisez "Créer une feuille d\'émargement".' },
          { label: 'Statuts disponibles', detail: 'P = Présent | R = Retard (avec heure d\'arrivée) | AJ = Absent justifié (avec motif) | ANJ = Absent non justifié.' },
          { label: 'Marquer tous', detail: 'Utilisez les boutons "Tous P/R/AJ/ANJ" pour marquer rapidement toute la classe, puis ajustez individuellement.' },
          { label: 'Sauvegarder', detail: 'Cliquez "Sauvegarder" à tout moment. La feuille est accessible à l\'administration immédiatement.' },
        ]
      },
      {
        icon: '➕',
        title: 'Créer une séance (appel rapide)',
        description: 'Créez une séance de dernière minute sans passer par l\'administration.',
        steps: [
          { label: 'Accès rapide', detail: 'Cliquez "Nouvelle séance" en haut de votre planning, dans l\'onglet Émargement, ou dans le menu latéral.' },
          { label: 'Remplissez le formulaire', detail: 'Choisissez le groupe, saisissez le module, la date, les horaires et la salle. Votre nom est automatiquement affiché (non modifiable).' },
          { label: 'Apparition dans l\'EDT', detail: 'La séance créée apparaît immédiatement dans l\'EDT de l\'administration avec la date et l\'horaire que vous avez choisis.' },
          { label: 'Appel direct', detail: 'La feuille s\'ouvre automatiquement après création — vous pouvez faire l\'appel immédiatement.' },
        ]
      },
      {
        icon: '📊',
        title: 'Saisie des notes',
        description: 'Saisissez les notes de vos apprenants par module et par type d\'évaluation.',
        steps: [
          { label: 'Accès', detail: 'Onglet "Saisie des notes" dans votre portail. Sélectionnez le groupe, le module et le semestre.' },
          { label: 'Types d\'évaluation', detail: 'Contrôle Continu (CC), Examen Final de Module (EFM), Participation, Travaux Dirigés (TD), Soutenance, Rattrapage.' },
          { label: 'Calcul automatique', detail: 'Formule : EFM × 60% + moyenne(CC + Participation + TD + Soutenance) × 40%.' },
          { label: 'Rattrapage', detail: 'La note de rattrapage remplace l\'EFM si elle est supérieure, plafonnée à 12/20.' },
          { label: 'Import CSV', detail: 'Importez un fichier CSV avec colonnes code, nom, prenom, note pour saisir rapidement toute une classe.' },
          { label: 'Délais', detail: 'Complétez les notes de Semestre 1 avant le 30 janvier et Semestre 2 avant le 30 mai. Des rappels sont envoyés automatiquement.' },
        ]
      },
      {
        icon: '📈',
        title: 'Mes Statistiques',
        description: 'Suivez vos heures enseignées et votre activité mensuelle.',
        steps: [
          { label: 'Heures enseignées', detail: 'Total des heures des séances terminées, heures du mois en cours, nombre de groupes distincts.' },
          { label: 'Masse horaire mensuelle', detail: 'Graphique des 8 derniers mois : heures et nombre de séances par mois pour un suivi régulier.' },
          { label: 'Rémunération estimée', detail: 'Si l\'administration a renseigné votre taux horaire, votre estimation de rémunération s\'affiche automatiquement (total et ce mois).' },
          { label: 'Répartition par type', detail: 'Cours, TP, TD, Examens — visualisez la répartition de votre charge par type de séance.' },
        ]
      },
    ]
  },

  apprenant: {
    title: 'Guide Apprenant',
    subtitle: 'Comment utiliser votre espace personnel',
    color: '#059669',
    sections: [
      {
        icon: '📅',
        title: 'Mon Planning',
        description: 'Consultez les séances programmées pour votre groupe.',
        steps: [
          { label: 'Séances à venir', detail: 'Toutes les séances futures de votre groupe s\'affichent avec le module, l\'intervenant, l\'horaire et la salle.' },
          { label: 'Séance du jour', detail: 'Les séances du jour sont mises en avant avec un badge "Aujourd\'hui" pour les identifier rapidement.' },
        ]
      },
      {
        icon: '📝',
        title: 'Mes Résultats',
        description: 'Consultez vos notes saisies par les intervenants et l\'historique des PV.',
        steps: [
          { label: 'Notes par semestre', detail: 'Notes saisies par vos intervenants, organisées par semestre avec la moyenne générale calculée automatiquement.' },
          { label: 'Formule de calcul', detail: 'EFM × 60% + moyenne(CC + Participation + TD + Soutenance) × 40%. Le rattrapage remplace l\'EFM si supérieur (plafonné à 12/20).' },
          { label: 'Historique PV', detail: 'Les résultats des années précédentes issus des PV officiels s\'affichent en bas de page avec le détail CTL/EFM/Moyenne.' },
          { label: 'Bulletins', detail: 'Téléchargez votre bulletin PDF officiel depuis l\'onglet Résultats.' },
        ]
      },
      {
        icon: '🗓️',
        title: 'Mes Absences',
        description: 'Suivez votre taux de présence et vos absences.',
        steps: [
          { label: 'Tableau de présence', detail: 'Visualisez vos présences (P), retards (R) et absences justifiées (AJ) / non justifiées (ANJ) par séance.' },
          { label: 'Score d\'absence', detail: 'Un score est calculé (AJ = 0.5, ANJ = 1, R = 0.25). Un score élevé déclenchera une alerte.' },
          { label: 'Justifications', detail: 'Pour les absences justifiées, le motif renseigné par l\'intervenant est visible.' },
        ]
      },
      {
        icon: '🚌',
        title: 'Transport — Navette IFTL',
        description: 'Souscrivez à l\'abonnement navette et gérez votre point de rassemblement.',
        steps: [
          { label: 'Souscrire', detail: 'Dans l\'onglet Transport, choisissez votre point de rassemblement parmi : Zaouia, Aéroport Med 5 - Terminal 1, Station Afriquia - AL Madina Deroua, Station Total - Sapino.' },
          { label: 'Statut de la demande', detail: 'Votre demande est envoyée en statut "En attente". La scolarité valide et confirme l\'abonnement.' },
          { label: 'Confirmation', detail: 'Une fois confirmé, votre point de rassemblement et le conducteur assigné sont affichés dans votre portail.' },
        ]
      },
      {
        icon: '📢',
        title: 'Annonces & Notifications',
        description: 'Restez informé des actualités de l\'institut.',
        steps: [
          { label: 'Annonces récentes', detail: 'Les annonces publiées par la scolarité ou la direction s\'affichent en temps réel.' },
          { label: 'Ressources', detail: 'Documents, supports de cours et informations partagés par votre groupe sont accessibles ici.' },
        ]
      },
    ]
  },

  admin: {
    title: 'Guide Administrateur',
    subtitle: 'Toutes les fonctionnalités de l\'ERP pédagogique',
    color: '#7c3aed',
    sections: [
      {
        icon: '👥',
        title: 'Apprenants',
        description: 'Gérez la liste des apprenants inscrits.',
        steps: [
          { label: 'Ajouter', detail: 'Ajoutez un apprenant manuellement ou importez une liste en CSV (téléchargez le modèle fourni).' },
          { label: 'Filtrer', detail: 'Filtrez par filière, statut ou groupe. Recherchez par nom, prénom ou code apprenant.' },
          { label: 'Modifier / Archiver', detail: 'Modifiez les informations ou archivez un apprenant pour le retirer de l\'activité sans le supprimer.' },
        ]
      },
      {
        icon: '📆',
        title: 'EDT — Planning',
        description: 'Planifiez et gérez les séances hebdomadaires.',
        steps: [
          { label: 'Vue semaine', detail: 'Naviguez semaine par semaine. Chaque créneau affiche le module, le groupe, l\'intervenant et la salle.' },
          { label: 'Ajouter une séance', detail: 'Cliquez sur un créneau vide ou sur "Ajouter une séance". Renseignez le groupe, module, intervenant, horaire et type.' },
          { label: 'Drag & Drop', detail: 'Déplacez une séance directement sur la grille pour la reprogrammer.' },
          { label: 'Notifier les intervenants', detail: 'Envoyez le planning hebdomadaire par email à tous les intervenants ou téléchargez leurs PDF individuels.' },
        ]
      },
      {
        icon: '✍️',
        title: 'Émargement',
        description: 'Gérez les feuilles de présence des séances.',
        steps: [
          { label: 'Ouvrir une feuille', detail: 'Cliquez "Ouvrir" sur une séance planifiée pour que l\'intervenant puisse faire l\'appel depuis son portail.' },
          { label: 'Feuille libre', detail: '"Nouvelle feuille libre" crée une séance sans passer par le planning — utile pour les rattrapages.' },
          { label: 'Clôturer', detail: 'Cliquez "Clôturer" en fin de séance. L\'émargement est archivé et l\'intervenant ne peut plus modifier.' },
          { label: 'Voir / Corriger', detail: 'Ouvrez n\'importe quelle feuille pour corriger les présences et télécharger le PDF.' },
        ]
      },
      {
        icon: '📊',
        title: 'Rapports & Absences',
        description: 'Analysez les données de présence et générez des rapports.',
        steps: [
          { label: 'Taux de présence', detail: 'Vue synthétique par groupe et par apprenant avec codes couleur (vert = bon, orange = alerte, rouge = danger).' },
          { label: 'Alertes automatiques', detail: 'Les apprenants dépassant le seuil d\'absences sont mis en avant automatiquement.' },
          { label: 'Export PDF', detail: 'Générez un rapport PDF complet des absences par année académique avec l\'en-tête officielle IFTL.' },
        ]
      },
      {
        icon: '📝',
        title: 'Notes & Bulletins',
        description: 'Saisissez les notes et éditez les bulletins officiels.',
        steps: [
          { label: 'Saisie des notes', detail: 'Sélectionnez le module, le groupe, l\'évaluation (CC, EFM…) et saisissez les notes individuellement.' },
          { label: 'Calcul automatique', detail: 'Les moyennes sont calculées automatiquement : EFM × 60% + autres × 40%. Rattrapage plafonné à 12/20.' },
          { label: 'Accès intervenants', detail: 'Les intervenants saisissent leurs propres notes via leur portail. La scolarité et la direction y ont accès en lecture.' },
          { label: 'Bulletin PDF', detail: 'Générez les bulletins individuels avec l\'en-tête officielle IFTL, la signature et le cachet.' },
        ]
      },
      {
        icon: '💰',
        title: 'Facturation',
        description: 'Gérez les factures et le suivi des paiements.',
        steps: [
          { label: 'Créer une facture', detail: 'Associez une facture à un apprenant avec le montant, la date et la description.' },
          { label: 'Enregistrer un paiement', detail: 'Ajoutez les paiements reçus (virement, espèces, chèque, CMI) pour mettre à jour le solde.' },
          { label: 'Reçu PDF', detail: 'Générez un reçu PDF officiel avec historique des paiements et statut (soldée, partielle, impayée).' },
          { label: 'Facture entreprise', detail: 'Les factures officielles s\'appliquent uniquement aux entreprises en formation continue.' },
        ]
      },
      {
        icon: '🎓',
        title: 'Intervenants',
        description: 'Gérez les profils et taux horaires des intervenants.',
        steps: [
          { label: 'Profil intervenant', detail: 'Renseignez nom, email, modules enseignés et niveaux. L\'email est utilisé pour lier le compte portail.' },
          { label: 'Taux horaire', detail: 'Définissez le taux horaire (DH/h) pour que l\'intervenant visualise sa rémunération estimée dans ses statistiques.' },
          { label: 'Compte portail', detail: 'Créez un compte Firebase avec l\'email de l\'intervenant (role: intervenant) pour lui donner accès au portail.' },
        ]
      },
      {
        icon: '🚌',
        title: 'Transport — Navette IFTL',
        description: 'Gérez les véhicules, conducteurs, abonnements et points de rassemblement.',
        steps: [
          { label: 'Véhicules', detail: 'Enregistrez les véhicules de la navette avec immatriculation, marque, capacité et conducteur affecté.' },
          { label: 'Conducteurs', detail: 'Renseignez le nom du conducteur sur chaque véhicule. Le terme "conducteur" est utilisé (anciennement "chauffeur").' },
          { label: 'Points de rassemblement', detail: 'Les 4 points disponibles : Zaouia, Aéroport Med 5 - Terminal 1, Station Afriquia - AL Madina Deroua, Station Total - Sapino.' },
          { label: 'Abonnements', detail: 'Gérez les abonnements des apprenants par point de rassemblement. Validez ou refusez les demandes depuis la liste des abonnements.' },
          { label: 'Vue par point', detail: 'Consultez la liste des apprenants par point de rassemblement pour organiser les navettes.' },
        ]
      },
    ]
  },

  scolarite: {
    title: 'Guide Scolarité',
    subtitle: 'Gestion administrative des apprenants',
    color: '#d97706',
    sections: [
      {
        icon: '👥',
        title: 'Apprenants',
        description: 'Consultez et gérez les dossiers des apprenants.',
        steps: [
          { label: 'Recherche', detail: 'Recherchez par nom, prénom, code apprenant ou filtrez par groupe et filière.' },
          { label: 'Import CSV', detail: 'Importez une promotion entière en une fois grâce au modèle CSV téléchargeable.' },
          { label: 'Statuts', detail: 'Actif, Archivé, Suspendu — gérez le statut de chaque apprenant selon sa situation.' },
        ]
      },
      {
        icon: '📋',
        title: 'Candidatures',
        description: 'Traitez les demandes d\'admission reçues.',
        steps: [
          { label: 'Candidatures reçues', detail: 'Les candidatures soumises via le formulaire public apparaissent automatiquement ici.' },
          { label: 'Traiter', detail: 'Acceptez, refusez ou mettez en attente. Un clic "Convertir en apprenant" crée le dossier directement.' },
        ]
      },
      {
        icon: '✍️',
        title: 'Émargement',
        description: 'Supervisez les feuilles de présence.',
        steps: [
          { label: 'Vue centralisée', detail: 'Toutes les feuilles (créées par l\'admin ou directement par les intervenants) apparaissent ici.' },
          { label: 'Ouvrir / Clôturer', detail: 'Vous pouvez ouvrir ou clôturer une feuille si l\'intervenant ne peut pas le faire.' },
        ]
      },
      {
        icon: '📝',
        title: 'Notes des intervenants',
        description: 'Consultez les notes saisies par les intervenants pour chaque groupe.',
        steps: [
          { label: 'Accès en lecture', detail: 'La scolarité peut consulter toutes les notes saisies par les intervenants, organisées par module et par groupe.' },
          { label: 'Suivi des saisies', detail: 'Identifiez les modules dont les notes ne sont pas encore saisies pour relancer les intervenants.' },
          { label: 'Bulletins', detail: 'Générez les bulletins PDF officiels depuis le dossier de chaque apprenant.' },
        ]
      },
      {
        icon: '🚌',
        title: 'Transport — Abonnements',
        description: 'Gérez les abonnements navette des apprenants.',
        steps: [
          { label: 'Demandes en attente', detail: 'Les demandes d\'abonnement soumises par les apprenants depuis leur portail apparaissent ici.' },
          { label: 'Valider / Refuser', detail: 'Confirmez ou refusez chaque demande. L\'apprenant est notifié dans son portail.' },
          { label: 'Liste par point', detail: 'Consultez les apprenants affectés à chaque point de rassemblement : Zaouia, Aéroport Med 5, Station Afriquia, Station Total Sapino.' },
          { label: 'Conducteurs', detail: 'Le conducteur affecté à chaque véhicule/navette est visible dans la gestion des abonnements.' },
        ]
      },
    ]
  },

  direction: {
    title: 'Guide Direction',
    subtitle: 'Suivi global et indicateurs',
    color: '#0891b2',
    sections: [
      {
        icon: '📊',
        title: 'Tableau de bord',
        description: 'Vue globale de l\'activité de l\'institut.',
        steps: [
          { label: 'Indicateurs clés', detail: 'Nombre d\'apprenants actifs, taux de présence global, séances de la semaine, factures en attente.' },
          { label: 'Alertes', detail: 'Apprenants en danger d\'exclusion (absences), paiements en retard, séances non clôturées.' },
        ]
      },
      {
        icon: '💰',
        title: 'Facturation & Paiements',
        description: 'Suivi financier complet.',
        steps: [
          { label: 'Vue d\'ensemble', detail: 'Montants encaissés, restants à percevoir, répartition par filière.' },
          { label: 'Reçus & Factures', detail: 'Les reçus sont pour les apprenants. Les factures officielles sont réservées aux entreprises (formation continue).' },
        ]
      },
      {
        icon: '🎓',
        title: 'Intervenants',
        description: 'Suivi des intervenants et de leur charge horaire.',
        steps: [
          { label: 'Charge horaire', detail: 'Nombre de séances et d\'heures par intervenant sur la période sélectionnée.' },
          { label: 'Taux horaire', detail: 'Définissez les taux horaires pour le calcul automatique de la rémunération.' },
        ]
      },
      {
        icon: '📢',
        title: 'Annonces',
        description: 'Publiez des informations à destination des apprenants.',
        steps: [
          { label: 'Publier une annonce', detail: 'Rédigez et publiez une annonce visible par tous les apprenants dans leur portail.' },
          { label: 'Ciblage', detail: 'Ciblez par filière, groupe ou l\'ensemble des apprenants.' },
        ]
      },
      {
        icon: '🚌',
        title: 'Transport',
        description: 'Supervision de la navette IFTL.',
        steps: [
          { label: 'Véhicules & conducteurs', detail: 'Vue de tous les véhicules avec leur conducteur assigné, capacité et état.' },
          { label: 'Abonnements', detail: 'Nombre d\'apprenants abonnés par point de rassemblement et taux de remplissage des navettes.' },
        ]
      },
    ]
  },
};

// ── PDF download ──────────────────────────────────────────────────────────────
async function downloadGuidePDF(guide) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = w - margin * 2;

  // Parse color to RGB
  const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };
  const [cr, cg, cb] = hexToRgb(guide.color);

  // Header
  doc.setFillColor(cr, cg, cb);
  doc.rect(0, 0, w, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(guide.title, margin, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255, 0.75);
  doc.text(guide.subtitle, margin, 20);
  doc.setFontSize(7);
  doc.text('Institut de Formation Transport & Logistique — IFTL', w - margin, 24, { align: 'right' });

  let y = 36;

  for (const section of guide.sections) {
    // Section header
    if (y > 265) { doc.addPage(); y = 15; }
    doc.setFillColor(cr, cg, cb);
    doc.roundedRect(margin, y, contentW, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`${section.icon}  ${section.title}`, margin + 3, y + 6);
    y += 13;

    // Description
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const descLines = doc.splitTextToSize(section.description, contentW - 4);
    doc.text(descLines, margin + 2, y);
    y += descLines.length * 4.5 + 2;

    // Steps
    for (let i = 0; i < section.steps.length; i++) {
      const step = section.steps[i];
      if (y > 268) { doc.addPage(); y = 15; }

      // Bullet circle
      doc.setFillColor(cr, cg, cb);
      doc.circle(margin + 4, y + 2.5, 2.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(i + 1), margin + 4, y + 3.3, { align: 'center' });

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      doc.text(step.label, margin + 10, y + 2.5);

      y += 6;

      // Detail
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      const lines = doc.splitTextToSize(step.detail, contentW - 14);
      if (y + lines.length * 4 > 275) { doc.addPage(); y = 15; }
      doc.text(lines, margin + 10, y);
      y += lines.length * 4 + 3;
    }
    y += 5;
  }

  // Footer on each page
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 285, w, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('IFTL — Institut de Formation Transport & Logistique', margin, 291);
    doc.text(`Page ${p} / ${total}`, w - margin, 291, { align: 'right' });
  }

  doc.save(`Guide_ERP_IFTL_${guide.title.replace(/\s+/g, '_')}.pdf`);
}

// ── Accordion section ─────────────────────────────────────────────────────────
function GuideSection({ section, color, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
      >
        <span className="text-xl shrink-0">{section.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm">{section.title}</p>
          <p className="text-xs text-slate-400 truncate">{section.description}</p>
        </div>
        <IcoChevron open={open} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-3 bg-slate-50/60">
          <p className="text-xs text-slate-500">{section.description}</p>
          <div className="space-y-2.5">
            {section.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <span
                  className="w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: color }}>
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-700">{step.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main HelpGuide modal ──────────────────────────────────────────────────────
export default function HelpGuide({ role = 'admin', onClose }) {
  const guide = GUIDE_CONTENT[role] || GUIDE_CONTENT.admin;
  const [search, setSearch] = useState('');
  const [downloading, setDownloading] = useState(false);

  const filtered = search.trim()
    ? guide.sections.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.description.toLowerCase().includes(search.toLowerCase()) ||
        s.steps.some(step => step.label.toLowerCase().includes(search.toLowerCase()) || step.detail.toLowerCase().includes(search.toLowerCase()))
      )
    : guide.sections;

  const handleDownload = async () => {
    setDownloading(true);
    try { await downloadGuidePDF(guide); }
    finally { setDownloading(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ alignItems: 'center' }}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 flex items-start gap-3 shrink-0"
             style={{ background: `linear-gradient(135deg, ${guide.color}ee, ${guide.color})` }}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base">{guide.title}</p>
            <p className="text-white/70 text-xs mt-0.5">{guide.subtitle}</p>
          </div>
          <button onClick={handleDownload} disabled={downloading}
            title="Télécharger en PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            <IcoDownload />
            {downloading ? 'PDF…' : 'PDF'}
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 shrink-0"><IcoClose /></button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une fonctionnalité…"
            className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ '--tw-ring-color': guide.color }}
          />
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm">Aucun résultat pour "{search}"</p>
            </div>
          ) : (
            filtered.map((section, i) => (
              <GuideSection key={i} section={section} color={guide.color} defaultOpen={i === 0 && !search} />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400">{guide.sections.length} fonctionnalité{guide.sections.length > 1 ? 's' : ''} disponible{guide.sections.length > 1 ? 's' : ''}</p>
          <button onClick={onClose}
            className="px-4 py-1.5 text-sm font-semibold text-white rounded-xl transition-opacity hover:opacity-90"
            style={{ background: guide.color }}>
            Fermer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Help button (à inclure dans n'importe quel portail) ───────────────────────
export function HelpButton({ role, color = '#005989' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Guide d'utilisation"
        className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-black border-2 transition-all hover:scale-110"
        style={{ borderColor: color, color, background: `${color}18` }}>
        ?
      </button>
      {open && <HelpGuide role={role} onClose={() => setOpen(false)} />}
    </>
  );
}
