import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from '@tanstack/react-query'
import type { PaginatedResponse, PaginationLinks, PaginationMeta } from '../apiTypes'

/**
 * Result returned by hooks produced via {@link createPaginatedDataHook}.
 *
 * `meta` y `links` se sintetizan desde el envelope plano para mantener el
 * contrato `{ items, meta, links }` que los componentes UI llevan usando
 * desde la primera versión del paquete.
 */
export interface PaginatedQueryResult<TItem> {
  items: TItem[]
  meta: PaginationMeta | null
  links: PaginationLinks | null
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

export interface CreatePaginatedDataHookConfig<TArgs, TItem> {
  queryKey: (args: TArgs) => QueryKey
  fetcher: (args: TArgs) => Promise<PaginatedResponse<TItem>>
  defaultOptions?: Partial<
    UseQueryOptions<PaginatedResponse<TItem>, Error, PaginatedResponse<TItem>, QueryKey>
  >
}

/**
 * Variant of {@link createDataHook} that consumes Laravel's flat paginator
 * envelope (`{ current_page, data, total, links, ... }`, alineado con
 * `PaginatedDto::jsonSerialize()` del paquete shared-http-laravel) y expone
 * el array de items + metadata sintetizada (`meta`, `links`) para componentes.
 *
 * Apps avoid having to spread `response.data` / `response.meta` at every call site.
 *
 * @example
 *   export const useLogsList = createPaginatedDataHook({
 *     queryKey: (filters: LogFilters) => ['logs', filters],
 *     fetcher: (filters) => fetchLogs(filters),
 *     defaultOptions: { staleTime: 30_000 },
 *   })
 *
 *   const { items, meta, isLoading } = useLogsList(filters)
 */
export function createPaginatedDataHook<TArgs, TItem>(
  config: CreatePaginatedDataHookConfig<TArgs, TItem>,
) {
  return function usePaginatedDataHook(
    args: TArgs,
    options?: Partial<
      UseQueryOptions<PaginatedResponse<TItem>, Error, PaginatedResponse<TItem>, QueryKey>
    >,
  ): PaginatedQueryResult<TItem> {
    const query = useQuery<PaginatedResponse<TItem>, Error, PaginatedResponse<TItem>, QueryKey>({
      queryKey: config.queryKey(args),
      queryFn: () => config.fetcher(args),
      ...(config.defaultOptions ?? {}),
      ...(options ?? {}),
    })

    const flat = query.data ?? null

    const meta: PaginationMeta | null = flat
      ? {
          current_page: flat.current_page,
          from: flat.from,
          last_page: flat.last_page,
          per_page: flat.per_page,
          to: flat.to,
          total: flat.total,
          path: flat.path,
        }
      : null

    const links: PaginationLinks | null = flat
      ? {
          first: flat.first_page_url,
          last: flat.last_page_url,
          prev: flat.prev_page_url,
          next: flat.next_page_url,
        }
      : null

    return {
      items: flat?.data ?? [],
      meta,
      links,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isError: query.isError,
      error: query.error,
      refetch: () => {
        void query.refetch()
      },
    }
  }
}
