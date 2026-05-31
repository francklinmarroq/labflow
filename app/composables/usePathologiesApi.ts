export interface Pathology {
  id: number
  name: string
}

export interface PathologyResponse {
  content: Pathology[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function usePathologiesApi() {
  const api = useApiClient()

  const createPathology = (body: Omit<Pathology, 'id'>) =>
    api<Pathology>('/pathologies', { method: 'POST', body })

  const updatePathology = (id: number, body: Omit<Pathology, 'id'>) =>
    api<Pathology>(`/pathologies/${id}`, { method: 'PUT', body })

  const deletePathology = (id: number) =>
    api<Pathology>(`/pathologies/${id}`, { method: 'DELETE' })

  return { createPathology, updatePathology, deletePathology }
}
