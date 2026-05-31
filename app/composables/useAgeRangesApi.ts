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
  const api = useApiClient()

  const createAgeRange = (body: Omit<AgeRange, 'id'>) =>
    api<AgeRange>('/age-ranges', { method: 'POST', body })

  const updateAgeRange = (id: number, body: Omit<AgeRange, 'id'>) =>
    api<AgeRange>(`/age-ranges/${id}`, { method: 'PUT', body })

  const deleteAgeRange = (id: number) =>
    api<AgeRange>(`/age-ranges/${id}`, { method: 'DELETE' })

  return { createAgeRange, updateAgeRange, deleteAgeRange }
}
