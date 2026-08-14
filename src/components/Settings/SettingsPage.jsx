import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import ImportDataPage from './ImportDataPage';
import { setEmailJSConfig, getEmailJSConfig } from '../../services/emailService';

// ─── Icons ────────────────────────────────────────────────────────────────────

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

// ─── Sub-sections ─────────────────────────────────────────────────────────────

function SectionCard({ title, description, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start py-4 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function Input({ ...props }) {
  return (
    <input
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:bg-slate-50 disabled:text-slate-400"
      {...props}
    />
  );
}

// ─── Établissement tab ────────────────────────────────────────────────────────

function EtablissementTab({ settings, setSettings, onSave, saving }) {
  return (
    <SectionCard title="Informations de l'établissement" description="Ces informations apparaissent sur les documents générés (PDFs, rapports).">
      <FieldRow label="Nom de l'établissement" hint="Affiché sur les en-têtes des documents">
        <Input
          value={settings.nomEcole || ''}
          onChange={e => setSettings(s => ({ ...s, nomEcole: e.target.value }))}
          placeholder="Ex: Mon Institut de Formation"
        />
      </FieldRow>
      <FieldRow label="Adresse" hint="Adresse postale complète">
        <Input
          value={settings.adresse || ''}
          onChange={e => setSettings(s => ({ ...s, adresse: e.target.value }))}
          placeholder="123 Rue de l'École, 75000 Paris"
        />
      </FieldRow>
      <FieldRow label="Téléphone">
        <Input
          value={settings.telephone || ''}
          onChange={e => setSettings(s => ({ ...s, telephone: e.target.value }))}
          placeholder="+212 5XX XXX XXX"
          type="tel"
        />
      </FieldRow>
      <FieldRow label="Email de contact">
        <Input
          value={settings.emailContact || ''}
          onChange={e => setSettings(s => ({ ...s, emailContact: e.target.value }))}
          placeholder="contact@etablissement.ma"
          type="email"
        />
      </FieldRow>
      <FieldRow label="URL du logo" hint="Lien vers le logo à afficher sur les documents">
        <Input
          value={settings.logoURL || ''}
          onChange={e => setSettings(s => ({ ...s, logoURL: e.target.value }))}
          placeholder="https://..."
          type="url"
        />
      </FieldRow>
      <FieldRow label="Année académique active" hint="Année scolaire en cours (ex: 2025-2026)">
        <Input
          value={settings.anneeAcademique || ''}
          onChange={e => setSettings(s => ({ ...s, anneeAcademique: e.target.value }))}
          placeholder="2025-2026"
        />
      </FieldRow>
      <div className="pt-4 flex justify-end">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
      </div>
    </SectionCard>
  );
}

// ─── Profil tab ───────────────────────────────────────────────────────────────

function ProfilTab({ auth }) {
  const toast = useToast();
  const { user, userProfile } = auth;
  const [form, setForm] = useState({
    prenom: userProfile?.prenom || '',
    nom: userProfile?.nom || '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!form.prenom.trim()) {
      toast.error('Le prénom est requis');
      return;
    }
    setSaving(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        updatedAt: new Date(),
      });
      toast.success('Profil mis à jour avec succès');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Informations personnelles" description="Votre nom et prénom affichés dans l'interface.">
        <FieldRow label="Prénom">
          <Input
            value={form.prenom}
            onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
            placeholder="Prénom"
          />
        </FieldRow>
        <FieldRow label="Nom">
          <Input
            value={form.nom}
            onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="Nom de famille"
          />
        </FieldRow>
        <FieldRow label="Adresse email" hint="Non modifiable — identifiant de connexion">
          <Input value={user?.email || ''} disabled />
        </FieldRow>
        <FieldRow label="Rôle" hint="Attribué par un administrateur">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium border border-indigo-200 capitalize">
              {userProfile?.role || 'Utilisateur'}
            </span>
          </div>
        </FieldRow>
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Utilisateurs tab ─────────────────────────────────────────────────────────

const ROLES = [
  { value: 'admin',       label: 'Administrateur' },
  { value: 'direction',   label: 'Direction'       },
  { value: 'scolarite',   label: 'Scolarité'       },
  { value: 'intervenant', label: 'Intervenant'     },
  { value: 'apprenant',   label: 'Apprenant'       },
  { value: 'parent',      label: 'Parent / Tuteur' },
];

const ROLE_BADGE = {
  admin:       'bg-indigo-100 text-indigo-700 border-indigo-200',
  direction:   'bg-[#005989]/10 text-[#005989] border-[#005989]/20',
  scolarite:   'bg-[#c8d45d]/30 text-[#5a6a00] border-[#c8d45d]/50',
  intervenant: 'bg-violet-100 text-violet-700 border-violet-200',
  apprenant:   'bg-emerald-100 text-emerald-700 border-emerald-200',
  parent:      'bg-orange-100 text-orange-700 border-orange-200',
};

const ROLE_LABEL = Object.fromEntries(ROLES.map(r => [r.value, r.label]));

function UtilisateursTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [tab, setTab] = useState('actifs');

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      setUsers(list);
    } catch (err) {
      toast.error('Impossible de charger les utilisateurs : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole, updatedAt: new Date() });
      setUsers(us => us.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Rôle mis à jour');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleValidate = async (userId, approve) => {
    if (!approve) {
      const ok = await confirm({
        title: 'Rejeter ce compte ?',
        message: 'Le compte sera supprimé définitivement. Cette action est irréversible.',
        danger: true, confirmLabel: 'Rejeter', cancelLabel: 'Annuler',
      });
      if (!ok) return;
    }
    setUpdatingId(userId);
    try {
      if (approve) {
        await updateDoc(doc(db, 'users', userId), {
          statut: 'actif',
          validatedAt: new Date().toISOString(),
          updatedAt: new Date(),
        });
        setUsers(us => us.map(u => u.id === userId ? { ...u, statut: 'actif' } : u));
        toast.success('Compte activé avec succès');
      } else {
        await import('firebase/firestore').then(({ deleteDoc }) =>
          deleteDoc(doc(db, 'users', userId))
        );
        setUsers(us => us.filter(u => u.id !== userId));
        toast.success('Compte rejeté et supprimé');
      }
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const pending = users.filter(u => u.statut === 'pending');
  const actifs = users.filter(u => u.statut !== 'pending');

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('actifs')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'actifs' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Actifs ({actifs.length})
        </button>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === 'pending' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
        >
          En attente
          {pending.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
              {pending.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'pending' && (
        <SectionCard
          title="Comptes en attente de validation"
          description="Ces utilisateurs ont créé un compte et attendent votre approbation."
        >
          {loading ? (
            <div className="text-center py-8">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-slate-500 text-sm">Aucun compte en attente</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pending.map(u => (
                <div key={u.id} className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <span className="text-amber-700 text-sm font-bold">
                          {(u.prenom?.[0] || '?').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {u.prenom} {u.nom}
                        </p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                            {ROLE_LABEL[u.role] || u.role}
                          </span>
                          {u.codeApprenant && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              Code: {u.codeApprenant}
                            </span>
                          )}
                          {u.specialite && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {u.specialite}
                            </span>
                          )}
                          {u.telephone && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {u.telephone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleValidate(u.id, true)}
                        disabled={updatingId === u.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: '#16a34a' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Valider
                      </button>
                      <button
                        onClick={() => handleValidate(u.id, false)}
                        disabled={updatingId === u.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 border border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === 'actifs' && (
        <SectionCard title="Utilisateurs actifs" description="Attribuez des rôles aux utilisateurs enregistrés.">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : actifs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Aucun utilisateur actif.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {actifs.map(u => (
                <div key={u.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <span className="text-indigo-700 text-sm font-bold">
                        {(u.prenom?.[0] || u.email?.[0] || '?').toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {u.prenom && u.nom ? `${u.prenom} ${u.nom}` : u.email}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ROLE_BADGE[u.role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {ROLE_LABEL[u.role] || u.role || 'Inconnu'}
                    </span>
                    <select
                      value={u.role || ''}
                      onChange={e => handleRoleChange(u.id, e.target.value)}
                      disabled={updatingId === u.id}
                      className="text-sm border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#005989]/40 disabled:opacity-50 bg-white"
                    >
                      <option value="">— Choisir —</option>
                      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Données tab ──────────────────────────────────────────────────────────────

function DonneesTab() {
  const toast = useToast();
  const confirm = useConfirm();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const collections = ['students', 'groupes', 'intervenants', 'sessions', 'candidatures'];
      const data = {};
      for (const col of collections) {
        const snapshot = await getDocs(collection(db, col));
        data[col] = [];
        snapshot.forEach(d => data[col].push({ id: d.id, ...d.data() }));
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export réussi ! Le fichier a été téléchargé.');
    } catch (err) {
      toast.error('Erreur lors de l\'export : ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleResetYear = async () => {
    const ok = await confirm({
      title: 'Réinitialiser l\'année académique ?',
      message: 'Cette action supprimera toutes les séances et les données de présence de l\'année en cours. Les apprenants et groupes seront conservés. Cette action est irréversible.',
      danger: true,
      confirmLabel: 'Oui, réinitialiser',
      cancelLabel: 'Annuler',
    });
    if (!ok) return;
    toast.info('Fonctionnalité disponible dans une prochaine version.');
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Export des données" description="Téléchargez une copie de toutes vos données en format JSON.">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-600">Exporte toutes les collections : apprenants, groupes, intervenants, séances, candidatures.</p>
            <p className="text-xs text-slate-400 mt-1">Format : JSON · Inclut tous les champs et métadonnées</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 bg-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Export…' : 'Exporter JSON'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Zone de danger" description="Actions irréversibles — utilisez avec précaution.">
        <div className="flex items-start justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div>
            <p className="text-sm font-medium text-red-800">Réinitialiser l'année académique</p>
            <p className="text-xs text-red-600 mt-1">Supprime les séances et présences. Conserve apprenants et groupes.</p>
          </div>
          <button
            onClick={handleResetYear}
            className="shrink-0 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Notifications tab (EmailJS) ──────────────────────────────────────────────

function BellIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function NotificationsTab() {
  const toast = useToast();
  const [cfg, setCfg] = useState(() => getEmailJSConfig() || {
    publicKey: '',
    serviceId: '',
    planningTemplateId: '',
    absenceTemplateId: '',
    expediteurNom: 'IFTL Formation Professionnelle',
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'emailjs')).then(snap => {
      if (snap.exists()) setCfg(c => ({ ...c, ...snap.data() }));
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'emailjs'), { ...cfg, updatedAt: new Date() });
      setEmailJSConfig(cfg);
      toast.success('Configuration EmailJS enregistrée');
    } catch (err) {
      toast.error('Erreur : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setCfg(c => ({ ...c, [k]: v }));

  const isConfigured = !!(cfg.publicKey && cfg.serviceId && cfg.planningTemplateId);

  return (
    <div className="space-y-5">
      {/* Status badge */}
      <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${isConfigured ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
        <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {isConfigured ? 'EmailJS configuré — envoi d\'emails activé' : 'EmailJS non configuré — créez un compte sur emailjs.com'}
      </div>

      <SectionCard
        title="Configuration EmailJS"
        description="Créez un compte gratuit sur emailjs.com (200 emails/mois), reliez un service Gmail/Outlook, et créez les templates ci-dessous."
      >
        <FieldRow label="Public Key" hint="Depuis emailjs.com → Account → API Keys">
          <Input value={cfg.publicKey} onChange={e => set('publicKey', e.target.value)} placeholder="user_XXXXXXXXXXXXXXXXXXXX" />
        </FieldRow>
        <FieldRow label="Service ID" hint="Email Services → Service ID">
          <Input value={cfg.serviceId} onChange={e => set('serviceId', e.target.value)} placeholder="service_xxxxxxx" />
        </FieldRow>
        <FieldRow label="Template Planning" hint="ID du template pour le planning hebdomadaire des intervenants">
          <Input value={cfg.planningTemplateId} onChange={e => set('planningTemplateId', e.target.value)} placeholder="template_planning" />
        </FieldRow>
        <FieldRow label="Template Absences" hint="ID du template pour notifier les apprenants de leur absence">
          <Input value={cfg.absenceTemplateId} onChange={e => set('absenceTemplateId', e.target.value)} placeholder="template_absence" />
        </FieldRow>
        <FieldRow label="Expéditeur (nom)" hint="Nom affiché dans les emails envoyés">
          <Input value={cfg.expediteurNom} onChange={e => set('expediteurNom', e.target.value)} placeholder="IFTL Formation Professionnelle" />
        </FieldRow>
        <div className="pt-4 flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60">
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </SectionCard>

      {/* Template guide */}
      <SectionCard title="Guide des templates EmailJS" description="Copiez ces templates dans votre compte EmailJS.">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Template Planning (intervenants)</p>
            <div className="bg-slate-50 rounded-lg p-4 text-xs font-mono text-slate-700 space-y-1 border border-slate-200">
              <p className="text-slate-500">Sujet :</p>
              <p>Votre planning — semaine du {'{{semaine_debut}}'} au {'{{semaine_fin}}'}</p>
              <p className="text-slate-500 mt-3">Corps (HTML activé) :</p>
              <p>Bonjour {'{{to_name}}'},</p>
              <p className="mt-1">Voici votre planning pour la semaine du <strong>{'{{semaine_debut}}'}</strong> au <strong>{'{{semaine_fin}}'}</strong> : {'{{nb_seances}}'} séance(s).</p>
              <p className="mt-1">{'{{planning_html}}'}</p>
              <p className="mt-2">Cordialement, {'{{expediteur_nom}}'}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Variables : to_email, to_name, semaine_debut, semaine_fin, nb_seances, planning_html, expediteur_nom</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Template Absences (apprenants)</p>
            <div className="bg-slate-50 rounded-lg p-4 text-xs font-mono text-slate-700 space-y-1 border border-slate-200">
              <p className="text-slate-500">Sujet :</p>
              <p>Absence enregistrée — {'{{module_nom}}'} — {'{{date_seance}}'}</p>
              <p className="text-slate-500 mt-3">Corps :</p>
              <p>Bonjour {'{{to_name}}'},</p>
              <p className="mt-1">Votre absence a été enregistrée :</p>
              <p>• Module : {'{{module_nom}}'}</p>
              <p>• Date : {'{{date_seance}}'}</p>
              <p>• Horaire : {'{{heure_debut}}'} – {'{{heure_fin}}'}</p>
              <p>• Groupe : {'{{groupe_nom}}'}</p>
              <p className="mt-1">{'{{message_custom}}'}</p>
              <p className="mt-2">Cordialement, {'{{expediteur_nom}}'}</p>
            </div>
            <p className="text-xs text-slate-400 mt-1">Variables : to_email, to_name, module_nom, date_seance, heure_debut, heure_fin, groupe_nom, message_custom, expediteur_nom</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ─── Main SettingsPage ────────────────────────────────────────────────────────

const TABS = [
  { id: 'etablissement', label: 'Établissement', Icon: BuildingIcon },
  { id: 'profil', label: 'Mon profil', Icon: UserIcon },
  { id: 'utilisateurs', label: 'Utilisateurs', Icon: UsersIcon },
  { id: 'donnees', label: 'Données', Icon: DatabaseIcon },
  { id: 'import', label: 'Import données', Icon: UploadIcon },
  { id: 'notifications', label: 'Notifications', Icon: BellIcon },
];

export default function SettingsPage({ auth }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('etablissement');
  const [settings, setSettings] = useState({
    nomEcole: '',
    adresse: '',
    telephone: '',
    emailContact: '',
    logoURL: '',
    anneeAcademique: '2025-2026',
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings
  useEffect(() => {
    const load = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          setSettings(s => ({ ...s, ...docSnap.data() }));
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    load();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), {
        ...settings,
        updatedAt: new Date(),
      });
      toast.success('Paramètres enregistrés avec succès');
    } catch (err) {
      toast.error('Erreur lors de l\'enregistrement : ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-1">Configuration de l'application et préférences</p>
      </div>

      <div className="flex gap-6">
        {/* Left sidebar tabs */}
        <nav className="w-52 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <tab.Icon />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {loadingSettings ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-slate-400 text-sm mt-3">Chargement des paramètres…</p>
            </div>
          ) : (
            <>
              {activeTab === 'etablissement' && (
                <EtablissementTab
                  settings={settings}
                  setSettings={setSettings}
                  onSave={handleSaveSettings}
                  saving={saving}
                />
              )}
              {activeTab === 'profil' && <ProfilTab auth={auth} />}
              {activeTab === 'utilisateurs' && <UtilisateursTab />}
              {activeTab === 'donnees' && <DonneesTab />}
              {activeTab === 'import' && <ImportDataPage />}
              {activeTab === 'notifications' && <NotificationsTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
