# TTK Backend

API Express 5 et TypeScript de la marketplace multi-services TTK.

## Demarrage complet

```powershell
npm install
npm run infra:up
npm run db:migrate:docker
npm run admin:create:docker
npm run search:reindex:docker
```

`admin:create` ne doit etre execute qu'une seule fois. PostgreSQL garantit
qu'un deuxieme compte `ADMIN` ne peut pas etre cree.

Services disponibles :

- API : `http://localhost:3000`
- Health check : `http://localhost:3000/api/v1/health`
- Swagger : `http://localhost:3000/docs`
- Meilisearch : `http://localhost:7700`

Pour arreter tous les conteneurs :

```powershell
npm run infra:down
```

## Commandes

| Commande | Description |
| --- | --- |
| `npm run dev` | Demarre uniquement l'API en mode watch |
| `npm run typecheck` | Verifie les types |
| `npm run build` | Compile dans `dist/` |
| `npm start` | Execute la version compilee |
| `npm run infra:up` | Demarre API, workers, PostgreSQL, Redis et Meilisearch |
| `npm run infra:down` | Arrete tous les conteneurs |
| `npm run db:migrate` | Applique les migrations depuis la machine |
| `npm run db:migrate:docker` | Applique les migrations depuis l'API Docker |
| `npm run admin:create` | Cree l'unique admin depuis `.env` |
| `npm run admin:create:docker` | Cree ou reinitialise l'admin depuis Docker |
| `npm run worker:email` | Lance le worker BullMQ d'emails |
| `npm run worker:search` | Lance le worker d'indexation Meilisearch |
| `npm run search:reindex:docker` | Reconstruit tout l'index catalogue |

Le demarrage de l'API n'applique aucune migration et ne cree aucune donnee.

## Authentification

L'inscription se fait en deux etapes :

1. `POST /api/v1/auth/register` stocke le profil dans
   `pending_registrations` et place l'email OTP dans BullMQ.
2. `POST /api/v1/auth/register/verify` valide l'OTP et cree le compte dans
   `users`.

Routes :

| Methode | Route | Description |
| --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Commence une inscription |
| `POST` | `/api/v1/auth/register/verify` | Valide l'OTP |
| `POST` | `/api/v1/auth/register/resend-otp` | Renvoie l'OTP |
| `POST` | `/api/v1/auth/login` | Connexion |
| `POST` | `/api/v1/auth/refresh` | Rotation du refresh token |
| `POST` | `/api/v1/auth/logout` | Revoque un refresh token |
| `POST` | `/api/v1/auth/forgot-password` | Demande un OTP de reinitialisation |
| `POST` | `/api/v1/auth/reset-password` | Reinitialise le mot de passe |
| `POST` | `/api/v1/auth/change-password` | Change le mot de passe connecte |
| `GET` | `/api/v1/auth/me` | Retourne le profil connecte |

Les routes protegees utilisent `Authorization: Bearer <accessToken>`.
La revocation d'un utilisateur bloque immediatement les appels authentifies
et revoque ses refresh tokens.

## Catalogue

Un service est de type :

- `PRODUCTS` : produits, images et modalites tarifaires;
- `FORM` : formulaire dynamique configure par l'admin.

Le champ technique `email` est interdit dans les formulaires dynamiques.
L'email doit toujours provenir du compte connecte.

Routes publiques :

- `GET /api/v1/catalog/services`
- `GET /api/v1/catalog/services/:slug`
- `GET /api/v1/catalog/services/:slug/products`
- `GET /api/v1/catalog/products/:id`

Les mutations sont sous `/api/v1/catalog/admin` et exigent le role `ADMIN`.
Les statuts `ACTIVE`, `SUSPENDED` et `DELETED` permettent la pause, la
suppression logique et la restauration.

L'administration des utilisateurs est disponible sous
`/api/v1/users/admin`.

### Devises et reductions

`GET /api/v1/catalog/currencies` retourne :

- `USD` : dollar americain;
- `CDF` : franc congolais.

Le prix appartient a chaque modalite, car un produit peut avoir plusieurs
forfaits ou modes de vente. Une modalite expose `price` et `oldPrice`.

Pour appliquer une reduction :

```http
PATCH /api/v1/catalog/admin/products/:productId/modalities/:modalityId/discount
Authorization: Bearer <adminAccessToken>
Content-Type: application/json

{ "price": 20 }
```

Le prix courant est conserve dans `old_price` et le nouveau prix devient
`price`. Supprimer la reduction restaure automatiquement l'ancien prix :

```http
DELETE /api/v1/catalog/admin/products/:productId/modalities/:modalityId/discount
```

### Recherche

`GET /api/v1/catalog/search?q=netflix` recherche dans Meilisearch. Le filtre
optionnel `kind=SERVICE` ou `kind=PRODUCT` limite le type de resultat.

Les modifications PostgreSQL publient des jobs dans Redis/BullMQ. Le worker
`search-worker` reconstruit ensuite les documents Meilisearch. PostgreSQL
reste la source de verite; Meilisearch sert uniquement aux recherches.

## Creer ou reinitialiser l'admin

Configurer dans `.env` :

```dotenv
ADMIN_NAME=Administrateur TTK
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=UnMotDePasseFort123
```

Puis executer :

```powershell
npm run admin:create:docker
```

La commande peut etre relancee avec le meme email pour changer le mot de
passe de test. Toutes les anciennes sessions admin sont alors revoquees.

Connexion :

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "UnMotDePasseFort123"
}
```

## Fonctionnement des donnees

- PostgreSQL conserve les utilisateurs, OTP hashes, refresh tokens, services,
  produits, images, modalites, devises et prix.
- Redis conserve les files BullMQ pour les emails OTP et l'indexation.
- Meilisearch contient une copie optimisee des services et produits actifs.
- Suspendre ou supprimer un service/produit le retire de la recherche.
- Les volumes Docker conservent les donnees apres `infra:down`.

Connexion pgAdmin locale :

```text
Host: 127.0.0.1
Port: 55432
Database: ttk_db
Username: ttk_admin
Password: valeur de DB_PASSWORD dans .env
```

Le port hote `55432` evite les conflits avec une autre installation
PostgreSQL Windows utilisant deja `5432`. Entre les conteneurs, PostgreSQL
continue d'utiliser son port standard `5432`.

## Configuration

Copier `.env.example` vers `.env`, puis remplacer tous les secrets et les
identifiants SMTP. Les principaux groupes sont :

- HTTP : `HOST`, `PORT`, `API_PREFIX`, `CORS_ORIGIN`;
- donnees : `DATABASE_URL`, `REDIS_URL`, `MEILI_HOST`;
- securite : `JWT_SECRET`, durees OTP/JWT;
- email : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`;
- admin initial : `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

Ne jamais versionner `.env`.

## Architecture

```text
src/
|-- modules/
|   |-- auth/
|   |-- users/
|   `-- catalog/
|-- core/
|   |-- config/
|   |-- database/
|   |-- middlewares/
|   |-- queues/
|   |-- types/
|   `-- utils/
|-- app.ts
`-- server.ts
```

Les imports locaux utilisent toujours l'extension compilee `.js`.
