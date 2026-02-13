# 🚒 Bombers Test - Aplicació de Preparació d'Oposicions

Aplicació web per preparar les oposicions de Bombers de Catalunya amb tests interactius, estadístiques personalitzades i seguiment del progrés.

## ✨ Funcionalitats

- 🔐 **Sistema d'autenticació** amb registre i login
- 📚 **36 temes** amb preguntes extretes d'exàmens oficials
- 📊 **Estadístiques detallades** per usuari i per tema
- 🎯 **Dos modes de test**: Estudi (amb feedback immediat) i Examen (simulació real)
- 📈 **Seguiment de progrés** amb dies d'ús i percentatge d'encert
- 💾 **Dades al núvol** amb Firebase (accessibles des de qualsevol dispositiu)
- 📱 **Disseny responsive** (funciona en mòbil, tauleta i ordinador)

## 🚀 Instal·lació i Ús

### Opció 1: Ús directe (GitHub Pages)

1. Ves a: `https://el-teu-usuari.github.io/bombers-test/`
2. Registra't o inicia sessió
3. Selecciona els temes que vols estudiar
4. Comença a practicar!

### Opció 2: Desenvolupament local

1. **Clona el repositori:**
   ```bash
   git clone https://github.com/el-teu-usuari/bombers-test.git
   cd bombers-test
   ```

2. **Configura Firebase:**
   - Segueix les instruccions de `FIREBASE_SETUP.md`
   - Omple les credencials a `assets/js/firebase-config.js`

3. **Obre amb Live Server:**
   - Instal·la l'extensió "Live Server" a VS Code
   - Clic dret a `index.html` → "Open with Live Server"

## 📁 Estructura del Projecte

```
bombers-test/
├── index.html              # Pàgina principal
├── assets/
│   ├── css/
│   │   └── styles.css      # Estils de l'aplicació
│   ├── js/
│   │   ├── app.js          # Lògica principal
│   │   ├── firebase-config.js  # Configuració Firebase
│   │   └── firebase-db.js  # Funcions de base de dades
│   └── img/
│       └── logo.png        # Logo de l'aplicació
├── data/
│   └── questions.json      # Base de dades de preguntes
├── FIREBASE_SETUP.md       # Guia de configuració
└── README.md               # Aquest fitxer
```

## 🔧 Tecnologies Utilitzades

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Firebase Realtime Database
- **Hosting**: GitHub Pages
- **Fonts**: Google Fonts (Outfit)
- **Icones**: Font Awesome 6

## 📝 Afegir Noves Preguntes

1. Obre `data/PREGUNTES.xlsx`
2. Afegeix preguntes seguint el format existent
3. Executa el script de conversió:
   ```bash
   python scripts/data_converter.py
   ```
4. El fitxer `data/questions.json` s'actualitzarà automàticament

## 🔒 Seguretat i Privadesa

- Les contrasenyes es guarden en text pla (només per a ús educatiu/personal)
- Les dades es guarden a Firebase amb regles de seguretat configurades
- No es recopila cap informació personal més enllà del nom i correu

**⚠️ IMPORTANT**: Aquesta aplicació està pensada per a ús personal o educatiu. Per a un entorn de producció real, caldria implementar:
- Encriptació de contrasenyes (bcrypt, etc.)
- Autenticació amb Firebase Auth
- Validació de dades al servidor
- HTTPS obligatori

## 📄 Llicència

Aquest projecte és de codi obert i està disponible sota llicència MIT.

## 🤝 Contribucions

Les contribucions són benvingudes! Si vols millorar l'aplicació:

1. Fes un fork del repositori
2. Crea una branca amb la teva funcionalitat (`git checkout -b nova-funcionalitat`)
3. Fes commit dels canvis (`git commit -am 'Afegeix nova funcionalitat'`)
4. Puja la branca (`git push origin nova-funcionalitat`)
5. Obre un Pull Request

## 📧 Contacte

Si tens preguntes o suggeriments, obre un issue al repositori.

---

**Fet amb ❤️ per futurs bombers de Catalunya** 🚒🔥
