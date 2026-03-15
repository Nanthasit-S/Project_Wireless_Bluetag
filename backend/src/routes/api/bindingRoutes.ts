import type { FastifyInstance } from 'fastify';
import { bindingRouteSchemas } from '../../schemas/bindingSchemas';
import { normalizeTagId, normalizeWebId } from '../../utils/parsers';

export async function bindingRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [app.authenticate], schema: bindingRouteSchemas.list }, async (request) => {
    return app.di.bindingService.list(request.authUser!.sub);
  });

  app.post('/', { preHandler: [app.authenticate], schema: bindingRouteSchemas.create }, async (request) => {
    const body = request.body as { tag_id: string; web_id: string };
    return app.di.bindingService.save(
      request.authUser!.sub,
      normalizeTagId(body.tag_id),
      normalizeWebId(body.web_id),
    );
  });

  app.get('/:tagId/access', { preHandler: [app.authenticate], schema: bindingRouteSchemas.access }, async (request) => {
    const params = request.params as { tagId: string };
    return app.di.bindingService.inspectAccess(request.authUser!.sub, normalizeTagId(params.tagId));
  });

  app.delete('/:tagId', { preHandler: [app.authenticate], schema: bindingRouteSchemas.remove }, async (request, reply) => {
    const params = request.params as { tagId: string };
    await app.di.bindingService.remove(request.authUser!.sub, normalizeTagId(params.tagId));
    return reply.status(204).send(null);
  });

  app.patch('/:tagId/board-state', { preHandler: [app.authenticate], schema: bindingRouteSchemas.syncBoardState }, async (request) => {
    const params = request.params as { tagId: string };
    const body = request.body as { web_id: string; board_web_id_hash: string | null; board_lock_state: 'locked' | 'unbound' };
    return app.di.bindingService.syncBoardState({
      ownerUserId: request.authUser!.sub,
      tagId: normalizeTagId(params.tagId),
      webId: normalizeWebId(body.web_id),
      boardWebIdHash: body.board_web_id_hash?.trim().toUpperCase() ?? null,
      boardLockState: body.board_lock_state,
    });
  });

  app.post('/:tagId/technician-reset', { preHandler: [app.authenticate, app.requireAdmin], schema: bindingRouteSchemas.technicianReset }, async (request) => {
    const params = request.params as { tagId: string };
    return app.di.bindingService.technicianReset(request.authUser!.sub, normalizeTagId(params.tagId));
  });

  app.post('/:tagId/factory-reset', { preHandler: [app.authenticate], schema: bindingRouteSchemas.factoryReset }, async (request) => {
    const params = request.params as { tagId: string };
    return app.di.bindingService.factoryReset(request.authUser!.sub, normalizeTagId(params.tagId));
  });
}
