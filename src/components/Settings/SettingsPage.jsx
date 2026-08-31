import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

// ─── Create User Modal ────────────────────────────────────────────────────────

function ModalCreateUser({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', role: 'scolarite', password: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password || form.password.length < 6) {
      toast.error('Email et mot de passe (min 6 car.) requis');
      return;
    }
    setSaving(true);
    try {
      // Create Auth user via REST API (no sign-out of current admin)
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const authRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email.trim(), password: form.password, returnSecureToken: false }),
        }
      );
      const authData = await authRes.json();
      if (authData.error) throw new Error(authData.error.message);
      const uid = authData.localId;

      // Create Firestore document
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: form.email.trim().toLowerCase(),
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        role: form.role,
        statut: 'actif',
        createdAt: new Date().toISOString(),
        createdBy: 'admin',
      });
      toast.success(`Compte créé : ${form.email}`);
      onCreated();
      onClose();
    } catch (err) {
      const msg = err.message.replace('EMAIL_EXISTS', 'Cet email est déjà utilisé')
                             .replace('WEAK_PASSWORD', 'Mot de passe trop faible (min 6 caractères)');
      toast.error('Erreur : ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-800">Créer un compte utilisateur</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Prénom</label>
              <input value={form.prenom} onChange={e => set('prenom', e.target.value)} className={inp} placeholder="Prénom" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nom</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)} className={inp} placeholder="Nom" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inp} placeholder="prenom.nom@iftl.ma" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mot de passe initial *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} className={inp} placeholder="Minimum 6 caractères" required minLength={6} />
            <p className="text-xs text-slate-400 mt-1">L'utilisateur pourra le modifier à sa première connexion.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Rôle *</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className={`${inp} bg-white`}>
              <option value="scolarite">Scolarité</option>
              <option value="direction">Direction</option>
              <option value="intervenant">Intervenant</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-60">
              {saving ? 'Création…' : 'Créer le compte'}
            </button>
          </div>
        </form>
      </div>
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

function UtilisateursTab({ userRole }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [tab, setTab] = useState('actifs');
  const [showCreate, setShowCreate] = useState(false);
  const isAdmin = ['admin', 'direction'].includes(userRole);

  const loadUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list = [];
      snapshot.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? (typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0);
        const tb = b.createdAt?.toMillis?.() ?? (typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0);
        return ta - tb;
      });
      setUsers(list);
    } catch (err) {
      toast.error('Impossible de charger les utilisateurs : ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      {showCreate && (
        <ModalCreateUser onClose={() => setShowCreate(false)} onCreated={loadUsers} />
      )}
      {/* Header with tabs + create button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
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
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Créer un compte
          </button>
        )}
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
                          {(u.studentCode || u.codeApprenant) && (
                            <Link
                              to={`/apprenants/${u.studentCode || u.codeApprenant}`}
                              className="text-xs bg-[#005989]/10 text-[#005989] px-2 py-0.5 rounded-full hover:bg-[#005989]/20 transition-colors font-medium"
                            >
                              Code: {u.studentCode || u.codeApprenant}
                            </Link>
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

// ─── Main SettingsPage ────────────────────────────────────────────────────────

const TABS = [
  { id: 'etablissement', label: 'Établissement', Icon: BuildingIcon },
  { id: 'profil', label: 'Mon profil', Icon: UserIcon },
  { id: 'utilisateurs', label: 'Utilisateurs', Icon: UsersIcon, adminOnly: true },
  { id: 'donnees', label: 'Données', Icon: DatabaseIcon },
  { id: 'import', label: 'Import données', Icon: UploadIcon },
];

export default function SettingsPage({ auth }) {
  const toast = useToast();
  const userRole = auth?.userProfile?.role || '';
  const isAdmin = ['admin', 'direction'].includes(userRole);
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
            {TABS.filter(t => !t.adminOnly || isAdmin).map(tab => {
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
              {activeTab === 'utilisateurs' && <UtilisateursTab userRole={userRole} />}
              {activeTab === 'donnees' && <DonneesTab />}
              {activeTab === 'import' && <ImportDataPage />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
