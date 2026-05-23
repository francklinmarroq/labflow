<script setup lang="ts">
const links = [
  {
    label: 'Dashboard',
    icon: 'i-lucide-layout-dashboard',
    to: '/'
  },
  {
    label: 'Patients',
    icon: 'i-lucide-users',
    to: '/patients'
  },
  {
    label: 'Lab Orders',
    icon: 'i-lucide-clipboard-list',
    to: '/orders'
  },
  {
    label: 'Test Runs',
    icon: 'i-lucide-flask-conical',
    to: '/test-runs'
  },
  {
    label: 'Results',
    icon: 'i-lucide-file-chart-line',
    to: '/results'
  }
]

const configLinks = [
  {
    label: 'Pathologies',
    icon: 'i-lucide-microscope',
    to: '/config/pathologies'
  },
  {
    label: 'Tests',
    icon: 'i-lucide-test-tube',
    to: '/config/tests'
  },
  {
    label: 'Parameters',
    icon: 'i-lucide-sliders-horizontal',
    to: '/config/parameters'
  },
  {
    label: 'Reference Ranges',
    icon: 'i-lucide-ruler',
    to: '/config/reference-ranges'
  },
  {
    label: 'Units',
    icon: 'i-lucide-scale',
    to: '/config/units'
  },
  {
    label: 'Age Ranges',
    icon: 'i-lucide-calendar-range',
    to: '/config/age-ranges'
  }
]
</script>

<template>
  <UNavigationMenu
    :items="links"
    orientation="vertical"
    class="px-2"
  />

  <USeparator class="my-3 mx-2" />

  <p class="px-4 text-xs font-semibold text-muted uppercase tracking-widest mb-1">
    Configuration
  </p>

  <UNavigationMenu
    :items="configLinks"
    orientation="vertical"
    class="px-2"
  />
</template>
