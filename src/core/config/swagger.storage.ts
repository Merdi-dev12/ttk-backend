import {
  adminErrors,
  errorResponse,
  jsonResponse,
  noContentResponse,
  pathId,
  requestBody,
  secure
} from './swagger.helpers.js';

const bucketId = pathId('bucketId', 'UUID du bucket Storage.');
const objectId = pathId('objectId', 'UUID de l’objet Storage.');
const bucketNotFound = errorResponse(
  "Le bucket demandé n'existe pas.",
  'STORAGE_BUCKET_NOT_FOUND',
  'Bucket introuvable'
);

export const storagePaths = {
  '/storage/admin/buckets': {
    get: {
      tags: ['Storage Admin'],
      security: secure,
      summary: 'Lister les buckets',
      description:
        'Retourne les buckets enregistrés et leur nombre d’objets.',
      responses: {
        '200': jsonResponse(
          'Les buckets Storage sont retournés.',
          'StorageBucketsResponse'
        ),
        ...adminErrors
      }
    },
    post: {
      tags: ['Storage Admin'],
      security: secure,
      summary: 'Créer un bucket',
      description:
        'Crée le bucket dans S3/MinIO puis enregistre ses métadonnées dans PostgreSQL.',
      requestBody: requestBody('CreateStorageBucketRequest'),
      responses: {
        '201': jsonResponse(
          'Le bucket S3 et son enregistrement PostgreSQL sont créés.',
          'StorageBucketResponse'
        ),
        ...adminErrors,
        '409': errorResponse(
          'Un bucket avec ce nom existe déjà.',
          'STORAGE_BUCKET_CONFLICT',
          'Un bucket avec ce nom existe déjà'
        ),
        '503': errorResponse(
          'Le stockage S3 est absent ou indisponible.',
          'STORAGE_UNAVAILABLE',
          'Le service de stockage est temporairement indisponible'
        )
      }
    }
  },
  '/storage/admin/buckets/{bucketId}/objects': {
    get: {
      tags: ['Storage Admin'],
      security: secure,
      summary: 'Lister les objets d’un bucket',
      parameters: [bucketId],
      responses: {
        '200': jsonResponse(
          'Les métadonnées des objets sont retournées.',
          'StorageObjectsResponse'
        ),
        ...adminErrors,
        '404': bucketNotFound
      }
    },
    post: {
      tags: ['Storage Admin'],
      security: secure,
      summary: 'Téléverser une image ou une vidéo',
      description:
        'Détecte le type MIME réel, génère le nom et retourne l’URL à utiliser dans le catalogue.',
      parameters: [bucketId],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: 'JPEG, PNG, WebP, AVIF, MP4, WebM ou MOV. Images: 10 Mo par défaut; vidéos: 100 Mo par défaut.'
                }
              }
            }
          }
        }
      },
      responses: {
        '201': jsonResponse(
          'Le média est stocké et son URL publique est retournée.',
          'StorageObjectResponse'
        ),
        ...adminErrors,
        '404': bucketNotFound,
        '413': errorResponse(
          'Le fichier dépasse la limite configurée.',
          'FILE_TOO_LARGE',
          'Le fichier dépasse la taille maximale autorisée'
        ),
        '415': errorResponse(
          'La signature binaire ne correspond pas à un format accepté.',
          'UNSUPPORTED_FILE_TYPE',
          'Seuls les fichiers JPEG, PNG, WebP, AVIF, MP4, WebM et MOV sont autorisés'
        ),
        '503': errorResponse(
          'Le stockage S3 est indisponible.',
          'STORAGE_UNAVAILABLE',
          'Le service de stockage est temporairement indisponible'
        )
      }
    }
  },
  '/storage/admin/buckets/{bucketId}/objects/{objectId}': {
    delete: {
      tags: ['Storage Admin'],
      security: secure,
      summary: 'Supprimer un objet',
      description:
        'Supprime le fichier dans S3/MinIO puis ses métadonnées PostgreSQL.',
      parameters: [bucketId, objectId],
      responses: {
        '204': noContentResponse(
          'L’objet est supprimé. La réponse ne contient aucun JSON.'
        ),
        ...adminErrors,
        '404': errorResponse(
          "L'objet n'existe pas dans ce bucket.",
          'STORAGE_OBJECT_NOT_FOUND',
          'Objet introuvable'
        ),
        '503': errorResponse(
          'Le stockage S3 est indisponible.',
          'STORAGE_UNAVAILABLE',
          'Le service de stockage est temporairement indisponible'
        )
      }
    }
  }
};
