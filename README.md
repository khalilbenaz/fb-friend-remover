# 👥 Facebook Friend Remover Pro

[![Chrome](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)](https://www.google.com/chrome/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?logo=google-chrome)](https://developer.chrome.com/docs/extensions/mv3/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

Une extension Chrome pour supprimer intelligemment des amis Facebook avec des **filtres avancés**, un **suivi en temps réel** et un **arrêt d'urgence**.

---

## ✨ Fonctionnalités

- **4 modes de filtrage** — Noms arabes, noms non-arabes, sans amis en commun, ou tout supprimer
- **Chargement automatique complet** — Scroll intelligent qui détecte et charge toute la liste d'amis avant de commencer
- **Suivi en temps réel** — Compteur de suppressions, d'amis ignorés, et barre de progression animée
- **Limite configurable** — Définir un nombre maximum de suppressions (ou 0 pour tout)
- **Délai ajustable** — Contrôler la vitesse de suppression (en secondes)
- **Arrêt d'urgence** — Bouton d'arrêt instantané à tout moment
- **Interface moderne** — Popup avec design gradient, animations et feedback visuel
- **Manifest V3** — Compatible avec les dernières spécifications Chrome Extensions

---

## 📦 Installation

### Prérequis

- **Google Chrome** (version 88+)
- Un compte Facebook actif

### Installation manuelle

1. **Clonez le dépôt** :
   ```bash
   git clone https://github.com/khalilbenaz/fb-friend-remover.git
   cd fb-friend-remover
   ```

2. **Ouvrez Chrome** et allez dans la gestion des extensions :
   ```
   chrome://extensions/
   ```

3. **Activez le Mode développeur** (toggle en haut à droite)

4. **Cliquez sur « Charger l'extension non empaquetée »** et sélectionnez le dossier du projet

5. **Vérifiez** que l'icône 👥 apparaît dans votre barre d'outils Chrome

---

## 🚀 Utilisation

### Étape par étape

1. **Rendez-vous sur la page Amis de votre profil Facebook** :
   ```
   https://www.facebook.com/[votre-id]/friends
   ```

2. **Cliquez sur l'icône de l'extension** dans la barre d'outils Chrome

3. **Configurez les paramètres** :
   - **Limite** — Nombre maximum de suppressions (`0` = illimité)
   - **Délai** — Temps d'attente entre chaque suppression (en secondes, minimum 0.5)

4. **Choisissez un mode de suppression** :

   | Bouton | Filtre | Description |
   |--------|--------|-------------|
   | 📝 Noms Arabes | `arabic` | Supprime uniquement les amis dont le nom contient des caractères arabes (Unicode `\u0600-\u06FF`) |
   | 🔤 Noms Non-Arabes | `non-arabic` | Supprime uniquement les amis dont le nom ne contient pas de caractères arabes |
   | 🚫 Sans amis communs | `no-mutual` | Supprime les amis sans amis en commun (détection par "commun" / "mutual") |
   | 🗑️ TOUT SUPPRIMER | `all` | Supprime tous les amis sans exception |

5. **Observez la progression** en temps réel dans le popup

6. **Utilisez ⏹️ ARRÊT D'URGENCE** si vous souhaitez interrompre le processus

---

## ⚙️ Configuration

Les paramètres sont sauvegardés localement dans le navigateur entre les sessions :

| Paramètre | Type | Par défaut | Description |
|-----------|------|-----------|-------------|
| `Limite` | Entier ≥ 0 | `0` (tout) | Nombre maximum d'amis à supprimer. `0` = pas de limite |
| `Délai` | Float ≥ 0.5 | `1` seconde | Pause entre chaque suppression. Augmenter pour réduire le risque de blocage |

---

## 🏗️ Architecture

```
fb-friend-remover/
├── manifest.json        # Configuration Chrome Extension (Manifest V3)
├── popup.html           # Interface utilisateur du popup (HTML + CSS inline)
├── popup.js             # Logique du popup (événements, communication, UI)
├── content.js           # Script injecté dans Facebook (scroll, détection, suppression)
├── activate.html        # Page d'activation
├── images/              # Icônes de l'extension
│   ├── 16.png
│   ├── 48.png
│   └── 128.png
├── .github/             # Configuration GitHub
├── .gitignore
├── LICENSE              # MIT
└── README.md
```

### Flux d'exécution

```
popup.js                          content.js (injecté dans Facebook)
────────                          ──────────────────────────────────
Clic bouton
    │
    ├── Vérifie URL facebook.com
    ├── Injecte content.js
    ├── Envoie message START ──────►  Réception config (filter, max, delay)
    │                                       │
    │                                       ├── 1. findScrollableContainer()
    │                                       │      Détecte le bon conteneur scrollable
    │                                       │
    │                                       ├── 2. loadAllFriends()
    │                                       │      Scroll + charge toute la liste
    │                                       │      (jusqu'à 10 retries si bloqué)
    │                                       │
    │                                       ├── 3. processRemoval()
    │                                       │      Pour chaque carte d'ami :
    │                                       │        - Filtre selon config
    │                                       │        - scrollIntoView
    │                                       │        - Clic menu "..." → "Retirer" → "Confirmer"
    │                                       │        - Masque visuellement (opacity: 0.1)
    │                                       │
    │   ◄── Messages UPDATE ────────────────┤  Stats en temps réel
    │       { stats, isRunning, action }     │
    │                                       │
    ├── Clic STOP ──────────────────►  state.isRunning = false
    │                                       │
    ▼                                       ▼
  Mise à jour UI                      finish() → arrêt
```

### Communication

L'extension utilise le système de messaging Chrome Extension (Manifest V3) :

- **`popup.js → content.js`** : Messages `START` (avec config) et `STOP`
- **`content.js → popup.js`** : Messages `UPDATE` (stats, état, action en cours)

---

## 🔧 Détails Techniques

### Permissions (manifest.json)

| Permission | Raison |
|-----------|--------|
| `activeTab` | Accéder à l'onglet Facebook actif |
| `scripting` | Injecter `content.js` dans la page |
| `storage` | Sauvegarder les préférences utilisateur |

### Host Permission

```json
"host_permissions": ["https://www.facebook.com/*"]
```

L'extension ne fonctionne que sur `facebook.com`.

### Détection du scroll

Le script détecte automatiquement le conteneur scrollable de Facebook (qui n'est pas toujours `window`) en remontant le DOM depuis les cartes d'amis jusqu'au premier parent avec `overflow-y: auto|scroll`.

### Détection des noms arabes

Utilise une regex Unicode pour identifier les caractères arabes :

```javascript
const isArabic = /[\u0600-\u06FF]/.test(name);
```

### Détection des amis en commun

Recherche les mots-clés "commun" (FR) ou "mutual" (EN) dans le texte de la carte :

```javascript
const hasMutual = text.toLowerCase().includes('commun') || 
                  text.toLowerCase().includes('mutual');
```

---

## ⚠️ Avertissements Importants

> **🔴 Action irréversible** — La suppression d'amis est **définitive**. Il n'existe aucun moyen de récupérer automatiquement les amis supprimés.

> **🟡 Risque de blocage** — Facebook peut temporairement restreindre votre compte si trop d'actions sont effectuées rapidement. Utilisez un **délai ≥ 1 seconde** pour minimiser ce risque.

> **🟡 Interface Facebook** — Facebook modifie régulièrement son interface. Si les sélecteurs DOM changent, les boutons "Retirer" ou "Confirmer" pourraient ne pas être trouvés. Le script gère ces cas gracieusement (ferme le menu et passe au suivant).

> **🟢 Testez d'abord** — Utilisez toujours une petite limite (ex: `5`) pour vérifier que tout fonctionne correctement avant un nettoyage massif.

---

## 🤝 Contributing

1. **Forkez** le projet
2. **Créez** une branche feature :
   ```bash
   git checkout -b feature/ma-fonctionnalite
   ```
3. **Commitez** vos changements :
   ```bash
   git commit -am "Ajoute ma fonctionnalité"
   ```
4. **Pushez** et ouvrez une **Pull Request**

### Idées de contribution

- Support d'autres langues pour la détection des boutons (arabe, espagnol…)
- Mode "dry-run" (simulation sans suppression réelle)
- Export de la liste d'amis avant suppression
- Filtrage par date d'ajout ou nombre d'interactions

---

## 🐛 Dépannage

| Problème | Solution |
|----------|----------|
| "Allez sur la page Amis de Facebook" | Assurez-vous d'être sur `facebook.com/[votre-id]/friends` |
| Le script ne charge pas tous les amis | Augmentez le nombre de retries ou attendez que la page soit entièrement chargée |
| Les amis ne se suppriment pas | Facebook a peut-être changé ses sélecteurs CSS. Ouvrez une issue sur GitHub |
| Erreur de communication | Rechargez la page Facebook et relancez l'extension |
| Blocage temporaire Facebook | Attendez quelques heures et augmentez le délai entre les suppressions |

---

## 📄 License

Ce projet est sous licence **MIT**. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

## 📊 Technologies

| Techno | Version | Usage |
|--------|---------|-------|
| Chrome Extensions | Manifest V3 | Architecture de l'extension |
| JavaScript | ES6+ | Logique applicative (async/await, arrow functions) |
| HTML5 / CSS3 | — | Interface popup (animations, gradients, grid layout) |
| Chrome Scripting API | — | Injection du content script |
| Chrome Messaging API | — | Communication popup ↔ content script |
