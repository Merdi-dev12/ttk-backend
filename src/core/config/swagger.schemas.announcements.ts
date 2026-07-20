const announcement = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string', example: 'Promotion speciale' },
    description: {
      type: 'string',
      nullable: true,
      example: 'Profitez de nos offres cette semaine.'
    },
    imageUrl: {
      type: 'string',
      format: 'uri',
      example: 'https://api.ttk-services.agency/storage/ttk-test/uploads/2026/07/image.jpg'
    },
    status: {
      type: 'string',
      enum: ['ACTIVE', 'SUSPENDED', 'DELETED']
    },
    createdBy: { type: 'string', format: 'uuid', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
};

export const announcementSchemas = {
  AnnouncementRequest: {
    type: 'object',
    required: ['name', 'imageUrl'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150 },
      description: { type: 'string', nullable: true, maxLength: 5000 },
      imageUrl: { type: 'string', format: 'uri' },
      status: {
        type: 'string',
        enum: ['ACTIVE', 'SUSPENDED', 'DELETED'],
        default: 'ACTIVE'
      }
    }
  },
  AnnouncementUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150 },
      description: { type: 'string', nullable: true, maxLength: 5000 },
      imageUrl: { type: 'string', format: 'uri' },
      status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] }
    }
  },
  Announcement: announcement,
  AnnouncementResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['success'] },
      data: {
        type: 'object',
        properties: {
          announcement
        }
      }
    }
  },
  AnnouncementListResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['success'] },
      data: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: announcement
          },
          pagination: { $ref: '#/components/schemas/Pagination' }
        }
      }
    }
  }
};
