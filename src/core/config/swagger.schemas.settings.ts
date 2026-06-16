const sectionRef = (name: string) => ({
  $ref: `#/components/schemas/${name}`
});

export const settingsSchemas = {
  GeneralSettings: {
    type: 'object',
    required: [
      'platformName', 'supportEmail', 'supportPhone',
      'defaultCurrency', 'timezone', 'maintenanceMode'
    ],
    properties: {
      platformName: { type: 'string', example: 'TTK Services' },
      supportEmail: { type: 'string', format: 'email', example: 'support@example.com' },
      supportPhone: { type: 'string', example: '+243000000000' },
      defaultCurrency: { type: 'string', enum: ['CDF', 'USD'] },
      timezone: { type: 'string', example: 'Africa/Kinshasa' },
      maintenanceMode: { type: 'boolean', example: false }
    }
  },
  CatalogSettings: {
    type: 'object',
    required: [
      'autoPublishServices', 'autoPublishProducts',
      'lowStockThreshold', 'allowOutOfStockOrders'
    ],
    properties: {
      autoPublishServices: { type: 'boolean' },
      autoPublishProducts: { type: 'boolean' },
      lowStockThreshold: { type: 'integer', minimum: 0, maximum: 10000 },
      allowOutOfStockOrders: { type: 'boolean' }
    }
  },
  OrdersSettings: {
    type: 'object',
    required: [
      'referencePrefix', 'cancellationDelayMinutes',
      'autoCancelUnpaid', 'requireAdminConfirmation'
    ],
    properties: {
      referencePrefix: { type: 'string', example: 'TTK' },
      cancellationDelayMinutes: { type: 'integer', minimum: 1, maximum: 10080 },
      autoCancelUnpaid: { type: 'boolean' },
      requireAdminConfirmation: { type: 'boolean' }
    }
  },
  PaymentsSettings: {
    type: 'object',
    required: ['enabledCurrencies', 'paymentTimeoutMinutes', 'manualVerification'],
    properties: {
      enabledCurrencies: {
        type: 'array',
        minItems: 1,
        uniqueItems: true,
        items: { type: 'string', enum: ['CDF', 'USD'] }
      },
      paymentTimeoutMinutes: { type: 'integer', minimum: 1, maximum: 1440 },
      manualVerification: { type: 'boolean' }
    }
  },
  NotificationsSettings: {
    type: 'object',
    required: [
      'adminEmail', 'notifyNewOrder', 'notifyNewSubmission',
      'notifyPaymentFailure', 'dailyDigest'
    ],
    properties: {
      adminEmail: { type: 'string', format: 'email' },
      notifyNewOrder: { type: 'boolean' },
      notifyNewSubmission: { type: 'boolean' },
      notifyPaymentFailure: { type: 'boolean' },
      dailyDigest: { type: 'boolean' }
    }
  },
  SecuritySettings: {
    type: 'object',
    required: [
      'sessionIdleMinutes', 'maxLoginAttempts',
      'requireTwoFactor', 'allowedAdminIps'
    ],
    properties: {
      sessionIdleMinutes: { type: 'integer', minimum: 5, maximum: 1440 },
      maxLoginAttempts: { type: 'integer', minimum: 1, maximum: 20 },
      requireTwoFactor: { type: 'boolean' },
      allowedAdminIps: {
        type: 'array',
        maxItems: 100,
        items: { type: 'string', example: '192.168.1.0/24' }
      }
    }
  },
  StorageSettings: {
    type: 'object',
    required: [
      'maxImageSizeMb', 'allowedImageTypes',
      'imageQuality', 'generateWebp'
    ],
    properties: {
      maxImageSizeMb: { type: 'integer', minimum: 1, maximum: 50 },
      allowedImageTypes: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'string',
          enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
        }
      },
      imageQuality: { type: 'integer', minimum: 40, maximum: 100 },
      generateWebp: { type: 'boolean' }
    }
  },
  AdminSettings: {
    type: 'object',
    properties: {
      general: sectionRef('GeneralSettings'),
      catalog: sectionRef('CatalogSettings'),
      orders: sectionRef('OrdersSettings'),
      payments: sectionRef('PaymentsSettings'),
      notifications: sectionRef('NotificationsSettings'),
      security: sectionRef('SecuritySettings'),
      storage: sectionRef('StorageSettings')
    }
  },
  AdminSettingsResponse: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['success'] },
      data: {
        type: 'object',
        properties: {
          settings: sectionRef('AdminSettings')
        }
      }
    }
  },
  TestEmailRequest: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@example.com' }
    }
  }
};
