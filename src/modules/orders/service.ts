import { randomUUID } from 'node:crypto';
import { config } from '../../core/config/env.js';
import { getDatabasePool } from '../../core/config/database.js';
import { enqueueOrderPaymentLinkEmail } from '../../core/queues/email.queue.js';
import { AppError } from '../../core/utils/appError.js';
import { paginationResult } from '../../core/utils/pagination.js';

type OrderStatus = 'PENDING' | 'APPROVED' | 'CANCELLED';

interface CreateOrderInput {
  serviceId: string;
  productId?: string;
  modalityId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerSex: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  customerAge: number;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface AdminOrdersQuery {
  page: number;
  limit: number;
  search?: string;
  sortOrder: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
  status?: OrderStatus;
  serviceId?: string;
  sortBy: 'reference' | 'status' | 'customerName' | 'created_at' | 'updated_at';
}

interface UserOrdersQuery {
  page: number;
  limit: number;
  status?: OrderStatus;
}

const orderSelection = `
  o.id, o.reference, o.service_id AS "serviceId",
  o.product_id AS "productId", o.modality_id AS "modalityId",
  o.service_snapshot AS "serviceSnapshot",
  o.product_snapshot AS "productSnapshot",
  o.modality_snapshot AS "modalitySnapshot",
  o.customer_name AS "customerName",
  o.customer_email AS "customerEmail",
  o.customer_phone AS "customerPhone",
  o.customer_address AS "customerAddress",
  o.customer_sex AS "customerSex",
  o.customer_age AS "customerAge",
  (
    SELECT u.id
    FROM users u
    WHERE LOWER(u.email::TEXT) = LOWER(o.customer_email::TEXT)
    LIMIT 1
  ) AS "customerUserId",
  (
    SELECT u.avatar_url
    FROM users u
    WHERE LOWER(u.email::TEXT) = LOWER(o.customer_email::TEXT)
    LIMIT 1
  ) AS "customerAvatarUrl",
  o.message, o.metadata, o.status,
  o.admin_note AS "adminNote",
  o.payment_token AS "paymentToken",
  o.payment_link_sent_at AS "paymentLinkSentAt",
  o.status_updated_by AS "statusUpdatedBy",
  o.approved_at AS "approvedAt",
  o.cancelled_at AS "cancelledAt",
  o.created_at AS "createdAt",
  o.updated_at AS "updatedAt"
`;

const userOrderSelection = `
  o.id, o.reference, o.service_id AS "serviceId",
  o.product_id AS "productId", o.modality_id AS "modalityId",
  o.service_snapshot AS "serviceSnapshot",
  o.product_snapshot AS "productSnapshot",
  o.modality_snapshot AS "modalitySnapshot",
  o.customer_name AS "customerName",
  o.customer_email AS "customerEmail",
  o.customer_phone AS "customerPhone",
  o.customer_address AS "customerAddress",
  o.customer_sex AS "customerSex",
  o.customer_age AS "customerAge",
  (
    SELECT u.id
    FROM users u
    WHERE LOWER(u.email::TEXT) = LOWER(o.customer_email::TEXT)
    LIMIT 1
  ) AS "customerUserId",
  (
    SELECT u.avatar_url
    FROM users u
    WHERE LOWER(u.email::TEXT) = LOWER(o.customer_email::TEXT)
    LIMIT 1
  ) AS "customerAvatarUrl",
  o.message, o.metadata, o.status,
  o.admin_note AS "adminNote",
  o.payment_link_sent_at AS "paymentLinkSentAt",
  o.approved_at AS "approvedAt",
  o.cancelled_at AS "cancelledAt",
  o.created_at AS "createdAt",
  o.updated_at AS "updatedAt",
  CASE
    WHEN o.status = 'APPROVED' AND o.payment_token IS NOT NULL
    THEN o.payment_token
    ELSE NULL
  END AS "paymentToken"
`;

function formatAmount(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Number(value).toFixed(2);
}

function amountValue(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function buildPaymentUrl(token: string): string {
  return `${config.frontendUrl.replace(/\/+$/, '')}/payment/orders/${token}`;
}

function hydrateOrder(order: Record<string, any>): Record<string, any> {
  const service = order.serviceSnapshot ?? null;
  const product = order.productSnapshot ?? null;
  const modality = order.modalitySnapshot ?? null;

  return {
    ...order,
    service,
    product,
    modality,
    serviceName: service?.name ?? null,
    productName: product?.name ?? null,
    modalityLabel: modality?.label ?? null,
    amount: amountValue(modality?.price),
    currency: modality?.currency ?? null
  };
}

function mapUserOrder(order: Record<string, any>) {
  const hydrated = hydrateOrder(order);
  const { paymentToken, ...safeOrder } = hydrated;
  return {
    ...safeOrder,
    paymentUrl: paymentToken ? buildPaymentUrl(paymentToken) : null
  };
}

function createReference(): string {
  const compactDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TTK-${compactDate}-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

async function getOrder(id: string) {
  const result = await getDatabasePool().query(
    `SELECT ${orderSelection}
     FROM order_requests o
     WHERE o.id = $1`,
    [id]
  );

  const order = result.rows[0];
  if (!order) {
    throw new AppError(404, 'Commande introuvable', 'ORDER_NOT_FOUND');
  }
  return hydrateOrder(order);
}

async function createUniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = createReference();
    const exists = await getDatabasePool().query(
      'SELECT EXISTS(SELECT 1 FROM order_requests WHERE reference = $1) AS exists',
      [reference]
    );

    if (!exists.rows[0]?.exists) {
      return reference;
    }
  }

  throw new AppError(503, 'Impossible de generer une reference de commande', 'ORDER_REFERENCE_FAILED');
}

export async function createOrder(input: CreateOrderInput) {
  const pool = getDatabasePool();
  const client = await pool.connect();
  await client.query('BEGIN');

  try {
    const serviceResult = await client.query(
      `SELECT id, name, slug, description, image_url, type, order_flow, status
       FROM services
       WHERE id = $1`,
      [input.serviceId]
    );
    const service = serviceResult.rows[0];

    if (!service || service.status !== 'ACTIVE') {
      throw new AppError(404, 'Service introuvable', 'SERVICE_NOT_FOUND');
    }
    if (service.order_flow !== 'ORDER_REQUEST') {
      throw new AppError(
        409,
        'Ce service est configure pour le paiement direct',
        'SERVICE_REQUIRES_DIRECT_PAYMENT'
      );
    }

    let product = null;
    if (input.productId) {
      const productResult = await client.query(
        `SELECT id, service_id, name, slug, description, status
         FROM products
         WHERE id = $1 AND service_id = $2`,
        [input.productId, input.serviceId]
      );
      product = productResult.rows[0] ?? null;
      if (!product || product.status !== 'ACTIVE') {
        throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
      }
      if (!input.modalityId) {
        throw new AppError(
          400,
          'Veuillez selectionner une option pour ce produit',
          'MODALITY_REQUIRED'
        );
      }
    }

    let modality = null;
    if (input.modalityId) {
      const modalityResult = await client.query(
        `SELECT m.id, m.product_id, m.label, m.price, m.old_price, m.currency,
                m.availability, m.additional_attributes
         FROM modalities m
         JOIN products p ON p.id = m.product_id
         WHERE m.id = $1 AND p.service_id = $2`,
        [input.modalityId, input.serviceId]
      );
      modality = modalityResult.rows[0] ?? null;
      if (!modality) {
        throw new AppError(404, 'Modalite introuvable', 'MODALITY_NOT_FOUND');
      }
      if (modality.availability === 'UNAVAILABLE') {
        throw new AppError(409, 'Cette modalite est indisponible', 'MODALITY_UNAVAILABLE');
      }
      if (product && modality.product_id !== product.id) {
        throw new AppError(
          409,
          'La modalite ne correspond pas au produit choisi',
          'MODALITY_PRODUCT_MISMATCH'
        );
      }
    }

    const reference = await createUniqueReference();
    const result = await client.query<{ id: string }>(
      `INSERT INTO order_requests(
         reference, service_id, product_id, modality_id,
         service_snapshot, product_snapshot, modality_snapshot,
         customer_name, customer_email, customer_phone, customer_address,
         customer_sex, customer_age, message, metadata
       )
       VALUES (
         $1, $2, $3, $4,
         $5::jsonb, $6::jsonb, $7::jsonb,
         $8, $9, $10, $11, $12, $13, $14, $15::jsonb
       )
       RETURNING id`,
      [
        reference,
        service.id,
        product?.id ?? modality?.product_id ?? null,
        modality?.id ?? null,
        JSON.stringify(service),
        product ? JSON.stringify(product) : null,
        modality ? JSON.stringify(modality) : null,
        input.customerName,
        input.customerEmail,
        input.customerPhone,
        input.customerAddress,
        input.customerSex,
        input.customerAge,
        input.message || null,
        JSON.stringify(input.metadata ?? {})
      ]
    );
    await client.query(
      `INSERT INTO order_request_history(
         order_request_id, previous_status, new_status, note, actor_type
       )
       VALUES ($1, NULL, 'PENDING', $2, 'CUSTOMER')`,
      [result.rows[0]!.id, 'Commande soumise par le client']
    );

    await client.query('COMMIT');

    return getOrder(result.rows[0]!.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminOrders(query: AdminOrdersQuery) {
  const offset = (query.page - 1) * query.limit;
  const search = query.search ? `%${query.search}%` : null;
  const sortColumns = {
    reference: 'o.reference',
    status: 'o.status',
    customerName: 'o.customer_name',
    created_at: 'o.created_at',
    updated_at: 'o.updated_at'
  } as const;
  const sortColumn = sortColumns[query.sortBy];
  const direction = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
  const params = [
    query.status ?? null,
    query.serviceId ?? null,
    search,
    query.dateFrom ?? null,
    query.dateTo ?? null
  ];
  const where = `
    WHERE ($1::order_request_status IS NULL OR o.status = $1)
      AND ($2::UUID IS NULL OR o.service_id = $2)
      AND ($3::TEXT IS NULL OR o.reference ILIKE $3
           OR o.customer_name ILIKE $3
           OR o.customer_email::TEXT ILIKE $3
           OR o.customer_phone ILIKE $3)
      AND ($4::TIMESTAMPTZ IS NULL OR o.created_at >= $4)
      AND ($5::TIMESTAMPTZ IS NULL OR o.created_at <= $5)
  `;

  const totalResult = await getDatabasePool().query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM order_requests o
     ${where}`,
    params
  );
  const result = await getDatabasePool().query(
    `SELECT ${orderSelection}
     FROM order_requests o
     ${where}
     ORDER BY ${sortColumn} ${direction}, o.id ASC
     LIMIT $6 OFFSET $7`,
    [...params, query.limit, offset]
  );

  return {
    items: result.rows.map(hydrateOrder),
    pagination: paginationResult(query, totalResult.rows[0]!.total)
  };
}

export async function listUserOrders(email: string, query: UserOrdersQuery) {
  const offset = (query.page - 1) * query.limit;
  const pool = getDatabasePool();
  const params = [
    email.toLowerCase(),
    query.status ?? null
  ];
  const where = `
    WHERE LOWER(o.customer_email::TEXT) = $1
      AND ($2::order_request_status IS NULL OR o.status = $2)
  `;

  const totalResult = await pool.query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM order_requests o
     ${where}`,
    params
  );
  const result = await pool.query(
    `SELECT ${userOrderSelection}
     FROM order_requests o
     ${where}
     ORDER BY o.created_at DESC, o.id ASC
     LIMIT $3 OFFSET $4`,
    [...params, query.limit, offset]
  );

  return {
    items: result.rows.map(mapUserOrder),
    pagination: paginationResult(query, totalResult.rows[0]!.total)
  };
}

export async function getUserOrder(id: string, email: string) {
  const result = await getDatabasePool().query(
    `SELECT ${userOrderSelection}
     FROM order_requests o
     WHERE o.id = $1 AND LOWER(o.customer_email::TEXT) = $2`,
    [id, email.toLowerCase()]
  );
  const order = result.rows[0];
  if (!order) {
    throw new AppError(404, 'Commande introuvable', 'ORDER_NOT_FOUND');
  }

  return mapUserOrder(order);
}

export async function getAdminOrder(id: string) {
  return getOrder(id);
}

export async function updateOrderStatus(
  id: string,
  input: { status: OrderStatus; adminNote?: string | null },
  adminId: string
) {
  const pool = getDatabasePool();
  const current = await getOrder(id);
  const paymentToken = input.status === 'APPROVED'
    ? current.paymentToken ?? randomUUID()
    : current.paymentToken;

  const client = await pool.connect();
  await client.query('BEGIN');

  let order;
  try {
    const result = await client.query(
      `UPDATE order_requests AS o
       SET status = $2,
           admin_note = CASE WHEN $3::BOOLEAN THEN $4 ELSE admin_note END,
           payment_token = $5,
           approved_at = CASE WHEN $2 = 'APPROVED' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
           cancelled_at = CASE WHEN $2 = 'CANCELLED' THEN COALESCE(cancelled_at, NOW()) ELSE cancelled_at END,
           status_updated_by = $6,
           updated_at = NOW()
       WHERE o.id = $1
       RETURNING ${orderSelection}`,
      [
        id,
        input.status,
        Object.hasOwn(input, 'adminNote'),
        input.adminNote || null,
        paymentToken,
        adminId
      ]
    );
    order = result.rows[0];
    if (!order) {
      throw new AppError(404, 'Commande introuvable', 'ORDER_NOT_FOUND');
    }

    if (
      current.status !== input.status ||
      (Object.hasOwn(input, 'adminNote') && current.adminNote !== input.adminNote)
    ) {
      await client.query(
        `INSERT INTO order_request_history(
           order_request_id, previous_status, new_status,
           note, actor_id, actor_type
         )
         VALUES ($1, $2, $3, $4, $5, 'ADMIN')`,
        [
          id,
          current.status,
          input.status,
          input.adminNote || null,
          adminId
        ]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  if (
    input.status === 'APPROVED' &&
    paymentToken &&
    (current.status !== 'APPROVED' || !current.paymentLinkSentAt)
  ) {
    await enqueueOrderPaymentLinkEmail({
      type: 'ORDER_PAYMENT_LINK',
      to: order.customerEmail,
      customerName: order.customerName,
      reference: order.reference,
      paymentUrl: buildPaymentUrl(paymentToken),
      serviceName: order.serviceSnapshot.name,
      productName: order.productSnapshot?.name ?? null,
      amount: formatAmount(order.modalitySnapshot?.price),
      currency: order.modalitySnapshot?.currency ?? null
    });

    await getDatabasePool().query(
      `UPDATE order_requests
       SET payment_link_sent_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [order.id]
    );
    order.paymentLinkSentAt = new Date().toISOString();
  }

  return hydrateOrder(order);
}

export async function listOrderHistory(orderId: string) {
  await getOrder(orderId);
  const result = await getDatabasePool().query(
    `SELECT h.id,
            h.previous_status AS "previousStatus",
            h.new_status AS "newStatus",
            h.new_status AS "status",
            h.note,
            h.note AS "adminNote",
            h.actor_id AS "actorId",
            h.actor_type AS "actorType",
            u.email AS "actorEmail",
            u.nom AS "actorName",
            h.created_at AS "createdAt"
     FROM order_request_history h
     LEFT JOIN users u ON u.id = h.actor_id
     WHERE h.order_request_id = $1
     ORDER BY h.created_at DESC`,
    [orderId]
  );

  return { items: result.rows };
}

export async function getPaymentOrderByToken(token: string) {
  const result = await getDatabasePool().query(
    `SELECT ${orderSelection}
     FROM order_requests o
     WHERE o.payment_token = $1 AND o.status = 'APPROVED'`,
    [token]
  );
  const order = result.rows[0];
  if (!order) {
    throw new AppError(404, 'Lien de paiement introuvable', 'PAYMENT_LINK_NOT_FOUND');
  }

  return {
    id: order.id,
    reference: order.reference,
    service: order.serviceSnapshot,
    product: order.productSnapshot,
    modality: order.modalitySnapshot,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    amount: formatAmount(order.modalitySnapshot?.price),
    currency: order.modalitySnapshot?.currency ?? null,
    status: order.status
  };
}
