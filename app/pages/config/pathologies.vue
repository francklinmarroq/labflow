<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Pathology, PathologyResponse } from '~/composables/usePathologiesApi'

useSeoMeta({ title: 'Pathologies — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { createPathology, updatePathology, deletePathology } = usePathologiesApi()
const toast = useToast()

// --- Data ---
const { data, status, refresh } = await useFetch<PathologyResponse>('/pathologies', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const pathologies = computed(() => data.value?.content ?? [])

const columns: TableColumn<Pathology>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'actions', header: '' }
]

// --- Create / Edit modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const selected = ref<Pathology | null>(null)
const form = reactive({ name: '' })

function openCreate() {
  isEditing.value = false
  selected.value = null
  form.name = ''
  modalOpen.value = true
}

function openEdit(pathology: Pathology) {
  isEditing.value = true
  selected.value = pathology
  form.name = pathology.name
  modalOpen.value = true
}

async function save() {
  if (!form.name.trim()) return
  isSubmitting.value = true
  try {
    const body = { name: form.name.trim() }
    if (isEditing.value && selected.value) {
      await updatePathology(selected.value.id, body)
      toast.add({ title: 'Pathology updated', color: 'success' })
    } else {
      await createPathology(body)
      toast.add({ title: 'Pathology created', color: 'success' })
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

function openDelete(pathology: Pathology) {
  selected.value = pathology
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!selected.value) return
  isDeleting.value = true
  try {
    await deletePathology(selected.value.id)
    toast.add({ title: 'Pathology deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete pathology', color: 'error' })
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
          Pathologies
        </h1>
        <p class="text-sm text-muted mt-1">
          Conditions associated with lab results
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Pathology
      </UButton>
    </div>

    <UCard>
      <UTable
        :data="pathologies"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No pathologies found"
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
      :title="isEditing ? 'Edit Pathology' : 'Add Pathology'"
      :description="isEditing ? 'Update the pathology name.' : 'Add a new pathology to the catalog.'"
    >
      <template #body>
        <UFormField label="Name" required>
          <UInput
            v-model="form.name"
            placeholder="e.g. Diabetes mellitus"
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
      title="Delete Pathology"
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
