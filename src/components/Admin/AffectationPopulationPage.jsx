import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// 383 codes apprenants → {groupe, niveau, filiereCode, anneeAcademique} pour 2026-2027
// Groupes 1A TS : 1TS-A … 1TS-H | 2A TS : 2TS-A … 2TS-F (mêmes filières que 1A TS) | QUALIF : CRM
// 2A TS filières : TMLI×2, LIPF×1, GOLE×1, ECMD×1, DMVT×1
const POPULATION_DATA = {
  "FQ0016": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "Q0060": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0061": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0062": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0063": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0064": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0065": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0066": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0067": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0068": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "Q0069": { groupe: "Conducteur Routier de Marchandises", niveau: "QUALIF", filiereCode: "CRM", anneeAcademique: "2026-2027" },
  "TS0266": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0267": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0269": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0270": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0271": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0272": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0273": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0274": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0275": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0276": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0277": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0278": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0279": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0280": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0281": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0282": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0283": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0284": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0285": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0286": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0287": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0288": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0289": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0290": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0291": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0292": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0293": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0294": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0295": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0296": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0297": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0298": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0299": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0300": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0301": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0302": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0303": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0304": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0305": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0306": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0307": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0308": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0309": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0310": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0311": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0312": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0313": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0314": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0315": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0316": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0317": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0318": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0319": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0320": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0321": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0322": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0323": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0324": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0325": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0326": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0327": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0328": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0329": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0330": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0331": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0332": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0333": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0334": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0335": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0336": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0337": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0338": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0339": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0340": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0341": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0342": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0343": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0344": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0345": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0346": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0347": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0348": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0349": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0350": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0351": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0352": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0353": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0355": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0356": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0357": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0358": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0359": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0360": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0361": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0362": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0363": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0364": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0365": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0366": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0367": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0368": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0369": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0370": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0371": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0372": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0373": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0374": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0375": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0376": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0377": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0378": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0379": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0380": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0381": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0382": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0383": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0384": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0385": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0386": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0387": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0388": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0389": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0390": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0391": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0392": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0393": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0394": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0395": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0396": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0397": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0398": { groupe: "2TS-C", niveau: "2A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0399": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0400": { groupe: "2TS-A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0401": { groupe: "2TS-B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0402": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0403": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0404": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0405": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0406": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0407": { groupe: "2TS-D", niveau: "2A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0408": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0409": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0410": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0411": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0412": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0413": { groupe: "2TS-E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0414": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0415": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0416": { groupe: "2TS-F", niveau: "2A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0417": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0418": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0419": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0420": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0421": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0422": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0423": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0424": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0425": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0426": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0427": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0428": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0429": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0430": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0431": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0432": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0433": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0434": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0435": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0436": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0437": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0438": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0439": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0440": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0441": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0442": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0443": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0444": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0445": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0446": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0447": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0448": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0449": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0450": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0451": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0452": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0453": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0454": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0455": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0456": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0457": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0458": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0459": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0460": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0461": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0462": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0463": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0464": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0465": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0466": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0467": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0468": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0469": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0470": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0471": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0472": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0473": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0474": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0475": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0476": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0477": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0478": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0479": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0480": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0481": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0482": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0483": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0484": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0485": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0486": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0487": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0488": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0489": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0490": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0491": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0492": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0493": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0494": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0495": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0496": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0497": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0498": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0499": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0500": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0501": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0502": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0503": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0504": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0505": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0506": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0507": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0508": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0509": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0510": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0511": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0512": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0513": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0514": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0515": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0516": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0517": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0518": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0519": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0520": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0521": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0522": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0523": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0524": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0525": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0526": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0527": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0528": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0529": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0530": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0531": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0532": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0533": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0534": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0535": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0536": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0537": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0538": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0539": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0540": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0541": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0542": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0543": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0544": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0545": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0546": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0547": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0548": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0549": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0550": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0551": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0552": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0553": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0554": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0555": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0556": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0557": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0558": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0559": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0560": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0561": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0562": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0563": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0564": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0565": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0566": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0567": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0568": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0569": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0570": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0571": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0572": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0573": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0574": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0575": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0576": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0577": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0578": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0579": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0580": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0581": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0582": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0583": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0584": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0585": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0586": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0587": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0588": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0589": { groupe: "1TS-A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0590": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0591": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0592": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0593": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0594": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0595": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0596": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0597": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0598": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0599": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0600": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0601": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0602": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0603": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0604": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0605": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0606": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0607": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0608": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0609": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0610": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0611": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0612": { groupe: "1TS-B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0613": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0614": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0615": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0616": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0617": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0618": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0619": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0620": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0621": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0622": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0623": { groupe: "1TS-G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0624": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0625": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0627": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0628": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0629": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0630": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0631": { groupe: "1TS-F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0632": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0633": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0635": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0636": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0637": { groupe: "1TS-E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0638": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0639": { groupe: "1TS-D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0640": { groupe: "1TS-H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS626": { groupe: "1TS-C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },};

function Spinner() {
  return <div className="w-5 h-5 border-2 border-[#005989] border-t-transparent rounded-full animate-spin" />;
}

export default function AffectationPopulationPage() {
  const toast = useToast();
  const confirm = useConfirm();

  const [groupes, setGroupes]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [applying, setApplying] = useState(false);
  const [result, setResult]     = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [gSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'groupes')),
          getDocs(collection(db, 'students')),
        ]);
        setGroupes(gSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        toast.error('Erreur chargement : ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Only match groups for annee 2026-2027 to avoid collision with previous year
  const groupeNameToId = useMemo(() => {
    const map = {};
    groupes
      .filter(g => !g.annee || g.annee === '2026-2027')
      .forEach(g => {
        const name = (g.nom || g.name || '').trim();
        if (name) map[name] = g.id;
      });
    return map;
  }, [groupes]);

  const codeToDocId = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const code = (s.codeApprenant || '').trim().toUpperCase();
      if (code) map[code] = s.id;
    });
    return map;
  }, [students]);

  const preview = useMemo(() => {
    if (loading) return null;
    const stats = {
      total: Object.keys(POPULATION_DATA).length,
      matched: 0,
      notFoundStudent: [],
      notFoundGroupe: [],
      byNiveau: {},
      byGroupe: {},
    };
    Object.entries(POPULATION_DATA).forEach(([code, data]) => {
      const upperCode = code.toUpperCase();
      const docId = codeToDocId[upperCode];
      if (!docId) { stats.notFoundStudent.push(code); return; }
      const groupeId = groupeNameToId[data.groupe];
      if (!groupeId && !stats.notFoundGroupe.includes(data.groupe))
        stats.notFoundGroupe.push(data.groupe);
      stats.matched++;
      stats.byNiveau[data.niveau] = (stats.byNiveau[data.niveau] || 0) + 1;
      stats.byGroupe[data.groupe] = (stats.byGroupe[data.groupe] || 0) + 1;
    });
    return stats;
  }, [loading, codeToDocId, groupeNameToId]);

  const handleApply = async () => {
    const ok = await confirm({
      title: 'Confirmer l\'affectation',
      message: `Affecter ${preview.matched} apprenants à leurs groupes et niveaux 2026-2027 ?\nCette opération mettra à jour groupeId, niveau, filiereCode et anneeAcademique.`,
      confirmText: 'Appliquer',
      confirmClass: 'bg-[#005989] hover:bg-[#004a73] text-white',
    });
    if (!ok) return;

    setApplying(true);
    try {
      const BATCH_SIZE = 499;
      let batch = writeBatch(db);
      let count = 0;
      let total = 0;
      let skippedStudent = 0;
      let skippedGroupe = 0;

      for (const [code, data] of Object.entries(POPULATION_DATA)) {
        const upperCode = code.toUpperCase();
        const docId = codeToDocId[upperCode];
        if (!docId) { skippedStudent++; continue; }
        const groupeId = groupeNameToId[data.groupe];
        const update = {
          niveau: data.niveau,
          filiereCode: data.filiereCode,
          anneeAcademique: data.anneeAcademique,
        };
        if (groupeId) update.groupeId = groupeId;
        else skippedGroupe++;

        batch.update(doc(db, 'students', docId), update);
        count++;
        total++;

        if (count === BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }
      if (count > 0) await batch.commit();

      setResult({ success: true, total, skippedStudent, skippedGroupe });
      toast.success(`${total} apprenants affectés avec succès.`);
    } catch (err) {
      setResult({ success: false, error: err.message });
      toast.error('Erreur lors de l\'affectation : ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Spinner />
      <span className="ml-3 text-slate-500">Chargement des données…</span>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Affectation Population 2026-2027</h1>
        <p className="text-slate-500 text-sm mt-1">
          Affecte les 383 apprenants (1A TS, 2A TS, QUALIF) à leurs groupes et niveaux en un clic.
          Les groupes doivent exister (1TS-A…1TS-H, 2TS-A…2TS-F) avant de lancer.
        </p>
      </div>

      {result && (
        <div className={`rounded-xl border p-5 ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.success ? (
            <>
              <p className="font-semibold text-green-800 text-lg">✓ Affectation terminée</p>
              <p className="text-green-700 mt-1"><strong>{result.total}</strong> apprenants mis à jour.</p>
              {result.skippedStudent > 0 && <p className="text-amber-700 text-sm mt-1">⚠ {result.skippedStudent} codes non trouvés dans la base.</p>}
              {result.skippedGroupe > 0 && <p className="text-amber-700 text-sm mt-1">⚠ {result.skippedGroupe} groupes non trouvés — niveau/filière mis à jour, groupeId non modifié.</p>}
            </>
          ) : (
            <p className="font-semibold text-red-800">✗ Erreur : {result.error}</p>
          )}
        </div>
      )}

      {preview && !result && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-[#005989] text-white px-5 py-3">
            <h2 className="font-semibold">Aperçu avant affectation</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-[#005989]">{preview.total}</p>
                <p className="text-slate-500 text-sm mt-1">Codes dans la liste</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-700">{preview.matched}</p>
                <p className="text-slate-500 text-sm mt-1">Apprenants trouvés</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${preview.notFoundStudent.length ? 'bg-amber-50' : 'bg-slate-50'}`}>
                <p className={`text-3xl font-bold ${preview.notFoundStudent.length ? 'text-amber-600' : 'text-slate-400'}`}>
                  {preview.notFoundStudent.length}
                </p>
                <p className="text-slate-500 text-sm mt-1">Codes non trouvés</p>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-slate-700 mb-2">Par niveau</h3>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(preview.byNiveau).map(([niv, n]) => (
                  <span key={niv} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm px-3 py-1.5 rounded-full">
                    <span className="font-semibold">{niv}</span>
                    <span className="bg-white text-slate-600 px-1.5 py-0.5 rounded-full text-xs">{n}</span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-slate-700 mb-2">Par groupe</h3>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(preview.byGroupe).sort((a, b) => a[0].localeCompare(b[0])).map(([grp, n]) => {
                  const groupeId = groupeNameToId[grp];
                  return (
                    <span key={grp} className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${groupeId ? 'bg-white border-slate-200 text-slate-600' : 'bg-amber-50 border-amber-300 text-amber-700'}`}>
                      {grp} <strong>{n}</strong>
                      {!groupeId && <span title="Groupe non trouvé en base">⚠</span>}
                    </span>
                  );
                })}
              </div>
              {preview.notFoundGroupe.length > 0 && (
                <p className="text-amber-600 text-xs mt-2">
                  ⚠ Groupes manquants : {preview.notFoundGroupe.join(', ')}
                  {' — '}<a href="/admin/creation-groupes-2026" className="underline font-medium">Créer les groupes d'abord →</a>
                </p>
              )}
            </div>

            {preview.notFoundStudent.length > 0 && (
              <div>
                <h3 className="font-medium text-amber-700 text-sm mb-1">Codes non trouvés ({preview.notFoundStudent.length})</h3>
                <p className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border max-h-24 overflow-y-auto">
                  {preview.notFoundStudent.join(', ')}
                </p>
              </div>
            )}
          </div>

          <div className="px-5 pb-5">
            <button
              onClick={handleApply}
              disabled={applying || preview.matched === 0}
              className="w-full flex items-center justify-center gap-2 bg-[#005989] hover:bg-[#004a73] text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50"
            >
              {applying ? <><Spinner /> Affectation en cours…</> : `Affecter ${preview.matched} apprenants`}
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 border border-slate-100">
        <strong>Base chargée :</strong> {groupes.length} groupes · {students.length} apprenants en base.
      </div>
    </div>
  );
}
