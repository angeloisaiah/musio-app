import 'dotenv/config';
import { Worker } from 'bullmq';
import { createDb } from './db/connection';
import { processMediaFile } from './services/media-processor';
import { processPostWithAI } from './services/ai-service';
import type { PostId, MediaId } from '@musio/shared';

const connection = {
  host: process.env.REDIS_URL?.split('://')[1]?.split(':')[0] || 'localhost',
  port: Number(process.env.REDIS_URL?.split(':')[2] || 6379),
};

type MediaJob = {
  postId: PostId;
  fileKey: string;
  mime: string;
  mediaId?: MediaId;
};

const transcodeWorker = new Worker<MediaJob>(
  'media-processing',
  async (job) => {
    console.log(`[Worker] Processing job ${job.id} of type ${job.name}`);
    const { postId, fileKey, mime } = job.data;

    if (job.name === 'transcode') {
      const db = createDb();

      try {
        // Get the media file record
        const mediaFile = await db
          .selectFrom('media_files')
          .selectAll()
          .where('post_id', '=', postId)
          .where('type', '=', 'original')
          .executeTakeFirst();

        if (!mediaFile) {
          throw new Error(`No original media file found for post ${postId}`);
        }

        // Process the media file
        const result = await processMediaFile({
          postId,
          mediaId: mediaFile.id as MediaId,
          originalUrl: mediaFile.url,
          mime: mediaFile.mime || mime,
        });

        if (!result.success) {
          throw new Error(result.error || 'Media processing failed');
        }

        // Get post details for AI processing
        const post = await db
          .selectFrom('posts')
          .select(['title', 'caption'])
          .where('id', '=', postId)
          .executeTakeFirst();

        if (post) {
          // Process with AI (tags and embeddings)
          await processPostWithAI(postId, post.title, post.caption || undefined);
        }

        console.log(`[Worker] Job ${job.id} completed for post ${postId}`);
      } finally {
        await db.destroy();
      }
    }
  },
  { connection },
);

transcodeWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

transcodeWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with error ${err.message}`);
});

console.log('[Worker] Media processing worker started.');

// Keep the process alive
process.on('SIGINT', async () => {
  await transcodeWorker.close();
  console.log('[Worker] Worker closed.');
  process.exit(0);
});
