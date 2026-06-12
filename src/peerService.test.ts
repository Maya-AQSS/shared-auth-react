import { describe, expect, it, vi, afterEach } from 'vitest';
import { peerOrigin, resolveServiceUrl } from './peerService';

// Helper to mock window.location
function mockLocation(hostname: string, protocol = 'https:') {
  Object.defineProperty(window, 'location', {
    value: { protocol, hostname },
    writable: true,
    configurable: true,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('peerOrigin', () => {
  it('derives peer origin from slot-prefixed hostname', () => {
    mockLocation('desarrollo-ceedcv-dms.192.168.2.1.nip.io');
    expect(peerOrigin('dashboard-api')).toBe(
      'https://desarrollo-ceedcv-dashboard-api.192.168.2.1.nip.io',
    );
  });

  it('replaces the last service segment, keeping the slot prefix', () => {
    mockLocation('slot1-dms.maya.test');
    expect(peerOrigin('authorization-api')).toBe('https://slot1-authorization-api.maya.test');
  });

  it('handles single-segment hostnames (e.g. localhost) with no dot', () => {
    mockLocation('localhost');
    expect(peerOrigin('dashboard-api')).toBe('https://localhost');
  });

  it('preserves the protocol (http)', () => {
    mockLocation('dev-dms.local', 'http:');
    expect(peerOrigin('dms-api')).toBe('http://dev-dms-api.local');
  });

  it('handles a hostname with no slot prefix (service is only segment before first dot)', () => {
    mockLocation('dms.maya.test');
    // firstSegment = 'dms', no lastDash → slotPrefix = ''
    expect(peerOrigin('logs-api')).toBe('https://logs-api.maya.test');
  });

  it('handles deep domain suffixes correctly', () => {
    mockLocation('ceedcv-dms.192.168.1.100.nip.io');
    expect(peerOrigin('authorization-reverb')).toBe(
      'https://ceedcv-authorization-reverb.192.168.1.100.nip.io',
    );
  });
});

describe('resolveServiceUrl', () => {
  it('returns env value (trimmed, trailing slash removed) when defined', () => {
    mockLocation('dms.maya.test');
    expect(resolveServiceUrl('https://my-api.example.com/  ', 'dashboard-api')).toBe(
      'https://my-api.example.com',
    );
  });

  it('falls back to peerOrigin when env value is undefined', () => {
    mockLocation('dms.maya.test');
    expect(resolveServiceUrl(undefined, 'dashboard-api')).toBe('https://dashboard-api.maya.test');
  });

  it('falls back to peerOrigin when env value is empty string', () => {
    mockLocation('dms.maya.test');
    expect(resolveServiceUrl('', 'dashboard-api')).toBe('https://dashboard-api.maya.test');
  });

  it('falls back to peerOrigin when env value is whitespace only', () => {
    mockLocation('dms.maya.test');
    expect(resolveServiceUrl('   ', 'dashboard-api')).toBe('https://dashboard-api.maya.test');
  });
});
