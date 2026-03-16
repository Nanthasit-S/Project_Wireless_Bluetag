import { z } from 'zod';
import { messageResponseSchema, userSchema } from './commonSchemas';

export const adminUserParamsSchema = z.object({
  userId: z.string().trim().min(1),
});

export const adminRoleBodySchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const adminDeleteUserParamsSchema = z.object({
  userId: z.string().trim().min(1),
});

const auditLogSchema = z.object({
  id: z.number(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  details: z.record(z.string(), z.unknown()).or(z.object({})),
  created_at: z.string(),
  actor: z.object({
    id: z.string().nullable(),
    email: z.string().nullable(),
    name: z.string().nullable(),
  }),
});

const bindingMismatchSchema = z.object({
  tag_id: z.string(),
  web_id: z.string(),
  expected_web_id_hash: z.string(),
  board_web_id_hash: z.string().nullable(),
  board_lock_state: z.string(),
  mismatch_state: z.enum(['matched', 'backend_only', 'board_only', 'mismatch']),
  board_synced_at: z.string().nullable(),
  updated_at: z.string(),
  owner: z.object({
    user_id: z.string(),
    email: z.string().email(),
    name: z.string(),
  }),
});

const cleanupBodySchema = z.object({
  tag_id: z.string().trim().min(1),
});

export const adminRouteSchemas = {
  listUsers: {
    response: {
      200: z.array(userSchema),
      401: messageResponseSchema,
      403: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  updateRole: {
    params: adminUserParamsSchema,
    body: adminRoleBodySchema,
    response: {
      200: userSchema,
      401: messageResponseSchema,
      403: messageResponseSchema,
      400: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  deleteUser: {
    params: adminDeleteUserParamsSchema,
    response: {
      200: userSchema,
      401: messageResponseSchema,
      403: messageResponseSchema,
      400: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  listAuditLogs: {
    response: {
      200: z.array(auditLogSchema),
      401: messageResponseSchema,
      403: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  listBindingMismatches: {
    response: {
      200: z.array(bindingMismatchSchema),
      401: messageResponseSchema,
      403: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  clearTagState: {
    body: cleanupBodySchema,
    response: {
      200: z.object({
        ok: z.literal(true),
        tag_id: z.string(),
      }),
      401: messageResponseSchema,
      403: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
};
