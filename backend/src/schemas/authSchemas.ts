import { z } from 'zod';
import { authTokenResponseSchema, messageResponseSchema, userSchema } from './commonSchemas';

export const registerBodySchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  name: z.string().trim().min(1),
});

export const loginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const authRouteSchemas = {
  register: {
    body: registerBodySchema,
    response: {
      201: authTokenResponseSchema,
      400: messageResponseSchema,
      409: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  login: {
    body: loginBodySchema,
    response: {
      200: authTokenResponseSchema,
      400: messageResponseSchema,
      401: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
  me: {
    response: {
      200: userSchema,
      401: messageResponseSchema,
      404: messageResponseSchema,
      500: messageResponseSchema,
    },
  },
};
