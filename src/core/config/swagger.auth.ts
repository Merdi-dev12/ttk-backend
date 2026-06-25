import {
  errorResponse,
  internalError,
  jsonResponse,
  noContentResponse,
  requestBody,
  secure,
  unauthorizedError,
  validationError
} from './swagger.helpers.js';

const rateLimitError = errorResponse(
  "Trop de tentatives d'authentification ont été effectuées. Réessayez après le délai indiqué par les en-têtes RateLimit.",
  'RATE_LIMIT_EXCEEDED',
  'Too many requests, please try again later.'
);

export const authPaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Commencer une inscription',
      description:
        "Valide les informations, chiffre le mot de passe, crée ou remplace l'inscription temporaire et place l'email OTP dans Redis/BullMQ. Aucun utilisateur définitif n'est encore créé.",
      requestBody: requestBody('RegisterRequest'),
      responses: {
        '202': jsonResponse(
          "Les informations sont enregistrées dans pending_registrations et l'envoi de l'OTP est accepté.",
          'MessageResponse',
          {
            status: 'success',
            message: 'OTP envoyé. Validez votre email pour créer le compte.'
          }
        ),
        '400': validationError,
        '409': errorResponse(
          "L'adresse email appartient déjà à un compte validé.",
          'EMAIL_USED',
          'Cette adresse email est déjà utilisée'
        ),
        '429': rateLimitError,
        '500': internalError
      }
    }
  },
  '/auth/register/verify': {
    post: {
      tags: ['Auth'],
      summary: "Valider l'OTP et créer le compte",
      description:
        "Compare l'OTP, crée l'utilisateur actif à partir de pending_registrations, puis supprime l'inscription temporaire. Cette route ne connecte pas automatiquement l'utilisateur.",
      requestBody: requestBody('OtpRequest'),
      responses: {
        '201': jsonResponse(
          'Le compte utilisateur est définitivement créé et son profil public est retourné.',
          'UserResponse'
        ),
        '400': errorResponse(
          "Le JSON est invalide ou l'OTP ne correspond pas.",
          'INVALID_OTP',
          'OTP invalide'
        ),
        '404': errorResponse(
          "Aucune inscription en attente n'existe pour cet email.",
          'PENDING_REGISTRATION_NOT_FOUND',
          'Inscription en attente introuvable'
        ),
        '410': errorResponse(
          "L'OTP a dépassé sa durée de validité. Un nouvel OTP doit être demandé.",
          'OTP_EXPIRED',
          'OTP expiré'
        ),
        '429': rateLimitError,
        '500': internalError
      }
    }
  },
  '/auth/register/resend-otp': {
    post: {
      tags: ['Auth'],
      summary: "Renvoyer l'OTP d'inscription",
      description:
        "Génère un nouvel OTP, invalide le précédent et remet l'email dans la file d'envoi.",
      requestBody: requestBody('EmailRequest'),
      responses: {
        '202': jsonResponse(
          "Le nouvel OTP est généré et son envoi est accepté.",
          'MessageResponse',
          { status: 'success', message: 'Un nouvel OTP a été envoyé.' }
        ),
        '400': validationError,
        '404': errorResponse(
          "Aucune inscription en attente n'existe pour cet email.",
          'PENDING_REGISTRATION_NOT_FOUND',
          'Inscription en attente introuvable'
        ),
        '429': rateLimitError,
        '500': internalError
      }
    }
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Se connecter',
      description:
        "Vérifie les identifiants d'un compte validé et actif, puis retourne le profil, un access token court et un refresh token rotatif.",
      requestBody: requestBody('LoginRequest'),
      responses: {
        '200': jsonResponse(
          "L'authentification réussit. Utilisez accessToken dans Authorization: Bearer <token>.",
          'LoginResponse'
        ),
        '400': validationError,
        '401': errorResponse(
          "L'email ou le mot de passe est incorrect.",
          'INVALID_CREDENTIALS',
          'Email ou mot de passe incorrect'
        ),
        '403': errorResponse(
          "Le compte existe mais a été révoqué par l'administrateur.",
          'ACCOUNT_REVOKED',
          'Ce compte a été révoqué'
        ),
        '429': rateLimitError,
        '500': internalError
      }
    }
  },
  '/auth/google': {
    post: {
      tags: ['Auth'],
      summary: 'Se connecter avec Google',
      description:
        'Vérifie l’ID token Google, crée ou relie le compte par email vérifié, puis retourne les jetons TTK habituels.',
      requestBody: requestBody('GoogleLoginRequest'),
      responses: {
        '200': jsonResponse(
          'Le compte Google est authentifié et une session TTK est créée.',
          'LoginResponse'
        ),
        '400': validationError,
        '401': errorResponse(
          'Le jeton Google est invalide, expiré ou destiné à un autre Client ID.',
          'INVALID_GOOGLE_TOKEN',
          'Jeton Google invalide ou expiré'
        ),
        '403': errorResponse(
          'Le compte relié a été révoqué.',
          'ACCOUNT_REVOKED',
          'Ce compte a été révoqué'
        ),
        '409': errorResponse(
          'L’email et le compte Google correspondent à deux comptes différents.',
          'GOOGLE_ACCOUNT_CONFLICT',
          'Le compte Google entre en conflit avec un compte existant'
        ),
        '429': rateLimitError,
        '503': errorResponse(
          'GOOGLE_CLIENT_ID n’est pas configuré sur le backend.',
          'GOOGLE_AUTH_NOT_CONFIGURED',
          'La connexion Google n’est pas configurée'
        ),
        '500': internalError
      }
    }
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Renouveler les jetons',
      description:
        "Révoque le refresh token fourni et retourne une nouvelle paire de jetons. L'ancien refresh token ne peut plus être réutilisé.",
      requestBody: requestBody('RefreshRequest'),
      responses: {
        '200': jsonResponse(
          "Une nouvelle paire accessToken/refreshToken est créée.",
          'TokenResponse'
        ),
        '400': validationError,
        '401': errorResponse(
          "Le refresh token est invalide, expiré, révoqué ou déjà utilisé.",
          'INVALID_REFRESH_TOKEN',
          'Refresh token invalide'
        ),
        '429': rateLimitError,
        '500': internalError
      }
    }
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Se déconnecter',
      description:
        "Révoque le refresh token fourni. L'access token déjà émis reste valable jusqu'à son expiration.",
      requestBody: requestBody('RefreshRequest'),
      responses: {
        '204': noContentResponse(
          'Le refresh token est révoqué. La réponse ne contient aucun JSON.'
        ),
        '400': validationError,
        '500': internalError
      }
    }
  },
  '/auth/forgot-password': {
    post: {
      tags: ['Auth'],
      summary: 'Demander un OTP de réinitialisation',
      description:
        "Retourne volontairement le même message que l'email existe ou non, afin de ne pas révéler les comptes enregistrés.",
      requestBody: requestBody('EmailRequest'),
      responses: {
        '202': jsonResponse(
          "La demande est acceptée. Si le compte existe, l'OTP est placé dans la file email.",
          'MessageResponse',
          {
            status: 'success',
            message: 'Si ce compte existe, un OTP a été envoyé.'
          }
        ),
        '400': validationError,
        '429': rateLimitError,
        '500': internalError
      }
    }
  },
  '/auth/reset-password': {
    post: {
      tags: ['Auth'],
      summary: 'Réinitialiser le mot de passe avec OTP',
      description:
        "Vérifie l'OTP de récupération, remplace le mot de passe et révoque les refresh tokens existants.",
      requestBody: requestBody('ResetPasswordRequest'),
      responses: {
        '200': jsonResponse(
          'Le mot de passe est remplacé. Une nouvelle connexion est nécessaire.',
          'MessageResponse',
          { status: 'success', message: 'Mot de passe réinitialisé.' }
        ),
        '400': errorResponse(
          "Le JSON est invalide ou l'OTP ne correspond pas.",
          'INVALID_OTP',
          'OTP invalide'
        ),
        '429': rateLimitError,
        '500': internalError
      }
    }
  },
  '/auth/change-password': {
    post: {
      tags: ['Auth'],
      security: secure,
      summary: 'Changer le mot de passe du compte connecté',
      description:
        "Vérifie le mot de passe actuel, enregistre le nouveau et révoque les autres sessions.",
      requestBody: requestBody('ChangePasswordRequest'),
      responses: {
        '200': jsonResponse(
          'Le mot de passe est modifié et les refresh tokens précédents sont révoqués.',
          'MessageResponse',
          {
            status: 'success',
            message:
              'Mot de passe modifié. Reconnectez-vous sur vos autres appareils.'
          }
        ),
        '400': errorResponse(
          'Le JSON est invalide ou le mot de passe actuel est incorrect.',
          'INVALID_PASSWORD',
          'Mot de passe actuel incorrect'
        ),
        '401': unauthorizedError,
        '500': internalError
      }
    }
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      security: secure,
      summary: 'Lire le profil connecté',
      description: "Retourne le profil correspondant à l'access token.",
      responses: {
        '200': jsonResponse('Le profil public du compte connecté est retourné.', 'UserResponse'),
        '401': unauthorizedError,
        '404': errorResponse(
          "Le compte associé au jeton n'existe plus.",
          'USER_NOT_FOUND',
          'Utilisateur introuvable'
        ),
        '500': internalError
      }
    },
    patch: {
      tags: ['Auth'],
      security: secure,
      summary: 'Modifier le profil connecté',
      description: 'Modifie le nom, le postnom ou l’URL d’avatar.',
      requestBody: requestBody('UpdateProfileRequest'),
      responses: {
        '200': jsonResponse('Le profil mis à jour est retourné.', 'UserResponse'),
        '400': validationError,
        '401': unauthorizedError,
        '404': errorResponse(
          "Le compte n'existe plus.",
          'USER_NOT_FOUND',
          'Utilisateur introuvable'
        ),
        '500': internalError
      }
    }
  },
  '/auth/sessions': {
    get: {
      tags: ['Auth'],
      security: secure,
      summary: 'Lister les sessions actives',
      responses: {
        '200': jsonResponse(
          'Les refresh tokens actifs sont retournés sans leur valeur secrète.',
          'SessionsResponse'
        ),
        '401': unauthorizedError,
        '500': internalError
      }
    }
  },
  '/auth/sessions/{sessionId}': {
    delete: {
      tags: ['Auth'],
      security: secure,
      summary: 'Révoquer une session',
      parameters: [{
        name: 'sessionId',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' }
      }],
      responses: {
        '204': noContentResponse('La session est révoquée sans corps JSON.'),
        '400': validationError,
        '401': unauthorizedError,
        '404': errorResponse(
          "La session n'existe pas ou n'appartient pas au compte.",
          'SESSION_NOT_FOUND',
          'Session introuvable'
        ),
        '500': internalError
      }
    }
  }
};
