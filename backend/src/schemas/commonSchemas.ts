import { z } from 'zod';

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['user', 'admin']),
});

export const authTokenResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export const tagLocationSchema = z.object({
  tag_id: z.string(),
  nickname: z.string().nullable().optional(),
  estimated_latitude: z.number().nullable(),
  estimated_longitude: z.number().nullable(),
  estimate_source: z.string().nullable(),
  updated_at: z.string(),
});

export const webIdSchema = z.object({
  web_id: z.string(),
  created_at: z.string(),
});

export const bindingSchema = z.object({
  tag_id: z.string(),
  web_id: z.string(),
  updated_at: z.string(),
  board_web_id_hash: z.string().nullable().optional(),
  board_lock_state: z.string().nullable().optional(),
  board_synced_at: z.string().nullable().optional(),
});

export const bindingAccessSchema = z.object({
  tag_id: z.string(),
  access: z.enum(['unbound', 'bound_to_my_web_id', 'bound_to_other_account']),
  web_id: z.string().nullable(),
  board_lock_state: z.string().nullable().optional(),
  board_web_id_hash: z.string().nullable().optional(),
});
