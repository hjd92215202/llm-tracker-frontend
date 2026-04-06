import request from './request'
import type { RoadmapListFilters, RoadmapNode, RoadmapTreeMutationItem } from '@/types'

export const roadmapApi = {
  getNodes: (params?: RoadmapListFilters) => request.get<any, RoadmapNode[]>('/roadmap', { params }),
  createNode: (data: Partial<RoadmapNode>) => request.post<any, RoadmapNode>('/roadmap', data),
  updateNode: (id: number, data: Partial<RoadmapNode>) => request.put<any, RoadmapNode>(`/roadmap/${id}`, data),
  patchNode: (id: number, data: Partial<RoadmapNode>) => request.patch<any, RoadmapNode>(`/roadmap/${id}`, data),
  updateTree: (nodes: RoadmapTreeMutationItem[]) =>
    request.put<any, RoadmapNode[]>('/roadmap/tree', { nodes }),
  updateStatus: (id: number, status: string) => request.put<any, RoadmapNode>(`/roadmap/${id}/status`, { status }),
  deleteNode: (id: number) => request.delete<any, RoadmapNode[]>(`/roadmap/${id}`),
}
