import {
  errorResponse,
  internalError,
  jsonResponse,
  paginationParameters,
  slugParameter,
  validationError
} from './swagger.helpers.js';

export const publicPaths = {
  '/health': {
    get: {
      tags: ['System'],
      summary: "Vérifier que l'API répond",
      description:
        "Confirme uniquement que le processus Express est disponible. Ce contrôle ne garantit pas la santé de PostgreSQL, Redis ou Meilisearch.",
      responses: {
        '200': jsonResponse(
          "L'API est démarrée; la réponse contient l'heure et l'environnement courant.",
          'HealthResponse'
        )
      }
    }
  },
  '/catalog/currencies': {
    get: {
      tags: ['Catalog'],
      summary: 'Lister les devises',
      description: 'Retourne les devises actives, actuellement USD et CDF.',
      responses: {
        '200': jsonResponse(
          'La liste contient le code, le nom, le symbole et le nombre de décimales.',
          'CurrenciesResponse'
        ),
        '500': internalError
      }
    }
  },
  '/catalog/search': {
    get: {
      tags: ['Catalog'],
      summary: 'Rechercher dans le catalogue',
      description:
        'Interroge Meilisearch sur les services et produits indexés. Le filtre kind est optionnel.',
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          description: 'Texte recherché.',
          schema: { type: 'string', minLength: 1, maxLength: 200, example: 'Netflix' }
        },
        {
          name: 'kind',
          in: 'query',
          description: 'Limiter la recherche à un type de document.',
          schema: { type: 'string', enum: ['SERVICE', 'PRODUCT'] }
        },
        ...paginationParameters
      ],
      responses: {
        '200': jsonResponse(
          'Les résultats, la pagination et le temps de traitement Meilisearch sont retournés.',
          'SearchResponse'
        ),
        '400': validationError,
        '500': errorResponse(
          'Meilisearch est indisponible ou une erreur interne empêche la recherche.',
          'INTERNAL_ERROR',
          'Une erreur interne est survenue'
        )
      }
    }
  },
  '/catalog/services': {
    get: {
      tags: ['Catalog'],
      summary: 'Lister les services publics',
      description: 'Retourne uniquement les services au statut ACTIVE.',
      parameters: paginationParameters,
      responses: {
        '200': jsonResponse(
          'Les services actifs et les informations de pagination sont retournés.',
          'ServiceListResponse'
        ),
        '400': validationError,
        '500': internalError
      }
    }
  },
  '/catalog/services/{slug}': {
    get: {
      tags: ['Catalog'],
      summary: 'Lire un service public',
      description:
        'Retourne un service actif. Pour un service FORM, la réponse contient aussi ses champs dynamiques.',
      parameters: [slugParameter],
      responses: {
        '200': jsonResponse(
          'Le service est retourné; fields est présent lorsque son type vaut FORM.',
          'ServiceResponse'
        ),
        '400': validationError,
        '404': errorResponse(
          "Aucun service actif ne correspond au slug.",
          'SERVICE_NOT_FOUND',
          'Service introuvable'
        ),
        '500': internalError
      }
    }
  },
  '/catalog/services/{slug}/products': {
    get: {
      tags: ['Catalog'],
      summary: "Lister les produits publics d'un service",
      description:
        'Retourne uniquement les produits ACTIVE appartenant au service actif demandé.',
      parameters: [slugParameter, ...paginationParameters],
      responses: {
        '200': jsonResponse(
          'Les produits actifs, leurs images, leurs modalités et la pagination sont retournés.',
          'ProductListResponse'
        ),
        '400': validationError,
        '404': errorResponse(
          "Le service actif n'existe pas.",
          'SERVICE_NOT_FOUND',
          'Service introuvable'
        ),
        '500': internalError
      }
    }
  },
  '/catalog/products/{id}': {
    get: {
      tags: ['Catalog'],
      summary: 'Lire un produit public',
      description:
        "Retourne un produit actif, ses images et ses modalités. Une réduction apparaît avec price comme prix courant et oldPrice comme ancien prix.",
      parameters: [{
        name: 'id',
        in: 'path',
        required: true,
        description: 'UUID du produit.',
        schema: { type: 'string', format: 'uuid' }
      }],
      responses: {
        '200': jsonResponse(
          'Le produit actif complet est retourné. admin_note est exclu des données publiques.',
          'ProductResponse'
        ),
        '400': validationError,
        '404': errorResponse(
          "Le produit actif n'existe pas.",
          'PRODUCT_NOT_FOUND',
          'Produit introuvable'
        ),
        '500': internalError
      }
    }
  }
};
