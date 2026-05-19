import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUT_LABELS = {
  present: 'P',
  absent_justifie: 'AJ',
  absent_non_justifie: 'ANJ',
  retard: 'R'
};

export function generateFeuillEmargement({ session, students, presences, intervenant, groupe }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const dateStr = session.date
    ? format(new Date(session.date), 'EEEE dd MMMM yyyy', { locale: fr })
    : 'Date inconnue';

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Feuille de présence', 105, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const meta = [
    ['Date', dateStr],
    ['Horaire', `${session.heureDebut} – ${session.heureFin}`],
    ['Module', session.module || '—'],
    ['Groupe', groupe?.nom || '—'],
    ['Intervenant', intervenant ? `${intervenant.prenom} ${intervenant.nom}` : '—'],
    ['Salle', session.salle || '—'],
    ['Type', session.type?.toUpperCase() || '—']
  ];

  let y = 28;
  for (const [label, value] of meta) {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label} :`, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 50, y);
    y += 6;
  }

  // Students table
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
      ''
    ];
  });

  autoTable(doc, {
    startY: y + 4,
    head: [['#', 'Nom', 'Prénom', 'CIN', 'Statut', 'Heure arr.', 'Signature']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 22 },
      6: { cellWidth: 30 }
    },
    alternateRowStyles: { fillColor: [248, 248, 248] }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(`Page ${i} / ${pageCount}`, 105, 290, { align: 'center' });
    doc.text('P = Présent  |  AJ = Absent Justifié  |  ANJ = Absent Non Justifié  |  R = Retard', 105, 285, { align: 'center' });
  }

  const filename = `emargement_${session.module || 'session'}_${format(new Date(session.date), 'yyyyMMdd')}.pdf`;
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
      modules || '—'
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
    }
  });

  doc.save(`rapport_absences_${academicYear || 'export'}.pdf`);
}
