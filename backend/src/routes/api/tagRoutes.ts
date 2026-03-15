import type { FastifyInstance } from 'fastify';
import { tagRouteSchemas } from '../../schemas/tagSchemas';
import { normalizeTagId, parseOptionalNumber } from '../../utils/parsers';

export async function tagRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate], schema: tagRouteSchemas.list }, async () => app.di.tagService.listTags());

  app.post('/', { preHandler: [app.authenticate], schema: tagRouteSchemas.create }, async (request, reply) => {
    const body = request.body as {
      tag_id: string;
      estimated_latitude?: number | null;
      estimated_longitude?: number | null;
      estimate_source?: string;
    };

    const result = await app.di.tagService.storeTagLocation({
      tagId: normalizeTagId(body.tag_id),
      estimatedLatitude: parseOptionalNumber(body.estimated_latitude),
      estimatedLongitude: parseOptionalNumber(body.estimated_longitude),
      estimateSource: String(body.estimate_source || 'mobile').trim() || 'mobile',
      ownerUserId: request.authUser!.sub,
    });

    return reply.status(result.statusCode).send(result.body);
  });
}
