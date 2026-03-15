import { describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../helpers/createTestApp';

describe('route validation and contracts', () => {
  it('rejects invalid register payloads with schema validation', async () => {
    const app = createTestApp();
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'not-an-email',
          password: '123',
          name: '',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('message');
    } finally {
      await app.close();
    }
  });

  it('rejects protected routes without bearer token', async () => {
    const app = createTestApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tags',
      });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ message: 'Missing bearer token' });
    } finally {
      await app.close();
    }
  });

  it('rejects invalid tag payloads before reaching the service', async () => {
    const storeTagLocation = vi.fn();
    const app = createTestApp({
      tagService: {
        listTags: async () => [],
        storeTagLocation,
      } as never,
    });

    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tags',
        headers: { authorization: 'Bearer token-123' },
        payload: {
          tag_id: '',
          estimated_latitude: '13.7563',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(storeTagLocation).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it('rejects oversized location-history limit values', async () => {
    const app = createTestApp();
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/api/web-ids/WEB-1/location-history?limit=999',
        headers: { authorization: 'Bearer token-123' },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty('message');
    } finally {
      await app.close();
    }
  });

  it('returns a valid login response payload', async () => {
    const app = createTestApp();
    try {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'user@example.com',
          password: 'secret123',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        token: 'token-123',
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'Tester',
          role: 'user',
        },
      });
    } finally {
      await app.close();
    }
  });
});
