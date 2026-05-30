<script setup lang="ts">
import type { Laboratory } from '~/composables/useLaboratoryApi'

useSeoMeta({ title: 'Laboratorio — LabFlow' })

const { public: { apiBase } } = useRuntimeConfig()
const { createLaboratory, updateLaboratory } = useLaboratoryApi()
const toast = useToast()

const { data: lab, status, refresh } = await useFetch<Laboratory>('/laboratory', {
  baseURL: apiBase
})

const isEditing = computed(() => !!lab.value?.id)
const isSubmitting = ref(false)

const form = reactive<Omit<Laboratory, 'id'>>({
  name: '',
  rtn: '',
  phone: '',
  email: '',
  address1: '',
  address2: '',
  cai1: '',
  cai1ExpirationDate: null,
  cai1RangeFrom: '',
  cai1RangeTo: '',
  cai1CurrentNumber: '',
  cai2: '',
  cai2ExpirationDate: null,
  cai2RangeFrom: '',
  cai2RangeTo: '',
  cai2CurrentNumber: ''
})

watch(lab, (val) => {
  if (!val) return
  Object.assign(form, {
    name: val.name ?? '',
    rtn: val.rtn ?? '',
    phone: val.phone ?? '',
    email: val.email ?? '',
    address1: val.address1 ?? '',
    address2: val.address2 ?? '',
    cai1: val.cai1 ?? '',
    cai1ExpirationDate: val.cai1ExpirationDate ?? null,
    cai1RangeFrom: val.cai1RangeFrom ?? '',
    cai1RangeTo: val.cai1RangeTo ?? '',
    cai1CurrentNumber: val.cai1CurrentNumber ?? '',
    cai2: val.cai2 ?? '',
    cai2ExpirationDate: val.cai2ExpirationDate ?? null,
    cai2RangeFrom: val.cai2RangeFrom ?? '',
    cai2RangeTo: val.cai2RangeTo ?? '',
    cai2CurrentNumber: val.cai2CurrentNumber ?? ''
  })
}, { immediate: true })

async function save() {
  if (!form.name.trim()) return
  isSubmitting.value = true
  try {
    const body = {
      ...form,
      cai1ExpirationDate: form.cai1ExpirationDate || null,
      cai2ExpirationDate: form.cai2ExpirationDate || null
    }
    if (isEditing.value && lab.value) {
      await updateLaboratory(lab.value.id, body)
      toast.add({ title: 'Configuración guardada', color: 'success' })
    } else {
      await createLaboratory(body)
      toast.add({ title: 'Laboratorio creado', color: 'success' })
    }
    refresh()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Error al guardar', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

const cai1Warning = computed(() => {
  if (!form.cai1) return null
  if (!form.cai1ExpirationDate) return null
  const daysLeft = Math.ceil((new Date(form.cai1ExpirationDate).getTime() - Date.now()) / 86400000)
  if (daysLeft <= 0) return 'CAI vencido'
  if (daysLeft <= 30) return `Vence en ${daysLeft} días`
  return null
})

const cai2Warning = computed(() => {
  if (!form.cai2) return null
  if (!form.cai2ExpirationDate) return null
  const daysLeft = Math.ceil((new Date(form.cai2ExpirationDate).getTime() - Date.now()) / 86400000)
  if (daysLeft <= 0) return 'CAI vencido'
  if (daysLeft <= 30) return `Vence en ${daysLeft} días`
  return null
})
</script>

<template>
  <UContainer class="py-8 max-w-3xl">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Configuración del Laboratorio
        </h1>
        <p class="text-sm text-muted mt-1">
          Datos generales, fiscales y CAI para facturación en Honduras
        </p>
      </div>
    </div>

    <div
      v-if="status === 'pending'"
      class="flex justify-center py-16"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="animate-spin text-3xl text-muted"
      />
    </div>

    <template v-else>
      <!-- Datos Generales -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-building-2" />
            <span class="font-semibold">Datos Generales</span>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            label="Nombre del Laboratorio"
            required
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.name"
              placeholder="Laboratorio Clínico XYZ"
            />
          </UFormField>

          <UFormField label="Teléfono">
            <UInput
              v-model="form.phone"
              placeholder="+504 0000-0000"
            />
          </UFormField>

          <UFormField label="Correo Electrónico">
            <UInput
              v-model="form.email"
              type="email"
              placeholder="info@laboratorio.hn"
            />
          </UFormField>

          <UFormField
            label="Dirección 1"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.address1"
              placeholder="Colonia, calle, número"
            />
          </UFormField>

          <UFormField
            label="Dirección 2"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.address2"
              placeholder="Segunda dirección (opcional)"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- Datos Fiscales -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-receipt" />
            <span class="font-semibold">Datos Fiscales</span>
          </div>
        </template>

        <UFormField label="RTN (Registro Tributario Nacional)">
          <UInput
            v-model="form.rtn"
            placeholder="0000-0000-000000"
            class="font-mono"
          />
        </UFormField>
      </UCard>

      <!-- CAI 1 -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-check" />
              <span class="font-semibold">CAI 1 — Principal</span>
            </div>
            <UBadge
              v-if="cai1Warning"
              color="warning"
              variant="subtle"
            >
              {{ cai1Warning }}
            </UBadge>
            <UBadge
              v-else-if="form.cai1"
              color="success"
              variant="subtle"
            >
              Activo
            </UBadge>
          </div>
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            label="Código CAI"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.cai1"
              placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX"
              class="font-mono"
            />
          </UFormField>

          <UFormField label="Fecha de Vencimiento">
            <UInput
              v-model="form.cai1ExpirationDate"
              type="date"
            />
          </UFormField>

          <div />

          <UFormField label="Rango Desde">
            <UInput
              v-model="form.cai1RangeFrom"
              placeholder="001-001-01-00000001"
              class="font-mono"
            />
          </UFormField>

          <UFormField label="Rango Hasta">
            <UInput
              v-model="form.cai1RangeTo"
              placeholder="001-001-01-99999999"
              class="font-mono"
            />
          </UFormField>

          <UFormField
            label="Número de Factura Actual"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.cai1CurrentNumber"
              placeholder="001-001-01-00000001"
              class="font-mono"
            />
          </UFormField>
        </div>
      </UCard>

      <!-- CAI 2 -->
      <UCard class="mb-6">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-clock" />
              <span class="font-semibold">CAI 2 — Respaldo</span>
            </div>
            <UBadge
              v-if="cai2Warning"
              color="warning"
              variant="subtle"
            >
              {{ cai2Warning }}
            </UBadge>
            <UBadge
              v-else-if="form.cai2"
              color="info"
              variant="subtle"
            >
              Disponible
            </UBadge>
          </div>
        </template>

        <p class="text-sm text-muted mb-4">
          Configura el CAI 2 como respaldo para cuando el CAI 1 esté próximo a vencer o se agote el rango de facturación.
        </p>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <UFormField
            label="Código CAI"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.cai2"
              placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX"
              class="font-mono"
            />
          </UFormField>

          <UFormField label="Fecha de Vencimiento">
            <UInput
              v-model="form.cai2ExpirationDate"
              type="date"
            />
          </UFormField>

          <div />

          <UFormField label="Rango Desde">
            <UInput
              v-model="form.cai2RangeFrom"
              placeholder="001-001-01-00000001"
              class="font-mono"
            />
          </UFormField>

          <UFormField label="Rango Hasta">
            <UInput
              v-model="form.cai2RangeTo"
              placeholder="001-001-01-99999999"
              class="font-mono"
            />
          </UFormField>

          <UFormField
            label="Número de Factura Actual"
            class="sm:col-span-2"
          >
            <UInput
              v-model="form.cai2CurrentNumber"
              placeholder="001-001-01-00000001"
              class="font-mono"
            />
          </UFormField>
        </div>
      </UCard>

      <div class="flex justify-end">
        <UButton
          size="lg"
          icon="i-lucide-save"
          :loading="isSubmitting"
          :disabled="!form.name.trim()"
          @click="save"
        >
          {{ isEditing ? 'Guardar cambios' : 'Crear configuración' }}
        </UButton>
      </div>
    </template>
  </UContainer>
</template>
