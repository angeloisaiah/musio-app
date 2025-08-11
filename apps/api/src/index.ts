import 'dotenv/config';
import { buildServer } from './server';
import { createProductionDb } from './config/database';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';

async function main() {
  // Initialize production database if in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const db = createProductionDb();
      console.log('✅ Production database connected');
    } catch (error) {
      console.warn('⚠️  Failed to connect to production database:', error);
      console.log('📝 API will run without database connection');
    }
  }

  const app = buildServer();
  await app.listen({ port, host });
  console.log(`[api] listening on http://${host}:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
