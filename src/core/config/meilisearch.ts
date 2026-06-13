import { Meilisearch } from 'meilisearch';
import { config } from './env.js';

let meilisearchClient: Meilisearch | undefined;

export function getMeilisearchClient(): Meilisearch {
  if (!config.meilisearch.host) {
    throw new Error('MEILI_HOST is required to use Meilisearch');
  }

  try {
    new URL(config.meilisearch.host);
  } catch {
    throw new Error('MEILI_HOST must be a valid URL');
  }

  meilisearchClient ??= new Meilisearch({
    host: config.meilisearch.host,
    apiKey: config.meilisearch.masterKey
  });

  return meilisearchClient;
}
