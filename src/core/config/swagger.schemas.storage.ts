const success = { type: 'string', enum: ['success'], example: 'success' };
const uuid = {
  type: 'string',
  format: 'uuid',
  example: '123e4567-e89b-12d3-a456-426614174000'
};
const createdAt = {
  type: 'string',
  format: 'date-time',
  example: '2026-06-15T10:00:00.000Z'
};

export const storageSchemas = {
  CreateStorageBucketRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: {
        type: 'string',
        minLength: 3,
        maxLength: 50,
        example: 'catalogue'
      },
      public: { type: 'boolean', default: true, example: true }
    }
  },
  StorageBucket: {
    type: 'object',
    properties: {
      id: uuid,
      name: { type: 'string', example: 'catalogue' },
      slug: { type: 'string', example: 'catalogue' },
      is_public: { type: 'boolean', example: true },
      objects_count: { type: 'integer', example: 12 },
      created_at: createdAt
    }
  },
  StorageBucketsResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          buckets: {
            type: 'array',
            items: { $ref: '#/components/schemas/StorageBucket' }
          }
        }
      }
    }
  },
  StorageBucketResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          bucket: { $ref: '#/components/schemas/StorageBucket' }
        }
      }
    }
  },
  StorageObject: {
    type: 'object',
    properties: {
      id: uuid,
      bucket_id: uuid,
      name: {
        type: 'string',
        example: 'd50836c8-c397-4db9-9371-0b8a467c5271.webp'
      },
      object_key: {
        type: 'string',
        example: 'uploads/2026/06/d50836c8-c397-4db9-9371-0b8a467c5271.webp'
      },
      url: {
        type: 'string',
        format: 'uri',
        example:
          'http://localhost:9000/ttk-catalogue/uploads/2026/06/d50836c8-c397-4db9-9371-0b8a467c5271.webp'
      },
      mime_type: { type: 'string', example: 'image/webp' },
      size: { type: 'integer', format: 'int64', example: 183420 },
      created_at: createdAt
    }
  },
  StorageObjectsResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/StorageObject' }
          }
        }
      }
    }
  },
  StorageObjectResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          object: { $ref: '#/components/schemas/StorageObject' }
        }
      }
    }
  }
};
