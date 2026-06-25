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

export const authSchemas = {
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
      message: { type: 'string', example: 'Opération effectuée.' }
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
      postnom: { type: 'string', nullable: true, example: 'Ilunga' },
      email: { type: 'string', format: 'email', example: 'mariam@example.com' },
      role: { type: 'string', enum: ['USER', 'ADMIN'], example: 'USER' },
      status: { type: 'string', enum: ['ACTIVE', 'REVOKED'], example: 'ACTIVE' },
      avatar_url: {
        type: 'string',
        format: 'uri',
        nullable: true,
        example: 'https://cdn.example.com/avatars/admin.jpg'
      },
      created_at: dateTime
    }
  },
  RegisterRequest: {
    type: 'object',
    required: ['nom', 'email', 'password'],
    properties: {
      nom: { type: 'string', minLength: 2, maxLength: 100, example: 'Mariam' },
      postnom: { type: 'string', nullable: true, maxLength: 100, example: 'Ilunga' },
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
  GoogleLoginRequest: {
    type: 'object',
    required: ['credential'],
    properties: {
      credential: {
        type: 'string',
        description:
          'ID token JWT reçu dans credential depuis Google Identity Services.',
        example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ii4uLiJ9...'
      }
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
  UpdateProfileRequest: {
    type: 'object',
    minProperties: 1,
    properties: {
      nom: { type: 'string', minLength: 2, maxLength: 100 },
      postnom: { type: 'string', nullable: true, maxLength: 100 },
      avatarUrl: { type: 'string', format: 'uri', nullable: true }
    }
  },
  Session: {
    type: 'object',
    properties: {
      id: uuid,
      user_agent: { type: 'string', nullable: true },
      ip_address: { type: 'string', nullable: true, example: '127.0.0.1' },
      created_at: dateTime,
      last_used_at: dateTime,
      expires_at: dateTime
    }
  },
  SessionsResponse: {
    type: 'object',
    properties: {
      status: success,
      data: {
        type: 'object',
        properties: {
          sessions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Session' }
          }
        }
      }
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
  }
};
