export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'DELIVERED'

export interface LabOrder {
  id: number
  customerId: number
  requestedAt: string | null
  status: OrderStatus | null
  notes: string | null
}

export interface OrderLabTest {
  id: number
  orderId: number
  testId: number
  testConfigId: number | null
}

export interface LabOrderResponse {
  content: LabOrder[]
  pageNumber: number
  pageSize: number
  totalElements: number
  totalPages: number
  lastPage: boolean
}

export function useLabOrdersApi() {
  const api = useApiClient()

  const createOrder = (body: { customerId: number, notes: string | null }) =>
    api<LabOrder>('/orders', { method: 'POST', body })

  const updateOrder = (id: number, body: { customerId: number, notes: string | null, status: OrderStatus }) =>
    api<LabOrder>(`/orders/${id}`, { method: 'PUT', body })

  const deleteOrder = (id: number) =>
    api<LabOrder>(`/orders/${id}`, { method: 'DELETE' })

  const getOrderTests = (orderId: number) =>
    api<OrderLabTest[]>(`/orders/${orderId}/tests`)

  const addTestToOrder = (orderId: number, testId: number) =>
    api<OrderLabTest>(`/orders/${orderId}/tests`, { method: 'POST', body: { testId } })

  const removeTestFromOrder = (orderId: number, labTestId: number) =>
    api<OrderLabTest>(`/orders/${orderId}/tests/${labTestId}`, { method: 'DELETE' })

  const assignTestConfig = (orderId: number, labTestId: number, testConfigId: number) =>
    api<OrderLabTest>(`/orders/${orderId}/tests/${labTestId}/assign`, {
      method: 'PATCH',
      params: { testConfigId }
    })

  return { createOrder, updateOrder, deleteOrder, getOrderTests, addTestToOrder, removeTestFromOrder, assignTestConfig }
}
