import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─── Brand constants ──────────────────────────────────────────────────────────

const BRAND = {
  blue: [0, 89, 137],       // #005989
  yellow: [245, 200, 69],   // #f5c845
  green: [200, 212, 93],    // #c8d45d
  darkBlue: [0, 58, 90],
  lightBlue: [230, 242, 250],
  white: [255, 255, 255],
  black: [30, 30, 30],
  grey: [100, 100, 100],
  lightGrey: [240, 242, 245],
};

const STATUT_LABELS = {
  present: 'P',
  absent_justifie: 'AJ',
  absent_non_justifie: 'ANJ',
  retard: 'R',
};

const MODE_LABELS = {
  virement: 'Virement bancaire',
  especes: 'Espèces',
  cheque: 'Chèque',
  cmi: 'CMI / TPE',
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

function drawPageBorder(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.8);
  doc.rect(8, 8, w - 16, h - 16);
}

function drawIftlHeader(doc, title, subtitle) {
  const w = doc.internal.pageSize.getWidth();

  // Blue top band
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, w, 38, 'F');

  // Yellow accent bar
  doc.setFillColor(...BRAND.yellow);
  doc.rect(0, 38, w, 3, 'F');

  // Institut name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...BRAND.white);
  doc.text('IFTL', 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Institut de Formation en Transport et Logistique', 14, 22);

  // Document title (right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, w - 14, 16, { align: 'right' });

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(subtitle, w - 14, 23, { align: 'right' });
  }

  return 48; // y position after header
}

function drawFooter(doc) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Green bottom bar
    doc.setFillColor(...BRAND.green);
    doc.rect(0, h - 10, w, 10, 'F');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...BRAND.white);
    doc.text(
      'Document généré automatiquement — IFTL · Institut de Formation en Transport et Logistique',
      w / 2,
      h - 3.5,
      { align: 'center' }
    );

    // Page number
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} / ${pageCount}`, w - 14, h - 3.5, { align: 'right' });
  }
}

function infoBox(doc, fields, startY, leftMargin = 14, rightMargin = 14) {
  const w = doc.internal.pageSize.getWidth();
  const colW = (w - leftMargin - rightMargin) / 2;
  const lineH = 6.5;
  const pad = 4;
  const boxH = Math.ceil(fields.length / 2) * lineH + pad * 2;

  doc.setFillColor(...BRAND.lightBlue);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, startY, w - leftMargin - rightMargin, boxH, 2, 2, 'FD');

  const leftFields = fields.filter((_, i) => i % 2 === 0);
  const rightFields = fields.filter((_, i) => i % 2 === 1);

  const renderCol = (list, x) => {
    list.forEach((f, i) => {
      const y = startY + pad + lineH * i + lineH * 0.7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.darkBlue);
      doc.text(`${f.label} :`, x, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BRAND.black);
      doc.text(String(f.value ?? '—'), x + 38, y);
    });
  };

  renderCol(leftFields, leftMargin + pad);
  renderCol(rightFields, leftMargin + colW + pad);

  return startY + boxH + 6;
}

function sectionTitle(doc, text, y) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BRAND.blue);
  doc.rect(14, y, w - 28, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.white);
  doc.text(text.toUpperCase(), 18, y + 5);
  return y + 11;
}

// ─── generateRecu ─────────────────────────────────────────────────────────────

/**
 * Generates a payment receipt PDF for a facture.
 *
 * @param {object} facture - Firestore facture document
 * @param {object} etudiant - { nom, prenom, cin, groupeId }
 */
export function generateRecu(facture, etudiant) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });
  const recuNum = facture.reference || `REC-${Date.now()}`;
  const paiements = facture.paiements || [];
  const totalPaye = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const resteDu = (facture.montantTotal || 0) - totalPaye;

  // ── Header ──
  let y = drawIftlHeader(doc, 'REÇU DE PAIEMENT', `N° ${recuNum}`);

  // Reference & date row
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.grey);
  doc.text(`Date d'émission : ${today}`, 14, y + 2);
  doc.text(`Référence facture : ${recuNum}`, doc.internal.pageSize.getWidth() - 14, y + 2, { align: 'right' });
  y += 9;

  // ── Student info ──
  y = sectionTitle(doc, 'Informations de l\'apprenant', y);
  y = infoBox(doc, [
    { label: 'Nom', value: etudiant.nom || facture.studentNom || '—' },
    { label: 'Prénom', value: etudiant.prenom || facture.studentPrenom || '—' },
    { label: 'CIN', value: etudiant.cin || '—' },
    { label: 'Filière / Groupe', value: etudiant.groupeId || facture.filiere || '—' },
    { label: 'Année académique', value: facture.anneeAcademique || '—' },
    { label: 'Description', value: facture.description || '—' },
  ], y);

  // ── Payment history table ──
  y = sectionTitle(doc, 'Détail des paiements', y);

  const payRows = paiements.map((p, i) => [
    i + 1,
    p.date ? format(new Date(p.date), 'dd/MM/yyyy') : '—',
    new Intl.NumberFormat('fr-MA').format(Number(p.montant) || 0) + ' DH',
    MODE_LABELS[p.mode] || p.mode || '—',
    p.reference || '—',
  ]);

  if (payRows.length === 0) {
    payRows.push(['—', '—', '—', '—', '—']);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['#', 'Date', 'Montant', 'Mode', 'Référence']],
    body: payRows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: BRAND.blue,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: BRAND.lightBlue },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 30 },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 40 },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Summary box ──
  const w = doc.internal.pageSize.getWidth();
  const summaryX = w / 2;
  const summaryW = w / 2 - 14;

  doc.setFillColor(...BRAND.lightGrey);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(summaryX, y, summaryW, 28, 2, 2, 'FD');

  const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n) + ' DH';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.darkBlue);

  const col1 = summaryX + 6;
  const col2 = summaryX + summaryW - 6;

  doc.text('Montant total :', col1, y + 8);
  doc.text(fmt(facture.montantTotal || 0), col2, y + 8, { align: 'right' });

  doc.text('Total payé :', col1, y + 16);
  doc.setTextColor(0, 120, 60);
  doc.text(fmt(totalPaye), col2, y + 16, { align: 'right' });

  doc.setTextColor(...BRAND.darkBlue);
  doc.text('Reste dû :', col1, y + 24);
  doc.setTextColor(resteDu > 0 ? 180 : 0, resteDu > 0 ? 0 : 120, resteDu > 0 ? 0 : 60);
  doc.text(fmt(Math.max(0, resteDu)), col2, y + 24, { align: 'right' });

  // ── Statut badge ──
  const statutLabel = resteDu <= 0 ? 'SOLDÉE' : totalPaye > 0 ? 'PARTIELLEMENT PAYÉE' : 'IMPAYÉE';
  const statutColor = resteDu <= 0 ? [0, 120, 60] : totalPaye > 0 ? [180, 120, 0] : [180, 0, 0];

  doc.setFillColor(...statutColor);
  doc.roundedRect(14, y + 4, 60, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(statutLabel, 14 + 30, y + 11.5, { align: 'center' });

  // ── Signature zone ──
  y += 36;
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(14, y + 18, 80, y + 18);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.grey);
  doc.text('Cachet et signature', 14, y + 23);

  drawFooter(doc);

  const nom = (etudiant.nom || facture.studentNom || 'inconnu').toLowerCase().replace(/\s+/g, '_');
  const dateStr = format(new Date(), 'yyyyMMdd');
  doc.save(`recu-${nom}-${dateStr}.pdf`);
}

// ─── generateBulletin ─────────────────────────────────────────────────────────

/**
 * Generates a grade bulletin PDF.
 *
 * @param {object} student - { prenom, nom, code, cin, groupeId }
 * @param {string} groupeNom
 * @param {Array}  bulletin - [{ moduleName, coeff, notes:[{evalTitre, evalType, evalCoeff, note, absent, bareme}], moyenne }]
 * @param {string} anneeAcad - e.g. '2025-2026'
 */
export function generateBulletin(student, groupeNom, bulletin, anneeAcad = '2025-2026') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const today = format(new Date(), 'dd MMMM yyyy', { locale: fr });

  // ── Header ──
  let y = drawIftlHeader(doc, 'BULLETIN DE NOTES', `Année académique : ${anneeAcad}`);
  y += 3;

  // ── Student info box ──
  y = sectionTitle(doc, 'Informations de l\'apprenant', y);
  y = infoBox(doc, [
    { label: 'Nom', value: student.nom || '—' },
    { label: 'Prénom', value: student.prenom || '—' },
    { label: 'Code', value: student.code || '—' },
    { label: 'CIN', value: student.cin || '—' },
    { label: 'Groupe', value: groupeNom || student.groupeId || '—' },
    { label: 'Année acad.', value: anneeAcad },
  ], y);

  // ── Compute general average ──
  const validMods = bulletin.filter(b => b.moyenne !== null && b.moyenne !== undefined);
  const totalCoeff = validMods.reduce((sum, b) => sum + (b.coeff || 1), 0);
  const moyenneGen = totalCoeff > 0
    ? validMods.reduce((sum, b) => sum + b.moyenne * (b.coeff || 1), 0) / totalCoeff
    : null;

  const appreciation = (moy) => {
    if (moy === null || moy === undefined) return '—';
    if (moy >= 16) return 'Très bien';
    if (moy >= 14) return 'Bien';
    if (moy >= 12) return 'Assez bien';
    if (moy >= 10) return 'Passable';
    return 'Insuffisant';
  };

  // ── Per-module tables ──
  for (const mod of bulletin) {
    y = sectionTitle(doc, `Module : ${mod.moduleName}  (coeff. ${mod.coeff ?? 1})`, y);

    const rows = mod.notes.map(n => {
      const noteOn20 = (!n.absent && n.note !== null && n.note !== undefined)
        ? ((n.note / (n.bareme || 20)) * 20).toFixed(2)
        : null;
      return [
        n.evalTitre || '—',
        n.evalType || '—',
        String(n.evalCoeff ?? 1),
        n.absent ? 'Absent(e)' : (n.note !== null && n.note !== undefined ? `${n.note}/${n.bareme ?? 20}` : '—'),
        noteOn20 !== null ? noteOn20 : '—',
      ];
    });

    // Add moyenne row
    if (mod.moyenne !== null && mod.moyenne !== undefined) {
      rows.push([
        { content: 'Moyenne du module', colSpan: 3, styles: { fontStyle: 'bold', fillColor: BRAND.lightBlue } },
        { content: '', styles: { fillColor: BRAND.lightBlue } },
        { content: mod.moyenne.toFixed(2) + '/20', styles: { fontStyle: 'bold', fillColor: BRAND.lightBlue, textColor: mod.moyenne >= 10 ? [0, 110, 55] : [160, 0, 0] } },
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [['Évaluation', 'Type', 'Coeff.', 'Note / Barème', '/20']],
      body: rows,
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: {
        fillColor: BRAND.blue,
        textColor: BRAND.white,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 253] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 32 },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 4) {
          const val = parseFloat(data.cell.text[0]);
          if (!isNaN(val)) {
            data.cell.styles.textColor = val >= 10 ? [0, 110, 55] : [160, 0, 0];
          }
        }
        if (data.section === 'body' && data.column.index === 3) {
          if (data.cell.text[0] === 'Absent(e)') {
            data.cell.styles.textColor = [180, 0, 0];
            data.cell.styles.fontStyle = 'italic';
          }
        }
      },
    });

    y = doc.lastAutoTable.finalY + 6;

    // Page overflow guard
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 20;
    }
  }

  // ── Moyenne générale & appreciation ──
  y = sectionTitle(doc, 'Résultat général', y);

  const w = doc.internal.pageSize.getWidth();
  const appText = appreciation(moyenneGen);
  const appColor = moyenneGen === null ? BRAND.grey
    : moyenneGen >= 10 ? [0, 120, 60]
    : [180, 0, 0];

  // Summary row via autoTable
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Désignation', 'Valeur', 'Appréciation']],
    body: [
      [
        { content: 'Moyenne Générale', styles: { fontStyle: 'bold' } },
        { content: moyenneGen !== null ? `${moyenneGen.toFixed(2)} / 20` : 'Non calculée', styles: { fontStyle: 'bold', textColor: appColor, halign: 'center' } },
        { content: appText, styles: { fontStyle: 'bold', textColor: appColor, halign: 'center' } },
      ],
    ],
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: BRAND.blue, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 50, halign: 'center' },
      2: { cellWidth: 50, halign: 'center' },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Date & signature zone ──
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.grey);
  doc.text(`Édité le ${today}`, 14, y);

  // Signature box right
  const sigX = w - 14 - 70;
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.rect(sigX, y - 4, 70, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.darkBlue);
  doc.text('Signature & Cachet', sigX + 35, y + 2, { align: 'center' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...BRAND.grey);
  doc.text('Direction pédagogique — IFTL', sigX + 35, y + 8, { align: 'center' });

  drawFooter(doc);

  const nom = (student.nom || 'apprenant').toLowerCase().replace(/\s+/g, '_');
  const annee = anneeAcad.replace(/[^0-9]/g, '-');
  doc.save(`bulletin-${nom}-${annee}.pdf`);
}

// ─── generatePlanningPDF ──────────────────────────────────────────────────────

/**
 * Generates a weekly planning PDF.
 *
 * @param {Array}  sessions     - Array of session objects
 * @param {Array}  groupes      - Array of groupe objects { id, nom }
 * @param {Array}  intervenants - Array of intervenant objects { id, prenom, nom }
 * @param {string} weekLabel    - e.g. "Semaine du 19 au 25 mai 2025"
 */
export function generatePlanningPDF(sessions, groupes, intervenants, weekLabel) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const subtitle = weekLabel || `Semaine du ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}`;
  let y = drawIftlHeader(doc, 'PLANNING HEBDOMADAIRE', subtitle);
  y += 4;

  const groupeMap = Object.fromEntries((groupes || []).map(g => [g.id, g.nom]));
  const intMap = Object.fromEntries((intervenants || []).map(i => [i.id, `${i.prenom} ${i.nom}`]));

  const rows = (sessions || [])
    .sort((a, b) => {
      const da = new Date(a.date + 'T' + (a.heureDebut || '00:00'));
      const db = new Date(b.date + 'T' + (b.heureDebut || '00:00'));
      return da - db;
    })
    .map((s, i) => [
      i + 1,
      s.date ? format(new Date(s.date), 'EEEE dd/MM', { locale: fr }) : '—',
      `${s.heureDebut || '—'} — ${s.heureFin || '—'}`,
      s.module || '—',
      groupeMap[s.groupeId] || s.groupeId || '—',
      intMap[s.intervenantId] || '—',
      s.salle || '—',
      (s.type || '—').toUpperCase(),
    ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['#', 'Jour', 'Horaire', 'Module', 'Groupe', 'Intervenant', 'Salle', 'Type']],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: {
      fillColor: BRAND.blue,
      textColor: BRAND.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: BRAND.lightBlue },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 36 },
      2: { cellWidth: 34 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 38 },
      5: { cellWidth: 48 },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 20, halign: 'center' },
    },
  });

  drawFooter(doc);

  const dateStr = format(new Date(), 'yyyyMMdd');
  doc.save(`planning_${dateStr}.pdf`);
}

// ─── Legacy exports (kept intact) ────────────────────────────────────────────

export function generateFeuillEmargement({ session, students, presences, intervenant, groupe }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const dateStr = session.date
    ? format(new Date(session.date), 'EEEE dd MMMM yyyy', { locale: fr })
    : 'Date inconnue';

  let y = drawIftlHeader(doc, 'FEUILLE D\'ÉMARGEMENT', dateStr);
  y += 2;

  // Session info box
  y = infoBox(doc, [
    { label: 'Module',      value: session.module || '—' },
    { label: 'Groupe',      value: groupe?.nom || '—' },
    { label: 'Horaire',     value: `${session.heureDebut} – ${session.heureFin}` },
    { label: 'Intervenant', value: intervenant ? `${intervenant.prenom} ${intervenant.nom}` : '—' },
    { label: 'Salle',       value: session.salle || '—' },
    { label: 'Type',        value: session.type?.toUpperCase() || '—' },
  ], y);

  // Contenu de la séance
  if (session.contenuSeance || session.objectifs) {
    const w = doc.internal.pageSize.getWidth();
    const boxX = 14;
    const boxW = w - 28;

    if (session.contenuSeance) {
      y = sectionTitle(doc, 'Contenu de la séance', y);
      const lines = doc.splitTextToSize(session.contenuSeance, boxW - 8);
      const boxH = lines.length * 5 + 8;
      doc.setFillColor(248, 250, 253);
      doc.setDrawColor(...BRAND.blue);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.black);
      doc.text(lines, boxX + 4, y + 6);
      y += boxH + 4;
    }

    if (session.objectifs) {
      y = sectionTitle(doc, 'Objectifs pédagogiques', y);
      const lines = doc.splitTextToSize(session.objectifs, boxW - 8);
      const boxH = lines.length * 5 + 8;
      doc.setFillColor(248, 250, 253);
      doc.setDrawColor(...BRAND.blue);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, y, boxW, boxH, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...BRAND.black);
      doc.text(lines, boxX + 4, y + 6);
      y += boxH + 4;
    }
  }

  // Attendance table
  y = sectionTitle(doc, 'Liste de présence', y);

  const presenceMap = {};
  for (const p of presences) presenceMap[p.studentId] = p;

  const rows = students.map((s, i) => {
    const p = presenceMap[s.id];
    const statut = p ? STATUT_LABELS[p.statut] || '—' : '—';
    return [
      i + 1,
      s.nom.toUpperCase(),
      s.prenom,
      s.cin || '—',
      statut,
      p?.statut === 'retard' ? p.heureArrivee || '' : '',
      '',
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['#', 'Nom', 'Prénom', 'CIN', 'Statut', 'Heure arr.', 'Signature']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: BRAND.blue, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: BRAND.lightBlue },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 22 },
      6: { cellWidth: 30 },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const v = data.cell.text[0];
        if (v === 'P')   data.cell.styles.textColor = [0, 120, 60];
        if (v === 'ANJ') data.cell.styles.textColor = [180, 0, 0];
        if (v === 'AJ')  data.cell.styles.textColor = [0, 80, 160];
        if (v === 'R')   data.cell.styles.textColor = [180, 120, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  drawFooter(doc);

  const filename = `emargement_${(session.module || 'session').replace(/[^a-z0-9]/gi, '_')}_${session.date ? format(new Date(session.date), 'yyyyMMdd') : 'export'}.pdf`;
  doc.save(filename);
}

export function generateAbsenceReport({ students, absencesByStudent, academicYear }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport des absences', 148, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année académique : ${academicYear || '—'}`, 148, 26, { align: 'center' });
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, 148, 32, { align: 'center' });

  const rows = students.map((s, i) => {
    const data = absencesByStudent[s.id] || {};
    const totalScore = Object.values(data).reduce((acc, m) => acc + (m.score || 0), 0);
    const alertLevel = totalScore >= 5 ? 'DANGER' : totalScore >= 3 ? 'ALERTE' : 'OK';
    const modules = Object.entries(data)
      .map(([mod, m]) => `${mod}: ${m.score}`)
      .join(' | ');
    return [
      i + 1,
      `${s.nom} ${s.prenom}`,
      s.groupeNom || s.filiere || '—',
      totalScore.toFixed(1),
      alertLevel,
      modules || '—',
    ];
  });

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Apprenant', 'Groupe', 'Score total', 'Alerte', 'Détail par module']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const val = data.cell.text[0];
        if (val === 'DANGER') data.cell.styles.textColor = [180, 0, 0];
        else if (val === 'ALERTE') data.cell.styles.textColor = [180, 120, 0];
        else data.cell.styles.textColor = [0, 120, 0];
      }
    },
  });

  doc.save(`rapport_absences_${academicYear || 'export'}.pdf`);
}
