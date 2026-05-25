/**
 * Shared TypeScript shapes for Laravel `/api/v1` responses.
 *
 * `PaginatedResponse<T>` refleja el envelope plano que produce el `PaginatedDto`
 * de `maya-shared-http-laravel` (alineado con `LengthAwarePaginator::toArray()`
 * nativo de Laravel) y es el contrato cross-ecosystem para todos los listados
 * paginados de los 5 backends Maya.
 */

export type ApiEnvelope<T> = {
  data: T;
};

/**
 * Estructura de un enlace dentro del array `links` que produce Laravel para
 * generar la chrome de paginación (botones «Previous», `1`, `2`, ..., «Next»).
 */
export interface PaginationLinkItem {
  url: string | null;
  label: string;
  active: boolean;
}

/**
 * Envelope plano de paginación cross-ecosystem.
 *
 * Coincide campo a campo con `PaginatedDto::jsonSerialize()` del paquete
 * `maya-shared-http-laravel` y con el formato nativo de Laravel
 * (`current_page`, `data`, `total`, ...) — sin anidar en `meta`.
 */
export interface PaginatedResponse<T> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: PaginationLinkItem[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

/**
 * Vista «meta» sintetizada para componentes que consumen los metadatos de
 * paginación sin importarles el resto del envelope. Producida por
 * `createPaginatedDataHook` a partir del envelope plano.
 */
export interface PaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path?: string;
}

/**
 * Vista «links de navegación» sintetizada para componentes que solo necesitan
 * los URLs de `first/last/prev/next`. Producida por `createPaginatedDataHook`
 * a partir del envelope plano.
 */
export interface PaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

export type SortDir = 'asc' | 'desc';
