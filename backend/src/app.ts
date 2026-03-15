import cors from '@fastify/cors';
import Fastify, { type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler, type ZodTypeProvider } from 'fastify-type-provider-zod';
import { AppContainer } from './container';
import { authPlugin } from './plugins/authPlugin';
import { authRoutes } from './routes/api/authRoutes';
import { adminRoutes } from './routes/api/adminRoutes';
import { bindingRoutes } from './routes/api/bindingRoutes';
import { tagRoutes } from './routes/api/tagRoutes';
import { webIdRoutes } from './routes/api/webIdRoutes';
import { healthRoutes } from './routes/healthRoutes';

declare module 'fastify' {
  interface FastifyInstance {
    di: AppContainer;
  }
}

export function buildApp(container: AppContainer): FastifyInstance {
  const app = Fastify({ logger: true });
  app.decorate('di', container);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.register(authPlugin);
  app.register(healthRoutes);
  app.register(async (api) => {
    const typedApi = api.withTypeProvider<ZodTypeProvider>();
    typedApi.register(authRoutes, { prefix: '/api/auth' });
    typedApi.register(adminRoutes, { prefix: '/api/admin' });
    typedApi.register(tagRoutes, { prefix: '/api/tags' });
    typedApi.register(webIdRoutes, { prefix: '/api/web-ids' });
    typedApi.register(bindingRoutes, { prefix: '/api/bindings' });
  });

  app.setErrorHandler((error, _request, reply) => {
    const maybeHttpError = error as Error & { statusCode?: number };
    app.log.error(maybeHttpError);
    const statusCode =
      maybeHttpError.statusCode && maybeHttpError.statusCode >= 400 ? maybeHttpError.statusCode : 500;
    const message = statusCode >= 500 ? 'internal server error' : maybeHttpError.message;
    void reply.status(statusCode).send({ message });
  });

  return app;
}
