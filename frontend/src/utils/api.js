import axios from 'axios';

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getProjects = () => api.get('/projects');
export const getProject = (id) => api.get(`/projects/${id}`);
export const createOrder = (data) => api.post('/orders/create', data);
export const verifyPayment = (data) => api.post('/orders/verify', data);
export const downloadProject = (projectId, orderId, token) =>
  api.get(`/projects/${projectId}/download?token=${token}&order_id=${orderId}`, {
    responseType: 'blob',
  });

export const adminLogin = (data) => api.post('/admin/login', data);
export const adminGetProjects = () => api.get('/projects?published_only=false');
export const adminCreateProject = (data) => api.post('/admin/projects', data);
export const adminUpdateProject = (id, data) => api.put(`/admin/projects/${id}`, data);
export const adminDeleteProject = (id) => api.delete(`/admin/projects/${id}`);
export const adminUploadCode = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/admin/projects/${id}/upload-code`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const adminUploadImage = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`/admin/projects/${id}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const adminDeleteImage = (projectId, imageId) =>
  api.delete(`/admin/projects/${projectId}/images/${imageId}`);
export const adminGetOrders = () => api.get('/admin/orders');
export const adminGetAnalytics = () => api.get('/admin/analytics');

export const getImageUrl = (fileId) => `${API_BASE}/images/${fileId}`;
