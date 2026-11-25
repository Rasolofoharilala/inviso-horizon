# Date de création métier et âge du lot

Prérequis : horizon-livestock-lots.patch déjà appliqué, ainsi que ses prérequis. Ce patch ne modifie ni Compose, ni le .env, ni la migration V4 existante.

```bash
git apply --check horizon-lot-age.patch
git apply horizon-lot-age.patch
docker compose up -d --build
```

Flyway applique V5__lot_creation_date.sql. Recharger ensuite le navigateur avec Ctrl+Shift+R.

## Règle retenue

La date de création du lot est la date de mise en place des poussins dans leur emplacement : elle correspond à J1. Ce n'est ni la date d'enregistrement dans Horizon, ni nécessairement la naissance des animaux.

| Jours du lot | Affichage |
|---|---|
| J1 à J7 | Semaine 1 |
| J8 à J14 | Semaine 2 |
| J15 à J21 | Semaine 3 |

`jour = nombre de jours calendaires depuis la mise en place + 1`.
`semaine d'élevage = division entière du nombre de jours écoulés par 7 + 1`.

Il s'agit du numéro de semaine d'élevage en cours, et non du nombre de semaines complètes révolues. Exemple : mise en place le 1er novembre ; le 7 novembre = Semaine 1 · J7 ; le 8 novembre = Semaine 2 · J8.

## Données et interface

- Colonne DATE creation_date dans livestock_lot.
- Champ obligatoire Date de création du lot · mise en place (J1) dans le formulaire.
- Possibilité de saisir une date passée pour un lot enregistré tardivement.
- Dates futures refusées par le backend et le frontend.
- Aperçu immédiat de la semaine et du jour dans le formulaire.
- Date, semaine et jour affichés dans la liste.
- La date est modifiable avec les mêmes droits et contrôles de version que les autres champs du lot.
- L'âge est calculé à chaque lecture : il n'est pas stocké comme une valeur à incrémenter en base.
- Le jour métier est déterminé selon Indian/Antananarivo par défaut, même si le conteneur fonctionne en UTC. La propriété horizon.livestock.time-zone permet de configurer un autre fuseau. Le backend renvoie la date de calcul et le fuseau à l'interface.
- Si la page reste ouverte, une vérification toutes les 60 secondes ou au retour sur l'onglet recharge les données lorsque le jour métier change. Aucun rafraîchissement automatique n'interrompt un formulaire ou une confirmation ouverts ; le bouton Actualiser permet de forcer la lecture après fermeture.

## Lots déjà présents

La migration ne devine pas leur date. Les lots existants conservent creation_date=NULL ; la liste affiche À renseigner / Âge inconnu. Modifier le lot pour saisir sa véritable date de mise en place. Il sera ensuite calculé normalement. Une nouvelle création ou modification exige une date.

Aucun lot n'est supprimé, aucune date de démonstration n'est injectée et la migration V4 n'est pas réécrite.

## API

POST et PUT /api/lots demandent creationDate au format AAAA-MM-JJ, en plus des champs précédents. Les mises à jour conservent le champ version obligatoire.

Les réponses LotView ajoutent creationDate, ageDays (J1 inclus), ageWeek (numéro de semaine d'élevage) et ageAsOf (date civile de calcul). creationDate, ageDays et ageWeek peuvent être null pour un ancien lot non complété.
La liste ajoute ageAsOf et timeZone à sa réponse globale. Les effectifs, les totaux et les règles d'accès restent ceux du patch précédent.

## Validation réalisée

- Quatre groupes de tests Node réussis sur les fonctions réellement utilisées par le frontend : J1/J7/J8/J14, changement de mois/année et année bissextile, dates invalides/futures, minuit à Madagascar.
- Build TypeScript/Vite et ESLint : réussis.
- Syntaxe du script HTTP Python : vérifiée.
- Application du patch sur les sources du patch des lots : vérifiée.

Compilation/tests Spring Java et tests HTTP non exécutés ici : compilateur javac absent, runtime local Java 21, projet Java 25 et dépendances Maven inaccessibles. Le rendu dans un navigateur reste à vérifier sur l'instance.

Tests frontend (Node compatible avec l'effacement des types TypeScript) :

```bash
cd frontend
node --experimental-strip-types --test tests/lot-age.test.mjs
```

Tests backend, avec Java 25 et dépendances accessibles :

```bash
cd Backend
./mvnw -Dtest=LotAgeTests,LivestockLotTests test
```

Le script HTTP existant est mis à jour pour envoyer la date et vérifier J1, J8, l'absence de date et une date future :

```bash
python3 scripts/test-livestock-lots.py http://localhost:8080
```

Ce script suppose le fuseau métier par défaut Madagascar et demande les mots de passe admin et lecteur sans les afficher.
