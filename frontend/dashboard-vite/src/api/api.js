import axios from "axios";

const API_BASE = "http://localhost:8000/api/v1";

const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use(config => {
  const merchant = JSON.parse(localStorage.getItem("merchant") || "{}");
  if (merchant.api_key && merchant.api_secret) {
    config.headers["X-Api-Key"] = merchant.api_key;
    config.headers["X-Api-Secret"] = merchant.api_secret;
  }
  return config;
});

export const getTestMerchant = () => axios.get(`${API_BASE}/test/merchant`);
export const getOrder = (orderId) => API.get(`/orders/${orderId}`);
export const getPayments = () => API.get(`/payments`);
export const getWebhookConfig = () => API.get('/webhooks/config');
export const saveWebhookConfig = (payload) => API.put('/webhooks/config', payload);
export const sendTestWebhook = () => API.post('/webhooks/test');
export const getWebhookLogs = (limit = 10, offset = 0) => API.get(`/webhooks?limit=${limit}&offset=${offset}`);
export const retryWebhook = (webhookId) => API.post(`/webhooks/${webhookId}/retry`);

export default API;
