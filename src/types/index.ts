export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  msg?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at?: string;
}

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspaceMembership {
  workspace_id: number;
  user_id: number;
  role: WorkspaceRole;
  joined_at: string;
  workspace_name: string;
  workspace_slug: string;
  owner_user_id: number;
}

export interface WorkspaceMember {
  user_id: number;
  username: string;
  email: string;
  role: WorkspaceRole;
  joined_at: string;
}

export interface AuthSession {
  user: User;
  workspaces: WorkspaceMembership[];
  active_workspace_id: number;
}

export interface AuthLoginResponse extends AuthSession {
  token: string;
}

export interface RoadmapNode {
  id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'completed';
  node_type: 'theory' | 'coding' | 'project';
  parent_id: number | null;
  sort_order: number;
  workspace_id?: number | null;
}

export interface Note {
  id: number;
  node_id: number | null;
  title: string;
  content: string;
  summary: string | null;
  tags: string[] | null;
  is_indexed: boolean;
  created_at: string;
  workspace_id?: number | null;
}

export interface Artifact {
  id: number;
  note_id: number;
  title: string;
  artifact_type: string;
  content_url: string;
  created_at?: string;
  workspace_id?: number | null;
}
