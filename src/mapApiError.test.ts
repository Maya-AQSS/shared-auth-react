import { describe, expect, it } from 'vitest';
import { ApiHttpError } from './apiClient';
import { mapApiErrorToI18nKey, mapApiError } from './mapApiError';

describe('mapApiErrorToI18nKey', () => {
  it('returns i18n key for 401', () => {
    const err = new ApiHttpError('Unauthorized', 401);
    expect(mapApiErrorToI18nKey(err, 'favorites')).toBe('favorites.errorUnauthorized');
  });

  it('returns i18n key for 403', () => {
    const err = new ApiHttpError('Forbidden', 403);
    expect(mapApiErrorToI18nKey(err, 'favorites')).toBe('favorites.errorForbidden');
  });

  it('returns i18n key for 404', () => {
    const err = new ApiHttpError('Not Found', 404);
    expect(mapApiErrorToI18nKey(err, 'documents')).toBe('documents.errorNotFound');
  });

  it('returns i18n key for 422', () => {
    const err = new ApiHttpError('Unprocessable Entity', 422);
    expect(mapApiErrorToI18nKey(err, 'templates')).toBe('templates.errorValidation');
  });

  it('returns i18n key for 500', () => {
    const err = new ApiHttpError('Internal Server Error', 500);
    expect(mapApiErrorToI18nKey(err, 'dashboard')).toBe('dashboard.errorServer');
  });

  it('returns i18n key for any status >= 500', () => {
    const err = new ApiHttpError('Service Unavailable', 503);
    expect(mapApiErrorToI18nKey(err, 'logs')).toBe('logs.errorServer');
  });

  it('returns i18n key for TypeError (network failure)', () => {
    const err = new TypeError('Failed to fetch');
    expect(mapApiErrorToI18nKey(err, 'favorites')).toBe('favorites.errorNetwork');
  });

  it('returns prefix.errorLoad for unknown errors (default fallback)', () => {
    expect(mapApiErrorToI18nKey(new Error('unknown'), 'favorites')).toBe('favorites.errorLoad');
  });

  it('returns prefix.errorLoad for string errors', () => {
    expect(mapApiErrorToI18nKey('something', 'favorites')).toBe('favorites.errorLoad');
  });

  it('uses custom fallbackKey when provided', () => {
    expect(mapApiErrorToI18nKey(new Error('x'), 'dashboard', 'errorFetch')).toBe(
      'dashboard.errorFetch',
    );
  });

  it('uses custom fallbackKey for unhandled ApiHttpError status (e.g. 409)', () => {
    const err = new ApiHttpError('Conflict', 409);
    expect(mapApiErrorToI18nKey(err, 'documents', 'errorConflict')).toBe('documents.errorConflict');
  });
});

describe('mapApiError (compat wrapper)', () => {
  it('returns an Error instance', () => {
    const err = new ApiHttpError('Not Found', 404);
    const result = mapApiError(err, 'documents');
    expect(result).toBeInstanceOf(Error);
  });

  it('result.message equals the i18n key', () => {
    const err = new ApiHttpError('Unauthorized', 401);
    expect(mapApiError(err, 'favorites').message).toBe('favorites.errorUnauthorized');
  });

  it('uses fallbackSuffix parameter', () => {
    expect(mapApiError(new Error('x'), 'dashboard', 'errorSomething').message).toBe(
      'dashboard.errorSomething',
    );
  });

  it('defaults fallbackSuffix to errorLoad', () => {
    expect(mapApiError(new Error('x'), 'dashboard').message).toBe('dashboard.errorLoad');
  });
});
