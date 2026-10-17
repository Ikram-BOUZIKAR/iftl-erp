// Placeholder base64 image used for all demo receipts (SVG reçu fictif)
const DEMO_JUSTIF = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MjAiIGhlaWdodD0iMjIwIj48cmVjdCB3aWR0aD0iNDIwIiBoZWlnaHQ9IjIyMCIgZmlsbD0iI2YwZjZmYiIvPjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjM4MCIgaGVpZ2h0PSIxODAiIHJ4PSIxMCIgZmlsbD0id2hpdGUiIHN0cm9rZT0iIzAwNTk4OSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iMjEwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEzIiBmaWxsPSIjMDA1OTg5IiBmb250LXdlaWdodD0iYm9sZCI+UkVDVSBERSBQQUlFTUVOVDwvdGV4dD48dGV4dCB4PSIyMTAiIHk9IjExMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMzM0MTU1Ij5JbnN0aXR1dCBIb3Jpem9uIFpvdWFnaGE8L3RleHQ+PHRleHQgeD0iMjEwIiB5PSIxNDAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzk0YTNiOCI+RG9ubmVlcyBkZSBkZW1vbnN0cmF0aW9uPC90ZXh0Pjwvc3ZnPg==";

// 15 dépôts couvrant 10 étudiants — 3 soldés, 5 partiels, 2 sans paiement validé
// Niveaux : Licence CNAM (30 000), Licence Transitaire (34 000), Mastère MLAI (43 500)
export const SEED_JUSTIFICATIFS = [
  // ── SOLDÉS ────────────────────────────────────────────────────────────────
  // AMRANI KARIM — Licence CNAM — soldé (15 000 + 15 000 = 30 000)
  { cin:"BK123456", nom:"AMRANI",       prenom:"KARIM",         telephone:"0661234567", niveau:"licence_cnam",        niveauLabel:"Licence CNAM",        montantPaye:15000, statut:"valide",    createdAt:"2025-09-15", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_sept_amrani.jpg",   justificatifType:"image/jpeg" },
  { cin:"BK123456", nom:"AMRANI",       prenom:"KARIM",         telephone:"0661234567", niveau:"licence_cnam",        niveauLabel:"Licence CNAM",        montantPaye:15000, statut:"valide",    createdAt:"2025-10-20", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_oct_amrani.jpg",    justificatifType:"image/jpeg" },
  // BENCHEKROUN SARA — Licence Transitaire — soldée (17 000 + 17 000 = 34 000)
  { cin:"DM234567", nom:"BENCHEKROUN",  prenom:"SARA",          telephone:"0662345678", niveau:"licence_transitaire", niveauLabel:"Licence Transitaire", montantPaye:17000, statut:"valide",    createdAt:"2025-09-10", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_sept_bench.jpg",    justificatifType:"image/jpeg" },
  { cin:"DM234567", nom:"BENCHEKROUN",  prenom:"SARA",          telephone:"0662345678", niveau:"licence_transitaire", niveauLabel:"Licence Transitaire", montantPaye:17000, statut:"valide",    createdAt:"2025-11-05", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_nov_bench.jpg",     justificatifType:"image/jpeg" },
  // CHRAIBI YOUSSEF — Mastère MLAI — soldé (15 000 + 14 500 + 14 000 = 43 500)
  { cin:"HH345678", nom:"CHRAIBI",      prenom:"YOUSSEF",       telephone:"0663456789", niveau:"mastere_mlai",        niveauLabel:"Mastère MLAI",        montantPaye:15000, statut:"valide",    createdAt:"2025-09-08", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_1_chraibi.jpg",     justificatifType:"image/jpeg" },
  { cin:"HH345678", nom:"CHRAIBI",      prenom:"YOUSSEF",       telephone:"0663456789", niveau:"mastere_mlai",        niveauLabel:"Mastère MLAI",        montantPaye:14500, statut:"valide",    createdAt:"2025-10-15", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_2_chraibi.jpg",     justificatifType:"image/jpeg" },
  { cin:"HH345678", nom:"CHRAIBI",      prenom:"YOUSSEF",       telephone:"0663456789", niveau:"mastere_mlai",        niveauLabel:"Mastère MLAI",        montantPaye:14000, statut:"valide",    createdAt:"2026-01-10", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_3_chraibi.jpg",     justificatifType:"image/jpeg" },
  // ── PAIEMENT PARTIEL ──────────────────────────────────────────────────────
  // DOUKKALI FATIMA-ZAHRA — Licence CNAM — 10 000 validé, 8 000 en attente
  { cin:"WB456789", nom:"DOUKKALI",     prenom:"FATIMA-ZAHRA",  telephone:"0664567890", niveau:"licence_cnam",        niveauLabel:"Licence CNAM",        montantPaye:10000, statut:"valide",    createdAt:"2025-09-20", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_sept_doukkali.jpg", justificatifType:"image/jpeg" },
  { cin:"WB456789", nom:"DOUKKALI",     prenom:"FATIMA-ZAHRA",  telephone:"0664567890", niveau:"licence_cnam",        niveauLabel:"Licence CNAM",        montantPaye:8000,  statut:"en_attente",createdAt:"2025-11-12", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_nov_doukkali.jpg",  justificatifType:"image/jpeg" },
  // EL AOUFI MEHDI — Licence Transitaire — 12 000 + 8 000 = 20 000 validé
  { cin:"KB567890", nom:"EL AOUFI",     prenom:"MEHDI",         telephone:"0665678901", niveau:"licence_transitaire", niveauLabel:"Licence Transitaire", montantPaye:12000, statut:"valide",    createdAt:"2025-09-18", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_1_elaoufi.jpg",     justificatifType:"image/jpeg" },
  { cin:"KB567890", nom:"EL AOUFI",     prenom:"MEHDI",         telephone:"0665678901", niveau:"licence_transitaire", niveauLabel:"Licence Transitaire", montantPaye:8000,  statut:"valide",    createdAt:"2025-11-08", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_2_elaoufi.jpg",     justificatifType:"image/jpeg" },
  // FILALI NADIA — Mastère MLAI — 20 000 validé sur 43 500
  { cin:"JM678901", nom:"FILALI",       prenom:"NADIA",         telephone:"0666789012", niveau:"mastere_mlai",        niveauLabel:"Mastère MLAI",        montantPaye:20000, statut:"valide",    createdAt:"2025-09-12", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_filali.jpg",         justificatifType:"image/jpeg" },
  // GHARBAOUI AMINE — Licence CNAM — 5 000 validé sur 30 000
  { cin:"BH789012", nom:"GHARBAOUI",    prenom:"AMINE",         telephone:"0667890123", niveau:"licence_cnam",        niveauLabel:"Licence CNAM",        montantPaye:5000,  statut:"valide",    createdAt:"2025-10-05", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_gharbaoui.jpg",      justificatifType:"image/jpeg" },
  // ── AUCUN VALIDÉ ─────────────────────────────────────────────────────────
  // HAJJI LEILA — Mastère MLAI — 15 000 en attente
  { cin:"DJ890123", nom:"HAJJI",        prenom:"LEILA",         telephone:"0668901234", niveau:"mastere_mlai",        niveauLabel:"Mastère MLAI",        montantPaye:15000, statut:"en_attente",createdAt:"2025-11-20", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_hajji.jpg",          justificatifType:"image/jpeg" },
  // IDRISSI OMAR — Licence Transitaire — 8 000 refusé (justificatif illisible)
  { cin:"WA901234", nom:"IDRISSI",      prenom:"OMAR",          telephone:"0669012345", niveau:"licence_transitaire", niveauLabel:"Licence Transitaire", montantPaye:8000,  statut:"refuse",    createdAt:"2025-10-10", justificatifData:DEMO_JUSTIF, justificatifNom:"recu_idrissi.jpg",         justificatifType:"image/jpeg" },
];

export const SEED_GROUPES =[{"id":"hz-hz-a","nom":"1A TS – Groupe HZ.A (LOG)","niveau":"1A TS","filiereCode":"LOG","anneeAcademique":"2025-2026","actif":true},{"id":"hz-hz-b","nom":"1A TS – Groupe HZ.B (LOG)","niveau":"1A TS","filiereCode":"LOG","anneeAcademique":"2025-2026","actif":true},{"id":"hz-hz-c","nom":"1A TS – Groupe HZ.C (INF)","niveau":"1A TS","filiereCode":"INF","anneeAcademique":"2025-2026","actif":true},{"id":"hz-hz-d","nom":"1A TS – Groupe HZ.D (COM)","niveau":"1A TS","filiereCode":"COM","anneeAcademique":"2025-2026","actif":true},{"id":"hz-hz-e","nom":"1A TS – Groupe HZ.E (ECM)","niveau":"1A TS","filiereCode":"ECM","anneeAcademique":"2025-2026","actif":true}];
export const SEED_STUDENTS = [{"codeApprenant":"HZ0001","nom":"AMRANI","prenom":"KARIM","cin":"BK123456","dateNaissance":"15/03/2005","groupe":"HZ.A","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0002","nom":"BENCHEKROUN","prenom":"SARA","cin":"DM234567","dateNaissance":"22/07/2004","groupe":"HZ.A","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0003","nom":"CHRAIBI","prenom":"YOUSSEF","cin":"HH345678","dateNaissance":"08/11/2005","groupe":"HZ.A","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0004","nom":"DOUKKALI","prenom":"FATIMA-ZAHRA","cin":"WB456789","dateNaissance":"30/01/2005","groupe":"HZ.A","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0005","nom":"EL AOUFI","prenom":"MEHDI","cin":"KB567890","dateNaissance":"14/06/2004","groupe":"HZ.A","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0006","nom":"FILALI","prenom":"NADIA","cin":"JM678901","dateNaissance":"03/09/2005","groupe":"HZ.B","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0007","nom":"GHARBAOUI","prenom":"AMINE","cin":"BH789012","dateNaissance":"19/12/2004","groupe":"HZ.B","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0008","nom":"HAJJI","prenom":"LEILA","cin":"DJ890123","dateNaissance":"27/04/2005","groupe":"HZ.B","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0009","nom":"IDRISSI","prenom":"OMAR","cin":"WA901234","dateNaissance":"11/08/2004","groupe":"HZ.B","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0010","nom":"JNANE","prenom":"SALMA","cin":"BJ012345","dateNaissance":"05/02/2006","groupe":"HZ.B","filiereCode":"LOG","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0011","nom":"KADIRI","prenom":"RACHID","cin":"GK123456","dateNaissance":"17/05/2005","groupe":"HZ.C","filiereCode":"INF","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0012","nom":"LAMRANI","prenom":"HIND","cin":"BL234567","dateNaissance":"29/10/2004","groupe":"HZ.C","filiereCode":"INF","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0013","nom":"MRANI","prenom":"ZAKARIA","cin":"DK345678","dateNaissance":"06/07/2005","groupe":"HZ.C","filiereCode":"INF","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0014","nom":"NACIRI","prenom":"ASMAA","cin":"JK456789","dateNaissance":"21/03/2005","groupe":"HZ.C","filiereCode":"INF","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0015","nom":"OUAZZANE","prenom":"HAMID","cin":"TK567890","dateNaissance":"12/09/2004","groupe":"HZ.C","filiereCode":"INF","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0016","nom":"RBAHI","prenom":"IMANE","cin":"WK678901","dateNaissance":"24/01/2006","groupe":"HZ.D","filiereCode":"COM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0017","nom":"SQALLI","prenom":"AYOUB","cin":"BK789012","dateNaissance":"07/06/2005","groupe":"HZ.D","filiereCode":"COM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0018","nom":"TAJIRI","prenom":"KHAOULA","cin":"DL890123","dateNaissance":"16/11/2004","groupe":"HZ.D","filiereCode":"COM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0019","nom":"UABSI","prenom":"IBRAHIM","cin":"HL901234","dateNaissance":"03/04/2005","groupe":"HZ.D","filiereCode":"COM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0020","nom":"WAHIDI","prenom":"KENZA","cin":"JL012345","dateNaissance":"20/08/2005","groupe":"HZ.D","filiereCode":"COM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0021","nom":"XERIF","prenom":"SAAD","cin":"GL123456","dateNaissance":"09/12/2004","groupe":"HZ.E","filiereCode":"ECM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0022","nom":"YAAKOUBI","prenom":"NOUR","cin":"WL234567","dateNaissance":"26/05/2005","groupe":"HZ.E","filiereCode":"ECM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0023","nom":"ZIDANE","prenom":"TAHA","cin":"BM345678","dateNaissance":"14/02/2006","groupe":"HZ.E","filiereCode":"ECM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0024","nom":"ABBASSI","prenom":"RIM","cin":"DM456789","dateNaissance":"31/07/2004","groupe":"HZ.E","filiereCode":"ECM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"},{"codeApprenant":"HZ0025","nom":"BERRADA","prenom":"JAOUAD","cin":"HM567890","dateNaissance":"18/10/2005","groupe":"HZ.E","filiereCode":"ECM","niveau":"1A TS","anneeAcademique":"2025-2026","statut":"actif"}];

export const SEED_BRANDING = {
  instituteName: 'Institut Horizon Formation',
  slogan: "L'excellence au service de votre avenir professionnel",
  primaryColor: '#005989',
  secondaryColor: '#f5c845',
  devise: 'MAD',
  emailExpediteur: 'contact@horizon-formation.ma',
  adresse: '142, Boulevard Zerktouni, Casablanca 20100',
  telephone: '+212 5 22 48 72 10',
  layout: 'sidebar',
  logoUrl: '',
  siteWeb: 'www.horizon-formation.ma',
};

export const SEED_INTERVENANTS = [
  {id:'int-01',nom:'BELKADI',prenom:'Ahmed',email:'a.belkadi@horizon-formation.ma',telephone:'0661111111',specialite:'Transport & Logistique',filieres:['LOG'],tauxHoraire:350,grade:'Formateur Senior',statut:'actif'},
  {id:'int-02',nom:'CHERKAOUI',prenom:'Nadia',email:'n.cherkaoui@horizon-formation.ma',telephone:'0662222222',specialite:'Réglementation & Douanes',filieres:['LOG'],tauxHoraire:320,grade:'Formatrice',statut:'actif'},
  {id:'int-03',nom:'MANSOURI',prenom:'Karim',email:'k.mansouri@horizon-formation.ma',telephone:'0663333333',specialite:'Comptabilité & Finance',filieres:['LOG','COM','ECM'],tauxHoraire:300,grade:'Formateur',statut:'actif'},
  {id:'int-04',nom:'EL AMRANI',prenom:'Sara',email:'s.elamrani@horizon-formation.ma',telephone:'0664444444',specialite:'Management & Communication',filieres:['LOG','COM','ECM','INF'],tauxHoraire:280,grade:'Formatrice',statut:'actif'},
  {id:'int-05',nom:'TAHIRI',prenom:'Youssef',email:'y.tahiri@horizon-formation.ma',telephone:'0665555555',specialite:'Algorithmique & Bases de Données',filieres:['INF'],tauxHoraire:380,grade:'Formateur Expert',statut:'actif'},
  {id:'int-06',nom:'OUAHABI',prenom:'Imane',email:'i.ouahabi@horizon-formation.ma',telephone:'0666666666',specialite:'Développement Web & Systèmes',filieres:['INF'],tauxHoraire:360,grade:'Formatrice Senior',statut:'actif'},
  {id:'int-07',nom:'BENALI',prenom:'Mohammed',email:'m.benali@horizon-formation.ma',telephone:'0667777777',specialite:'Marketing & Commerce International',filieres:['COM','ECM'],tauxHoraire:310,grade:'Formateur',statut:'actif'},
  {id:'int-08',nom:'ZOUGGARI',prenom:'Khadija',email:'k.zouggari@horizon-formation.ma',telephone:'0668888888',specialite:'Digital & E-Commerce',filieres:['ECM'],tauxHoraire:330,grade:'Formatrice',statut:'actif'},
];

export const SEED_MODULES = [
  // LOG
  {id:'log-01',nom:'Fondamentaux du Transport Multimodal',coeff:2,filiereCode:'LOG',intervenantId:'int-01',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'log-02',nom:'Gestion des Stocks et Approvisionnement',coeff:2,filiereCode:'LOG',intervenantId:'int-01',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'log-03',nom:'Réglementation Logistique et Douanière',coeff:2,filiereCode:'LOG',intervenantId:'int-02',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'log-04',nom:'Transport Routier International',coeff:2,filiereCode:'LOG',intervenantId:'int-01',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'log-05',nom:'Gestion des Opérations en Entrepôt',coeff:2,filiereCode:'LOG',intervenantId:'int-01',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'log-06',nom:'Comptabilité et Gestion Financière',coeff:1,filiereCode:'LOG',intervenantId:'int-03',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'log-07',nom:'Management et Communication',coeff:1,filiereCode:'LOG',intervenantId:'int-04',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'log-08',nom:'Outils Bureautiques et Digital',coeff:1,filiereCode:'LOG',intervenantId:'int-04',volumeHoraire:15,anneeAcademique:'2025-2026'},
  {id:'log-09',nom:'Anglais Professionnel',coeff:1,filiereCode:'LOG',intervenantId:'int-04',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'log-10',nom:'Développement Personnel',coeff:1,filiereCode:'LOG',intervenantId:'int-04',volumeHoraire:10,anneeAcademique:'2025-2026'},
  // INF
  {id:'inf-01',nom:'Algorithmique et Programmation',coeff:2,filiereCode:'INF',intervenantId:'int-05',volumeHoraire:35,anneeAcademique:'2025-2026'},
  {id:'inf-02',nom:'Bases de Données et SQL',coeff:2,filiereCode:'INF',intervenantId:'int-05',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'inf-03',nom:'Développement Web Front-End',coeff:2,filiereCode:'INF',intervenantId:'int-06',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'inf-04',nom:"Systèmes d'Information et Architecture",coeff:2,filiereCode:'INF',intervenantId:'int-05',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'inf-05',nom:'Réseaux et Systèmes',coeff:2,filiereCode:'INF',intervenantId:'int-06',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'inf-06',nom:"Mathématiques Appliquées à l'Informatique",coeff:1,filiereCode:'INF',intervenantId:'int-05',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'inf-07',nom:'Statistiques et Data Analyse',coeff:1,filiereCode:'INF',intervenantId:'int-05',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'inf-08',nom:'Communication Professionnelle',coeff:1,filiereCode:'INF',intervenantId:'int-04',volumeHoraire:15,anneeAcademique:'2025-2026'},
  {id:'inf-09',nom:'Anglais Technique',coeff:1,filiereCode:'INF',intervenantId:'int-04',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'inf-10',nom:'Développement Personnel',coeff:1,filiereCode:'INF',intervenantId:'int-04',volumeHoraire:10,anneeAcademique:'2025-2026'},
  // COM
  {id:'com-01',nom:'Marketing et Stratégie Commerciale',coeff:2,filiereCode:'COM',intervenantId:'int-07',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'com-02',nom:'Commerce International',coeff:2,filiereCode:'COM',intervenantId:'int-07',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'com-03',nom:'Techniques de Vente et Négociation',coeff:2,filiereCode:'COM',intervenantId:'int-07',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'com-04',nom:'Gestion Financière et Comptabilité',coeff:2,filiereCode:'COM',intervenantId:'int-03',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'com-05',nom:'Droit Commercial et des Affaires',coeff:2,filiereCode:'COM',intervenantId:'int-07',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'com-06',nom:'Communication Commerciale',coeff:1,filiereCode:'COM',intervenantId:'int-04',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'com-07',nom:'Bureautique et CRM',coeff:1,filiereCode:'COM',intervenantId:'int-04',volumeHoraire:15,anneeAcademique:'2025-2026'},
  {id:'com-08',nom:'E-Commerce et Digital Marketing',coeff:1,filiereCode:'COM',intervenantId:'int-08',volumeHoraire:15,anneeAcademique:'2025-2026'},
  {id:'com-09',nom:'Anglais Commercial',coeff:1,filiereCode:'COM',intervenantId:'int-04',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'com-10',nom:'Développement Personnel',coeff:1,filiereCode:'COM',intervenantId:'int-04',volumeHoraire:10,anneeAcademique:'2025-2026'},
  // ECM
  {id:'ecm-01',nom:'Marketing Digital et SEO/SEA',coeff:2,filiereCode:'ECM',intervenantId:'int-08',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'ecm-02',nom:'Plateformes E-Commerce',coeff:2,filiereCode:'ECM',intervenantId:'int-08',volumeHoraire:30,anneeAcademique:'2025-2026'},
  {id:'ecm-03',nom:'Logistique du Dernier Kilomètre',coeff:2,filiereCode:'ECM',intervenantId:'int-01',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'ecm-04',nom:'Gestion des Commandes et Relation Client',coeff:2,filiereCode:'ECM',intervenantId:'int-07',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'ecm-05',nom:'Analytics et Mesure de Performance',coeff:2,filiereCode:'ECM',intervenantId:'int-08',volumeHoraire:25,anneeAcademique:'2025-2026'},
  {id:'ecm-06',nom:'Communication Digitale et Réseaux Sociaux',coeff:1,filiereCode:'ECM',intervenantId:'int-07',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'ecm-07',nom:'Comptabilité E-Commerce',coeff:1,filiereCode:'ECM',intervenantId:'int-03',volumeHoraire:15,anneeAcademique:'2025-2026'},
  {id:'ecm-08',nom:'Droit du Numérique et RGPD',coeff:1,filiereCode:'ECM',intervenantId:'int-08',volumeHoraire:15,anneeAcademique:'2025-2026'},
  {id:'ecm-09',nom:'Anglais Professionnel',coeff:1,filiereCode:'ECM',intervenantId:'int-04',volumeHoraire:20,anneeAcademique:'2025-2026'},
  {id:'ecm-10',nom:'Développement Personnel',coeff:1,filiereCode:'ECM',intervenantId:'int-04',volumeHoraire:10,anneeAcademique:'2025-2026'},
];

export const SEED_SESSIONS = [
  // HZ.A — LOG
  {id:'hz-a-s01',date:'2025-10-06',heureDebut:'08:00',heureFin:'10:00',module:'Fondamentaux du Transport Multimodal',moduleId:'log-01',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Salle A101',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-a-s02',date:'2025-10-08',heureDebut:'14:00',heureFin:'16:00',module:'Gestion des Opérations en Entrepôt',moduleId:'log-05',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Salle A101',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-a-s03',date:'2025-10-13',heureDebut:'08:00',heureFin:'10:00',module:'Gestion des Stocks et Approvisionnement',moduleId:'log-02',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Salle A101',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-a-s04',date:'2025-10-15',heureDebut:'14:00',heureFin:'16:00',module:'Comptabilité et Gestion Financière',moduleId:'log-06',intervenantId:'int-03',intervenantNom:'MANSOURI',intervenantPrenom:'Karim',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-a-s05',date:'2025-10-20',heureDebut:'08:00',heureFin:'10:00',module:'Réglementation Logistique et Douanière',moduleId:'log-03',intervenantId:'int-02',intervenantNom:'CHERKAOUI',intervenantPrenom:'Nadia',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Salle A102',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-a-s06',date:'2025-10-22',heureDebut:'14:00',heureFin:'16:00',module:'Management et Communication',moduleId:'log-07',intervenantId:'int-04',intervenantNom:'EL AMRANI',intervenantPrenom:'Sara',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-a-s07',date:'2025-10-27',heureDebut:'08:00',heureFin:'10:00',module:'Transport Routier International',moduleId:'log-04',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Salle A101',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-a-s08',date:'2025-10-29',heureDebut:'14:00',heureFin:'16:00',module:'Outils Bureautiques et Digital',moduleId:'log-08',intervenantId:'int-04',intervenantNom:'EL AMRANI',intervenantPrenom:'Sara',primaryGroupeId:'hz-hz-a',groupeIds:['hz-hz-a'],salle:'Labo Info 1',statut:'realise',anneeAcademique:'2025-2026'},
  // HZ.B — LOG
  {id:'hz-b-s01',date:'2025-10-06',heureDebut:'10:00',heureFin:'12:00',module:'Fondamentaux du Transport Multimodal',moduleId:'log-01',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Salle A102',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-b-s02',date:'2025-10-08',heureDebut:'08:00',heureFin:'10:00',module:'Réglementation Logistique et Douanière',moduleId:'log-03',intervenantId:'int-02',intervenantNom:'CHERKAOUI',intervenantPrenom:'Nadia',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Salle A102',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-b-s03',date:'2025-10-13',heureDebut:'10:00',heureFin:'12:00',module:'Gestion des Stocks et Approvisionnement',moduleId:'log-02',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Salle A102',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-b-s04',date:'2025-10-15',heureDebut:'08:00',heureFin:'10:00',module:'Comptabilité et Gestion Financière',moduleId:'log-06',intervenantId:'int-03',intervenantNom:'MANSOURI',intervenantPrenom:'Karim',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-b-s05',date:'2025-10-20',heureDebut:'10:00',heureFin:'12:00',module:'Transport Routier International',moduleId:'log-04',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Salle A102',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-b-s06',date:'2025-10-22',heureDebut:'08:00',heureFin:'10:00',module:'Management et Communication',moduleId:'log-07',intervenantId:'int-04',intervenantNom:'EL AMRANI',intervenantPrenom:'Sara',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-b-s07',date:'2025-10-27',heureDebut:'10:00',heureFin:'12:00',module:'Gestion des Opérations en Entrepôt',moduleId:'log-05',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Salle A102',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-b-s08',date:'2025-10-29',heureDebut:'08:00',heureFin:'10:00',module:'Outils Bureautiques et Digital',moduleId:'log-08',intervenantId:'int-04',intervenantNom:'EL AMRANI',intervenantPrenom:'Sara',primaryGroupeId:'hz-hz-b',groupeIds:['hz-hz-b'],salle:'Labo Info 1',statut:'realise',anneeAcademique:'2025-2026'},
  // HZ.C — INF
  {id:'hz-c-s01',date:'2025-10-07',heureDebut:'08:00',heureFin:'10:00',module:'Algorithmique et Programmation',moduleId:'inf-01',intervenantId:'int-05',intervenantNom:'TAHIRI',intervenantPrenom:'Youssef',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Labo Info 1',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-c-s02',date:'2025-10-09',heureDebut:'14:00',heureFin:'16:00',module:'Bases de Données et SQL',moduleId:'inf-02',intervenantId:'int-05',intervenantNom:'TAHIRI',intervenantPrenom:'Youssef',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Labo Info 1',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-c-s03',date:'2025-10-14',heureDebut:'08:00',heureFin:'10:00',module:'Développement Web Front-End',moduleId:'inf-03',intervenantId:'int-06',intervenantNom:'OUAHABI',intervenantPrenom:'Imane',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Labo Info 2',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-c-s04',date:'2025-10-16',heureDebut:'14:00',heureFin:'16:00',module:"Systèmes d'Information et Architecture",moduleId:'inf-04',intervenantId:'int-05',intervenantNom:'TAHIRI',intervenantPrenom:'Youssef',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Salle B201',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-c-s05',date:'2025-10-21',heureDebut:'08:00',heureFin:'10:00',module:'Réseaux et Systèmes',moduleId:'inf-05',intervenantId:'int-06',intervenantNom:'OUAHABI',intervenantPrenom:'Imane',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Labo Info 2',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-c-s06',date:'2025-10-23',heureDebut:'14:00',heureFin:'16:00',module:"Mathématiques Appliquées à l'Informatique",moduleId:'inf-06',intervenantId:'int-05',intervenantNom:'TAHIRI',intervenantPrenom:'Youssef',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Salle B201',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-c-s07',date:'2025-10-28',heureDebut:'08:00',heureFin:'10:00',module:'Algorithmique et Programmation',moduleId:'inf-01',intervenantId:'int-05',intervenantNom:'TAHIRI',intervenantPrenom:'Youssef',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Labo Info 1',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-c-s08',date:'2025-10-30',heureDebut:'14:00',heureFin:'16:00',module:'Statistiques et Data Analyse',moduleId:'inf-07',intervenantId:'int-05',intervenantNom:'TAHIRI',intervenantPrenom:'Youssef',primaryGroupeId:'hz-hz-c',groupeIds:['hz-hz-c'],salle:'Salle B201',statut:'realise',anneeAcademique:'2025-2026'},
  // HZ.D — COM
  {id:'hz-d-s01',date:'2025-10-07',heureDebut:'10:00',heureFin:'12:00',module:'Marketing et Stratégie Commerciale',moduleId:'com-01',intervenantId:'int-07',intervenantNom:'BENALI',intervenantPrenom:'Mohammed',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-d-s02',date:'2025-10-09',heureDebut:'08:00',heureFin:'10:00',module:'Commerce International',moduleId:'com-02',intervenantId:'int-07',intervenantNom:'BENALI',intervenantPrenom:'Mohammed',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-d-s03',date:'2025-10-14',heureDebut:'10:00',heureFin:'12:00',module:'Techniques de Vente et Négociation',moduleId:'com-03',intervenantId:'int-07',intervenantNom:'BENALI',intervenantPrenom:'Mohammed',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-d-s04',date:'2025-10-16',heureDebut:'08:00',heureFin:'10:00',module:'Gestion Financière et Comptabilité',moduleId:'com-04',intervenantId:'int-03',intervenantNom:'MANSOURI',intervenantPrenom:'Karim',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Salle A102',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-d-s05',date:'2025-10-21',heureDebut:'10:00',heureFin:'12:00',module:'Droit Commercial et des Affaires',moduleId:'com-05',intervenantId:'int-07',intervenantNom:'BENALI',intervenantPrenom:'Mohammed',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-d-s06',date:'2025-10-23',heureDebut:'08:00',heureFin:'10:00',module:'Communication Commerciale',moduleId:'com-06',intervenantId:'int-04',intervenantNom:'EL AMRANI',intervenantPrenom:'Sara',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-d-s07',date:'2025-10-28',heureDebut:'10:00',heureFin:'12:00',module:'Marketing et Stratégie Commerciale',moduleId:'com-01',intervenantId:'int-07',intervenantNom:'BENALI',intervenantPrenom:'Mohammed',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-d-s08',date:'2025-10-30',heureDebut:'08:00',heureFin:'10:00',module:'Bureautique et CRM',moduleId:'com-07',intervenantId:'int-04',intervenantNom:'EL AMRANI',intervenantPrenom:'Sara',primaryGroupeId:'hz-hz-d',groupeIds:['hz-hz-d'],salle:'Labo Info 1',statut:'realise',anneeAcademique:'2025-2026'},
  // HZ.E — ECM
  {id:'hz-e-s01',date:'2025-10-08',heureDebut:'10:00',heureFin:'12:00',module:'Marketing Digital et SEO/SEA',moduleId:'ecm-01',intervenantId:'int-08',intervenantNom:'ZOUGGARI',intervenantPrenom:'Khadija',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Labo Info 2',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-e-s02',date:'2025-10-10',heureDebut:'08:00',heureFin:'10:00',module:'Plateformes E-Commerce',moduleId:'ecm-02',intervenantId:'int-08',intervenantNom:'ZOUGGARI',intervenantPrenom:'Khadija',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Labo Info 2',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-e-s03',date:'2025-10-15',heureDebut:'10:00',heureFin:'12:00',module:'Gestion des Commandes et Relation Client',moduleId:'ecm-04',intervenantId:'int-07',intervenantNom:'BENALI',intervenantPrenom:'Mohammed',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Salle A103',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-e-s04',date:'2025-10-17',heureDebut:'08:00',heureFin:'10:00',module:'Analytics et Mesure de Performance',moduleId:'ecm-05',intervenantId:'int-08',intervenantNom:'ZOUGGARI',intervenantPrenom:'Khadija',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Labo Info 2',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-e-s05',date:'2025-10-22',heureDebut:'10:00',heureFin:'12:00',module:'Marketing Digital et SEO/SEA',moduleId:'ecm-01',intervenantId:'int-08',intervenantNom:'ZOUGGARI',intervenantPrenom:'Khadija',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Labo Info 2',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-e-s06',date:'2025-10-24',heureDebut:'08:00',heureFin:'10:00',module:'Logistique du Dernier Kilomètre',moduleId:'ecm-03',intervenantId:'int-01',intervenantNom:'BELKADI',intervenantPrenom:'Ahmed',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Salle A101',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-e-s07',date:'2025-10-29',heureDebut:'10:00',heureFin:'12:00',module:'Plateformes E-Commerce',moduleId:'ecm-02',intervenantId:'int-08',intervenantNom:'ZOUGGARI',intervenantPrenom:'Khadija',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Labo Info 2',statut:'realise',anneeAcademique:'2025-2026'},
  {id:'hz-e-s08',date:'2025-10-31',heureDebut:'08:00',heureFin:'10:00',module:'Droit du Numérique et RGPD',moduleId:'ecm-08',intervenantId:'int-08',intervenantNom:'ZOUGGARI',intervenantPrenom:'Khadija',primaryGroupeId:'hz-hz-e',groupeIds:['hz-hz-e'],salle:'Salle B201',statut:'realise',anneeAcademique:'2025-2026'},
];

const _STUDENTS_BY_GROUP = {
  'hz-hz-a': [
    {code:'HZ0001',nom:'AMRANI',prenom:'KARIM',rate:0.88},
    {code:'HZ0002',nom:'BENCHEKROUN',prenom:'SARA',rate:0.75},
    {code:'HZ0003',nom:'CHRAIBI',prenom:'YOUSSEF',rate:0.96},
    {code:'HZ0004',nom:'DOUKKALI',prenom:'FATIMA-ZAHRA',rate:0.62},
    {code:'HZ0005',nom:'EL AOUFI',prenom:'MEHDI',rate:0.38},
  ],
  'hz-hz-b': [
    {code:'HZ0006',nom:'FILALI',prenom:'NADIA',rate:0.88},
    {code:'HZ0007',nom:'GHARBAOUI',prenom:'AMINE',rate:0.75},
    {code:'HZ0008',nom:'HAJJI',prenom:'LEILA',rate:0.96},
    {code:'HZ0009',nom:'IDRISSI',prenom:'OMAR',rate:0.50},
    {code:'HZ0010',nom:'JNANE',prenom:'SALMA',rate:0.75},
  ],
  'hz-hz-c': [
    {code:'HZ0011',nom:'KADIRI',prenom:'RACHID',rate:0.96},
    {code:'HZ0012',nom:'LAMRANI',prenom:'HIND',rate:0.88},
    {code:'HZ0013',nom:'MRANI',prenom:'ZAKARIA',rate:0.75},
    {code:'HZ0014',nom:'NACIRI',prenom:'ASMAA',rate:0.62},
    {code:'HZ0015',nom:'OUAZZANE',prenom:'HAMID',rate:0.50},
  ],
  'hz-hz-d': [
    {code:'HZ0016',nom:'RBAHI',prenom:'IMANE',rate:0.88},
    {code:'HZ0017',nom:'SQALLI',prenom:'AYOUB',rate:0.96},
    {code:'HZ0018',nom:'TAJIRI',prenom:'KHAOULA',rate:0.75},
    {code:'HZ0019',nom:'UABSI',prenom:'IBRAHIM',rate:0.50},
    {code:'HZ0020',nom:'WAHIDI',prenom:'KENZA',rate:0.88},
  ],
  'hz-hz-e': [
    {code:'HZ0021',nom:'XERIF',prenom:'SAAD',rate:0.88},
    {code:'HZ0022',nom:'YAAKOUBI',prenom:'NOUR',rate:0.96},
    {code:'HZ0023',nom:'ZIDANE',prenom:'TAHA',rate:0.75},
    {code:'HZ0024',nom:'ABBASSI',prenom:'RIM',rate:0.62},
    {code:'HZ0025',nom:'BERRADA',prenom:'JAOUAD',rate:0.75},
  ],
};

function _genPresences(sessions) {
  const presences = [];
  sessions.forEach((sess, sIdx) => {
    const grpStudents = _STUDENTS_BY_GROUP[sess.primaryGroupeId] || [];
    grpStudents.forEach((s) => {
      const h = (s.code.charCodeAt(4) * 7 + sIdx * 13 + s.code.charCodeAt(3) * 3) % 100;
      const threshold = s.rate * 100;
      let statut;
      if (h < threshold - 10) statut = 'present';
      else if (h < threshold - 5) statut = 'retard';
      else if (h < threshold) statut = 'excuse';
      else statut = 'absent';
      presences.push({
        sessionId: sess.id,
        codeApprenant: s.code,
        nom: s.nom,
        prenom: s.prenom,
        groupeId: sess.primaryGroupeId,
        date: sess.date,
        statut,
      });
    });
  });
  return presences;
}
export const SEED_PRESENCES = _genPresences(SEED_SESSIONS);

function _ech(n, paid, mode) {
  const DATES = {1:{limit:'2025-09-30',pay:'2025-09-15'},2:{limit:'2025-11-30',pay:'2025-11-18'},3:{limit:'2026-01-31',pay:'2026-01-20'}};
  const d = DATES[n];
  return {num:n,montant:10000,dateLimite:d.limit,datePaiement:paid?d.pay:null,statut:paid?'paye':'en_attente',modePaiement:paid?mode:null};
}
function _fact(idx, code, nom, prenom, cin, groupe, filiereCode, pc) {
  const M = ['virement','especes','cheque'];
  const echeances = [_ech(1,pc>=1,M[idx%3]),_ech(2,pc>=2,M[(idx+1)%3]),_ech(3,pc>=3,M[(idx+2)%3])];
  return {id:`fact-${code.toLowerCase()}`,codeApprenant:code,nom,prenom,cin,groupe,filiereCode,niveau:'1A TS',anneeAcademique:'2025-2026',dateEmission:'2025-09-01',designation:'Frais de scolarité 1A TS – 2025-2026',montantTotal:30000,montantPaye:pc*10000,restant:30000-pc*10000,statut:pc===3?'solde':pc===0?'impaye':'partiel',echeances};
}
export const SEED_FACTURES = [
  _fact(0,'HZ0001','AMRANI','KARIM','BK123456','HZ.A','LOG',3),
  _fact(1,'HZ0002','BENCHEKROUN','SARA','DM234567','HZ.A','LOG',2),
  _fact(2,'HZ0003','CHRAIBI','YOUSSEF','HH345678','HZ.A','LOG',3),
  _fact(3,'HZ0004','DOUKKALI','FATIMA-ZAHRA','WB456789','HZ.A','LOG',1),
  _fact(4,'HZ0005','EL AOUFI','MEHDI','KB567890','HZ.A','LOG',2),
  _fact(5,'HZ0006','FILALI','NADIA','JM678901','HZ.B','LOG',1),
  _fact(6,'HZ0007','GHARBAOUI','AMINE','BH789012','HZ.B','LOG',1),
  _fact(7,'HZ0008','HAJJI','LEILA','DJ890123','HZ.B','LOG',0),
  _fact(8,'HZ0009','IDRISSI','OMAR','WA901234','HZ.B','LOG',0),
  _fact(9,'HZ0010','JNANE','SALMA','BJ012345','HZ.B','LOG',2),
  _fact(10,'HZ0011','KADIRI','RACHID','GK123456','HZ.C','INF',3),
  _fact(11,'HZ0012','LAMRANI','HIND','BL234567','HZ.C','INF',2),
  _fact(12,'HZ0013','MRANI','ZAKARIA','DK345678','HZ.C','INF',1),
  _fact(13,'HZ0014','NACIRI','ASMAA','JK456789','HZ.C','INF',2),
  _fact(14,'HZ0015','OUAZZANE','HAMID','TK567890','HZ.C','INF',0),
  _fact(15,'HZ0016','RBAHI','IMANE','WK678901','HZ.D','COM',2),
  _fact(16,'HZ0017','SQALLI','AYOUB','BK789012','HZ.D','COM',3),
  _fact(17,'HZ0018','TAJIRI','KHAOULA','DL890123','HZ.D','COM',1),
  _fact(18,'HZ0019','UABSI','IBRAHIM','HL901234','HZ.D','COM',0),
  _fact(19,'HZ0020','WAHIDI','KENZA','JL012345','HZ.D','COM',2),
  _fact(20,'HZ0021','XERIF','SAAD','GL123456','HZ.E','ECM',2),
  _fact(21,'HZ0022','YAAKOUBI','NOUR','WL234567','HZ.E','ECM',3),
  _fact(22,'HZ0023','ZIDANE','TAHA','BM345678','HZ.E','ECM',1),
  _fact(23,'HZ0024','ABBASSI','RIM','DM456789','HZ.E','ECM',0),
  _fact(24,'HZ0025','BERRADA','JAOUAD','HM567890','HZ.E','ECM',1),
];
