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
  doc.setFontSize(13);
  doc.setTextColor(...BRAND.white);
  doc.text('IFTL', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Institut de Formation dans les métiers Transport & Logistique', 14, 22);
  doc.setTextColor(...BRAND.white);

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
      'Document généré automatiquement — IFTL · Institut de Formation dans les métiers Transport & Logistique',
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
  const lineH = 7;
  const pad = 4;
  const labelW = 26; // fixed width reserved for label text
  const valueMaxW = colW - labelW - pad - 3; // max width before next column

  const leftFields  = fields.filter((_, i) => i % 2 === 0);
  const rightFields = fields.filter((_, i) => i % 2 === 1);
  const rowCount = Math.max(leftFields.length, rightFields.length);
  const boxH = rowCount * lineH + pad * 2;

  doc.setFillColor(...BRAND.lightBlue);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, startY, w - leftMargin - rightMargin, boxH, 2, 2, 'FD');

  // Vertical divider between columns
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(leftMargin + colW, startY + pad, leftMargin + colW, startY + boxH - pad);
  doc.setLineDashPattern([], 0);

  const renderCol = (list, x) => {
    list.forEach((f, i) => {
      const y = startY + pad + lineH * i + lineH * 0.72;
      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.darkBlue);
      doc.text(`${f.label} :`, x, y);
      // Value — truncate to maxWidth to prevent overflow
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.black);
      const str = String(f.value ?? '—');
      const parts = doc.splitTextToSize(str, valueMaxW);
      const display = parts.length > 1 ? parts[0].trimEnd() + '…' : parts[0];
      doc.text(display, x + labelW, y);
    });
  };

  renderCol(leftFields,  leftMargin + pad);
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
  doc.text(`Référence reçu : ${recuNum}`, doc.internal.pageSize.getWidth() - 14, y + 2, { align: 'right' });
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

  const w = doc.internal.pageSize.getWidth();
  const fmt = (n) => new Intl.NumberFormat('fr-MA').format(n) + ' DH';

  // ── Statut badge (left) ──
  const statutLabel = resteDu <= 0 ? 'SOLDÉE' : totalPaye > 0 ? 'PARTIELLEMENT PAYÉE' : 'IMPAYÉE';
  const statutColor = resteDu <= 0 ? [0, 140, 70] : totalPaye > 0 ? [180, 120, 0] : [180, 0, 0];
  const badgeW = 68;
  doc.setFillColor(...statutColor);
  doc.roundedRect(14, y, badgeW, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(statutLabel, 14 + badgeW / 2, y + 6.8, { align: 'center' });

  // ── Summary table (right) ──
  const sumX = w / 2 + 4;
  const sumW = w / 2 - 18;
  const lineH = 8;
  const sumH = 3 * lineH + 8;
  doc.setFillColor(...BRAND.lightBlue);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(sumX, y, sumW, sumH, 2, 2, 'FD');

  const sumRows = [
    { label: 'Montant total', value: fmt(facture.montantTotal || 0), color: BRAND.darkBlue },
    { label: 'Total versé', value: fmt(totalPaye), color: [0, 130, 65] },
    { label: 'Reste dû', value: fmt(Math.max(0, resteDu)), color: resteDu > 0 ? [180, 0, 0] : [0, 130, 65] },
  ];
  sumRows.forEach((r, i) => {
    const ry = y + 4 + lineH * i + lineH * 0.75;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.darkBlue);
    doc.text(r.label, sumX + 5, ry);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...r.color);
    doc.text(r.value, sumX + sumW - 5, ry, { align: 'right' });
  });

  // ── Signature zone ──
  y += sumH + 10;
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(14, y + 14, 80, y + 14);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.grey);
  doc.text('Cachet et signature', 14, y + 19);

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
  doc.text('Direction pédagogique', sigX + 35, y + 8, { align: 'center' });

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

  const subtitle = `Année académique : ${academicYear || '—'} · Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`;
  drawIftlHeader(doc, 'RAPPORT DES ABSENCES', subtitle);
  drawPageBorder(doc);

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
    startY: 52,
    head: [['#', 'Apprenant', 'Groupe', 'Score total', 'Alerte', 'Détail par module']],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: BRAND.darkBlue, textColor: 255 },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        const val = data.cell.text[0];
        if (val === 'DANGER') data.cell.styles.textColor = [180, 0, 0];
        else if (val === 'ALERTE') data.cell.styles.textColor = [180, 120, 0];
        else data.cell.styles.textColor = [0, 120, 0];
      }
    },
  });

  drawFooter(doc);
  doc.save(`rapport_absences_${academicYear || 'export'}.pdf`);
}

// ─── generatePV ───────────────────────────────────────────────────────────────
/**
 * Generates a Procès-Verbal (PV) PDF for a groupe showing all students' notes.
 * @param {object} groupe - { id, nom, filiereCode }
 * @param {Array}  students - [{ id, nom, prenom, codeApprenant|code, cin }]
 * @param {Array}  modules  - [{ id, nom, code, coeff }]
 * @param {object} notesByStudent - { studentId: { moduleId: { moyenne, notes:[{type,note,bareme,absent}] } } }
 * @param {string} anneeAcad
 */
export function generatePV(groupe, students, modules, notesByStudent, anneeAcad = '2025-2026') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const autoTableMod = require('jspdf-autotable');
  const autoTable = autoTableMod.default || autoTableMod;

  const NAVY = [0, 61, 99];
  const RED  = [227, 30, 36];
  const LIGHT = [240, 246, 251];
  const W = doc.internal.pageSize.getWidth();

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 22, 'F');
  doc.setFillColor(...RED);
  doc.rect(0, 22, W, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('PROCÈS-VERBAL DES NOTES', 14, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Groupe : ${groupe.nom}   |   Filière : ${groupe.filiereCode || ''}   |   Année : ${anneeAcad}`, 14, 17);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-MA')}`, W - 14, 17, { align: 'right' });

  // ── Build table ───────────────────────────────────────────────────────────
  function mention(moy) {
    if (moy === null || moy === undefined) return '—';
    if (moy >= 16) return 'Très Bien';
    if (moy >= 14) return 'Bien';
    if (moy >= 12) return 'Assez Bien';
    if (moy >= 10) return 'Passable';
    return 'Non Admis';
  }
  function decision(moy) {
    if (moy === null || moy === undefined) return '—';
    return moy >= 10 ? 'Admis' : 'Non Admis';
  }

  const sortedModules = [...modules].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

  const head = [
    ['N°', 'Nom', 'Prénom', 'Code',
      ...sortedModules.map(m => `${m.nom}\n(c.${m.coeff ?? 1})`),
      'Moy. Gén.', 'Mention', 'Décision'
    ]
  ];

  const body = students.map((s, idx) => {
    const sNotes = notesByStudent[s.id] || {};
    const modMoyennes = sortedModules.map(m => {
      const md = sNotes[m.id];
      if (!md || md.moyenne === null || md.moyenne === undefined) return null;
      return md.moyenne;
    });

    const validMods = sortedModules.map((m, i) => ({ coeff: m.coeff ?? 1, moy: modMoyennes[i] }))
      .filter(x => x.moy !== null);
    const totalCoeff = validMods.reduce((s, x) => s + x.coeff, 0);
    const moyGen = totalCoeff > 0
      ? validMods.reduce((s, x) => s + x.moy * x.coeff, 0) / totalCoeff
      : null;

    return [
      idx + 1,
      s.nom || '',
      s.prenom || '',
      s.codeApprenant || s.code || '',
      ...modMoyennes.map(m => m !== null ? m.toFixed(2) : '—'),
      moyGen !== null ? moyGen.toFixed(2) : '—',
      mention(moyGen),
      decision(moyGen),
    ];
  });

  // Sort by nom
  body.sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  body.forEach((row, i) => { row[0] = i + 1; });

  const colCount = head[0].length;
  const fixedW = 8 + 30 + 22 + 16; // N° + Nom + Prénom + Code
  const tailW = 14 + 22 + 18; // MoyGen + Mention + Décision
  const modW = Math.max(12, Math.floor((W - 14 - fixedW - tailW) / Math.max(sortedModules.length, 1)));

  const columnStyles = {
    0: { cellWidth: 8, halign: 'center' },
    1: { cellWidth: 30 },
    2: { cellWidth: 22 },
    3: { cellWidth: 16, halign: 'center' },
    [colCount - 3]: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
    [colCount - 2]: { cellWidth: 22, halign: 'center' },
    [colCount - 1]: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
  };
  for (let i = 4; i < colCount - 3; i++) {
    columnStyles[i] = { cellWidth: modW, halign: 'center' };
  }

  autoTable(doc, {
    head,
    body,
    startY: 28,
    margin: { left: 7, right: 7 },
    styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles,
    didParseCell(data) {
      if (data.section === 'body') {
        const val = String(data.cell.raw);
        const col = data.column.index;
        if (col === colCount - 1) {
          data.cell.styles.textColor = val === 'Admis' ? [0, 140, 0] : [200, 0, 0];
        } else if (col >= 4 && col < colCount - 2) {
          const n = parseFloat(val);
          if (!isNaN(n)) {
            data.cell.styles.textColor = n >= 10 ? [0, 120, 0] : [200, 0, 0];
          }
        }
      }
    },
  });

  // Summary stats
  let finalY = doc.lastAutoTable?.finalY ?? 28;
  if (finalY < doc.internal.pageSize.getHeight() - 20) {
    finalY += 6;
    const total = body.length;
    const admis = body.filter(r => r[r.length - 1] === 'Admis').length;
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total : ${total} apprenants   |   Admis : ${admis}   |   Non Admis : ${total - admis}   |   Taux : ${total > 0 ? ((admis/total)*100).toFixed(1) : 0}%`, 14, finalY);
  }

  drawFooter(doc);
  const fname = `PV_${(groupe.nom || 'groupe').replace(/[^a-z0-9]/gi,'_')}_${anneeAcad.replace(/\//g,'-')}.pdf`;
  doc.save(fname);
}

// ─── Filière full names ───────────────────────────────────────────────────────
const FILIERE_LABELS = {
  OTM:     'Organisateur(trice) du Transport Multimodal',
  ECOM:    'E-Commerce et Logistique',
  AEL:     'Agent(e) d\'Exploitation Logistique',
  OFLP:    'Opérateur/Opératrice de la Filière Logistique et des Ports',
  ADEE:    'Agent(e) de Diagnostic, d\'Entretien et d\'Électronique Automobile',
  MAINT:   'Technicien(ne) de Maintenance Industrielle',
  CNAM:    'Licence Professionnelle Logistique (CNAM)',
};

function mention(moy) {
  if (moy === null || moy === undefined) return '—';
  if (moy >= 16) return 'Très Bien';
  if (moy >= 14) return 'Bien';
  if (moy >= 12) return 'Assez Bien';
  if (moy >= 10) return 'Passable';
  return 'Insuffisant';
}

function moyGenFromModules(modules) {
  const valid = modules.filter(m => m.note !== null && m.note !== undefined);
  const sumCoeff = valid.reduce((s, m) => s + (m.coeff || 1), 0);
  if (!sumCoeff) return null;
  return valid.reduce((s, m) => s + m.note * (m.coeff || 1), 0) / sumCoeff;
}

// ─── Relevé de Notes 1A TS ────────────────────────────────────────────────────
/**
 * @param {object} student  { nom, prenom, codeApprenant, cin, dateNaissance, sexe }
 * @param {object} info     { anneeAcademique, filiere, groupe }
 * @param {Array}  modules  [{ ref?, nom, note, coeff }]
 * @param {object} summary  { moyenneGenerale?, mention?, decision? }  — overrides computed values if provided
 */
export function generateReleve1A(student, info, modules, summary = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const annee = info.anneeAcademique || '2025-2026';

  // ── Header ──
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, w, 38, 'F');
  doc.setFillColor(...BRAND.yellow);
  doc.rect(0, 38, w, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.white);
  doc.text('IFTL', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Institut de Formation dans les métiers Transport & Logistique', 14, 22);
  doc.setFontSize(6.5);
  doc.text('Pole Urbain P 41 | Tél : +212 66 04 71 53 | www.iftl.ma | info@iftl.ma', 14, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.yellow);
  doc.text('RELEVÉ DE NOTES ANNUEL', w - 14, 16, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.white);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année académique : ${annee}`, w - 14, 24, { align: 'right' });

  let y = 50;

  // ── Student identity ──
  const filiereFull = FILIERE_LABELS[info.filiere] || info.filiere || '—';
  const grpLetter = (info.groupe || '').replace(/^.*?([A-F])$/i, '$1') || info.groupe || '—';

  const fields = [
    { label: 'Nom & Prénom', value: `${student.nom || ''} ${student.prenom || ''}`.trim() },
    { label: 'Code Apprenant', value: student.codeApprenant || '—' },
    { label: 'Sexe', value: student.sexe === 'F' ? 'Féminin' : student.sexe === 'M' ? 'Masculin' : '—' },
    { label: 'C.N.I', value: student.cin || '—' },
    { label: 'Date de naissance', value: student.dateNaissance || '—' },
    { label: 'Groupe', value: `Gr. ${grpLetter}` },
  ];
  y = infoBox(doc, fields, y, 14, 14);

  // Filière banner
  doc.setFillColor(...BRAND.lightBlue);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, w - 28, 8, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.darkBlue);
  doc.text(`Niveau : Technicien(ne) Spécialisé(e)   |   Filière : ${filiereFull}   |   Gr. : ${grpLetter}`, 18, y + 5.5);
  y += 14;

  // ── Notes table ──
  const moy = summary.moyenneGenerale ?? moyGenFromModules(modules);
  const men = summary.mention || mention(moy);
  const decision = summary.decision || (moy !== null && moy >= 10 ? 'ADMIS(E)' : 'NON ADMIS(E)');

  const rows = modules.map(m => [
    m.ref || '—',
    m.nom || '—',
    m.note !== null && m.note !== undefined ? m.note.toFixed(2) : '—',
    String(m.coeff || 1),
  ]);

  // Average row
  rows.push([
    { content: 'Moyenne Générale Annuelle', colSpan: 2, styles: { fontStyle: 'bold', fillColor: BRAND.blue, textColor: BRAND.white } },
    { content: moy !== null ? moy.toFixed(2) : '—', styles: { fontStyle: 'bold', fillColor: BRAND.blue, textColor: BRAND.white, halign: 'center' } },
    { content: '', styles: { fillColor: BRAND.blue } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Réf.', 'Module', 'Note Générale (/20)', 'Coef.']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND.darkBlue, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.row.index === rows.length - 1 && data.section === 'body') {
        data.cell.styles.fillColor = BRAND.blue;
        data.cell.styles.textColor = BRAND.white;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Mention & Décision ──
  const boxW = (w - 28 - 6) / 2;
  ['Mention', 'Décision'].forEach((label, i) => {
    const val = i === 0 ? men : decision;
    const color = i === 1 ? (val.startsWith('ADMIS') ? [0, 130, 60] : [180, 0, 0]) : BRAND.darkBlue;
    const x = 14 + i * (boxW + 6);
    doc.setFillColor(248, 250, 253);
    doc.setDrawColor(...BRAND.blue);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, 10, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.grey);
    doc.text(label + ' :', x + 4, y + 4.5);
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(val, x + boxW / 2, y + 7.5, { align: 'center' });
  });
  y += 16;

  // ── Signature ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.grey);
  doc.text('Signature de la direction :', w - 14 - 60, y);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.2);
  doc.line(w - 14 - 60, y + 18, w - 14, y + 18);

  drawFooter(doc);
  const fname = `Releve_${student.codeApprenant || student.nom}_${annee.replace(/\//g, '-')}.pdf`;
  doc.save(fname);
}

// ─── Relevé de Notes 2A TS (Fin de Formation) ─────────────────────────────────
/**
 * @param {object} student  { nom, prenom, codeApprenant, cin, dateNaissance, sexe }
 * @param {object} info     { anneeAcademique, filiere, groupe }
 * @param {Array}  modules  [{ ref?, nom, note, coeff }]
 * @param {object} summary2A {
 *   moy2A,           // Moyenne 2ème année
 *   moy1A,           // Moyenne 1ère année (from bulletins)
 *   moyStage,        // Stages & insertion professionnelle
 *   moyEFF,          // Examen de Fin de Formation (soutenance)
 * }
 */
export function generateReleve2A(student, info, modules, summary2A = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const annee = info.anneeAcademique || '2025-2026';

  // ── Header ──
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, w, 38, 'F');
  doc.setFillColor(...BRAND.yellow);
  doc.rect(0, 38, w, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND.white);
  doc.text('IFTL', 14, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Institut de Formation dans les métiers Transport & Logistique', 14, 22);
  doc.setFontSize(6.5);
  doc.text('Pole Urbain P 41 | Tél : +212 66 04 71 53 | www.iftl.ma | info@iftl.ma', 14, 28);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.yellow);
  doc.text('RELEVÉ DE NOTES DE FIN DE FORMATION', w - 14, 16, { align: 'right' });
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.white);
  doc.setFont('helvetica', 'normal');
  doc.text(`Année académique : ${annee}`, w - 14, 24, { align: 'right' });

  let y = 50;

  // ── Student identity ──
  const filiereFull = FILIERE_LABELS[info.filiere] || info.filiere || '—';
  const grpLetter = (info.groupe || '').replace(/^.*?([A-F])$/i, '$1') || info.groupe || '—';

  const fields = [
    { label: 'Nom & Prénom', value: `${student.nom || ''} ${student.prenom || ''}`.trim() },
    { label: 'Code Apprenant', value: student.codeApprenant || '—' },
    { label: 'Sexe', value: student.sexe === 'F' ? 'Féminin' : student.sexe === 'M' ? 'Masculin' : '—' },
    { label: 'C.N.I', value: student.cin || '—' },
    { label: 'Date de naissance', value: student.dateNaissance || '—' },
    { label: 'Groupe', value: `Gr. ${grpLetter}` },
  ];
  y = infoBox(doc, fields, y, 14, 14);

  doc.setFillColor(...BRAND.lightBlue);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, w - 28, 8, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.darkBlue);
  doc.text(`Niveau : Technicien(ne) Spécialisé(e)   |   Filière : ${filiereFull}   |   Gr. : ${grpLetter}`, 18, y + 5.5);
  y += 14;

  // ── 2A modules table ──
  const moy2A = summary2A.moy2A ?? moyGenFromModules(modules);

  const rows = modules.map(m => [
    m.ref || '—',
    m.nom || '—',
    m.note !== null && m.note !== undefined ? m.note.toFixed(2) : '—',
    String(m.coeff || 1),
  ]);
  rows.push([
    { content: 'Moyenne Générale de la 2ème année', colSpan: 2, styles: { fontStyle: 'bold', fillColor: BRAND.blue, textColor: BRAND.white } },
    { content: moy2A !== null ? moy2A.toFixed(2) : '—', styles: { fontStyle: 'bold', fillColor: BRAND.blue, textColor: BRAND.white, halign: 'center' } },
    { content: '', styles: { fillColor: BRAND.blue } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Réf.', 'Module', 'Note Générale (/20)', 'Coef.']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
    headStyles: { fillColor: BRAND.darkBlue, textColor: BRAND.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Weighted average table ──
  const moy1A     = summary2A.moy1A   ?? null;
  const moyStage  = summary2A.moyStage ?? null;
  const moyEFF    = summary2A.moyEFF   ?? null;

  const wRows = [
    ['Moyenne Générale de la 2ème année', '30 %', moy2A !== null ? moy2A.toFixed(2) : '—'],
    ['Moyenne Générale de la 1ère année', '20 %', moy1A !== null ? Number(moy1A).toFixed(2) : '—'],
    ['Stages & insertion professionnelle',  '30 %', moyStage !== null ? Number(moyStage).toFixed(2) : '—'],
    ['Examen de Fin de Formation', '20 %', moyEFF !== null ? Number(moyEFF).toFixed(2) : '—'],
  ];

  const moyPass = (moy2A !== null && moy1A !== null && moyStage !== null && moyEFF !== null)
    ? moy2A * 0.3 + Number(moy1A) * 0.2 + Number(moyStage) * 0.3 + Number(moyEFF) * 0.2
    : null;

  wRows.push([
    { content: 'NOTE GÉNÉRALE DE RÉUSSITE', styles: { fontStyle: 'bold', fillColor: BRAND.blue, textColor: BRAND.white } },
    { content: '', styles: { fillColor: BRAND.blue } },
    { content: moyPass !== null ? moyPass.toFixed(2) : '—', styles: { fontStyle: 'bold', fillColor: BRAND.blue, textColor: BRAND.white, halign: 'center' } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14 },
    head: [['Composante', 'Pondération', 'Moyenne (/20)']],
    body: wRows,
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [0, 58, 90], textColor: BRAND.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 253] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 28, halign: 'center' },
      2: { cellWidth: 32, halign: 'center' },
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // ── Mention & Décision ──
  const men = mention(moyPass);
  const decision = moyPass !== null ? (moyPass >= 10 ? 'ADMIS(E)' : 'NON ADMIS(E)') : '—';
  const boxW = (w - 28 - 6) / 2;
  ['Mention', 'Décision'].forEach((label, i) => {
    const val = i === 0 ? men : decision;
    const color = i === 1 ? (val.startsWith('ADMIS') ? [0, 130, 60] : val === '—' ? BRAND.grey : [180, 0, 0]) : BRAND.darkBlue;
    const x = 14 + i * (boxW + 6);
    doc.setFillColor(248, 250, 253);
    doc.setDrawColor(...BRAND.blue);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxW, 10, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.grey);
    doc.text(label + ' :', x + 4, y + 4.5);
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(val, x + boxW / 2, y + 7.5, { align: 'center' });
  });
  y += 16;

  // ── Signature ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.grey);
  doc.text('Signature de la direction :', w - 14 - 60, y);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.2);
  doc.line(w - 14 - 60, y + 18, w - 14, y + 18);

  drawFooter(doc);
  const fname = `Releve2A_${student.codeApprenant || student.nom}_${annee.replace(/\//g, '-')}.pdf`;
  doc.save(fname);
}

// ─── Attestation de passage de soutenance ────────────────────────────────────
/**
 * @param {object} student  - { nom, prenom, dateNaissance, cin, codeApprenant }
 * @param {object} opts     - { anneeFiliere, filiere, anneeFormation, datesSoutenance, dateFait }
 *   anneeFiliere : '1ère' | '2ème'
 *   datesSoutenance : human-readable string, e.g. 'les 12 et 13 juin 2027'
 *   dateFait : Date or string
 */
export function generateAttestationSoutenance(student, opts = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawPageBorder(doc);
  const w = doc.internal.pageSize.getWidth();

  let y = drawIftlHeaderAttestation(doc, 'ATTESTATION DE PASSAGE DE SOUTENANCE');

  const dateFait = opts.dateFait
    ? format(new Date(opts.dateFait), "d MMMM yyyy", { locale: fr })
    : format(new Date(), "d MMMM yyyy", { locale: fr });

  const nomPrenom = `${(student.prenom || '').trim()} ${(student.nom || '').toUpperCase().trim()}`.trim();
  const dob = student.dateNaissance
    ? format(new Date(student.dateNaissance), "d MMMM yyyy", { locale: fr })
    : '—';

  // ── Objet ──
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.blue);
  doc.text('ATTESTATION DE PASSAGE DE SOUTENANCE', w / 2, y, { align: 'center' });

  // ── Intro ──
  y += 10;
  const introLines = doc.splitTextToSize(
    'Je soussigné, M. KARAOUANE Mohamed, Directeur Général de l\'Institut de Formation aux Métiers du Transport ' +
    'et de la Logistique « IFTL », institut public à gestion déléguée créé en vertu du Décret n° 2-25-250 ' +
    'du 1 Kaada 1446 (29 avril 2025), placé sous la tutelle du Ministère de l\'Inclusion économique, de la Petite ' +
    'entreprise, de l\'Emploi et des Compétences et situé au Pôle urbain de Nouaceur LOT P\'41-Nouaceur,',
    w - 28
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.black);
  doc.text(introLines, 14, y);
  y += introLines.length * 5.5 + 4;

  // ── Certifie ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.blue);
  doc.text('CERTIFIE', w / 2, y, { align: 'center' });
  y += 8;

  // ── Body ──
  const anneeFiliere = opts.anneeFiliere || '—';
  const filiere = opts.filiere || '—';
  const anneeFormation = opts.anneeFormation || '—';
  const datesSoutenance = opts.datesSoutenance || '—';

  const bodyText =
    `Que l'apprenant(e) : `;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.black);
  doc.text(bodyText, 14, y);
  y += 6;

  // Student info box
  const fields = [
    { label: 'Nom et Prénom', value: nomPrenom },
    { label: 'Date de naissance', value: dob },
    { label: 'CIN', value: student.cin || '—' },
    { label: 'Code Apprenant', value: student.codeApprenant || '—' },
  ];
  y = drawInfoBoxSimple(doc, fields, y);
  y += 6;

  const bodyLines = doc.splitTextToSize(
    `est inscrit(e) en ${anneeFiliere} année de la filière : ${filiere}, au titre de l'année de formation ${anneeFormation}, ` +
    `et a satisfait aux conditions d'assiduité et d'évaluation continue requises par l'Institut.`,
    w - 28
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.black);
  doc.text(bodyLines, 14, y);
  y += bodyLines.length * 5.5 + 4;

  const passageLines = doc.splitTextToSize(
    `La présente attestation est délivrée pour lui permettre de se présenter aux épreuves de soutenance ${datesSoutenance}.`,
    w - 28
  );
  doc.text(passageLines, 14, y);
  y += passageLines.length * 5.5 + 6;

  // ── Validity note ──
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.grey);
  const noteLines = doc.splitTextToSize(
    'Cette attestation est délivrée à l\'intéressé(e) pour faire valoir ce que de droit et ne préjuge pas ' +
    'des résultats définitifs de la soutenance.',
    w - 28
  );
  doc.text(noteLines, 14, y);
  y += noteLines.length * 5 + 8;

  // ── Signature ──
  drawSignatureBlock(doc, y, dateFait);

  drawFooter(doc);
  const safe = nomPrenom.replace(/\s+/g, '_');
  doc.save(`Attestation_Soutenance_${safe}.pdf`);
}

// ─── Attestation de fin de formation et de réussite ──────────────────────────
/**
 * @param {object} student  - { nom, prenom, dateNaissance, cin, codeApprenant }
 * @param {object} opts     - { niveau, filiere, anneeAcademique, dateDeliberation, dateFait, competencesMetier? }
 */
export function generateAttestationReussite(student, opts = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawPageBorder(doc);
  const w = doc.internal.pageSize.getWidth();

  let y = drawIftlHeaderAttestation(doc, 'ATTESTATION DE FIN DE FORMATION ET DE RÉUSSITE');

  const dateFait = opts.dateFait
    ? format(new Date(opts.dateFait), "d MMMM yyyy", { locale: fr })
    : format(new Date(), "d MMMM yyyy", { locale: fr });

  const nomPrenom = `${(student.prenom || '').trim()} ${(student.nom || '').toUpperCase().trim()}`.trim();
  const dob = student.dateNaissance
    ? format(new Date(student.dateNaissance), "d MMMM yyyy", { locale: fr })
    : '—';

  const dateDelib = opts.dateDeliberation
    ? format(new Date(opts.dateDeliberation), "d MMMM yyyy", { locale: fr })
    : '—';

  // ── Titre ──
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.blue);
  doc.text('ATTESTATION DE FIN DE FORMATION ET DE RÉUSSITE', w / 2, y, { align: 'center' });

  // ── Intro ──
  y += 10;
  const introLines = doc.splitTextToSize(
    'Je soussigné, M. KARAOUANE Mohamed, Directeur Général de l\'Institut de Formation aux Métiers du Transport ' +
    'et de la Logistique « IFTL », institut public à gestion déléguée créé en vertu du Décret n° 2-25-250 ' +
    'du 1 Kaada 1446 (29 avril 2025), placé sous la tutelle du Ministère de l\'Inclusion économique, de la Petite ' +
    'entreprise, de l\'Emploi et des Compétences et situé au Pôle urbain de Nouaceur LOT P\'41-Nouaceur,',
    w - 28
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.black);
  doc.text(introLines, 14, y);
  y += introLines.length * 5.5 + 4;

  // ── Atteste ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.blue);
  doc.text('ATTESTE', w / 2, y, { align: 'center' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.black);
  doc.text('Que l\'apprenant(e) :', 14, y);
  y += 6;

  // Student info box
  const fields = [
    { label: 'Nom et Prénom', value: nomPrenom },
    { label: 'Date de naissance', value: dob },
    { label: 'CIN', value: student.cin || '—' },
    { label: 'Code Apprenant', value: student.codeApprenant || '—' },
  ];
  y = drawInfoBoxSimple(doc, fields, y);
  y += 6;

  const niveau = opts.niveau || '—';
  const filiere = opts.filiere || '—';
  const anneeAcademique = opts.anneeAcademique || '—';
  const competences = opts.competencesMetier || '';

  const body1Lines = doc.splitTextToSize(
    `a validé avec succès l'ensemble des modules pédagogiques et professionnels relatifs à la Formation de niveau ` +
    `${niveau} dans la filière : ${filiere}, au titre de l'année académique ${anneeAcademique}, conformément aux normes ` +
    `en vigueur, et dans le plein respect des critères d'assiduité, de discipline et de performance exigés par l'Institut.`,
    w - 28
  );
  doc.text(body1Lines, 14, y);
  y += body1Lines.length * 5.5 + 4;

  const body2Lines = doc.splitTextToSize(
    `Ce résultat a été arrêté en application des délibérations du Conseil de gestion et de coordination pédagogique ` +
    `de l'Institut, tenu le ${dateDelib}, et dûment consignées dans le procès-verbal correspondant.`,
    w - 28
  );
  doc.text(body2Lines, 14, y);
  y += body2Lines.length * 5.5 + 4;

  if (competences) {
    const cLines = doc.splitTextToSize(`Compétences métier acquises : ${competences}`, w - 28);
    doc.text(cLines, 14, y);
    y += cLines.length * 5.5 + 4;
  }

  // ── Validity note ──
  y += 2;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.grey);
  const noteLines = doc.splitTextToSize(
    'La présente attestation est délivrée à l\'intéressé(e) pour faire valoir ce que de droit, dans l\'attente ' +
    'de la remise du diplôme officiel.',
    w - 28
  );
  doc.text(noteLines, 14, y);
  y += noteLines.length * 5 + 8;

  // ── Signature ──
  drawSignatureBlock(doc, y, dateFait);

  drawFooter(doc);
  const safe = nomPrenom.replace(/\s+/g, '_');
  doc.save(`Attestation_Reussite_${safe}.pdf`);
}

// ─── Shared attestation helpers ───────────────────────────────────────────────

function drawIftlHeaderAttestation(doc, docTitle) {
  const w = doc.internal.pageSize.getWidth();

  // Blue header band
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, w, 42, 'F');

  // Yellow accent bar
  doc.setFillColor(...BRAND.yellow);
  doc.rect(0, 42, w, 3, 'F');

  // Logo zone – left side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.yellow);
  doc.text('IFTL', 14, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.white);
  doc.text('Institut de Formation dans les métiers', 14, 24);
  doc.text('Transport & Logistique', 14, 30);
  doc.setFontSize(6.5);
  doc.text('Pôle Urbain Nouaceur LOT P\'41 | +212 66 04 71 53 | www.iftl.ma', 14, 36);

  // Document type – right side
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.white);
  doc.text(docTitle, w - 14, 22, { align: 'right' });

  return 54; // y after header
}

function drawInfoBoxSimple(doc, fields, startY) {
  const w = doc.internal.pageSize.getWidth();
  const lineH = 6.5;
  const pad = 4;
  const boxH = fields.length * lineH + pad * 2;

  doc.setFillColor(...BRAND.lightBlue);
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, startY, w - 28, boxH, 2, 2, 'FD');

  let y = startY + pad + 4;
  for (const f of fields) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BRAND.grey);
    doc.text(f.label + ' :', 20, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.black);
    doc.text(f.value, 70, y);
    y += lineH;
  }
  return startY + boxH;
}

function drawSignatureBlock(doc, y, dateFait) {
  const w = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.black);
  doc.text(`Fait à Nouaceur, le ${dateFait}`, w - 14, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('M. KARAOUANE Mohamed', w - 14, y, { align: 'right' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND.grey);
  doc.text('Directeur Général de l\'IFTL', w - 14, y, { align: 'right' });
  y += 16;

  // Signature line
  doc.setDrawColor(...BRAND.blue);
  doc.setLineWidth(0.3);
  doc.line(w - 14 - 60, y, w - 14, y);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...BRAND.grey);
  doc.text('Signature et cachet de la Direction', w - 14 - 30, y + 4, { align: 'center' });
}
