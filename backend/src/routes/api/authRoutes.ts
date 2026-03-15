import type { FastifyInstance } from 'fastify';
import { authRouteSchemas } from '../../schemas/authSchemas';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', { schema: authRouteSchemas.register }, async (request, reply) => {
    const body = request.body as { email: string; password: string; name: string };
    const result = await app.di.authService.register(body.email, body.password, body.name);
    return reply.status(201).send(result);
  });

  app.post('/login', { schema: authRouteSchemas.login }, async (request) => {
    const body = request.body as { email: string; password: string };
    return app.di.authService.login(body.email, body.password);
  });

  app.get('/me', { preHandler: [app.authenticate], schema: authRouteSchemas.me }, async (request) => {
    return app.di.authService.getCurrentUser(request.authUser!.sub);
  });
}
