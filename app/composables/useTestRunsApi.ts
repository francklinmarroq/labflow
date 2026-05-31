export interface TestRunResult {
  id: number
  testRunId: number
  parameterId: number
  value: string | null
}

export interface TestRun {
  id: number
  testId: number
  runNumber: number | null
  performedAt: string | null
  isVerified: boolean | null
  results: TestRunResult[]
}

export function useTestRunsApi() {
  const api = useApiClient()

  const getRunsByLabTest = (labTestId: number) =>
    api<TestRun[]>(`/tests/${labTestId}/runs`)

  const addRun = (labTestId: number, body: { results: { parameterId: number, value: string }[] }) =>
    api<TestRun>(`/tests/${labTestId}/runs`, { method: 'POST', body })

  const verifyRun = (labTestId: number, runId: number) =>
    api<TestRun>(`/tests/${labTestId}/runs/${runId}/verify`, { method: 'PUT' })

  const deleteRun = (labTestId: number, runId: number) =>
    api<TestRun>(`/tests/${labTestId}/runs/${runId}`, { method: 'DELETE' })

  const updateResult = (runId: number, resultId: number, value: string) =>
    api<TestRunResult>(`/runs/${runId}/results/${resultId}`, { method: 'PUT', body: { value } })

  return { getRunsByLabTest, addRun, verifyRun, deleteRun, updateResult }
}
