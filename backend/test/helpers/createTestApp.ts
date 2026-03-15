import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app';
import type { AppContainer } from '../../src/container';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function baseContainer(): DeepPartial<AppContainer> {
  return {
    database: {
      healthCheck: async () => undefined,
      close: async () => undefined,
    },
    authService: {
      verifyToken: () => ({ sub: 'user-1', email: 'user@example.com', name: 'Tester', role: 'user' as const }),
      register: async (email: string, _password: string, name: string) => ({
        token: 'token-123',
        user: { id: 'user-1', email, name, role: 'user' as const },
      }),
      login: async (email: string) => ({
        token: 'token-123',
        user: { id: 'user-1', email, name: 'Tester', role: 'user' as const },
      }),
      getCurrentUser: async () => ({ id: 'user-1', email: 'user@example.com', name: 'Tester', role: 'user' as const }),
    },
    tagService: {
      listTags: async () => [],
      storeTagLocation: async () => ({
        statusCode: 201,
        body: {
          stored: true,
          reason: 'new',
          tag: {
            tag_id: 'BT-1',
            estimated_latitude: 13.1,
            estimated_longitude: 100.1,
            estimate_source: 'mobile',
            updated_at: new Date().toISOString(),
          },
          sample_count: 1,
        },
      }),
    },
    webIdService: {
      list: async () => [],
      create: async () => ({
        statusCode: 201,
        body: { web_id: 'WEB-1', created_at: new Date().toISOString() },
      }),
      listTags: async () => ({ web_id: 'WEB-1', tags: [] }),
      assertOwned: async () => undefined,
    },
    bindingService: {
      list: async () => [],
      save: async () => ({ tag_id: 'BT-1', web_id: 'WEB-1', updated_at: new Date().toISOString() }),
      remove: async () => undefined,
    },
    historyService: {
      list: async () => ({
        web_id: 'WEB-1',
        tag_id: null,
        pagination: { limit: 50, has_more: false, next_cursor: null },
        items: [],
      }),
    },
  };
}

export function createTestApp(overrides: DeepPartial<AppContainer> = {}): FastifyInstance {
  const merged = {
    ...baseContainer(),
    ...overrides,
  } as AppContainer;

  return buildApp(merged);
}
