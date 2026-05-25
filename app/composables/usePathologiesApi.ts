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
  const { public: { apiBase } } = useRuntimeConfig()

  const createPathology = (body: Omit<Pathology, 'id'>) =>
    $fetch<Pathology>('/pathologies', { baseURL: apiBase, method: 'POST', body })

  const updatePathology = (id: number, body: Omit<Pathology, 'id'>) =>
    $fetch<Pathology>(`/pathologies/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deletePathology = (id: number) =>
    $fetch<Pathology>(`/pathologies/${id}`, { baseURL: apiBase, method: 'DELETE' })

  return { createPathology, updatePathology, deletePathology }
}
