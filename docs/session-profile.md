# Session Horizon et photos de profil

Ce patch prolonge les patches PostgreSQL, CRUD backend et frontend produits déjà fournis. Base locale de référence : 0e41b5c. Aucun changement distant ni déploiement.

## Appliquer depuis la racine du dépôt

```bash
git apply --check horizon-session-profile.patch
git apply horizon-session-profile.patch
docker compose up -d --build
```

Si le contrôle échoue, ne pas forcer : le patch attend les versions issues des patches précédents. Les classes d'authentification sont incluses. Ne pas appliquer une seconde fois un éventuel patch d'authentification qui créerait les mêmes classes.

## Comportement

- PostgreSQL contient les comptes Horizon. Connexion par identifiant et mot de passe BCrypt ; compte absent, désactivé ou RESTRICTED : refus avant authentification réussie. ADMIN, EDITOR, VIEWER : entrée autorisée.
- Session serveur HttpOnly et SameSite=Lax. Le frontend ne conserve aucun mot de passe ni en-tête Basic. CSRF vérifié sur connexion, mutations et déconnexion. Un cookie/session anonyme peut exister pour le CSRF avant connexion ; il ne donne aucun accès authentifié.
- Vérification de session au chargement, routes privées, déconnexion réelle et retour au login sur HTTP 401. Boutons produits adaptés au rôle ; le backend contrôle toujours les droits.
- ADMIN : lecture/création/modification/suppression de produits. EDITOR : lecture/création/modification. VIEWER : lecture.
- Page Paramètres : identité, rôle, photo actuelle, envoi d'une photo et historique avec restauration.
- Chaque utilisateur accède uniquement à ses propres images, y compris pour les anciennes versions et la restauration. Aucun dossier statique public.
- Photos locales JPEG/PNG (2 Mo, 4 millions de pixels maximum) réencodées en PNG. Chemin relatif conservé dans user_photo.storage_key ; horizon_user.avatar_id référence la version active avec contrainte de propriété en base.
- Dossier : images/<id-utilisateur>/<timestamp-millisecondes>_<UUID>.png. L'identifiant utilisateur est stable, le nom n'utilise jamais le nom original envoyé. Le timestamp sert au classement ; l'UUID prévient les collisions.
- Le volume Docker profile_images monte /app/images. Il persiste lors des recréations ; ne pas supprimer les volumes. Pour un lancement sans Docker, ./images est utilisé (configurable par HORIZON_IMAGES_DIRECTORY).
- Sauvegarder ensemble PostgreSQL et les images. Les anciennes photos sont conservées sans limite dans ce patch. Une politique de suppression/rétention reste à définir. Une panne brutale entre écriture du fichier et validation SQL peut laisser un fichier orphelin ; aucun historique validé n'est supprimé par l'envoi.

## Comptes et Sage X3

Aucune connexion Sage X3 n'est implémentée ici. Les comptes et droits sont ceux de la base Horizon. Pas d'inscription libre, d'import Sage ni de récupération de photos Sage. Ne pas utiliser ce patch comme preuve de validation des droits Sage. L'intégration devra fournir un identifiant Sage stable et une règle explicite de synchronisation des droits.

Les comptes DEV sont optionnels et désactivés par défaut. Pour une instance locale de test, configurer dans .env : DEV_USERS_ENABLED=true, DEV_ADMIN_PASSWORD, DEV_EDITOR_PASSWORD, DEV_VIEWER_PASSWORD, DEV_RESTRICTED_PASSWORD (12 à 72 octets chacun). Le seeder crée admin, editeur, lecteur et restreint seulement s'ils n'existent pas ; il ne réinitialise pas leurs mots de passe.

## Validation

Build TypeScript/Vite et ESLint exécutés avec succès. Le contrôle d'application du patch est réalisé sur sa base locale.
Compilation et tests Java non exécutables ici : Maven Central inaccessible, dépendances Spring Boot absentes ; Java local 21 alors que le projet demande Java 25. Le Dockerfile utilise Java 25.

Avec Java 25 et un accès Maven fonctionnel :

```bash
cd Backend
./mvnw -Dtest=DatabaseUserDetailsServiceTests test
```

Sur l'instance Docker démarrée avec les comptes DEV :

```bash
python3 scripts/test-session-photos.py http://localhost:8080
python3 scripts/test-products-crud.py http://localhost:8080
```

Le premier script vérifie compte absent/non autorisé, mauvaise authentification, accès anonyme, rôle lecteur, CSRF, fichier invalide, deux photos distinctes, conservation, restauration, isolation entre utilisateurs et déconnexion. Il conserve deux petites images dans l'historique du compte DEV admin. Le second crée puis supprime un produit temporaire ; utiliser admin. Ces tests HTTP sont fournis mais n'ont pas été exécutés ici faute de backend fonctionnel.
