import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    await app.di.database.healthCheck();
    return { ok: true, provider: 'postgres' };
  });
}
