# Module Lots : historique, chronologie et évolution

Prérequis : appliquer tous les patches précédents jusqu'à horizon-lot-age.patch inclus. Le patch ne modifie ni Compose ni le .env.

```bash
git apply --check horizon-lot-workspace.patch
git apply horizon-lot-workspace.patch
docker compose up -d --build
```

Attendre la migration V6__lot_movements.sql et le démarrage réussi du backend. Recharger le navigateur avec Ctrl+Shift+R.

## Navigation

Un module Lots apparaît dans la sidebar avec quatre pages :

- Liste des lots : recherche, effectifs présents et bouton Voir le lot, y compris pour les lecteurs.
- Historique des mouvements : journal tabulaire paginé, plus récent en premier.
- Chronologie : mise en place, puis événements par date effective, plus ancien en premier ; pagination de 20 mouvements.
- Évolution : diagramme des effectifs mâles et femelles, par jour ou semaine d'élevage, et tableau des valeurs exactes.

Chaque sous-page permet de choisir un lot par référence ou nom avec recherche et pagination. Le lot sélectionné est conservé en passant d'une vue à l'autre. La fiche complète est accessible par /lots/{id} ; les sous-pages partagent le paramètre ?lot={id}.

La fiche affiche une synthèse, les derniers mouvements et le diagramme. Il n'y a pas de visite guidée ou de données de démonstration injectées : les pages utilisent les données enregistrées.

## Mouvements

Cette première version permet : entrée, mortalité, vente, autre sortie.
Une quantité saisie est positive ou nulle ; le type détermine le signe. Au moins l'un des deux sexes doit avoir une quantité supérieure à zéro. Un motif est obligatoire.

La date effective doit être comprise entre la mise en place (J1) et le jour métier courant. Elle est distincte de l'horodatage d'enregistrement et du compte ayant saisi le mouvement. Les événements d'une même date sont ordonnés par identifiant d'enregistrement.

Les entrées et sorties recalculent les effectifs affichés dans la liste et les cartes. Les effectifs initiaux restent dans livestock_lot ; les variations sont dans lot_movement. La mise en place apparaît comme état de référence dans la chronologie et ne crée pas une seconde entrée à additionner.

Les effectifs déjà présents avant ce patch deviennent les effectifs de référence. Le système ne peut pas reconstruire les anciennes modifications directes non historisées : vérifier ces valeurs et J1 avant d'enregistrer le premier mouvement. Aucune trajectoire passée n'est inventée.

Après le premier mouvement, même annulé, J1 et les effectifs initiaux sont verrouillés côté serveur ; le nom et la référence restent modifiables. Un lot possédant un historique ne peut plus être supprimé. Une référence initiale erronée après création de mouvements doit être traitée par une procédure de correction métier à définir ; le patch ne propose pas de réécriture silencieuse de l'état initial.

Les transferts atomiques entre lots ne sont pas inclus dans cette première version. Ne pas utiliser deux mouvements manuels comme équivalent garanti d'un transfert : cette opération liée nécessitera un développement dédié.

## Annulation et cohérence

Les administrateurs peuvent annuler un mouvement en précisant un motif. Il reste au journal avec auteur et horodatage de l'annulation ; ses variations sont exclues des calculs. Il n'est ni supprimé ni modifié dans ses valeurs d'origine.

L'annulation corrige rétroactivement l'historique ; il ne s'agit pas d'une nouvelle sortie/entrée effective à la date du jour. Les effectifs « après mouvement » sont donc la reconstitution corrigée tenant compte des annulations connues, pas une copie de ce qui était affiché lors de la saisie originale.

Toute création ou annulation verrouille le lot en transaction. Le serveur vérifie le cumul à chaque point de l'historique : aucun effectif ne peut être négatif ni dépasser 2 147 483 647 pour un sexe, y compris après un événement rétroactif ou l'annulation d'une entrée dont dépend une sortie ultérieure. Une opération invalide est annulée en base.

La création porte un UUID de demande par lot : rejouer exactement la même demande ne crée pas un doublon. Réutiliser l'UUID avec d'autres valeurs provoque un conflit. Le frontend conserve cet UUID pendant une tentative afin de permettre une reprise après une erreur réseau.

## Droits

- ADMIN : lecture, ajout de mouvement et annulation.
- EDITOR : lecture et ajout de mouvement.
- VIEWER : lecture uniquement.
- RESTRICTED : entrée dans l'application refusée comme auparavant.

Les mutations restent protégées par CSRF et par les droits du backend. Le compte auteur est lu depuis la session, pas depuis le corps de la requête.

## Diagramme et relevés calculés

L'évolution est calculée sur PostgreSQL à partir de la référence initiale et des mouvements non annulés. Chaque jour sans mouvement reprend le dernier effectif calculé : c'est un état comptable du cheptel d'après les saisies, pas une observation physique ou un poids mesuré.

La vue par jour renvoie le solde de fin de chaque date. La vue par semaine inclut le début de la période, les fins de semaines d'élevage (J7, J14...) et la fin de période, même si la dernière semaine est incomplète. Les segments du graphique relient ces points échantillonnés. Les séries se distinguent par couleur et motif de trait ; chacune peut être masquée, et les valeurs restent accessibles dans un tableau.

Par défaut : dernière année ou depuis J1 si le lot est plus récent. Une plage personnalisée jusqu'à dix ans est possible. Pour obtenir un relevé à une date précise, utiliser une période allant de cette date à elle-même.

Un lot sans date de mise en place conserve un état « date à renseigner » ; le backend refuse les mouvements et le diagramme tant que J1 manque.

## API

- GET /api/lots/{id}/movements?page=0&size=20&order=desc (ou asc).
- POST /api/lots/{id}/movements : requestId, type, effectiveDate, males, females, reason.
- POST /api/lots/{id}/movements/{movementId}/cancel : reason.
- GET /api/lots/{id}/evolution?interval=week&from=AAAA-MM-JJ&to=AAAA-MM-JJ.

Les réponses des lots ajoutent initialMaleCount, initialFemaleCount, movementCount et timeZone. maleCount/femaleCount sont désormais les effectifs présents calculés. Lors d'une modification des métadonnées, le formulaire transmet les effectifs initiaux.

Les nouvelles routes sont identifiées dans les logs HTTP du workflow sans journaliser les corps ni motifs des mouvements.

## Validation réalisée et limites

- Build TypeScript/Vite et ESLint : réussis.
- Six groupes de tests frontend : dates/semaines et sélection du module/sidebar réussis.
- SQL réel des cumuls fenêtrés testé sur SQLite : ordre effectif, rétroactivité, soldes, annulations et événements conservés. Ce test portable ne vérifie pas les spécificités PostgreSQL, le moteur Spring ou les transactions concurrentes.
- Syntaxe du script de test HTTP vérifiée ; application du patch contrôlée sur l'empilement des patches précédents.

Compilation et tests Java/Spring, exécution PostgreSQL/HTTP et vérification visuelle dans un navigateur non réalisés dans l'environnement de préparation. Compilateur Java 25, dépendances Maven et instance Docker requis pour ces contrôles.

Contrôles locaux :

```bash
python3 scripts/test-lot-ledger-window.py
cd frontend
node --experimental-strip-types --test tests/lot-age.test.mjs tests/lot-navigation.test.mjs
```

Avec l'application démarrée et les comptes de test admin/lecteur :

```bash
python3 scripts/test-lot-workflow.py http://localhost:8080
```

Ce test HTTP vérifie notamment les droits, la rétroactivité, la reprise idempotente, une annulation impossible puis possible, les courbes, le verrouillage des valeurs initiales et deux sorties concurrentes. Il crée un lot AUDIT-* et conserve ses mouvements pour inspection : le journal interdit volontairement la suppression d'un lot ayant un historique.

Parcours manuel : Lots > Voir le lot > Ajouter un mouvement > Mortalité > choisir date/quantités/motif > Enregistrer. Comparer ensuite historique, chronologie et évolution. Tester aussi au clavier et à petite largeur les dialogues, liens de sidebar, tableaux défilants et légende du diagramme.
