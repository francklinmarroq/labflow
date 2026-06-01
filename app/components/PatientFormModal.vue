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

const selectedPathologies = computed(() =>
  allPathologies.value.filter((p: Pathology) => form.pathologyIds.includes(p.id))
)

function togglePathology(id: number) {
  const idx = form.pathologyIds.indexOf(id)
  if (idx === -1) form.pathologyIds.push(id)
  else form.pathologyIds.splice(idx, 1)
}

function removePathology(id: number) {
  form.pathologyIds = form.pathologyIds.filter(pid => pid !== id)
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
    :title="isEditing ? 'Edit Patient' : 'New Patient'"
    :ui="{ content: 'max-w-lg' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex flex-col gap-5">
        <!-- Personal info -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Personal Information
          </p>
          <div class="flex flex-col gap-3">
            <UFormField
              label="Full Name"
              required
            >
              <UInput
                v-model="form.name"
                placeholder="e.g. John Doe"
                autofocus
                class="w-full"
              />
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Date of Birth">
                <UInput
                  v-model="form.dateOfBirth"
                  type="date"
                  class="w-full"
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
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Contact info -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Contact
          </p>
          <div class="flex flex-col gap-3">
            <UFormField label="Phone">
              <UInput
                v-model="form.phone"
                placeholder="e.g. +504 9999-9999"
                inputmode="tel"
                icon="i-lucide-phone"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Email">
              <UInput
                v-model="form.email"
                type="email"
                placeholder="e.g. patient@email.com"
                icon="i-lucide-mail"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Identity -->
        <div>
          <p class="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Identity
          </p>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="National ID Number">
              <UInput
                v-model="form.nationalIdNumber"
                placeholder="0801-1990-12345"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Tax Number (RTN)">
              <UInput
                v-model="form.taxNumber"
                placeholder="08011990123456"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

        <USeparator />

        <!-- Pathologies -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-semibold text-muted uppercase tracking-wider">
              Pathologies
            </p>
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

          <!-- Selected tags -->
          <TransitionGroup
            v-if="selectedPathologies.length"
            tag="div"
            enter-active-class="transition-all duration-150"
            leave-active-class="transition-all duration-150 absolute"
            enter-from-class="opacity-0 scale-95"
            leave-to-class="opacity-0 scale-95"
            class="flex flex-wrap gap-1.5 mb-3"
          >
            <UBadge
              v-for="p in selectedPathologies"
              :key="p.id"
              color="warning"
              variant="subtle"
              class="cursor-pointer gap-1 pr-1"
              @click="removePathology(p.id)"
            >
              {{ p.name }}
              <UIcon name="i-lucide-x" class="size-3" />
            </UBadge>
          </TransitionGroup>

          <UInput
            v-model="pathologySearch"
            icon="i-lucide-search"
            placeholder="Search pathologies…"
            size="sm"
            class="mb-2"
          />

          <div class="rounded-lg ring ring-default overflow-y-auto max-h-40 bg-default">
            <button
              v-for="pathology in filteredPathologies"
              :key="pathology.id"
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0"
              @click="togglePathology(pathology.id)"
            >
              <div
                class="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                :class="isPathologySelected(pathology.id)
                  ? 'bg-primary border-primary'
                  : 'border-accented'"
              >
                <UIcon
                  v-if="isPathologySelected(pathology.id)"
                  name="i-lucide-check"
                  class="text-white"
                  size="10"
                />
              </div>
              <span
                class="flex-1 truncate"
                :class="isPathologySelected(pathology.id) ? 'text-highlighted font-medium' : 'text-default'"
              >
                {{ pathology.name }}
              </span>
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
          icon="i-lucide-check"
          @click="save"
        >
          {{ isEditing ? 'Save changes' : 'Create patient' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
