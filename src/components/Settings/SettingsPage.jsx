import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useToast } from '../UI/Toast';
import { useConfirm } from '../UI/ConfirmDialog';
import ImportDataPage from './ImportDataPage';

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
          placeholder="Ex: IFTL – Institut de Formation en Technologies Linguistiques"
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

const ROLES = ['admin', 'intervenant', 'apprenant'];

function UtilisateursTab() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const list = [];
        snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
        setUsers(list);
      } catch (err) {
        toast.error('Impossible de charger les utilisateurs : ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const roleBadge = (role) => {
    const map = {
      admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      intervenant: 'bg-violet-100 text-violet-700 border-violet-200',
      apprenant: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };
    return map[role] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  return (
    <SectionCard title="Gestion des utilisateurs" description="Attribuez des rôles aux utilisateurs enregistrés dans le système.">
      {loading ? (
        <div className="text-center py-8">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm mt-2">Chargement…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">Aucun utilisateur trouvé dans la base de données.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {users.map(u => (
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
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${roleBadge(u.role)}`}>
                  {u.role || 'inconnu'}
                </span>
                <select
                  value={u.role || ''}
                  onChange={e => handleRoleChange(u.id, e.target.value)}
                  disabled={updatingId === u.id}
                  className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 bg-white"
                >
                  <option value="">— Choisir —</option>
                  {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
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
      a.download = `iftl-erp-export-${new Date().toISOString().split('T')[0]}.json`;
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

// ─── Main SettingsPage ────────────────────────────────────────────────────────

const TABS = [
  { id: 'etablissement', label: 'Établissement', Icon: BuildingIcon },
  { id: 'profil', label: 'Mon profil', Icon: UserIcon },
  { id: 'utilisateurs', label: 'Utilisateurs', Icon: UsersIcon },
  { id: 'donnees', label: 'Données', Icon: DatabaseIcon },
  { id: 'import', label: 'Import données', Icon: UploadIcon },
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
