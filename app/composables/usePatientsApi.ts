export type PatientSex = 'MALE' | 'FEMALE'

export interface Patient {
  id: number
  name: string
  ageInDays: number | null
  sex: PatientSex | null
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
  const api = useApiClient()

  const createPatient = (body: Omit<Patient, 'id'>) =>
    api<Patient>('/customers', { method: 'POST', body })

  const updatePatient = (id: number, body: Omit<Patient, 'id'>) =>
    api<Patient>(`/customers/${id}`, { method: 'PUT', body })

  const deletePatient = (id: number) =>
    api<Patient>(`/customers/${id}`, { method: 'DELETE' })

  return { createPatient, updatePatient, deletePatient }
}
