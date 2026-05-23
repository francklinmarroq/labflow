export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  ssr: false,

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2025-01-15',

  runtimeConfig: {
    public: {
      apiBase: process.env.LABFLOW_PUBLIC_API_BASE ?? 'http://localhost:8080/api/v1'
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
