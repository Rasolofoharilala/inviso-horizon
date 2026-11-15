# Horizon : React + Spring Boot + PostgreSQL

Configuration locale, frontend compile et servi par Nginx, sans rechargement a chaud.
Ce pack contient uniquement la configuration Docker, pas les sources du projet.

## Dossiers

- backend/ : mettre ici le contenu du projet Spring Initializr (pom.xml, mvnw,
  .mvn/, src/), avec le Dockerfile fourni.
- frontend/ : mettre ici le projet React TypeScript Vite (package.json,
  package-lock.json, index.html, src/, fichiers tsconfig et vite.config), avec
  le Dockerfile et nginx.conf fournis.
- compose.yaml et .env.example : a la racine, a cote des deux dossiers.

Conserver les fichiers sources existants. Si ton backend s'appelle horizon/,
renommer ce dossier en backend/ ou remplacer ./backend dans compose.yaml par
./horizon. Ne pas conserver le precedent Compose a l'interieur du backend.

## Lancer (PowerShell, racine du projet)

```powershell
Copy-Item .env.example .env
notepad .env
```

Renseigner POSTGRES_PASSWORD avec un mot de passe non vide. Utiliser des quotes
simples autour de la valeur si elle contient $ ou #. Ajouter les lignes de
.gitignore-snippet au .gitignore existant, sans le remplacer.

```powershell
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Ouvrir http://localhost:8080. Seul Nginx expose un port local ; le backend et
PostgreSQL sont accessibles entre conteneurs via backend:8080 et postgres:5432.
Ne pas utiliser ces noms Docker depuis le navigateur.

## Contrat frontend/backend

Dans React, utiliser des URL relatives : fetch('/api/articles'). Nginx transmet
/api/articles sans retirer /api. Les controllers Java doivent donc exposer
ces routes, par exemple @RequestMapping("/api/articles"). Ne pas ajouter en
plus un context-path /api si les controllers possedent deja ce prefixe.
Le pack ne cree aucune route metier et ne desactive pas Spring Security.
Les routes authentifiees exigent la configuration de securite prevue (y compris
CSRF si des sessions/cookies sont utilises). Une 401 sans authentification est
normale ; une 502 peut apparaitre pendant le demarrage du backend.
Une connexion SSO ou une page /login necessitera des regles de proxy adaptees.

## Construire et mettre a jour

npm ci exige package-lock.json synchronise avec package.json. Le generer avec
npm install (localement ou dans un conteneur Node) puis le versionner dans Git.
Les variables VITE_* sont publiques et integrees lors du build : aucun secret
ni mot de passe ne doit y etre place. Avec /api, aucune URL backend VITE n'est
necessaire. Ne pas reutiliser un fichier .env secret pour le build frontend.

```powershell
# Reconstruire apres modification du code
docker compose up --build -d
# Arreter sans effacer la base
docker compose down
# Console SQL
docker compose exec postgres psql -U horizon -d horizon
```

## Base et ressources

PostgreSQL 18.6 utilise un volume monte sur /var/lib/postgresql. Ne pas lancer
'docker compose down -v' sauf pour supprimer volontairement les donnees.
Un volume existant conserve son mot de passe ; changer .env seul ne le change pas.
Flyway gere les migrations dans src/main/resources/db/migration. Hibernate
valide le schema (ddl-auto=validate). Le pom.xml doit inclure le module
flyway-database-postgresql en plus de Flyway (normalement genere par Initializr).
Le role POSTGRES_USER est administrateur de la base locale : adapter les droits
et les secrets avant un deploiement en production, avec TLS et sauvegardes.

Plafonds locaux initiaux : backend 1 Gio, PostgreSQL 512 Mio, Nginx 128 Mio.
Ce ne sont pas un dimensionnement de production. La compilation et Docker ont
besoin de ressources supplementaires. Pool SQL limite a 10 connexions.
Les tests Java sont ignores pendant le build Docker afin de ne pas exiger une
base de test pendant la construction ; les executer separement avant livraison.
Les images utilisent certains tags evolutifs : figer les digests pour une livraison.
Docker Linux + Compose v2 doivent deja fonctionner sur ton poste ou serveur.
Aucune installation systeme ou elevation de privilege n'est realisee par ce pack.

## Verification

Syntaxe YAML et archive verifiees. Pas de compilation ni de lancement effectue :
les sources du projet et un moteur Docker ne sont pas disponibles ici.

Sources : https://docs.docker.com/compose/how-tos/startup-order/
https://nginx.org/en/docs/http/ngx_http_proxy_module.html
https://hub.docker.com/_/postgres
