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
  const { public: { apiBase } } = useRuntimeConfig()

  const createOrder = (body: { customerId: number, notes: string | null }) =>
    $fetch<LabOrder>('/orders', { baseURL: apiBase, method: 'POST', body })

  const updateOrder = (id: number, body: { customerId: number, notes: string | null, status: OrderStatus }) =>
    $fetch<LabOrder>(`/orders/${id}`, { baseURL: apiBase, method: 'PUT', body })

  const deleteOrder = (id: number) =>
    $fetch<LabOrder>(`/orders/${id}`, { baseURL: apiBase, method: 'DELETE' })

  const getOrderTests = (orderId: number) =>
    $fetch<OrderLabTest[]>(`/orders/${orderId}/tests`, { baseURL: apiBase })

  const addTestToOrder = (orderId: number, testId: number) =>
    $fetch<OrderLabTest>(`/orders/${orderId}/tests`, { baseURL: apiBase, method: 'POST', body: { testId } })

  const removeTestFromOrder = (orderId: number, labTestId: number) =>
    $fetch<OrderLabTest>(`/orders/${orderId}/tests/${labTestId}`, { baseURL: apiBase, method: 'DELETE' })

  const assignTestConfig = (orderId: number, labTestId: number, testConfigId: number) =>
    $fetch<OrderLabTest>(`/orders/${orderId}/tests/${labTestId}/assign`, {
      baseURL: apiBase,
      method: 'PATCH',
      params: { testConfigId }
    })

  return { createOrder, updateOrder, deleteOrder, getOrderTests, addTestToOrder, removeTestFromOrder, assignTestConfig }
}
