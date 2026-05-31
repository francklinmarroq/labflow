export interface LabTest {
  id: number
  name: string
  price: number | null
  cost: number | null
}

export interface LabTestResponse {
  content: LabTest[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function useTestsApi() {
  const api = useApiClient()

  const createTest = (body: Omit<LabTest, 'id'>) =>
    api<LabTest>('/tests', { method: 'POST', body })

  const updateTest = (id: number, body: Omit<LabTest, 'id'>) =>
    api<LabTest>(`/tests/${id}`, { method: 'PUT', body })

  const deleteTest = (id: number) =>
    api<LabTest>(`/tests/${id}`, { method: 'DELETE' })

  return { createTest, updateTest, deleteTest }
}
