type OpenApiObject = Record<string, unknown>;

export const secure = [{ bearerAuth: [] }];

export const schemaRef = (name: string): OpenApiObject => ({
  $ref: `#/components/schemas/${name}`
});

export const requestBody = (schemaName: string): OpenApiObject => ({
  required: true,
  content: {
    'application/json': {
      schema: schemaRef(schemaName)
    }
  }
});

export const jsonResponse = (
  description: string,
  schemaName: string
): OpenApiObject => ({
  description,
  content: {
    'application/json': {
      schema: schemaRef(schemaName)
    }
  }
});

export const noContentResponse = (description: string): OpenApiObject => ({
  description
});

export const errorResponse = (
  description: string,
  code: string,
  message: string
): OpenApiObject => ({
  description,
  content: {
    'application/json': {
      schema: schemaRef('ErrorResponse'),
      example: { status: 'error', code, message }
    }
  }
});

export const validationError = errorResponse(
  'La requête ne respecte pas le format attendu. Le message indique le champ invalide.',
  'VALIDATION_ERROR',
  '"email" doit être une adresse email valide'
);

export const unauthorizedError = errorResponse(
  "Le jeton Bearer est absent, invalide, expiré, ou le compte n'est plus disponible.",
  'UNAUTHORIZED',
  "Authentification requise"
);

export const forbiddenError = errorResponse(
  "Le compte est authentifié mais ne possède pas le rôle ADMIN requis.",
  'FORBIDDEN',
  'Accès interdit'
);

export const conflictError = errorResponse(
  "La ressource entre en conflit avec une donnée existante ou une règle métier.",
  'CATALOG_CONFLICT',
  'Une ressource avec cette valeur existe déjà'
);

export const internalError = errorResponse(
  "Une erreur interne inattendue s'est produite.",
  'INTERNAL_ERROR',
  'Une erreur interne est survenue'
);

export const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'Identifiant UUID de la ressource.',
  schema: { type: 'string', format: 'uuid' }
};

export const pathId = (name: string, description: string) => ({
  ...idParameter,
  name,
  description
});

export const slugParameter = {
  name: 'slug',
  in: 'path',
  required: true,
  description: 'Slug public du service.',
  schema: { type: 'string', maxLength: 120, example: 'abonnements' }
};

export const paginationParameters = [
  {
    name: 'page',
    in: 'query',
    description: 'Numéro de page, à partir de 1.',
    schema: { type: 'integer', minimum: 1, default: 1 }
  },
  {
    name: 'limit',
    in: 'query',
    description: "Nombre d'éléments par page.",
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }
  }
];

export const adminErrors = {
  '400': validationError,
  '401': unauthorizedError,
  '403': forbiddenError,
  '500': internalError
};
