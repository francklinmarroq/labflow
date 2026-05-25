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
  const { public: { apiBase } } = useRuntimeConfig()

  const createTest = (body: Omit<LabTest, 'id'>) =>
    $fetch<LabTest>('/tests', { baseURL: apiBase, method: 'POST', body })

  const updateTest = (id: number, body: Omit<LabTest, 'id'>) =>
    $fetch<LabTest>(`/tests/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deleteTest = (id: number) =>
    $fetch<LabTest>(`/tests/${id}`, { baseURL: apiBase, method: 'DELETE' })

  return { createTest, updateTest, deleteTest }
}
