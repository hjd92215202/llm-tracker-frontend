import request from './request'
import type { ApiResponse, RoadmapListFilters, RoadmapNode } from '@/types'

export const roadmapApi = {
  getNodes: (params?: RoadmapListFilters) => request.get<any, RoadmapNode[]>('/roadmap', { params }),
  createNode: (data: Partial<RoadmapNode>) => request.post<any, RoadmapNode>('/roadmap', data),
  updateNode: (id: number, data: Partial<RoadmapNode>) => request.put<any, ApiResponse<any>>(`/roadmap/${id}`, data),
  updateStatus: (id: number, status: string) => request.put(`/roadmap/${id}/status`, { status }),
  deleteNode: (id: number) => request.delete<any, ApiResponse<any>>(`/roadmap/${id}`),
}
