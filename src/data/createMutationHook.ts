import {
  useMutation,
  useQueryClient,
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'

/**
 * Configuration accepted by {@link createMutationHook}.
 *
 * @typeParam TVars   Arguments accepted by the mutate call.
 * @typeParam TData   Type returned by the mutation function.
 */
export interface CreateMutationHookConfig<TVars, TData> {
  /** Async mutation implementation. */
  mutationFn: (vars: TVars) => Promise<TData>
  /**
   * Cache keys to invalidate on successful mutation. Useful for the typical
   * "create / update / delete → refresh list" pattern. Can be a static list
   * or computed from the mutation variables and result.
   */
  invalidates?:
    | readonly QueryKey[]
    | ((vars: TVars, data: TData) => readonly QueryKey[])
  defaultOptions?: Partial<UseMutationOptions<TData, Error, TVars>>
}

/**
 * Build a typed TanStack-Query mutation hook. Auto-invalidates declared
 * cache keys on success so consumers don't have to wire `useQueryClient`
 * by hand for every mutation.
 *
 * @example
 *   export const useCreateErrorCode = createMutationHook({
 *     mutationFn: (input: NewErrorCodeInput) => apiFetchJson('/error-codes', { method: 'POST', body: input }),
 *     invalidates: [['error-codes']],
 *   })
 *
 *   const { mutate, isPending } = useCreateErrorCode()
 *   mutate(form, { onSuccess: () => navigate(-1) })
 */
export function createMutationHook<TVars, TData>(
  config: CreateMutationHookConfig<TVars, TData>,
) {
  return function useMutationHook(
    options?: Partial<UseMutationOptions<TData, Error, TVars>>,
  ): UseMutationResult<TData, Error, TVars> {
    const queryClient = useQueryClient()

    return useMutation<TData, Error, TVars>({
      mutationFn: config.mutationFn,
      ...(config.defaultOptions ?? {}),
      ...(options ?? {}),
      onSuccess: (data, vars, onMutateResult, context) => {
        const keys =
          typeof config.invalidates === 'function'
            ? config.invalidates(vars, data)
            : (config.invalidates ?? [])
        for (const key of keys) {
          void queryClient.invalidateQueries({ queryKey: key })
        }
        config.defaultOptions?.onSuccess?.(data, vars, onMutateResult, context)
        options?.onSuccess?.(data, vars, onMutateResult, context)
      },
    })
  }
}
