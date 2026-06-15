import { authSchemas } from './swagger.schemas.auth.js';
import { catalogSchemas } from './swagger.schemas.catalog.js';
import { dashboardSchemas } from './swagger.schemas.dashboard.js';
import { resourceSchemas } from './swagger.schemas.resources.js';
import { storageSchemas } from './swagger.schemas.storage.js';

export const swaggerSchemas = {
  ...authSchemas,
  ...catalogSchemas,
  ...dashboardSchemas,
  ...resourceSchemas,
  ...storageSchemas
};
