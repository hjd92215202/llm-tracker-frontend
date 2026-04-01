import request from './request';
import type { ApiResponse, Artifact, Note } from '@/types';

export const noteApi = {
  getNotesByNode: (nodeId: number) => request.get<any, Note[]>(`/roadmap/${nodeId}/notes`),
  getAllNotes: () => request.get<any, Note[]>('/notes'),
  getDetail: (id: number) => request.get<any, { note: Note; artifacts: Artifact[] }>(`/notes/${id}`),
  createNote: (data: Partial<Note>) => request.post<any, Note>('/notes', data),
  updateNote: (id: number, data: Partial<Note>) => request.put<any, ApiResponse<any>>(`/notes/${id}`, data),
  deleteNote: (id: number) => request.delete<any, ApiResponse<any>>(`/notes/${id}`),
  addArtifact: (data: { note_id: number; artifact_type: string; title: string; content_url: string }) =>
    request.post<any, Artifact>('/notes/artifacts', data),
  deleteArtifact: (id: number) => request.delete<any, ApiResponse<any>>(`/notes/artifacts/${id}`),
};
