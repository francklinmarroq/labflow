<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { AgeRange, AgeRangeResponse } from '~/composables/useAgeRangesApi'

useSeoMeta({ title: 'Age Ranges — LabFlow' })

const { createAgeRange, updateAgeRange, deleteAgeRange } = useAgeRangesApi()
const toast = useToast()

// --- List ---
const { data, status, refresh } = await useAuthFetch<AgeRangeResponse>('/age-ranges', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const ageRanges = computed(() => data.value?.content ?? [])

const columns: TableColumn<AgeRange>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'minAgeDays', header: 'Min Age (days)' },
  { id: 'maxAgeDays', header: 'Max Age (days)' },
  { id: 'actions', header: '' }
]

// --- Create / Edit modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const selected = ref<AgeRange | null>(null)

type AgeUnit = 'days' | 'months' | 'years'
const ageUnit = ref<AgeUnit>('days')
const ageUnitOptions: { label: string, value: AgeUnit }[] = [
  { label: 'Days', value: 'days' },
  { label: 'Months', value: 'months' },
  { label: 'Years', value: 'years' }
]

const form = reactive({
  name: '',
  minAge: '',
  maxAge: ''
})

function toDays(val: string, unit: AgeUnit): number | null {
  const s = val.trim()
  if (!s) return null
  const n = Number(s)
  if (unit === 'months') return Math.round(n * 30)
  if (unit === 'years') return Math.round(n * 365)
  return Math.round(n)
}

function fromDays(days: number | null, unit: AgeUnit): string {
  if (days === null) return ''
  if (unit === 'months') return parseFloat((days / 30).toFixed(2)).toString()
  if (unit === 'years') return parseFloat((days / 365).toFixed(2)).toString()
  return days.toString()
}

watch(ageUnit, (next, prev) => {
  if (form.minAge) form.minAge = fromDays(toDays(form.minAge, prev), next)
  if (form.maxAge) form.maxAge = fromDays(toDays(form.maxAge, prev), next)
})

function openCreate() {
  isEditing.value = false
  selected.value = null
  ageUnit.value = 'days'
  form.name = ''
  form.minAge = ''
  form.maxAge = ''
  modalOpen.value = true
}

function openEdit(range: AgeRange) {
  isEditing.value = true
  selected.value = range
  ageUnit.value = 'days'
  form.name = range.name
  form.minAge = range.minAgeDays?.toString() ?? ''
  form.maxAge = range.maxAgeDays?.toString() ?? ''
  modalOpen.value = true
}

async function save() {
  if (!form.name.trim()) return
  isSubmitting.value = true
  try {
    const body = {
      name: form.name.trim(),
      minAgeDays: toDays(form.minAge, ageUnit.value),
      maxAgeDays: toDays(form.maxAge, ageUnit.value)
    }
    if (isEditing.value && selected.value) {
      await updateAgeRange(selected.value.id, body)
      toast.add({ title: 'Age range updated', color: 'success' })
    } else {
      await createAgeRange(body)
      toast.add({ title: 'Age range created', color: 'success' })
    }
    modalOpen.value = false
    refresh()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    const msg = e?.data?.message ?? e?.message ?? 'Something went wrong'
    toast.add({ title: msg, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

// --- Delete modal ---
const deleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDelete(range: AgeRange) {
  selected.value = range
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!selected.value) return
  isDeleting.value = true
  try {
    await deleteAgeRange(selected.value.id)
    toast.add({ title: 'Age range deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch {
    toast.add({ title: 'Failed to delete age range', color: 'error' })
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
          Age Ranges
        </h1>
        <p class="text-sm text-muted mt-1">
          Age brackets used to scope reference ranges
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Age Range
      </UButton>
    </div>

    <UCard>
      <UTable
        :data="ageRanges"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No age ranges found"
      >
        <template #minAgeDays-cell="{ row }">
          {{ row.original.minAgeDays ?? '—' }}
        </template>

        <template #maxAgeDays-cell="{ row }">
          {{ row.original.maxAgeDays ?? '—' }}
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
      :title="isEditing ? 'Edit Age Range' : 'Add Age Range'"
      :description="isEditing ? 'Update age range details.' : 'Enter details for the new age range.'"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField
            label="Name"
            required
          >
            <UInput
              v-model="form.name"
              placeholder="e.g. Pediatric"
              autofocus
            />
          </UFormField>

          <UFormField label="Unit">
            <UButtonGroup>
              <UButton
                v-for="opt in ageUnitOptions"
                :key="opt.value"
                :color="ageUnit === opt.value ? 'primary' : 'neutral'"
                :variant="ageUnit === opt.value ? 'solid' : 'outline'"
                size="sm"
                @click="ageUnit = opt.value"
              >
                {{ opt.label }}
              </UButton>
            </UButtonGroup>
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="`Min Age (${ageUnit})`">
              <UInput
                v-model="form.minAge"
                inputmode="numeric"
                placeholder="No lower bound"
              />
            </UFormField>

            <UFormField :label="`Max Age (${ageUnit})`">
              <UInput
                v-model="form.maxAge"
                inputmode="numeric"
                placeholder="No upper bound"
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
      title="Delete Age Range"
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
