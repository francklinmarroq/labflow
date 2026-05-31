export const useAuthFetch = <T>(
  url: string,
  options?: Parameters<typeof useFetch<T>>[1]
) => {
  const { public: { apiBase } } = useRuntimeConfig()
  const { token } = useAuth()

  return useFetch<T>(url, {
    ...options,
    baseURL: apiBase,
    headers: computed(() => ({
      ...(options?.headers as Record<string, string>),
      ...(token.value ? { Authorization: `Bearer ${token.value}` } : {})
    }))
  })
}
