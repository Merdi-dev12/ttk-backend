import { enqueueSearchSync } from '../queues/search.queue.js';
import { logger } from '../utils/logger.js';

await enqueueSearchSync({ type: 'REINDEX_ALL' });
logger.info('catalog_reindex_job_queued');
process.exit(0);
