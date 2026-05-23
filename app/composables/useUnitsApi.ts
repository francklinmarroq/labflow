export interface Unit {
  id: number
  unitSymbol: string
}

export interface UnitResponse {
  content: Unit[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function useUnitsApi() {
  const { public: { apiBase } } = useRuntimeConfig()

  const createUnit = (body: { unitSymbol: string }) =>
    $fetch<Unit>('/units', { baseURL: apiBase, method: 'POST', body })

  const updateUnit = (id: number, body: { unitSymbol: string }) =>
    $fetch<Unit>(`/units/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deleteUnit = (id: number) =>
    $fetch<Unit>(`/units/${id}`, { baseURL: apiBase, method: 'DELETE' })

  return { createUnit, updateUnit, deleteUnit }
}
