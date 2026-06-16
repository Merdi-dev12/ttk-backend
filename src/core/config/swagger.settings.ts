import {
  adminErrors,
  errorResponse,
  jsonResponse,
  noContentResponse,
  requestBody,
  secure
} from './swagger.helpers.js';

const sections = {
  general: 'GeneralSettings',
  catalog: 'CatalogSettings',
  orders: 'OrdersSettings',
  payments: 'PaymentsSettings',
  notifications: 'NotificationsSettings',
  security: 'SecuritySettings',
  storage: 'StorageSettings'
} as const;

const sectionPaths = Object.fromEntries(
  Object.entries(sections).map(([section, schema]) => [
    `/admin/settings/${section}`,
    {
      patch: {
        tags: ['Settings Admin'],
        security: secure,
        summary: `Modifier les paramètres ${section}`,
        description:
          'Remplace la section, enregistre un audit et invalide le cache de configuration.',
        requestBody: requestBody(schema),
        responses: {
          '200': jsonResponse(
            'La configuration globale mise à jour est retournée.',
            'AdminSettingsResponse'
          ),
          ...adminErrors,
          ...(section === 'security'
            ? {
                '409': errorResponse(
                  "La liste IP bloquerait l'administrateur courant.",
                  'CURRENT_ADMIN_IP_BLOCKED',
                  "La restriction IP doit autoriser l'adresse actuelle de l'administrateur"
                )
              }
            : {})
        }
      }
    }
  ])
);

export const settingsPaths = {
  '/admin/settings': {
    get: {
      tags: ['Settings Admin'],
      security: secure,
      summary: 'Lire les paramètres administrateur',
      description:
        'Retourne uniquement les options fonctionnelles non sensibles.',
      responses: {
        '200': jsonResponse(
          'Les sept sections de paramètres sont retournées.',
          'AdminSettingsResponse'
        ),
        ...adminErrors
      }
    }
  },
  ...sectionPaths,
  '/admin/settings/notifications/test-email': {
    post: {
      tags: ['Settings Admin'],
      security: secure,
      summary: 'Envoyer un email de test',
      description: 'Place l’email de test dans la file BullMQ.',
      requestBody: requestBody('TestEmailRequest'),
      responses: {
        '204': noContentResponse(
          'L’email est accepté dans la file. Aucun JSON n’est retourné.'
        ),
        ...adminErrors
      }
    }
  },
  '/admin/settings/maintenance/clear-cache': {
    post: {
      tags: ['Settings Admin'],
      security: secure,
      summary: 'Vider le cache de configuration',
      responses: {
        '204': noContentResponse(
          'Le cache reconstructible des paramètres est supprimé.'
        ),
        ...adminErrors
      }
    }
  }
};
