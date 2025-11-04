const defaultBaseUrl = 'http://localhost:5001';
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? defaultBaseUrl;

export const apiClient = async (endpoint, { method = 'GET', data, token } = {}) => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) {
    headers.append('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers,
    credentials: 'include',
    body: data ? JSON.stringify(data) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message ?? 'Request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};
