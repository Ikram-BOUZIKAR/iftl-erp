# 🔥 Firebase Emulator Setup - Development Local

## 🎯 Qu'est-ce que l'Émulateur Firebase?

L'émulateur Firebase vous permet de **développer et tester localement** sans avoir besoin des vraies clés API Firebase. Cela résout le problème `auth/api-key-not-valid` pour le développement.

---

## ✅ Installation Complétée

✓ Firebase Tools installé  
✓ Firebase Emulator Suite configurée  
✓ `.env.development` créé  
✓ firebase.json mis à jour  
✓ Scripts npm ajoutés  

---

## 🚀 Démarrage Rapide

### Option 1: Lancer UNIQUEMENT le Dev Server (Production Mode)

```bash
npm run dev
```

⚠️ **Nécessite**: Vraies clés Firebase dans `.env.local`

---

### Option 2: Lancer avec l'Émulateur (Recommandé pour Dev)

#### Étape 1: Démarrer l'Émulateur dans un Terminal
```bash
npm run dev:emulator
```

Cela va:
- ✅ Démarrer Firebase Auth Emulator (port 9099)
- ✅ Démarrer Firestore Emulator (port 8080)  
- ✅ Démarrer Storage Emulator (port 9199)
- ✅ Lancer Firebase Emulator UI (port 4000)

Voici ce que vous verrez:
```
✔ Firestore emulator started at http://localhost:8080
✔ Firebase Authentication emulator started at http://localhost:9099
✔ Cloud Storage emulator started at http://localhost:9199
✔ Emulator UI started at http://localhost:4000
```

#### Étape 2: Dans un AUTRE Terminal, démarrez le Dev Server
```bash
npm run dev
```

Cela va lancer Vite sur http://localhost:5173

#### Résultat Final
- 🔥 **Émulateur Firebase UI**: http://localhost:4000
- 💻 **App React**: http://localhost:5173 (ou 3000, 5174...)
- 📱 **Identifiants de Test**: test@iftl.ma / Test123456!

---

## 📊 État des Émulateurs

### Vérifier que tout fonctionne:

1. **Firebase Emulator UI**
   - Allez sur: http://localhost:4000
   - Vous verrez tous les émulateurs actifs
   - Collections Firestore créées
   - Utilisateurs de test

2. **Firestore Emulator**
   - État: Exécution sur port 8080
   - Collections: users, students, intervenants, etc.
   - Données: Sauvegardées dans `./emulator-data/`

3. **Auth Emulator**
   - État: Exécution sur port 9099
   - Utilisateur de test: test@iftl.ma / Test123456!
   - Sans vérification email requise

---

## 📝 Fichiers Créés/Modifiés

| Fichier | Rôle |
|---------|------|
| `.env.development` | Variables pour émulateur (dev local) |
| `firebase.json` | Config émulateurs + hosting |
| `package.json` | Scripts: `dev:emulator`, `dev:with-emulator` |
| `firebase-tools` | Installé en devDependencies |
| `concurrently` | Installé pour lancer 2 serveurs |

---

## 🔄 Workflow Recommandé

```
1. npm run dev:emulator
   ↓
2. Dans un autre terminal: npm run dev
   ↓
3. Allez sur http://localhost:5173
   ↓
4. Identifiants: test@iftl.ma / Test123456!
   ↓
5. L'app utilise maintenant l'émulateur local ✅
```

---

## 🔐 Différences: Émulateur vs Production

| Aspect | Émulateur Local | Production |
|--------|-----------------|-----------|
| **Authentification** | Test user créé | Vraies clés Firebase |
| **Base de données** | Données en mémoire | Cloud Firestore |
| **Persistence** | `./emulator-data/` | Firebase Cloud |
| **Sécurité** | Lax (pour dev) | Règles Firestore |
| **Coût** | GRATUIT ✅ | Payant (après quota) |

---

## 🛠️ Commandes Utiles

```bash
# Démarrer uniquement le dev Vite (prod mode)
npm run dev

# Démarrer uniquement l'émulateur
npm run dev:emulator

# Démarrer les DEUX en parallèle (recommandé)
npm run dev:with-emulator

# Builder pour production
npm run build

# Déployer en production
npm run firebase:deploy

# Nettoyer données d'émulateur
rm -rf emulator-data/

# Vérifier règles Firestore
firebase rules:test firestore.rules
```

---

## 🧪 Test de Login

1. **Aller sur** http://localhost:5173
2. **Entrer**:
   - Email: `test@iftl.ma`
   - Mot de passe: `Test123456!`
3. **Cliquer** "Se connecter"
4. **Résultat**: ✅ Redirection vers Dashboard

---

## 📡 Monitorage en Temps Réel

### Voir les Logs d'Émulateur

L'émulateur affiche les logs en temps réel:
```
[firestore] document created: users/xyz123
[auth] user login: test@iftl.ma
[storage] file uploaded: images/profile.jpg
```

### Voir la Base de Données

Allez sur **Firebase Emulator UI** → http://localhost:4000

---

## 🔄 Données Persistantes

Les données d'émulateur sont sauvegardées dans:
```
emulator-data/
├── firestore_export/
├── auth_export/
└── storage_export/
```

⚠️ **Attention**: Elles sont **supprimées à la fermeture** de l'émulateur (sauf avec `--export-on-exit`)

---

## ❌ Troubleshooting

### "Port 8080 already in use"
```bash
# Tuer le processus occupant le port
# Sur Windows:
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

### "Firestore emulator not connecting"
1. Vérifiez que l'émulateur est démarré (`npm run dev:emulator`)
2. Vérifiez `.env.development` (les ports doivent correspondre)
3. Vérifiez que Vite utilise la bonne config d'env

### "Test user not found"
```bash
# Recréer les données de test
rm -rf emulator-data/
npm run dev:emulator
```

---

## 🚀 Prochaines Étapes

### Pour la Production:
1. Vrai Firebase project: erp-pedago-iftl ✅
2. Vraies clés API dans `.env.local` (à demander à admin)
3. `npm run build` + `npm run firebase:deploy`

### Pour le Développement:
1. ✅ Utiliser `npm run dev:emulator`
2. ✅ Tester toutes les features localement
3. ✅ Pas de coûts Firebase! ✅

---

## 📞 Rappel Émulateur  

**L'émulateur Firebase = Environnement de développement local gratuit 100% identique à la production.**

Utilisez-le pour:
- ✅ Tester l'authentification
- ✅ Développer des fonctionnalités
- ✅ Déboguer sans risque
- ✅ Économiser les crédits Firebase
