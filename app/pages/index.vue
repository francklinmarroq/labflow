<script setup lang="ts">
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'

useSeoMeta({ title: 'Dashboard — LabFlow' })

const { data: patientData } = await useAuthFetch<PatientResponse>('/customers', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const { data: testData } = await useAuthFetch<LabTestResponse>('/tests', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const allPatients = computed(() => patientData.value?.content ?? [])
const allTests = computed(() => testData.value?.content ?? [])

const now = new Date()
const greeting = computed(() => {
  const h = now.getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
})

const dateLabel = now.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

const stats = [
  {
    label: 'Active Orders',
    value: '—',
    description: 'In progress',
    icon: 'i-lucide-clipboard-list',
    color: 'text-primary',
    bg: 'bg-primary/10 dark:bg-primary/15'
  },
  {
    label: 'Pending Results',
    value: '—',
    description: 'Awaiting entry',
    icon: 'i-lucide-hourglass',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  },
  {
    label: 'Patients Today',
    value: '—',
    description: 'Registered today',
    icon: 'i-lucide-users',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-500/10'
  },
  {
    label: 'Completed Today',
    value: '—',
    description: 'Reports issued',
    icon: 'i-lucide-circle-check',
    color: 'text-violet-500',
    bg: 'bg-violet-50 dark:bg-violet-500/10'
  }
]

const quickActions = [
  { label: 'New Order', icon: 'i-lucide-plus-circle', action: 'order' },
  { label: 'Find Patient', icon: 'i-lucide-search', to: '/patients' },
  { label: 'Enter Results', icon: 'i-lucide-pencil-line', to: '/test-runs' },
  { label: 'View Reports', icon: 'i-lucide-file-chart-line', to: '/results' }
]

const orderModalOpen = ref(false)

function handleQuickAction(action: string) {
  if (action === 'order') orderModalOpen.value = true
}
</script>

<template>
  <UContainer class="py-8 max-w-7xl">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
      <div>
        <p class="text-xs font-medium text-muted uppercase tracking-widest mb-1">
          {{ dateLabel }}
        </p>
        <h1 class="text-3xl font-bold text-highlighted tracking-tight">
          {{ greeting }}
        </h1>
        <p class="text-sm text-muted mt-1">
          Here's what's happening in your laboratory today.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        size="md"
        class="self-start sm:self-auto shrink-0"
        @click="orderModalOpen = true"
      >
        New Order
      </UButton>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard
        v-for="stat in stats"
        :key="stat.label"
        class="hover:shadow-md transition-shadow duration-200"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-medium text-muted uppercase tracking-wide mb-2">
              {{ stat.label }}
            </p>
            <p class="text-3xl font-bold text-highlighted tabular-nums">
              {{ stat.value }}
            </p>
            <p class="text-xs text-muted mt-1.5">
              {{ stat.description }}
            </p>
          </div>
          <div
            class="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            :class="stat.bg"
          >
            <UIcon
              :name="stat.icon"
              class="w-5 h-5"
              :class="stat.color"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <div class="mb-8">
      <h2 class="text-xs font-semibold text-muted uppercase tracking-widest mb-3">
        Quick Actions
      </h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <template v-for="action in quickActions" :key="action.label">
          <UButton
            v-if="action.action"
            variant="outline"
            color="neutral"
            class="h-14 flex-col gap-1.5 text-xs font-medium justify-center"
            block
            @click="handleQuickAction(action.action)"
          >
            <UIcon :name="action.icon" class="w-5 h-5" />
            {{ action.label }}
          </UButton>
          <UButton
            v-else
            :to="action.to"
            variant="outline"
            color="neutral"
            class="h-14 flex-col gap-1.5 text-xs font-medium justify-center"
            block
          >
            <UIcon :name="action.icon" class="w-5 h-5" />
            {{ action.label }}
          </UButton>
        </template>
      </div>
    </div>

    <!-- Main content cards -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Orders -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-4 rounded-full bg-primary" />
              <h2 class="font-semibold text-highlighted text-sm">
                Recent Orders
              </h2>
            </div>
            <UButton
              to="/orders"
              variant="ghost"
              color="neutral"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              View all
            </UButton>
          </div>
        </template>

        <div class="flex flex-col items-center justify-center py-10 gap-3">
          <div class="w-12 h-12 rounded-full bg-elevated flex items-center justify-center">
            <UIcon name="i-lucide-clipboard-list" class="w-6 h-6 text-muted" />
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-default">
              No recent orders
            </p>
            <p class="text-xs text-muted mt-0.5">
              Create a new order to get started
            </p>
          </div>
          <UButton
            variant="soft"
            size="sm"
            icon="i-lucide-plus"
            @click="orderModalOpen = true"
          >
            New Order
          </UButton>
        </div>
      </UCard>

      <!-- Pending Results -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-1.5 h-4 rounded-full bg-amber-400" />
              <h2 class="font-semibold text-highlighted text-sm">
                Pending Results
              </h2>
            </div>
            <UButton
              to="/results"
              variant="ghost"
              color="neutral"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              View all
            </UButton>
          </div>
        </template>

        <div class="flex flex-col items-center justify-center py-10 gap-3">
          <div class="w-12 h-12 rounded-full bg-elevated flex items-center justify-center">
            <UIcon name="i-lucide-hourglass" class="w-6 h-6 text-muted" />
          </div>
          <div class="text-center">
            <p class="text-sm font-medium text-default">
              No pending results
            </p>
            <p class="text-xs text-muted mt-0.5">
              All results are up to date
            </p>
          </div>
          <UButton
            to="/test-runs"
            variant="soft"
            color="neutral"
            size="sm"
            icon="i-lucide-flask-conical"
          >
            Go to Workspace
          </UButton>
        </div>
      </UCard>
    </div>

    <OrderFormModal
      v-model:open="orderModalOpen"
      :is-editing="false"
      :order="null"
      :patients="allPatients"
      :tests="allTests"
    />
  </UContainer>
</template>
