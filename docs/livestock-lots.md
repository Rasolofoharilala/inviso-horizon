# Lots de cheptel — première liste métier

Prérequis : patches horizon-session-profile.patch, horizon-workflow-logs.patch et horizon-settings-ui.patch déjà appliqués. Aucun changement de compose.yaml ni de .env.

```bash
git apply --check horizon-livestock-lots.patch
git apply horizon-livestock-lots.patch
docker compose up -d --build
```

Attendre le démarrage réussi du backend : Flyway applique V4__create_livestock_lot.sql. Ouvrir Paramètres ou une autre page, puis Gestion > Lots de cheptel (route /lots). L'ancienne route /produits redirige vers /lots ; les anciennes données et l'API produits ne sont pas supprimées ni converties.

## Modèle

Un lot possède une référence unique, un nom et deux effectifs : mâle et femelle. Le total est calculé côté serveur et ne peut pas être saisi. Les deux effectifs sont obligatoires, entiers et positifs ou nuls, jusqu'à 2 147 483 647 chacun. Le calcul du total utilise un entier long pour éviter un débordement lors de l'addition.

La référence est nettoyée et normalisée en majuscules ; `lot-001` et `LOT-001` représentent la même référence. Un lot à zéro mâle et zéro femelle est autorisé. Un sexe absent est représenté par zéro, pas par une valeur vide.

Cette première version conserve les effectifs directement dans la table livestock_lot. Elle ne crée pas de fiches individuelles d'animaux, de catégories supplémentaires de sexe, de mouvements d'entrée/sortie, d'historique métier ou de diagramme. Elle utilise PostgreSQL Horizon et ne lit pas les lots de Sage X3. Elle établit la liste qui servira ensuite à construire le diagramme.

Exemple à saisir manuellement :

| Référence | Nom | Mâles | Femelles | Total |
|---|---|---:|---:|---:|
| LOT-001 | Lot principal | 120 | 180 | 300 |
| LOT-002 | Lot secondaire | 80 | 220 | 300 |

Aucune donnée de démonstration n'est insérée automatiquement.

## Droits et modifications

- ADMIN : lire, ajouter, modifier et supprimer.
- EDITOR : lire, ajouter et modifier.
- VIEWER : lire uniquement.
- RESTRICTED : entrée refusée par l'authentification existante.

Les contrôles de droits restent côté backend ; les boutons reflètent ces droits. CSRF est conservé.
Les modifications et suppressions transportent la version du lot. Si un autre utilisateur l'a changé entre-temps, une réponse 409 demande d'actualiser plutôt que d'écraser ses données.
La suppression demande confirmation, efface définitivement le lot et est réservée à l'administrateur. Elle n'est pas un mouvement de stock ou de cheptel.

## Liste et totaux

La recherche s'effectue côté serveur sur la référence et le nom, sans distinction de casse. La liste utilise des pages de 20 lots, les plus récents en premier. Les cartes Lots/Mâles/Femelles/Total portent sur tous les lots correspondant à la recherche, pas seulement les 20 lignes de la page.
Après enregistrement ou suppression, la liste et les cartes sont rechargées depuis le serveur. Une recherche sans résultat propose d'effacer le filtre. Les premières créations sous un filtre ne correspondant pas au nouveau lot peuvent ne pas être visibles avant d'effacer ce filtre.

## API

- GET /api/lots?q=&page=0&size=20 : liste paginée et totaux filtrés.
- GET /api/lots/{id} : un lot.
- POST /api/lots : création avec reference, name, maleCount, femaleCount.
- PUT /api/lots/{id} : remplacement de ces quatre champs avec version obligatoire.
- DELETE /api/lots/{id}?version=... : suppression avec contrôle de version.

Les routes apparaissent dans les événements HTTP du journal de workflow ; les identifiants sont masqués dans le nom de route journalisé.

## Validation

Build TypeScript/Vite, ESLint et syntaxe du script Python : réussis. Application du patch vérifiée sur l'empilement des patches prérequis.
Compilation/tests Java et tests HTTP non exécutés ici : Java local 21, projet Java 25 et dépendances Maven inaccessibles. Le rendu dans un navigateur reste à vérifier sur l'instance.

Avec Java 25 et les dépendances Maven accessibles :

```bash
cd Backend
./mvnw -Dtest=LivestockLotTests test
```

Avec les comptes de test admin et lecteur déjà créés et l'application démarrée :

```bash
python3 scripts/test-livestock-lots.py http://localhost:8080
```

Le script demande les mots de passe sans les afficher, crée deux lots temporaires, vérifie les totaux sur plusieurs pages, la normalisation des références, les doublons, effectifs négatifs/fractionnaires, versions concurrentes, CSRF et droits lecteur. Il tente de supprimer les deux lots en fin d'exécution.

Vérification manuelle : ajouter LOT-001 avec 120 mâles et 180 femelles ; constater le total 300 dans la ligne et les cartes ; changer l'effectif femelle à 200 et constater le total 320 ; rechercher la référence ; vérifier la lecture seule avec lecteur.

Pour voir les données :

```bash
docker compose exec postgres psql -U horizon -d horizon -c "SELECT reference, name, male_count, female_count, male_count::bigint + female_count AS total FROM livestock_lot ORDER BY id DESC;"
```
