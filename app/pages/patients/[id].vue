<script setup lang="ts">
import type { Patient, PatientResponse } from '~/composables/usePatientsApi'

// --- Types ---
interface PatientHistoryResult {
  id: number
  parameterId: number
  parameterName: string
  unit: string | null
  value: string | null
}

interface PatientHistoryRun {
  runId: number
  runNumber: number
  performedAt: string | null
  isVerified: boolean
  results: PatientHistoryResult[]
}

interface PatientHistoryEntry {
  orderId: number
  labTestId: number
  requestedAt: string | null
  orderStatus: string
  runs: PatientHistoryRun[]
}

interface PatientTestHistory {
  testId: number
  testName: string
  entries: PatientHistoryEntry[]
}

// --- Route ---
const route = useRoute()
const customerId = Number(route.params.id)

useSeoMeta({ title: 'Patient History — LabFlow' })

// --- Fetch patient info ---
const { data: patientData } = await useAuthFetch<PatientResponse>('/customers', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const patient = computed<Patient | undefined>(() =>
  patientData.value?.content.find(p => p.id === customerId)
)

// --- Filters ---
const searchQuery = ref('')
const dateFrom = ref('')
const dateTo = ref('')

// --- Fetch history (reactive to filters) ---
const historyParams = computed(() => {
  const params: Record<string, string> = {}
  if (searchQuery.value.trim()) params.testName = searchQuery.value.trim()
  if (dateFrom.value) params.dateFrom = new Date(dateFrom.value).toISOString()
  if (dateTo.value) {
    // End of day
    const d = new Date(dateTo.value)
    d.setHours(23, 59, 59, 999)
    params.dateTo = d.toISOString()
  }
  return params
})

const { data: historyData, status, refresh } = await useAuthFetch<PatientTestHistory[]>(
  `/customers/${customerId}/history`,
  { params: historyParams }
)

const history = computed<PatientTestHistory[]>(() => historyData.value ?? [])

// --- Helpers ---
const ORDER_STATUS_CONFIG: Record<string, { color: 'success' | 'warning' | 'info' | 'neutral' | 'error', label: string }> = {
  DELIVERED: { color: 'success', label: 'Delivered' },
  VERIFIED: { color: 'success', label: 'Verified' },
  COMPLETED: { color: 'info', label: 'Completed' },
  IN_PROGRESS: { color: 'warning', label: 'In Progress' },
  PENDING: { color: 'neutral', label: 'Pending' }
}

function statusConfig(status: string) {
  return ORDER_STATUS_CONFIG[status] ?? { color: 'neutral' as const, label: status }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function formatAge(ageInDays: number | null): string {
  if (ageInDays === null || ageInDays === undefined) return '—'
  if (ageInDays >= 365) return `${Math.floor(ageInDays / 365)} yr`
  if (ageInDays >= 30) return `${Math.floor(ageInDays / 30)} mo`
  return `${ageInDays} d`
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function clearFilters() {
  searchQuery.value = ''
  dateFrom.value = ''
  dateTo.value = ''
}

const hasFilters = computed(() => searchQuery.value || dateFrom.value || dateTo.value)

// Expanded state: set of testIds that are expanded
const expandedTests = ref<Set<number>>(new Set())

watch(history, (groups) => {
  // Auto-expand all groups on first load
  groups.forEach(g => expandedTests.value.add(g.testId))
}, { immediate: true })

function toggleTest(testId: number) {
  if (expandedTests.value.has(testId)) expandedTests.value.delete(testId)
  else expandedTests.value.add(testId)
}
</script>

<template>
  <UContainer class="py-8">
    <!-- Back nav -->
    <div class="mb-6">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        to="/patients"
      >
        Back to Patients
      </UButton>
    </div>

    <!-- Patient header -->
    <div class="flex items-start justify-between mb-8">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span class="text-lg font-bold text-primary select-none">
            {{ patient ? getInitials(patient.name) : '?' }}
          </span>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted tracking-tight">
            {{ patient?.name ?? 'Patient' }}
          </h1>
          <div class="flex items-center gap-3 mt-1 text-sm text-muted">
            <span v-if="patient?.ageInDays != null">{{ formatAge(patient.ageInDays) }}</span>
            <span v-if="patient?.ageInDays != null && patient?.sex">·</span>
            <span v-if="patient?.sex">{{ patient.sex === 'MALE' ? 'Male' : 'Female' }}</span>
            <span v-if="patient?.nationalIdNumber">· {{ patient.nationalIdNumber }}</span>
          </div>
        </div>
      </div>
      <UBadge color="neutral" variant="outline" size="lg">
        {{ history.length }} test{{ history.length !== 1 ? 's' : '' }} on record
      </UBadge>
    </div>

    <!-- Filters bar -->
    <UCard :ui="{ body: 'p-4' }" class="mb-6">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Search by test name" class="flex-1 min-w-48">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="e.g. Complete Blood Count"
            class="w-full"
          />
        </UFormField>

        <UFormField label="From">
          <UInput
            v-model="dateFrom"
            type="date"
            class="w-40"
          />
        </UFormField>

        <UFormField label="To">
          <UInput
            v-model="dateTo"
            type="date"
            class="w-40"
          />
        </UFormField>

        <UButton
          v-if="hasFilters"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          @click="clearFilters"
        >
          Clear
        </UButton>
      </div>
    </UCard>

    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex items-center justify-center py-20 text-muted"
    >
      <UIcon name="i-lucide-loader-2" class="animate-spin size-6 mr-3" />
      Loading history…
    </div>

    <!-- Empty state -->
    <div
      v-else-if="history.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center"
    >
      <div class="w-14 h-14 rounded-full bg-muted/20 flex items-center justify-center mb-4">
        <UIcon name="i-lucide-flask-conical" class="text-muted size-6" />
      </div>
      <p class="font-medium text-highlighted mb-1">No test history found</p>
      <p class="text-sm text-muted">
        {{ hasFilters ? 'Try adjusting your search or date filters.' : 'No lab orders have been recorded for this patient yet.' }}
      </p>
    </div>

    <!-- Test groups -->
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <UCard
        v-for="group in history"
        :key="group.testId"
      >
        <!-- Group header -->
        <template #header>
          <button
            type="button"
            class="w-full flex items-center justify-between gap-3 text-left"
            @click="toggleTest(group.testId)"
          >
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <UIcon name="i-lucide-flask-conical" class="text-primary size-4" />
              </div>
              <div>
                <p class="font-semibold text-highlighted">{{ group.testName }}</p>
                <p class="text-xs text-muted mt-0.5">
                  {{ group.entries.length }} order{{ group.entries.length !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>
            <UIcon
              :name="expandedTests.has(group.testId) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
              class="text-muted size-4 flex-shrink-0"
            />
          </button>
        </template>

        <!-- Entries -->
        <div
          v-if="expandedTests.has(group.testId)"
          class="flex flex-col divide-y divide-default"
        >
          <div
            v-for="entry in group.entries"
            :key="entry.labTestId"
            class="py-4 first:pt-0 last:pb-0"
          >
            <!-- Entry header -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="text-center">
                  <p class="text-sm font-semibold text-highlighted">{{ formatDate(entry.requestedAt) }}</p>
                  <p class="text-xs text-muted">{{ formatTime(entry.requestedAt) }}</p>
                </div>
                <UBadge
                  :color="statusConfig(entry.orderStatus).color"
                  variant="subtle"
                  size="sm"
                >
                  {{ statusConfig(entry.orderStatus).label }}
                </UBadge>
              </div>
              <NuxtLink
                :to="`/orders`"
                class="text-xs text-muted hover:text-highlighted transition-colors"
              >
                Order #{{ entry.orderId }}
              </NuxtLink>
            </div>

            <!-- Runs & results -->
            <div
              v-if="entry.runs.length"
              class="flex flex-col gap-3"
            >
              <div
                v-for="run in entry.runs"
                :key="run.runId"
                class="rounded-lg bg-elevated border border-default overflow-hidden"
              >
                <!-- Run header -->
                <div class="flex items-center justify-between px-4 py-2 border-b border-default bg-default">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-muted uppercase tracking-wider">
                      Run {{ run.runNumber }}
                    </span>
                    <UBadge
                      v-if="run.isVerified"
                      color="success"
                      variant="subtle"
                      size="xs"
                      icon="i-lucide-check-circle"
                    >
                      Verified
                    </UBadge>
                  </div>
                  <span class="text-xs text-muted">
                    {{ run.performedAt ? formatDate(run.performedAt) + ' ' + formatTime(run.performedAt) : '—' }}
                  </span>
                </div>

                <!-- Results table -->
                <div
                  v-if="run.results.length"
                  class="divide-y divide-default"
                >
                  <div
                    v-for="result in run.results"
                    :key="result.id"
                    class="grid grid-cols-3 items-center px-4 py-2.5 text-sm hover:bg-default/50 transition-colors"
                  >
                    <span class="text-default font-medium">{{ result.parameterName }}</span>
                    <span class="text-center font-mono font-semibold text-highlighted tabular-nums">
                      {{ result.value ?? '—' }}
                    </span>
                    <span class="text-right text-muted text-xs">{{ result.unit ?? '' }}</span>
                  </div>
                </div>

                <div
                  v-else
                  class="px-4 py-3 text-sm text-muted text-center"
                >
                  No results recorded
                </div>
              </div>
            </div>

            <p
              v-else
              class="text-sm text-muted"
            >
              No runs recorded for this order.
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </UContainer>
</template>
