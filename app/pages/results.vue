<script setup lang="ts">
import type { LabOrder, LabOrderResponse, OrderLabTest } from '~/composables/useLabOrdersApi'
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'
import type { TestConfigResponse } from '~/composables/useTestConfigsApi'
import type { ParameterResponse } from '~/composables/useParametersApi'
import type { UnitResponse } from '~/composables/useUnitsApi'
import type { TestRun } from '~/composables/useTestRunsApi'

useSeoMeta({ title: 'Results — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { getRunsByLabTest } = useTestRunsApi()
const toast = useToast()

const { data: orderData } = await useFetch<LabOrderResponse>('/orders', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'requestedAt', sortOrder: 'DESC' }
})
const { data: patientData } = await useFetch<PatientResponse>('/customers', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const { data: catalogTestData } = await useFetch<LabTestResponse>('/tests', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const { data: testConfigData } = await useFetch<TestConfigResponse>('/test-configs', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const { data: parameterData } = await useFetch<ParameterResponse>('/parameters', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const { data: unitData } = await useFetch<UnitResponse>('/units', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'unitSymbol', sortOrder: 'ASC' }
})

const orders = computed(() => orderData.value?.content ?? [])
const allPatients = computed(() => patientData.value?.content ?? [])
const allCatalogTests = computed(() => catalogTestData.value?.content ?? [])
const allTestConfigs = computed(() => testConfigData.value?.content ?? [])
const allParameters = computed(() => parameterData.value?.content ?? [])
const allUnits = computed(() => unitData.value?.content ?? [])

const patientMap = computed(() =>
  Object.fromEntries(allPatients.value.map(p => [p.id, p.name]))
)
const catalogTestMap = computed(() =>
  Object.fromEntries(allCatalogTests.value.map(t => [t.id, t.name]))
)
const testConfigMap = computed(() =>
  Object.fromEntries(allTestConfigs.value.map(tc => [tc.id, tc]))
)
const paramMap = computed(() =>
  Object.fromEntries(allParameters.value.map(p => [p.id, p]))
)
const unitMap = computed(() =>
  Object.fromEntries(allUnits.value.map(u => [u.id, u.unitSymbol]))
)

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  VERIFIED: 'Verified',
  DELIVERED: 'Delivered'
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  VERIFIED: 'primary',
  DELIVERED: 'secondary'
}

function formatDate(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString()
}

function formatDateTime(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleString()
}

const orderOptions = computed(() =>
  orders.value.map(o => ({
    label: `${patientMap.value[o.customerId] ?? '—'} — ${formatDate(o.requestedAt)}`,
    value: o.id
  }))
)

const selectedOrderId = ref<number | undefined>(undefined)

const selectedOrder = computed((): LabOrder | null =>
  orders.value.find(o => o.id === selectedOrderId.value) ?? null
)

const orderLabTests = ref<OrderLabTest[]>([])
const runsByLabTestId = ref<Record<number, TestRun[]>>({})
const loadingTests = ref(false)

// Returns the verified run if one exists, otherwise the most recent run
function getActiveRun(runs: TestRun[]): TestRun | null {
  if (!runs.length) return null
  return runs.find(r => r.isVerified) ?? runs.at(-1) ?? null
}

async function loadOrderData(orderId: number) {
  loadingTests.value = true
  orderLabTests.value = []
  runsByLabTestId.value = {}
  try {
    const tests = await $fetch<OrderLabTest[]>(`/orders/${orderId}/tests`, { baseURL: apiBase })
    orderLabTests.value = tests
    await Promise.all(
      tests.map(async lt => {
        try {
          runsByLabTestId.value[lt.id] = await getRunsByLabTest(lt.id)
        } catch {
          runsByLabTestId.value[lt.id] = []
        }
      })
    )
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? 'Failed to load results', color: 'error' })
  } finally {
    loadingTests.value = false
  }
}

watch(selectedOrderId, async (id) => {
  if (!id) {
    orderLabTests.value = []
    runsByLabTestId.value = {}
    return
  }
  await loadOrderData(id)
})

const testsWithResults = computed(() =>
  orderLabTests.value.map(lt => ({
    labTest: lt,
    activeRun: getActiveRun(runsByLabTestId.value[lt.id] ?? [])
  }))
)

const completedCount = computed(() =>
  testsWithResults.value.filter(t => t.activeRun?.isVerified).length
)
</script>

<template>
  <UContainer class="py-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Results
        </h1>
        <p class="text-sm text-muted mt-1">
          Final test results by order
        </p>
      </div>
      <NuxtLink to="/test-runs">
        <UButton
          icon="i-lucide-flask-conical"
          color="neutral"
          variant="outline"
          size="sm"
        >
          Go to Workspace
        </UButton>
      </NuxtLink>
    </div>

    <!-- Order selector -->
    <UCard class="mb-6">
      <UFormField label="Lab Order">
        <USelect
          v-model="selectedOrderId"
          :items="orderOptions"
          value-key="value"
          label-key="label"
          placeholder="Choose a lab order…"
          class="max-w-md"
        />
      </UFormField>
    </UCard>

    <!-- Results content -->
    <template v-if="selectedOrderId">
      <div
        v-if="loadingTests"
        class="flex justify-center py-16"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-muted"
          size="28"
        />
      </div>

      <template v-else-if="orderLabTests.length">
        <!-- Order summary header -->
        <div
          v-if="selectedOrder"
          class="rounded-xl border border-default bg-elevated px-5 py-4 mb-5 flex items-center gap-6 flex-wrap"
        >
          <div>
            <p class="text-xs text-muted uppercase tracking-wide font-medium mb-0.5">
              Patient
            </p>
            <p class="font-bold text-highlighted">
              {{ patientMap[selectedOrder.customerId] ?? `#${selectedOrder.customerId}` }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase tracking-wide font-medium mb-0.5">
              Date
            </p>
            <p class="text-sm text-default">
              {{ formatDate(selectedOrder.requestedAt) }}
            </p>
          </div>
          <div>
            <p class="text-xs text-muted uppercase tracking-wide font-medium mb-0.5">
              Status
            </p>
            <UBadge
              v-if="selectedOrder.status"
              :color="STATUS_COLORS[selectedOrder.status] as any"
              variant="subtle"
              size="sm"
            >
              {{ STATUS_LABELS[selectedOrder.status] }}
            </UBadge>
          </div>
          <div>
            <p class="text-xs text-muted uppercase tracking-wide font-medium mb-0.5">
              Progress
            </p>
            <p class="text-sm text-default tabular-nums">
              {{ completedCount }}/{{ orderLabTests.length }} verified
            </p>
          </div>
        </div>

        <!-- Test result cards -->
        <div class="flex flex-col gap-4">
          <UCard
            v-for="{ labTest, activeRun } in testsWithResults"
            :key="labTest.id"
          >
            <template #header>
              <div class="flex items-center gap-3">
                <!-- Verified indicator -->
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :class="activeRun?.isVerified ? 'bg-emerald-500' : activeRun ? 'bg-amber-400' : 'bg-slate-300'"
                />
                <span class="font-semibold text-highlighted">
                  {{ catalogTestMap[labTest.testId] ?? `Test #${labTest.testId}` }}
                </span>
                <UBadge
                  v-if="labTest.testConfigId"
                  color="neutral"
                  variant="subtle"
                  size="sm"
                >
                  {{ testConfigMap[labTest.testConfigId]?.name ?? '—' }}
                </UBadge>
                <UBadge
                  v-if="activeRun"
                  :color="activeRun.isVerified ? 'success' : 'warning'"
                  variant="subtle"
                  size="sm"
                >
                  {{ activeRun.isVerified ? 'Verified' : 'Pending Verification' }}
                </UBadge>
              </div>
            </template>

            <!-- Results table -->
            <template v-if="activeRun">
              <div class="mb-3 flex items-center gap-3">
                <span class="text-xs text-muted">
                  Run #{{ activeRun.runNumber }} · {{ formatDateTime(activeRun.performedAt) }}
                </span>
              </div>

              <div
                v-if="activeRun.results.length"
                class="rounded-md ring ring-default overflow-hidden"
              >
                <table class="w-full text-sm">
                  <thead>
                    <tr class="bg-elevated">
                      <th class="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                        Parameter
                      </th>
                      <th class="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                        Result
                      </th>
                      <th class="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wide">
                        Unit
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="result in activeRun.results"
                      :key="result.id"
                      class="border-t border-default"
                    >
                      <td class="px-4 py-3 font-medium text-default">
                        {{ paramMap[result.parameterId]?.name ?? `#${result.parameterId}` }}
                      </td>
                      <td class="px-4 py-3 font-bold text-highlighted tabular-nums text-base">
                        {{ result.value ?? '—' }}
                      </td>
                      <td class="px-4 py-3 text-muted text-xs">
                        {{ paramMap[result.parameterId]?.unitId != null
                          ? (unitMap[paramMap[result.parameterId]!.unitId!] ?? '')
                          : '' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p
                v-else
                class="text-sm text-muted"
              >
                No results recorded for this run.
              </p>
            </template>

            <div
              v-else
              class="flex items-center gap-2 py-1"
            >
              <UIcon
                name="i-lucide-clock"
                class="text-muted"
                size="14"
              />
              <p class="text-sm text-muted">
                No runs yet. Record a run in
                <NuxtLink
                  to="/test-runs"
                  class="text-primary hover:underline"
                >
                  Lab Workspace
                </NuxtLink>.
              </p>
            </div>
          </UCard>
        </div>
      </template>

      <p
        v-else
        class="text-center text-muted py-12"
      >
        No tests in this order.
      </p>
    </template>

    <div
      v-else
      class="text-center text-muted py-20"
    >
      <UIcon
        name="i-lucide-file-chart-line"
        size="40"
        class="mb-3 opacity-30"
      />
      <p>Select a lab order above to view its results.</p>
    </div>
  </UContainer>
</template>
