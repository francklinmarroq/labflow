<script setup lang="ts">
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'

useSeoMeta({ title: 'Dashboard — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()

const { data: patientData } = await useFetch<PatientResponse>('/customers', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const { data: testData } = await useFetch<LabTestResponse>('/tests', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const allPatients = computed(() => patientData.value?.content ?? [])
const allTests = computed(() => testData.value?.content ?? [])

const stats = [
  { label: 'Active Orders', value: '—', icon: 'i-lucide-clipboard-list', color: 'primary' },
  { label: 'Pending Results', value: '—', icon: 'i-lucide-hourglass', color: 'warning' },
  { label: 'Patients Today', value: '—', icon: 'i-lucide-users', color: 'success' },
  { label: 'Completed Today', value: '—', icon: 'i-lucide-circle-check', color: 'neutral' }
]

const orderModalOpen = ref(false)
</script>

<template>
  <UContainer class="py-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Dashboard
        </h1>
        <p class="text-sm text-muted mt-1">
          Clinical laboratory overview
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="orderModalOpen = true"
      >
        New Order
      </UButton>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <UCard
        v-for="stat in stats"
        :key="stat.label"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-muted">
              {{ stat.label }}
            </p>
            <p class="text-2xl font-bold text-highlighted mt-1">
              {{ stat.value }}
            </p>
          </div>
          <UIcon
            :name="stat.icon"
            class="w-8 h-8 text-primary"
          />
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-highlighted">
              Recent Orders
            </h2>
            <UButton
              to="/orders"
              variant="ghost"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              View all
            </UButton>
          </div>
        </template>
        <div class="text-sm text-muted py-8 text-center">
          No recent orders
        </div>
      </UCard>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-highlighted">
              Pending Results
            </h2>
            <UButton
              to="/results"
              variant="ghost"
              size="xs"
              trailing-icon="i-lucide-arrow-right"
            >
              View all
            </UButton>
          </div>
        </template>
        <div class="text-sm text-muted py-8 text-center">
          No pending results
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
