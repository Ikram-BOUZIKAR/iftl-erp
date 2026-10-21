import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';

// Définition des 15 groupes à créer pour 2026-2027
const GROUPES_2026 = [
  // 1A TS — 8 groupes
  { nom: '1TS-A', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale', typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-B', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale', typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-C', filiereCode: 'LIPF', filiere: 'Logistique Industrielle et Pilotage des Flux',      typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-D', filiereCode: 'LIPF', filiere: 'Logistique Industrielle et Pilotage des Flux',      typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-E', filiereCode: 'GOLE', filiere: "Gestion des Opérations Logistiques et d'Entrepôt", typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-F', filiereCode: 'GOLE', filiere: "Gestion des Opérations Logistiques et d'Entrepôt", typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-G', filiereCode: 'ECMD', filiere: 'E-Commerce, Marketing Digital et Distribution',    typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '1TS-H', filiereCode: 'DMVT', filiere: 'Diagnostic et Maintenance des Véhicules de Transport', typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '1ère année', annee: '2026-2027', statut: 'actif', actif: true },
  // 2A TS — 6 groupes
  { nom: '2TS-A', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale',        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-B', filiereCode: 'TMLI', filiere: 'Transport Multimodal et Logistique Internationale',        typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-C', filiereCode: 'OFLP', filiere: "Opérateur(trice) en Fret et Logistique de la Plateforme", typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-D', filiereCode: 'AEL',  filiere: "Agent(e) d'Exploitation Logistique",                      typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-E', filiereCode: 'ECMD', filiere: 'E-Commerce, Marketing Digital et Distribution',            typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  { nom: '2TS-F', filiereCode: 'ADEE', filiere: 'Agent(e) Diagnostic Électronique Automobile',              typeFormation: 'Technicien Spécialisé', niveau: 'Technicien Spécialisé', anneePromotion: '2ème année', annee: '2026-2027', statut: 'actif', actif: true },
  // QUALIF
  { nom: 'Conducteur Routier de Marchandises', filiereCode: 'CRM', filiere: 'Conducteur(trice) Routier(ère) de Marchandises', typeFormation: 'Qualification', niveau: 'Qualification', anneePromotion: '', annee: '2026-2027', statut: 'actif', actif: true },
];

const BADGE_COLORS = {
  '1ère année': 'bg-blue-100 text-blue-700 border-blue-200',
  '2ème année': 'bg-violet-100 text-violet-700 border-violet-200',
  'Qualification': 'bg-amber-100 text-amber-700 border-amber-200',
};

function Spinner() {
  return <div className="w-5 h-5 border-2 border-[#005989] border-t-transparent rounded-full animate-spin" />;
}

export default function CreationGroupes2026Page() {
  const toast  = useToast();
  const confirm = useConfirm();

  const [existingGroupes, setExistingGroupes] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [done, setDone]        = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'groupes'));
        setExistingGroupes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        toast.error('Erreur chargement : ' + err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const existingNames = useMemo(
    () => new Set(existingGroupes.filter(g => g.annee === '2026-2027').map(g => g.nom)),
    [existingGroupes]
  );

  const toCreate = useMemo(
    () => GROUPES_2026.filter(g => !existingNames.has(g.nom)),
    [existingNames]
  );

  const alreadyExist = useMemo(
    () => GROUPES_2026.filter(g => existingNames.has(g.nom)),
    [existingNames]
  );

  const handleCreate = async () => {
    if (toCreate.length === 0) return;
    const ok = await confirm({
      title: 'Créer les groupes',
      message: `Créer ${toCreate.length} groupe(s) manquant(s) pour 2026-2027 ?`,
      confirmText: 'Créer',
      confirmClass: 'bg-[#005989] hover:bg-[#004a73] text-white',
    });
    if (!ok) return;

    setCreating(true);
    let created = 0;
    const errors = [];
    try {
      for (const g of toCreate) {
        try {
          await addDoc(collection(db, 'groupes'), g);
          created++;
        } catch (err) {
          errors.push(`${g.nom}: ${err.message}`);
        }
      }
      setDone({ created, errors });
      if (errors.length === 0) toast.success(`${created} groupe(s) créé(s).`);
      else toast.error(`${created} créé(s), ${errors.length} erreur(s).`);
      // Refresh list
      const snap = await getDocs(collection(db, 'groupes'));
      setExistingGroupes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Spinner />
      <span className="ml-3 text-slate-500">Chargement…</span>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Création des groupes 2026-2027</h1>
        <p className="text-slate-500 text-sm mt-1">
          Crée les 15 groupes TS nécessaires à l'affectation de la population 2026-2027.
        </p>
      </div>

      {done && (
        <div className={`rounded-xl border p-4 ${done.errors.length === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className="font-semibold text-green-800">✓ {done.created} groupe(s) créé(s).</p>
          {done.errors.length > 0 && done.errors.map(e => <p key={e} className="text-red-700 text-sm mt-1">{e}</p>)}
          {done.errors.length === 0 && (
            <p className="text-green-700 text-sm mt-1">
              Vous pouvez maintenant aller sur{' '}
              <a href="/admin/affectation-population" className="underline font-medium">Affectation Population</a>
              {' '}pour affecter les 383 apprenants.
            </p>
          )}
        </div>
      )}

      {/* À créer */}
      {toCreate.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-amber-500 text-white px-5 py-3 flex items-center justify-between">
            <h2 className="font-semibold">Groupes manquants ({toCreate.length})</h2>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-white text-amber-700 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-amber-50 disabled:opacity-60 transition"
            >
              {creating ? <><Spinner /> Création…</> : `Créer ${toCreate.length} groupe(s)`}
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {toCreate.map(g => (
              <div key={g.nom} className="flex items-center gap-3 px-5 py-3">
                <span className="font-mono font-bold text-slate-800 w-36 shrink-0">{g.nom}</span>
                <span className="text-sm text-slate-500 flex-1 truncate">{g.filiere}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_COLORS[g.anneePromotion] || BADGE_COLORS['Qualification']}`}>
                  {g.anneePromotion || g.typeFormation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Déjà existants */}
      {alreadyExist.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-green-600 text-white px-5 py-3">
            <h2 className="font-semibold">Groupes déjà créés ({alreadyExist.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {alreadyExist.map(g => (
              <div key={g.nom} className="flex items-center gap-3 px-5 py-3">
                <span className="text-green-500 shrink-0">✓</span>
                <span className="font-mono font-bold text-slate-800 w-36 shrink-0">{g.nom}</span>
                <span className="text-sm text-slate-500 flex-1 truncate">{g.filiere}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${BADGE_COLORS[g.anneePromotion] || BADGE_COLORS['Qualification']}`}>
                  {g.anneePromotion || g.typeFormation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {toCreate.length === 0 && alreadyExist.length === GROUPES_2026.length && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-green-700 font-semibold text-lg">✓ Tous les groupes 2026-2027 sont créés</p>
          <p className="text-green-600 text-sm mt-1">
            Allez sur{' '}
            <a href="/admin/affectation-population" className="underline font-medium">Affectation Population</a>
            {' '}pour affecter les 383 apprenants.
          </p>
        </div>
      )}

      <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3 border border-slate-100">
        <strong>Base chargée :</strong> {existingGroupes.length} groupes au total.
      </div>
    </div>
  );
}
