import type { FastifyInstance } from 'fastify';
import { tagRouteSchemas } from '../../schemas/tagSchemas';
import { normalizeTagId, parseOptionalNumber } from '../../utils/parsers';

export async function tagRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate], schema: tagRouteSchemas.list }, async (request) =>
    app.di.tagService.listTags(request.authUser!.sub),
  );

  app.post('/', { preHandler: [app.authenticate], schema: tagRouteSchemas.create }, async (request, reply) => {
    const body = request.body as {
      tag_id: string;
      nickname?: string | null;
      estimated_latitude?: number | null;
      estimated_longitude?: number | null;
      estimate_source?: string;
      battery_percent?: number | null;
    };

    const result = await app.di.tagService.storeTagLocation({
      tagId: normalizeTagId(body.tag_id),
      nickname: body.nickname == null ? null : String(body.nickname).trim() || null,
      estimatedLatitude: parseOptionalNumber(body.estimated_latitude),
      estimatedLongitude: parseOptionalNumber(body.estimated_longitude),
      estimateSource: String(body.estimate_source || 'mobile').trim() || 'mobile',
      batteryPercent: parseOptionalNumber(body.battery_percent),
      ownerUserId: request.authUser!.sub,
    });

    return reply.status(result.statusCode).send(result.body);
  });

  app.patch('/:tagId/nickname', { preHandler: [app.authenticate], schema: tagRouteSchemas.updateNickname }, async (request, reply) => {
    const params = request.params as { tagId: string };
    const body = request.body as { nickname: string | null };

    const result = await app.di.tagService.saveNickname({
      tagId: normalizeTagId(params.tagId),
      nickname: body.nickname == null ? null : String(body.nickname).trim() || null,
      ownerUserId: request.authUser!.sub,
    });

    return reply.status(result.statusCode).send(result.body);
  });
}
