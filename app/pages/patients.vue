<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Patient, PatientResponse } from '~/composables/usePatientsApi'
import type { PathologyResponse } from '~/composables/usePathologiesApi'

useSeoMeta({ title: 'Patients — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { deletePatient } = usePatientsApi()
const toast = useToast()

// --- Data ---
const { data, status, refresh } = await useFetch<PatientResponse>('/customers', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const { data: pathologyData } = await useFetch<PathologyResponse>('/pathologies', {
  baseURL: apiBase,
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const patients = computed(() => data.value?.content ?? [])
const allPathologies = computed(() => pathologyData.value?.content ?? [])

const pathologyMap = computed(() =>
  Object.fromEntries(allPathologies.value.map(p => [p.id, p.name]))
)

// --- Age helper ---
function formatAge(ageInDays: number | null): string {
  if (ageInDays === null || ageInDays === undefined) return '—'
  if (ageInDays >= 365) return `${Math.floor(ageInDays / 365)} yr`
  if (ageInDays >= 30) return `${Math.floor(ageInDays / 30)} mo`
  return `${ageInDays} d`
}

// --- Table ---
const columns: TableColumn<Patient>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'nationalId', header: 'ID Number' },
  { id: 'age', header: 'Age' },
  { id: 'phone', header: 'Phone' },
  { id: 'pathologies', header: 'Pathologies' },
  { id: 'actions', header: '' }
]

// --- Search ---
const searchQuery = ref('')
const filteredPatients = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return patients.value
  return patients.value.filter(p =>
    p.name.toLowerCase().includes(q)
    || p.nationalIdNumber?.toLowerCase().includes(q)
    || p.phone?.includes(q)
  )
})

// --- Form modal ---
const modalOpen = ref(false)
const isEditing = ref(false)
const selectedPatient = ref<Patient | null>(null)

function openCreate() {
  isEditing.value = false
  selectedPatient.value = null
  modalOpen.value = true
}

function openEdit(patient: Patient) {
  isEditing.value = true
  selectedPatient.value = patient
  modalOpen.value = true
}

// --- Delete modal ---
const deleteModalOpen = ref(false)
const isDeleting = ref(false)
const patientToDelete = ref<Patient | null>(null)

function openDelete(patient: Patient) {
  patientToDelete.value = patient
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!patientToDelete.value) return
  isDeleting.value = true
  try {
    await deletePatient(patientToDelete.value.id)
    toast.add({ title: 'Patient deleted', color: 'success' })
    deleteModalOpen.value = false
    refresh()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Failed to delete patient', color: 'error' })
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
          Patients
        </h1>
        <p class="text-sm text-muted mt-1">
          Patient registry
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreate"
      >
        Add Patient
      </UButton>
    </div>

    <UCard>
      <template #header>
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search by name, ID number, or phone…"
          class="max-w-sm"
        />
      </template>

      <UTable
        :data="filteredPatients"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No patients found"
      >
        <template #nationalId-cell="{ row }">
          <span class="text-muted">{{ row.original.nationalIdNumber ?? '—' }}</span>
        </template>

        <template #age-cell="{ row }">
          {{ formatAge(row.original.ageInDays) }}
        </template>

        <template #phone-cell="{ row }">
          <span class="text-muted">{{ row.original.phone ?? '—' }}</span>
        </template>

        <template #pathologies-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="pid in (row.original.pathologyIds ?? []).slice(0, 2)"
              :key="pid"
              color="warning"
              variant="subtle"
              size="sm"
            >
              {{ pathologyMap[pid] ?? `#${pid}` }}
            </UBadge>
            <UBadge
              v-if="(row.original.pathologyIds ?? []).length > 2"
              color="neutral"
              variant="outline"
              size="sm"
            >
              +{{ row.original.pathologyIds.length - 2 }} more
            </UBadge>
            <span
              v-if="!(row.original.pathologyIds ?? []).length"
              class="text-muted text-sm"
            >—</span>
          </div>
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

    <PatientFormModal
      v-model:open="modalOpen"
      :is-editing="isEditing"
      :patient="selectedPatient"
      @saved="refresh()"
    />

    <!-- Delete confirmation modal -->
    <UModal
      v-model:open="deleteModalOpen"
      title="Delete Patient"
      :description="`Are you sure you want to delete '${patientToDelete?.name}'? This action cannot be undone.`"
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
