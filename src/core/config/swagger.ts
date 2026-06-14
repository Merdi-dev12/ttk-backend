import { config } from './env.js';
import { catalogExtraPaths } from './swagger.catalog.js';
import {
  idParameter,
  requestBody,
  response,
  secure
} from './swagger.helpers.js';
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'TTK API',
    version: '1.0.0',
    description: 'API de la marketplace multi-services TTK.'
  },
  servers: [{ url: config.apiPrefix, description: 'Serveur courant' }],
  tags: [
    { name: 'System' }, { name: 'Auth' }, { name: 'Catalog' },
    { name: 'Catalog Admin' }, { name: 'Users Admin' }
  ],
  paths: {
    ...catalogExtraPaths,
    '/health': {
      get: {
        tags: ['System'],
        summary: "Vérifie l'état HTTP de l'API",
        responses: { '200': response('API disponible') }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Crée une inscription en attente et envoie un OTP',
        requestBody: requestBody('RegisterRequest'),
        responses: {
          '202': response('OTP placé dans la file email'),
          '409': response('Email déjà utilisé')
        }
      }
    },
    '/auth/register/verify': {
      post: {
        tags: ['Auth'],
        summary: "Valide l'OTP et crée le compte utilisateur",
        requestBody: requestBody('OtpRequest'),
        responses: {
          '201': response('Compte créé'),
          '400': response('OTP invalide'),
          '410': response('OTP expiré')
        }
      }
    },
    '/auth/register/resend-otp': {
      post: {
        tags: ['Auth'],
        summary: "Renvoie l'OTP d'inscription",
        requestBody: requestBody('EmailRequest'),
        responses: { '202': response('Nouvel OTP envoyé') }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connecte un utilisateur validé',
        requestBody: requestBody('LoginRequest'),
        responses: {
          '200': response('Access token et refresh token'),
          '401': response('Identifiants incorrects'),
          '403': response('Compte révoqué')
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Effectue une rotation du refresh token',
        requestBody: requestBody('RefreshRequest'),
        responses: { '200': response('Nouvelle paire de tokens') }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Révoque un refresh token',
        requestBody: requestBody('RefreshRequest'),
        responses: { '204': response('Déconnecté') }
      }
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Demande un OTP de réinitialisation',
        requestBody: requestBody('EmailRequest'),
        responses: { '202': response('Demande acceptée') }
      }
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Réinitialise le mot de passe avec OTP',
        requestBody: requestBody('ResetPasswordRequest'),
        responses: { '200': response('Mot de passe réinitialisé') }
      }
    },
    '/auth/change-password': {
      post: {
        tags: ['Auth'],
        security: secure,
        summary: 'Modifie le mot de passe du compte connecté',
        requestBody: requestBody('ChangePasswordRequest'),
        responses: { '200': response('Mot de passe modifié') }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        security: secure,
        summary: 'Retourne le profil connecté',
        responses: { '200': response('Profil utilisateur') }
      }
    },
    '/catalog/services': {
      get: {
        tags: ['Catalog'],
        summary: 'Liste les services actifs',
        responses: { '200': response('Services paginés') }
      }
    },
    '/catalog/services/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Retourne un service actif et ses champs si nécessaire',
        parameters: [{
          name: 'slug',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }],
        responses: { '200': response('Service'), '404': response('Introuvable') }
      }
    },
    '/catalog/services/{slug}/products': {
      get: {
        tags: ['Catalog'],
        summary: "Liste les produits actifs d'un service",
        parameters: [{
          name: 'slug',
          in: 'path',
          required: true,
          schema: { type: 'string' }
        }],
        responses: { '200': response('Produits paginés') }
      }
    },
    '/catalog/products/{id}': {
      get: {
        tags: ['Catalog'],
        summary: 'Retourne un produit actif, ses images et modalités',
        parameters: [idParameter],
        responses: { '200': response('Produit'), '404': response('Introuvable') }
      }
    },
    '/catalog/admin/services': {
      get: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: 'Liste tous les services',
        responses: { '200': response('Services paginés') }
      },
      post: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: 'Crée un service PRODUCTS ou FORM',
        requestBody: requestBody('ServiceRequest'),
        responses: { '201': response('Service créé') }
      }
    },
    '/catalog/admin/services/{id}': {
      patch: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: 'Modifie un service',
        parameters: [idParameter],
        requestBody: requestBody('ServiceUpdateRequest'),
        responses: { '200': response('Service modifié') }
      }
    },
    '/catalog/admin/services/{id}/status': {
      patch: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: 'Suspend, supprime ou restaure un service',
        parameters: [idParameter],
        requestBody: requestBody('StatusRequest'),
        responses: { '200': response('Statut modifié') }
      }
    },
    '/catalog/admin/services/{serviceId}/fields': {
      post: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: 'Ajoute un champ à un service FORM',
        parameters: [{
          ...idParameter,
          name: 'serviceId'
        }],
        requestBody: requestBody('FormFieldRequest'),
        responses: { '201': response('Champ créé') }
      }
    },
    '/catalog/admin/services/{serviceId}/products': {
      get: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: "Liste tous les produits d'un service",
        parameters: [{ ...idParameter, name: 'serviceId' }],
        responses: { '200': response('Produits paginés') }
      },
      post: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: 'Crée un produit avec images et modalités',
        parameters: [{ ...idParameter, name: 'serviceId' }],
        requestBody: requestBody('ProductRequest'),
        responses: { '201': response('Produit créé') }
      }
    },
    '/catalog/admin/products/{id}/status': {
      patch: {
        tags: ['Catalog Admin'],
        security: secure,
        summary: 'Suspend, supprime ou restaure un produit',
        parameters: [idParameter],
        requestBody: requestBody('StatusRequest'),
        responses: { '200': response('Statut modifié') }
      }
    },
    '/users/admin': {
      get: {
        tags: ['Users Admin'],
        security: secure,
        summary: 'Liste les utilisateurs',
        responses: { '200': response('Utilisateurs paginés') }
      }
    },
    '/users/admin/{id}/status': {
      patch: {
        tags: ['Users Admin'],
        security: secure,
        summary: 'Révoque ou réactive un utilisateur',
        parameters: [idParameter],
        requestBody: requestBody('UserStatusRequest'),
        responses: { '200': response('Utilisateur modifié') }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['nom', 'email', 'password'],
        properties: {
          nom: { type: 'string', example: 'Mariam' },
          postnom: { type: 'string', nullable: true },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' }
        }
      },
      EmailRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } }
      },
      OtpRequest: {
        type: 'object',
        required: ['email', 'otp'],
        properties: {
          email: { type: 'string', format: 'email' },
          otp: { type: 'string', pattern: '^\\d{6}$' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', format: 'password' }
        }
      },
      RefreshRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string' } }
      },
      ResetPasswordRequest: {
        allOf: [
          { $ref: '#/components/schemas/OtpRequest' },
          {
            type: 'object',
            required: ['newPassword'],
            properties: {
              newPassword: { type: 'string', format: 'password' }
            }
          }
        ]
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: { type: 'string', format: 'password' }
        }
      },
      ServiceRequest: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', format: 'uri', nullable: true },
          type: { type: 'string', enum: ['PRODUCTS', 'FORM'] }
        }
      },
      ServiceUpdateRequest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          imageUrl: { type: 'string', format: 'uri', nullable: true }
        }
      },
      StatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['ACTIVE', 'SUSPENDED', 'DELETED']
          }
        }
      },
      UserStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['ACTIVE', 'REVOKED'] }
        }
      },
      FormFieldRequest: {
        type: 'object',
        required: ['technicalName', 'label', 'fieldType'],
        properties: {
          technicalName: { type: 'string', example: 'montant_souhaite' },
          label: { type: 'string' },
          fieldType: {
            type: 'string',
            enum: ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'FILE', 'TEXTAREA', 'PHONE']
          },
          required: { type: 'boolean', default: true },
          options: { type: 'array', items: { type: 'string' } },
          displayOrder: { type: 'integer', minimum: 0 }
        }
      },
      ProductRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          adminNote: { type: 'string', nullable: true },
          images: { type: 'array', items: { type: 'object' } },
          modalities: { type: 'array', items: { type: 'object' } }
        }
      },
      Error: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'error' },
          code: { type: 'string' },
          message: { type: 'string' }
        }
      }
    }
  }
};
