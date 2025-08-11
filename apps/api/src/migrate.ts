import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createDb, ensurePgvector } from './db/connection';

type Direction = 'up' | 'down';

async function migrate(direction: Direction) {
  const db = createDb();
  await ensurePgvector(db as any); // Type assertion to work around pgvector type issues

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const files = ['0001_init.ts', '0002_credentials.ts', '0003_fix_embeddings_and_notifications.ts', '0004_add_video_and_cover_support.ts', '0005_add_performance_indexes.ts']; // simple ordered list
  if (direction === 'up') {
    for (const f of files) {
      const url = pathToFileURL(path.resolve(__dirname, `migrations/${f}`)).href;
      const m: any = await import(url);
      if (m?.up) {
        await m.up(db);
        console.log('migrated', f);
      }
    }
  } else {
    for (const f of files.slice().reverse()) {
      const url = pathToFileURL(path.resolve(__dirname, `migrations/${f}`)).href;
      const m: any = await import(url);
      if (m?.down) {
        await m.down(db);
        console.log('rolled back', f);
      }
    }
  }

  await db.destroy();
}

const dir = (process.argv[2] as Direction | undefined) ?? 'up';
migrate(dir).catch((e) => {
  console.error(e);
  process.exit(1);
});
