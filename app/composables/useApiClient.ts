export const useApiClient = () => {
  const { public: { apiBase } } = useRuntimeConfig()
  const { token, logout } = useAuth()

  return $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      if (token.value) {
        options.headers = {
          ...options.headers as Record<string, string>,
          Authorization: `Bearer ${token.value}`
        }
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        await logout()
      }
    }
  })
}
