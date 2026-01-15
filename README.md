# Facebook Friend Remover Pro

Une extension Chrome avancée pour supprimer intelligemment des amis Facebook avec des filtres avancés.

## Description

Facebook Friend Remover Pro est une extension Chrome qui facilite la gestion de votre liste d'amis sur Facebook. Elle offre des fonctionnalités de suppression en masse avec des filtres personnalisables pour une expérience utilisateur optimale.

## Fonctionnalités

- **Suppression en masse** : Supprimez plusieurs amis à la fois
- **Filtres avancés** : Filtrez les amis par activité, interactions, etc.
- **Interface intuitive** : Popup simple pour contrôler l'extension
- **Sécurisé** : Respecte les politiques de Facebook et utilise des permissions minimales

## Installation

### Installation manuelle 

1. **Téléchargez ou clonez le dépôt** :
   ```bash
   git clone https://github.com/khalilbenaz/fb-friend-remover.git
   cd fb-friend-remover
   ```

2. **Ouvrez Chrome et allez dans les extensions** :
   - Tapez `chrome://extensions/` dans la barre d'adresse
   - Ou allez dans Menu > Plus d'outils > Extensions

3. **Activez le mode développeur** :
   - Cochez la case "Mode développeur" en haut à droite

4. **Chargez l'extension** :
   - Cliquez sur "Charger l'extension non empaquetée"
   - Sélectionnez le dossier `FB_Friends` que vous avez téléchargé

5. **Vérifiez l'installation** :
   - L'extension devrait apparaître dans la liste des extensions
   - L'icône devrait être visible dans la barre d'outils de Chrome

## Utilisation

1. Rendez-vous sur [Facebook](https://www.facebook.com/)
2. Cliquez sur l'icône de l'extension dans la barre d'outils
3. Utilisez le popup pour configurer vos filtres
4. Lancez la suppression selon vos critères

## Test

Pour tester l'extension :

1. Installez l'extension comme décrit ci-dessus
2. Allez sur Facebook et connectez-vous
3. Ouvrez la page "Amis" ou votre profil
4. Cliquez sur l'icône de l'extension
5. Testez les différentes fonctionnalités sans supprimer réellement (utilisez le mode test si disponible)

**Note** : Testez toujours sur un compte de test pour éviter toute suppression accidentelle.

## Développement

### Structure du projet

- `manifest.json` : Configuration de l'extension
- `popup.html` / `popup.js` : Interface utilisateur du popup
- `content.js` : Script injecté dans les pages Facebook
- `activate.html` : Page d'activation (si nécessaire)
- `images/` : Icônes de l'extension

### Technologies utilisées

- Manifest V3
- JavaScript ES6+
- HTML5/CSS3

## Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/nouvelle-fonction`)
3. Commitez vos changements (`git commit -am 'Ajoute nouvelle fonctionnalité'`)
4. Poussez vers la branche (`git push origin feature/nouvelle-fonction`)
5. Ouvrez une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## Support

Si vous rencontrez des problèmes :

- Vérifiez que vous utilisez la dernière version de Chrome
- Assurez-vous que l'extension est activée
- Redémarrez Chrome si nécessaire

Pour des questions, ouvrez une issue sur GitHub.

## Avertissement

Cette extension est fournie "telle quelle" sans garantie. Utilisez-la à vos risques et périls. Respectez toujours les conditions d'utilisation de Facebook.
