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

export interface WorkspaceRoleCounts {
  owner: number;
  admin: number;
  member: number;
  viewer: number;
}

export interface WorkspaceOverviewMetrics {
  members_total: number;
  notes_total: number;
  roadmap_total: number;
  roadmap_completed: number;
  roadmap_in_progress: number;
  roadmap_todo: number;
  completion_rate: number;
}

export interface WorkspaceRecentNote {
  id: number;
  title: string;
  summary: string | null;
  created_at: string;
}

export interface WorkspaceActivity {
  type: 'member_joined' | 'note_created' | 'roadmap_updated' | string;
  title: string;
  description: string;
  occurred_at: string;
  href: string;
}

export interface WorkspaceActivityResponse {
  workspace: WorkspaceMembership;
  items: WorkspaceActivity[];
  total_items: number;
  applied_type: WorkspaceActivity['type'] | null;
  applied_limit: number;
}

export interface WorkspaceOnboardingChecklistItem {
  key: string;
  title: string;
  description: string;
  done: boolean;
  cta_label: string;
  cta_path: string;
}

export interface WorkspaceOverview {
  workspace: WorkspaceMembership;
  metrics: WorkspaceOverviewMetrics;
  team: {
    role_counts: WorkspaceRoleCounts;
    recent_members: WorkspaceMember[];
  };
  notes: WorkspaceRecentNote[];
  activity: WorkspaceActivity[];
  onboarding: WorkspaceOnboardingChecklistItem[];
}

export interface WorkspaceInviteLink {
  workspace_id: number;
  workspace_name: string;
  workspace_slug: string;
  token: string;
  role: WorkspaceRole;
  invite_url: string;
  expires_at: string;
}

export interface WorkspaceInvitePreview {
  workspace_id: number;
  workspace_name: string;
  workspace_slug: string;
  role: WorkspaceRole;
  inviter_name: string;
  expires_at: string;
}

export interface WorkspaceShareLink {
  workspace_id: number;
  workspace_name: string;
  workspace_slug: string;
  share_token: string;
  share_url: string;
}

export interface WorkspaceSharedNote {
  id: number;
  node_id: number | null;
  title: string;
  summary: string | null;
  content: string;
  tags: string[] | null;
  created_at: string;
}

export interface WorkspaceSharedArtifact {
  id: number;
  artifact_type: string;
  title: string | null;
  content_url: string;
  created_at: string;
}

export interface WorkspaceSharedRoadmap {
  workspace_id: number;
  workspace_name: string;
  workspace_slug: string;
  nodes: RoadmapNode[];
}

export interface WorkspaceSharedNodeNotes {
  workspace_id: number;
  workspace_name: string;
  workspace_slug: string;
  node_id: number;
  notes: WorkspaceSharedNote[];
}

export interface WorkspaceSharedNoteDetail {
  workspace_id: number;
  workspace_name: string;
  workspace_slug: string;
  note: WorkspaceSharedNote;
  artifacts: WorkspaceSharedArtifact[];
}

export interface WorkspaceSearchRoadmapItem {
  id: number;
  title: string;
  description: string | null;
  status: RoadmapNode['status'] | string;
  node_type: RoadmapNode['node_type'] | string;
  updated_at: string;
  href: string;
}

export interface WorkspaceSearchNoteItem {
  id: number;
  title: string;
  summary: string | null;
  node_id: number | null;
  created_at: string;
  href: string;
}

export interface WorkspaceSearchResponse {
  query: string;
  total_results: number;
  roadmap_results: WorkspaceSearchRoadmapItem[];
  note_results: WorkspaceSearchNoteItem[];
}

export interface NoteListFilters {
  search?: string;
  node_id?: number;
}

export interface RoadmapListFilters {
  search?: string;
  status?: RoadmapNode['status'];
  node_type?: RoadmapNode['node_type'];
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

export interface RoadmapTreeMutationItem {
  id: number;
  parent_id: number | null;
  sort_order: number;
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
