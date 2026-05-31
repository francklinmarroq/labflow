<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Unit, UnitResponse } from '~/composables/useUnitsApi'

useSeoMeta({ title: 'Units — LabFlow' })

const { getAllUnits, createUnit, updateUnit, deleteUnit } = useUnitsApi()
const toast = useToast()

// --- List ---
const data = ref<UnitResponse | null>(null)
const status = ref<'pending' | 'success' | 'error'>('pending')

async function fetchUnits() {
  status.value = 'pending'
  try {
    data.value = await getAllUnits({ pageSize: 100, sortBy: 'unitSymbol', sortOrder: 'ASC' })
    status.value = 'success'
  } catch {
    status.value = 'error'
  }
}

await fetchUnits()

function refresh() { fetchUnits() }

const units = computed(() => data.value?.content ?? [])

const columns: TableColumn<Unit>[] = [
  { accessorKey: 'unitSymbol', header: 'Symbol' },
  { id: 'actions', header: '' }
]

// --- Create / Edit modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const selected = ref<Unit | null>(null)
const form = reactive({ unitSymbol: '' })

function openCreate() {
  isEditing.value = false
  selected.value = null
  form.unitSymbol = ''
  modalOpen.value = true
}

function openEdit(unit: Unit) {
  isEditing.value = true
  selected.value = unit
  form.unitSymbol = unit.unitSymbol
  modalOpen.value = true
}

async function save() {
  if (!form.unitSymbol.trim()) return
  isSubmitting.value = true
  try {
    if (isEditing.value && selected.value) {
      await updateUnit(selected.value.id, { unitSymbol: form.unitSymbol })
      toast.add({ title: 'Unit updated', color: 'success' })
    } else {
      await createUnit({ unitSymbol: form.unitSymbol })
      toast.add({ title: 'Unit created', color: 'success' })
    }
    modalOpen.value = false
    refresh()
  } catch {
    toast.add({ title: 'Something went wrong', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

// --- Delete modal ---
const deleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDelete(unit: Unit) {
  selected.value = unit
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!selected.value) return
  isDeleting.value = true
  try {
    await deleteUnit(selected.value.id)
    toast.add({ title: 'Unit deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch {
    toast.add({ title: 'Failed to delete unit', color: 'error' })
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
          Units
        </h1>
        <p class="text-sm text-muted mt-1">
          Measurement units used in test parameters
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Unit
      </UButton>
    </div>

    <UCard>
      <UTable
        :data="units"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No units found"
      >
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

    <!-- Create / Edit modal -->
    <UModal
      v-model:open="modalOpen"
      :title="isEditing ? 'Edit Unit' : 'Add Unit'"
      :description="isEditing ? 'Update the unit symbol.' : 'Enter a symbol for the new unit.'"
    >
      <template #body>
        <UFormField
          label="Symbol"
          required
        >
          <UInput
            v-model="form.unitSymbol"
            placeholder="e.g. mg/dL"
            autofocus
            @keyup.enter="save"
          />
        </UFormField>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            @click="modalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            :loading="isSubmitting"
            :disabled="!form.unitSymbol.trim()"
            @click="save"
          >
            {{ isEditing ? 'Save changes' : 'Create' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation modal -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Delete Unit"
      :description="`Are you sure you want to delete '${selected?.unitSymbol}'? This action cannot be undone.`"
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
