import type { FastifyInstance } from 'fastify';
import { adminRouteSchemas } from '../../schemas/adminSchemas';

export async function adminRoutes(app: FastifyInstance) {
  const guarded = { preHandler: [app.authenticate, app.requireAdmin] };

  app.get('/users', { ...guarded, schema: adminRouteSchemas.listUsers }, async () => app.di.adminService.listUsers());

  app.patch('/users/:userId/role', { ...guarded, schema: adminRouteSchemas.updateRole }, async (request) => {
    const params = request.params as { userId: string };
    const body = request.body as { role: 'user' | 'admin' };
    return app.di.adminService.updateUserRole(request.authUser!.sub, params.userId, body.role);
  });

  app.delete('/users/:userId', { ...guarded, schema: adminRouteSchemas.deleteUser }, async (request) => {
    const params = request.params as { userId: string };
    return app.di.adminService.deleteUser(request.authUser!.sub, params.userId);
  });

  app.get('/audit-logs', { ...guarded, schema: adminRouteSchemas.listAuditLogs }, async () => app.di.auditLogService.list());

  app.get('/binding-mismatches', { ...guarded, schema: adminRouteSchemas.listBindingMismatches }, async () =>
    app.di.adminService.listBindingMismatches(),
  );

  app.post('/cleanup/tag-state', { ...guarded, schema: adminRouteSchemas.clearTagState }, async (request) => {
    const body = request.body as { tag_id: string };
    return app.di.adminService.clearTagState(request.authUser!.sub, body.tag_id);
  });
}
