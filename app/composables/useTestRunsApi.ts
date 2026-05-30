export interface TestRunResult {
  id: number
  testRunId: number
  parameterId: number
  value: string | null
}

export interface TestRun {
  id: number
  testId: number // LabTest.id (order line item), NOT the catalog Test.id
  runNumber: number | null
  performedAt: string | null
  isVerified: boolean | null
  results: TestRunResult[]
}

export function useTestRunsApi() {
  const { public: { apiBase } } = useRuntimeConfig()

  const getRunsByLabTest = (labTestId: number) =>
    $fetch<TestRun[]>(`/tests/${labTestId}/runs`, { baseURL: apiBase })

  const addRun = (labTestId: number, body: { results: { parameterId: number, value: string }[] }) =>
    $fetch<TestRun>(`/tests/${labTestId}/runs`, { baseURL: apiBase, method: 'POST', body })

  const verifyRun = (labTestId: number, runId: number) =>
    $fetch<TestRun>(`/tests/${labTestId}/runs/${runId}/verify`, { baseURL: apiBase, method: 'PUT' })

  const deleteRun = (labTestId: number, runId: number) =>
    $fetch<TestRun>(`/tests/${labTestId}/runs/${runId}`, { baseURL: apiBase, method: 'DELETE' })

  const updateResult = (runId: number, resultId: number, value: string) =>
    $fetch<TestRunResult>(`/runs/${runId}/results/${resultId}`, { baseURL: apiBase, method: 'PUT', body: { value } })

  return { getRunsByLabTest, addRun, verifyRun, deleteRun, updateResult }
}
