const success = {
  type: 'string',
  enum: ['success'],
  example: 'success'
};

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

const nullableText = { type: 'string', nullable: true };

export const swaggerSchemas = {
  ErrorResponse: {
    type: 'object',
    required: ['status', 'code', 'message'],
    properties: {
      status: { type: 'string', enum: ['error'] },
      code: { type: 'string', example: 'VALIDATION_ERROR' },
      message: { type: 'string', example: 'La requête est invalide' }
    }
  },
  MessageResponse: {
    type: 'object',
    required: ['status', 'message'],
    properties: {
      status: success,
      message: { type: 'string' }
    }
  },
  Pagination: {
    type: 'object',
    required: ['page', 'limit', 'total', 'totalPages'],
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 2 },
      totalPages: { type: 'integer', example: 1 }
    }
  },
  User: {
    type: 'object',
    required: ['id', 'nom', 'email', 'role', 'status', 'created_at'],
    properties: {
      id: uuid,
      nom: { type: 'string', example: 'Mariam' },
      postnom: { ...nullableText, example: 'Ilunga' },
      email: { type: 'string', format: 'email', example: 'mariam@example.com' },
      role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
      status: { type: 'string', enum: ['ACTIVE', 'REVOKED'], example: 'ACTIVE' },
      created_at: dateTime
    }
  },
  RegisterRequest: {
    type: 'object',
    required: ['nom', 'email', 'password'],
    properties: {
      nom: { type: 'string', minLength: 2, maxLength: 100, example: 'Mariam' },
      postnom: { ...nullableText, maxLength: 100, example: 'Ilunga' },
      email: { type: 'string', format: 'email', example: 'mariam@example.com' },
      password: {
        type: 'string',
        format: 'password',
        minLength: 8,
        maxLength: 72,
        description: 'Au moins une minuscule, une majuscule et un chiffre.',
        example: 'Password123'
      }
    }
  },
  EmailRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'mariam@example.com' }
    }
  },
  OtpRequest: {
    type: 'object',
    required: ['email', 'otp'],
    properties: {
      email: { type: 'string', format: 'email', example: 'mariam@example.com' },
      otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' }
    }
  },
  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'mariam@example.com' },
      password: { type: 'string', format: 'password', example: 'Password123' }
    }
  },
  RefreshRequest: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' }
    }
  },
  ResetPasswordRequest: {
    type: 'object',
    required: ['email', 'otp', 'newPassword'],
    properties: {
      email: { type: 'string', format: 'email', example: 'mariam@example.com' },
      otp: { type: 'string', pattern: '^\\d{6}$', example: '123456' },
      newPassword: { type: 'string', format: 'password', example: 'NewPassword123' }
    }
  },
  ChangePasswordRequest: {
    type: 'object',
    required: ['currentPassword', 'newPassword'],
    properties: {
      currentPassword: { type: 'string', format: 'password', example: 'Password123' },
      newPassword: { type: 'string', format: 'password', example: 'NewPassword123' }
    }
  },
  UserResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: { user: { $ref: '#/components/schemas/User' } }
      }
    }
  },
  LoginResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' },
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' }
        }
      }
    }
  },
  TokenResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' },
          refreshToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiJ9...' }
        }
      }
    }
  },
  Currency: {
    type: 'object',
    properties: {
      code: { type: 'string', enum: ['USD', 'CDF'], example: 'CDF' },
      name: { type: 'string', example: 'Franc congolais' },
      symbol: { type: 'string', example: 'FC' },
      decimal_places: { type: 'integer', example: 2 }
    }
  },
  CurrenciesResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          currencies: {
            type: 'array',
            items: { $ref: '#/components/schemas/Currency' }
          }
        }
      }
    }
  },
  ServiceRequest: {
    type: 'object',
    required: ['name', 'type'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100, example: 'Abonnements' },
      description: { ...nullableText, maxLength: 5000, example: 'Abonnements numériques.' },
      imageUrl: {
        type: 'string',
        format: 'uri',
        nullable: true,
        example: 'https://cdn.example.com/services/subscriptions.jpg'
      },
      type: { type: 'string', enum: ['PRODUCTS', 'FORM'], example: 'PRODUCTS' }
    }
  },
  ServiceUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 100, example: 'Streaming' },
      description: { ...nullableText, maxLength: 5000 },
      imageUrl: { type: 'string', format: 'uri', nullable: true }
    }
  },
  CatalogStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'], example: 'ACTIVE' }
    }
  },
  Service: {
    type: 'object',
    properties: {
      id: uuid,
      name: { type: 'string', example: 'Abonnements' },
      slug: { type: 'string', example: 'abonnements' },
      description: nullableText,
      image_url: { type: 'string', format: 'uri', nullable: true },
      type: { type: 'string', enum: ['PRODUCTS', 'FORM'] },
      status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] },
      created_at: dateTime,
      updated_at: dateTime,
      fields: {
        type: 'array',
        description: 'Présent pour un service FORM.',
        items: { $ref: '#/components/schemas/FormField' }
      }
    }
  },
  ServiceResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: { service: { $ref: '#/components/schemas/Service' } }
      }
    }
  },
  ServiceListResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          services: { type: 'array', items: { $ref: '#/components/schemas/Service' } },
          pagination: { $ref: '#/components/schemas/Pagination' }
        }
      }
    }
  },
  FormFieldRequest: {
    type: 'object',
    required: ['technicalName', 'label', 'fieldType'],
    properties: {
      technicalName: {
        type: 'string',
        pattern: '^[a-z][a-z0-9_]*$',
        maxLength: 50,
        description: 'Nom technique unique. La valeur email est interdite.',
        example: 'montant_souhaite'
      },
      label: { type: 'string', maxLength: 150, example: 'Montant souhaité' },
      fieldType: {
        type: 'string',
        enum: ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'FILE', 'TEXTAREA', 'PHONE'],
        example: 'NUMBER'
      },
      required: { type: 'boolean', default: true, example: true },
      options: {
        type: 'array',
        description: 'Obligatoire uniquement lorsque fieldType vaut SELECT.',
        items: { type: 'string' },
        example: ['Salarié', 'Indépendant']
      },
      displayOrder: { type: 'integer', minimum: 0, default: 0, example: 1 }
    }
  },
  FormFieldUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      label: { type: 'string', maxLength: 150 },
      required: { type: 'boolean' },
      options: { type: 'array', items: { type: 'string' } },
      displayOrder: { type: 'integer', minimum: 0 }
    }
  },
  FormField: {
    type: 'object',
    properties: {
      id: uuid,
      service_id: uuid,
      technical_name: { type: 'string', example: 'montant_souhaite' },
      label: { type: 'string', example: 'Montant souhaité' },
      field_type: { type: 'string', example: 'NUMBER' },
      required: { type: 'boolean', example: true },
      options: { type: 'array', nullable: true, items: { type: 'string' } },
      display_order: { type: 'integer', example: 1 },
      created_at: dateTime,
      updated_at: dateTime
    }
  },
  ImageRequest: {
    type: 'object',
    required: ['url'],
    properties: {
      url: { type: 'string', format: 'uri', example: 'https://cdn.example.com/netflix.jpg' },
      isPrimary: { type: 'boolean', default: false, example: true },
      displayOrder: { type: 'integer', minimum: 0, default: 0, example: 0 }
    }
  },
  ImageUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      url: { type: 'string', format: 'uri' },
      isPrimary: { type: 'boolean' },
      displayOrder: { type: 'integer', minimum: 0 }
    }
  },
  ProductImage: {
    type: 'object',
    properties: {
      id: uuid,
      url: { type: 'string', format: 'uri' },
      isPrimary: { type: 'boolean' },
      displayOrder: { type: 'integer' }
    }
  },
  ModalityRequest: {
    type: 'object',
    required: ['label', 'price'],
    properties: {
      label: { type: 'string', maxLength: 100, example: '1 mois' },
      price: { type: 'number', format: 'double', minimum: 0, example: 10 },
      currency: { type: 'string', enum: ['USD', 'CDF'], default: 'CDF', example: 'USD' },
      availability: {
        type: 'string',
        enum: ['AVAILABLE', 'UNAVAILABLE', 'ON_REQUEST'],
        default: 'AVAILABLE',
        example: 'AVAILABLE'
      },
      additionalAttributes: {
        type: 'object',
        nullable: true,
        additionalProperties: true,
        example: { screens: 1, quality: 'HD' }
      }
    }
  },
  ModalityUpdateRequest: {
    allOf: [{ $ref: '#/components/schemas/ModalityRequest' }],
    minProperties: 1
  },
  ProductModality: {
    type: 'object',
    properties: {
      id: uuid,
      label: { type: 'string', example: '1 mois' },
      price: { type: 'number', example: 8 },
      oldPrice: { type: 'number', nullable: true, example: 10 },
      currency: { type: 'string', enum: ['USD', 'CDF'] },
      availability: { type: 'string', enum: ['AVAILABLE', 'UNAVAILABLE', 'ON_REQUEST'] },
      additionalAttributes: { type: 'object', nullable: true, additionalProperties: true }
    }
  },
  ProductRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150, example: 'Netflix Premium' },
      description: { ...nullableText, maxLength: 10000, example: 'Accès Netflix Premium.' },
      adminNote: { ...nullableText, maxLength: 5000, example: 'Compte livré après paiement.' },
      images: {
        type: 'array',
        maxItems: 20,
        description: 'Une seule image peut avoir isPrimary=true.',
        items: { $ref: '#/components/schemas/ImageRequest' }
      },
      modalities: {
        type: 'array',
        maxItems: 50,
        items: { $ref: '#/components/schemas/ModalityRequest' }
      }
    }
  },
  ProductUpdateRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      name: { type: 'string', minLength: 2, maxLength: 150 },
      description: { ...nullableText, maxLength: 10000 },
      adminNote: { ...nullableText, maxLength: 5000 }
    }
  },
  Product: {
    type: 'object',
    properties: {
      id: uuid,
      service_id: uuid,
      name: { type: 'string', example: 'Netflix Premium' },
      slug: { type: 'string', example: 'netflix-premium' },
      description: nullableText,
      admin_note: { ...nullableText, description: 'Visible uniquement sur les routes administrateur.' },
      status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] },
      created_at: dateTime,
      updated_at: dateTime,
      images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
      modalities: { type: 'array', items: { $ref: '#/components/schemas/ProductModality' } }
    }
  },
  ProductResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: { product: { $ref: '#/components/schemas/Product' } }
      }
    }
  },
  ProductListResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
          pagination: { $ref: '#/components/schemas/Pagination' }
        }
      }
    }
  },
  ResourceResponse: {
    type: 'object',
    properties: {
      status: success,
      data: { type: 'object', additionalProperties: true }
    }
  },
  DiscountRequest: {
    type: 'object',
    required: ['price'],
    properties: {
      price: {
        type: 'number',
        minimum: 0,
        example: 8,
        description: "Nouveau prix réduit. Le prix courant sera déplacé dans old_price."
      }
    }
  },
  UserStatusRequest: {
    type: 'object',
    required: ['status'],
    properties: {
      status: { type: 'string', enum: ['ACTIVE', 'REVOKED'], example: 'REVOKED' }
    }
  },
  UserListResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          users: { type: 'array', items: { $ref: '#/components/schemas/User' } },
          pagination: { $ref: '#/components/schemas/Pagination' }
        }
      }
    }
  },
  SearchResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: true,
              example: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                kind: 'PRODUCT',
                name: 'Netflix Premium',
                slug: 'netflix-premium'
              }
            }
          },
          pagination: { $ref: '#/components/schemas/Pagination' },
          processingTimeMs: { type: 'integer', example: 2 }
        }
      }
    }
  },
  HealthResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', example: 'ok' },
      timestamp: dateTime,
      environment: { type: 'string', example: 'development' }
    }
  }
};
