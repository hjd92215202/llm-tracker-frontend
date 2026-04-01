import request from './request';
import type { WorkspaceMember, WorkspaceMembership, WorkspaceRole } from '@/types';

export const workspaceApi = {
  listWorkspaces: () => request.get<any, WorkspaceMembership[]>('/workspaces'),
  createWorkspace: (data: { name: string }) =>
    request.post<any, WorkspaceMembership>('/workspaces', data),
  listMembers: (workspaceId: number) =>
    request.get<any, WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
  addMember: (workspaceId: number, data: { identifier: string; role: WorkspaceRole }) =>
    request.post(`/workspaces/${workspaceId}/members`, data),
  updateMemberRole: (workspaceId: number, userId: number, data: { role: WorkspaceRole }) =>
    request.put(`/workspaces/${workspaceId}/members/${userId}`, data),
  removeMember: (workspaceId: number, userId: number) =>
    request.delete(`/workspaces/${workspaceId}/members/${userId}`),
};
