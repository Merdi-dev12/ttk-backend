const success = { type: 'string', enum: ['success'], example: 'success' };
const dateTime = {
  type: 'string',
  format: 'date-time',
  example: '2026-06-14T10:30:00.000Z'
};
const uuid = {
  type: 'string',
  format: 'uuid',
  example: '123e4567-e89b-12d3-a456-426614174000'
};

export const resourceSchemas = {
  FormFieldResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          field: { $ref: '#/components/schemas/FormField' }
        }
      }
    }
  },
  ImageRecord: {
    type: 'object',
    properties: {
      id: uuid,
      product_id: uuid,
      url: {
        type: 'string',
        format: 'uri',
        example: 'https://cdn.example.com/netflix.jpg'
      },
      is_primary: { type: 'boolean', example: true },
      display_order: { type: 'integer', example: 0 },
      created_at: dateTime
    }
  },
  ImageResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          image: { $ref: '#/components/schemas/ImageRecord' }
        }
      }
    }
  },
  ModalityRecord: {
    type: 'object',
    properties: {
      id: uuid,
      product_id: uuid,
      label: { type: 'string', example: '1 mois' },
      price: { type: 'number', example: 8 },
      old_price: { type: 'number', nullable: true, example: 10 },
      currency: { type: 'string', enum: ['USD', 'CDF'], example: 'USD' },
      availability: {
        type: 'string',
        enum: ['AVAILABLE', 'UNAVAILABLE', 'ON_REQUEST'],
        example: 'AVAILABLE'
      },
      additional_attributes: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        example: { screens: 1, quality: 'HD' }
      },
      created_at: dateTime,
      updated_at: dateTime
    }
  },
  ModalityResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          modality: { $ref: '#/components/schemas/ModalityRecord' }
        }
      }
    }
  }
};
