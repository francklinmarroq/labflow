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
  const { public: { apiBase } } = useRuntimeConfig()

  const createTestConfig = (body: Omit<TestConfig, 'id'>) =>
    $fetch<TestConfig>('/test-configs', { baseURL: apiBase, method: 'POST', body })

  const updateTestConfig = (id: number, body: Omit<TestConfig, 'id'>) =>
    $fetch<TestConfig>(`/test-configs/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deleteTestConfig = (id: number) =>
    $fetch<TestConfig>(`/test-configs/${id}`, { baseURL: apiBase, method: 'DELETE' })

  return { createTestConfig, updateTestConfig, deleteTestConfig }
}
