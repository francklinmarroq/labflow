<script setup lang="ts">
import type { LabOrder, OrderLabTest, OrderStatus } from '~/composables/useLabOrdersApi'
import type { Patient } from '~/composables/usePatientsApi'
import type { LabTest } from '~/composables/useTestsApi'

const props = defineProps<{
  open: boolean
  isEditing: boolean
  order: LabOrder | null
  patients: Patient[]
  tests: LabTest[]
  preselectedPatientId?: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const { createOrder, updateOrder, getOrderTests, addTestToOrder, removeTestFromOrder } = useLabOrdersApi()
const toast = useToast()

// Merges prop patients with any created inline during this session
const localPatients = ref<Patient[]>([])
const allPatients = computed(() => [...props.patients, ...localPatients.value])

const patientMap = computed(() =>
  Object.fromEntries(allPatients.value.map(p => [p.id, p.name]))
)

const patientSearch = ref('')
const testSearch = ref('')
const isSubmitting = ref(false)
const existingLabTests = ref<OrderLabTest[]>([])

const form = reactive({
  customerId: null as number | null,
  notes: '',
  status: 'PENDING' as OrderStatus,
  testIds: [] as number[]
})

const filteredPatients = computed(() => {
  const q = patientSearch.value.trim().toLowerCase()
  if (!q) return allPatients.value
  return allPatients.value.filter((p: Patient) => p.name.toLowerCase().includes(q))
})

const filteredTests = computed(() => {
  const q = testSearch.value.trim().toLowerCase()
  if (!q) return props.tests
  return props.tests.filter((t: LabTest) => t.name.toLowerCase().includes(q))
})

const statusOptions = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Delivered', value: 'DELIVERED' }
]

function toggleTest(id: number) {
  const idx = form.testIds.indexOf(id)
  if (idx === -1) form.testIds.push(id)
  else form.testIds.splice(idx, 1)
}

function isTestSelected(id: number) {
  return form.testIds.includes(id)
}

function resetForm() {
  patientSearch.value = ''
  testSearch.value = ''
  form.customerId = null
  form.notes = ''
  form.status = 'PENDING'
  form.testIds = []
  existingLabTests.value = []
  localPatients.value = []
}

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  resetForm()
  if (props.preselectedPatientId) {
    form.customerId = props.preselectedPatientId
  }
  if (props.isEditing && props.order) {
    form.customerId = props.order.customerId
    form.notes = props.order.notes ?? ''
    form.status = props.order.status ?? 'PENDING'
    try {
      const tests = await getOrderTests(props.order.id)
      existingLabTests.value = tests
      form.testIds = tests.map(t => t.testId)
    } catch {
      // non-critical
    }
  }
})

async function save() {
  if (!form.customerId) return
  isSubmitting.value = true
  try {
    if (props.isEditing && props.order) {
      await updateOrder(props.order.id, {
        customerId: form.customerId,
        notes: form.notes.trim() || null,
        status: form.status
      })
      const toAdd = form.testIds.filter(tid => !existingLabTests.value.find(lt => lt.testId === tid))
      const toRemove = existingLabTests.value.filter(lt => !form.testIds.includes(lt.testId))
      await Promise.all([
        ...toAdd.map(tid => addTestToOrder(props.order!.id, tid)),
        ...toRemove.map(lt => removeTestFromOrder(props.order!.id, lt.id))
      ])
      toast.add({ title: 'Order updated', color: 'success' })
    } else {
      const order = await createOrder({
        customerId: form.customerId,
        notes: form.notes.trim() || null
      })
      await Promise.all(form.testIds.map(tid => addTestToOrder(order.id, tid)))
      toast.add({ title: 'Order created', color: 'success' })
    }
    emit('update:open', false)
    emit('saved')
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Something went wrong', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

// --- Inline patient creation ---
const patientModalOpen = ref(false)

function onPatientCreated(patient: Patient) {
  localPatients.value.push(patient)
  form.customerId = patient.id
  patientSearch.value = ''
}
</script>

<template>
  <UModal
    :open="open"
    :title="isEditing ? 'Edit Order' : 'Add Order'"
    :description="isEditing ? 'Update order details.' : 'Create a new lab order for a patient.'"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <!-- Patient selector -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-default">
              Patient <span class="text-error">*</span>
            </span>
            <span
              v-if="form.customerId"
              class="text-sm font-semibold text-highlighted"
            >
              {{ patientMap[form.customerId] }}
            </span>
          </div>
          <UInput
            v-model="patientSearch"
            icon="i-lucide-search"
            placeholder="Search patients…"
            size="sm"
            class="mb-2"
          />
          <div class="rounded-md ring ring-default overflow-y-auto max-h-40">
            <button
              v-for="patient in filteredPatients"
              :key="patient.id"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0"
              @click="form.customerId = patient.id"
            >
              <div
                class="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors"
                :class="form.customerId === patient.id ? 'bg-primary border-primary' : 'border-default'"
              >
                <div
                  v-if="form.customerId === patient.id"
                  class="w-2 h-2 rounded-full bg-white"
                />
              </div>
              <span class="flex-1 truncate text-default">{{ patient.name }}</span>
            </button>

            <button
              v-if="!filteredPatients.length"
              type="button"
              class="w-full flex items-center gap-2 px-3 py-3 text-sm text-left transition-colors hover:bg-elevated"
              @click="patientModalOpen = true"
            >
              <UIcon
                name="i-lucide-user-plus"
                class="text-primary flex-shrink-0"
                size="16"
              />
              <span class="text-primary font-medium">
                Create "{{ patientSearch }}"
              </span>
            </button>
          </div>
        </div>

        <!-- Status (edit only) -->
        <UFormField
          v-if="isEditing"
          label="Status"
        >
          <USelect
            v-model="form.status"
            :items="statusOptions"
            value-key="value"
            label-key="label"
          />
        </UFormField>

        <!-- Notes -->
        <UFormField label="Notes">
          <UTextarea
            v-model="form.notes"
            placeholder="Optional notes…"
            :rows="2"
          />
        </UFormField>

        <USeparator label="Tests" />

        <!-- Test multi-select -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-muted">
              {{ form.testIds.length }} selected
            </span>
            <UButton
              v-if="form.testIds.length > 0"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="form.testIds = []"
            >
              Clear all
            </UButton>
          </div>
          <UInput
            v-model="testSearch"
            icon="i-lucide-search"
            placeholder="Search tests…"
            size="sm"
            class="mb-2"
          />
          <div class="rounded-md ring ring-default overflow-y-auto max-h-40">
            <button
              v-for="test in filteredTests"
              :key="test.id"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0"
              @click="toggleTest(test.id)"
            >
              <div
                class="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                :class="isTestSelected(test.id) ? 'bg-primary border-primary' : 'border-default'"
              >
                <UIcon
                  v-if="isTestSelected(test.id)"
                  name="i-lucide-check"
                  class="text-white"
                  size="10"
                />
              </div>
              <span class="flex-1 truncate text-default">{{ test.name }}</span>
              <span
                v-if="test.price != null"
                class="text-xs text-muted"
              >
                ${{ test.price }}
              </span>
            </button>
            <p
              v-if="!filteredTests.length"
              class="text-xs text-muted text-center py-4"
            >
              No tests found
            </p>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Cancel
        </UButton>
        <UButton
          :loading="isSubmitting"
          :disabled="!form.customerId"
          @click="save"
        >
          {{ isEditing ? 'Save changes' : 'Create' }}
        </UButton>
      </div>
    </template>
  </UModal>

  <PatientFormModal
    v-model:open="patientModalOpen"
    :is-editing="false"
    :patient="null"
    @saved="onPatientCreated"
  />
</template>
