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
  const { public: { apiBase } } = useRuntimeConfig()

  const createParameter = (body: Omit<Parameter, 'id'>) =>
    $fetch<Parameter>('/parameters', { baseURL: apiBase, method: 'POST', body })

  const updateParameter = (id: number, body: Omit<Parameter, 'id'>) =>
    $fetch<Parameter>(`/parameters/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deleteParameter = (id: number) =>
    $fetch<Parameter>(`/parameters/${id}`, { baseURL: apiBase, method: 'DELETE' })

  return { createParameter, updateParameter, deleteParameter }
}
