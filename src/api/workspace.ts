import request from './request';
import type {
  WorkspaceActivity,
  WorkspaceActivityResponse,
  WorkspaceInviteLink,
  WorkspaceInvitePreview,
  WorkspaceMember,
  WorkspaceMembership,
  WorkspaceOverview,
  WorkspaceRole,
  WorkspaceSharedNoteDetail,
  WorkspaceSharedNodeNotes,
  WorkspaceSharedRoadmap,
  WorkspaceShareLink,
  WorkspaceSearchResponse,
} from '@/types';

export const workspaceApi = {
  listWorkspaces: () => request.get<any, WorkspaceMembership[]>('/workspaces'),
  createWorkspace: (data: { name: string }) =>
    request.post<any, WorkspaceMembership>('/workspaces', data),
  getOverview: (workspaceId: number) =>
    request.get<any, WorkspaceOverview>(`/workspaces/${workspaceId}/overview`),
  getActivity: (
    workspaceId: number,
    params?: { type?: WorkspaceActivity['type']; limit?: number }
  ) => request.get<any, WorkspaceActivityResponse>(`/workspaces/${workspaceId}/activity`, { params }),
  searchWorkspace: (workspaceId: number, q: string) =>
    request.get<any, WorkspaceSearchResponse>(`/workspaces/${workspaceId}/search`, { params: { q } }),
  createInviteLink: (workspaceId: number, data: { role: WorkspaceRole }) =>
    request.post<any, WorkspaceInviteLink>(`/workspaces/${workspaceId}/invite-links`, data),
  previewInviteLink: (token: string) =>
    request.get<any, WorkspaceInvitePreview>(`/workspaces/invite-links/${token}`),
  acceptInviteLink: (token: string) =>
    request.post<any, WorkspaceMembership>(`/workspaces/invite-links/${token}/accept`),
  createShareLink: (workspaceId: number) =>
    request.post<any, WorkspaceShareLink>(`/workspaces/${workspaceId}/share-link`),
  getSharedRoadmap: (token: string) =>
    request.get<any, WorkspaceSharedRoadmap>(`/workspaces/share-links/${token}/roadmap`),
  getSharedNodeNotes: (token: string, nodeId: number) =>
    request.get<any, WorkspaceSharedNodeNotes>(`/workspaces/share-links/${token}/nodes/${nodeId}/notes`),
  getSharedNoteDetail: (token: string, noteId: number) =>
    request.get<any, WorkspaceSharedNoteDetail>(`/workspaces/share-links/${token}/notes/${noteId}`),
  listMembers: (workspaceId: number) =>
    request.get<any, WorkspaceMember[]>(`/workspaces/${workspaceId}/members`),
  addMember: (workspaceId: number, data: { identifier: string; role: WorkspaceRole }) =>
    request.post(`/workspaces/${workspaceId}/members`, data),
  updateMemberRole: (workspaceId: number, userId: number, data: { role: WorkspaceRole }) =>
    request.put(`/workspaces/${workspaceId}/members/${userId}`, data),
  removeMember: (workspaceId: number, userId: number) =>
    request.delete(`/workspaces/${workspaceId}/members/${userId}`),
};
