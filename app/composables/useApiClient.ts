export const useApiClient = () => {
  const { public: { apiBase } } = useRuntimeConfig()
  const { token } = useAuth()

  return $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      if (token.value) {
        const existing = options.headers
        const headers = existing instanceof Headers
          ? existing
          : new Headers(existing as HeadersInit | undefined)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    }
  })
}
