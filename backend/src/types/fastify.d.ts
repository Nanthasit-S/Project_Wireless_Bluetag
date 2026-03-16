import 'fastify';
import type { JwtUserPayload } from './domain';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: JwtUserPayload;
  }

  interface FastifyInstance {
    authenticate(request: FastifyRequest): Promise<void>;
    requireAdmin(request: FastifyRequest): Promise<void>;
  }
}
