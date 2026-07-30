# AGENTS - TTK Backend

Ce fichier doit etre lu avant toute analyse ou modification du backend TTK.
Il complete les consignes utilisateur et prime sur les habitudes personnelles.

## Sources Officielles A Verifier

Avant d'utiliser une API, une librairie ou un pattern non trivial, verifier la
documentation officielle pertinente et citer la decision dans le compte rendu si
elle influence l'implementation.

- Node.js: environnement, `process.env`, ESM.
- Express: middleware, routing, production, securite.
- Docker Compose: differences dev/prod, volumes, ports, env.
- PostgreSQL, Redis/BullMQ, Meilisearch, MinIO/S3 selon la zone touchee.
- Supabase Auth et Resend si la demande touche l'auth ou les emails.
- OWASP pour secrets, auth, validation, stockage et exposition des donnees.

## Mission Backend

- Proteger la production et garder le local testable.
- Fournir des contrats API stables pour le front admin Angular et le front client React.
- Penser d'abord aux use cases utilisateur et systeme avant de coder.
- Refuser les donnees factices dans les flux metier sauf seed explicitement demande.
- Ne pas casser les donnees existantes, les volumes Docker ou les migrations deja appliquees.

## Architecture

- Garder le monolithe modulaire: `src/modules/<domaine>`.
- Chaque domaine expose ses routes, schemas, controller et service.
- Les controllers restent fins: validation deja faite, orchestration minimale.
- La logique metier va dans les services du module concerne.
- Le code partage va dans `src/core`, pas dans un module metier au hasard.
- Ne pas creer d'abstraction si elle ne reduit pas une vraie duplication ou complexite.

## Limite De Taille

- Viser moins de 300 lignes par fichier source.
- Au-dela, extraire sous-services, helpers, schemas ou templates.
- Exception acceptable: migrations SQL, documents Swagger volumineux, seeds riches ou templates email complexes quand la decomposition nuirait a la lisibilite.

## Configuration Et Secrets

- Aucun secret, token, URL API, cle, port ou credential en dur.
- Toute configuration backend passe par `src/core/config/env.ts`.
- Toute nouvelle variable doit etre validee par Joi.
- `.env` local et `.env` prod restent separes et non versionnes.
- Ne jamais exposer directement MinIO, PostgreSQL, Redis ou Meilisearch en prod autrement que prevu par Compose/Nginx.

## Local Vs Production

- Local: utiliser `.env` + `compose.dev.yaml` + scripts npm.
- Production VPS: utiliser `.env` du serveur + `compose.yaml` avec `docker compose up -d --build`.
- Ne jamais supposer que les valeurs locales existent en prod.
- Ne jamais utiliser `docker compose down -v` en prod.
- Les migrations doivent etre idempotentes et compatibles avec les donnees existantes.

## API Et Contrats Front

- Toujours documenter les endpoints utiles au front: methode, URL, auth, body, query, reponse.
- Ne pas renommer des champs publics sans strategie de compatibilite.
- Les listes admin doivent rester paginees et filtrables.
- Les erreurs doivent suivre le format existant: `status`, `code`, `message`.
- Les routes admin exigent `authenticate` + `requireRole('ADMIN')`.
- Les routes utilisateur lisent uniquement les donnees appartenant a l'utilisateur authentifie.

## Securite

- Toujours valider `body`, `params`, `query` avec Joi.
- Utiliser des requetes SQL parametrees, jamais d'interpolation utilisateur.
- Ne jamais logger de secrets, mots de passe, OTP, tokens ou payloads sensibles.
- Les operations lentes ou externes passent par BullMQ quand elles peuvent etre asynchrones.
- Garder CORS strict en prod et explicite en local.
- Garder `trust proxy` configure par env, pas en dur.

## Donnees Et Stockage

- Les donnees critiques sont PostgreSQL et MinIO.
- Les index Meilisearch sont reconstructibles.
- Avant tout changement destructif, proposer une sauvegarde.
- Les uploads doivent passer par le module storage et retourner des URLs publiques coherentes.
- Les images/videos stockees doivent rester recuperables en local et prod via `STORAGE_PUBLIC_BASE_URL`.

## Emails Et Notifications

- Resend est prioritaire si configure; SMTP sert de fallback.
- Les emails clients ne doivent pas bloquer une requete HTTP critique si une queue suffit.
- Les notifications admin ne remplacent pas les vrais modules metier: commandes dans commandes, contact dans contact.
- Les templates email doivent rester sobres, professionnels, responsive et sans duplication de marque.

## Verification

Apres modification backend:

- `npm run typecheck`
- `npm run build`
- `docker compose --env-file .env -f compose.dev.yaml config --quiet` si Compose est touche.
- `docker compose --env-file .env.production.example -f compose.yaml config --quiet` si prod est touchee.

## Collaboration Full-Stack

Si une demande touche un parcours complet, verifier aussi les contrats attendus
par:

- Admin Angular: `C:\Users\YOGA\Documents\Projets\ttk-services\ttk-frontend`
- Client React: `C:\Users\YOGA\Documents\ttk`

Ne pas inventer d'UI depuis le backend: fournir plutot le contrat API propre,
les etats possibles et les erreurs attendues.
