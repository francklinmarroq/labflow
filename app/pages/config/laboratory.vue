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

const form = reactive({
  name: '',
  rtn: '',
  phone: '',
  email: '',
  address1: '',
  address2: '',
  cai1: '',
  cai1ExpirationDate: '',
  cai1RangeFrom: '',
  cai1RangeTo: '',
  cai1CurrentNumber: '',
  cai2: '',
  cai2ExpirationDate: '',
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
    cai1ExpirationDate: val.cai1ExpirationDate ?? '',
    cai1RangeFrom: val.cai1RangeFrom ?? '',
    cai1RangeTo: val.cai1RangeTo ?? '',
    cai1CurrentNumber: val.cai1CurrentNumber ?? '',
    cai2: val.cai2 ?? '',
    cai2ExpirationDate: val.cai2ExpirationDate ?? '',
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
      toast.add({ title: 'Configuración guardada', icon: 'i-lucide-check-circle', color: 'success' })
    } else {
      await createLaboratory(body)
      toast.add({ title: 'Laboratorio creado', icon: 'i-lucide-check-circle', color: 'success' })
    }
    refresh()
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Error al guardar', icon: 'i-lucide-x-circle', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

function caiDaysLeft(expirationDate: string) {
  if (!expirationDate) return null
  return Math.ceil((new Date(expirationDate).getTime() - Date.now()) / 86400000)
}

const cai1Status = computed(() => {
  if (!form.cai1) return null
  const days = caiDaysLeft(form.cai1ExpirationDate)
  if (days === null) return { label: 'Activo', color: 'success' as const, icon: 'i-lucide-shield-check' }
  if (days <= 0) return { label: 'Vencido', color: 'error' as const, icon: 'i-lucide-shield-x' }
  if (days <= 30) return { label: `Vence en ${days} días`, color: 'warning' as const, icon: 'i-lucide-shield-alert' }
  return { label: `Válido · ${days} días`, color: 'success' as const, icon: 'i-lucide-shield-check' }
})

const cai2Status = computed(() => {
  if (!form.cai2) return null
  const days = caiDaysLeft(form.cai2ExpirationDate)
  if (days === null) return { label: 'Disponible', color: 'info' as const, icon: 'i-lucide-shield-check' }
  if (days <= 0) return { label: 'Vencido', color: 'error' as const, icon: 'i-lucide-shield-x' }
  if (days <= 30) return { label: `Vence en ${days} días`, color: 'warning' as const, icon: 'i-lucide-shield-alert' }
  return { label: `Disponible · ${days} días`, color: 'info' as const, icon: 'i-lucide-shield-check' }
})

const cai1Warning = computed(() => {
  if (!form.cai1 || !form.cai1ExpirationDate) return null
  const days = caiDaysLeft(form.cai1ExpirationDate)!
  if (days <= 0) return 'El CAI 1 está vencido. Renuévelo ante el SAR o active el CAI 2.'
  if (days <= 30) return `El CAI 1 vence en ${days} días. Considere tramitar un nuevo CAI.`
  return null
})

const cai2Warning = computed(() => {
  if (!form.cai2 || !form.cai2ExpirationDate) return null
  const days = caiDaysLeft(form.cai2ExpirationDate)!
  if (days <= 0) return 'El CAI 2 está vencido. Actualícelo ante el SAR.'
  if (days <= 30) return `El CAI 2 vence en ${days} días.`
  return null
})

const tabs = [
  { label: 'General', icon: 'i-lucide-building-2', slot: 'general' as const },
  { label: 'Datos Fiscales', icon: 'i-lucide-receipt', slot: 'fiscal' as const },
  { label: 'CAI Principal', icon: 'i-lucide-file-check', slot: 'cai1' as const },
  { label: 'CAI Respaldo', icon: 'i-lucide-file-clock', slot: 'cai2' as const }
]
</script>

<template>
  <UContainer class="py-8 max-w-3xl">
    <!-- Loading -->
    <div
      v-if="status === 'pending'"
      class="flex flex-col items-center justify-center py-24 gap-3"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="animate-spin text-4xl text-muted"
      />
      <p class="text-sm text-muted">
        Cargando configuración…
      </p>
    </div>

    <template v-else>
      <!-- Page header -->
      <div class="mb-8">
        <div class="flex items-start gap-4">
          <div class="shrink-0 size-14 rounded-2xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center">
            <UIcon
              name="i-lucide-flask-conical"
              class="text-2xl text-primary"
            />
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h1 class="text-2xl font-bold text-highlighted truncate">
                  {{ form.name || 'Configuración del Laboratorio' }}
                </h1>
                <p class="text-sm text-muted mt-0.5">
                  Datos generales, fiscales y CAI · Honduras
                </p>
              </div>
              <UButton
                size="md"
                icon="i-lucide-save"
                :loading="isSubmitting"
                :disabled="!form.name.trim()"
                class="shrink-0"
                @click="save"
              >
                {{ isEditing ? 'Guardar' : 'Crear' }}
              </UButton>
            </div>

            <!-- CAI status pills -->
            <div
              v-if="cai1Status || cai2Status"
              class="flex flex-wrap items-center gap-2 mt-3"
            >
              <div
                v-if="cai1Status"
                class="flex items-center gap-1.5"
              >
                <span class="text-xs text-muted font-medium">CAI 1</span>
                <UBadge
                  :color="cai1Status.color"
                  :icon="cai1Status.icon"
                  variant="subtle"
                  size="sm"
                >
                  {{ cai1Status.label }}
                </UBadge>
              </div>
              <USeparator
                v-if="cai1Status && cai2Status"
                orientation="vertical"
                class="h-4"
              />
              <div
                v-if="cai2Status"
                class="flex items-center gap-1.5"
              >
                <span class="text-xs text-muted font-medium">CAI 2</span>
                <UBadge
                  :color="cai2Status.color"
                  :icon="cai2Status.icon"
                  variant="subtle"
                  size="sm"
                >
                  {{ cai2Status.label }}
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabbed sections -->
      <UTabs
        :items="tabs"
        variant="link"
        class="w-full"
      >
        <!-- General -->
        <template #general>
          <UCard class="mt-4">
            <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <UFormField
                label="Nombre del Laboratorio"
                required
                class="sm:col-span-2"
              >
                <UInput
                  v-model="form.name"
                  placeholder="Laboratorio Clínico XYZ"
                  leading-icon="i-lucide-building-2"
                />
              </UFormField>

              <UFormField label="Teléfono">
                <UInput
                  v-model="form.phone"
                  placeholder="+504 0000-0000"
                  leading-icon="i-lucide-phone"
                />
              </UFormField>

              <UFormField label="Correo Electrónico">
                <UInput
                  v-model="form.email"
                  type="email"
                  placeholder="info@laboratorio.hn"
                  leading-icon="i-lucide-mail"
                />
              </UFormField>

              <UFormField
                label="Dirección"
                class="sm:col-span-2"
              >
                <UInput
                  v-model="form.address1"
                  placeholder="Colonia, calle, número"
                  leading-icon="i-lucide-map-pin"
                />
              </UFormField>

              <UFormField
                label="Dirección 2"
                hint="Opcional"
                class="sm:col-span-2"
              >
                <UInput
                  v-model="form.address2"
                  placeholder="Segunda dirección"
                  leading-icon="i-lucide-map-pin"
                />
              </UFormField>
            </div>
          </UCard>
        </template>

        <!-- Fiscal -->
        <template #fiscal>
          <UCard class="mt-4">
            <div class="space-y-5">
              <UAlert
                icon="i-lucide-info"
                color="info"
                variant="soft"
                title="Registro Tributario Nacional"
                description="El RTN debe coincidir exactamente con el registro ante el SAR y se imprimirá en todas las facturas fiscales emitidas."
              />

              <UFormField
                label="RTN"
                description="Formato: 0000-0000-000000"
              >
                <UInput
                  v-model="form.rtn"
                  placeholder="0000-0000-000000"
                  leading-icon="i-lucide-hash"
                  class="font-mono"
                />
              </UFormField>
            </div>
          </UCard>
        </template>

        <!-- CAI 1 -->
        <template #cai1>
          <UCard class="mt-4">
            <div class="space-y-5">
              <UAlert
                v-if="cai1Warning"
                icon="i-lucide-triangle-alert"
                :color="caiDaysLeft(form.cai1ExpirationDate)! <= 0 ? 'error' : 'warning'"
                variant="soft"
                title="Atención requerida"
                :description="cai1Warning"
              />

              <UAlert
                v-else-if="!form.cai1"
                icon="i-lucide-file-plus"
                color="neutral"
                variant="soft"
                title="CAI no configurado"
                description="Ingrese el código CAI emitido por el SAR para habilitar la facturación fiscal."
              />

              <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <UFormField
                  label="Código CAI"
                  class="sm:col-span-2"
                >
                  <UInput
                    v-model="form.cai1"
                    placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX"
                    leading-icon="i-lucide-key"
                    class="font-mono"
                  />
                </UFormField>

                <UFormField label="Fecha de Vencimiento">
                  <UInput
                    v-model="form.cai1ExpirationDate"
                    type="date"
                    leading-icon="i-lucide-calendar"
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
                  description="Correlativo en uso actualmente"
                  class="sm:col-span-2"
                >
                  <UInput
                    v-model="form.cai1CurrentNumber"
                    placeholder="001-001-01-00000001"
                    leading-icon="i-lucide-file-text"
                    class="font-mono"
                  />
                </UFormField>
              </div>
            </div>
          </UCard>
        </template>

        <!-- CAI 2 -->
        <template #cai2>
          <UCard class="mt-4">
            <div class="space-y-5">
              <UAlert
                v-if="cai2Warning"
                icon="i-lucide-triangle-alert"
                :color="caiDaysLeft(form.cai2ExpirationDate)! <= 0 ? 'error' : 'warning'"
                variant="soft"
                title="Atención requerida"
                :description="cai2Warning"
              />

              <UAlert
                icon="i-lucide-shield"
                color="neutral"
                variant="soft"
                title="CAI de respaldo"
                description="Se activa automáticamente cuando el CAI principal está próximo a vencer o agota su rango de facturación."
              />

              <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <UFormField
                  label="Código CAI"
                  class="sm:col-span-2"
                >
                  <UInput
                    v-model="form.cai2"
                    placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-XX"
                    leading-icon="i-lucide-key"
                    class="font-mono"
                  />
                </UFormField>

                <UFormField label="Fecha de Vencimiento">
                  <UInput
                    v-model="form.cai2ExpirationDate"
                    type="date"
                    leading-icon="i-lucide-calendar"
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
                  description="Correlativo en uso actualmente"
                  class="sm:col-span-2"
                >
                  <UInput
                    v-model="form.cai2CurrentNumber"
                    placeholder="001-001-01-00000001"
                    leading-icon="i-lucide-file-text"
                    class="font-mono"
                  />
                </UFormField>
              </div>
            </div>
          </UCard>
        </template>
      </UTabs>
    </template>
  </UContainer>
</template>
