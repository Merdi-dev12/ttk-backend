import {
  adminErrors,
  conflictError,
  errorResponse,
  jsonResponse,
  noContentResponse,
  paginationParameters,
  pathId,
  requestBody,
  secure
} from './swagger.helpers.js';
import { serviceDetailOperations } from './swagger.admin.extra.js';

const serviceId = pathId('serviceId', 'UUID du service.');
const productId = pathId('productId', 'UUID du produit.');
const fieldId = pathId('fieldId', 'UUID du champ dynamique.');
const imageId = pathId('imageId', "UUID de l'image.");
const modalityId = pathId('modalityId', 'UUID de la modalité.');

const notFound = (resource: string, code: string) =>
  errorResponse(
    `${resource} demandé(e) n'existe pas.`,
    code,
    `${resource} introuvable`
  );

export const adminPaths = {
  '/catalog/admin/services': {
    get: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Lister tous les services',
      description:
        'Retourne les services actifs, suspendus ou supprimés. Les filtres status et type sont optionnels.',
      parameters: [
        ...paginationParameters,
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] }
        },
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: ['PRODUCTS', 'FORM'] }
        },
        {
          name: 'orderFlow',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['DIRECT_PAYMENT', 'ORDER_REQUEST']
          }
        }
      ],
      responses: {
        '200': jsonResponse(
          'La liste administrateur des services et la pagination sont retournées.',
          'ServiceListResponse'
        ),
        ...adminErrors
      }
    },
    post: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Créer un service',
      description:
        'Crée un service PRODUCTS pour vendre des produits ou FORM pour collecter un formulaire dynamique.',
      requestBody: requestBody('ServiceRequest'),
      responses: {
        '201': jsonResponse(
          'Le service est créé au statut ACTIVE avec un slug généré depuis son nom.',
          'ServiceResponse'
        ),
        ...adminErrors,
        '409': conflictError
      }
    }
  },
  '/catalog/admin/services/{id}': {
    ...serviceDetailOperations,
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Modifier un service',
      description:
        'Modifie au moins un champ parmi name, description et imageUrl. Le slug est recalculé si le nom change.',
      parameters: [pathId('id', 'UUID du service.')],
      requestBody: requestBody('ServiceUpdateRequest'),
      responses: {
        '200': jsonResponse('Le service modifié est retourné.', 'ServiceResponse'),
        ...adminErrors,
        '404': notFound('Service', 'SERVICE_NOT_FOUND'),
        '409': conflictError
      }
    }
  },
  '/catalog/admin/services/{id}/status': {
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Changer le statut d’un service',
      description:
        'ACTIVE publie le service, SUSPENDED le masque temporairement et DELETED effectue une suppression logique restaurable.',
      parameters: [pathId('id', 'UUID du service.')],
      requestBody: requestBody('CatalogStatusRequest'),
      responses: {
        '200': jsonResponse('Le service avec son nouveau statut est retourné.', 'ServiceResponse'),
        ...adminErrors,
        '404': notFound('Service', 'SERVICE_NOT_FOUND')
      }
    }
  },
  '/catalog/admin/services/{serviceId}/fields': {
    post: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Ajouter un champ dynamique',
      description:
        'Ajoute un champ à un service FORM. Le type SELECT exige un tableau options; technicalName=email est interdit.',
      parameters: [serviceId],
      requestBody: requestBody('FormFieldRequest'),
      responses: {
        '201': jsonResponse('Le champ dynamique créé est retourné.', 'FormFieldResponse'),
        ...adminErrors,
        '404': notFound('Service', 'SERVICE_NOT_FOUND'),
        '409': errorResponse(
          "Le service n'est pas de type FORM ou le nom technique existe déjà.",
          'INVALID_SERVICE_TYPE',
          'Les champs dynamiques sont réservés aux services FORM'
        )
      }
    }
  },
  '/catalog/admin/services/{serviceId}/fields/{fieldId}': {
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Modifier un champ dynamique',
      parameters: [serviceId, fieldId],
      requestBody: requestBody('FormFieldUpdateRequest'),
      responses: {
        '200': jsonResponse('Le champ dynamique modifié est retourné.', 'FormFieldResponse'),
        ...adminErrors,
        '404': notFound('Champ', 'FORM_FIELD_NOT_FOUND')
      }
    },
    delete: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Supprimer un champ dynamique',
      parameters: [serviceId, fieldId],
      responses: {
        '204': noContentResponse(
          'Le champ est supprimé. La réponse ne contient aucun JSON.'
        ),
        ...adminErrors,
        '404': notFound('Champ', 'FORM_FIELD_NOT_FOUND')
      }
    }
  },
  '/catalog/admin/services/{serviceId}/products': {
    get: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Lister les produits d’un service',
      description:
        'Retourne tous les produits du service, y compris suspendus et supprimés, avec admin_note.',
      parameters: [serviceId, ...paginationParameters],
      responses: {
        '200': jsonResponse(
          'Les produits administrateur et la pagination sont retournés.',
          'ProductListResponse'
        ),
        ...adminErrors
      }
    },
    post: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Créer un produit complet',
      description:
        'Crée le produit, jusqu’à 20 images et 50 modalités dans une transaction. Une seule image principale est autorisée.',
      parameters: [serviceId],
      requestBody: requestBody('ProductRequest'),
      responses: {
        '201': jsonResponse(
          'Le produit créé avec ses images et modalités est retourné.',
          'ProductResponse'
        ),
        ...adminErrors,
        '404': notFound('Service', 'SERVICE_NOT_FOUND'),
        '409': errorResponse(
          "Le service n'est pas de type PRODUCTS ou une valeur unique existe déjà.",
          'INVALID_SERVICE_TYPE',
          'Les produits sont réservés aux services PRODUCTS'
        )
      }
    }
  },
  '/catalog/admin/products/{id}': {
    get: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Lire un produit administrateur',
      description:
        'Retourne le produit quel que soit son statut, avec admin_note, images et modalités.',
      parameters: [pathId('id', 'UUID du produit.')],
      responses: {
        '200': jsonResponse('Le produit administrateur complet est retourné.', 'ProductResponse'),
        ...adminErrors,
        '404': notFound('Produit', 'PRODUCT_NOT_FOUND')
      }
    },
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Modifier les informations d’un produit',
      description:
        'Modifie au moins un champ parmi name, description et adminNote. Images et modalités ont leurs propres routes.',
      parameters: [pathId('id', 'UUID du produit.')],
      requestBody: requestBody('ProductUpdateRequest'),
      responses: {
        '200': jsonResponse('Le produit modifié est retourné.', 'ProductResponse'),
        ...adminErrors,
        '404': notFound('Produit', 'PRODUCT_NOT_FOUND'),
        '409': conflictError
      }
    }
  },
  '/catalog/admin/products/{id}/status': {
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Changer le statut d’un produit',
      description:
        'ACTIVE publie le produit, SUSPENDED le masque temporairement et DELETED effectue une suppression logique.',
      parameters: [pathId('id', 'UUID du produit.')],
      requestBody: requestBody('CatalogStatusRequest'),
      responses: {
        '200': jsonResponse('Le produit avec son nouveau statut est retourné.', 'ProductResponse'),
        ...adminErrors,
        '404': notFound('Produit', 'PRODUCT_NOT_FOUND')
      }
    }
  },
  '/catalog/admin/products/{productId}/images': {
    post: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Ajouter une image',
      description:
        "Si isPrimary=true, l'ancienne image principale est automatiquement rétrogradée.",
      parameters: [productId],
      requestBody: requestBody('ImageRequest'),
      responses: {
        '201': jsonResponse("L'image créée est retournée.", 'ImageResponse'),
        ...adminErrors,
        '404': notFound('Produit', 'PRODUCT_NOT_FOUND')
      }
    }
  },
  '/catalog/admin/products/{productId}/images/{imageId}': {
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Modifier une image',
      parameters: [productId, imageId],
      requestBody: requestBody('ImageUpdateRequest'),
      responses: {
        '200': jsonResponse("L'image modifiée est retournée.", 'ImageResponse'),
        ...adminErrors,
        '404': notFound('Image', 'IMAGE_NOT_FOUND')
      }
    },
    delete: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Supprimer une image',
      parameters: [productId, imageId],
      responses: {
        '204': noContentResponse(
          "L'image est supprimée. La réponse ne contient aucun JSON."
        ),
        ...adminErrors,
        '404': notFound('Image', 'IMAGE_NOT_FOUND')
      }
    }
  },
  '/catalog/admin/products/{productId}/modalities': {
    post: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Ajouter une modalité et son prix',
      parameters: [productId],
      requestBody: requestBody('ModalityRequest'),
      responses: {
        '201': jsonResponse('La modalité créée est retournée.', 'ModalityResponse'),
        ...adminErrors,
        '404': notFound('Produit', 'PRODUCT_NOT_FOUND'),
        '409': conflictError
      }
    }
  },
  '/catalog/admin/products/{productId}/modalities/{modalityId}': {
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Modifier une modalité',
      parameters: [productId, modalityId],
      requestBody: requestBody('ModalityUpdateRequest'),
      responses: {
        '200': jsonResponse('La modalité modifiée est retournée.', 'ModalityResponse'),
        ...adminErrors,
        '404': notFound('Modalité', 'MODALITY_NOT_FOUND'),
        '409': conflictError
      }
    },
    delete: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Supprimer une modalité',
      parameters: [productId, modalityId],
      responses: {
        '204': noContentResponse(
          'La modalité est supprimée. La réponse ne contient aucun JSON.'
        ),
        ...adminErrors,
        '404': notFound('Modalité', 'MODALITY_NOT_FOUND')
      }
    }
  },
  '/catalog/admin/products/{productId}/modalities/{modalityId}/discount': {
    patch: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Appliquer une réduction',
      description:
        'Déplace le prix courant vers old_price et enregistre le prix réduit dans price. Un prix réduit doit être inférieur au prix courant.',
      parameters: [productId, modalityId],
      requestBody: requestBody('DiscountRequest'),
      responses: {
        '200': jsonResponse(
          'La modalité retournée contient price réduit et old_price avec le prix précédent.',
          'ModalityResponse'
        ),
        ...adminErrors,
        '400': errorResponse(
          'Le JSON est invalide ou le nouveau prix n’est pas inférieur au prix courant.',
          'INVALID_DISCOUNT',
          'Le prix réduit doit être inférieur au prix actuel'
        ),
        '404': notFound('Modalité', 'MODALITY_NOT_FOUND')
      }
    },
    delete: {
      tags: ['Catalog Admin'],
      security: secure,
      summary: 'Retirer une réduction',
      description:
        'Restaure old_price dans price puis remet old_price à null.',
      parameters: [productId, modalityId],
      responses: {
        '200': jsonResponse(
          'La modalité avec le prix restauré est retournée.',
          'ModalityResponse'
        ),
        ...adminErrors,
        '404': errorResponse(
          "La modalité n'existe pas ou aucune réduction n'est active.",
          'DISCOUNT_NOT_FOUND',
          'Aucune réduction active'
        )
      }
    }
  }
};
