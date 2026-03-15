import { z } from 'zod';
import { bindingAccessSchema, bindingSchema, messageResponseSchema } from './commonSchemas';

export const bindingBodySchema = z.object({
  tag_id: z.string().trim().min(1),
  web_id: z.string().trim().min(1),
});

export const bindingParamsSchema = z.object({
  tagId: z.string().trim().min(1),
});

export const boardStateBodySchema = z.object({
  web_id: z.string().trim().min(1),
  board_web_id_hash: z.string().trim().min(1).nullable(),
  board_lock_state: z.enum(['locked', 'unbound']),
});

const factoryResetResponseSchema = z.object({
  reset: z.literal(true),
  tag_id: z.string(),
  web_id: z.string().nullable(),
  cleared_location: z.boolean(),
  removed_binding: z.boolean(),
});

export const bindingRouteSchemas = {
  list: {
    response: {
      200: z.array(bindingSchema),
      401: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  create: {
    body: bindingBodySchema,
    response: {
      200: bindingSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      409: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  access: {
    params: bindingParamsSchema,
    response: {
      200: bindingAccessSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  remove: {
    params: bindingParamsSchema,
    response: {
      204: z.null(),
      400: messageResponseSchema,
      401: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  syncBoardState: {
    params: bindingParamsSchema,
    body: boardStateBodySchema,
    response: {
      200: bindingSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      404: messageResponseSchema,
      409: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  technicianReset: {
    params: bindingParamsSchema,
    response: {
      200: bindingSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      403: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  factoryReset: {
    params: bindingParamsSchema,
    response: {
      200: factoryResetResponseSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      403: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
};
