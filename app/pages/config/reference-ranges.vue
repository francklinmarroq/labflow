<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ParameterResponse, ParameterSection } from '~/composables/useParametersApi'
import type { ReferenceRange, ReferenceRangeResponse, Sex } from '~/composables/useReferenceRangesApi'
import type { AgeRangeResponse } from '~/composables/useAgeRangesApi'

useSeoMeta({ title: 'Reference Ranges — LabFlow' })

const api = useApiClient()
const { createRange, updateRange, deleteRange } = useReferenceRangesApi()
const toast = useToast()

// --- Data ---
const { data: paramData } = await useAuthFetch<ParameterResponse>('/parameters', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const { data: ageRangeData } = await useAuthFetch<AgeRangeResponse>('/age-ranges', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const parameters = computed(() => paramData.value?.content ?? [])
const ageRanges = computed(() => ageRangeData.value?.content ?? [])

const ageRangeMap = computed(() =>
  Object.fromEntries(ageRanges.value.map(a => [a.id, a.name]))
)
const ageRangeOptions = computed(() => [
  { label: 'All ages', value: undefined as number | undefined },
  ...ageRanges.value.map(a => ({ label: a.name, value: a.id }))
])

// --- Parameter selection ---
const selectedParameterId = ref<number | undefined>(undefined)
const selectedParameter = computed(() =>
  parameters.value.find(p => p.id === selectedParameterId.value) ?? null
)

const search = ref('')
const filteredParameters = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return parameters.value
  return parameters.value.filter(p => p.name.toLowerCase().includes(q))
})

const sectionLabels: Record<string, string> = {
  CHEMISTRY: 'Chemistry',
  PHYSICAL: 'Physical',
  MICROSCOPIC: 'Microscopic'
}

function sectionLabel(section: ParameterSection | null) {
  return section ? (sectionLabels[section] ?? section) : null
}

// --- Reference ranges ---
const ranges = ref<ReferenceRange[]>([])
const isLoadingRanges = ref(false)

async function loadRanges() {
  if (!selectedParameterId.value) {
    ranges.value = []
    return
  }
  isLoadingRanges.value = true
  try {
    const res = await api<ReferenceRangeResponse>(
      `/parameters/${selectedParameterId.value}/reference-ranges`,
      { params: { pageSize: 100 } }
    )
    ranges.value = res.content
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to load reference ranges', color: 'error' })
  } finally {
    isLoadingRanges.value = false
  }
}

watch(selectedParameterId, loadRanges)

// --- Table ---
const columns: TableColumn<ReferenceRange>[] = [
  { id: 'sex', header: 'Sex' },
  { id: 'ageRange', header: 'Age Range' },
  { id: 'lowerLimit', header: 'Min' },
  { id: 'upperLimit', header: 'Max' },
  { id: 'criticalLow', header: 'Crit. Low' },
  { id: 'criticalHigh', header: 'Crit. High' },
  { id: 'interpretation', header: 'Interpretation' },
  { id: 'actions', header: '' }
]

function sexLabel(sex: Sex | null) {
  if (!sex) return 'All'
  return sex === 'MALE' ? 'Male' : 'Female'
}

function ageRangeLabel(id: number | null) {
  if (!id) return 'All ages'
  return ageRangeMap.value[id] ?? `#${id}`
}

// --- Create / Edit modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const selected = ref<ReferenceRange | null>(null)
const form = reactive({
  sex: undefined as Sex | undefined,
  ageRangeId: undefined as number | undefined,
  lowerLimit: '',
  upperLimit: '',
  criticalLow: '',
  criticalHigh: '',
  interpretationText: ''
})

function toNum(v: string): number | null {
  const s = v.trim()
  return s === '' ? null : Number(s)
}

function openCreate() {
  isEditing.value = false
  selected.value = null
  form.sex = undefined
  form.ageRangeId = undefined
  form.lowerLimit = ''
  form.upperLimit = ''
  form.criticalLow = ''
  form.criticalHigh = ''
  form.interpretationText = ''
  modalOpen.value = true
}

function openEdit(range: ReferenceRange) {
  isEditing.value = true
  selected.value = range
  form.sex = range.sex ?? undefined
  form.ageRangeId = range.ageRangeId ?? undefined
  form.lowerLimit = range.lowerLimit?.toString() ?? ''
  form.upperLimit = range.upperLimit?.toString() ?? ''
  form.criticalLow = range.criticalLow?.toString() ?? ''
  form.criticalHigh = range.criticalHigh?.toString() ?? ''
  form.interpretationText = range.interpretationText ?? ''
  modalOpen.value = true
}

async function save() {
  if (!selectedParameterId.value) return
  isSubmitting.value = true
  try {
    const body = {
      parameterId: selectedParameterId.value,
      sex: form.sex ?? null,
      ageRangeId: form.ageRangeId ?? null,
      lowerLimit: toNum(form.lowerLimit),
      upperLimit: toNum(form.upperLimit),
      criticalLow: toNum(form.criticalLow),
      criticalHigh: toNum(form.criticalHigh),
      interpretationText: form.interpretationText.trim() || null
    }
    if (isEditing.value && selected.value) {
      await updateRange(selectedParameterId.value, selected.value.id, body)
      toast.add({ title: 'Reference range updated', color: 'success' })
    } else {
      await createRange(selectedParameterId.value, body)
      toast.add({ title: 'Reference range created', color: 'success' })
    }
    modalOpen.value = false
    await loadRanges()
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

function openDelete(range: ReferenceRange) {
  selected.value = range
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!selected.value || !selectedParameterId.value) return
  isDeleting.value = true
  try {
    await deleteRange(selectedParameterId.value, selected.value.id)
    toast.add({ title: 'Reference range deleted', color: 'success' })
    deleteModalOpen.value = false
    await loadRanges()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete reference range', color: 'error' })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UContainer class="py-8 h-full">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-highlighted">
        Reference Ranges
      </h1>
      <p class="text-sm text-muted mt-1">
        Normal and critical value ranges per parameter
      </p>
    </div>

    <div
      class="flex gap-4"
      style="height: calc(100vh - 13rem)"
    >
      <!-- Left panel: parameter list -->
      <div class="w-64 shrink-0 flex flex-col rounded-lg ring ring-default bg-default overflow-hidden">
        <div class="p-3 border-b border-default shrink-0">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search parameters…"
            size="sm"
          />
        </div>

        <div class="overflow-y-auto flex-1 p-2 space-y-0.5">
          <button
            v-for="param in filteredParameters"
            :key="param.id"
            type="button"
            class="w-full flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors text-left"
            :class="selectedParameterId === param.id
              ? 'bg-primary text-white'
              : 'hover:bg-elevated text-default'"
            @click="selectedParameterId = param.id"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">
                {{ param.name }}
              </p>
              <p
                class="text-xs truncate"
                :class="selectedParameterId === param.id ? 'text-white/70' : 'text-muted'"
              >
                {{ sectionLabel(param.section) ?? 'No section' }}
              </p>
            </div>
            <UIcon
              v-if="selectedParameterId === param.id"
              name="i-lucide-chevron-right"
              class="shrink-0 opacity-70"
              size="14"
            />
          </button>

          <p
            v-if="!filteredParameters.length"
            class="text-xs text-muted text-center py-6"
          >
            No parameters found
          </p>
        </div>
      </div>

      <!-- Right panel: ranges -->
      <div class="flex-1 flex flex-col gap-3 min-w-0 overflow-hidden">
        <!-- Empty state -->
        <div
          v-if="!selectedParameterId"
          class="flex-1 flex items-center justify-center rounded-lg ring ring-default bg-default"
        >
          <div class="text-center">
            <UIcon
              name="i-lucide-arrow-left"
              class="text-muted mb-3"
              size="28"
            />
            <p class="text-sm font-medium text-highlighted">
              Select a parameter
            </p>
            <p class="text-xs text-muted mt-1 max-w-xs">
              Pick a parameter from the list to view and manage its reference ranges
            </p>
          </div>
        </div>

        <template v-else>
          <!-- Header -->
          <div class="flex items-center justify-between shrink-0">
            <div>
              <h2 class="text-base font-semibold text-highlighted">
                {{ selectedParameter?.name }}
              </h2>
              <p
                v-if="selectedParameter?.section"
                class="text-xs text-muted"
              >
                {{ sectionLabel(selectedParameter.section) }}
              </p>
            </div>
            <UButton
              icon="i-lucide-plus"
              size="sm"
              @click="openCreate"
            >
              Add Range
            </UButton>
          </div>

          <!-- Table -->
          <UCard class="flex-1 overflow-auto">
            <UTable
              :data="ranges"
              :columns="columns"
              :loading="isLoadingRanges"
              empty="No reference ranges defined for this parameter"
            >
              <template #sex-cell="{ row }">
                {{ sexLabel(row.original.sex) }}
              </template>

              <template #ageRange-cell="{ row }">
                {{ ageRangeLabel(row.original.ageRangeId) }}
              </template>

              <template #lowerLimit-cell="{ row }">
                {{ row.original.lowerLimit ?? '—' }}
              </template>

              <template #upperLimit-cell="{ row }">
                {{ row.original.upperLimit ?? '—' }}
              </template>

              <template #criticalLow-cell="{ row }">
                {{ row.original.criticalLow ?? '—' }}
              </template>

              <template #criticalHigh-cell="{ row }">
                {{ row.original.criticalHigh ?? '—' }}
              </template>

              <template #interpretation-cell="{ row }">
                <span class="max-w-xs truncate block">
                  {{ row.original.interpretationText ?? '—' }}
                </span>
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
        </template>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <UModal
      v-model:open="modalOpen"
      :title="isEditing ? 'Edit Reference Range' : 'Add Reference Range'"
      :description="`${isEditing ? 'Update' : 'Define a'} reference range for ${selectedParameter?.name}`"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Sex">
              <USelect
                v-model="form.sex"
                :items="[
                  { label: 'All sexes', value: undefined },
                  { label: 'Male', value: 'MALE' },
                  { label: 'Female', value: 'FEMALE' }
                ]"
                placeholder="All sexes"
              />
            </UFormField>

            <UFormField label="Age Range">
              <USelect
                v-model="form.ageRangeId"
                :items="ageRangeOptions"
                placeholder="All ages"
              />
            </UFormField>
          </div>
          <p class="text-xs text-muted -mt-2">
            Leave <strong>Sex</strong> or <strong>Age Range</strong> empty to apply this range to all sexes or all ages respectively.
          </p>

          <USeparator label="Normal range" />

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Lower Limit">
              <UInput
                v-model="form.lowerLimit"
                inputmode="numeric"
                placeholder="e.g. 70"
              />
            </UFormField>
            <UFormField label="Upper Limit">
              <UInput
                v-model="form.upperLimit"
                inputmode="numeric"
                placeholder="e.g. 100"
              />
            </UFormField>
          </div>

          <USeparator label="Critical values" />

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Critical Low">
              <UInput
                v-model="form.criticalLow"
                inputmode="numeric"
                placeholder="e.g. 50"
              />
            </UFormField>
            <UFormField label="Critical High">
              <UInput
                v-model="form.criticalHigh"
                inputmode="numeric"
                placeholder="e.g. 400"
              />
            </UFormField>
          </div>

          <UFormField label="Interpretation Text">
            <UInput
              v-model="form.interpretationText"
              placeholder="e.g. Normal fasting glucose"
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
      title="Delete Reference Range"
      description="Are you sure you want to delete this reference range? This action cannot be undone."
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
