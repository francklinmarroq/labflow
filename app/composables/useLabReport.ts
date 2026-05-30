import type { Laboratory } from './useLaboratoryApi'
import type { Patient } from './usePatientsApi'
import type { LabOrder } from './useLabOrdersApi'
import type { TestRun } from './useTestRunsApi'
import type { Parameter } from './useParametersApi'
import type { ReferenceRange } from './useReferenceRangesApi'

export type PrintFormat = 'A4' | 'A5'

export interface ExamReportData {
  lab: Laboratory
  patient: Patient
  order: LabOrder
  testName: string
  testConfigName: string | null
  run: TestRun
  paramMap: Record<string, Parameter>
  unitMap: Record<string, string>
  referenceRanges: Record<number, ReferenceRange[]>
  format?: PrintFormat
}

function fmtDate(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString('es-HN')
}

function fmtDateTime(raw: string | null): string {
  if (!raw) return '—'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? raw : d.toLocaleString('es-HN')
}

function fmtAge(ageInDays: number | null): string {
  if (ageInDays == null) return '—'
  const years = Math.floor(ageInDays / 365)
  const months = Math.floor((ageInDays % 365) / 30)
  if (years >= 2) return `${years} años`
  if (years === 1) return months > 0 ? `1 año ${months} meses` : '1 año'
  return months > 0 ? `${months} meses` : `${ageInDays} días`
}

function getFlag(value: string | null, ranges: ReferenceRange[]): string {
  if (!value || !ranges.length) return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  const r = ranges[0]
  if (r.criticalLow != null && num < r.criticalLow) return 'CC'
  if (r.criticalHigh != null && num > r.criticalHigh) return 'CC'
  if (r.lowerLimit != null && num < r.lowerLimit) return 'L'
  if (r.upperLimit != null && num > r.upperLimit) return 'H'
  return ''
}

function flagColor(flag: string): string {
  if (flag === 'CC') return '#dc2626'
  if (flag === 'H' || flag === 'L') return '#d97706'
  return ''
}

function refText(ranges: ReferenceRange[], unit: string): string {
  if (!ranges.length) return '—'
  const r = ranges[0]
  if (r.interpretationText) return r.interpretationText
  const u = unit ? ` ${unit}` : ''
  if (r.lowerLimit != null && r.upperLimit != null) return `${r.lowerLimit} – ${r.upperLimit}${u}`
  if (r.lowerLimit != null) return `≥ ${r.lowerLimit}${u}`
  if (r.upperLimit != null) return `≤ ${r.upperLimit}${u}`
  return '—'
}

function buildHtml(data: ExamReportData): string {
  const { lab, patient, order, testName, testConfigName, run, paramMap, unitMap, referenceRanges, format = 'A4' } = data
  const isA5 = format === 'A5'
  const sz = (a4: string, a5: string) => (isA5 ? a5 : a4)

  const rows = run.results.map((result) => {
    const param = paramMap[result.parameterId]
    const paramName = param?.name ?? `#${result.parameterId}`
    const unit = param?.unitId != null ? (unitMap[param.unitId] ?? '') : ''
    const ranges = referenceRanges[result.parameterId] ?? []
    const flag = getFlag(result.value, ranges)
    const fc = flagColor(flag)
    const ref = refText(ranges, unit)
    const valStyle = fc ? `color:${fc};font-weight:700` : 'font-weight:700'

    return `<tr>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb">${paramName}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;${valStyle}">${result.value ?? '—'}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280">${unit}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:12px">${ref}</td>
      <td style="padding:7px 12px;border-bottom:1px solid #e5e7eb;color:${fc || '#9ca3af'};font-weight:700;font-size:12px">${flag}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${testName} — ${patient.name}</title>
  <style>
    @page { size: ${format}; margin: 15mm 15mm 20mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: ${sz('13px', '11px')};
      color: #1f2937;
      background: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 12px;
      border-bottom: 2.5px solid #0ea5e9;
      margin-bottom: 14px;
    }
    .lab-name {
      font-size: ${sz('22px', '18px')};
      font-weight: 800;
      color: #0ea5e9;
    }
    .lab-meta { color: #6b7280; font-size: ${sz('11px', '10px')}; margin-top: 4px; }
    .lab-meta span { display: block; }
    .rpt-label { text-align: right; font-size: ${sz('11px', '10px')}; color: #6b7280; }
    .rpt-label .title { font-size: ${sz('15px', '13px')}; font-weight: 700; color: #1f2937; display: block; margin-bottom: 2px; }
    .section { margin-bottom: 12px; }
    .section-title {
      font-size: ${sz('10px', '9px')};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #9ca3af;
      margin-bottom: 6px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .info-item .lbl { font-size: ${sz('10px', '9px')}; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    .info-item .val { font-size: ${sz('13px', '11px')}; font-weight: 600; color: #1f2937; margin-top: 1px; }
    .exam-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }
    .exam-name { font-size: ${sz('16px', '14px')}; font-weight: 800; color: #1e40af; }
    .exam-sub { font-size: ${sz('11px', '10px')}; color: #6b7280; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f3f4f6; }
    th {
      padding: 8px 12px;
      text-align: left;
      font-size: ${sz('10px', '9px')};
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6b7280;
    }
    td { font-size: ${sz('13px', '11px')}; }
    .legend {
      margin-top: 8px;
      font-size: ${sz('10px', '9px')};
      color: #9ca3af;
      display: flex;
      gap: 14px;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: ${sz('10px', '9px')};
      color: #9ca3af;
    }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="lab-name">${lab.name}</div>
      <div class="lab-meta">
        ${lab.address1 ? `<span>${lab.address1}${lab.address2 ? ', ' + lab.address2 : ''}</span>` : ''}
        ${lab.phone ? `<span>Tel: ${lab.phone}</span>` : ''}
        ${lab.email ? `<span>${lab.email}</span>` : ''}
        ${lab.rtn ? `<span>RTN: ${lab.rtn}</span>` : ''}
      </div>
    </div>
    <div class="rpt-label">
      <span class="title">Reporte de Laboratorio</span>
      <span>Orden #${order.id}</span>
      <span>Fecha solicitud: ${fmtDate(order.requestedAt)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Paciente</div>
    <div class="info-grid">
      <div class="info-item"><div class="lbl">Nombre</div><div class="val">${patient.name}</div></div>
      <div class="info-item"><div class="lbl">Edad</div><div class="val">${fmtAge(patient.ageInDays)}</div></div>
      <div class="info-item"><div class="lbl">No. Identidad</div><div class="val">${patient.nationalIdNumber ?? '—'}</div></div>
    </div>
  </div>

  <div class="exam-box">
    <div class="exam-name">${testName}</div>
    ${testConfigName ? `<div class="exam-sub">Perfil: ${testConfigName}</div>` : ''}
    <div class="exam-sub" style="margin-top:6px">
      Corrida #${run.runNumber ?? '—'} &nbsp;·&nbsp; ${fmtDateTime(run.performedAt)}
      ${run.isVerified ? '&nbsp;·&nbsp; <strong style="color:#059669">✓ Verificado</strong>' : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Resultados</div>
    <table>
      <thead>
        <tr>
          <th>Parámetro</th>
          <th>Resultado</th>
          <th>Unidad</th>
          <th>Valores de Referencia</th>
          <th>Flag</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="legend">
      <span><strong style="color:#d97706">H</strong> = Alto</span>
      <span><strong style="color:#d97706">L</strong> = Bajo</span>
      <span><strong style="color:#dc2626">CC</strong> = Valor Crítico</span>
    </div>
  </div>

  <div class="footer">
    <span>Impreso el ${fmtDateTime(new Date().toISOString())}</span>
    <span>${lab.name} · LabFlow</span>
  </div>
</body>
</html>`
}

export function useLabReport() {
  const { public: { apiBase } } = useRuntimeConfig()

  const fetchReferenceRanges = async (parameterIds: number[]): Promise<Record<number, ReferenceRange[]>> => {
    const result: Record<number, ReferenceRange[]> = {}
    await Promise.all(
      parameterIds.map(async (pid) => {
        try {
          const data = await $fetch<{ content: ReferenceRange[] }>(`/parameters/${pid}/reference-ranges`, {
            baseURL: apiBase,
            params: { pageSize: 50 }
          })
          result[pid] = data.content ?? []
        } catch {
          result[pid] = []
        }
      })
    )
    return result
  }

  const printExamReport = (data: ExamReportData) => {
    const html = buildHtml(data)
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 600)
  }

  return { fetchReferenceRanges, printExamReport }
}
