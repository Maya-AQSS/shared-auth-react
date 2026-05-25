import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'

/**
 * Configuration accepted by {@link createDataHook}.
 *
 * @typeParam TArgs  Arguments the caller passes to the produced hook.
 * @typeParam TData  Type returned by the fetcher (and therefore by the hook).
 */
export interface CreateDataHookConfig<TArgs, TData> {
  /** Stable, serialisable cache key for a given args tuple. */
  queryKey: (args: TArgs) => QueryKey
  /** Async data fetcher. Throw to mark the query as errored. */
  fetcher: (args: TArgs) => Promise<TData>
  /**
   * Defaults merged on every call. Per-call options passed at the hook site
   * win over these.
   */
  defaultOptions?: Partial<UseQueryOptions<TData, Error, TData, QueryKey>>
}

/**
 * Build a typed TanStack-Query hook that wraps the project's standard
 * `useQuery` boilerplate. Eliminates the
 * `useEffect + useState + fetch` triplet detected in maya_dms / maya_logs
 * by Phase 10 of the Maya refactor plan.
 *
 * @example
 *   // api/logs.ts
 *   export const fetchLog = (id: string) => apiGetJson<Log>(`logs/${id}`)
 *
 *   // hooks/useLog.ts
 *   import { createDataHook } from '@maya/shared-auth-react'
 *   import { fetchLog } from '../api/logs'
 *
 *   export const useLog = createDataHook({
 *     queryKey: (id: string) => ['logs', id],
 *     fetcher: (id) => fetchLog(id),
 *     defaultOptions: { staleTime: 60_000 },
 *   })
 *
 *   // pages/LogDetailPage.tsx
 *   const { data, isLoading, error } = useLog(id)
 */
export function createDataHook<TArgs, TData>(
  config: CreateDataHookConfig<TArgs, TData>,
) {
  return function useDataHook(
    args: TArgs,
    options?: Partial<UseQueryOptions<TData, Error, TData, QueryKey>>,
  ): UseQueryResult<TData, Error> {
    return useQuery<TData, Error, TData, QueryKey>({
      queryKey: config.queryKey(args),
      queryFn: () => config.fetcher(args),
      ...(config.defaultOptions ?? {}),
      ...(options ?? {}),
    })
  }
}
