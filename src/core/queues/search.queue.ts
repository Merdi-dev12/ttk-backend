import { Queue } from 'bullmq';
import { getRedisConnectionOptions } from '../config/redis.js';

export type SearchJob =
  | { type: 'UPSERT_SERVICE'; id: string }
  | { type: 'UPSERT_PRODUCT'; id: string }
  | { type: 'REINDEX_ALL' };

type SearchQueue = Queue<SearchJob, void, string, SearchJob, void, string>;
let searchQueue: SearchQueue | undefined;

function getSearchQueue(): SearchQueue {
  searchQueue ??= new Queue<
    SearchJob,
    void,
    string,
    SearchJob,
    void,
    string
  >('catalog-search', {
    connection: getRedisConnectionOptions(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000
    }
  });

  return searchQueue;
}

export async function enqueueSearchSync(job: SearchJob): Promise<void> {
  await getSearchQueue().add(job.type, job);
}
