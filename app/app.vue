<script setup lang="ts">
const { isAuthenticated, user, logout } = useAuth()
const route = useRoute()

const showDashboard = computed(() => isAuthenticated.value && route.path !== '/login')

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    { rel: 'icon', href: '/favicon.ico' },
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com'
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@500;700&display=swap'
    }
  ],
  htmlAttrs: { lang: 'en' }
})

useSeoMeta({
  title: 'LabFlow',
  description: 'Clinical laboratory management system'
})
</script>

<template>
  <UApp>
    <UDashboardGroup v-if="showDashboard">
      <UDashboardSidebar>
        <template #header>
          <AppLogo />
        </template>

        <AppNavigation />

        <template #footer>
          <div class="flex items-center gap-2 px-3 py-2">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <UAvatar
                :label="user?.username?.charAt(0).toUpperCase()"
                size="sm"
                class="shrink-0"
              />
              <span class="text-sm font-medium truncate text-default">
                {{ user?.username }}
              </span>
            </div>
            <UColorModeButton size="xs" variant="ghost" color="neutral" />
            <UTooltip text="Sign out">
              <UButton
                icon="i-lucide-log-out"
                size="xs"
                variant="ghost"
                color="neutral"
                @click="logout"
              />
            </UTooltip>
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

        <UMain class="overflow-y-auto">
          <NuxtPage />
        </UMain>
      </UDashboardPanel>
    </UDashboardGroup>

    <NuxtPage v-else />
  </UApp>
</template>
