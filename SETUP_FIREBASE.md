# 🔥 Configuration Firebase - IFTL ERP Pédagogique

## ⚠️ Problème Actuel
L'application affiche une erreur `auth/api-key-not-valid` parce que les variables d'environnement Firebase ne sont pas configurées.

## ✅ Solution

### Étape 1: Récupérer les clés Firebase
1. Allez sur: https://console.firebase.google.com/project/erp-pedago-iftl/settings/general
2. Dans la section "Vos applications", cherchez la configuration Firebase
3. Cliquez sur l'app web (ou créez-en une si elle n'existe pas)
4. Copiez la configuration JSON

### Étape 2: Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet (au même niveau que `package.json`):

```bash
# Exemple de contenu
VITE_FIREBASE_API_KEY=AIzaSyDxxx...
VITE_FIREBASE_AUTH_DOMAIN=erp-pedago-iftl.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=erp-pedago-iftl
VITE_FIREBASE_STORAGE_BUCKET=erp-pedago-iftl.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789...
VITE_FIREBASE_APP_ID=1:123456789:web:abcd1234...
```

**⚠️ Important**: 
- Ne JAMAIS commit ce fichier à Git
- Le fichier `.gitignore` contient déjà `.env.local`
- Chaque développeur a ses propres clés Firebase

### Étape 3: Redémarrer l'application

```bash
# Arrêtez le server (Ctrl+C) s'il est en cours d'exécution
# Puis:
npm run dev
```

### Étape 4: Tester l'application

1. Allez sur: http://localhost:3000
2. Vous devriez voir le formulaire de connexion
3. Connectez-vous avec:
   - **Email**: `test@iftl.ma`
   - **Mot de passe**: `Test123456!`

## 🏗️ Architecture du Projet

```
iftl-erp/
├── src/
│   ├── components/
│   │   ├── Auth/           # Pages d'authentification
│   │   ├── Dashboard/      # Tableau de bord
│   │   ├── Setup/          # Configuration initiale
│   │   └── Legal/          # Mentions légales
│   ├── services/
│   │   ├── firebase.js     # Initialisation Firebase
│   │   └── firestore.js    # Services Firestore
│   ├── hooks/              # React Hooks personnalisés
│   ├── store/              # Zustand state management
│   └── App.jsx             # Composant racine
├── .env.example            # Template des variables
├── firebase.json           # Config Firebase Hosting
├── firestore.rules         # Règles de sécurité Firestore
└── package.json            # Dépendances
```

## 📌 Ressources Utiles

- **Firebase Console**: https://console.firebase.google.com/project/erp-pedago-iftl
- **Documentation Firebase**: https://firebase.google.com/docs
- **GitHub Repository**: https://github.com/Ikram-BOUZIKAR/iftl-erp
- **Application Déployée**: https://erp-pedago-iftl.web.app

## 🛠️ Commandes Utiles

```bash
# Démarrer le serveur de développement
npm run dev

# Compiler pour la production
npm run build

# Prévisualiser la build
npm run preview

# Déployer sur Firebase Hosting
npm run build && firebase deploy --project erp-pedago-iftl

# Voir les logs Firebase
firebase functions:log --project erp-pedago-iftl
```

## 📋 Checklist de Configuration

- [ ] J'ai relu le fichier `SETUP_FIREBASE.md`
- [ ] J'ai créé le fichier `.env.local` avec mes clés Firebase
- [ ] J'ai relancé le serveur (`npm run dev`)
- [ ] Je peux accéder à http://localhost:3000
- [ ] Je peux me connecter avec `test@iftl.ma`
- [ ] Le tableau de bord charge correctement

## ❌ Problèmes Courants

### "Module not found: firebase"
**Solution**: Reinstall packages
```bash
rm -rf node_modules package-lock.json
npm install
```

### "VITE_FIREBASE_* is undefined"
**Solution**: Assurez-vous que `.env.local` est à la racine et redémarrez le serveur

### "Impossible to connect to Firestore"
**Solution**: Vérifiez vos règles de sécurité Firestore (fichier `firestore.rules`)

## 📞 Support

Pour toute question ou problème, consultez:
- La documentation React: https://react.dev
- La documentation Vite: https://vitejs.dev
- La documentation Firebase: https://firebase.google.com/docs
- Le repository GitHub: https://github.com/Ikram-BOUZIKAR/iftl-erp
