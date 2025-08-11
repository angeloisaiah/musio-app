import type { KyselyDatabase } from '@musio/shared';

declare module 'fastify' {
  interface FastifyInstance {
    db: KyselyDatabase;
  }
}
