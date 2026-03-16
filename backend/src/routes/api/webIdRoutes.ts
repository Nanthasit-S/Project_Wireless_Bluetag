import type { FastifyInstance } from 'fastify';
import { webIdRouteSchemas } from '../../schemas/webIdSchemas';
import { normalizeTagId, normalizeWebId, parseNonNegativeInt, parsePositiveInt } from '../../utils/parsers';

export async function webIdRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate], schema: webIdRouteSchemas.list }, async (request) => {
    return app.di.webIdService.list(request.authUser!.sub);
  });

  app.post('/', { preHandler: [app.authenticate], schema: webIdRouteSchemas.create }, async (request, reply) => {
    const body = request.body as { web_id: string };
    const result = await app.di.webIdService.create(request.authUser!.sub, normalizeWebId(body.web_id));
    return reply.status(result.statusCode).send(result.body);
  });

  app.get('/:webId/tags', { preHandler: [app.authenticate], schema: webIdRouteSchemas.listTags }, async (request) => {
    const params = request.params as { webId: string };
    return app.di.webIdService.listTags(request.authUser!.sub, normalizeWebId(params.webId));
  });

  app.get(
    '/:webId/location-history',
    { preHandler: [app.authenticate], schema: webIdRouteSchemas.locationHistory },
    async (request) => {
      const params = request.params as { webId: string };
      const query = request.query as {
      tag_id?: string;
      limit?: number;
      cursor_recorded_at?: string;
      cursor_id?: number;
    };

      return app.di.historyService.list({
        ownerUserId: request.authUser!.sub,
        webId: normalizeWebId(params.webId),
        tagId: normalizeTagId(query.tag_id),
        limit: parsePositiveInt(query.limit, 50, 200),
        cursorRecordedAt: String(query.cursor_recorded_at || '').trim() || undefined,
        cursorId: parseNonNegativeInt(query.cursor_id, 0, Number.MAX_SAFE_INTEGER),
      });
    },
  );
}
