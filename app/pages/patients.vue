<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Patient, PatientResponse } from '~/composables/usePatientsApi'
import type { PathologyResponse } from '~/composables/usePathologiesApi'

useSeoMeta({ title: 'Patients — LabFlow' })

const { deletePatient } = usePatientsApi()
const toast = useToast()

const { data, status, refresh } = await useAuthFetch<PatientResponse>('/customers', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const { data: pathologyData } = await useAuthFetch<PathologyResponse>('/pathologies', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})

const patients = computed(() => data.value?.content ?? [])
const allPathologies = computed(() => pathologyData.value?.content ?? [])

const pathologyMap = computed(() =>
  Object.fromEntries(allPathologies.value.map(p => [p.id, p.name]))
)

// --- Stats ---
const maleCount = computed(() => patients.value.filter(p => p.sex === 'MALE').length)
const femaleCount = computed(() => patients.value.filter(p => p.sex === 'FEMALE').length)

// --- Age helper ---
function formatAge(ageInDays: number | null): string {
  if (ageInDays === null || ageInDays === undefined) return '—'
  if (ageInDays >= 365) return `${Math.floor(ageInDays / 365)} yr`
  if (ageInDays >= 30) return `${Math.floor(ageInDays / 30)} mo`
  return `${ageInDays} d`
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

// --- Table ---
const columns: TableColumn<Patient>[] = [
  { accessorKey: 'name', header: 'Patient' },
  { id: 'nationalId', header: 'ID Number' },
  { id: 'age', header: 'Age' },
  { id: 'sex', header: 'Sex' },
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
    <!-- Page header -->
    <div class="flex items-start justify-between mb-8">
      <div class="flex items-center gap-4">
        <div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <UIcon name="i-lucide-users" class="text-primary size-5" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted tracking-tight">
            Patients
          </h1>
          <p class="text-sm text-muted mt-0.5">
            {{ patients.length }} registered {{ patients.length === 1 ? 'patient' : 'patients' }}
          </p>
        </div>
      </div>
      <UButton
        icon="i-lucide-user-plus"
        @click="openCreate"
      >
        Add Patient
      </UButton>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-lucide-users" class="text-primary size-4" />
          </div>
          <div>
            <p class="text-2xl font-bold text-highlighted leading-none tabular-nums">
              {{ patients.length }}
            </p>
            <p class="text-xs text-muted mt-1">Total patients</p>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-lucide-person-standing" class="text-sky-500 size-4" />
          </div>
          <div>
            <p class="text-2xl font-bold text-highlighted leading-none tabular-nums">
              {{ maleCount }}
            </p>
            <p class="text-xs text-muted mt-1">Male</p>
          </div>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
            <UIcon name="i-lucide-person-standing" class="text-pink-500 size-4" />
          </div>
          <div>
            <p class="text-2xl font-bold text-highlighted leading-none tabular-nums">
              {{ femaleCount }}
            </p>
            <p class="text-xs text-muted mt-1">Female</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Patient table -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search by name, ID number, or phone…"
            class="max-w-sm"
          />
          <Transition
            enter-active-class="transition-opacity duration-150"
            leave-active-class="transition-opacity duration-150"
            enter-from-class="opacity-0"
            leave-to-class="opacity-0"
          >
            <span
              v-if="searchQuery"
              class="text-sm text-muted whitespace-nowrap"
            >
              {{ filteredPatients.length }} result{{ filteredPatients.length !== 1 ? 's' : '' }}
            </span>
          </Transition>
        </div>
      </template>

      <UTable
        :data="filteredPatients"
        :columns="columns"
        :loading="status === 'pending'"
        empty="No patients found"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span class="text-xs font-semibold text-primary select-none">
                {{ getInitials(row.original.name) }}
              </span>
            </div>
            <span class="font-medium text-highlighted">{{ row.original.name }}</span>
          </div>
        </template>

        <template #nationalId-cell="{ row }">
          <span class="text-muted font-mono text-sm">{{ row.original.nationalIdNumber ?? '—' }}</span>
        </template>

        <template #age-cell="{ row }">
          <span class="text-sm tabular-nums">{{ formatAge(row.original.ageInDays) }}</span>
        </template>

        <template #sex-cell="{ row }">
          <UBadge
            v-if="row.original.sex === 'MALE'"
            color="info"
            variant="subtle"
            size="sm"
          >
            Male
          </UBadge>
          <UBadge
            v-else-if="row.original.sex === 'FEMALE'"
            variant="subtle"
            size="sm"
            class="bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300"
          >
            Female
          </UBadge>
          <span
            v-else
            class="text-muted text-sm"
          >—</span>
        </template>

        <template #phone-cell="{ row }">
          <span class="text-muted font-mono text-sm">{{ row.original.phone ?? '—' }}</span>
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
          <div class="flex items-center justify-end gap-1">
            <UTooltip text="View history">
              <UButton
                icon="i-lucide-clock"
                size="xs"
                color="neutral"
                variant="ghost"
                aria-label="View history"
                :to="`/patients/${row.original.id}`"
              />
            </UTooltip>
            <UTooltip text="Edit patient">
              <UButton
                icon="i-lucide-pencil"
                size="xs"
                color="neutral"
                variant="ghost"
                aria-label="Edit"
                @click="openEdit(row.original)"
              />
            </UTooltip>
            <UTooltip text="Delete patient">
              <UButton
                icon="i-lucide-trash-2"
                size="xs"
                color="error"
                variant="ghost"
                aria-label="Delete"
                @click="openDelete(row.original)"
              />
            </UTooltip>
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
