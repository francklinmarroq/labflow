export const useAuth = () => {
  const token = useCookie<string | null>('auth_token', { default: () => null })
  const isAuthenticated = computed(() => !!token.value)

  const login = async (username: string, password: string) => {
    const { public: { apiBase } } = useRuntimeConfig()
    const res = await $fetch<{ token: string, username: string }>('/auth/login', {
      baseURL: apiBase,
      method: 'POST',
      body: { username, password }
    })
    token.value = res.token
    return res
  }

  const register = async (username: string, password: string) => {
    const { public: { apiBase } } = useRuntimeConfig()
    const res = await $fetch<{ token: string, username: string }>('/auth/register', {
      baseURL: apiBase,
      method: 'POST',
      body: { username, password }
    })
    token.value = res.token
    return res
  }

  const logout = () => {
    token.value = null
    navigateTo('/login')
  }

  return { token, isAuthenticated, login, register, logout }
}
