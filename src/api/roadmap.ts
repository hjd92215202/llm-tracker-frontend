import request from './request';
import type { RoadmapNode, ApiResponse } from '@/types';

export const roadmapApi = {
  // 获取列表
  getNodes: () => request.get<any, RoadmapNode[]>('/roadmap'),
  
  // 创建节点
  createNode: (data: Partial<RoadmapNode>) => request.post<any, RoadmapNode>('/roadmap', data),

  updateNode: (id: number, data: Partial<RoadmapNode>) => request.put<any, ApiResponse<any>>(`/roadmap/${id}`, data),
  
  // 更新状态
  updateStatus: (id: number, status: string) => request.put(`/roadmap/${id}/status`, { status }),

  deleteNode: (id: number) => request.delete<any, ApiResponse<any>>(`/roadmap/${id}`),
};