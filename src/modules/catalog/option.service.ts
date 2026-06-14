import type { PoolClient } from 'pg';
import { getDatabasePool } from '../../core/config/database.js';
import { enqueueSearchSync } from '../../core/queues/search.queue.js';
import { AppError } from '../../core/utils/appError.js';

export interface ImageInput {
  url: string;
  isPrimary: boolean;
  displayOrder: number;
}

export interface ModalityInput {
  label: string;
  price: number;
  currency: string;
  availability: string;
  additionalAttributes?: Record<string, unknown> | null;
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

async function ensurePrimaryImage(
  client: PoolClient,
  productId: string
): Promise<void> {
  await client.query(
    `UPDATE product_images
     SET is_primary = TRUE
     WHERE id = (
       SELECT id
       FROM product_images
       WHERE product_id = $1
       ORDER BY display_order, created_at
       LIMIT 1
     )
     AND NOT EXISTS (
       SELECT 1
       FROM product_images
       WHERE product_id = $1 AND is_primary = TRUE
     )`,
    [productId]
  );
}

export async function addImage(productId: string, input: ImageInput) {
  const client = await getDatabasePool().connect();
  await client.query('BEGIN');

  try {
    if (input.isPrimary) {
      await client.query(
        'UPDATE product_images SET is_primary = FALSE WHERE product_id = $1',
        [productId]
      );
    }
    const result = await client.query(
      `INSERT INTO product_images(
         product_id, url, is_primary, display_order
       )
       SELECT $1, $2,
              ($3 OR NOT EXISTS(
                SELECT 1 FROM product_images WHERE product_id = $1
              )),
              $4
       WHERE EXISTS(SELECT 1 FROM products WHERE id = $1)
       RETURNING *`,
      [productId, input.url, input.isPrimary, input.displayOrder]
    );

    if (!result.rows[0]) {
      throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
    }
    await client.query('COMMIT');
    await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateImage(
  productId: string,
  imageId: string,
  input: Partial<ImageInput>
) {
  const client = await getDatabasePool().connect();
  await client.query('BEGIN');

  try {
    if (input.isPrimary) {
      await client.query(
        'UPDATE product_images SET is_primary = FALSE WHERE product_id = $1',
        [productId]
      );
    }
    const result = await client.query(
      `UPDATE product_images SET
         url = COALESCE($3, url),
         is_primary = COALESCE($4, is_primary),
         display_order = COALESCE($5, display_order)
       WHERE id = $1 AND product_id = $2
       RETURNING *`,
      [
        imageId,
        productId,
        input.url ?? null,
        input.isPrimary ?? null,
        input.displayOrder ?? null
      ]
    );

    if (!result.rows[0]) {
      throw new AppError(404, 'Image introuvable', 'IMAGE_NOT_FOUND');
    }
    await ensurePrimaryImage(client, productId);
    await client.query('COMMIT');
    await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteImage(
  productId: string,
  imageId: string
): Promise<void> {
  const client = await getDatabasePool().connect();
  await client.query('BEGIN');

  try {
    const result = await client.query(
      `DELETE FROM product_images
       WHERE id = $1 AND product_id = $2
       RETURNING id`,
      [imageId, productId]
    );
    if (!result.rowCount) {
      throw new AppError(404, 'Image introuvable', 'IMAGE_NOT_FOUND');
    }
    await ensurePrimaryImage(client, productId);
    await client.query('COMMIT');
    await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function addModality(
  productId: string,
  input: ModalityInput
) {
  try {
    const result = await getDatabasePool().query(
      `INSERT INTO modalities(
         product_id, label, price, currency,
         availability, additional_attributes
       )
       SELECT $1, $2, $3, $4, $5, $6
       WHERE EXISTS(SELECT 1 FROM products WHERE id = $1)
       RETURNING *`,
      [
        productId,
        input.label,
        input.price,
        input.currency,
        input.availability,
        input.additionalAttributes
          ? JSON.stringify(input.additionalAttributes)
          : null
      ]
    );
    if (!result.rows[0]) {
      throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
    }
    await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
    return result.rows[0];
  } catch (error) {
    mapConflict(error);
  }
}

export async function updateModality(
  productId: string,
  modalityId: string,
  input: Partial<ModalityInput>
) {
  try {
    const result = await getDatabasePool().query(
      `UPDATE modalities SET
         label = COALESCE($3, label),
         price = COALESCE($4, price),
         old_price = CASE
           WHEN $4::NUMERIC IS NOT NULL THEN NULL
           ELSE old_price
         END,
         currency = COALESCE($5, currency),
         availability = COALESCE($6, availability),
         additional_attributes = CASE
           WHEN $7::BOOLEAN THEN $8::JSONB
           ELSE additional_attributes
         END,
         updated_at = NOW()
       WHERE id = $1 AND product_id = $2
       RETURNING *`,
      [
        modalityId,
        productId,
        input.label ?? null,
        input.price ?? null,
        input.currency ?? null,
        input.availability ?? null,
        Object.hasOwn(input, 'additionalAttributes'),
        input.additionalAttributes
          ? JSON.stringify(input.additionalAttributes)
          : null
      ]
    );
    if (!result.rows[0]) {
      throw new AppError(404, 'Modalité introuvable', 'MODALITY_NOT_FOUND');
    }
    await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
    return result.rows[0];
  } catch (error) {
    mapConflict(error);
  }
}

export async function applyDiscount(
  productId: string,
  modalityId: string,
  newPrice: number
) {
  const result = await getDatabasePool().query(
    `UPDATE modalities
     SET old_price = COALESCE(old_price, price),
         price = $3,
         updated_at = NOW()
     WHERE id = $1
       AND product_id = $2
       AND $3 < price
     RETURNING *`,
    [modalityId, productId, newPrice]
  );

  if (!result.rows[0]) {
    const exists = await getDatabasePool().query(
      'SELECT 1 FROM modalities WHERE id = $1 AND product_id = $2',
      [modalityId, productId]
    );
    if (!exists.rowCount) {
      throw new AppError(404, 'Modalité introuvable', 'MODALITY_NOT_FOUND');
    }
    throw new AppError(
      400,
      'Le prix réduit doit être inférieur au prix actuel',
      'INVALID_DISCOUNT'
    );
  }

  await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
  return result.rows[0];
}

export async function removeDiscount(
  productId: string,
  modalityId: string
) {
  const result = await getDatabasePool().query(
    `UPDATE modalities
     SET price = old_price, old_price = NULL, updated_at = NOW()
     WHERE id = $1
       AND product_id = $2
       AND old_price IS NOT NULL
     RETURNING *`,
    [modalityId, productId]
  );

  if (!result.rows[0]) {
    throw new AppError(
      404,
      'Modalité introuvable ou sans réduction',
      'DISCOUNT_NOT_FOUND'
    );
  }

  await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
  return result.rows[0];
}

export async function deleteModality(
  productId: string,
  modalityId: string
): Promise<void> {
  const result = await getDatabasePool().query(
    'DELETE FROM modalities WHERE id = $1 AND product_id = $2',
    [modalityId, productId]
  );
  if (!result.rowCount) {
    throw new AppError(404, 'Modalité introuvable', 'MODALITY_NOT_FOUND');
  }
  await enqueueSearchSync({ type: 'UPSERT_PRODUCT', id: productId });
}
