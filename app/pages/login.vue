<script setup lang="ts">
const { login, register } = useAuth()

const tab = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    if (tab.value === 'login') {
      await login(username.value, password.value)
    } else {
      await register(username.value, password.value)
    }
    await navigateTo('/')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, status?: number }
    if (err.status === 409) {
      error.value = 'Username already exists.'
    } else if (err.status === 401 || err.status === 403) {
      error.value = 'Invalid username or password.'
    } else {
      error.value = err.data?.message ?? 'Something went wrong.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UApp>
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <UCard class="w-full max-w-sm">
        <template #header>
          <div class="flex items-center gap-3 justify-center py-2">
            <AppLogo />
          </div>
        </template>

        <UTabs
          v-model="tab"
          :items="[{ value: 'login', label: 'Sign In' }, { value: 'register', label: 'Register' }]"
          class="mb-4"
        />

        <form class="space-y-4" @submit.prevent="submit">
          <UFormField label="Username">
            <UInput v-model="username" placeholder="username" autocomplete="username" required class="w-full" />
          </UFormField>

          <UFormField label="Password">
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              :autocomplete="tab === 'login' ? 'current-password' : 'new-password'"
              required
              class="w-full"
            />
          </UFormField>

          <UAlert v-if="error" color="error" :description="error" />

          <UButton type="submit" class="w-full justify-center" :loading="loading">
            {{ tab === 'login' ? 'Sign In' : 'Create Account' }}
          </UButton>
        </form>
      </UCard>
    </div>
  </UApp>
</template>
