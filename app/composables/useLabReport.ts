import type { Laboratory } from './useLaboratoryApi'
import type { Patient } from './usePatientsApi'
import type { LabOrder } from './useLabOrdersApi'
import type { TestRun } from './useTestRunsApi'
import type { Parameter } from './useParametersApi'
import type { ReferenceRange } from './useReferenceRangesApi'
import type { AgeRange } from './useAgeRangesApi'

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
  ageRanges: AgeRange[]
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

function pickRange(
  ranges: ReferenceRange[],
  patientAgeInDays: number | null,
  ageRangeMap: Record<number, AgeRange>
): ReferenceRange | null {
  if (!ranges.length) return null

  if (patientAgeInDays != null) {
    const matched = ranges.find((r) => {
      if (r.ageRangeId == null) return false
      const ar = ageRangeMap[r.ageRangeId]
      if (!ar) return false
      const minOk = ar.minAgeDays == null || patientAgeInDays >= ar.minAgeDays
      const maxOk = ar.maxAgeDays == null || patientAgeInDays <= ar.maxAgeDays
      return minOk && maxOk
    })
    if (matched) return matched
  }

  // Fallback: prefer a universal range (no age constraint), then first entry
  return ranges.find(r => r.ageRangeId == null) ?? ranges[0] ?? null
}

function getFlag(value: string | null, range: ReferenceRange | null, valueType: string | null): string {
  if (!value || !range || valueType !== 'QUANTITATIVE') return ''
  const num = parseFloat(value)
  if (isNaN(num)) return ''
  if (range.lowerLimit != null && num < range.lowerLimit) return 'L'
  if (range.upperLimit != null && num > range.upperLimit) return 'H'
  return ''
}

function refText(range: ReferenceRange | null, unit: string, valueType: string | null): string {
  if (!range) return '—'
  if (valueType === 'QUALITATIVE') return range.interpretationText ?? '—'
  const u = unit ? ` ${unit}` : ''
  if (range.lowerLimit != null && range.upperLimit != null) return `${range.lowerLimit} – ${range.upperLimit}${u}`
  if (range.lowerLimit != null) return `>= ${range.lowerLimit}${u}`
  if (range.upperLimit != null) return `<= ${range.upperLimit}${u}`
  if (range.interpretationText) return range.interpretationText
  return '—'
}

function buildHtml(data: ExamReportData): string {
  const { lab, patient, order, testName, testConfigName, run, paramMap, unitMap, referenceRanges, ageRanges, format = 'A4' } = data
  const isA5 = format === 'A5'
  const sz = (a4: string, a5: string) => (isA5 ? a5 : a4)

  const ageRangeMap: Record<number, AgeRange> = Object.fromEntries(ageRanges.map(ar => [ar.id, ar]))

  const rows = run.results.map((result) => {
    const param = paramMap[result.parameterId]
    const paramName = param?.name ?? `#${result.parameterId}`
    const unit = param?.unitId != null ? (unitMap[param.unitId] ?? '') : ''
    const ranges = referenceRanges[result.parameterId] ?? []
    const range = pickRange(ranges, patient.ageInDays, ageRangeMap)
    const flag = getFlag(result.value, range, param?.valueType ?? null)
    const ref = refText(range, unit, param?.valueType ?? null)
    const valDisplay = flag ? `${result.value ?? '—'} (${flag})` : (result.value ?? '—')

    return `<tr>
      <td style="padding:5px 10px;border-bottom:0.5px solid #ddd">${paramName}</td>
      <td style="padding:5px 10px;border-bottom:0.5px solid #ddd;font-weight:${flag ? '700' : '400'}">${valDisplay}</td>
      <td style="padding:5px 10px;border-bottom:0.5px solid #ddd;color:#444">${unit}</td>
      <td style="padding:5px 10px;border-bottom:0.5px solid #ddd;color:#444;font-size:${sz('11px', '10px')}">${ref}</td>
    </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${testName} — ${patient.name}</title>
  <style>
    @page { size: ${format}; margin: 20mm 18mm 20mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Georgia, 'Times New Roman', Times, serif;
      font-size: ${sz('13px', '11px')};
      color: #111;
      background: #fff;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 10px;
      border-bottom: 1.5px solid #111;
      margin-bottom: 16px;
    }
    .lab-name {
      font-size: ${sz('20px', '16px')};
      font-weight: bold;
      letter-spacing: 0.01em;
      color: #111;
    }
    .lab-meta {
      font-size: ${sz('10px', '9px')};
      color: #444;
      margin-top: 4px;
      line-height: 1.7;
    }
    .rpt-label {
      text-align: right;
      font-size: ${sz('10px', '9px')};
      color: #444;
      line-height: 1.7;
    }
    .rpt-label .title {
      font-size: ${sz('11px', '10px')};
      font-weight: bold;
      color: #111;
      display: block;
      margin-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .section { margin-bottom: 14px; }
    .section-title {
      font-size: ${sz('9px', '8px')};
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #555;
      border-bottom: 0.75px solid #bbb;
      padding-bottom: 3px;
      margin-bottom: 8px;
    }
    .patient-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      border: 0.75px solid #ccc;
      padding: 10px 14px;
    }
    .info-item .lbl {
      font-size: ${sz('9px', '8px')};
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-family: Arial, sans-serif;
    }
    .info-item .val {
      font-size: ${sz('13px', '11px')};
      font-weight: bold;
      color: #111;
      margin-top: 1px;
    }
    .exam-heading {
      font-size: ${sz('15px', '13px')};
      font-weight: bold;
      color: #111;
      margin-bottom: 3px;
    }
    .exam-sub {
      font-size: ${sz('10px', '9px')};
      color: #555;
      font-family: Arial, sans-serif;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { border-bottom: 1.25px solid #333; }
    th {
      padding: 6px 10px;
      text-align: left;
      font-size: ${sz('9px', '8px')};
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #333;
      font-family: Arial, sans-serif;
    }
    td { font-size: ${sz('12px', '10px')}; color: #111; }
    tbody tr:nth-child(even) td { background: #f9f9f9; }
    .legend {
      margin-top: 8px;
      font-size: ${sz('9px', '8px')};
      color: #666;
      font-family: Arial, sans-serif;
    }
    .footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 0.75px solid #bbb;
      font-size: ${sz('9px', '8px')};
      color: #666;
      text-align: right;
      font-family: Arial, sans-serif;
    }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="lab-name">${lab.name}</div>
      <div class="lab-meta">
        ${lab.address1 ? `${lab.address1}${lab.address2 ? ', ' + lab.address2 : ''}<br>` : ''}
        ${lab.phone ? `Tel. ${lab.phone}<br>` : ''}
        ${lab.email ? `${lab.email}<br>` : ''}
        ${lab.rtn ? `RTN: ${lab.rtn}` : ''}
      </div>
    </div>
    <div class="rpt-label">
      <span class="title">Reporte de Laboratorio</span>
      <span>No. de Orden: ${order.id}</span><br>
      <span>Fecha: ${fmtDate(order.requestedAt)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Paciente</div>
    <div class="patient-grid">
      <div class="info-item"><div class="lbl">Nombre</div><div class="val">${patient.name}</div></div>
      <div class="info-item"><div class="lbl">Edad</div><div class="val">${fmtAge(patient.ageInDays)}</div></div>
      <div class="info-item"><div class="lbl">No. Identidad</div><div class="val">${patient.nationalIdNumber ?? '—'}</div></div>
    </div>
  </div>

  <div class="section">
    <div class="exam-heading">${testName}</div>
    ${testConfigName ? `<div class="exam-sub">Perfil: ${testConfigName}</div>` : ''}
    <div class="exam-sub" style="margin-top:4px">
      Corrida No. ${run.runNumber ?? '—'} &nbsp;&nbsp; ${fmtDateTime(run.performedAt)}
      ${run.isVerified ? '&nbsp;&nbsp; Verificado' : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Resultados</div>
    <table>
      <thead>
        <tr>
          <th>Parametro</th>
          <th>Resultado</th>
          <th>Unidad</th>
          <th>Valores de Referencia</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="legend">
      (H) = Alto &nbsp;&nbsp; (L) = Bajo
    </div>
  </div>

  <div class="footer">
    Impreso el ${fmtDateTime(new Date().toISOString())} &nbsp;·&nbsp; ${lab.name}
  </div>
</body>
</html>`
}

export function useLabReport() {
  const api = useApiClient()

  const fetchReferenceRanges = async (parameterIds: number[]): Promise<Record<number, ReferenceRange[]>> => {
    const result: Record<number, ReferenceRange[]> = {}
    await Promise.all(
      parameterIds.map(async (pid) => {
        try {
          const data = await api<{ content: ReferenceRange[] }>(`/parameters/${pid}/reference-ranges`, {
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

  const fetchAgeRanges = async (): Promise<AgeRange[]> => {
    try {
      const data = await api<{ content: AgeRange[] }>('/age-ranges', { params: { pageSize: 200 } })
      return data.content ?? []
    } catch {
      return []
    }
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

  return { fetchReferenceRanges, fetchAgeRanges, printExamReport }
}
