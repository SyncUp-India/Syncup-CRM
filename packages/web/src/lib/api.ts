import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  updatePushToken: (pushToken: string) =>
    api.put('/auth/me/push-token', { pushToken }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/me/password', { currentPassword, newPassword }),
};

// Leads
export const leadsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/leads', { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post('/leads', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/leads/${id}`, data),
  changeStage: (id: string, stage: string) =>
    api.patch(`/leads/${id}/stage`, { stage }),
  assign: (id: string, assignedToId: string | null) =>
    api.patch(`/leads/${id}/assign`, { assignedToId }),
  addNote: (id: string, note: string) =>
    api.post(`/leads/${id}/notes`, { note }),
  logCall: (id: string) => api.post(`/leads/${id}/call`),
  scheduleFollowup: (id: string, data: Record<string, unknown>) =>
    api.post(`/leads/${id}/followups`, data),
  completeFollowup: (id: string, followupId: string, notes?: string) =>
    api.patch(`/leads/${id}/followups/${followupId}/complete`, { notes }),
  delete: (id: string) => api.delete(`/leads/${id}`),
  duplicate: (id: string) => api.post(`/leads/${id}/duplicate`),
  bulk: (ids: string[], patch: { assignedToId?: string | null; stage?: string }) =>
    api.patch('/leads/bulk', { ids, ...patch }),
  export: (params?: Record<string, unknown>) =>
    api.get('/leads/export', { params, responseType: 'blob' }),
};

// Users
export const usersApi = {
  list: () => api.get('/users'),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// Dashboard
export const dashboardApi = {
  stats: (params?: Record<string, unknown>) =>
    api.get('/dashboard/stats', { params }),
  dailyActivity: (params?: Record<string, unknown>) =>
    api.get('/dashboard/daily-activity', { params }),
  userPerformance: (params?: Record<string, unknown>) =>
    api.get('/dashboard/user-performance', { params }),
};

// Notifications
export const notificationsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/notifications', { params }),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  unreadCount: () => api.get('/notifications/unread-count'),
};

// Settings
export const settingsApi = {
  getTemplates: () => api.get('/settings/email-templates'),
  updateTemplate: (stage: string, data: Record<string, unknown>) =>
    api.put(`/settings/email-templates/${stage}`, data),
  getSmtp: () => api.get('/settings/smtp'),
  updateSmtp: (data: Record<string, unknown>) =>
    api.put('/settings/smtp', data),
  seedTemplates: () => api.post('/settings/email-templates/seed'),
  getWhatsAppTemplates: () => api.get('/settings/whatsapp-templates'),
  updateWhatsAppTemplate: (stage: string, data: Record<string, unknown>) =>
    api.put(`/settings/whatsapp-templates/${stage}`, data),
};

// Upload
export const uploadApi = {
  preview: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload/preview', fd);
  },
  confirm: (filePath: string, assignedToId?: string) =>
    api.post('/upload/confirm', { filePath, assignedToId }),
};

// Audit
export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/audit', { params }),
};
