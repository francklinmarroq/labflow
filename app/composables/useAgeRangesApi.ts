export interface AgeRange {
  id: number
  name: string
  minAgeDays: number | null
  maxAgeDays: number | null
}

export interface AgeRangeResponse {
  content: AgeRange[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function useAgeRangesApi() {
  const { public: { apiBase } } = useRuntimeConfig()

  const createAgeRange = (body: Omit<AgeRange, 'id'>) =>
    $fetch<AgeRange>('/age-ranges', { baseURL: apiBase, method: 'POST', body })

  const updateAgeRange = (id: number, body: Omit<AgeRange, 'id'>) =>
    $fetch<AgeRange>(`/age-ranges/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deleteAgeRange = (id: number) =>
    $fetch<AgeRange>(`/age-ranges/${id}`, { baseURL: apiBase, method: 'DELETE' })

  return { createAgeRange, updateAgeRange, deleteAgeRange }
}
