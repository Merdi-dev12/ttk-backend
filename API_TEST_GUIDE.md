# Guide complet de test de l'API TTK

Base URL :

```text
http://localhost:3000/api/v1
```

Swagger :

```text
http://localhost:3000/api-docs
```

## 1. Demarrage initial

```powershell
npm run infra:up
npm run db:migrate:docker
npm run admin:create:docker
npm run search:reindex:docker
```

Verifier les conteneurs :

```powershell
docker compose ps
```

## 2. Variables a conserver pendant les tests

Les reponses de l'API fournissent les identifiants a reutiliser :

```text
ADMIN_ACCESS_TOKEN
USER_ACCESS_TOKEN
REFRESH_TOKEN
USER_ID
SERVICE_PRODUCTS_ID
SERVICE_FORM_ID
PRODUCT_ID
IMAGE_ID
MODALITY_ID
FIELD_ID
```

Pour une route protegee :

```http
Authorization: Bearer ADMIN_ACCESS_TOKEN
Content-Type: application/json
```

## 3. Creation et connexion de l'admin

Configurer `.env` :

```dotenv
ADMIN_NAME=Administrateur TTK
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=AdminPassword123
```

Creer ou reinitialiser l'admin :

```powershell
npm run admin:create:docker
```

### POST `/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "AdminPassword123"
}
```

Conserver `data.accessToken` dans `ADMIN_ACCESS_TOKEN` et
`data.refreshToken` dans `REFRESH_TOKEN`.

## 4. Parcours d'inscription utilisateur

### POST `/auth/register`

```json
{
  "nom": "Mariam",
  "postnom": "Kabasele",
  "email": "mariam@example.com",
  "password": "StrongPass123"
}
```

Le profil est stocke dans `pending_registrations`. L'OTP est envoye par le
worker email BullMQ. Aucun utilisateur definitif n'existe encore.

### POST `/auth/register/resend-otp`

```json
{
  "email": "mariam@example.com"
}
```

### POST `/auth/register/verify`

```json
{
  "email": "mariam@example.com",
  "otp": "123456"
}
```

Utiliser le vrai code recu par email. Apres validation, la ligne temporaire
est supprimee et le compte est cree dans `users`.

### POST `/auth/login`

```json
{
  "email": "mariam@example.com",
  "password": "StrongPass123"
}
```

Conserver `data.accessToken` dans `USER_ACCESS_TOKEN`,
`data.refreshToken` dans `REFRESH_TOKEN` et `data.user.id` dans `USER_ID`.

### GET `/auth/me`

Pas de corps JSON.

```http
Authorization: Bearer USER_ACCESS_TOKEN
```

### POST `/auth/refresh`

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

L'ancien refresh token devient invalide. Remplacer les deux tokens par ceux
de la nouvelle reponse.

### POST `/auth/logout`

```json
{
  "refreshToken": "REFRESH_TOKEN"
}
```

### POST `/auth/change-password`

```http
Authorization: Bearer USER_ACCESS_TOKEN
```

```json
{
  "currentPassword": "StrongPass123",
  "newPassword": "NewStrongPass456"
}
```

Tous les refresh tokens du compte sont revoques.

### POST `/auth/forgot-password`

```json
{
  "email": "mariam@example.com"
}
```

### POST `/auth/reset-password`

```json
{
  "email": "mariam@example.com",
  "otp": "123456",
  "newPassword": "ResetStrongPass789"
}
```

## 5. Devises

### GET `/catalog/currencies`

Pas de corps JSON. La reponse contient :

```json
{
  "status": "success",
  "data": {
    "currencies": [
      {
        "code": "CDF",
        "name": "Franc congolais",
        "symbol": "FC",
        "decimal_places": 2
      },
      {
        "code": "USD",
        "name": "Dollar americain",
        "symbol": "$",
        "decimal_places": 2
      }
    ]
  }
}
```

## 6. Service avec produits : Abonnements

Toutes les routes `/catalog/admin/*` exigent `ADMIN_ACCESS_TOKEN`.

### POST `/catalog/admin/services`

```json
{
  "name": "Abonnements",
  "description": "Abonnements aux plateformes numeriques",
  "imageUrl": "https://example.com/services/subscriptions.jpg",
  "type": "PRODUCTS"
}
```

Conserver `data.service.id` dans `SERVICE_PRODUCTS_ID`.

### GET `/catalog/admin/services?page=1&limit=20&type=PRODUCTS&status=ACTIVE`

Pas de corps JSON.

### PATCH `/catalog/admin/services/SERVICE_PRODUCTS_ID`

Tous les champs sont optionnels, mais au moins un est requis :

```json
{
  "name": "Abonnements premium",
  "description": "Catalogue des abonnements disponibles",
  "imageUrl": "https://example.com/services/subscriptions-v2.jpg"
}
```

### PATCH `/catalog/admin/services/SERVICE_PRODUCTS_ID/status`

Suspendre :

```json
{
  "status": "SUSPENDED"
}
```

Supprimer logiquement :

```json
{
  "status": "DELETED"
}
```

Restaurer :

```json
{
  "status": "ACTIVE"
}
```

### POST `/catalog/admin/services/SERVICE_PRODUCTS_ID/products`

```json
{
  "name": "Netflix",
  "description": "Acces aux films et series Netflix",
  "adminNote": "Verifier le stock avant activation",
  "images": [
    {
      "url": "https://example.com/products/netflix-main.jpg",
      "isPrimary": true,
      "displayOrder": 0
    },
    {
      "url": "https://example.com/products/netflix-secondary.jpg",
      "isPrimary": false,
      "displayOrder": 1
    }
  ],
  "modalities": [
    {
      "label": "1 mois",
      "price": 10,
      "currency": "USD",
      "availability": "AVAILABLE",
      "additionalAttributes": {
        "screens": 1,
        "quality": "HD"
      }
    },
    {
      "label": "3 mois",
      "price": 75000,
      "currency": "CDF",
      "availability": "AVAILABLE",
      "additionalAttributes": {
        "screens": 2,
        "quality": "Full HD"
      }
    }
  ]
}
```

Conserver les valeurs suivantes :

```text
data.product.id -> PRODUCT_ID
data.product.images[0].id -> IMAGE_ID
data.product.modalities[0].id -> MODALITY_ID
```

### GET `/catalog/admin/services/SERVICE_PRODUCTS_ID/products?page=1&limit=20`

Pas de corps JSON.

### GET `/catalog/admin/products/PRODUCT_ID`

Pas de corps JSON. Cette vue inclut `admin_note`.

### PATCH `/catalog/admin/products/PRODUCT_ID`

```json
{
  "name": "Netflix Premium",
  "description": "Nouvelle description du produit",
  "adminNote": "Note interne invisible pour les clients"
}
```

### PATCH `/catalog/admin/products/PRODUCT_ID/status`

```json
{
  "status": "SUSPENDED"
}
```

Valeurs autorisees : `ACTIVE`, `SUSPENDED`, `DELETED`.

## 7. Images d'un produit

### POST `/catalog/admin/products/PRODUCT_ID/images`

```json
{
  "url": "https://example.com/products/netflix-third.jpg",
  "isPrimary": false,
  "displayOrder": 2
}
```

### PATCH `/catalog/admin/products/PRODUCT_ID/images/IMAGE_ID`

```json
{
  "url": "https://example.com/products/netflix-updated.jpg",
  "isPrimary": true,
  "displayOrder": 0
}
```

Une seule image principale est conservee automatiquement.

### DELETE `/catalog/admin/products/PRODUCT_ID/images/IMAGE_ID`

Pas de corps JSON. Si l'image principale est supprimee, une autre image
devient automatiquement principale.

## 8. Modalites, prix et reductions

### POST `/catalog/admin/products/PRODUCT_ID/modalities`

```json
{
  "label": "1 an",
  "price": 100,
  "currency": "USD",
  "availability": "ON_REQUEST",
  "additionalAttributes": {
    "screens": 4,
    "quality": "4K"
  }
}
```

Disponibilites autorisees :

```text
AVAILABLE
UNAVAILABLE
ON_REQUEST
```

### PATCH `/catalog/admin/products/PRODUCT_ID/modalities/MODALITY_ID`

```json
{
  "label": "1 mois premium",
  "price": 12,
  "currency": "USD",
  "availability": "AVAILABLE",
  "additionalAttributes": {
    "screens": 2,
    "quality": "Full HD"
  }
}
```

Modifier directement `price` retire une eventuelle reduction existante.

### PATCH `/catalog/admin/products/PRODUCT_ID/modalities/MODALITY_ID/discount`

Le nouveau prix doit etre inferieur au prix actuel :

```json
{
  "price": 8
}
```

Exemple de resultat :

```json
{
  "old_price": "10.00",
  "price": "8.00",
  "currency": "USD"
}
```

### DELETE `/catalog/admin/products/PRODUCT_ID/modalities/MODALITY_ID/discount`

Pas de corps JSON. `price` reprend la valeur de `old_price`, puis
`old_price` devient `null`.

### DELETE `/catalog/admin/products/PRODUCT_ID/modalities/MODALITY_ID`

Pas de corps JSON.

## 9. Service avec formulaire : Pret d'argent

### POST `/catalog/admin/services`

```json
{
  "name": "Pret d'argent",
  "description": "Demande de financement via formulaire",
  "imageUrl": "https://example.com/services/loan.jpg",
  "type": "FORM"
}
```

Conserver `data.service.id` dans `SERVICE_FORM_ID`.

### POST `/catalog/admin/services/SERVICE_FORM_ID/fields`

Champ nombre :

```json
{
  "technicalName": "montant_souhaite",
  "label": "Montant souhaite",
  "fieldType": "NUMBER",
  "required": true,
  "displayOrder": 1
}
```

Champ select :

```json
{
  "technicalName": "duree_remboursement",
  "label": "Duree de remboursement",
  "fieldType": "SELECT",
  "required": true,
  "options": [
    "3 mois",
    "6 mois",
    "12 mois"
  ],
  "displayOrder": 2
}
```

Champ fichier :

```json
{
  "technicalName": "piece_identite",
  "label": "Piece d'identite",
  "fieldType": "FILE",
  "required": true,
  "displayOrder": 3
}
```

Champ texte optionnel :

```json
{
  "technicalName": "motif",
  "label": "Motif de la demande",
  "fieldType": "TEXTAREA",
  "required": false,
  "displayOrder": 4
}
```

Types autorises :

```text
TEXT
NUMBER
DATE
SELECT
FILE
TEXTAREA
PHONE
```

`technicalName: "email"` est interdit. L'email proviendra du compte
authentifie dans le futur module de soumission.

Conserver `data.field.id` dans `FIELD_ID`.

### PATCH `/catalog/admin/services/SERVICE_FORM_ID/fields/FIELD_ID`

```json
{
  "label": "Montant total souhaite",
  "required": true,
  "displayOrder": 1
}
```

Pour modifier les choix d'un champ `SELECT` :

```json
{
  "options": [
    "3 mois",
    "6 mois",
    "9 mois",
    "12 mois"
  ]
}
```

### DELETE `/catalog/admin/services/SERVICE_FORM_ID/fields/FIELD_ID`

Pas de corps JSON.

## 10. Routes publiques du catalogue

### GET `/catalog/services?page=1&limit=20`

Liste uniquement les services `ACTIVE`.

### GET `/catalog/services/abonnements`

Retourne le service public.

### GET `/catalog/services/abonnements/products?page=1&limit=20`

Retourne les produits actifs avec leurs images et modalites.
`admin_note` n'est jamais expose publiquement.

### GET `/catalog/products/PRODUCT_ID`

Retourne un produit actif.

### GET `/catalog/services/pret-d-argent`

Pour un service `FORM`, retourne aussi les champs dynamiques.

## 11. Recherche Meilisearch

### GET `/catalog/search?q=Netflix&page=1&limit=20`

Recherche les services et les produits.

### GET `/catalog/search?q=Netflix&kind=PRODUCT&page=1&limit=20`

Recherche uniquement les produits.

### GET `/catalog/search?q=Abonnements&kind=SERVICE&page=1&limit=20`

Recherche uniquement les services.

PostgreSQL reste la source de verite. Redis/BullMQ transmet les changements
au worker `search-worker`, qui met Meilisearch a jour.

Reindexation manuelle :

```powershell
npm run search:reindex:docker
```

## 12. Administration des utilisateurs

### GET `/users/admin?page=1&limit=20`

Pas de corps JSON.

Filtres possibles :

```text
/users/admin?page=1&limit=20&status=ACTIVE
/users/admin?page=1&limit=20&status=REVOKED
/users/admin?page=1&limit=20&search=mariam
```

### PATCH `/users/admin/USER_ID/status`

Revoquer :

```json
{
  "status": "REVOKED"
}
```

Reactiver :

```json
{
  "status": "ACTIVE"
}
```

La revocation bloque les appels authentifies et invalide les refresh tokens.

## 13. Health check

### GET `/health`

Pas de corps JSON.

Exemple :

```json
{
  "status": "ok",
  "timestamp": "2026-06-13T20:00:00.000Z",
  "environment": "development"
}
```

## 14. Ce qui est implemente et ce qui reste

Implemente :

- inscription avec OTP;
- login, access token, refresh token et logout;
- changement et reinitialisation du mot de passe;
- admin unique et revocation des utilisateurs;
- services `PRODUCTS` et `FORM`;
- produits, images, modalites, devises et reductions;
- recherche Meilisearch synchronisee via Redis/BullMQ.

Pas encore implemente :

- soumission effective des formulaires dynamiques;
- commandes;
- paiement CinetPay;
- factures PDF;
- avis apres paiement;
- publicites et dashboard statistique.
