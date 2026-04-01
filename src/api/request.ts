import axios from 'axios';
import { useAuthStore } from '@/store/auth';
import router from '@/router';

const service = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

service.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    config.headers = config.headers ?? {};

    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }

    if (authStore.activeWorkspaceId) {
      config.headers['x-workspace-id'] = String(authStore.activeWorkspaceId);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

service.interceptors.response.use(
  (response) => {
    const res = response.data;

    if (res.success === false) {
      return Promise.reject(new Error(res.error || 'API Error'));
    }

    return res.data;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        const authStore = useAuthStore();
        authStore.logout();

        router.push({
          name: 'login',
          query: { redirect: router.currentRoute.value.fullPath },
        });
      }

      const errorMessage = error.response.data?.error || 'Service request failed';
      return Promise.reject(new Error(errorMessage));
    }

    return Promise.reject(error);
  }
);

export default service;
