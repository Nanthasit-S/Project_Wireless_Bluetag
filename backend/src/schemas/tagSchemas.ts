import { z } from 'zod';
import { messageResponseSchema, tagLocationSchema } from './commonSchemas';

const nullableCoordinateSchema = z.union([z.number(), z.null()]);

export const createTagBodySchema = z.object({
  tag_id: z.string().trim().min(1),
  nickname: z.string().trim().max(120).nullable().optional(),
  estimated_latitude: nullableCoordinateSchema.optional(),
  estimated_longitude: nullableCoordinateSchema.optional(),
  estimate_source: z.string().trim().min(1).optional(),
});

export const updateNicknameBodySchema = z.object({
  nickname: z.string().trim().max(120).nullable(),
});

const storedFalseResponseSchema = z.object({
  stored: z.literal(false),
  reason: z.enum(['throttled_no_coords', 'throttled']),
  cached: tagLocationSchema.nullable(),
});

const storedTrueResponseSchema = z.object({
  stored: z.literal(true),
  reason: z.enum(['new', 'source_changed', 'interval_elapsed', 'same_location_refresh', 'moved']),
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
  updateNickname: {
    body: updateNicknameBodySchema,
    response: {
      200: z.object({
        saved: z.literal(true),
        tag: tagLocationSchema,
      }),
      400: messageResponseSchema,
      401: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
};
