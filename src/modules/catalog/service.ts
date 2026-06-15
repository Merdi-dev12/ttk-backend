import { getDatabasePool } from '../../core/config/database.js';
import { enqueueSearchSync } from '../../core/queues/search.queue.js';
import { AppError } from '../../core/utils/appError.js';
import { paginationResult } from '../../core/utils/pagination.js';
import { createSlug } from '../../core/utils/slug.js';

interface Pagination {
  page: number;
  limit: number;
}

async function syncServiceTree(serviceId: string): Promise<void> {
  const products = await getDatabasePool().query<{ id: string }>(
    'SELECT id FROM products WHERE service_id = $1',
    [serviceId]
  );
  await enqueueSearchSync({ type: 'UPSERT_SERVICE', id: serviceId });
  await Promise.all(
    products.rows.map((product) =>
      enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: product.id })
    )
  );
}

export async function listCurrencies() {
  const result = await getDatabasePool().query(
    `SELECT code, name, symbol, decimal_places
     FROM currencies
     WHERE is_active = TRUE
     ORDER BY code`
  );
  return result.rows;
}

function mapConflict(error: unknown): never {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  ) {
    throw new AppError(409, 'Cette valeur existe déjà', 'CATALOG_CONFLICT');
  }
  throw error;
}

export async function listPublicServices(pagination: Pagination) {
  const offset = (pagination.page - 1) * pagination.limit;
  const result = await getDatabasePool().query(
    `SELECT id, name, slug, description, image_url, type, status,
            created_at, COUNT(*) OVER()::INTEGER AS total
     FROM services
     WHERE status = 'ACTIVE'
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [pagination.limit, offset]
  );
  const total = result.rows[0]?.total ?? 0;

  return {
    items: result.rows.map(({ total: _total, ...service }) => service),
    pagination: paginationResult(pagination, total)
  };
}

export async function listAdminServices(input: Pagination & {
  status?: string;
  type?: string;
  search?: string;
  sortBy: 'name' | 'type' | 'status' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
  includeCounts: boolean;
}) {
  const offset = (input.page - 1) * input.limit;
  const search = input.search ? `%${input.search}%` : null;
  const sortColumns = {
    name: 's.name',
    type: 's.type',
    status: 's.status',
    created_at: 's.created_at',
    updated_at: 's.updated_at'
  } as const;
  const orderBy = sortColumns[input.sortBy];
  const direction = input.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const result = await getDatabasePool().query(
    `SELECT s.id, s.name, s.slug, s.description, s.image_url, s.type,
            s.status, s.created_at, s.updated_at,
            CASE WHEN $8 THEN (
              SELECT COUNT(*)::INTEGER FROM products p WHERE p.service_id = s.id
            ) END AS "productsCount",
            CASE WHEN $8 THEN (
              SELECT COUNT(*)::INTEGER FROM form_fields f WHERE f.service_id = s.id
            ) END AS "fieldsCount",
            COUNT(*) OVER()::INTEGER AS total
     FROM services s
     WHERE ($3::catalog_status IS NULL OR s.status = $3)
       AND ($4::service_type IS NULL OR s.type = $4)
       AND ($5::TEXT IS NULL OR s.name ILIKE $5 OR s.slug ILIKE $5
            OR s.description ILIKE $5)
       AND ($6::TIMESTAMPTZ IS NULL OR s.created_at >= $6)
       AND ($7::TIMESTAMPTZ IS NULL OR s.created_at <= $7)
     ORDER BY ${orderBy} ${direction}, s.id ASC
     LIMIT $1 OFFSET $2`,
    [
      input.limit,
      offset,
      input.status ?? null,
      input.type ?? null,
      search,
      input.dateFrom ?? null,
      input.dateTo ?? null,
      input.includeCounts
    ]
  );
  const total = result.rows[0]?.total ?? 0;

  return {
    items: result.rows.map(({ total: _total, ...service }) => service),
    pagination: paginationResult(input, total)
  };
}

export async function getAdminService(id: string) {
  const result = await getDatabasePool().query(
    `SELECT s.*,
            (SELECT COUNT(*)::INTEGER FROM products p
             WHERE p.service_id = s.id) AS "productsCount",
            COALESCE((
              SELECT jsonb_agg(to_jsonb(f) ORDER BY f.display_order, f.created_at)
              FROM form_fields f WHERE f.service_id = s.id
            ), '[]'::jsonb) AS fields
     FROM services s
     WHERE s.id = $1`,
    [id]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Service introuvable', 'SERVICE_NOT_FOUND');
  }
  return result.rows[0];
}

export async function deleteService(id: string) {
  return updateServiceStatus(id, 'DELETED');
}

export async function getPublicService(slug: string) {
  const serviceResult = await getDatabasePool().query(
    `SELECT id, name, slug, description, image_url, type
     FROM services
     WHERE slug = $1 AND status = 'ACTIVE'`,
    [slug]
  );
  const service = serviceResult.rows[0];

  if (!service) {
    throw new AppError(404, 'Service introuvable', 'SERVICE_NOT_FOUND');
  }

  if (service.type === 'FORM') {
    const fields = await getDatabasePool().query(
      `SELECT id, technical_name, label, field_type, required, options,
              display_order
       FROM form_fields
       WHERE service_id = $1
       ORDER BY display_order, created_at`,
      [service.id]
    );
    return { ...service, fields: fields.rows };
  }

  return service;
}

export async function createService(input: {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  type: 'PRODUCTS' | 'FORM';
}) {
  try {
    const result = await getDatabasePool().query(
      `INSERT INTO services(name, slug, description, image_url, type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        input.name,
        createSlug(input.name),
        input.description || null,
        input.imageUrl || null,
        input.type
      ]
    );
    await syncServiceTree(result.rows[0].id);
    return result.rows[0];
  } catch (error) {
    mapConflict(error);
  }
}

export async function updateService(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    imageUrl?: string | null;
  }
) {
  try {
    const result = await getDatabasePool().query(
      `UPDATE services SET
         name = COALESCE($2, name),
         slug = CASE WHEN $2::TEXT IS NULL THEN slug ELSE $3 END,
         description = CASE WHEN $4::BOOLEAN THEN $5 ELSE description END,
         image_url = CASE WHEN $6::BOOLEAN THEN $7 ELSE image_url END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        input.name ?? null,
        input.name ? createSlug(input.name) : null,
        Object.hasOwn(input, 'description'),
        input.description || null,
        Object.hasOwn(input, 'imageUrl'),
        input.imageUrl || null
      ]
    );

    if (!result.rows[0]) {
      throw new AppError(404, 'Service introuvable', 'SERVICE_NOT_FOUND');
    }
    await syncServiceTree(id);
    return result.rows[0];
  } catch (error) {
    mapConflict(error);
  }
}

export async function updateServiceStatus(id: string, status: string) {
  const result = await getDatabasePool().query(
    `UPDATE services SET status = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Service introuvable', 'SERVICE_NOT_FOUND');
  }
  await syncServiceTree(id);
  return result.rows[0];
}

export async function createFormField(
  serviceId: string,
  input: {
    technicalName: string;
    label: string;
    fieldType: string;
    required: boolean;
    options?: string[];
    displayOrder: number;
  }
) {
  const service = await getDatabasePool().query<{ type: string }>(
    'SELECT type FROM services WHERE id = $1',
    [serviceId]
  );

  if (!service.rows[0]) {
    throw new AppError(404, 'Service introuvable', 'SERVICE_NOT_FOUND');
  }
  if (service.rows[0].type !== 'FORM') {
    throw new AppError(
      409,
      'Les champs sont réservés aux services de type FORM',
      'INVALID_SERVICE_TYPE'
    );
  }

  try {
    const result = await getDatabasePool().query(
      `INSERT INTO form_fields(
         service_id, technical_name, label, field_type,
         required, options, display_order
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        serviceId,
        input.technicalName,
        input.label,
        input.fieldType,
        input.required,
        input.options ? JSON.stringify(input.options) : null,
        input.displayOrder
      ]
    );
    return result.rows[0];
  } catch (error) {
    mapConflict(error);
  }
}

export async function updateFormField(
  serviceId: string,
  fieldId: string,
  input: {
    label?: string;
    required?: boolean;
    options?: string[];
    displayOrder?: number;
  }
) {
  const result = await getDatabasePool().query(
    `UPDATE form_fields SET
       label = COALESCE($3, label),
       required = COALESCE($4, required),
       options = CASE WHEN $5::BOOLEAN THEN $6::JSONB ELSE options END,
       display_order = COALESCE($7, display_order),
       updated_at = NOW()
     WHERE id = $1 AND service_id = $2
     RETURNING *`,
    [
      fieldId,
      serviceId,
      input.label ?? null,
      input.required ?? null,
      Object.hasOwn(input, 'options'),
      input.options ? JSON.stringify(input.options) : null,
      input.displayOrder ?? null
    ]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Champ introuvable', 'FORM_FIELD_NOT_FOUND');
  }
  return result.rows[0];
}

export async function deleteFormField(
  serviceId: string,
  fieldId: string
): Promise<void> {
  const result = await getDatabasePool().query(
    'DELETE FROM form_fields WHERE id = $1 AND service_id = $2',
    [fieldId, serviceId]
  );

  if (!result.rowCount) {
    throw new AppError(404, 'Champ introuvable', 'FORM_FIELD_NOT_FOUND');
  }
}
