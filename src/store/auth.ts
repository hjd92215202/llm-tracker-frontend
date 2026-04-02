import { defineStore } from 'pinia';
import type { AuthLoginResponse, AuthSession, User, WorkspaceMembership, WorkspaceRole } from '@/types';

interface AuthState {
  token: string | null;
  user: User | null;
  workspaces: WorkspaceMembership[];
  activeWorkspaceId: number | null;
}

const parseStoredJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`Failed to parse persisted auth state for ${key}`, error);
    localStorage.removeItem(key);
    return fallback;
  }
};

const parseStoredNumber = (key: string): number | null => {
  const raw = localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: localStorage.getItem('token'),
    user: parseStoredJson<User | null>('user', null),
    workspaces: parseStoredJson<WorkspaceMembership[]>('workspaces', []),
    activeWorkspaceId: parseStoredNumber('activeWorkspaceId'),
  }),

  getters: {
    isLoggedIn: (state) => Boolean(state.token),
    userId: (state) => state.user?.id ?? null,
    activeWorkspace: (state) =>
      state.workspaces.find((workspace) => workspace.workspace_id === state.activeWorkspaceId) ?? null,
    activeRole(): WorkspaceRole | null {
      return this.activeWorkspace?.role ?? null;
    },
    hasWriteAccess(): boolean {
      return ['owner', 'admin', 'member'].includes(this.activeRole ?? '');
    },
    canManageMembers(): boolean {
      return ['owner', 'admin'].includes(this.activeRole ?? '');
    },
  },

  actions: {
    persistSession() {
      if (this.token) {
        localStorage.setItem('token', this.token);
      } else {
        localStorage.removeItem('token');
      }

      if (this.user) {
        localStorage.setItem('user', JSON.stringify(this.user));
      } else {
        localStorage.removeItem('user');
      }

      localStorage.setItem('workspaces', JSON.stringify(this.workspaces));

      if (this.activeWorkspaceId) {
        localStorage.setItem('activeWorkspaceId', String(this.activeWorkspaceId));
      } else {
        localStorage.removeItem('activeWorkspaceId');
      }
    },

    setSession(session: AuthSession, token?: string | null) {
      this.token = token ?? this.token;
      this.user = session.user;
      this.workspaces = session.workspaces;

      const resolvedWorkspaceId =
        session.workspaces.find((workspace) => workspace.workspace_id === this.activeWorkspaceId)?.workspace_id ??
        session.workspaces.find((workspace) => workspace.workspace_id === session.active_workspace_id)?.workspace_id ??
        session.workspaces[0]?.workspace_id ??
        null;

      this.activeWorkspaceId = resolvedWorkspaceId;
      this.persistSession();
    },

    login(session: AuthLoginResponse) {
      this.setSession(session, session.token);
    },

    setActiveWorkspace(workspaceId: number) {
      const exists = this.workspaces.some((workspace) => workspace.workspace_id === workspaceId);
      if (!exists) {
        return;
      }

      this.activeWorkspaceId = workspaceId;
      this.persistSession();
    },

    appendWorkspace(workspace: WorkspaceMembership) {
      const exists = this.workspaces.some((item) => item.workspace_id === workspace.workspace_id);

      if (!exists) {
        this.workspaces = [...this.workspaces, workspace];
      }

      this.activeWorkspaceId = workspace.workspace_id;
      this.persistSession();
    },

    logout() {
      this.token = null;
      this.user = null;
      this.workspaces = [];
      this.activeWorkspaceId = null;
      this.persistSession();
    },
  },
});
