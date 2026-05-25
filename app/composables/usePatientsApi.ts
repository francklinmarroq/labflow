export interface Patient {
  id: number
  name: string
  ageInDays: number | null
  nationalIdNumber: string | null
  taxNumber: string | null
  phone: string | null
  email: string | null
  pathologyIds: number[]
}

export interface PatientResponse {
  content: Patient[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function usePatientsApi() {
  const { public: { apiBase } } = useRuntimeConfig()

  const createPatient = (body: Omit<Patient, 'id'>) =>
    $fetch<Patient>('/customers', { baseURL: apiBase, method: 'POST', body })

  const updatePatient = (id: number, body: Omit<Patient, 'id'>) =>
    $fetch<Patient>(`/customers/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deletePatient = (id: number) =>
    $fetch<Patient>(`/customers/${id}`, { baseURL: apiBase, method: 'DELETE' })

  return { createPatient, updatePatient, deletePatient }
}
