const API_URL = '/api';

async function request(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Something went wrong');
  }
  return response.json();
}

export const api = {
  auth: {
    login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
    me: () => request('/auth/me'),
  },
  products: {
    list: (deleted = false) => request(`/products?deleted=${deleted}`),
    create: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number, permanent = false) => request(`/products/${id}?permanent=${permanent}`, { method: 'DELETE' }),
    restore: (id: string | number) => request(`/products/${id}/restore`, { method: 'POST' }),
  },
  customers: {
    list: (deleted = false) => request(`/customers?deleted=${deleted}`),
    create: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number, permanent = false) => request(`/customers/${id}?permanent=${permanent}`, { method: 'DELETE' }),
    restore: (id: string | number) => request(`/customers/${id}/restore`, { method: 'POST' }),
    getLedger: (id: string | number) => request(`/customers/${id}/ledger`),
  },
  invoices: {
    list: (deleted = false) => request(`/invoices?deleted=${deleted}`),
    getItems: (id: string | number) => request(`/invoices/${id}/items`),
    create: (data: any) => request('/invoices', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string | number, permanent = false) => request(`/invoices/${id}?permanent=${permanent}`, { method: 'DELETE' }),
    restore: (id: string | number) => request(`/invoices/${id}/restore`, { method: 'POST' }),
  },
  payments: {
    list: (deleted = false) => request(`/payments?deleted=${deleted}`),
    create: (data: any) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string | number, permanent = false) => request(`/payments/${id}?permanent=${permanent}`, { method: 'DELETE' }),
    restore: (id: string | number) => request(`/payments/${id}/restore`, { method: 'POST' }),
  },
  users: {
    list: () => request('/users'),
    create: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string | number, data: any) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string | number) => request(`/users/${id}`, { method: 'DELETE' }),
  },
  backup: {
    export: () => request('/backup/export'),
    import: (data: any) => request('/backup/import', { method: 'POST', body: JSON.stringify(data) }),
  },
  audit: {
    list: () => request('/audit-logs'),
  }
};
