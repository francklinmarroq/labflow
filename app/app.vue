<script setup>
const { isAuthenticated, logout } = useAuth()
const route = useRoute()
const isLoginPage = computed(() => route.path === '/login')

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'LabFlow',
  description: 'Clinical laboratory management system'
})
</script>

<template>
  <UApp>
    <template v-if="!isLoginPage && isAuthenticated">
      <UDashboardGroup>
        <UDashboardSidebar>
          <template #header>
            <AppLogo />
          </template>

          <AppNavigation />

          <template #footer>
            <div class="flex items-center justify-between px-2">
              <UColorModeButton />
              <UButton variant="ghost" icon="i-lucide-log-out" @click="logout" />
            </div>
          </template>
        </UDashboardSidebar>

        <UDashboardPanel>
          <UDashboardNavbar>
            <template #left>
              <UDashboardSidebarToggle />
            </template>
            <template #right>
              <UDashboardSearchButton />
            </template>
          </UDashboardNavbar>

          <UMain>
            <NuxtPage />
          </UMain>
        </UDashboardPanel>
      </UDashboardGroup>
    </template>

    <template v-else>
      <NuxtPage />
    </template>
  </UApp>
</template>
