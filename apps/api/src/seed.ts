import 'dotenv/config';
import { createDb } from './db/connection';
import { randomUUID } from 'node:crypto';

async function main() {
  const db = createDb();

  const desired = [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Cara', email: 'cara@example.com' },
  ];

  // Upsert users by email, then read back their ids to ensure FK integrity
  for (const u of desired) {
    const id = randomUUID();
    await db
      .insertInto('users')
      .values({
        id,
        name: u.name,
        email: u.email,
        avatar_url: null,
        bio: null,
        provider: 'local',
        provider_id: id,
        created_at: new Date().toISOString(),
      } as any)
      .onConflict((oc: any) => oc.column('email').doNothing())
      .execute();
  }

  const users = await db
    .selectFrom('users')
    .select(['id', 'name', 'email'])
    .where(
      'email',
      'in',
      desired.map((d) => d.email),
    )
    .execute();

  const byName = Object.fromEntries(users.map((u) => [u.name!, u.id]));
  const posts = [
    { id: randomUUID(), user_id: byName['Alice'], title: 'Lo-fi Beat', caption: 'Chill vibes' },
    { id: randomUUID(), user_id: byName['Bob'], title: 'House Loop', caption: '4/4 groove' },
    { id: randomUUID(), user_id: byName['Cara'], title: 'Trap Snare', caption: 'Snappy hit' },
    { id: randomUUID(), user_id: byName['Alice'], title: 'Ambient Pad', caption: 'Ethereal pad' },
    { id: randomUUID(), user_id: byName['Bob'], title: 'Vocal Chop', caption: 'Processed vocal' },
  ];

  for (const p of posts) {
    await db
      .insertInto('posts')
      .values({
        id: p.id,
        user_id: p.user_id,
        title: p.title,
        caption: p.caption ?? null,
        duration_ms: null,
        bpm: null,
        key: null,
        visibility: 'public',
        ready: false,
        source_type: 'user',
        artist_name: null,
        video_url: null,
        cover_url: null,
        youtube_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .execute();

    await db
      .insertInto('media_files')
      .values({
        id: randomUUID(),
        post_id: p.id,
        url: 's3://musio/placeholders/original.wav',
        type: 'original',
        mime: 'audio/wav',
        size: 0,
        duration_ms: null,
      })
      .execute();
  }

  await db.destroy();
  console.log('Seed complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
