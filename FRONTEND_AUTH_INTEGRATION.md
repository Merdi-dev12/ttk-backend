# Intégration Auth React

## Configuration

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_GOOGLE_CLIENT_ID=<même GOOGLE_CLIENT_ID que le backend>
```

Dans Google Cloud Console, le Client OAuth doit être de type **Application Web**.
Ajouter dans **Origines JavaScript autorisées** :

```text
http://localhost:5173
```

Le flux utilisé repose sur Google Identity Services et un ID token. Il ne faut
pas ajouter d’URI de redirection pour ce flux, et le frontend ne doit jamais
recevoir `GOOGLE_CLIENT_SECRET`, `SMTP_PASS` ou `JWT_SECRET`.

## Installation

```bash
npm install @react-oauth/google
```

## Provider React

```tsx
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

root.render(
  <GoogleOAuthProvider clientId={googleClientId}>
    <App />
  </GoogleOAuthProvider>
);
```

## Bouton Google

```tsx
import { GoogleLogin } from '@react-oauth/google';

type AuthResponse = {
  status: 'success';
  data: {
    user: {
      id: string;
      nom: string;
      postnom: string | null;
      email: string;
      role: 'USER' | 'ADMIN';
      status: 'ACTIVE' | 'REVOKED';
      avatar_url: string | null;
      created_at: string;
    };
    accessToken: string;
    refreshToken: string;
  };
};

async function authenticateWithGoogle(credential: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}/auth/google`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.message ?? 'Connexion Google impossible');
  }
  return payload as AuthResponse;
}

export function GoogleSignInButton() {
  return (
    <GoogleLogin
      onSuccess={async ({ credential }) => {
        if (!credential) return;
        const auth = await authenticateWithGoogle(credential);
        // Stocker selon la stratégie de session du frontend.
        console.log(auth.data.user);
      }}
      onError={() => console.error('Fenêtre Google fermée ou refusée')}
      useOneTap={false}
    />
  );
}
```

## Contrat HTTP

```http
POST /api/v1/auth/google
Content-Type: application/json
```

```json
{
  "credential": "<ID token fourni par GoogleLogin>"
}
```

Réponse `200` :

```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "uuid",
      "nom": "Mariam",
      "postnom": "Ilunga",
      "email": "mariam@example.com",
      "role": "USER",
      "status": "ACTIVE",
      "avatar_url": "https://lh3.googleusercontent.com/...",
      "created_at": "2026-06-24T10:00:00.000Z"
    },
    "accessToken": "<JWT TTK>",
    "refreshToken": "<refresh token TTK>"
  }
}
```

Le renouvellement et la déconnexion restent identiques :

```text
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Erreurs Google importantes :

- `401 INVALID_GOOGLE_TOKEN` : ID token expiré, falsifié ou mauvais Client ID.
- `403 ACCOUNT_REVOKED` : compte bloqué par l’administrateur.
- `409 GOOGLE_ACCOUNT_CONFLICT` : conflit de liaison de comptes.
- `429` : trop de tentatives.
- `503 GOOGLE_AUTH_NOT_CONFIGURED` : Client ID absent du backend.
