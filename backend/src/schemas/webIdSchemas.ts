import { z } from 'zod';
import { messageResponseSchema, webIdSchema } from './commonSchemas';

export const webIdParamsSchema = z.object({
  webId: z.string().trim().min(1),
});

export const createWebIdBodySchema = z.object({
  web_id: z.string().trim().min(1),
});

export const locationHistoryQuerySchema = z.object({
  tag_id: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  cursor_recorded_at: z.string().trim().min(1).optional(),
  cursor_id: z.coerce.number().int().nonnegative().optional(),
});

const webIdTagSchema = z.object({
  tag_id: z.string(),
  web_id: z.string(),
  binding_updated_at: z.string(),
  estimated_latitude: z.number().nullable(),
  estimated_longitude: z.number().nullable(),
  estimate_source: z.string().nullable(),
  battery_percent: z.number().int().min(0).max(100).nullable().optional(),
  location_updated_at: z.string().nullable(),
  sample_count: z.number(),
});

const locationHistoryItemSchema = z.object({
  id: z.number(),
  tag_id: z.string(),
  web_id: z.string().nullable(),
  estimated_latitude: z.number().nullable(),
  estimated_longitude: z.number().nullable(),
  estimate_source: z.string().nullable(),
  recorded_at: z.string(),
  write_reason: z.string().nullable(),
});

export const webIdRouteSchemas = {
  list: {
    response: {
      200: z.array(webIdSchema),
      401: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  create: {
    body: createWebIdBodySchema,
    response: {
      200: webIdSchema,
      201: webIdSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      409: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  listTags: {
    params: webIdParamsSchema,
    response: {
      200: z.object({
        web_id: z.string(),
        tags: z.array(webIdTagSchema),
      }),
      401: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  locationHistory: {
    params: webIdParamsSchema,
    querystring: locationHistoryQuerySchema,
    response: {
      200: z.object({
        web_id: z.string(),
        tag_id: z.string().nullable(),
        pagination: z.object({
          limit: z.number(),
          has_more: z.boolean(),
          next_cursor: z
            .object({
              recorded_at: z.string(),
              id: z.number(),
            })
            .nullable(),
        }),
        items: z.array(locationHistoryItemSchema),
      }),
      400: messageResponseSchema,
      401: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
};
