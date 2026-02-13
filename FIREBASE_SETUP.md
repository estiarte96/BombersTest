# 🔥 Configuració de Firebase per Bombers Test

## Passos per configurar Firebase:

### 1. Crear el projecte Firebase

1. Ves a [Firebase Console](https://console.firebase.google.com/)
2. Clica "Afegir projecte" o "Add project"
3. Nom del projecte: **bombers-test** (o el que vulguis)
4. Desactiva Google Analytics (no cal per aquest projecte)
5. Clica "Crear projecte"

### 2. Configurar Realtime Database

1. Al menú lateral, clica **"Realtime Database"**
2. Clica **"Crear base de dades"** o **"Create database"**
3. Ubicació: Tria **europe-west1** (més a prop)
4. Regles de seguretat: Tria **"Mode de prova"** (test mode)
   - Això permet lectura/escriptura sense autenticació durant 30 dies
5. Clica **"Activar"**

### 3. Obtenir les credencials

1. Ves a **Configuració del projecte** (icona d'engranatge al menú lateral)
2. Baixa fins a **"Les teves aplicacions"**
3. Clica la icona **"</>"** (Web)
4. Nom de l'app: **Bombers Test Web**
5. NO marquis "Firebase Hosting"
6. Clica **"Registrar app"**
7. **COPIA tot el codi de configuració** que apareix (firebaseConfig)

### 4. Enganxar les credencials al projecte

1. Obre el fitxer: `assets/js/firebase-config.js`
2. Substitueix els valors de placeholder amb els que has copiat
3. Hauria de quedar així:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "bombers-test.firebaseapp.com",
  projectId: "bombers-test",
  storageBucket: "bombers-test.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef",
  databaseURL: "https://bombers-test-default-rtdb.europe-west1.firebasedatabase.app"
};
```

**IMPORTANT**: Assegura't que el camp `databaseURL` estigui present!

### 5. Configurar regles de seguretat (IMPORTANT!)

Per defecte, les regles de prova expiren en 30 dies. Per a producció, configura aquestes regles:

1. Ves a **Realtime Database** → **Regles**
2. Substitueix el contingut per:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": true,
        ".write": true
      }
    },
    "questions": {
      ".read": true,
      ".write": false
    }
  }
}
```

Això permet:
- ✅ Tothom pot llegir usuaris
- ✅ Tothom pot escriure el seu propi usuari
- ✅ Tothom pot llegir preguntes
- ❌ Ningú pot modificar preguntes (només tu des de la consola)

### 6. Provar l'aplicació

1. Obre `index.html` amb Live Server o directament al navegador
2. Registra't amb un usuari de prova
3. Fes algunes preguntes
4. Ves a Firebase Console → Realtime Database
5. Hauries de veure les dades guardades!

### 7. Publicar a GitHub Pages

Un cop tot funcioni:

1. Crea un repositori a GitHub
2. Puja tots els fitxers (inclòs `firebase-config.js` amb les credencials)
3. Activa GitHub Pages des de Settings → Pages
4. Tria la branca `main` i la carpeta `/` (root)
5. La teva web estarà disponible a: `https://el-teu-usuari.github.io/nom-repo/`

---

## ⚠️ Seguretat

**NOTA**: Les credencials de Firebase són públiques per disseny. Firebase protegeix les dades amb les regles de seguretat, no amb les credencials.

Si vols més seguretat:
- Pots afegir autenticació d'usuaris amb Firebase Auth
- Pots restringir els dominis autoritzats a Firebase Console

---

## 🆘 Problemes comuns

### Error: "Firebase not defined"
- Assegura't que els scripts de Firebase s'han carregat a `index.html`

### Error: "Permission denied"
- Revisa les regles de seguretat a Firebase Console

### Les dades no es guarden
- Comprova que `databaseURL` estigui al `firebaseConfig`
- Obre la consola del navegador (F12) per veure errors

---

## ✅ Fet!

Un cop configurat, la teva aplicació funcionarà completament sense servidor Python!
Totes les dades es guardaran al núvol de Firebase i podràs accedir-hi des de qualsevol lloc.
