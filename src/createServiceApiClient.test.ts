import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createServiceApiClient } from './createServiceApiClient';

// Mock window.location for peerOrigin resolution
function mockLocation(hostname: string, protocol = 'https:') {
  Object.defineProperty(window, 'location', {
    value: { protocol, hostname },
    writable: true,
    configurable: true,
  });
}

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockLocation('ceedcv-dms.maya.test');
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('createServiceApiClient', () => {
  it('returns an object with the expected API client methods', () => {
    // We need a minimal keycloak mock
    const keycloak = {
      authenticated: false,
      token: undefined,
      updateToken: vi.fn(),
      isTokenExpired: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    } as unknown as import('keycloak-js').default;

    const client = createServiceApiClient('dashboard-api', keycloak);
    expect(client).toHaveProperty('apiFetchJson');
    expect(client).toHaveProperty('apiGetJson');
    expect(client).toHaveProperty('buildApiUrl');
    expect(client).toHaveProperty('getBearerToken');
  });

  it('derives base URL from peerOrigin when no env override', () => {
    const keycloak = {
      authenticated: false,
      token: undefined,
      updateToken: vi.fn(),
      isTokenExpired: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    } as unknown as import('keycloak-js').default;

    const client = createServiceApiClient('dashboard-api', keycloak);
    // buildApiUrl should use peerOrigin('dashboard-api') + /api/v1
    expect(client.buildApiUrl('users')).toBe(
      'https://ceedcv-dashboard-api.maya.test/api/v1/users',
    );
  });

  it('uses envOverride when provided and non-empty', () => {
    const keycloak = {
      authenticated: false,
      token: undefined,
      updateToken: vi.fn(),
      isTokenExpired: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    } as unknown as import('keycloak-js').default;

    const client = createServiceApiClient(
      'dashboard-api',
      keycloak,
      'https://custom-api.example.com/api/v1',
    );
    expect(client.buildApiUrl('roles')).toBe('https://custom-api.example.com/api/v1/roles');
  });

  it('makes GET request via apiGetJson (no auth — unauthenticated client)', async () => {
    const keycloak = {
      authenticated: false,
      token: undefined,
      updateToken: vi.fn(),
      isTokenExpired: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    } as unknown as import('keycloak-js').default;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [{ id: 1 }] }),
      headers: { get: () => 'application/json' },
    });

    const client = createServiceApiClient('dashboard-api', keycloak);
    const result = await client.apiGetJson<{ data: { id: number }[] }>('users');
    expect(result).toEqual({ data: [{ id: 1 }] });
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it('throws ApiHttpError on 404', async () => {
    const keycloak = {
      authenticated: false,
      token: undefined,
      updateToken: vi.fn(),
      isTokenExpired: vi.fn().mockReturnValue(false),
      logout: vi.fn(),
    } as unknown as import('keycloak-js').default;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
    });

    const client = createServiceApiClient('dashboard-api', keycloak);
    await expect(client.apiGetJson('missing')).rejects.toMatchObject({ status: 404 });
  });
});
