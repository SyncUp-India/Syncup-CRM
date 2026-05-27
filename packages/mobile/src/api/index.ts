import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:4000/api'; // Change to your server IP for device testing

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.multiRemove(['token', 'user']);
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
  addNote: (id: string, note: string) =>
    api.post(`/leads/${id}/notes`, { note }),
  logCall: (id: string) => api.post(`/leads/${id}/call`),
  scheduleFollowup: (id: string, data: Record<string, unknown>) =>
    api.post(`/leads/${id}/followups`, data),
  completeFollowup: (id: string, followupId: string) =>
    api.patch(`/leads/${id}/followups/${followupId}/complete`),
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
