import request from './request';
import type { AuthLoginResponse, AuthSession, User } from '@/types';

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request.post<any, User>('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    request.post<any, AuthLoginResponse>('/auth/login', data),
  getMe: () => request.get<any, AuthSession>('/auth/me'),
};
