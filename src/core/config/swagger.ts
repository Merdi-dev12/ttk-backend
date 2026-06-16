import { config } from './env.js';
import { adminPaths } from './swagger.admin.js';
import { adminExtraPaths } from './swagger.admin.extra.js';
import { authPaths } from './swagger.auth.js';
import { dashboardPaths } from './swagger.dashboard.js';
import { publicPaths } from './swagger.public.js';
import { swaggerSchemas } from './swagger.schemas.js';
import { storagePaths } from './swagger.storage.js';
import { settingsPaths } from './swagger.settings.js';
import { userPaths } from './swagger.users.js';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'TTK API',
    version: '1.0.0',
    description:
      'API de la marketplace multi-services TTK. Les exemples décrivent les JSON réellement acceptés et retournés par l’API.',
    contact: {
      name: 'Équipe TTK'
    }
  },
  servers: [
    {
      url: config.apiPrefix,
      description: 'Serveur courant'
    }
  ],
  tags: [
    {
      name: 'System',
      description: "État du processus HTTP de l'API."
    },
    {
      name: 'Auth',
      description:
        'Inscription avec OTP, connexion, jetons et gestion du mot de passe.'
    },
    {
      name: 'Catalog',
      description:
        'Lecture publique des services, produits, devises et recherche Meilisearch.'
    },
    {
      name: 'Catalog Admin',
      description:
        'Création et administration des services, champs, produits, images, modalités et réductions.'
    },
    {
      name: 'Dashboard Admin',
      description: 'Statistiques et activité du tableau de bord.'
    },
    {
      name: 'Users Admin',
      description: 'Consultation, révocation et réactivation des utilisateurs.'
    },
    {
      name: 'Storage Admin',
      description:
        'Buckets S3/MinIO et images publiques destinées au catalogue.'
    },
    {
      name: 'Settings Admin',
      description:
        'Configuration fonctionnelle, cache et notifications de test.'
    }
  ],
  paths: {
    ...publicPaths,
    ...authPaths,
    ...adminPaths,
    ...adminExtraPaths,
    ...dashboardPaths,
    ...storagePaths,
    ...settingsPaths,
    ...userPaths
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access token obtenu par POST /auth/login ou POST /auth/refresh.'
      }
    },
    schemas: swaggerSchemas
  }
};
