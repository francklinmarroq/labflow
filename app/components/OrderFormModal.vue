<script setup lang="ts">
import type { LabOrder, OrderLabTest, OrderStatus } from '~/composables/useLabOrdersApi'
import type { Patient } from '~/composables/usePatientsApi'
import type { LabTest } from '~/composables/useTestsApi'
import type { Laboratory } from '~/composables/useLaboratoryApi'

const props = defineProps<{
  open: boolean
  isEditing: boolean
  order: LabOrder | null
  patients: Patient[]
  tests: LabTest[]
  preselectedPatientId?: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { createOrder, updateOrder, getOrderTests, addTestToOrder, removeTestFromOrder } = useLabOrdersApi()
const { getLaboratory } = useLaboratoryApi()
const toast = useToast()

const localPatients = ref<Patient[]>([])
const allPatients = computed(() => [...props.patients, ...localPatients.value])
const patientMap = computed(() =>
  Object.fromEntries(allPatients.value.map(p => [p.id, p.name]))
)

const patientSearch = ref('')
const testSearch = ref('')
const isSubmitting = ref(false)
const isPrinting = ref(false)
const existingLabTests = ref<OrderLabTest[]>([])
const lab = ref<Laboratory | null>(null)

const form = reactive({
  customerId: null as number | null,
  notes: '',
  status: 'PENDING' as OrderStatus,
  testIds: [] as number[]
})

const filteredPatients = computed(() => {
  const q = patientSearch.value.trim().toLowerCase()
  if (!q) return allPatients.value
  return allPatients.value.filter((p: Patient) =>
    p.name.toLowerCase().includes(q)
    || (p.nationalIdNumber?.toLowerCase().includes(q) ?? false)
  )
})

const filteredTests = computed(() => {
  const q = testSearch.value.trim().toLowerCase()
  if (!q) return props.tests
  return props.tests.filter((t: LabTest) => t.name.toLowerCase().includes(q))
})

const selectedTests = computed(() =>
  props.tests.filter(t => form.testIds.includes(t.id))
)

const selectedPatient = computed(() =>
  form.customerId ? allPatients.value.find(p => p.id === form.customerId) ?? null : null
)

const subtotal = computed(() =>
  selectedTests.value.reduce((sum, t) => sum + (t.price ?? 0), 0)
)

const formattedSubtotal = computed(() => fmtMoney(subtotal.value))

const statusOptions = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Delivered', value: 'DELIVERED' }
]

function fmtMoney(value: number): string {
  return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(value)
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function toggleTest(id: number) {
  const idx = form.testIds.indexOf(id)
  if (idx === -1) form.testIds.push(id)
  else form.testIds.splice(idx, 1)
}

function isTestSelected(id: number) {
  return form.testIds.includes(id)
}

function resetForm() {
  patientSearch.value = ''
  testSearch.value = ''
  form.customerId = null
  form.notes = ''
  form.status = 'PENDING'
  form.testIds = []
  existingLabTests.value = []
  localPatients.value = []
}

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  resetForm()
  if (props.preselectedPatientId) {
    form.customerId = props.preselectedPatientId
  }
  if (props.isEditing && props.order) {
    form.customerId = props.order.customerId
    form.notes = props.order.notes ?? ''
    form.status = props.order.status ?? 'PENDING'
    try {
      const tests = await getOrderTests(props.order.id)
      existingLabTests.value = tests
      form.testIds = tests.map(t => t.testId)
    } catch {
      // non-critical
    }
  }
  if (!lab.value) {
    try { lab.value = await getLaboratory() } catch { /* no lab configured */ }
  }
})

async function save() {
  if (!form.customerId) return
  isSubmitting.value = true
  try {
    if (props.isEditing && props.order) {
      await updateOrder(props.order.id, {
        customerId: form.customerId,
        notes: form.notes.trim() || null,
        status: form.status
      })
      const toAdd = form.testIds.filter(tid => !existingLabTests.value.find(lt => lt.testId === tid))
      const toRemove = existingLabTests.value.filter(lt => !form.testIds.includes(lt.testId))
      await Promise.all([
        ...toAdd.map(tid => addTestToOrder(props.order!.id, tid)),
        ...toRemove.map(lt => removeTestFromOrder(props.order!.id, lt.id))
      ])
      toast.add({ title: 'Orden actualizada', color: 'success' })
    } else {
      const order = await createOrder({
        customerId: form.customerId,
        notes: form.notes.trim() || null
      })
      await Promise.all(form.testIds.map(tid => addTestToOrder(order.id, tid)))
      toast.add({ title: 'Orden creada', color: 'success' })
    }
    emit('update:open', false)
    emit('saved')
  } catch (error: unknown) {
    const e = error as { data?: { message?: string }, message?: string }
    toast.add({ title: e?.data?.message ?? e?.message ?? 'Something went wrong', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}

function buildQuotationHtml(): string {
  const labName = lab.value?.name ?? 'Laboratorio Clínico'
  const labAddress = [lab.value?.address1, lab.value?.address2].filter(Boolean).join(', ')
  const labPhone = lab.value?.phone ?? ''
  const labEmail = lab.value?.email ?? ''
  const patient = selectedPatient.value
  const today = fmtDate(new Date())
  const quotationId = props.isEditing && props.order ? `#${String(props.order.id).padStart(5, '0')}` : 'BORRADOR'

  const rows = selectedTests.value.map(t => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1f2937">${t.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1f2937;text-align:right;white-space:nowrap">${t.price != null ? fmtMoney(t.price) : '—'}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotización ${quotationId} — ${labName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', Arial, sans-serif; background: #fff; color: #111827; padding: 40px; max-width: 700px; margin: 0 auto; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
    @page { margin: 20mm; }
  }
</style>
</head>
<body>

<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #0f766e">
  <div>
    <div style="font-size:22px;font-weight:700;color:#0f766e;letter-spacing:-0.5px">${labName}</div>
    ${labAddress ? `<div style="font-size:12px;color:#6b7280;margin-top:4px">${labAddress}</div>` : ''}
    ${labPhone ? `<div style="font-size:12px;color:#6b7280">Tel: ${labPhone}</div>` : ''}
    ${labEmail ? `<div style="font-size:12px;color:#6b7280">${labEmail}</div>` : ''}
  </div>
  <div style="text-align:right">
    <div style="font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#6b7280">Cotización</div>
    <div style="font-size:26px;font-weight:700;color:#111827;margin-top:2px">${quotationId}</div>
    <div style="font-size:12px;color:#6b7280;margin-top:4px">${today}</div>
  </div>
</div>

<div style="margin-bottom:32px">
  <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:8px">Paciente</div>
  ${patient
    ? `<div style="font-size:15px;font-weight:600;color:#111827">${patient.name}</div>
       ${patient.nationalIdNumber ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">DNI: ${patient.nationalIdNumber}</div>` : ''}`
    : `<div style="font-size:13px;color:#9ca3af;font-style:italic">No especificado</div>`
  }
</div>

<div style="margin-bottom:32px">
  <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:12px">Exámenes de laboratorio</div>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Examen</th>
        <th style="padding:10px 16px;text-align:right;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb">Precio</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="2" style="padding:20px 16px;text-align:center;color:#9ca3af;font-size:13px;font-style:italic">Ningún examen seleccionado</td></tr>`}
    </tbody>
  </table>
</div>

<div style="display:flex;justify-content:flex-end;margin-bottom:40px">
  <div style="min-width:240px">
    <div style="display:flex;justify-content:space-between;padding:14px 16px;background:#0f766e;border-radius:8px">
      <span style="font-size:14px;font-weight:600;color:#fff">Total a pagar</span>
      <span style="font-size:16px;font-weight:700;color:#fff">${fmtMoney(subtotal.value)}</span>
    </div>
  </div>
</div>

${form.notes ? `
<div style="margin-bottom:32px;padding:16px;background:#f9fafb;border-radius:8px;border-left:3px solid #0f766e">
  <div style="font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;margin-bottom:6px">Notas</div>
  <div style="font-size:13px;color:#374151">${form.notes}</div>
</div>` : ''}

<div style="margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:flex-end">
  <div style="font-size:11px;color:#9ca3af">
    Esta cotización es válida por 30 días a partir de la fecha de emisión.<br>
    Los precios pueden estar sujetos a cambios sin previo aviso.
  </div>
  <div style="text-align:center">
    <div style="width:200px;border-top:1px solid #9ca3af;padding-top:6px">
      <div style="font-size:11px;color:#6b7280">Firma autorizada</div>
    </div>
  </div>
</div>

<div style="margin-top:32px;text-align:center;font-size:10px;color:#d1d5db">
  ${labName} · LabFlow — Software para laboratorios
</div>

<div class="no-print" style="margin-top:32px;text-align:center">
  <button onclick="window.print()" style="padding:10px 28px;background:#0f766e;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
    Imprimir
  </button>
</div>

</body>
</html>`
}

function printQuotation() {
  isPrinting.value = true
  try {
    const html = buildQuotationHtml()
    const win = window.open('', '_blank', 'width=800,height=700')
    if (!win) {
      toast.add({ title: 'No se pudo abrir la ventana de impresión', color: 'error' })
      return
    }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
  } finally {
    isPrinting.value = false
  }
}

// --- Inline patient creation ---
const patientModalOpen = ref(false)

function onPatientCreated(patient: Patient) {
  localPatients.value.push(patient)
  form.customerId = patient.id
  patientSearch.value = ''
}
</script>

<template>
  <UModal
    :open="open"
    :ui="{ content: 'max-w-5xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div class="flex items-center gap-3 px-1">
        <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
          <UIcon name="i-lucide-file-text" class="text-primary" size="16" />
        </div>
        <div>
          <h2 class="text-base font-semibold text-highlighted leading-tight">
            {{ isEditing ? 'Editar orden' : 'Nueva orden' }}
          </h2>
          <p class="text-xs text-muted leading-tight mt-0.5">
            {{ isEditing ? 'Modifica los detalles de la orden' : 'Completa el formulario para generar una cotización' }}
          </p>
        </div>
      </div>
    </template>

    <template #body>
      <div class="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-0 min-h-[520px]">

        <!-- ── LEFT: Form ── -->
        <div class="flex flex-col gap-5 pr-0 md:pr-6 md:border-r border-default">

          <!-- Patient selector -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-default">
                Paciente <span class="text-error">*</span>
              </span>
              <button
                v-if="selectedPatient"
                type="button"
                class="text-xs text-muted hover:text-default transition-colors"
                @click="form.customerId = null; patientSearch = ''"
              >
                Cambiar
              </button>
            </div>

            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 translate-y-0"
              leave-to-class="opacity-0 -translate-y-1"
              mode="out-in"
            >
              <!-- Selected state -->
              <div
                v-if="selectedPatient"
                class="flex items-center gap-3 p-3 rounded-lg bg-primary/5 ring-1 ring-primary/20"
              >
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                  <UIcon name="i-lucide-user" class="text-primary" size="14" />
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-highlighted truncate">{{ selectedPatient.name }}</p>
                  <p v-if="selectedPatient.nationalIdNumber" class="text-xs text-muted">
                    DNI: {{ selectedPatient.nationalIdNumber }}
                  </p>
                </div>
                <UIcon name="i-lucide-check-circle-2" class="text-primary flex-shrink-0" size="16" />
              </div>

              <!-- Search state -->
              <div v-else>
                <UInput
                  v-model="patientSearch"
                  icon="i-lucide-search"
                  placeholder="Buscar por nombre o número de identidad…"
                  size="sm"
                  class="mb-2"
                />
                <div class="rounded-lg ring-1 ring-default overflow-y-auto max-h-44">
                  <button
                    v-for="patient in filteredPatients"
                    :key="patient.id"
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0"
                    @click="form.customerId = patient.id"
                  >
                    <div class="flex-shrink-0 w-6 h-6 rounded-full bg-muted/30 flex items-center justify-center">
                      <UIcon name="i-lucide-user" class="text-muted" size="12" />
                    </div>
                    <span class="flex-1 truncate text-default font-medium">{{ patient.name }}</span>
                    <span v-if="patient.nationalIdNumber" class="text-xs text-muted flex-shrink-0">
                      {{ patient.nationalIdNumber }}
                    </span>
                  </button>

                  <button
                    v-if="!filteredPatients.length && patientSearch"
                    type="button"
                    class="w-full flex items-center gap-2 px-3 py-3 text-sm text-left transition-colors hover:bg-elevated"
                    @click="patientModalOpen = true"
                  >
                    <UIcon name="i-lucide-user-plus" class="text-primary flex-shrink-0" size="16" />
                    <span class="text-primary font-medium">Crear "{{ patientSearch }}"</span>
                  </button>
                  <p v-if="!filteredPatients.length && !patientSearch" class="text-xs text-muted text-center py-4">
                    No hay pacientes registrados
                  </p>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Status (edit only) -->
          <UFormField v-if="isEditing" label="Estado">
            <USelect
              v-model="form.status"
              :items="statusOptions"
              value-key="value"
              label-key="label"
            />
          </UFormField>

          <!-- Notes -->
          <UFormField label="Notas">
            <UTextarea
              v-model="form.notes"
              placeholder="Observaciones opcionales…"
              :rows="2"
            />
          </UFormField>

          <!-- Tests -->
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-default">Exámenes</span>
              <div class="flex items-center gap-2">
                <span v-if="form.testIds.length" class="text-xs text-muted">
                  {{ form.testIds.length }} seleccionado{{ form.testIds.length !== 1 ? 's' : '' }}
                </span>
                <UButton
                  v-if="form.testIds.length > 0"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="form.testIds = []"
                >
                  Limpiar
                </UButton>
              </div>
            </div>
            <UInput
              v-model="testSearch"
              icon="i-lucide-search"
              placeholder="Buscar examen…"
              size="sm"
              class="mb-2"
            />
            <div class="rounded-lg ring-1 ring-default overflow-y-auto max-h-52">
              <button
                v-for="test in filteredTests"
                :key="test.id"
                type="button"
                class="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-elevated border-b border-default last:border-0 group"
                :class="isTestSelected(test.id) ? 'bg-primary/3' : ''"
                @click="toggleTest(test.id)"
              >
                <div
                  class="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all"
                  :class="isTestSelected(test.id) ? 'bg-primary border-primary' : 'border-default group-hover:border-primary/50'"
                >
                  <UIcon
                    v-if="isTestSelected(test.id)"
                    name="i-lucide-check"
                    class="text-white"
                    size="10"
                  />
                </div>
                <span class="flex-1 truncate text-default">{{ test.name }}</span>
                <span
                  v-if="test.price != null"
                  class="text-xs font-medium flex-shrink-0 transition-colors"
                  :class="isTestSelected(test.id) ? 'text-primary' : 'text-muted'"
                >
                  {{ fmtMoney(test.price) }}
                </span>
                <span v-else class="text-xs text-muted flex-shrink-0">—</span>
              </button>
              <p v-if="!filteredTests.length" class="text-xs text-muted text-center py-4">
                No se encontraron exámenes
              </p>
            </div>
          </div>
        </div>

        <!-- ── RIGHT: Live quotation preview ── -->
        <div class="hidden md:flex flex-col pl-6">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-xs font-semibold tracking-widest uppercase text-muted">Vista previa</p>
              <p class="text-sm font-semibold text-highlighted mt-0.5">Cotización</p>
            </div>
            <UButton
              size="xs"
              color="neutral"
              variant="soft"
              icon="i-lucide-printer"
              :loading="isPrinting"
              :disabled="!form.customerId && form.testIds.length === 0"
              @click="printQuotation"
            >
              Imprimir
            </UButton>
          </div>

          <!-- Document preview -->
          <div class="flex-1 rounded-xl border border-default bg-elevated/40 overflow-hidden flex flex-col">

            <!-- Doc header bar -->
            <div class="px-5 py-4 border-b border-default bg-elevated/60">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-xs font-bold text-highlighted leading-tight truncate max-w-[160px]">
                    {{ lab?.name ?? 'Laboratorio Clínico' }}
                  </p>
                  <p v-if="lab?.address1" class="text-[10px] text-muted mt-0.5 leading-tight">
                    {{ lab.address1 }}
                  </p>
                </div>
                <div class="text-right flex-shrink-0">
                  <p class="text-[9px] uppercase tracking-widest font-semibold text-muted">Cotización</p>
                  <p class="text-xs font-bold text-highlighted">
                    {{ isEditing && order ? `#${String(order.id).padStart(5, '0')}` : 'BORRADOR' }}
                  </p>
                  <p class="text-[10px] text-muted">{{ fmtDate(new Date()) }}</p>
                </div>
              </div>
            </div>

            <!-- Patient -->
            <div class="px-5 py-3 border-b border-default">
              <p class="text-[9px] uppercase tracking-widest font-semibold text-muted mb-1">Paciente</p>
              <Transition
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 translate-x-2"
                enter-to-class="opacity-100 translate-x-0"
              >
                <div v-if="selectedPatient" :key="selectedPatient.id">
                  <p class="text-sm font-semibold text-highlighted leading-tight">{{ selectedPatient.name }}</p>
                  <p v-if="selectedPatient.nationalIdNumber" class="text-[10px] text-muted mt-0.5">
                    DNI: {{ selectedPatient.nationalIdNumber }}
                  </p>
                </div>
                <p v-else class="text-xs text-muted italic">Sin paciente seleccionado</p>
              </Transition>
            </div>

            <!-- Tests list -->
            <div class="flex-1 overflow-y-auto">
              <div class="px-5 py-3">
                <div class="flex items-center justify-between mb-2">
                  <p class="text-[9px] uppercase tracking-widest font-semibold text-muted">Examen</p>
                  <p class="text-[9px] uppercase tracking-widest font-semibold text-muted">Precio</p>
                </div>

                <TransitionGroup
                  tag="div"
                  enter-active-class="transition-all duration-200 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition-all duration-150 ease-in absolute w-full"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                  class="relative space-y-1"
                >
                  <div
                    v-for="test in selectedTests"
                    :key="test.id"
                    class="flex items-center justify-between gap-2 py-1.5 border-b border-default/50 last:border-0"
                  >
                    <span class="text-xs text-default flex-1 min-w-0 truncate leading-tight">{{ test.name }}</span>
                    <span class="text-xs font-semibold text-highlighted flex-shrink-0 tabular-nums">
                      {{ test.price != null ? fmtMoney(test.price) : '—' }}
                    </span>
                  </div>
                </TransitionGroup>

                <p v-if="selectedTests.length === 0" class="text-xs text-muted italic text-center py-6">
                  Selecciona exámenes para ver el detalle
                </p>
              </div>
            </div>

            <!-- Total -->
            <div class="px-5 py-4 bg-primary border-t border-primary/30 rounded-b-xl">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-primary-inverted/80 uppercase tracking-wider">Total a pagar</span>
                <Transition
                  enter-active-class="transition-all duration-300 ease-out"
                  enter-from-class="opacity-0 scale-95"
                  enter-to-class="opacity-100 scale-100"
                  mode="out-in"
                >
                  <span
                    :key="formattedSubtotal"
                    class="text-lg font-bold text-primary-inverted tabular-nums"
                  >
                    {{ formattedSubtotal }}
                  </span>
                </Transition>
              </div>
              <p v-if="selectedTests.length > 0" class="text-[10px] text-primary-inverted/60 mt-1">
                {{ selectedTests.length }} examen{{ selectedTests.length !== 1 ? 'es' : '' }} incluido{{ selectedTests.length !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full">
        <!-- Mobile total -->
        <div class="flex md:hidden items-center gap-2">
          <span class="text-sm text-muted">Total:</span>
          <span class="text-sm font-bold text-highlighted tabular-nums">{{ formattedSubtotal }}</span>
        </div>
        <div class="hidden md:block" />

        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-printer"
            class="hidden md:flex"
            :loading="isPrinting"
            :disabled="!form.customerId && form.testIds.length === 0"
            @click="printQuotation"
          >
            Imprimir cotización
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            @click="emit('update:open', false)"
          >
            Cancelar
          </UButton>
          <UButton
            :loading="isSubmitting"
            :disabled="!form.customerId"
            icon="i-lucide-save"
            @click="save"
          >
            {{ isEditing ? 'Guardar cambios' : 'Crear orden' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>

  <PatientFormModal
    v-model:open="patientModalOpen"
    :is-editing="false"
    :patient="null"
    @saved="onPatientCreated"
  />
</template>
