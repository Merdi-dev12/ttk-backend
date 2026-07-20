import { Worker } from 'bullmq';
import { getDatabasePool } from '../config/database.js';
import { getMeilisearchClient } from '../config/meilisearch.js';
import { getRedisConnectionOptions } from '../config/redis.js';
import {
  catalogIndexName,
  configureCatalogIndex,
  searchTaskWaitOptions,
  type CatalogSearchDocument
} from '../search/catalogSearch.js';
import { logger } from '../utils/logger.js';
import type { SearchJob } from './search.queue.js';

const client = getMeilisearchClient();
const index = client.index<CatalogSearchDocument>(catalogIndexName);
await configureCatalogIndex();

async function syncService(id: string): Promise<void> {
  const result = await getDatabasePool().query<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    order_flow: 'DIRECT_PAYMENT' | 'ORDER_REQUEST';
    status: string;
  }>(
    `SELECT id, name, slug, description, image_url, order_flow, status
     FROM services WHERE id = $1`,
    [id]
  );
  const service = result.rows[0];
  const documentId = `service_${id}`;

  if (!service || service.status !== 'ACTIVE') {
    await client.tasks.waitForTask(
      await index.deleteDocument(documentId),
      searchTaskWaitOptions
    );
    return;
  }

  await client.tasks.waitForTask(
    await index.addDocuments([{
      id: documentId,
      entityId: service.id,
      kind: 'SERVICE',
      name: service.name,
      slug: service.slug,
      description: service.description,
      imageUrl: service.image_url,
      orderFlow: service.order_flow,
      serviceId: null,
      serviceName: null,
      minPrice: null,
      maxPrice: null,
      currencies: []
    }]),
    searchTaskWaitOptions
  );
}

async function syncProduct(id: string): Promise<void> {
  const result = await getDatabasePool().query<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    service_id: string;
    service_name: string;
    service_order_flow: 'DIRECT_PAYMENT' | 'ORDER_REQUEST';
    service_status: string;
    image_url: string | null;
    min_price: string | null;
    max_price: string | null;
    currencies: string[] | null;
  }>(
    `SELECT p.id, p.name, p.slug, p.description, p.status,
            s.id AS service_id, s.name AS service_name,
            s.order_flow AS service_order_flow,
            s.status AS service_status,
            (
              SELECT pi.url FROM product_images pi
              WHERE pi.product_id = p.id
              ORDER BY pi.is_primary DESC, pi.display_order
              LIMIT 1
            ) AS image_url,
            (SELECT MIN(m.price) FROM modalities m WHERE m.product_id = p.id)
              AS min_price,
            (SELECT MAX(m.price) FROM modalities m WHERE m.product_id = p.id)
              AS max_price,
            (
              SELECT ARRAY_AGG(DISTINCT m.currency)
              FROM modalities m WHERE m.product_id = p.id
            ) AS currencies
     FROM products p
     JOIN services s ON s.id = p.service_id
     WHERE p.id = $1`,
    [id]
  );
  const product = result.rows[0];
  const documentId = `product_${id}`;

  if (
    !product ||
    product.status !== 'ACTIVE' ||
    product.service_status !== 'ACTIVE'
  ) {
    await client.tasks.waitForTask(
      await index.deleteDocument(documentId),
      searchTaskWaitOptions
    );
    return;
  }

  await client.tasks.waitForTask(
    await index.addDocuments([{
      id: documentId,
      entityId: product.id,
      kind: 'PRODUCT',
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrl: product.image_url,
      orderFlow: product.service_order_flow,
      serviceId: product.service_id,
      serviceName: product.service_name,
      minPrice: product.min_price === null ? null : Number(product.min_price),
      maxPrice: product.max_price === null ? null : Number(product.max_price),
      currencies: product.currencies ?? []
    }]),
    searchTaskWaitOptions
  );
}

async function reindexAll(): Promise<void> {
  const services = await getDatabasePool().query<{ id: string }>(
    'SELECT id FROM services'
  );
  const products = await getDatabasePool().query<{ id: string }>(
    'SELECT id FROM products'
  );
  await client.tasks.waitForTask(
    await index.deleteAllDocuments(),
    searchTaskWaitOptions
  );

  for (const service of services.rows) {
    await syncService(service.id);
  }
  for (const product of products.rows) {
    await syncProduct(product.id);
  }
}

const worker = new Worker<SearchJob>(
  'catalog-search',
  async (job) => {
    if (job.data.type === 'UPSERT_SERVICE') {
      await syncService(job.data.id);
    } else if (job.data.type === 'UPSERT_PRODUCT') {
      await syncProduct(job.data.id);
    } else {
      await reindexAll();
    }
  },
  { connection: getRedisConnectionOptions(), concurrency: 3 }
);

worker.on('failed', (job, error) => {
  logger.error('search_job_failed', {
    jobId: job?.id,
    jobType: job?.data.type,
    error
  });
});

async function shutdown(): Promise<void> {
  await worker.close();
  await getDatabasePool().end();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

logger.info('catalog_search_worker_started');
