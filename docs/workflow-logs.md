# Suivi du workflow Horizon

Appliquer après horizon-session-profile.patch. Aucun changement de compose.yaml ni du frontend.

```bash
git apply --check horizon-workflow-logs.patch
git apply horizon-workflow-logs.patch
docker compose up -d --build backend
docker compose logs -f --tail=100 backend
```

Pour ne suivre que le journal du workflow :

```bash
docker compose logs -f --tail=100 backend | rg --line-buffered 'event='
```

Si rg est absent, utiliser `grep --line-buffered 'event='`.

Les événements utilisent le logger INFO `horizon.workflow` ; l'environnement Spring Boot standard l'affiche sans configuration supplémentaire. Ne pas activer les traces HTTP ni SQL pour utiliser ce patch.

## Événements

- HTTP_START / HTTP_END : famille de route, méthode, statut et durée en millisecondes pour chaque requête /api/. Les identifiants des produits/photos sont masqués dans les routes.
- ACCOUNT_LOOKUP / ACCOUNT_FOUND : recherche du compte, existence et état activé/désactivé.
- ACCOUNT_REJECTED : compte absent.
- ENTRY_REJECTED avec reason=restricted_role : rôle RESTRICTED bloqué par le contrôle Horizon.
- ENTRY_CHECK : rôle chargé ; cet événement ne signifie pas encore que le mot de passe est validé.
- LOGIN_SUCCESS : authentification réussie.
- LOGIN_FAILURE : type d'erreur Spring, sans message d'exception ni mot de passe. Spring peut envelopper une erreur de rôle dans une autre exception ; lire ENTRY_REJECTED avec le même requestId pour connaître la cause.
- AUTH_REQUIRED : session authentifiée absente/expirée.
- ACCESS_DENIED : refus de privilège ou CSRF ; HTTP_END confirme le statut de réponse.
- LOGOUT_SUCCESS : traitement de déconnexion achevé (acteur anonyme possible si aucune session).
- PHOTO_UPLOAD_START / PHOTO_UPLOAD_COMMITTED : envoi commencé puis transaction SQL validée.
- PHOTO_UPLOAD_ROLLBACK / PHOTO_CLEANUP_FAILED : annulation SQL ou échec de nettoyage du nouveau fichier.
- PHOTO_RESTORE_START / PHOTO_RESTORE_COMMITTED : restauration commencée puis validée en base.
- HTTP_EXCEPTION : exception non traitée ; seul son type est enregistré, statut technique 500. Les erreurs déjà traitées par Spring MVC apparaissent dans HTTP_END avec leur statut réel.

## Corrélation

Un UUID généré côté serveur associe tous les événements d'une même requête. Il est renvoyé dans l'en-tête X-Request-ID, visible dans Réseau > requête > en-têtes de réponse. Le frontend peut faire plusieurs requêtes successives (CSRF, login, profil) : chacune possède son propre UUID. Ce n'est pas un identifiant global de session.

Exemple indicatif pour un compte restreint :

```text
event=HTTP_START requestId=<uuid> method=POST route=/api/auth/login
event=ACCOUNT_LOOKUP requestId=<uuid> actor=restreint reason=started
event=ACCOUNT_FOUND requestId=<uuid> actor=restreint reason=enabled
event=ENTRY_REJECTED requestId=<uuid> actor=restreint reason=restricted_role
event=LOGIN_FAILURE requestId=<uuid> actor=anonymous reason=InternalAuthenticationServiceException
event=HTTP_END requestId=<uuid> method=POST route=/api/auth/login status=401 durationMs=...
```

Les identifiants utilisateur sont limités à 80 caractères et nettoyés contre les retours à la ligne. Aucun mot de passe, hash, cookie, jeton CSRF, identifiant de session, corps HTTP, nom de fichier original ou query string n'est enregistré par ce journal. Les identifiants des versions de photos sont journalisés après validation/annulation de transaction. Les autres logs Spring préexistants ne sont pas modifiés.

Les logs restent dans stdout Docker avec la rotation déjà définie dans Compose. Ce journal technique permet le diagnostic ; il n'est pas un audit durable en base.

## Vérification

Le patch a été vérifié par application sur les sources du patch précédent. Des tests JUnit sont inclus pour le nettoyage des identifiants, le masquage des chemins, la génération d'UUID et le nettoyage du contexte après une erreur.

Compilation/tests Java non exécutés dans l'environnement de préparation (Java 21 local, projet Java 25 ; dépendances Maven inaccessibles). À lancer avec Java 25 et Maven fonctionnel :

```bash
cd Backend
./mvnw -Dtest=WorkflowLoggingTests,DatabaseUserDetailsServiceTests test
```

Vérification sur l'instance : lancer le suivi des logs, tenter une connexion admin puis une connexion restreint, envoyer une photo et restaurer une ancienne version. Ne pas coller de mots de passe dans les commandes de diagnostic.
