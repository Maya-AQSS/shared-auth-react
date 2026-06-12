import { describe, expect, it } from 'vitest';
import { buildQueryString } from './queryString';

describe('buildQueryString', () => {
  it('returns empty string when params object is empty', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('returns empty string when all values are null', () => {
    expect(buildQueryString({ a: null, b: null })).toBe('');
  });

  it('returns empty string when all values are undefined', () => {
    expect(buildQueryString({ a: undefined, b: undefined })).toBe('');
  });

  it('returns empty string when all values are empty strings', () => {
    expect(buildQueryString({ a: '', b: '' })).toBe('');
  });

  it('returns empty string when all values are empty arrays', () => {
    expect(buildQueryString({ tags: [] })).toBe('');
  });

  it('serializes a simple string value', () => {
    expect(buildQueryString({ search: 'hello' })).toBe('?search=hello');
  });

  it('serializes a numeric value as string', () => {
    expect(buildQueryString({ page: 3 })).toBe('?page=3');
  });

  it('serializes true as "1"', () => {
    expect(buildQueryString({ usable_for_documents: true })).toBe('?usable_for_documents=1');
  });

  it('omits false values', () => {
    // false is falsy → omitted (consistent with dms queryString.ts behaviour)
    expect(buildQueryString({ active: false })).toBe('');
  });

  it('omits 0 values', () => {
    // 0 is falsy → omitted (consistent with dms queryString.ts behaviour)
    expect(buildQueryString({ count: 0 })).toBe('');
  });

  it('serializes arrays with comma-joined values', () => {
    expect(buildQueryString({ severity: ['error', 'warning'] })).toBe('?severity=error%2Cwarning');
  });

  it('omits empty array', () => {
    expect(buildQueryString({ severity: [] })).toBe('');
  });

  it('serializes a single-element array without trailing comma', () => {
    expect(buildQueryString({ severity: ['error'] })).toBe('?severity=error');
  });

  it('combines multiple params', () => {
    const result = buildQueryString({ page: 2, search: 'test', extra: null });
    expect(result).toBe('?page=2&search=test');
  });

  it('encodes special characters in values', () => {
    const result = buildQueryString({ search: 'hello world' });
    expect(result).toBe('?search=hello+world');
  });

  it('preserves date string values', () => {
    expect(buildQueryString({ date_from: '2026-01-01' })).toBe('?date_from=2026-01-01');
  });

  // Semantic boundary: `false` and `0` are falsy so they ARE omitted.
  // This is a deliberate choice: these APIs use optional filters where 0/false
  // means "not set", not "filter for 0". Document the intent explicitly:
  it('documents: 0 is treated as "not set" (omitted), not "filter for zero"', () => {
    expect(buildQueryString({ per_page: 0 })).toBe('');
  });
});
