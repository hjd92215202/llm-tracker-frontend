<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import type { WorkspaceMember, WorkspaceRole } from '@/types'

const authStore = useAuthStore()

const loadingMembers = ref(false)
const creatingWorkspace = ref(false)
const invitingMember = ref(false)
const members = ref<WorkspaceMember[]>([])
const errorMessage = ref('')
const createWorkspaceName = ref('')
const inviteIdentifier = ref('')
const inviteRole = ref<WorkspaceRole>('member')

const currentWorkspaceId = computed(() => authStore.activeWorkspaceId)
const currentWorkspace = computed(() => authStore.activeWorkspace)
const canManageMembers = computed(() => authStore.canManageMembers)
const roleOptions = computed<WorkspaceRole[]>(() =>
  authStore.activeRole === 'owner' ? ['owner', 'admin', 'member', 'viewer'] : ['admin', 'member', 'viewer']
)

const roleLabel: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

const fetchMembers = async () => {
  if (!currentWorkspaceId.value) {
    members.value = []
    return
  }

  loadingMembers.value = true
  errorMessage.value = ''

  try {
    members.value = await workspaceApi.listMembers(currentWorkspaceId.value)
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to load team members'
    members.value = []
  } finally {
    loadingMembers.value = false
  }
}

watch(
  () => currentWorkspaceId.value,
  () => {
    fetchMembers()
  },
  { immediate: true }
)

const handleCreateWorkspace = async () => {
  if (!createWorkspaceName.value.trim()) {
    errorMessage.value = 'Workspace name cannot be empty'
    return
  }

  creatingWorkspace.value = true
  errorMessage.value = ''

  try {
    const workspace = await workspaceApi.createWorkspace({ name: createWorkspaceName.value.trim() })
    authStore.appendWorkspace(workspace)
    createWorkspaceName.value = ''
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to create workspace'
  } finally {
    creatingWorkspace.value = false
  }
}

const handleInviteMember = async () => {
  if (!currentWorkspaceId.value) {
    return
  }

  if (!inviteIdentifier.value.trim()) {
    errorMessage.value = 'Enter a username or email to invite'
    return
  }

  invitingMember.value = true
  errorMessage.value = ''

  try {
    await workspaceApi.addMember(currentWorkspaceId.value, {
      identifier: inviteIdentifier.value.trim(),
      role: inviteRole.value,
    })
    inviteIdentifier.value = ''
    inviteRole.value = 'member'
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to add workspace member'
  } finally {
    invitingMember.value = false
  }
}

const updateRole = async (member: WorkspaceMember, role: WorkspaceRole) => {
  if (!currentWorkspaceId.value || member.role === role) {
    return
  }

  errorMessage.value = ''

  try {
    await workspaceApi.updateMemberRole(currentWorkspaceId.value, member.user_id, { role })
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to update member role'
    await fetchMembers()
  }
}

const removeMember = async (member: WorkspaceMember) => {
  if (!currentWorkspaceId.value) {
    return
  }

  const confirmed = window.confirm(`Remove ${member.username} from ${currentWorkspace.value?.workspace_name}?`)
  if (!confirmed) {
    return
  }

  errorMessage.value = ''

  try {
    await workspaceApi.removeMember(currentWorkspaceId.value, member.user_id)
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to remove member'
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">Workspace control</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">Run team access like a product, not a spreadsheet.</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
          Manage workspaces, define roles, and keep every roadmap and note scoped to the right team environment.
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <div class="metric-card">
          <div class="metric-label">Workspaces</div>
          <div class="metric-value">{{ authStore.workspaces.length }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Active role</div>
          <div class="metric-value">{{ currentWorkspace ? roleLabel[currentWorkspace.role] : 'None' }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Team size</div>
          <div class="metric-value">{{ members.length }}</div>
        </div>
      </div>
    </header>

    <div v-if="errorMessage" class="mt-8 rounded-[1.75rem] border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
      {{ errorMessage }}
    </div>

    <section class="mt-10 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <div class="space-y-6">
        <div class="panel">
          <div class="panel-eyebrow">Create workspace</div>
          <h2 class="panel-title">Spin up a new team environment in minutes.</h2>
          <p class="panel-copy">
            Each workspace gets its own access boundary so operators, researchers, and stakeholders stay aligned.
          </p>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              v-model="createWorkspaceName"
              type="text"
              class="admin-input flex-1"
              placeholder="Growth Lab, Core Platform, Agent Infra..."
              @keyup.enter="handleCreateWorkspace"
            />
            <button
              @click="handleCreateWorkspace"
              :disabled="creatingWorkspace"
              class="primary-button sm:w-auto"
            >
              {{ creatingWorkspace ? 'Creating...' : 'Create workspace' }}
            </button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-eyebrow">Your workspaces</div>
          <h2 class="panel-title">Switch context without losing governance.</h2>

          <div class="mt-6 space-y-3">
            <button
              v-for="workspace in authStore.workspaces"
              :key="workspace.workspace_id"
              @click="authStore.setActiveWorkspace(workspace.workspace_id)"
              :class="[authStore.activeWorkspaceId === workspace.workspace_id ? 'workspace-card-active' : 'workspace-card']"
              class="w-full text-left"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-lg font-black tracking-tight">{{ workspace.workspace_name }}</div>
                  <div class="mt-1 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {{ workspace.workspace_slug }}
                  </div>
                </div>
                <span class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
                  {{ roleLabel[workspace.role] }}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="flex flex-col gap-3 border-b border-slate-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="panel-eyebrow">Team access</div>
            <h2 class="panel-title">{{ currentWorkspace?.workspace_name || 'Select a workspace' }}</h2>
            <p class="panel-copy">
              Invite users by username or email and control access with role-based permissions.
            </p>
          </div>
          <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
            {{ canManageMembers ? 'Manage enabled' : 'Read only' }}
          </div>
        </div>

        <div class="mt-6 rounded-[1.75rem] border border-slate-100 bg-slate-50/80 p-5">
          <div class="grid gap-3 lg:grid-cols-[1.3fr_0.7fr_auto]">
            <input
              v-model="inviteIdentifier"
              type="text"
              class="admin-input"
              :disabled="!canManageMembers || invitingMember"
              placeholder="Invite by username or email"
              @keyup.enter="handleInviteMember"
            />
            <select v-model="inviteRole" class="admin-input" :disabled="!canManageMembers || invitingMember">
              <option v-for="role in roleOptions" :key="role" :value="role">
                {{ roleLabel[role] }}
              </option>
            </select>
            <button
              @click="handleInviteMember"
              :disabled="!canManageMembers || invitingMember"
              class="primary-button whitespace-nowrap"
            >
              {{ invitingMember ? 'Inviting...' : 'Invite member' }}
            </button>
          </div>
        </div>

        <div class="mt-8 overflow-hidden rounded-[1.8rem] border border-slate-100">
          <table class="w-full border-collapse bg-white">
            <thead class="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              <tr>
                <th class="px-6 py-4">Member</th>
                <th class="px-6 py-4">Role</th>
                <th class="px-6 py-4">Joined</th>
                <th class="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody v-if="!loadingMembers" class="divide-y divide-slate-100">
              <tr v-for="member in members" :key="member.user_id" class="hover:bg-slate-50/70">
                <td class="px-6 py-5">
                  <div class="font-black text-slate-900">{{ member.username }}</div>
                  <div class="mt-1 text-sm text-slate-500">{{ member.email }}</div>
                </td>
                <td class="px-6 py-5">
                  <select
                    :value="member.role"
                    class="role-select"
                    :disabled="!canManageMembers"
                    @change="updateRole(member, ($event.target as HTMLSelectElement).value as WorkspaceRole)"
                  >
                    <option v-for="role in roleOptions" :key="role" :value="role">
                      {{ roleLabel[role] }}
                    </option>
                  </select>
                </td>
                <td class="px-6 py-5 text-sm font-semibold text-slate-500">
                  {{ new Date(member.joined_at).toLocaleDateString() }}
                </td>
                <td class="px-6 py-5 text-right">
                  <button
                    @click="removeMember(member)"
                    :disabled="!canManageMembers"
                    class="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 transition-all hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
              <tr v-if="members.length === 0">
                <td colspan="4" class="px-6 py-14 text-center text-sm font-semibold text-slate-400">
                  No team members found in this workspace yet.
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="loadingMembers" class="px-6 py-14 text-center text-sm font-semibold text-slate-400">
            Loading workspace members...
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.panel {
  @apply rounded-[2.25rem] border border-slate-100 bg-white p-7 shadow-[0_18px_70px_rgba(15,23,42,0.04)];
}

.panel-eyebrow {
  @apply text-[11px] font-black uppercase tracking-[0.28em] text-blue-600;
}

.panel-title {
  @apply mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950;
}

.panel-copy {
  @apply mt-3 text-sm leading-7 text-slate-500;
}

.metric-card {
  @apply rounded-[1.75rem] border border-slate-100 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)];
}

.metric-label {
  @apply text-[10px] font-black uppercase tracking-[0.24em] text-slate-400;
}

.metric-value {
  @apply mt-4 text-3xl font-black tracking-[-0.05em] text-slate-950;
}

.admin-input {
  @apply w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all;
}

.admin-input:focus {
  @apply border-blue-600;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.08);
}

.primary-button {
  @apply rounded-2xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] transition-all hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60;
}

.workspace-card {
  @apply rounded-[1.6rem] border border-slate-100 bg-white px-5 py-4 transition-all hover:border-blue-200 hover:bg-blue-50/30;
}

.workspace-card span {
  @apply bg-slate-100 text-slate-500;
}

.workspace-card-active {
  @apply rounded-[1.6rem] border border-blue-200 bg-blue-50/60 px-5 py-4 shadow-[0_14px_40px_rgba(37,99,235,0.12)];
}

.workspace-card-active span {
  @apply bg-blue-600 text-white;
}

.role-select {
  @apply rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 outline-none transition-all;
}

.role-select:focus {
  @apply border-blue-600;
}
</style>
