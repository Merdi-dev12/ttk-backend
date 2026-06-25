import Joi from 'joi';
import ipaddr from 'ipaddr.js';

const currency = Joi.string().valid('CDF', 'USD');

function validTimezone(value: string, helpers: Joi.CustomHelpers) {
  const zones = Intl.supportedValuesOf('timeZone');
  return zones.includes(value) ? value : helpers.error('any.invalid');
}

function validIpOrCidr(value: string, helpers: Joi.CustomHelpers) {
  try {
    if (value.includes('/')) {
      ipaddr.parseCIDR(value);
    } else {
      ipaddr.parse(value);
    }
    return value;
  } catch {
    return helpers.error('any.invalid');
  }
}

export const settingsSchemas = {
  general: Joi.object({
    platformName: Joi.string().trim().min(2).max(100).required(),
    supportEmail: Joi.string().email().max(150).required(),
    supportPhone: Joi.string().trim().min(7).max(30).required(),
    defaultCurrency: currency.required(),
    timezone: Joi.string().custom(validTimezone).required(),
    maintenanceMode: Joi.boolean().required()
  }),
  catalog: Joi.object({
    autoPublishServices: Joi.boolean().required(),
    autoPublishProducts: Joi.boolean().required(),
    lowStockThreshold: Joi.number().integer().min(0).max(10000).required(),
    allowOutOfStockOrders: Joi.boolean().required()
  }),
  orders: Joi.object({
    referencePrefix: Joi.string()
      .trim().uppercase().pattern(/^[A-Z0-9-]+$/).min(2).max(12).required(),
    cancellationDelayMinutes: Joi.number().integer().min(1).max(10080).required(),
    autoCancelUnpaid: Joi.boolean().required(),
    requireAdminConfirmation: Joi.boolean().required()
  }),
  payments: Joi.object({
    enabledCurrencies: Joi.array().items(currency).min(1).unique().required(),
    paymentTimeoutMinutes: Joi.number().integer().min(1).max(1440).required(),
    manualVerification: Joi.boolean().required()
  }),
  notifications: Joi.object({
    adminEmail: Joi.string().email().max(150).required(),
    notifyNewOrder: Joi.boolean().required(),
    notifyNewSubmission: Joi.boolean().required(),
    notifyPaymentFailure: Joi.boolean().required(),
    dailyDigest: Joi.boolean().required()
  }),
  security: Joi.object({
    sessionIdleMinutes: Joi.number().integer().min(5).max(1440).required(),
    maxLoginAttempts: Joi.number().integer().min(1).max(20).required(),
    requireTwoFactor: Joi.boolean().required(),
    allowedAdminIps: Joi.array()
      .items(Joi.string().custom(validIpOrCidr))
      .max(100).unique().required()
  }),
  storage: Joi.object({
    maxImageSizeMb: Joi.number().integer().min(1).max(50).required(),
    allowedImageTypes: Joi.array().items(
      Joi.string().valid('image/jpeg', 'image/png', 'image/webp', 'image/avif')
    ).min(1).unique().required(),
    maxVideoSizeMb: Joi.number().integer().min(1).max(500).required(),
    allowedVideoTypes: Joi.array().items(
      Joi.string().valid('video/mp4', 'video/webm', 'video/quicktime')
    ).min(1).unique().required(),
    imageQuality: Joi.number().integer().min(40).max(100).required(),
    generateWebp: Joi.boolean().required()
  })
} as const;

export const testEmailSchema = Joi.object({
  email: Joi.string().email().max(150).required()
});

export type SettingsSection = keyof typeof settingsSchemas;
