export type ParameterSection = 'CHEMISTRY' | 'PHYSICAL' | 'MICROSCOPIC'
export type ParameterValueType = 'QUANTITATIVE' | 'QUALITATIVE'

export interface Parameter {
  id: number
  unitId: number | null
  name: string
  section: ParameterSection | null
  valueType: ParameterValueType | null
}

export interface ParameterResponse {
  content: Parameter[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function useParametersApi() {
  const api = useApiClient()

  const createParameter = (body: Omit<Parameter, 'id'>) =>
    api<Parameter>('/parameters', { method: 'POST', body })

  const updateParameter = (id: number, body: Omit<Parameter, 'id'>) =>
    api<Parameter>(`/parameters/${id}`, { method: 'PUT', body })

  const deleteParameter = (id: number) =>
    api<Parameter>(`/parameters/${id}`, { method: 'DELETE' })

  return { createParameter, updateParameter, deleteParameter }
}
