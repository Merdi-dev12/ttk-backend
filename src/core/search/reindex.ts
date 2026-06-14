import { enqueueSearchSync } from '../queues/search.queue.js';

await enqueueSearchSync({ type: 'REINDEX_ALL' });
console.info('Catalog reindex job queued');
process.exit(0);
