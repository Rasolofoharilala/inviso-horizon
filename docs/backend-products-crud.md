# CRUD produits

Patch incrémental après `backend-data-sources.md`. La table V1 existante suffit : aucune migration supplémentaire, aucune suppression de données. Le frontend reste inchangé.

| Méthode | Route | Succès |
|---|---|---|
| GET | `/api/products?page=0&size=20` | 200, liste paginée |
| GET | `/api/products/{id}` | 200, produit |
| POST | `/api/products` | 201, produit et Location |
| PUT | `/api/products/{id}` | 200, remplacement complet |
| DELETE | `/api/products/{id}` | 204, aucun corps |
| GET | `/api/csrf` | 200, jeton CSRF |

POST et PUT attendent tous les champs :

```json
{"reference":"ALIM-001","name":"Aliment volaille","category":"Élevage","price":1200.50}
```

Les chaînes sont nettoyées aux extrémités. Référence, nom et catégorie sont obligatoires, limités à 80, 150 et 100 caractères. Le prix est obligatoire, positif ou nul, avec 13 chiffres entiers maximum et 2 décimales maximum. Une référence est unique (contrainte PostgreSQL). Une modification ne crée pas un produit manquant. En cas d’écritures concurrentes sur un même produit, la dernière modification peut remplacer la précédente ; un verrouillage optimiste pourra être ajouté dans une migration dédiée.

Erreurs : 400 entrée invalide, 401 non authentifié, 403 jeton CSRF absent/invalide, 404 produit absent, 409 conflit de données, 503 connecteur Sage non configuré. Les messages SQL internes ne sont pas renvoyés au client. Le contrat CRUD est commun aux sources ; Sage refuse explicitement toutes les opérations jusqu’à l’implémentation réelle de son API. Aucun repli PostgreSQL.

## Sécurité et futur pont React

La sécurité Spring existante est conservée : aucune désactivation de CSRF ou ouverture anonyme. Le compte de développement existant peut réaliser toutes ces opérations ; les rôles métier ne sont pas encore implémentés.

Le client authentifié appelle GET `/api/csrf`, conserve le cookie de session puis transmet le jeton dans le header indiqué par `headerName` sur POST, PUT et DELETE. Le jeton peut expirer avec la session. Le proxy Nginx existant dessert `/api` sous la même origine. React devra utiliser les mêmes credentials/cookies ; son login de démonstration ne constitue toujours pas une authentification backend. Ne pas mettre le mot de passe généré dans le code frontend.

## Vérification dans Codespaces

Depuis la racine :

```bash
cd Backend &&
bash ./mvnw -Dtest=ProductServiceTest,ProductCrudTest test &&
cd .. &&
docker compose up -d --build backend
```

Attendre `Started HorizonApplication`, puis :

```bash
python3 scripts/test-products-crud.py
```

Le script demande les identifiants backend, récupère le CSRF et teste successivement création, lecture, modification, suppression et 404 après suppression. Il utilise uniquement la bibliothèque standard Python. Il crée un seul produit avec une référence unique et tente de le nettoyer en cas d’échec. L’utiliser sur une base de développement ; une interruption brutale peut laisser le produit temporaire.

Une URL alternative peut être passée en argument. Préférer le localhost du Codespace ou HTTPS. Le mot de passe est demandé sans écho et n’est pas stocké. Il est généré de nouveau au redémarrage backend si aucun compte n’est configuré.

Les tests Java couvrent persistance via mock, remplacement, suppression, absence, identifiants invalides, validation des champs et refus Sage. Ils ne remplacent pas le test réel PostgreSQL. L’environnement de préparation n’a pas accès à Maven Central ; compilation et exécution Java restent à confirmer dans le Codespace.
