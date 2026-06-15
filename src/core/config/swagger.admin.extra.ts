import {
  adminErrors,
  errorResponse,
  jsonResponse,
  paginationParameters,
  pathId,
  secure
} from './swagger.helpers.js';

const serviceNotFound = errorResponse(
  "Le service demandé n'existe pas.",
  'SERVICE_NOT_FOUND',
  'Service introuvable'
);

export const serviceDetailOperations = {
  get: {
    tags: ['Catalog Admin'],
    security: secure,
    summary: 'Lire un service administrateur',
    description:
      'Retourne le service, ses champs dynamiques et son nombre de produits.',
    parameters: [pathId('id', 'UUID du service.')],
    responses: {
      '200': jsonResponse('Le service complet est retourné.', 'ServiceResponse'),
      ...adminErrors,
      '404': serviceNotFound
    }
  },
  delete: {
    tags: ['Catalog Admin'],
    security: secure,
    summary: 'Supprimer logiquement un service',
    description: 'Place le service au statut DELETED sans effacer ses données.',
    parameters: [pathId('id', 'UUID du service.')],
    responses: {
      '200': jsonResponse(
        'Le service supprimé logiquement est retourné.',
        'ServiceResponse'
      ),
      ...adminErrors,
      '404': serviceNotFound
    }
  }
};

export const adminExtraPaths = {
  '/catalog/admin/products': {
    get: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Lister globalement les produits',
      description:
        'DataTable globale avec service, image principale, prix min/max et nombre de modalités.',
      parameters: [
        ...paginationParameters,
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'serviceId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] }
        },
        { name: 'currency', in: 'query', schema: { type: 'string', enum: ['USD', 'CDF'] } },
        {
          name: 'availability',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['AVAILABLE', 'UNAVAILABLE', 'ON_REQUEST']
          }
        },
        { name: 'hasDiscount', in: 'query', schema: { type: 'boolean' } },
        {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['name', 'status', 'created_at', 'updated_at', 'minPrice', 'maxPrice']
          }
        },
        { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date-time' } }
      ],
      responses: {
        '200': jsonResponse(
          'Les produits filtrés et paginés sont retournés.',
          'ProductListResponse'
        ),
        ...adminErrors
      }
    }
  }
};
