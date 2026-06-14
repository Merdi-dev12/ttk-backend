const secure = [{ bearerAuth: [] }];
const productId = {
  name: 'productId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};
const modalityId = {
  name: 'modalityId',
  in: 'path',
  required: true,
  schema: { type: 'string', format: 'uuid' }
};

export const catalogExtraPaths = {
  '/catalog/currencies': {
    get: {
      tags: ['Catalog'],
      summary: 'Liste les devises actives',
      responses: { '200': { description: 'USD et CDF' } }
    }
  },
  '/catalog/search': {
    get: {
      tags: ['Catalog'],
      summary: 'Recherche des services et produits dans Meilisearch',
      parameters: [
        {
          name: 'q',
          in: 'query',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'kind',
          in: 'query',
          schema: { type: 'string', enum: ['SERVICE', 'PRODUCT'] }
        }
      ],
      responses: { '200': { description: 'Résultats de recherche' } }
    }
  },
  '/catalog/admin/products/{productId}/modalities/{modalityId}/discount': {
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Applique une réduction à une modalité',
      parameters: [productId, modalityId],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['price'],
              properties: {
                price: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      },
      responses: { '200': { description: 'Réduction appliquée' } }
    },
    delete: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: "Retire la réduction et restaure l'ancien prix",
      parameters: [productId, modalityId],
      responses: { '200': { description: 'Prix restauré' } }
    }
  }
};
