<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LabOrder, OrderStatus, LabOrderResponse } from '~/composables/useLabOrdersApi'
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'

useSeoMeta({ title: 'Lab Orders — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { deleteOrder } = useLabOrdersApi()
const toast = useToast()

// --- Data ---
const { data, status, refresh } = await useFetch<LabOrderResponse>('/orders', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'requestedAt', sortOrder: 'DESC' }
})

const { data: patientData } = await useFetch<PatientResponse>('/customers', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const { data: testData } = await useFetch<LabTestResponse>('/tests', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const orders = computed(() => data.value?.content ?? [])
const allPatients = computed(() => patientData.value?.content ?? [])
const allTests = computed(() => testData.value?.content ?? [])

const patientMap = computed(() =>
  Object.fromEntries(allPatients.value.map(p => [p.id, p.name]))
)

// --- Helpers ---
function formatDate(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString()
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  VERIFIED: 'Verified',
  DELIVERED: 'Delivered'
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  VERIFIED: 'primary',
  DELIVERED: 'secondary'
}

// --- Table ---
const columns: TableColumn<LabOrder>[] = [
  { id: 'patient', header: 'Patient' },
  { id: 'requestedAt', header: 'Requested' },
  { id: 'status', header: 'Status' },
  { id: 'notes', header: 'Notes' },
  { id: 'actions', header: '' }
]

// --- Search ---
const searchQuery = ref('')
const filteredOrders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return orders.value
  return orders.value.filter(o => {
    const name = (patientMap.value[o.customerId] ?? '').toLowerCase()
    return name.includes(q) || String(o.id).includes(q)
  })
})

// --- Form modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const selectedOrder = ref<LabOrder | null>(null)

function openCreate() {
  isEditing.value = false
  selectedOrder.value = null
  modalOpen.value = true
}

function openEdit(order: LabOrder) {
  isEditing.value = true
  selectedOrder.value = order
  modalOpen.value = true
}

// --- Delete modal ---
const deleteModalOpen = ref(false)
const isDeleting = ref(false)
const orderToDelete = ref<LabOrder | null>(null)

function openDelete(order: LabOrder) {
  orderToDelete.value = order
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!orderToDelete.value) return
  isDeleting.value = true
  try {
    await deleteOrder(orderToDelete.value.id)
    toast.add({ title: 'Order deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch (e: any) {
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete order', color: 'error' })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UContainer class="py-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Lab Orders
        </h1>
        <p class="text-sm text-muted mt-1">
          Patient test order management
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Order
      </UButton>
    </div>

    <UCard>
      <template #header>
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search by patient name…"
          class="max-w-sm"
        />
      </template>

      <UTable
        :data="filteredOrders"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No orders found"
      >
        <template #patient-cell="{ row }">
          <span class="font-medium">{{ patientMap[row.original.customerId] ?? `#${row.original.customerId}` }}</span>
        </template>

        <template #requestedAt-cell="{ row }">
          <span class="text-muted">{{ formatDate(row.original.requestedAt) }}</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            v-if="row.original.status"
            :color="STATUS_COLORS[row.original.status] as any"
            variant="subtle"
            size="sm"
          >
            {{ STATUS_LABELS[row.original.status] }}
          </UBadge>
          <span
            v-else
            class="text-muted text-sm"
          >—</span>
        </template>

        <template #notes-cell="{ row }">
          <span class="text-muted text-sm truncate max-w-xs block">{{ row.original.notes ?? '—' }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center justify-end gap-2">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              aria-label="Edit"
              @click="openEdit(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              aria-label="Delete"
              @click="openDelete(row.original)"
            />
          </div>
        </template>
      </UTable>
    </UCard>

    <OrderFormModal
      v-model:open="modalOpen"
      :is-editing="isEditing"
      :order="selectedOrder"
      :patients="allPatients"
      :tests="allTests"
      @saved="refresh()"
    />

    <!-- Delete confirmation modal -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Delete Order"
      :description="`Are you sure you want to delete this order for '${orderToDelete ? patientMap[orderToDelete.customerId] ?? '' : ''}'? This action cannot be undone.`"
    >
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="deleteModalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="isDeleting"
            @click="confirmDelete"
          >
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
