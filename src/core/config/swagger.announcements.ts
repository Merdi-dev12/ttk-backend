import {
  adminErrors,
  errorResponse,
  jsonResponse,
  noContentResponse,
  paginationParameters,
  pathId,
  requestBody,
  secure,
  validationError
} from './swagger.helpers.js';

const announcementId = pathId('id', "UUID de l'annonce.");

const notFound = errorResponse(
  "L'annonce demandee n'existe pas.",
  'ANNOUNCEMENT_NOT_FOUND',
  'Annonce introuvable'
);

export const announcementPaths = {
  '/announcements': {
    get: {
      tags: ['Announcements'],
      summary: 'Lister les annonces publiques',
      parameters: paginationParameters,
      responses: {
        '200': jsonResponse(
          'Les annonces actives sont retournees.',
          'AnnouncementListResponse'
        ),
        '400': validationError
      }
    }
  },
  '/announcements/admin': {
    get: {
      tags: ['Announcements Admin'],
      security: secure,
      summary: 'Lister les annonces admin',
      parameters: paginationParameters,
      responses: {
        '200': jsonResponse(
          'Les annonces admin sont retournees.',
          'AnnouncementListResponse'
        ),
        ...adminErrors
      }
    },
    post: {
      tags: ['Announcements Admin'],
      security: secure,
      summary: 'Creer une annonce',
      requestBody: requestBody('AnnouncementRequest'),
      responses: {
        '201': jsonResponse(
          "L'annonce creee est retournee.",
          'AnnouncementResponse'
        ),
        ...adminErrors
      }
    }
  },
  '/announcements/admin/{id}': {
    get: {
      tags: ['Announcements Admin'],
      security: secure,
      summary: 'Lire une annonce admin',
      parameters: [announcementId],
      responses: {
        '200': jsonResponse("L'annonce est retournee.", 'AnnouncementResponse'),
        ...adminErrors,
        '404': notFound
      }
    },
    patch: {
      tags: ['Announcements Admin'],
      security: secure,
      summary: 'Modifier une annonce',
      parameters: [announcementId],
      requestBody: requestBody('AnnouncementUpdateRequest'),
      responses: {
        '200': jsonResponse(
          "L'annonce modifiee est retournee.",
          'AnnouncementResponse'
        ),
        ...adminErrors,
        '404': notFound
      }
    },
    delete: {
      tags: ['Announcements Admin'],
      security: secure,
      summary: 'Supprimer une annonce',
      parameters: [announcementId],
      responses: {
        '204': noContentResponse("L'annonce est supprimee."),
        ...adminErrors,
        '404': notFound
      }
    }
  },
  '/announcements/admin/{id}/status': {
    patch: {
      tags: ['Announcements Admin'],
      security: secure,
      summary: "Changer le statut d'une annonce",
      parameters: [announcementId],
      requestBody: requestBody('CatalogStatusRequest'),
      responses: {
        '200': jsonResponse(
          "L'annonce avec son nouveau statut est retournee.",
          'AnnouncementResponse'
        ),
        ...adminErrors,
        '404': notFound
      }
    }
  }
};
