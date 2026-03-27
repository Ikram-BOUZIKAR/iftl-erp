# 🚀 Quick Start - Émulateur Firebase (DEV LOCAL)

## ⚡ Le Problème: L'erreur "auth/api-key-not-valid"

L'application en production a besoin de vraies clés Firebase, mais pour **développer et tester localement**, nous utilisons l'**Émulateur Firebase**.

---

## ✅ Solution: Utiliser l'Émulateur

### 3 Étapes Simples:

#### 1️⃣ Terminal 1 - Démarrer l'Émulateur
```bash
npm run dev:emulator
```

Attendre le message:
```
✔ Emulator UI started at http://localhost:4000
✔ All emulators ready! It is now safe to connect your app.
```

---

#### 2️⃣ Terminal 2 - Démarrer le Dev Server
```bash
npm run dev
```

Attendre le message:
```
VITE v8.0.3 ready in 100 ms

➜  Local:   http://localhost:5173/
```

---

#### 3️⃣ Ouvrir l'App et Tester

**Application**: http://localhost:5173

**Identifiants**:
- Email: `test@iftl.ma`
- Mot de passe: `Test123456!`

---

## 🎯 Résultat

✅ Connexion réussie   
✅ Dashboard chargé   
✅ Données Firestore visible   
✅ **Zéro erreur Firebase!** 🎉

---

## 📊 Dashboard Émulateur

Pour voir toutes les données (users, collections, etc.):

**Émulateur UI**: http://localhost:4000

---

## 🔨 Alternative: Les Deux en Un Seul Commande

```bash
npm run dev:with-emulator
```

Cela lance les deux serveurs en parallèle! (Nécessite 2 terminaux virtuels)

---

## 📖 Docs Complètes

Pour plus de détails, voir [EMULATOR_GUIDE.md](EMULATOR_GUIDE.md)

---

## ⚙️ Configuration

- 🔥 **Auth Emulator**: port 9099
- 💾 **Firestore**: port 8080
- 📦 **Storage**: port 9199
- 🎨 **UI**: port 4000 (http://localhost:4000)

Tous configurés dans `firebase.json` ✅

---

## 🎓 Prochaines Étapes

- [ ] Tester le login avec l'émulateur ✅
- [ ] Vérifier les données sur Emulator UI ✅
- [ ] Développer les nouvelles features ✅
- [ ] Build pour production: `npm run build`
- [ ] Déployer en production: `npm run firebase:deploy`

---

**Happy Coding! 🚀**
