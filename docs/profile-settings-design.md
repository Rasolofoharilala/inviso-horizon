# Paramètres : profil et photos

Patch à appliquer après horizon-session-profile.patch. Compatible indépendamment du patch de logs. Aucun changement de Compose ni du backend.

```bash
git apply --check horizon-settings-ui.patch
git apply horizon-settings-ui.patch
docker compose up -d --build frontend
```

## Parcours

1. Paramètres : résumé du compte, photo actuelle et rôle traduit.
2. Choisir un fichier JPEG ou PNG : validation du format déclaré, du poids et des dimensions côté navigateur ; le backend reste le contrôle de référence.
3. Voir l’aperçu, annuler ou enregistrer explicitement. La sélection seule n’envoie rien au serveur.
4. Attendre le message de confirmation. La nouvelle photo actualise aussi le profil de navigation.
5. Dans l’historique, choisir Réutiliser cette photo. Confirmer ou annuler dans la fenêtre native ; Échap annule hors enregistrement.
6. Consulter l’identifiant et les droits en lecture seule. Leur modification nécessite un administrateur ; aucune fausse commande de modification n’est ajoutée.

États prévus : chargement, historique vide, échec d’historique avec bouton Réessayer, validation du fichier, enregistrement, réussite, erreur serveur. Après un enregistrement confirmé, un échec de rafraîchissement est annoncé sans présenter l’envoi comme échoué.

## Accessibilité visée

Objectif : critères WCAG 2.2 AAA applicables à cette page, sans déclaration de conformité globale.

- Texte sur surfaces de la page : huit couples de couleurs calculés à au moins 7:1, minimum mesuré 7,04:1 (texte #435149 sur fond #e4eee6).
- Bouton principal blanc sur vert #154a2b : 10,26:1.
- Focus clavier : contour de 3 pixels, espacement de 4 pixels et halo blanc ; styles spécifiques en couleurs forcées.
- Commandes de 48 pixels de hauteur ; bouton natif de sélection de fichier de 44 pixels minimum.
- Formulaire avec label visible, aide associée et erreurs reliées au champ ; messages d’état annoncés et résumé d’erreur focalisé.
- Navigation par liens de sections, titres structurés, aucun glisser-déposer obligatoire, historique en liste.
- Confirmation native avec nom/description accessibles et annulation ; les statuts utilisent du texte et pas seulement une couleur.
- Mise en page adaptative sans largeurs fixes de contenu ; respect de la réduction des mouvements.

Références W3C :
https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html
https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html
https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html

## Vérifications effectuées

- Compilation TypeScript et build Vite : réussis.
- ESLint : réussi.
- Calcul des huit couples de couleurs du texte : réussi.
- Application du patch et absence d’erreurs d’espacement : vérifiées sur les sources du patch précédent.

## Vérifications à faire sur l’instance

Le rendu dans un navigateur, la navigation clavier et le lecteur d’écran n’ont pas été vérifiés dans l’environnement de préparation. Aucun audit AAA complet n’est revendiqué.

- Tab/Entrée : accéder aux sections, choisir une photo, annuler, enregistrer et restaurer ; voir le focus à chaque étape.
- Dans la confirmation : Tab reste dans la fenêtre, Échap annule et le focus revient sur la commande précédente.
- À 320 pixels de largeur, zoom à 200 % puis 400 % et espacement du texte augmenté : aucun contenu ni contrôle perdu.
- Avec lecteur d’écran : labels, erreurs et confirmations annoncés ; ordre des titres et statut photo actuelle compréhensibles.
- Tester JPEG/PNG valides, fichier invalide, plus de 2 Mo, dimensions trop grandes, panne réseau et historique vide.
- Ajouter deux photos et restaurer la première ; vérifier la photo du rail de navigation.

Les limites de sécurité, propriété des photos et conservation du backend précédent restent en vigueur.
