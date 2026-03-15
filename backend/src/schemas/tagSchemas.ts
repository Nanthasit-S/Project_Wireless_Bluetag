import { z } from 'zod';
import { messageResponseSchema, tagLocationSchema } from './commonSchemas';

const nullableCoordinateSchema = z.union([z.number(), z.null()]);

export const createTagBodySchema = z.object({
  tag_id: z.string().trim().min(1),
  estimated_latitude: nullableCoordinateSchema.optional(),
  estimated_longitude: nullableCoordinateSchema.optional(),
  estimate_source: z.string().trim().min(1).optional(),
});

const storedFalseResponseSchema = z.object({
  stored: z.literal(false),
  reason: z.enum(['throttled_no_coords', 'throttled']),
  cached: tagLocationSchema.nullable(),
});

const storedTrueResponseSchema = z.object({
  stored: z.literal(true),
  reason: z.enum(['new', 'source_changed', 'interval_elapsed', 'moved']),
  tag: tagLocationSchema,
  sample_count: z.number(),
});

export const tagRouteSchemas = {
  list: {
    response: {
      200: z.array(tagLocationSchema),
      401: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  create: {
    body: createTagBodySchema,
    response: {
      200: z.union([storedFalseResponseSchema, storedTrueResponseSchema]),
      201: storedTrueResponseSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
};
