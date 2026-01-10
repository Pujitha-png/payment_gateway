import axios from "axios";

const API_BASE = "/api/v1";

export const getOrderPublic = (orderId) => axios.get(`${API_BASE}/orders/${orderId}/public`);
export const createPayment = (data) => axios.post(`${API_BASE}/payments/public`, data);
export const getPayment = (paymentId) => axios.get(`${API_BASE}/payments/${paymentId}/public`);