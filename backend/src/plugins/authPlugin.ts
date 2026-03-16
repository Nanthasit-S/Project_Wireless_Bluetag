import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { AuthService } from '../services/AuthService';

export const authPlugin = fp(async (app: FastifyInstance) => {
  const authService = app.di.authService as AuthService;

  app.decorate('authenticate', async (request: FastifyRequest) => {
    const authHeader = request.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      const error = new Error('Missing bearer token') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }

    try {
      request.authUser = authService.verifyToken(token);
    } catch {
      const error = new Error('Invalid or expired token') as Error & { statusCode?: number };
      error.statusCode = 401;
      throw error;
    }
  });

  app.decorate('requireAdmin', async (request: FastifyRequest) => {
    if (request.authUser?.role === 'admin') {
      return;
    }

    if (request.authUser?.sub) {
      const user = await authService.getCurrentUser(request.authUser.sub);
      if (user.role === 'admin') {
        return;
      }
    }

    const error = new Error('admin access required') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  });
});
