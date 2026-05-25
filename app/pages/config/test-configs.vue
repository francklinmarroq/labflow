<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { TestConfig, TestConfigResponse } from '~/composables/useTestConfigsApi'
import type { Parameter, ParameterResponse } from '~/composables/useParametersApi'
import type { LabTest, LabTestResponse } from '~/composables/useTestsApi'

useSeoMeta({ title: 'Test Templates — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { createTestConfig, updateTestConfig, deleteTestConfig } = useTestConfigsApi()
const toast = useToast()

// --- Data ---
const { data, status, refresh } = await useFetch<TestConfigResponse>('/test-configs', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const { data: paramData } = await useFetch<ParameterResponse>('/parameters', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const { data: testData } = await useFetch<LabTestResponse>('/tests', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const testConfigs = computed(() => data.value?.content ?? [])
const allParameters = computed(() => paramData.value?.content ?? [])
const allTests = computed(() => testData.value?.content ?? [])

const parameterMap = computed(() =>
  Object.fromEntries(allParameters.value.map(p => [p.id, p.name]))
)
const testMap = computed(() =>
  Object.fromEntries(allTests.value.map(t => [t.id, t.name]))
)
const testOptions = computed(() =>
  allTests.value.map(t => ({ label: t.name, value: t.id }))
)

const columns: TableColumn<TestConfig>[] = [
  { id: 'test', header: 'Test' },
  { accessorKey: 'name', header: 'Internal Name' },
  { id: 'parameters', header: 'Parameters' },
  { id: 'active', header: 'Status' },
  { id: 'actions', header: '' }
]

// --- Create / Edit modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const isSubmitting = ref(false)
const selected = ref<TestConfig | null>(null)

const paramSearch = ref('')
const form = reactive({
  testId: undefined as number | undefined,
  name: '',
  active: true,
  parameterIds: [] as number[]
})

const filteredParameters = computed(() => {
  const q = paramSearch.value.trim().toLowerCase()
  if (!q) return allParameters.value
  return allParameters.value.filter(p => p.name.toLowerCase().includes(q))
})

function toggleParameter(id: number) {
  const idx = form.parameterIds.indexOf(id)
  if (idx === -1) form.parameterIds.push(id)
  else form.parameterIds.splice(idx, 1)
}

function isSelected(id: number) {
  return form.parameterIds.includes(id)
}

function openCreate() {
  isEditing.value = false
  selected.value = null
  paramSearch.value = ''
  form.testId = undefined
  form.name = ''
  form.active = true
  form.parameterIds = []
  modalOpen.value = true
}

function openEdit(config: TestConfig) {
  isEditing.value = true
  selected.value = config
  paramSearch.value = ''
  form.testId = config.testId
  form.name = config.name
  form.active = config.active
  form.parameterIds = [...config.parameterIds]
  modalOpen.value = true
}

const canSave = computed(() =>
  form.testId !== undefined && form.name.trim() !== '' && form.parameterIds.length > 0
)

async function save() {
  if (!canSave.value) return
  isSubmitting.value = true
  try {
    const body = {
      testId: form.testId!,
      name: form.name.trim(),
      active: form.active,
      parameterIds: form.parameterIds
    }
    if (isEditing.value && selected.value) {
      await updateTestConfig(selected.value.id, body)
      toast.add({ title: 'Test template updated', color: 'success' })
    } else {
      await createTestConfig(body)
      toast.add({ title: 'Test template created', color: 'success' })
    }
    modalOpen.value = false
    refresh()
  } catch (e: any) {
    console.error(e)
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Something went wrong', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

// --- Delete modal ---
const deleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDelete(config: TestConfig) {
  selected.value = config
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!selected.value) return
  isDeleting.value = true
  try {
    await deleteTestConfig(selected.value.id)
    toast.add({ title: 'Test template deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch (e: any) {
    console.error(e)
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete test template', color: 'error' })
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
          Test Templates
        </h1>
        <p class="text-sm text-muted mt-1">
          Specific implementations (machines/protocols) for each test
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Template
      </UButton>
    </div>

    <UCard>
      <UTable
        :data="testConfigs"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No test templates found"
      >
        <template #test-cell="{ row }">
          <span class="font-medium">{{ testMap[row.original.testId] ?? `#${row.original.testId}` }}</span>
        </template>

        <template #parameters-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="pid in row.original.parameterIds.slice(0, 3)"
              :key="pid"
              color="neutral"
              variant="subtle"
              size="sm"
            >
              {{ parameterMap[pid] ?? `#${pid}` }}
            </UBadge>
            <UBadge
              v-if="row.original.parameterIds.length > 3"
              color="neutral"
              variant="outline"
              size="sm"
            >
              +{{ row.original.parameterIds.length - 3 }} more
            </UBadge>
            <span
              v-if="row.original.parameterIds.length === 0"
              class="text-muted text-sm"
            >—</span>
          </div>
        </template>

        <template #active-cell="{ row }">
          <UBadge
            :color="row.original.active ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.active ? 'Active' : 'Inactive' }}
          </UBadge>
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
      :title="isEditing ? 'Edit Test Template' : 'Add Test Template'"
      :description="isEditing ? 'Update the template details.' : 'Define a specific implementation for a test.'"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField label="Test" required>
            <USelect
              v-model="form.testId"
              :items="testOptions"
              placeholder="Select a test…"
            />
          </UFormField>

          <UFormField label="Internal Name" required>
            <UInput
              v-model="form.name"
              placeholder="e.g. Glucose Beckman Analyzer 1"
            />
          </UFormField>

          <UFormField label="Status">
            <div class="flex items-center gap-3">
              <UToggle v-model="form.active" />
              <span class="text-sm text-default">
                {{ form.active ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </UFormField>

          <USeparator label="Parameters" />

          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm text-muted">
                {{ form.parameterIds.length }} selected
              </span>
              <UButton
                v-if="form.parameterIds.length > 0"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="form.parameterIds = []"
              >
                Clear all
              </UButton>
            </div>

            <UInput
              v-model="paramSearch"
              icon="i-lucide-search"
              placeholder="Search parameters…"
              size="sm"
              class="mb-2"
            />

            <div class="rounded-md ring ring-default overflow-y-auto max-h-48">
              <button
                v-for="param in filteredParameters"
                :key="param.id"
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0"
                @click="toggleParameter(param.id)"
              >
                <div
                  class="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                  :class="isSelected(param.id)
                    ? 'bg-primary border-primary'
                    : 'border-default'"
                >
                  <UIcon
                    v-if="isSelected(param.id)"
                    name="i-lucide-check"
                    class="text-white"
                    size="10"
                  />
                </div>
                <span class="flex-1 truncate text-default">{{ param.name }}</span>
                <span
                  v-if="param.section"
                  class="text-xs text-muted shrink-0"
                >
                  {{ param.section.charAt(0) + param.section.slice(1).toLowerCase() }}
                </span>
              </button>

              <p
                v-if="!filteredParameters.length"
                class="text-xs text-muted text-center py-4"
              >
                No parameters found
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
            @click="modalOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            :loading="isSubmitting"
            :disabled="!canSave"
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
      title="Delete Test Template"
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
