import {
  adminErrors,
  jsonResponse,
  secure
} from './swagger.helpers.js';

export const dashboardPaths = {
  '/admin/dashboard/summary': {
    get: {
      tags: ['Dashboard Admin'],
      security: secure,
      summary: 'Résumé du dashboard',
      description:
        'Retourne les compteurs disponibles. Les domaines non encore modélisés sont listés dans unavailableDomains.',
      parameters: [
        { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'currency', in: 'query', schema: { type: 'string', enum: ['USD', 'CDF'] } }
      ],
      responses: {
        '200': jsonResponse('Les statistiques disponibles sont retournées.', 'DashboardResponse'),
        ...adminErrors
      }
    }
  },
  '/admin/dashboard/activity': {
    get: {
      tags: ['Dashboard Admin'],
      security: secure,
      summary: 'Activité récente du dashboard',
      responses: {
        '200': jsonResponse('Les activités disponibles sont retournées.', 'ActivityResponse'),
        ...adminErrors
      }
    }
  }
};
