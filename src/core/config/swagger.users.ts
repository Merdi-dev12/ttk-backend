import {
  adminErrors,
  errorResponse,
  jsonResponse,
  paginationParameters,
  pathId,
  requestBody,
  secure
} from './swagger.helpers.js';

export const userPaths = {
  '/users/admin': {
    get: {
      tags: ['Users Admin'],
      security: secure,
      summary: 'Lister les utilisateurs',
      description:
        'Retourne les comptes USER avec pagination. status et search sont optionnels.',
      parameters: [
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'REVOKED'] }
        },
        {
          name: 'role',
          in: 'query',
          schema: { type: 'string', enum: ['USER', 'ADMIN'], default: 'USER' }
        },
        {
          name: 'search',
          in: 'query',
          description: 'Recherche sur le nom, le postnom ou l’email.',
          schema: { type: 'string', maxLength: 100, example: 'mariam' }
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['nom', 'email', 'status', 'created_at']
          }
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'] }
        },
        {
          name: 'dateFrom',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        },
        {
          name: 'dateTo',
          in: 'query',
          schema: { type: 'string', format: 'date-time' }
        }
      ],
      responses: {
        '200': jsonResponse(
          'Les profils utilisateurs et les informations de pagination sont retournés.',
          'UserListResponse'
        ),
        ...adminErrors
      }
    }
  },
  '/users/admin/{id}': {
    get: {
      tags: ['Users Admin'],
      security: secure,
      summary: 'Lire un profil utilisateur',
      description:
        'Retourne le profil complet disponible. Les historiques métier seront ajoutés avec les modules commandes et paiements.',
      parameters: [pathId('id', "UUID de l'utilisateur.")],
      responses: {
        '200': jsonResponse('Le profil utilisateur est retourné.', 'UserResponse'),
        ...adminErrors,
        '404': errorResponse(
          "L'utilisateur demandé n'existe pas.",
          'USER_NOT_FOUND',
          'Utilisateur introuvable'
        )
      }
    }
  },
  '/users/admin/{id}/status': {
    patch: {
      tags: ['Users Admin'],
      security: secure,
      summary: 'Révoquer ou réactiver un utilisateur',
      description:
        'REVOKED bloque la connexion et l’utilisation des jetons; ACTIVE restaure l’accès.',
      parameters: [pathId('id', "UUID de l'utilisateur.")],
      requestBody: requestBody('UserStatusRequest'),
      responses: {
        '200': jsonResponse(
          'Le profil utilisateur avec son nouveau statut est retourné.',
          'UserResponse'
        ),
        ...adminErrors,
        '404': errorResponse(
          "L'utilisateur demandé n'existe pas.",
          'USER_NOT_FOUND',
          'Utilisateur introuvable'
        )
      }
    }
  }
};
