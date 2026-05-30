<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Parameter, ParameterResponse, ParameterSection, ParameterValueType } from '~/composables/useParametersApi'
import type { Unit, UnitResponse } from '~/composables/useUnitsApi'

useSeoMeta({ title: 'Parameters — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { createParameter, updateParameter, deleteParameter } = useParametersApi()
const toast = useToast()

// --- List ---
const { data, status, refresh } = await useFetch<ParameterResponse>('/parameters', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const units = ref<Unit[]>([])

async function loadUnits() {
  if (units.value.length) return
  try {
    const res = await $fetch<UnitResponse>('/units', {
      baseURL: apiBase,
      params: { pageSize: 100, sortBy: 'unitSymbol', sortOrder: 'ASC' }
    })
    units.value = res.content
  } catch { /* unit select will remain empty */ }
}

const parameters = computed(() => data.value?.content ?? [])
const unitMap = computed(() =>
  Object.fromEntries(units.value.map((u) => [u.id, u.unitSymbol]))
)
const unitOptions = computed(() =>
  units.value.map((u) => ({ label: u.unitSymbol, value: u.id }))
)

const sectionOptions: { label: string, value: ParameterSection }[] = [
  { label: 'Chemistry', value: 'CHEMISTRY' },
  { label: 'Physical', value: 'PHYSICAL' },
  { label: 'Microscopic', value: 'MICROSCOPIC' }
]

const valueTypeOptions: { label: string, value: ParameterValueType }[] = [
  { label: 'Quantitative', value: 'QUANTITATIVE' },
  { label: 'Qualitative', value: 'QUALITATIVE' }
]

const columns: TableColumn<Parameter>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'section', header: 'Section' },
  { id: 'valueType', header: 'Value Type' },
  { id: 'unit', header: 'Unit' },
  { id: 'actions', header: '' }
]

// --- Create / Edit modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const selected = ref<Parameter | null>(null)
const form = reactive({
  name: '',
  section: undefined as ParameterSection | undefined,
  valueType: undefined as ParameterValueType | undefined,
  unitId: undefined as number | undefined
})

function openCreate() {
  isEditing.value = false
  selected.value = null
  form.name = ''
  form.section = undefined
  form.valueType = undefined
  form.unitId = undefined
  modalOpen.value = true
  loadUnits()
}

function openEdit(param: Parameter) {
  isEditing.value = true
  selected.value = param
  form.name = param.name
  form.section = param.section ?? undefined
  form.valueType = param.valueType ?? undefined
  form.unitId = param.unitId ?? undefined
  modalOpen.value = true
  loadUnits()
}

async function save() {
  if (!form.name.trim()) return
  isSubmitting.value = true
  try {
    const body = {
      unitId: form.unitId ?? null,
      name: form.name.trim(),
      section: form.section ?? null,
      valueType: form.valueType ?? null
    }
    if (isEditing.value && selected.value) {
      await updateParameter(selected.value.id, body)
      toast.add({ title: 'Parameter updated', color: 'success' })
    } else {
      await createParameter(body)
      toast.add({ title: 'Parameter created', color: 'success' })
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

function openDelete(param: Parameter) {
  selected.value = param
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!selected.value) return
  isDeleting.value = true
  try {
    await deleteParameter(selected.value.id)
    toast.add({ title: 'Parameter deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch {
    toast.add({ title: 'Failed to delete parameter', color: 'error' })
  } finally {
    isDeleting.value = false
  }
}

function sectionLabel(val: ParameterSection | null) {
  return sectionOptions.find((o) => o.value === val)?.label ?? '—'
}

function valueTypeLabel(val: ParameterValueType | null) {
  return valueTypeOptions.find((o) => o.value === val)?.label ?? '—'
}
</script>

<template>
  <UContainer class="py-8">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Parameters
        </h1>
        <p class="text-sm text-muted mt-1">
          Test parameters and their measurement configuration
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Parameter
      </UButton>
    </div>

    <UCard>
      <UTable
        :data="parameters"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No parameters found"
      >
        <template #section-cell="{ row }">
          {{ sectionLabel(row.original.section) }}
        </template>

        <template #valueType-cell="{ row }">
          {{ valueTypeLabel(row.original.valueType) }}
        </template>

        <template #unit-cell="{ row }">
          {{ row.original.unitId ? unitMap[row.original.unitId] ?? '—' : '—' }}
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
      :title="isEditing ? 'Edit Parameter' : 'Add Parameter'"
      :description="isEditing ? 'Update parameter details.' : 'Enter details for the new parameter.'"
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
            />
          </UFormField>

          <UFormField label="Section">
            <USelect
              v-model="form.section"
              :items="sectionOptions"
              placeholder="Select a section"
            />
          </UFormField>

          <UFormField label="Value Type">
            <USelect
              v-model="form.valueType"
              :items="valueTypeOptions"
              placeholder="Select a type"
            />
          </UFormField>

          <UFormField label="Unit">
            <USelect
              v-model="form.unitId"
              :items="unitOptions"
              placeholder="Select a unit"
            />
          </UFormField>
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
      title="Delete Parameter"
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
