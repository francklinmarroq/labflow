<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { LabTest, LabTestResponse } from '~/composables/useTestsApi'

useSeoMeta({ title: 'Tests — LabFlow' })

const { createTest, updateTest, deleteTest } = useTestsApi()
const toast = useToast()

// --- List ---
const { data, status, refresh } = await useAuthFetch<LabTestResponse>('/tests', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const tests = computed(() => data.value?.content ?? [])

const columns: TableColumn<LabTest>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'price', header: 'Price' },
  { id: 'cost', header: 'Cost' },
  { id: 'actions', header: '' }
]

function formatCurrency(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'HNL' }).format(value)
}

// --- Create / Edit modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const selected = ref<LabTest | null>(null)
const form = reactive({
  name: '',
  price: '',
  cost: ''
})

function toNum(v: string): number | null {
  const s = v.trim()
  return s === '' ? null : Number(s)
}

function openCreate() {
  isEditing.value = false
  selected.value = null
  form.name = ''
  form.price = ''
  form.cost = ''
  modalOpen.value = true
}

function openEdit(test: LabTest) {
  isEditing.value = true
  selected.value = test
  form.name = test.name
  form.price = test.price?.toString() ?? ''
  form.cost = test.cost?.toString() ?? ''
  modalOpen.value = true
}

async function save() {
  if (!form.name.trim()) return
  isSubmitting.value = true
  try {
    const body = {
      name: form.name.trim(),
      price: toNum(form.price),
      cost: toNum(form.cost)
    }
    if (isEditing.value && selected.value) {
      await updateTest(selected.value.id, body)
      toast.add({ title: 'Test updated', color: 'success' })
    } else {
      await createTest(body)
      toast.add({ title: 'Test created', color: 'success' })
    }
    modalOpen.value = false
    refresh()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Something went wrong', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

// --- Delete modal ---
const deleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDelete(test: LabTest) {
  selected.value = test
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!selected.value) return
  isDeleting.value = true
  try {
    await deleteTest(selected.value.id)
    toast.add({ title: 'Test deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete test', color: 'error' })
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
          Tests
        </h1>
        <p class="text-sm text-muted mt-1">
          Test catalog with pricing — what receptionists order
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Test
      </UButton>
    </div>

    <UCard>
      <UTable
        :data="tests"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No tests found"
      >
        <template #price-cell="{ row }">
          {{ formatCurrency(row.original.price) }}
        </template>

        <template #cost-cell="{ row }">
          {{ formatCurrency(row.original.cost) }}
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

    <!-- Create / Edit modal -->
    <UModal
      v-model:open="modalOpen"
      :title="isEditing ? 'Edit Test' : 'Add Test'"
      :description="isEditing ? 'Update test details.' : 'Add a test to the catalog.'"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField
            label="Name"
            required
          >
            <UInput
              v-model="form.name"
              placeholder="e.g. Glucose"
              autofocus
              @keyup.enter="save"
            />
          </UFormField>

          <USeparator label="Pricing" />

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Price (charged to patient)">
              <UInput
                v-model="form.price"
                inputmode="decimal"
                placeholder="e.g. 25.00"
              />
            </UFormField>

            <UFormField label="Cost (internal)">
              <UInput
                v-model="form.cost"
                inputmode="decimal"
                placeholder="e.g. 8.50"
              />
            </UFormField>
          </div>
        </div>
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
            :disabled="!form.name.trim()"
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
      title="Delete Test"
      :description="`Are you sure you want to delete '${selected?.name}'? This action cannot be undone.`"
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
