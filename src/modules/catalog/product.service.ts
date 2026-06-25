import type { PoolClient } from 'pg';
import { getDatabasePool } from '../../core/config/database.js';
import { enqueueSearchSync } from '../../core/queues/search.queue.js';
import { AppError } from '../../core/utils/appError.js';
import { paginationResult } from '../../core/utils/pagination.js';
import { createSlug } from '../../core/utils/slug.js';
import type { ImageInput, ModalityInput } from './option.service.js';

async function assertProductService(
  client: PoolClient,
  serviceId: string
): Promise<void> {
  const result = await client.query<{ type: string }>(
    'SELECT type FROM services WHERE id = $1',
    [serviceId]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Service introuvable', 'SERVICE_NOT_FOUND');
  }
  if (result.rows[0].type !== 'PRODUCTS') {
    throw new AppError(
      409,
      'Les produits sont réservés aux services de type PRODUCTS',
      'INVALID_SERVICE_TYPE'
    );
  }
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

const productSelection = `
  p.id, p.service_id, p.name, p.slug, p.description, p.status,
  p.created_at, p.updated_at,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', pi.id,
        'url', pi.url,
        'mediaType', pi.media_type,
        'isPrimary', pi.is_primary,
        'displayOrder', pi.display_order
      ) ORDER BY pi.display_order, pi.created_at
    )
    FROM product_images pi
    WHERE pi.product_id = p.id
  ), '[]'::jsonb) AS images,
  COALESCE((
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', m.id,
        'label', m.label,
        'price', m.price,
        'oldPrice', m.old_price,
        'currency', m.currency,
        'availability', m.availability,
        'additionalAttributes', m.additional_attributes
      ) ORDER BY m.created_at
    )
    FROM modalities m
    WHERE m.product_id = p.id
  ), '[]'::jsonb) AS modalities
`;

export async function createProduct(
  serviceId: string,
  input: {
    name: string;
    description?: string | null;
    adminNote?: string | null;
    images: ImageInput[];
    modalities: ModalityInput[];
  }
) {
  const client = await getDatabasePool().connect();
  await client.query('BEGIN');

  try {
    await assertProductService(client, serviceId);
    const productResult = await client.query<{ id: string }>(
      `INSERT INTO products(
         service_id, name, slug, description, admin_note
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        serviceId,
        input.name,
        createSlug(input.name),
        input.description || null,
        input.adminNote || null
      ]
    );
    const productId = productResult.rows[0]!.id;
    const hasPrimary = input.images.some((image) => image.isPrimary);

    for (const [index, image] of input.images.entries()) {
      await client.query(
        `INSERT INTO product_images(
           product_id, url, is_primary, display_order, media_type
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [
          productId,
          image.url,
          image.isPrimary || (!hasPrimary && index === 0),
          image.displayOrder,
          image.mediaType
        ]
      );
    }

    for (const modality of input.modalities) {
      await client.query(
        `INSERT INTO modalities(
           product_id, label, price, currency,
           availability, additional_attributes
         )
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          productId,
          modality.label,
          modality.price,
          modality.currency,
          modality.availability,
          modality.additionalAttributes
            ? JSON.stringify(modality.additionalAttributes)
            : null
        ]
      );
    }

    await client.query('COMMIT');
    const product = await getAdminProduct(productId);
    await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
    return product;
  } catch (error) {
    await client.query('ROLLBACK');
    mapConflict(error);
  } finally {
    client.release();
  }
}

export async function listPublicProducts(
  serviceSlug: string,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;
  const result = await getDatabasePool().query(
    `SELECT ${productSelection}, COUNT(*) OVER()::INTEGER AS total
     FROM products p
     JOIN services s ON s.id = p.service_id
     WHERE s.slug = $1
       AND s.type = 'PRODUCTS'
       AND s.status = 'ACTIVE'
       AND p.status = 'ACTIVE'
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [serviceSlug, limit, offset]
  );
  const total = result.rows[0]?.total ?? 0;

  return {
    items: result.rows.map(({ total: _total, ...product }) => product),
    pagination: paginationResult({ page, limit }, total)
  };
}

export async function listAdminProducts(
  serviceId: string,
  page: number,
  limit: number
) {
  const offset = (page - 1) * limit;
  const result = await getDatabasePool().query(
    `SELECT ${productSelection}, p.admin_note,
            COUNT(*) OVER()::INTEGER AS total
     FROM products p
     WHERE p.service_id = $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [serviceId, limit, offset]
  );
  const total = result.rows[0]?.total ?? 0;

  return {
    items: result.rows.map(({ total: _total, ...product }) => product),
    pagination: paginationResult({ page, limit }, total)
  };
}

export interface AdminProductsInput {
  page: number;
  limit: number;
  search?: string;
  sortBy: 'name' | 'status' | 'created_at' | 'updated_at' | 'minPrice' | 'maxPrice';
  sortOrder: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
  serviceId?: string;
  status?: string;
  currency?: string;
  availability?: string;
  hasDiscount?: boolean;
}

export async function listAllAdminProducts(input: AdminProductsInput) {
  const offset = (input.page - 1) * input.limit;
  const search = input.search ? `%${input.search}%` : null;
  const sortColumns = {
    name: 'p.name',
    status: 'p.status',
    created_at: 'p.created_at',
    updated_at: 'p.updated_at',
    minPrice: '"minPrice"',
    maxPrice: '"maxPrice"'
  } as const;
  const orderBy = sortColumns[input.sortBy];
  const direction = input.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const result = await getDatabasePool().query(
    `SELECT ${productSelection}, p.admin_note,
            jsonb_build_object(
              'id', s.id, 'name', s.name, 'slug', s.slug
            ) AS service,
            (
              SELECT jsonb_build_object(
                'id', pi.id, 'url', pi.url,
                'mediaType', pi.media_type,
                'isPrimary', pi.is_primary,
                'displayOrder', pi.display_order
              )
              FROM product_images pi
              WHERE pi.product_id = p.id
              ORDER BY pi.is_primary DESC, pi.display_order, pi.created_at
              LIMIT 1
            ) AS "primaryImage",
            (SELECT MIN(m.price) FROM modalities m
             WHERE m.product_id = p.id) AS "minPrice",
            (SELECT MAX(m.price) FROM modalities m
             WHERE m.product_id = p.id) AS "maxPrice",
            (SELECT COUNT(*)::INTEGER FROM modalities m
             WHERE m.product_id = p.id) AS "modalitiesCount",
            COUNT(*) OVER()::INTEGER AS total
     FROM products p
     JOIN services s ON s.id = p.service_id
     WHERE ($3::UUID IS NULL OR p.service_id = $3)
       AND ($4::catalog_status IS NULL OR p.status = $4)
       AND ($5::TEXT IS NULL OR p.name ILIKE $5 OR p.slug ILIKE $5
            OR p.description ILIKE $5 OR p.admin_note ILIKE $5
            OR s.name ILIKE $5)
       AND ($6::TIMESTAMPTZ IS NULL OR p.created_at >= $6)
       AND ($7::TIMESTAMPTZ IS NULL OR p.created_at <= $7)
       AND ($8::VARCHAR IS NULL OR EXISTS(
         SELECT 1 FROM modalities m
         WHERE m.product_id = p.id AND m.currency = $8
       ))
       AND ($9::availability_status IS NULL OR EXISTS(
         SELECT 1 FROM modalities m
         WHERE m.product_id = p.id AND m.availability = $9
       ))
       AND ($10::BOOLEAN IS NULL OR $10 = EXISTS(
         SELECT 1 FROM modalities m
         WHERE m.product_id = p.id AND m.old_price IS NOT NULL
       ))
     ORDER BY ${orderBy} ${direction} NULLS LAST, p.id ASC
     LIMIT $1 OFFSET $2`,
    [
      input.limit,
      offset,
      input.serviceId ?? null,
      input.status ?? null,
      search,
      input.dateFrom ?? null,
      input.dateTo ?? null,
      input.currency ?? null,
      input.availability ?? null,
      input.hasDiscount ?? null
    ]
  );
  const total = result.rows[0]?.total ?? 0;
  return {
    items: result.rows.map(({ total: _total, ...product }) => product),
    pagination: paginationResult(input, total)
  };
}

export async function getPublicProduct(id: string) {
  const result = await getDatabasePool().query(
    `SELECT ${productSelection}
     FROM products p
     JOIN services s ON s.id = p.service_id
     WHERE p.id = $1
       AND p.status = 'ACTIVE'
       AND s.status = 'ACTIVE'`,
    [id]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
  }
  return result.rows[0];
}

export async function getAdminProduct(id: string) {
  const result = await getDatabasePool().query(
    `SELECT ${productSelection}, p.admin_note
     FROM products p
     WHERE p.id = $1`,
    [id]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
  }
  return result.rows[0];
}

export async function updateProduct(
  id: string,
  input: {
    name?: string;
    description?: string | null;
    adminNote?: string | null;
  }
) {
  try {
    const result = await getDatabasePool().query(
      `UPDATE products SET
         name = COALESCE($2, name),
         slug = CASE WHEN $2::TEXT IS NULL THEN slug ELSE $3 END,
         description = CASE WHEN $4::BOOLEAN THEN $5 ELSE description END,
         admin_note = CASE WHEN $6::BOOLEAN THEN $7 ELSE admin_note END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [
        id,
        input.name ?? null,
        input.name ? createSlug(input.name) : null,
        Object.hasOwn(input, 'description'),
        input.description || null,
        Object.hasOwn(input, 'adminNote'),
        input.adminNote || null
      ]
    );

    if (!result.rows[0]) {
      throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
    }
    const product = await getAdminProduct(id);
    await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id });
    return product;
  } catch (error) {
    mapConflict(error);
  }
}

export async function updateProductStatus(id: string, status: string) {
  const result = await getDatabasePool().query(
    `UPDATE products SET status = $2, updated_at = NOW()
     WHERE id = $1 RETURNING id`,
    [id, status]
  );

  if (!result.rows[0]) {
    throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
  }
  const product = await getAdminProduct(id);
  await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id });
  return product;
}
