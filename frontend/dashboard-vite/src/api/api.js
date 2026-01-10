import axios from "axios";

const API_BASE = "http://localhost:8000/api/v1";

// Create axios instance
const API = axios.create({ baseURL: API_BASE });

// Set auth headers if merchant info exists
API.interceptors.request.use(config => {
  const merchant = JSON.parse(localStorage.getItem("merchant") || "{}");
  if (merchant.api_key && merchant.api_secret) {
    config.headers["X-Api-Key"] = merchant.api_key;
    config.headers["X-Api-Secret"] = merchant.api_secret;
  }
  return config;
});

// Endpoints
export const getTestMerchant = () => axios.get(`${API_BASE}/test/merchant`);
export const getOrder = (orderId) => API.get(`/orders/${orderId}`);
export const getPayments = () => API.get(`/payments`);

export default API;
