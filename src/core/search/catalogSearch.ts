import { getMeilisearchClient } from '../config/meilisearch.js';

export const catalogIndexName = 'catalog';
export const searchTaskWaitOptions = { timeout: 30_000 };

export interface CatalogSearchDocument {
  id: string;
  entityId: string;
  kind: 'SERVICE' | 'PRODUCT';
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  orderFlow: 'DIRECT_PAYMENT' | 'ORDER_REQUEST';
  serviceId: string | null;
  serviceName: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  currencies: string[];
}

export async function configureCatalogIndex(): Promise<void> {
  const client = getMeilisearchClient();
  const index = client.index<CatalogSearchDocument>(catalogIndexName);

  try {
    await client.getRawIndex(catalogIndexName);
  } catch {
    await client.tasks.waitForTask(
      await client.createIndex(catalogIndexName, { primaryKey: 'id' }),
      searchTaskWaitOptions
    );
  }

  const searchableTask = await index.updateSearchableAttributes([
    'name',
    'description',
    'serviceName'
  ]);
  const filterableTask = await index.updateFilterableAttributes([
    'kind',
    'orderFlow',
    'serviceId',
    'currencies'
  ]);
  await client.tasks.waitForTasks(
    [searchableTask, filterableTask],
    searchTaskWaitOptions
  );
}

export async function searchCatalog(input: {
  query: string;
  page: number;
  limit: number;
  kind?: 'SERVICE' | 'PRODUCT';
}) {
  const index = getMeilisearchClient().index<CatalogSearchDocument>(
    catalogIndexName
  );
  const result = await index.search(input.query, {
    offset: (input.page - 1) * input.limit,
    limit: input.limit,
    filter: input.kind ? `kind = "${input.kind}"` : undefined,
    attributesToHighlight: ['name', 'description', 'serviceName']
  });

  return {
    items: result.hits,
    pagination: {
      page: input.page,
      limit: input.limit,
      total: result.estimatedTotalHits ?? result.hits.length
    },
    processingTimeMs: result.processingTimeMs
  };
}
