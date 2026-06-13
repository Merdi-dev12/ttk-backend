import { config } from './env.js';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'TTK API',
    version: '1.0.0',
    description: 'API du monolithe modulaire TTK.'
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
      description: "État de l'API"
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: "Vérifie que l'API répond",
        operationId: 'getHealth',
        responses: {
          '200': {
            description: "L'API est disponible",
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Health'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Health: {
        type: 'object',
        required: ['status', 'timestamp', 'environment'],
        properties: {
          status: {
            type: 'string',
            example: 'ok'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          environment: {
            type: 'string',
            example: 'development'
          }
        }
      },
      Error: {
        type: 'object',
        required: ['status', 'message'],
        properties: {
          status: {
            type: 'string',
            example: 'error'
          },
          message: {
            type: 'string'
          }
        }
      }
    }
  }
};
