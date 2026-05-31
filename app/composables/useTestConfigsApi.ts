export interface TestConfig {
  id: number
  testId: number
  name: string
  parameterIds: number[]
  active: boolean
}

export interface TestConfigResponse {
  content: TestConfig[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function useTestConfigsApi() {
  const api = useApiClient()

  const createTestConfig = (body: Omit<TestConfig, 'id'>) =>
    api<TestConfig>('/test-configs', { method: 'POST', body })

  const updateTestConfig = (id: number, body: Omit<TestConfig, 'id'>) =>
    api<TestConfig>(`/test-configs/${id}`, { method: 'PUT', body })

  const deleteTestConfig = (id: number) =>
    api<TestConfig>(`/test-configs/${id}`, { method: 'DELETE' })

  return { createTestConfig, updateTestConfig, deleteTestConfig }
}
