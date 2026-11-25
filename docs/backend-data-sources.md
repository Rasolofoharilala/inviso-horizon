# Décision backend — 25 novembre 2026

## Décision retenue

Les migrations SQL Flyway créent et font évoluer le schéma. Les entités JPA représentent les tables dans Java. Hibernate vérifie leur compatibilité avec `ddl-auto: validate`; il ne crée et ne modifie pas les tables. Les repositories Spring Data assurent l’accès aux données. Un repository Java ne stocke pas les tables : elles existent dans PostgreSQL.

PostgreSQL est la base interne persistante d’Horizon dans les deux modes. Le choix de source concerne ici la lecture des produits métier : `postgres` ou `sage-x3`. Il ne remplace pas la connexion JDBC par une connexion à la base Sage.

## Organisation

- `Backend/src/main/resources/application.yaml` : connexion PostgreSQL et configuration Flyway/JPA.
- `Backend/src/main/resources/db/migration/V1__create_horizon_product.sql` : première table, sans données de démonstration automatiques.
- `Backend/src/main/java/com/inviso/horizon/data/` : configuration du choix de source.
- `Backend/src/main/java/com/inviso/horizon/product/` : entité, repository, service, contrat et adaptateurs.
- `ProductDataSource` : contrat commun. Le contrôleur et le front ne dépendent pas du fournisseur.
- `PostgresProductDataSource` : lecture JPA paginée et triée par identifiant.
- `SageX3ProductDataSource` : point de branchement uniquement. Il retourne actuellement HTTP 503 avec le code `SAGE_X3_NOT_CONFIGURED`. Aucun appel réel à Sage ni repli silencieux vers PostgreSQL.

Le connecteur Sage exigera le service réellement publié sur l’installation, sa méthode d’authentification, le dossier et un exemple de réponse. Ajouter ensuite appels API, délais, pagination et conversion vers `ProductView`. Les secrets seront fournis par environnement. Aucun accès direct à la base Sage n’est prévu.

Ce patch fournit uniquement la lecture des produits. Il ne branche pas encore le CRUD React, ne réalise pas la synchronisation entre sources et ne crée pas une authentification utilisateur complète. Les écritures nécessiteront une politique distincte pour chaque fournisseur.

## Démarrage dans Codespaces

Depuis la racine du dépôt, avec le `.env` PostgreSQL existant :

```bash
docker compose up -d --build backend
docker compose ps
docker compose logs --tail=100 backend
```

Compose transmet l’adresse interne `jdbc:postgresql://postgres:5432/horizon`. Il n’est pas nécessaire de publier PostgreSQL sur Internet. Le défaut `localhost` du YAML concerne seulement un lancement Java hors Docker avec un PostgreSQL local accessible.

Vérifier que Flyway a appliqué la migration :

```bash
docker compose exec postgres psql -U horizon -d horizon -c '\dt'
docker compose exec postgres psql -U horizon -d horizon -c 'SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;'
```

Si une base déjà utilisée possède des tables sans historique Flyway, examiner et reprendre son schéma avant toute migration. Le baseline automatique est désactivé. Ne pas effacer le volume pour contourner une erreur.

Pour vérifier l’API, démarrer aussi le frontend si nécessaire :

```bash
docker compose up -d frontend
curl --user user 'http://localhost:8080/api/products?page=0&size=20'
```

La sécurité Spring existante reste active. En configuration par défaut, saisir au prompt curl le mot de passe généré visible dans les logs backend. Utiliser vos identifiants configurés si cette sécurité a été personnalisée. Le login de démonstration React ne fournit pas encore cette authentification backend.

Réponse attendue sur une table vide :

```json
{"source":"postgres","items":[],"page":0,"size":20,"hasNext":false}
```

Le paramètre `size` accepte 1 à 100, et `page` 0 à 100000. Une pagination invalide retourne HTTP 400.

## Choisir la source

Ajouter dans le `.env` existant, sans changer les identifiants PostgreSQL :

```dotenv
BUSINESS_DATA_SOURCE=postgres
```

Après modification :

```bash
docker compose up -d --force-recreate backend
```

La valeur alternative est `sage-x3`. Pour tester ponctuellement le point de branchement :

```bash
BUSINESS_DATA_SOURCE=sage-x3 docker compose up -d --force-recreate backend
```

L’appel authentifié à `/api/products` doit alors retourner HTTP 503. Revenir à PostgreSQL :

```bash
BUSINESS_DATA_SOURCE=postgres docker compose up -d --force-recreate backend
```

Le choix est global au backend et chargé au démarrage. Il ne copie aucune donnée entre fournisseurs. PostgreSQL reste nécessaire en mode Sage. Une valeur inconnue empêche le démarrage.

## Validation

Avec Java 25, depuis la racine :

```bash
cd Backend &&
bash ./mvnw -Dtest=ProductServiceTest test &&
bash ./mvnw -DskipTests package
```

Les tests unitaires couvrent le fournisseur par défaut, la sélection, l’absence de repli Sage, les limites de pagination et les adaptateurs ambigus. Le test de contexte existant nécessite un PostgreSQL accessible et ses variables de connexion : ne pas le confondre avec les tests unitaires isolés.

Le démarrage Docker et les requêtes ci-dessus sont nécessaires pour valider réellement migration et connexion. Dans l’environnement de préparation, Maven Central était inaccessible : compilation et tests non exécutés avec succès.

## Évolutions futures

Ajouter une migration `V2__...sql` pour la prochaine évolution et adapter les entités correspondantes. Ne pas modifier une migration déjà appliquée. Conserver `ddl-auto=validate`. Chaque futur domaine métier aura son propre contrat/adaptateur si son accès doit changer de fournisseur.
