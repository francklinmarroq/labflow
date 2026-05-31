<script setup lang="ts">
definePageMeta({ layout: false })

const { login, register } = useAuth()

const mode = ref<'login' | 'register'>('login')
const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})
const error = ref('')
const loading = ref(false)

const isRegister = computed(() => mode.value === 'register')

const passwordMismatch = computed(() =>
  isRegister.value && form.confirmPassword !== '' && form.password !== form.confirmPassword
)

const canSubmit = computed(() => {
  if (!form.username || !form.password) return false
  if (isRegister.value) {
    if (form.password.length < 6) return false
    if (form.password !== form.confirmPassword) return false
  }
  return true
})

async function handleSubmit() {
  if (!canSubmit.value) return
  error.value = ''
  loading.value = true

  try {
    if (isRegister.value) {
      await register(form.username, form.password)
    } else {
      await login(form.username, form.password)
    }
    await navigateTo('/')
  } catch (e: unknown) {
    const err = e as { statusCode?: number, data?: { message?: string } }
    if (err.statusCode === 401 || err.statusCode === 403) {
      error.value = 'Invalid username or password.'
    } else if (err.statusCode === 409) {
      error.value = 'This username is already taken.'
    } else {
      error.value = err.data?.message ?? 'An unexpected error occurred. Please try again.'
    }
  } finally {
    loading.value = false
  }
}

function switchMode() {
  mode.value = isRegister.value ? 'login' : 'register'
  error.value = ''
  form.confirmPassword = ''
}
</script>

<template>
  <div class="min-h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <div class="w-full max-w-sm space-y-8">
      <!-- Header -->
      <div class="text-center space-y-2">
        <div class="flex justify-center">
          <div class="flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white font-bold text-lg">
            LF
          </div>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          {{ isRegister ? 'Create an account' : 'Welcome back' }}
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ isRegister ? 'Set up your LabFlow credentials' : 'Sign in to your LabFlow account' }}
        </p>
      </div>

      <!-- Form -->
      <UCard>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <UFormField label="Username">
            <UInput
              v-model="form.username"
              icon="i-lucide-user"
              placeholder="Enter your username"
              autocomplete="username"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Password" :hint="isRegister ? 'Minimum 6 characters' : ''">
            <UInput
              v-model="form.password"
              type="password"
              icon="i-lucide-lock"
              placeholder="Enter your password"
              :autocomplete="isRegister ? 'new-password' : 'current-password'"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <UFormField v-if="isRegister" label="Confirm Password" :error="passwordMismatch ? 'Passwords do not match' : undefined">
            <UInput
              v-model="form.confirmPassword"
              type="password"
              icon="i-lucide-lock"
              placeholder="Confirm your password"
              autocomplete="new-password"
              size="lg"
              class="w-full"
              :color="passwordMismatch ? 'error' : undefined"
            />
          </UFormField>

          <UAlert
            v-if="error"
            color="error"
            icon="i-lucide-circle-alert"
            :title="error"
            variant="subtle"
          />

          <UButton
            type="submit"
            block
            size="lg"
            :loading="loading"
            :disabled="!canSubmit"
          >
            {{ isRegister ? 'Create Account' : 'Sign In' }}
          </UButton>
        </form>
      </UCard>

      <!-- Switch mode -->
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        {{ isRegister ? 'Already have an account?' : "Don't have an account?" }}
        <button
          type="button"
          class="font-medium text-primary hover:text-primary/80 ml-1"
          @click="switchMode"
        >
          {{ isRegister ? 'Sign In' : 'Create one' }}
        </button>
      </p>

      <!-- Color mode toggle -->
      <div class="flex justify-center">
        <UColorModeButton />
      </div>
    </div>
  </div>
</template>
