import { describe, expect, test, beforeAll, afterAll } from 'vitest';
import { createDb } from '../../../apps/api/src/db/connection';
import type { KyselyDatabase, PostId, MediaId } from '@musio/shared/src/db/types';
import { processMediaFile } from '../../../apps/api/src/services/media-processor';
import { randomUUID } from 'node:crypto';

let db: KyselyDatabase;

beforeAll(async () => {
  db = createDb();
});

afterAll(async () => {
  await db.destroy();
});

describe('Media Processing', () => {
  test('processMediaFile generates preview and waveform for audio file', async () => {
    // Create a test post and media file
    const postId = randomUUID() as PostId;
    const mediaId = randomUUID() as MediaId;
    const userId = randomUUID();

    // Insert test user
    await db
      .insertInto('users')
      .values({
        id: userId,
        name: 'Test User',
        email: `test+${Date.now()}@example.com`,
        created_at: new Date().toISOString(),
        provider: 'local',
        provider_id: userId,
      })
      .execute();

    // Insert test post
    await db
      .insertInto('posts')
      .values({
        id: postId,
        user_id: userId,
        title: 'Test Audio',
        caption: 'Test caption',
        visibility: 'public',
        ready: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    // Insert original media file
    await db
      .insertInto('media_files')
      .values({
        id: mediaId,
        post_id: postId,
        url: 's3://musio/test/original.wav',
        type: 'original',
        mime: 'audio/wav',
        size: 12345,
        duration_ms: null,
      })
      .execute();

    // Process the media file (this will be a mock for now)
    const result = await processMediaFile({
      postId,
      mediaId,
      originalUrl: 's3://musio/test/original.wav',
      mime: 'audio/wav',
    });

    expect(result).toEqual({
      previewUrl: expect.stringContaining('preview'),
      waveformUrl: expect.stringContaining('waveform'),
      duration: expect.any(Number),
      success: true,
    });

    // Verify database was updated
    const post = await db
      .selectFrom('posts')
      .selectAll()
      .where('id', '=', postId)
      .executeTakeFirstOrThrow();

    expect(post.ready).toBe(true);
    expect(post.duration_ms).toBeGreaterThan(0);

    // Verify media files were created
    const mediaFiles = await db
      .selectFrom('media_files')
      .selectAll()
      .where('post_id', '=', postId)
      .execute();

    expect(mediaFiles).toHaveLength(3); // original, preview, waveform
    expect(mediaFiles.some((f) => f.type === 'preview')).toBe(true);
    expect(mediaFiles.some((f) => f.type === 'waveform_json')).toBe(true);
  }, 30000);
});
