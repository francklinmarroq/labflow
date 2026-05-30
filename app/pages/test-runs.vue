<script setup lang="ts">
import type { LabOrder, LabOrderResponse, OrderLabTest } from '~/composables/useLabOrdersApi'
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'
import type { TestConfigResponse } from '~/composables/useTestConfigsApi'
import type { ParameterResponse } from '~/composables/useParametersApi'
import type { UnitResponse } from '~/composables/useUnitsApi'
import type { TestRun, TestRunResult } from '~/composables/useTestRunsApi'

useSeoMeta({ title: 'Lab Workspace — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { getRunsByLabTest, addRun, verifyRun, deleteRun, updateResult } = useTestRunsApi()
const { assignTestConfig } = useLabOrdersApi()
const toast = useToast()

// Catalog data
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

type UBadgeColor = 'neutral' | 'info' | 'success' | 'primary' | 'secondary'
const STATUS_COLORS: Record<string, UBadgeColor> = {
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

// Order options — label includes #ID so USelectMenu can filter by both ID and name
const orderOptions = computed(() =>
  orders.value.map(o => ({
    label: `#${o.id} — ${patientMap.value[o.customerId] ?? '—'} — ${formatDate(o.requestedAt)}`,
    value: o.id
  }))
)

// Selected order — pre-select from ?orderId= query param (set by kanban)
const route = useRoute()
const selectedOrderId = ref<number | undefined>(undefined)

onMounted(() => {
  const qId = Number(route.query.orderId)
  if (qId && !isNaN(qId)) selectedOrderId.value = qId
})

const selectedOrder = computed((): LabOrder | null =>
  orders.value.find(o => o.id === selectedOrderId.value) ?? null
)

// Dynamic state
const orderLabTests = ref<OrderLabTest[]>([])
const runsByLabTestId = ref<Record<number, TestRun[]>>({})
const loadingTests = ref(false)

// Tracks which run rows are expanded to show their results
const expandedRuns = ref<Record<string, boolean>>({})

function isRunExpanded(labTestId: number, runId: number): boolean {
  return expandedRuns.value[`${labTestId}-${runId}`] ?? false
}

function toggleRunExpanded(labTestId: number, runId: number) {
  const key = `${labTestId}-${runId}`
  expandedRuns.value[key] = !expandedRuns.value[key]
}

async function loadOrderData(orderId: number) {
  loadingTests.value = true
  orderLabTests.value = []
  runsByLabTestId.value = {}
  expandedRuns.value = {}
  try {
    const tests = await $fetch<OrderLabTest[]>(`/orders/${orderId}/tests`, { baseURL: apiBase })
    orderLabTests.value = tests
    await Promise.all(
      tests.map(async (lt) => {
        try {
          runsByLabTestId.value[lt.id] = await getRunsByLabTest(lt.id)
        } catch {
          runsByLabTestId.value[lt.id] = []
        }
      })
    )
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? 'Failed to load tests', color: 'error' })
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

// Add Run modal
const addRunOpen = ref(false)
const addRunLabTest = ref<OrderLabTest | null>(null)
const isSubmitting = ref(false)
const runFormRows = ref<Array<{ parameterId: number, name: string, value: string }>>([])

function openAddRun(labTest: OrderLabTest) {
  const config = labTest.testConfigId != null ? testConfigMap.value[labTest.testConfigId] : null
  if (!config) {
    toast.add({ title: 'Assign a test template before recording a run', color: 'warning' })
    return
  }
  addRunLabTest.value = labTest
  runFormRows.value = config.parameterIds.map(pid => ({
    parameterId: pid,
    name: paramMap.value[pid]?.name ?? `#${pid}`,
    value: ''
  }))
  addRunOpen.value = true
}

async function submitRun() {
  if (!addRunLabTest.value) return
  isSubmitting.value = true
  try {
    const run = await addRun(addRunLabTest.value.id, {
      results: runFormRows.value.map(r => ({ parameterId: r.parameterId, value: r.value }))
    })
    const ltId = addRunLabTest.value.id
    runsByLabTestId.value[ltId] = [...(runsByLabTestId.value[ltId] ?? []), run]
    toast.add({ title: 'Run recorded', color: 'success' })
    addRunOpen.value = false
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to record run', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

// Assign Template modal
const assignTemplateOpen = ref(false)
const assignLabTest = ref<OrderLabTest | null>(null)
const assignConfigId = ref<number | null>(null)
const isAssigning = ref(false)

const templatesForAssign = computed(() => {
  if (!assignLabTest.value) return []
  return allTestConfigs.value.filter(tc => tc.testId === assignLabTest.value!.testId)
})

function openAssignTemplate(labTest: OrderLabTest) {
  assignLabTest.value = labTest
  assignConfigId.value = labTest.testConfigId ?? null
  assignTemplateOpen.value = true
}

async function saveAssignTemplate() {
  if (!assignLabTest.value || !assignConfigId.value || !selectedOrderId.value) return
  isAssigning.value = true
  try {
    const updated = await assignTestConfig(selectedOrderId.value, assignLabTest.value.id, assignConfigId.value)
    const idx = orderLabTests.value.findIndex(lt => lt.id === updated.id)
    if (idx !== -1) orderLabTests.value[idx] = updated
    toast.add({ title: 'Template assigned', color: 'success' })
    assignTemplateOpen.value = false
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to assign template', color: 'error' })
  } finally {
    isAssigning.value = false
  }
}

// Verify / Delete run
async function handleVerify(labTestId: number, runId: number) {
  try {
    await verifyRun(labTestId, runId)
    runsByLabTestId.value[labTestId] = (runsByLabTestId.value[labTestId] ?? []).map(r => ({
      ...r,
      isVerified: r.id === runId ? true : r.isVerified
    }))
    toast.add({ title: 'Run verified', color: 'success' })
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to verify', color: 'error' })
  }
}

async function handleDeleteRun(labTestId: number, runId: number) {
  try {
    await deleteRun(labTestId, runId)
    runsByLabTestId.value[labTestId] = (runsByLabTestId.value[labTestId] ?? []).filter(r => r.id !== runId)
    toast.add({ title: 'Run deleted', color: 'success' })
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete run', color: 'error' })
  }
}

// Edit result (merged from results.vue)
const editOpen = ref(false)
const editData = ref<{
  runId: number
  resultId: number
  paramName: string
  unit: string
  value: string
} | null>(null)
const isUpdating = ref(false)

function openEditResult(run: TestRun, result: TestRunResult) {
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
    for (const lt of orderLabTests.value) {
      const runs = runsByLabTestId.value[lt.id] ?? []
      const runIdx = runs.findIndex(r => r.id === updated.testRunId)
      if (runIdx !== -1) {
        const run = runs[runIdx]!
        const resultIdx = run.results.findIndex(r => r.id === updated.id)
        if (resultIdx !== -1) run.results[resultIdx] = updated
        break
      }
    }
    toast.add({ title: 'Result updated', color: 'success' })
    editOpen.value = false
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
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
        Lab Workspace
      </h1>
      <p class="text-sm text-muted mt-1">
        Record test runs and review results for patient orders
      </p>
    </div>

    <!-- Order selector -->
    <UCard class="mb-6">
      <UFormField label="Lab Order">
        <USelectMenu
          v-model="selectedOrderId"
          :items="orderOptions"
          value-key="value"
          label-key="label"
          placeholder="Search by order ID or patient…"
          class="max-w-md"
        />
      </UFormField>
    </UCard>

    <!-- Selected order context banner -->
    <div
      v-if="selectedOrder"
      class="mb-4 rounded-xl border border-primary/30 bg-primary/5 px-5 py-4 flex items-center gap-6 flex-wrap"
    >
      <div>
        <p class="text-xs font-medium text-muted uppercase tracking-wide mb-0.5">
          Patient
        </p>
        <p class="font-bold text-highlighted">
          {{ patientMap[selectedOrder.customerId] ?? `#${selectedOrder.customerId}` }}
        </p>
      </div>
      <div>
        <p class="text-xs font-medium text-muted uppercase tracking-wide mb-0.5">
          Requested
        </p>
        <p class="text-default text-sm">
          {{ formatDate(selectedOrder.requestedAt) }}
        </p>
      </div>
      <div>
        <p class="text-xs font-medium text-muted uppercase tracking-wide mb-0.5">
          Status
        </p>
        <UBadge
          v-if="selectedOrder.status"
          :color="STATUS_COLORS[selectedOrder.status ?? 'PENDING']"
          variant="subtle"
          size="sm"
        >
          {{ STATUS_LABELS[selectedOrder.status] }}
        </UBadge>
      </div>
      <div
        v-if="selectedOrder.notes"
        class="flex-1 min-w-0"
      >
        <p class="text-xs font-medium text-muted uppercase tracking-wide mb-0.5">
          Notes
        </p>
        <p class="text-sm text-muted truncate">
          {{ selectedOrder.notes }}
        </p>
      </div>
      <UButton
        icon="i-lucide-x"
        size="xs"
        color="neutral"
        variant="ghost"
        class="ml-auto"
        aria-label="Clear selection"
        @click="selectedOrderId = undefined"
      />
    </div>

    <!-- Tests for selected order -->
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
        class="flex flex-col gap-3"
      >
        <UCard
          v-for="labTest in orderLabTests"
          :key="labTest.id"
        >
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="font-semibold text-highlighted truncate">
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
                  v-else
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  No template
                </UBadge>
                <UButton
                  icon="i-lucide-settings-2"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  :aria-label="labTest.testConfigId ? 'Change template' : 'Assign template'"
                  @click="openAssignTemplate(labTest)"
                />
              </div>
              <UButton
                icon="i-lucide-plus"
                size="sm"
                @click="openAddRun(labTest)"
              >
                Add Run
              </UButton>
            </div>
          </template>

          <!-- Run list -->
          <div v-if="(runsByLabTestId[labTest.id] ?? []).length">
            <div
              v-for="run in runsByLabTestId[labTest.id]"
              :key="run.id"
              class="border-b border-default last:border-0"
            >
              <!-- Run summary row -->
              <div class="flex items-center justify-between py-3">
                <div class="flex items-center gap-3">
                  <!-- Run number indicator -->
                  <div
                    class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    :class="run.isVerified
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-elevated text-muted'"
                  >
                    {{ run.runNumber ?? '?' }}
                  </div>
                  <span class="text-sm text-muted">{{ formatDate(run.performedAt) }}</span>
                  <UBadge
                    :color="run.isVerified ? 'success' : 'neutral'"
                    variant="subtle"
                    size="xs"
                  >
                    {{ run.isVerified ? 'Verified' : 'Pending' }}
                  </UBadge>
                  <span class="text-xs text-muted">
                    {{ run.results.length }} result{{ run.results.length !== 1 ? 's' : '' }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <UButton
                    v-if="!run.isVerified"
                    icon="i-lucide-check-circle"
                    size="xs"
                    color="success"
                    variant="ghost"
                    aria-label="Verify run"
                    @click="handleVerify(labTest.id, run.id)"
                  />
                  <UButton
                    icon="i-lucide-trash-2"
                    size="xs"
                    color="error"
                    variant="ghost"
                    aria-label="Delete run"
                    @click="handleDeleteRun(labTest.id, run.id)"
                  />
                  <UButton
                    :icon="isRunExpanded(labTest.id, run.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :aria-label="isRunExpanded(labTest.id, run.id) ? 'Collapse results' : 'Expand results'"
                    @click="toggleRunExpanded(labTest.id, run.id)"
                  />
                </div>
              </div>

              <!-- Expanded results table -->
              <div
                v-if="isRunExpanded(labTest.id, run.id)"
                class="pb-3"
              >
                <div class="rounded-lg overflow-hidden ring ring-default">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="bg-elevated">
                        <th class="text-left px-3 py-2 text-xs font-medium text-muted">
                          Parameter
                        </th>
                        <th class="text-left px-3 py-2 text-xs font-medium text-muted">
                          Value
                        </th>
                        <th class="text-left px-3 py-2 text-xs font-medium text-muted">
                          Unit
                        </th>
                        <th class="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="result in run.results"
                        :key="result.id"
                        class="border-t border-default"
                      >
                        <td class="px-3 py-2.5 font-medium text-default">
                          {{ paramMap[result.parameterId]?.name ?? `#${result.parameterId}` }}
                        </td>
                        <td class="px-3 py-2.5 font-semibold text-highlighted tabular-nums">
                          {{ result.value ?? '—' }}
                        </td>
                        <td class="px-3 py-2.5 text-muted text-xs">
                          {{ paramMap[result.parameterId]?.unitId != null
                            ? (unitMap[paramMap[result.parameterId]!.unitId!] ?? '')
                            : '' }}
                        </td>
                        <td class="px-3 py-2.5 text-right">
                          <UButton
                            icon="i-lucide-pencil"
                            size="xs"
                            color="neutral"
                            variant="ghost"
                            aria-label="Edit result"
                            @click="openEditResult(run, result)"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <p
                    v-if="!run.results.length"
                    class="text-xs text-muted text-center py-3"
                  >
                    No results recorded.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p
            v-else
            class="text-sm text-muted py-1"
          >
            No runs yet.
          </p>
        </UCard>
      </div>
    </template>

    <div
      v-else
      class="text-center text-muted py-20"
    >
      <UIcon
        name="i-lucide-flask-conical"
        size="40"
        class="mb-3 opacity-30"
      />
      <p>Select a lab order above to view and record test runs.</p>
    </div>

    <!-- Assign Template modal -->
    <UModal
      v-model:open="assignTemplateOpen"
      :title="assignLabTest ? `Assign Template — ${catalogTestMap[assignLabTest.testId] ?? ''}` : 'Assign Template'"
      description="Choose the template that defines which parameters will be measured for this test."
    >
      <template #body>
        <div class="rounded-md ring ring-default overflow-y-auto max-h-60">
          <button
            v-for="tc in templatesForAssign"
            :key="tc.id"
            type="button"
            class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0"
            @click="assignConfigId = tc.id"
          >
            <div
              class="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
              :class="assignConfigId === tc.id ? 'bg-primary border-primary' : 'border-default'"
            >
              <div
                v-if="assignConfigId === tc.id"
                class="w-2 h-2 rounded-full bg-white"
              />
            </div>
            <span class="flex-1 truncate text-default font-medium">{{ tc.name }}</span>
            <span class="text-xs text-muted">{{ tc.parameterIds.length }} param{{ tc.parameterIds.length !== 1 ? 's' : '' }}</span>
          </button>
          <p
            v-if="!templatesForAssign.length"
            class="text-xs text-muted text-center py-6"
          >
            No templates configured for this test type.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="assignTemplateOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            :loading="isAssigning"
            :disabled="!assignConfigId"
            @click="saveAssignTemplate"
          >
            Assign
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Add Run modal -->
    <UModal
      v-model:open="addRunOpen"
      :title="`Record Run — ${addRunLabTest ? (catalogTestMap[addRunLabTest.testId] ?? '') : ''}`"
      description="Enter measured values for each parameter."
    >
      <template #body>
        <div class="flex flex-col gap-3">
          <div
            v-for="row in runFormRows"
            :key="row.parameterId"
            class="grid grid-cols-2 gap-4 items-center"
          >
            <span class="text-sm font-medium text-default">{{ row.name }}</span>
            <UInput
              v-model="row.value"
              placeholder="Enter value…"
            />
          </div>
          <p
            v-if="!runFormRows.length"
            class="text-sm text-muted text-center py-4"
          >
            No parameters configured for this template.
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="addRunOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            :loading="isSubmitting"
            :disabled="!runFormRows.length"
            @click="submitRun"
          >
            Record Run
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Edit Result modal -->
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
