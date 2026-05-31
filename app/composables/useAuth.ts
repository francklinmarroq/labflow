export interface AuthUser {
  username: string
}

export const useAuth = () => {
  const token = useCookie<string | null>('auth_token', {
    default: () => null,
    maxAge: 60 * 60 * 24,
    sameSite: 'lax'
  })

  const user = useState<AuthUser | null>('auth_user', () => {
    if (!token.value) return null
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1]))
      return { username: payload.sub }
    } catch {
      return null
    }
  })

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  const setSession = (jwt: string, username: string) => {
    token.value = jwt
    user.value = { username }
  }

  const clearSession = () => {
    token.value = null
    user.value = null
  }

  const login = async (username: string, password: string) => {
    const { public: { apiBase } } = useRuntimeConfig()
    const res = await $fetch<{ token: string, username: string }>('/auth/login', {
      baseURL: apiBase,
      method: 'POST',
      body: { username, password }
    })
    setSession(res.token, res.username)
    return res
  }

  const register = async (username: string, password: string) => {
    const { public: { apiBase } } = useRuntimeConfig()
    const res = await $fetch<{ token: string, username: string }>('/auth/register', {
      baseURL: apiBase,
      method: 'POST',
      body: { username, password }
    })
    setSession(res.token, res.username)
    return res
  }

  const logout = async () => {
    clearSession()
    await navigateTo('/login')
  }

  return { token, user, isAuthenticated, login, register, logout }
}
