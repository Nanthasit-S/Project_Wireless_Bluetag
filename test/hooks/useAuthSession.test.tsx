// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthSession } from '../../src/hooks/backend/useAuthSession';

const { asyncStorageMock } = vi.hoisted(() => ({
  asyncStorageMock: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: asyncStorageMock,
}));

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    asyncStorageMock.getItem.mockResolvedValue(null);
    asyncStorageMock.setItem.mockResolvedValue(undefined);
    asyncStorageMock.removeItem.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('hydrates stored auth token on mount', async () => {
    asyncStorageMock.getItem.mockResolvedValue('stored-token');

    const { result } = renderHook(() =>
      useAuthSession({
        backendBase: 'http://127.0.0.1:8000',
        resetBleSession: vi.fn(),
        setMessage: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.authReady).toBe(true);
    });

    expect(result.current.authToken).toBe('stored-token');
  });

  it('submits login and persists returned token', async () => {
    const setMessage = vi.fn();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'token-123' }),
    } as Response);

    const { result } = renderHook(() =>
      useAuthSession({
        backendBase: 'http://127.0.0.1:8000',
        resetBleSession: vi.fn(),
        setMessage,
      }),
    );

    await act(async () => {
      result.current.setAuthEmail('USER@example.com');
      result.current.setAuthPassword('secret123');
      result.current.setAuthMode('login');
    });

    await act(async () => {
      await result.current.handleAuthSubmit();
    });

    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith('bluetag.auth.token', 'token-123');
    expect(result.current.authToken).toBe('token-123');
    expect(setMessage).toHaveBeenCalledWith('เข้าสู่ระบบสำเร็จ');
  });

  it('clears storage and resets session on logout', async () => {
    const resetBleSession = vi.fn();
    const { result } = renderHook(() =>
      useAuthSession({
        backendBase: 'http://127.0.0.1:8000',
        resetBleSession,
        setMessage: vi.fn(),
      }),
    );

    await act(async () => {
      result.current.setAuthToken('token-abc');
    });

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(resetBleSession).toHaveBeenCalled();
    expect(asyncStorageMock.removeItem).toHaveBeenCalledWith('bluetag.auth.token');
    expect(result.current.authToken).toBe('');
  });
});
