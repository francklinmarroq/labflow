<script setup>
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
    <UDashboardGroup>
      <UDashboardSidebar>
        <template #header>
          <AppLogo />
        </template>

        <AppNavigation />

        <template #footer>
          <UColorModeButton />
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
  </UApp>
</template>
