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
  const api = useApiClient()

  const getAllUnits = (params?: { pageSize?: number; sortBy?: string; sortOrder?: string }) =>
    api<UnitResponse>('/units', { params })

  const createUnit = (body: { unitSymbol: string }) =>
    api<Unit>('/units', { method: 'POST', body })

  const updateUnit = (id: number, body: { unitSymbol: string }) =>
    api<Unit>(`/units/${id}`, { method: 'PUT', body })

  const deleteUnit = (id: number) =>
    api<Unit>(`/units/${id}`, { method: 'DELETE' })

  return { getAllUnits, createUnit, updateUnit, deleteUnit }
}
