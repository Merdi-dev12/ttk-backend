# Sauvegarde Et Securite En Production

Ce projet est prevu pour tourner sur le VPS avec Docker Compose, sans avoir
besoin de `npm` sur le serveur :

```bash
docker compose down
docker compose up -d --build
```

Le fichier `.env` du VPS n'est pas versionne par Git. Il doit rester uniquement
sur le serveur et ne doit jamais etre pousse sur GitHub.

## Ce Qu'il Faut Sauvegarder

Les donnees importantes sont stockees dans :

- PostgreSQL : utilisateurs, services, produits, parametres, refresh tokens.
- MinIO : images et videos uploadees.
- Meilisearch : index de recherche, reconstructible depuis PostgreSQL.
- `.env` : secrets de production et identifiants externes.

Les deux elements les plus critiques sont PostgreSQL et MinIO. Meilisearch peut
etre reconstruit avec la commande de reindexation.

## Sauvegarde Manuelle

Depuis `/var/www/ttk-services` sur le VPS :

```bash
chmod +x scripts/prod/*.sh
./scripts/prod/backup-all.sh
```

Cette commande cree :

```text
backups/postgres/postgres-YYYYMMDDTHHMMSSZ.dump
backups/volumes/ttk-backend-prod_minio_data-YYYYMMDDTHHMMSSZ.tar.gz
backups/volumes/ttk-backend-prod_meilisearch_data-YYYYMMDDTHHMMSSZ.tar.gz
```

Les fichiers sont crees en mode prive grace a `umask 077`.

## Sauvegarde Automatique

Creer un dossier de logs :

```bash
mkdir -p /var/www/ttk-services/logs
```

Ouvrir la crontab :

```bash
crontab -e
```

Ajouter une sauvegarde chaque jour a 02:15 UTC :

```cron
15 2 * * * cd /var/www/ttk-services && BACKUP_RETENTION_DAYS=14 ./scripts/prod/backup-all.sh >> logs/backup.log 2>&1
```

## Avec Un Seul VPS

Avec un seul VPS, tu peux deja te proteger contre :

- une mauvaise migration ;
- une suppression accidentelle ;
- une corruption logique de la base ;
- un mauvais deploiement ;
- une erreur humaine.

Mais si le disque du VPS tombe completement, les backups stockes sur le meme VPS
peuvent disparaitre aussi. La prochaine etape importante sera donc de copier le
dossier `backups/` hors du VPS.

Options recommandees :

- copier les backups vers ton PC avec `scp` ou `rsync` ;
- copier les backups vers Google Drive, OneDrive ou un autre stockage externe ;
- utiliser un stockage compatible S3 comme Cloudflare R2, Backblaze B2, Wasabi
  ou AWS S3 ;
- activer les snapshots automatiques chez ton fournisseur VPS si disponibles.

Exemple pour recuperer les backups sur ton ordinateur :

```bash
rsync -az merdi-dev@IP_DU_VPS:/var/www/ttk-services/backups/ ./ttk-backups/
```

## Restauration PostgreSQL

Si tu dois restaurer PostgreSQL :

```bash
CONFIRM_RESTORE=yes ./scripts/prod/restore-postgres.sh ./backups/postgres/postgres-YYYYMMDDTHHMMSSZ.dump
```

Apres restauration :

```bash
docker compose exec api node dist/core/search/reindex.js
docker compose ps
```

## Replication

La replication en temps reel demande au minimum une deuxieme destination :

- un deuxieme VPS ;
- une base PostgreSQL managée ;
- un service de stockage externe ;
- ou un serveur de backup.

Avec un seul VPS, on ne peut pas faire une vraie haute disponibilite. On peut
faire des sauvegardes, mais pas une replication qui survit a la perte totale du
serveur.

Quand tu auras une deuxieme destination, la meilleure approche sera :

- PostgreSQL principal sur le VPS actuel ;
- PostgreSQL standby sur le deuxieme serveur ;
- replication streaming PostgreSQL via reseau prive ou VPN WireGuard ;
- backups quotidiens envoyes hors du VPS ;
- tests de restauration reguliers.

## Checklist Securite Immediate

- Regenerer les secrets qui ont deja ete partages hors du VPS.
- Garder `TRUST_PROXY=1` quand Nginx est devant l'API sur le meme VPS.
- Garder `CORS_ORIGIN` strict, sans `*` en production.
- Garder le port API Docker lie a `127.0.0.1`, pas expose directement.
- Ne jamais executer `docker compose down -v` en production.
- Tester une restauration au moins une fois par mois.
- Copier les backups hors du VPS aussi souvent que possible.
