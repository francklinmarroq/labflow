<script setup lang="ts">
import type { LabOrderResponse, OrderLabTest } from '~/composables/useLabOrdersApi'
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'
import type { TestConfigResponse } from '~/composables/useTestConfigsApi'
import type { ParameterResponse } from '~/composables/useParametersApi'
import type { UnitResponse } from '~/composables/useUnitsApi'
import type { TestRun, TestRunResult } from '~/composables/useTestRunsApi'

useSeoMeta({ title: 'Results — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { getRunsByLabTest, updateResult } = useTestRunsApi()
const toast = useToast()

// --- Catalog data (static) ---
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

// --- Order selector ---
const orderOptions = computed(() =>
  orders.value.map(o => ({
    label: `${patientMap.value[o.customerId] ?? '—'} — ${formatDate(o.requestedAt)}`,
    value: o.id
  }))
)

// --- Dynamic state ---
const selectedOrderId = ref<number | undefined>(undefined)
const orderLabTests = ref<OrderLabTest[]>([])
const runsByLabTestId = ref<Record<number, TestRun[]>>({})
const loadingTests = ref(false)

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

// --- Edit result modal ---
const editOpen = ref(false)
const editData = ref<{
  runId: number
  resultId: number
  paramName: string
  unit: string
  value: string
} | null>(null)
const isUpdating = ref(false)

function openEdit(run: TestRun, result: TestRunResult) {
  const param = paramMap.value[result.parameterId]
  editData.value = {
    runId: run.id,
    resultId: result.id,
    paramName: param?.name ?? `#${result.parameterId}`,
    unit: param?.unitId != null ? (unitMap.value[param.unitId] ?? '') : '',
    value: result.value ?? ''
  }
  editOpen.value = true
}

async function saveEdit() {
  if (!editData.value) return
  isUpdating.value = true
  try {
    const updated = await updateResult(editData.value.runId, editData.value.resultId, editData.value.value)
    // Patch the result in local state
    for (const lt of orderLabTests.value) {
      const runs = runsByLabTestId.value[lt.id] ?? []
      const runIdx = runs.findIndex(r => r.id === updated.testRunId)
      if (runIdx !== -1) {
        const run = runs[runIdx]!
        const resultIdx = run.results.findIndex(r => r.id === updated.id)
        if (resultIdx !== -1) {
          run.results[resultIdx] = updated
        }
        break
      }
    }
    toast.add({ title: 'Result updated', color: 'success' })
    editOpen.value = false
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to update result', color: 'error' })
  } finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">
        Results
      </h1>
      <p class="text-sm text-muted mt-1">
        View and edit test results by order
      </p>
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

      <p
        v-else-if="!orderLabTests.length"
        class="text-center text-muted py-12"
      >
        No tests in this order.
      </p>

      <div
        v-else
        class="flex flex-col gap-4"
      >
        <UCard
          v-for="labTest in orderLabTests"
          :key="labTest.id"
        >
          <template #header>
            <div class="flex items-center gap-3">
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
            </div>
          </template>

          <template v-if="getActiveRun(runsByLabTestId[labTest.id] ?? []) as TestRun | null">
            <div class="mb-3 flex items-center gap-3">
              <span class="text-xs text-muted">
                Run #{{ getActiveRun(runsByLabTestId[labTest.id] ?? [])!.runNumber }}
                · {{ formatDateTime(getActiveRun(runsByLabTestId[labTest.id] ?? [])!.performedAt) }}
              </span>
              <UBadge
                :color="getActiveRun(runsByLabTestId[labTest.id] ?? [])!.isVerified ? 'success' : 'warning'"
                variant="subtle"
                size="sm"
              >
                {{ getActiveRun(runsByLabTestId[labTest.id] ?? [])!.isVerified ? 'Verified' : 'Pending Verification' }}
              </UBadge>
            </div>

            <div class="rounded-md ring ring-default overflow-hidden">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-elevated">
                    <th class="text-left px-4 py-2 font-medium text-muted">
                      Parameter
                    </th>
                    <th class="text-left px-4 py-2 font-medium text-muted">
                      Value
                    </th>
                    <th class="text-left px-4 py-2 font-medium text-muted">
                      Unit
                    </th>
                    <th class="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="result in getActiveRun(runsByLabTestId[labTest.id] ?? [])!.results"
                    :key="result.id"
                    class="border-t border-default"
                  >
                    <td class="px-4 py-2.5 font-medium text-default">
                      {{ paramMap[result.parameterId]?.name ?? `#${result.parameterId}` }}
                    </td>
                    <td class="px-4 py-2.5 text-highlighted font-semibold">
                      {{ result.value ?? '—' }}
                    </td>
                    <td class="px-4 py-2.5 text-muted">
                      {{ paramMap[result.parameterId]?.unitId != null
                        ? (unitMap[paramMap[result.parameterId]!.unitId!] ?? '')
                        : '' }}
                    </td>
                    <td class="px-4 py-2.5 text-right">
                      <UButton
                        icon="i-lucide-pencil"
                        size="xs"
                        color="neutral"
                        variant="ghost"
                        aria-label="Edit result"
                        @click="openEdit(getActiveRun(runsByLabTestId[labTest.id] ?? [])!, result)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p
              v-if="!getActiveRun(runsByLabTestId[labTest.id] ?? [])!.results.length"
              class="text-sm text-muted text-center py-4"
            >
              No results recorded.
            </p>
          </template>

          <p
            v-else
            class="text-sm text-muted py-1"
          >
            No runs yet. Record a run in <NuxtLink to="/test-runs" class="underline">Test Runs</NuxtLink>.
          </p>
        </UCard>
      </div>
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

    <!-- Edit result modal -->
    <UModal
      v-model:open="editOpen"
      title="Edit Result"
      :description="editData ? `Update the value for ${editData.paramName}` : ''"
    >
      <template #body>
        <UFormField
          :label="editData ? `${editData.paramName}${editData.unit ? ` (${editData.unit})` : ''}` : 'Value'"
        >
          <UInput
            v-if="editData"
            v-model="editData.value"
            placeholder="Enter value…"
            autofocus
            @keyup.enter="saveEdit"
          />
        </UFormField>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="editOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            :loading="isUpdating"
            @click="saveEdit"
          >
            Save
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
