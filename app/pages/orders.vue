<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LabOrder, OrderStatus, LabOrderResponse } from '~/composables/useLabOrdersApi'
import type { PatientResponse } from '~/composables/usePatientsApi'
import type { LabTestResponse } from '~/composables/useTestsApi'

useSeoMeta({ title: 'Lab Orders — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { deleteOrder, updateOrder } = useLabOrdersApi()
const toast = useToast()

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

const STATUS_COLORS: Record<OrderStatus, 'neutral' | 'info' | 'success' | 'primary' | 'secondary'> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  VERIFIED: 'primary',
  DELIVERED: 'secondary'
}

const STATUS_DOTS: Record<OrderStatus, string> = {
  PENDING: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  COMPLETED: 'bg-emerald-500',
  VERIFIED: 'bg-sky-500',
  DELIVERED: 'bg-violet-500'
}

const STATUS_ORDER: OrderStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'DELIVERED']

type ViewMode = 'kanban' | 'list'
const viewMode = ref<ViewMode>('kanban')

const kanbanColumns = computed(() =>
  STATUS_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    color: STATUS_COLORS[s],
    dot: STATUS_DOTS[s],
    orders: orders.value.filter((o) => (o.status ?? 'PENDING') === s)
  }))
)

const searchQuery = ref('')
const filteredOrders = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return orders.value
  return orders.value.filter((o) => {
    const name = (patientMap.value[o.customerId] ?? '').toLowerCase()
    return name.includes(q) || String(o.id).includes(q)
  })
})

const columns: TableColumn<LabOrder>[] = [
  { id: 'orderId', header: '#' },
  { id: 'patient', header: 'Patient' },
  { id: 'requestedAt', header: 'Requested' },
  { id: 'status', header: 'Status' },
  { id: 'notes', header: 'Notes' },
  { id: 'actions', header: '' }
]

function navigateToWorkspace(order: LabOrder) {
  navigateTo(`/test-runs?orderId=${order.id}`)
}

// --- Drag and drop ---
const draggingOrderId = ref<number | null>(null)
const dragTargetStatus = ref<OrderStatus | null>(null)

function onDragStart(e: DragEvent, order: LabOrder) {
  draggingOrderId.value = order.id
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(order.id))
  }
}

function onDragEnd() {
  draggingOrderId.value = null
  dragTargetStatus.value = null
}

function onColumnDragOver(e: DragEvent, status: OrderStatus) {
  if (!draggingOrderId.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
  dragTargetStatus.value = status
}

function onColumnDragLeave(e: DragEvent) {
  const current = e.currentTarget as HTMLElement
  if (!current.contains(e.relatedTarget as Node)) {
    dragTargetStatus.value = null
  }
}

async function onDrop(e: DragEvent, targetStatus: OrderStatus) {
  e.preventDefault()
  dragTargetStatus.value = null
  const orderId = draggingOrderId.value
  draggingOrderId.value = null
  if (!orderId) return
  const order = orders.value.find((o) => o.id === orderId)
  if (!order || (order.status ?? 'PENDING') === targetStatus) return
  try {
    await updateOrder(order.id, {
      customerId: order.customerId,
      notes: order.notes,
      status: targetStatus
    })
    await refresh()
    toast.add({ title: `Moved to ${STATUS_LABELS[targetStatus]}`, color: 'success' })
  } catch (error: unknown) {
    const err = error as { data?: { message?: string }, message?: string }
    toast.add({ title: err?.data?.message ?? 'Failed to update status', color: 'error' })
  }
}

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
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
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
      <div class="flex items-center gap-3">
        <!-- View toggle -->
        <div class="flex items-center bg-elevated rounded-lg p-1 gap-0.5">
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="viewMode === 'kanban'
              ? 'bg-default text-highlighted shadow-sm'
              : 'text-muted hover:text-default'"
            @click="viewMode = 'kanban'"
          >
            <UIcon
              name="i-lucide-columns-3"
              size="14"
            />
            Kanban
          </button>
          <button
            type="button"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
            :class="viewMode === 'list'
              ? 'bg-default text-highlighted shadow-sm'
              : 'text-muted hover:text-default'"
            @click="viewMode = 'list'"
          >
            <UIcon
              name="i-lucide-list"
              size="14"
            />
            List
          </button>
        </div>
        <UButton
          icon="i-lucide-plus"
          @click="openCreate"
        >
          Add Order
        </UButton>
      </div>
    </div>

    <!-- Kanban view -->
    <div v-if="viewMode === 'kanban'">
      <div
        v-if="status === 'pending'"
        class="flex justify-center py-20"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="animate-spin text-muted"
          size="28"
        />
      </div>
      <div
        v-else
        class="overflow-x-auto -mx-4 px-4 pb-6"
      >
        <div class="flex gap-4 min-w-max items-start">
          <div
            v-for="col in kanbanColumns"
            :key="col.status"
            class="w-[272px] flex-shrink-0 flex flex-col"
            @dragover="onColumnDragOver($event, col.status)"
            @dragleave="onColumnDragLeave"
            @drop="onDrop($event, col.status)"
          >
            <!-- Column header -->
            <div class="flex items-center justify-between mb-3 px-0.5">
              <div class="flex items-center gap-2">
                <div
                  class="w-2 h-2 rounded-full flex-shrink-0"
                  :class="col.dot"
                />
                <span class="text-sm font-semibold text-highlighted">{{ col.label }}</span>
              </div>
              <span class="text-xs font-medium text-muted tabular-nums bg-elevated px-2 py-0.5 rounded-full">
                {{ col.orders.length }}
              </span>
            </div>

            <!-- Drop zone + cards -->
            <div
              class="flex flex-col gap-2 rounded-xl transition-colors min-h-20 p-1 -m-1"
              :class="dragTargetStatus === col.status && draggingOrderId
                ? 'bg-primary/5 ring-2 ring-primary/30 ring-inset'
                : ''"
            >
              <div
                v-for="order in col.orders"
                :key="order.id"
                draggable="true"
                title="Open in Lab Workspace"
                class="rounded-xl border border-default bg-default p-3.5 cursor-pointer group hover:border-primary hover:shadow-sm transition-all select-none"
                :class="draggingOrderId === order.id ? 'opacity-40 scale-[0.98] cursor-grab' : ''"
                @dragstart="onDragStart($event, order)"
                @dragend="onDragEnd"
                @click="navigateToWorkspace(order)"
              >
                <div class="flex items-start gap-2">
                  <div class="flex-1 min-w-0">
                    <p class="font-semibold text-sm text-highlighted truncate">
                      {{ patientMap[order.customerId] ?? `Patient #${order.customerId}` }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-xs font-mono text-muted">#{{ order.id }}</span>
                      <span class="text-xs text-muted">{{ formatDate(order.requestedAt) }}</span>
                    </div>
                    <p
                      v-if="order.notes"
                      class="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed"
                    >
                      {{ order.notes }}
                    </p>
                  </div>
                  <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                    <UButton
                      icon="i-lucide-pencil"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      aria-label="Edit order"
                      @click.stop="openEdit(order)"
                    />
                    <UButton
                      icon="i-lucide-trash-2"
                      size="xs"
                      color="error"
                      variant="ghost"
                      aria-label="Delete order"
                      @click.stop="openDelete(order)"
                    />
                  </div>
                </div>
              </div>

              <!-- Empty column drop hint -->
              <div
                v-if="!col.orders.length"
                class="rounded-xl border-2 border-dashed p-6 flex items-center justify-center transition-colors"
                :class="dragTargetStatus === col.status && draggingOrderId
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-default'"
              >
                <p class="text-xs text-muted">
                  {{ dragTargetStatus === col.status && draggingOrderId ? 'Drop here' : 'No orders' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <UCard v-else>
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
        <template #orderId-cell="{ row }">
          <span class="font-mono text-muted text-sm">#{{ row.original.id }}</span>
        </template>

        <template #patient-cell="{ row }">
          <span class="font-medium">{{ patientMap[row.original.customerId] ?? `#${row.original.customerId}` }}</span>
        </template>

        <template #requestedAt-cell="{ row }">
          <span class="text-muted">{{ formatDate(row.original.requestedAt) }}</span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            v-if="row.original.status"
            :color="STATUS_COLORS[row.original.status ?? 'PENDING']"
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
