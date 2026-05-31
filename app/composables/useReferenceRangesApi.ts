export type Sex = 'MALE' | 'FEMALE'

export interface ReferenceRange {
  id: number
  parameterId: number
  sex: Sex | null
  ageRangeId: number | null
  lowerLimit: number | null
  upperLimit: number | null
  criticalLow: number | null
  criticalHigh: number | null
  interpretationText: string | null
}

export interface ReferenceRangeResponse {
  content: ReferenceRange[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function useReferenceRangesApi() {
  const api = useApiClient()

  const createRange = (parameterId: number, body: Omit<ReferenceRange, 'id'>) =>
    api<ReferenceRange>(`/parameters/${parameterId}/reference-ranges`, { method: 'POST', body })

  const updateRange = (parameterId: number, rangeId: number, body: Omit<ReferenceRange, 'id'>) =>
    api<ReferenceRange>(`/parameters/${parameterId}/reference-ranges/${rangeId}`, { method: 'PUT', body })

  const deleteRange = (parameterId: number, rangeId: number) =>
    api<ReferenceRange>(`/parameters/${parameterId}/reference-ranges/${rangeId}`, { method: 'DELETE' })

  return { createRange, updateRange, deleteRange }
}
