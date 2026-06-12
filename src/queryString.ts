/**
 * buildQueryString — canónica cross-ecosystem para construir query strings en listados.
 *
 * Unifica tres variantes existentes en el ecosistema Maya:
 *   1. maya_dms/frontend/src/api/queryString.ts  — omite falsy, true→'1', no arrays
 *   2. maya_logs/frontend/src/api/logs.ts buildLogsQuery — manejo explícito por campo,
 *      arrays serialized con .join(','), no maneja `true`
 *   3. maya_audit/frontend/src/utils/auditFilters.ts toUrlParams — manejo explícito por campo,
 *      serializa strings/page/sortBy, sin soporte arrays
 *
 * DECISIÓN DE DISEÑO:
 * - Omitir `null`, `undefined`, `''`, `[]` y también `false` y `0`.
 *   Motivo: en todos los filtros Maya estos valores significan "parámetro no enviado",
 *   no "filtrar por 0/false". El comportamiento es compatible con las tres fuentes.
 * - `true` → `'1'` (compatibilidad con dms queryString para flags booleanos como
 *   `usable_for_documents`).
 * - Arrays serialized con coma (compatible con buildLogsQuery de logs, que usa `.join(',')`).
 * - Números y strings → `String()`.
 *
 * DIFERENCIAS SEMÁNTICAS ENTRE LAS TRES FUENTES:
 * - dms: omite cualquier falsy (0, false, '', null, undefined, []); true→'1'; NO arrays.
 * - logs: omite null/undefined/''/vacíos por condición explícita; arrays→.join(','); no true→'1'.
 * - audit: omite '' por condición explícita; no arrays; serializa solo strings y numbers.
 *
 * ELECCIÓN: Se usa el comportamiento de dms como base (es el más conciso y correcto para
 * filtros opcionales), se añade soporte de arrays (de logs) y se preserva true→'1'.
 * El caso `0` y `false` se omiten porque todos los backends los tratan como "sin filtro".
 *
 * @returns `''` si no hay parámetros, o `'?a=b&c=d'` en caso contrario.
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // Omit: null, undefined, '', false, 0
    if (value === null || value === undefined || value === '' || value === false || value === 0) {
      continue;
    }
    // Arrays: omit empty, join non-empty with comma
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      q.set(key, value.join(','));
      continue;
    }
    // Boolean true → '1' (dms compat for feature flags)
    if (value === true) {
      q.set(key, '1');
      continue;
    }
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
