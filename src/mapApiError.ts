import { ApiHttpError } from './apiClient';

/**
 * Translates an error thrown by `apiFetchJson` / `apiGetJson` into a
 * domain-prefixed i18n key string. Canonical implementation extracted from
 * maya_dashboard/frontend/src/api/http.ts.
 *
 * Network failures (`fetch()` rejecting with `TypeError`) map to
 * `${prefix}.errorNetwork`.
 *
 * @param err     - The caught error (unknown type).
 * @param prefix  - i18n namespace prefix (e.g. 'favorites', 'documents').
 * @param fallbackKey - Full suffix to append when no specific mapping is found.
 *                     Defaults to 'errorLoad'.
 * @returns The i18n key as a plain string (e.g. 'favorites.errorUnauthorized').
 */
export function mapApiErrorToI18nKey(
  err: unknown,
  prefix: string,
  fallbackKey = 'errorLoad',
): string {
  if (err instanceof ApiHttpError) {
    if (err.status === 401) return `${prefix}.errorUnauthorized`;
    if (err.status === 403) return `${prefix}.errorForbidden`;
    if (err.status === 404) return `${prefix}.errorNotFound`;
    if (err.status === 422) return `${prefix}.errorValidation`;
    if (err.status >= 500) return `${prefix}.errorServer`;
  }
  if (err instanceof TypeError) return `${prefix}.errorNetwork`;
  return `${prefix}.${fallbackKey}`;
}

/**
 * Compat wrapper that returns an `Error` whose `.message` is the i18n key.
 * Mirrors the original `mapApiError` exported from maya_dashboard so existing
 * consumers keep their `catch (e) { setError(mapApiError(e, 'favorites')) }` usage.
 *
 * @param err           - The caught error.
 * @param prefix        - i18n namespace prefix.
 * @param fallbackSuffix - Suffix appended when no specific mapping found. Defaults to 'errorLoad'.
 */
export function mapApiError(err: unknown, prefix: string, fallbackSuffix = 'errorLoad'): Error {
  return new Error(mapApiErrorToI18nKey(err, prefix, fallbackSuffix));
}
