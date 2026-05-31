export interface Laboratory {
  id: number
  name: string
  rtn: string | null
  phone: string | null
  email: string | null
  address1: string | null
  address2: string | null
  cai1: string | null
  cai1ExpirationDate: string | null
  cai1RangeFrom: string | null
  cai1RangeTo: string | null
  cai1CurrentNumber: string | null
  cai2: string | null
  cai2ExpirationDate: string | null
  cai2RangeFrom: string | null
  cai2RangeTo: string | null
  cai2CurrentNumber: string | null
}

export function useLaboratoryApi() {
  const api = useApiClient()

  const getLaboratory = () =>
    api<Laboratory>('/laboratory')

  const createLaboratory = (body: Omit<Laboratory, 'id'>) =>
    api<Laboratory>('/laboratory', { method: 'POST', body })

  const updateLaboratory = (id: number, body: Omit<Laboratory, 'id'>) =>
    api<Laboratory>(`/laboratory/${id}`, { method: 'PUT', body })

  return { getLaboratory, createLaboratory, updateLaboratory }
}
