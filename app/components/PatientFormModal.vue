<script setup lang="ts">
import type { Patient, PatientSex } from '~/composables/usePatientsApi'
import type { Pathology, PathologyResponse } from '~/composables/usePathologiesApi'

const props = defineProps<{
  open: boolean
  isEditing: boolean
  patient: Patient | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': [patient: Patient]
}>()

const { createPatient, updatePatient } = usePatientsApi()
const toast = useToast()

const { data: pathologyData } = await useAuthFetch<PathologyResponse>('/pathologies', {
  params: { pageSize: 100, sortBy: 'name', sortOrder: 'ASC' }
})
const allPathologies = computed(() => pathologyData.value?.content ?? [])

const pathologySearch = ref('')
const isSubmitting = ref(false)

const form = reactive({
  name: '',
  dateOfBirth: '',
  sex: undefined as PatientSex | undefined,
  nationalIdNumber: '',
  taxNumber: '',
  phone: '',
  email: '',
  pathologyIds: [] as number[]
})

const filteredPathologies = computed(() => {
  const q = pathologySearch.value.trim().toLowerCase()
  if (!q) return allPathologies.value
  return allPathologies.value.filter((p: Pathology) => p.name.toLowerCase().includes(q))
})

function togglePathology(id: number) {
  const idx = form.pathologyIds.indexOf(id)
  if (idx === -1) form.pathologyIds.push(id)
  else form.pathologyIds.splice(idx, 1)
}

function isPathologySelected(id: number) {
  return form.pathologyIds.includes(id)
}

function birthDateToAgeInDays(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function ageInDaysToBirthDate(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
}

function resetForm() {
  pathologySearch.value = ''
  form.name = ''
  form.dateOfBirth = ''
  form.sex = undefined
  form.nationalIdNumber = ''
  form.taxNumber = ''
  form.phone = ''
  form.email = ''
  form.pathologyIds = []
}

watch(() => props.open, (isOpen) => {
  if (!isOpen) return
  resetForm()
  if (props.isEditing && props.patient) {
    form.name = props.patient.name
    form.dateOfBirth = props.patient.ageInDays != null ? ageInDaysToBirthDate(props.patient.ageInDays) : ''
    form.sex = props.patient.sex ?? undefined
    form.nationalIdNumber = props.patient.nationalIdNumber ?? ''
    form.taxNumber = props.patient.taxNumber ?? ''
    form.phone = props.patient.phone ?? ''
    form.email = props.patient.email ?? ''
    form.pathologyIds = [...(props.patient.pathologyIds ?? [])]
  }
})

async function save() {
  if (!form.name.trim()) return
  isSubmitting.value = true
  try {
    const body = {
      name: form.name.trim(),
      ageInDays: form.dateOfBirth ? birthDateToAgeInDays(form.dateOfBirth) : null,
      sex: form.sex ?? null,
      nationalIdNumber: form.nationalIdNumber.trim() || null,
      taxNumber: form.taxNumber.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      pathologyIds: form.pathologyIds
    }
    const patient = props.isEditing && props.patient
      ? await updatePatient(props.patient.id, body)
      : await createPatient(body)
    toast.add({ title: props.isEditing ? 'Patient updated' : 'Patient created', color: 'success' })
    emit('update:open', false)
    emit('saved', patient)
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Something went wrong', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="isEditing ? 'Edit Patient' : 'Add Patient'"
    :description="isEditing ? 'Update patient details.' : 'Register a new patient.'"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField
          label="Full Name"
          required
        >
          <UInput
            v-model="form.name"
            placeholder="e.g. John Doe"
            autofocus
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Date of Birth">
            <UInput
              v-model="form.dateOfBirth"
              type="date"
            />
          </UFormField>

          <UFormField label="Sex">
            <USelect
              v-model="form.sex"
              :items="[
                { label: 'Not specified', value: undefined },
                { label: 'Male', value: 'MALE' },
                { label: 'Female', value: 'FEMALE' }
              ]"
              placeholder="Not specified"
            />
          </UFormField>
        </div>

        <UFormField label="Phone">
          <UInput
            v-model="form.phone"
            placeholder="e.g. +504 9999-9999"
            inputmode="tel"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="National ID Number">
            <UInput
              v-model="form.nationalIdNumber"
              placeholder="e.g. 0801-1990-12345"
            />
          </UFormField>

          <UFormField label="Tax Number (RTN)">
            <UInput
              v-model="form.taxNumber"
              placeholder="e.g. 08011990123456"
            />
          </UFormField>
        </div>

        <UFormField label="Email">
          <UInput
            v-model="form.email"
            type="email"
            placeholder="e.g. patient@email.com"
          />
        </UFormField>

        <USeparator label="Pathologies" />

        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-muted">{{ form.pathologyIds.length }} selected</span>
            <UButton
              v-if="form.pathologyIds.length > 0"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="form.pathologyIds = []"
            >
              Clear all
            </UButton>
          </div>

          <UInput
            v-model="pathologySearch"
            icon="i-lucide-search"
            placeholder="Search pathologies…"
            size="sm"
            class="mb-2"
          />

          <div class="rounded-md ring ring-default overflow-y-auto max-h-40">
            <button
              v-for="pathology in filteredPathologies"
              :key="pathology.id"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0"
              @click="togglePathology(pathology.id)"
            >
              <div
                class="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                :class="isPathologySelected(pathology.id) ? 'bg-primary border-primary' : 'border-default'"
              >
                <UIcon
                  v-if="isPathologySelected(pathology.id)"
                  name="i-lucide-check"
                  class="text-white"
                  size="10"
                />
              </div>
              <span class="flex-1 truncate text-default">{{ pathology.name }}</span>
            </button>

            <p
              v-if="!filteredPathologies.length"
              class="text-xs text-muted text-center py-4"
            >
              No pathologies found
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
          @click="emit('update:open', false)"
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
</template>
