import type { PoolClient } from 'pg';
import { getDatabasePool } from '../../core/config/database.js';
import { enqueueSearchSync } from '../../core/queues/search.queue.js';
import { AppError } from '../../core/utils/appError.js';
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
           product_id, url, is_primary, display_order
         )
         VALUES ($1, $2, $3, $4)`,
        [
          productId,
          image.url,
          image.isPrimary || (!hasPrimary && index === 0),
          image.displayOrder
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
    pagination: { page, limit, total }
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
    pagination: { page, limit, total }
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
