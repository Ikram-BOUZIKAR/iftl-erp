import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// 383 codes apprenants → {groupe, niveau, filiereCode, anneeAcademique} pour 2026-2027
const POPULATION_DATA = {
  "FQ0016": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
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
  "TS0266": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0267": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0269": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0270": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0271": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0272": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0273": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0274": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0275": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0276": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0277": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0278": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0279": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0280": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0281": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0282": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0283": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0284": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0285": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0286": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0287": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0288": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0289": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0290": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0291": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0292": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0293": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0294": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0295": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0296": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0297": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0298": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0299": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0300": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0301": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0302": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0303": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0304": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0305": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0306": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0307": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0308": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0309": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0310": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0311": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0312": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0313": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0314": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0315": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0316": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0317": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0318": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0319": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0320": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0321": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0322": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0323": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0324": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0325": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0326": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0327": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0328": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0329": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0330": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0331": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0332": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0333": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0334": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0335": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0336": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0337": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0338": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0339": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0340": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0341": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0342": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0343": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0344": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0345": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0346": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0347": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0348": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0349": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0350": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0351": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0352": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0353": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0355": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0356": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0357": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0358": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0359": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0360": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0361": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0362": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0363": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0364": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0365": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0366": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0367": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0368": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0369": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0370": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0371": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0372": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0373": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0374": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0375": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0376": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0377": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0378": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0379": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0380": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0381": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0382": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0383": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0384": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0385": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0386": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0387": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0388": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0389": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0390": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0391": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0392": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0393": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0394": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0395": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0396": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0397": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0398": { groupe: "TS.C", niveau: "2A TS", filiereCode: "OFLP", anneeAcademique: "2026-2027" },
  "TS0399": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0400": { groupe: "TS.A", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0401": { groupe: "TS.B", niveau: "2A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0402": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0403": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0404": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0405": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0406": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0407": { groupe: "TS.D", niveau: "2A TS", filiereCode: "AEL", anneeAcademique: "2026-2027" },
  "TS0408": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0409": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0410": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0411": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0412": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0413": { groupe: "TS.E", niveau: "2A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0414": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0415": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0416": { groupe: "TS.F", niveau: "2A TS", filiereCode: "ADEE", anneeAcademique: "2026-2027" },
  "TS0417": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0418": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0419": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0420": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0421": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0422": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0423": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0424": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0425": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0426": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0427": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0428": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0429": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0430": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0431": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0432": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0433": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0434": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0435": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0436": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0437": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0438": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0439": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0440": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0441": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0442": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0443": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0444": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0445": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0446": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0447": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0448": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0449": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0450": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0451": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0452": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0453": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0454": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0455": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0456": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0457": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0458": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0459": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0460": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0461": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0462": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0463": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0464": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0465": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0466": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0467": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0468": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0469": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0470": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0471": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0472": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0473": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0474": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0475": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0476": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0477": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0478": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0479": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0480": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0481": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0482": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0483": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0484": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0485": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0486": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0487": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0488": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0489": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0490": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0491": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0492": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0493": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0494": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0495": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0496": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0497": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0498": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0499": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0500": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0501": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0502": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0503": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0504": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0505": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0506": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0507": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0508": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0509": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0510": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0511": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0512": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0513": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0514": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0515": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0516": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0517": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0518": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0519": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0520": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0521": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0522": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0523": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0524": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0525": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0526": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0527": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0528": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0529": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0530": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0531": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0532": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0533": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0534": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0535": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0536": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0537": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0538": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0539": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0540": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0541": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0542": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0543": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0544": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0545": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0546": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0547": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0548": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0549": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0550": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0551": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0552": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0553": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0554": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0555": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0556": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0557": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0558": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0559": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0560": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0561": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0562": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0563": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0564": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0565": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0566": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0567": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0568": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0569": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0570": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0571": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0572": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0573": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0574": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0575": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0576": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0577": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0578": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0579": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0580": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0581": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0582": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0583": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0584": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0585": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0586": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0587": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0588": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0589": { groupe: "TS.A", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0590": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0591": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0592": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0593": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0594": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0595": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0596": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0597": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0598": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0599": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0600": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0601": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0602": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0603": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0604": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0605": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0606": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0607": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0608": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0609": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0610": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0611": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0612": { groupe: "TS.B", niveau: "1A TS", filiereCode: "TMLI", anneeAcademique: "2026-2027" },
  "TS0613": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0614": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0615": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0616": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0617": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0618": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0619": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0620": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0621": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0622": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0623": { groupe: "TS.G", niveau: "1A TS", filiereCode: "ECMD", anneeAcademique: "2026-2027" },
  "TS0624": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0625": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0627": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0628": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0629": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0630": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0631": { groupe: "TS.F", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0632": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0633": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0635": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0636": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0637": { groupe: "TS.E", niveau: "1A TS", filiereCode: "GOLE", anneeAcademique: "2026-2027" },
  "TS0638": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS0639": { groupe: "TS.D", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },
  "TS0640": { groupe: "TS.H", niveau: "1A TS", filiereCode: "DMVT", anneeAcademique: "2026-2027" },
  "TS626": { groupe: "TS.C", niveau: "1A TS", filiereCode: "LIPF", anneeAcademique: "2026-2027" },};

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

  const groupeNameToId = useMemo(() => {
    const map = {};
    groupes.forEach(g => {
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
                  ⚠ Groupes non trouvés en base : {preview.notFoundGroupe.join(', ')} — ces apprenants recevront niveau/filière mais pas groupeId.
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
