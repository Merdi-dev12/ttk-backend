# TTK Backend

API REST de la plateforme TTK, construite avec Express 5 et TypeScript selon
une architecture de monolithe modulaire.

Le démarrage HTTP est volontairement indépendant de PostgreSQL, Redis et
Meilisearch. L'API peut donc démarrer immédiatement; chaque module initialise
le client externe dont il a besoin au moment de son utilisation.

## Prérequis

- Node.js 20 ou une version LTS plus récente
- npm
- Docker Compose uniquement pour les services d'infrastructure locaux

## Démarrage rapide

```bash
npm install
npm run dev
```

Sans fichier `.env`, les valeurs par défaut suivantes sont utilisées :

- API : `http://localhost:3000`
- Health check : `http://localhost:3000/api/v1/health`
- Swagger UI : `http://localhost:3000/docs`
- Document OpenAPI JSON : `http://localhost:3000/docs.json`

Pour personnaliser la configuration :

```bash
cp .env.example .env
```

Sous PowerShell :

```powershell
Copy-Item .env.example .env
```

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre l'API en mode watch |
| `npm run start:dev` | Démarre l'API une fois avec TypeScript |
| `npm run typecheck` | Vérifie les types sans générer de fichiers |
| `npm run build` | Compile TypeScript dans `dist/` |
| `npm start` | Exécute la version compilée |
| `npm run infra:up` | Construit et démarre tous les conteneurs en arrière-plan |
| `npm run infra:down` | Arrête et supprime tous les conteneurs du projet |

## Configuration

Les variables HTTP ont des valeurs par défaut. Les variables d'infrastructure
sont optionnelles au démarrage et deviennent obligatoires uniquement lorsque
le client concerné est utilisé.

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `NODE_ENV` | `development` | Environnement d'exécution |
| `HOST` | `0.0.0.0` | Interface d'écoute |
| `PORT` | `3000` | Port HTTP |
| `API_PREFIX` | `/api/v1` | Préfixe des routes métier |
| `CORS_ORIGIN` | `*` | Origine autorisée par CORS |
| `DATABASE_URL` | aucune | Connexion PostgreSQL |
| `REDIS_URL` | aucune | Connexion Redis |
| `MEILI_HOST` | aucune | URL Meilisearch |
| `MEILI_MASTER_KEY` | aucune | Clé Meilisearch |
| `JWT_SECRET` | aucune | Secret JWT, 32 caractères minimum |

En production, définissez explicitement les secrets et une origine CORS
précise. Ne versionnez jamais le fichier `.env`.

## Infrastructure avec Docker

Pour lancer en arrière-plan l'API, PostgreSQL, Redis et Meilisearch :

```bash
npm run infra:up
```

Pour tout arrêter :

```bash
npm run infra:down
```

Compose fournit PostgreSQL, Redis et Meilisearch. Le démarrage de l'API ne
réalise aucune migration, aucun seed et ne lance aucun worker.

## Architecture cible

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── catalog/
│   ├── forms/
│   ├── orders/
│   ├── payments/
│   └── admin/
├── core/
│   ├── config/
│   ├── middlewares/
│   ├── queues/
│   └── utils/
├── app.ts
└── server.ts
```

Chaque module métier regroupe ses `routes.ts`, `controller.ts`, `service.ts`
et `schema.ts`. `app.ts` configure Express et monte les routes; `server.ts`
se limite à l'écoute HTTP et à l'arrêt propre du serveur.

## Swagger

La définition OpenAPI se trouve dans `src/core/config/swagger.ts`. Lors de
l'ajout d'une route, documentez son chemin, ses paramètres, ses schémas et ses
réponses dans ce document. Swagger UI est monté hors du préfixe métier sur
`/docs`, ce qui permet de modifier `API_PREFIX` sans casser la documentation.
