<script setup lang="ts">
import type { LabOrderResponse, OrderLabTest } from '~/composables/useLabOrdersApi'
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'
import type { TestConfigResponse } from '~/composables/useTestConfigsApi'
import type { ParameterResponse } from '~/composables/useParametersApi'
import type { TestRun } from '~/composables/useTestRunsApi'

useSeoMeta({ title: 'Test Runs — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { getRunsByLabTest, addRun, verifyRun, deleteRun } = useTestRunsApi()
const { assignTestConfig } = useLabOrdersApi()
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

const orders = computed(() => orderData.value?.content ?? [])
const allPatients = computed(() => patientData.value?.content ?? [])
const allCatalogTests = computed(() => catalogTestData.value?.content ?? [])
const allTestConfigs = computed(() => testConfigData.value?.content ?? [])
const allParameters = computed(() => parameterData.value?.content ?? [])

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

function formatDate(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString()
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

// --- Add Run modal ---
const addRunOpen = ref(false)
const addRunLabTest = ref<OrderLabTest | null>(null)
const isSubmitting = ref(false)
const runFormRows = ref<Array<{ parameterId: number; name: string; value: string }>>([])

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
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to record run', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

// --- Assign Template modal ---
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
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to assign template', color: 'error' })
  } finally {
    isAssigning.value = false
  }
}

// --- Verify / Delete ---
async function handleVerify(labTestId: number, runId: number) {
  try {
    await verifyRun(labTestId, runId)
    runsByLabTestId.value[labTestId] = (runsByLabTestId.value[labTestId] ?? []).map(r => ({
      ...r,
      isVerified: r.id === runId
    }))
    toast.add({ title: 'Run verified', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to verify', color: 'error' })
  }
}

async function handleDeleteRun(labTestId: number, runId: number) {
  try {
    await deleteRun(labTestId, runId)
    runsByLabTestId.value[labTestId] = (runsByLabTestId.value[labTestId] ?? []).filter(r => r.id !== runId)
    toast.add({ title: 'Run deleted', color: 'success' })
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete run', color: 'error' })
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">
        Test Runs
      </h1>
      <p class="text-sm text-muted mt-1">
        Record and verify lab test runs for patient orders
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
        class="flex flex-col gap-4"
      >
        <UCard
          v-for="labTest in orderLabTests"
          :key="labTest.id"
        >
          <template #header>
            <div class="flex items-center justify-between">
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

          <!-- Runs -->
          <div v-if="(runsByLabTestId[labTest.id] ?? []).length">
            <div
              v-for="run in runsByLabTestId[labTest.id]"
              :key="run.id"
              class="flex items-center justify-between py-2.5 border-b border-default last:border-0"
            >
              <div class="flex items-center gap-4">
                <span class="text-sm font-medium text-highlighted w-16">
                  Run #{{ run.runNumber }}
                </span>
                <span class="text-sm text-muted">
                  {{ formatDate(run.performedAt) }}
                </span>
                <UBadge
                  :color="run.isVerified ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
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
  </UContainer>
</template>
