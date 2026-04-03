<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceInviteLink, WorkspaceMember, WorkspaceRole } from '@/types'

const authStore = useAuthStore()
const localeStore = useLocaleStore()

const members = ref<WorkspaceMember[]>([])
const loadingMembers = ref(false)
const creatingWorkspace = ref(false)
const creatingInviteLink = ref(false)
const errorMessage = ref('')
const inviteMessage = ref('')
const createWorkspaceName = ref('')
const inviteRole = ref<WorkspaceRole>('member')
const inviteLink = ref<WorkspaceInviteLink | null>(null)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        kicker: '空间',
        title: '空间与成员',
        summary: '切换空间、生成邀请链接、管理成员权限。',
        createTitle: '新建空间',
        createPlaceholder: '例如：产品增长 / 客户交付 / 研究实验',
        createAction: '创建空间',
        creating: '创建中...',
        workspacesTitle: '空间列表',
        membersTitle: '成员与权限',
        inviteTitle: '邀请链接',
        inviteSummary: '生成一个链接发给对方。对方登录或注册后，就能加入当前空间。',
        inviteAction: '生成邀请链接',
        inviteGenerating: '生成中...',
        inviteLinkLabel: '当前邀请链接',
        inviteLinkEmpty: '生成后会显示在这里',
        copyInvite: '复制链接',
        copied: '链接已复制',
        inviteExpires: '链接 7 天后失效',
        remove: '移除',
        manageEnabled: '可管理',
        readOnly: '只读查看',
        emptyName: '空间名称不能为空',
        noMembers: '这个空间还没有成员。',
        loading: '正在加载成员...',
        createError: '创建空间失败',
        inviteError: '生成邀请链接失败',
        updateError: '更新成员角色失败',
        removeError: '移除成员失败',
        protectedOwner: '至少保留一位所有者。',
        selfHint: '不能在这里移除自己。',
        ownerOnlyHint: '只有所有者可以调整所有者角色。',
        removeConfirm: '确认将 {name} 从 {workspace} 中移除吗？',
      }
    : {
        kicker: 'Workspace',
        title: 'Workspace and members',
        summary: 'Switch workspaces, generate invite links, and manage access.',
        createTitle: 'Create workspace',
        createPlaceholder: 'For example: Growth / Delivery / Research',
        createAction: 'Create workspace',
        creating: 'Creating...',
        workspacesTitle: 'Workspace list',
        membersTitle: 'Members and roles',
        inviteTitle: 'Invite link',
        inviteSummary: 'Generate one link and send it out. People can join after signing in or registering.',
        inviteAction: 'Generate invite link',
        inviteGenerating: 'Generating...',
        inviteLinkLabel: 'Current invite link',
        inviteLinkEmpty: 'The link appears here after generation',
        copyInvite: 'Copy link',
        copied: 'Link copied',
        inviteExpires: 'The link expires in 7 days',
        remove: 'Remove',
        manageEnabled: 'Can manage',
        readOnly: 'Read only',
        emptyName: 'Workspace name cannot be empty',
        noMembers: 'This workspace has no members yet.',
        loading: 'Loading members...',
        createError: 'Unable to create workspace',
        inviteError: 'Unable to generate invite link',
        updateError: 'Unable to update member role',
        removeError: 'Unable to remove member',
        protectedOwner: 'At least one owner must remain.',
        selfHint: 'You cannot remove yourself here.',
        ownerOnlyHint: 'Only an owner can change another owner role.',
        removeConfirm: 'Remove {name} from {workspace}?',
      }
)

const currentWorkspaceId = computed(() => authStore.activeWorkspaceId)
const canManageMembers = computed(() => authStore.canManageMembers)

const roleLabel = computed<Record<WorkspaceRole, string>>(() =>
  localeStore.isChinese
    ? {
        owner: '所有者',
        admin: '管理员',
        member: '成员',
        viewer: '只读',
      }
    : {
        owner: 'Owner',
        admin: 'Admin',
        member: 'Member',
        viewer: 'Viewer',
      }
)

const ownerCount = computed(() => members.value.filter((member) => member.role === 'owner').length)
const roleOptions = computed<WorkspaceRole[]>(() =>
  authStore.activeRole === 'owner' ? ['owner', 'admin', 'member', 'viewer'] : ['admin', 'member', 'viewer']
)

const currentInviteUrl = computed(() =>
  inviteLink.value ? `${window.location.origin}${inviteLink.value.invite_url}` : ''
)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(localeStore.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const isLastOwner = (member: WorkspaceMember) => member.role === 'owner' && ownerCount.value <= 1

const canEditMemberRole = (member: WorkspaceMember) => {
  if (!canManageMembers.value) return false
  if (member.role === 'owner' && authStore.activeRole !== 'owner') return false
  if (isLastOwner(member)) return false
  return true
}

const canRemoveMember = (member: WorkspaceMember) => {
  if (!canManageMembers.value) return false
  if (member.user_id === authStore.userId) return false
  if (member.role === 'owner' && authStore.activeRole !== 'owner') return false
  if (isLastOwner(member)) return false
  return true
}

const memberHint = (member: WorkspaceMember) => {
  if (isLastOwner(member)) return copy.value.protectedOwner
  if (member.user_id === authStore.userId) return copy.value.selfHint
  if (member.role === 'owner' && authStore.activeRole !== 'owner') return copy.value.ownerOnlyHint
  return ''
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
    members.value = []
    errorMessage.value = error.message || copy.value.loading
  } finally {
    loadingMembers.value = false
  }
}

const handleCreateWorkspace = async () => {
  if (!createWorkspaceName.value.trim()) {
    errorMessage.value = copy.value.emptyName
    return
  }

  creatingWorkspace.value = true
  errorMessage.value = ''

  try {
    const workspace = await workspaceApi.createWorkspace({ name: createWorkspaceName.value.trim() })
    authStore.appendWorkspace(workspace)
    createWorkspaceName.value = ''
    inviteLink.value = null
    inviteMessage.value = ''
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.createError
  } finally {
    creatingWorkspace.value = false
  }
}

const handleCreateInviteLink = async () => {
  if (!currentWorkspaceId.value || !canManageMembers.value) return

  creatingInviteLink.value = true
  errorMessage.value = ''
  inviteMessage.value = ''

  try {
    inviteLink.value = await workspaceApi.createInviteLink(currentWorkspaceId.value, {
      role: inviteRole.value,
    })
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.inviteError
  } finally {
    creatingInviteLink.value = false
  }
}

const copyInviteLink = async () => {
  if (!currentInviteUrl.value) return

  try {
    await navigator.clipboard.writeText(currentInviteUrl.value)
    inviteMessage.value = copy.value.copied
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.inviteError
  }
}

const updateRole = async (member: WorkspaceMember, role: WorkspaceRole) => {
  if (!currentWorkspaceId.value || member.role === role || !canEditMemberRole(member)) return

  try {
    await workspaceApi.updateMemberRole(currentWorkspaceId.value, member.user_id, { role })
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.updateError
    await fetchMembers()
  }
}

const removeMember = async (member: WorkspaceMember) => {
  if (!currentWorkspaceId.value || !canRemoveMember(member)) return

  const text = copy.value.removeConfirm
    .replace('{name}', member.username)
    .replace('{workspace}', authStore.activeWorkspace?.workspace_name || 'workspace')

  if (!window.confirm(text)) return

  try {
    await workspaceApi.removeMember(currentWorkspaceId.value, member.user_id)
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.removeError
  }
}

watch(
  () => currentWorkspaceId.value,
  () => {
    inviteLink.value = null
    inviteMessage.value = ''
    fetchMembers()
  },
  { immediate: true }
)
</script>

<template>
  <div class="admin-page">
    <header class="max-w-4xl">
      <div class="admin-kicker">{{ copy.kicker }}</div>
      <h1 class="admin-headline mt-3">{{ copy.title }}</h1>
      <p class="admin-subtitle mt-5">{{ copy.summary }}</p>
    </header>

    <div v-if="errorMessage" class="product-error mt-5 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <section class="mt-6 grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
      <div class="space-y-6">
        <article class="admin-card p-6">
          <div class="admin-card-title">{{ copy.createTitle }}</div>
          <div class="mt-4 flex flex-col gap-3">
            <input
              v-model="createWorkspaceName"
              type="text"
              class="admin-input"
              :placeholder="copy.createPlaceholder"
              @keyup.enter="handleCreateWorkspace"
            />
            <button class="product-button-dark w-full" type="button" :disabled="creatingWorkspace" @click="handleCreateWorkspace">
              {{ creatingWorkspace ? copy.creating : copy.createAction }}
            </button>
          </div>
        </article>

        <article class="admin-card p-6">
          <div class="admin-card-title">{{ copy.workspacesTitle }}</div>
          <div class="mt-5 space-y-3">
            <button
              v-for="workspace in authStore.workspaces"
              :key="workspace.workspace_id"
              type="button"
              class="admin-list-card w-full text-left"
              :class="authStore.activeWorkspaceId === workspace.workspace_id ? 'border-[rgba(15,23,42,0.16)]' : ''"
              @click="authStore.setActiveWorkspace(workspace.workspace_id)"
            >
              <div class="min-w-0">
                <div class="truncate text-base font-semibold text-[var(--ink-strong)]">{{ workspace.workspace_name }}</div>
                <div class="mt-1 truncate text-sm text-[var(--ink-soft)]">{{ roleLabel[workspace.role] }}</div>
              </div>
            </button>
          </div>
        </article>
      </div>

      <div class="space-y-6">
        <article class="admin-card p-6">
          <div class="flex items-center justify-between gap-3">
            <div class="admin-card-title">{{ copy.inviteTitle }}</div>
            <span :class="canManageMembers ? 'admin-chip-dark' : 'admin-chip'">
              {{ canManageMembers ? copy.manageEnabled : copy.readOnly }}
            </span>
          </div>

          <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ copy.inviteSummary }}</p>

          <div class="mt-5 grid gap-3 lg:grid-cols-[180px_auto]">
            <select v-model="inviteRole" class="admin-select" :disabled="!canManageMembers || creatingInviteLink">
              <option v-for="role in roleOptions" :key="role" :value="role">
                {{ roleLabel[role] }}
              </option>
            </select>

            <button
              class="product-button-dark"
              type="button"
              :disabled="!canManageMembers || creatingInviteLink"
              @click="handleCreateInviteLink"
            >
              {{ creatingInviteLink ? copy.inviteGenerating : copy.inviteAction }}
            </button>
          </div>

          <div class="mt-5 space-y-3">
            <label class="product-label">{{ copy.inviteLinkLabel }}</label>
            <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px]">
              <input
                :value="currentInviteUrl || copy.inviteLinkEmpty"
                type="text"
                class="admin-input"
                readonly
              />
              <button
                class="product-button-secondary"
                type="button"
                :disabled="!currentInviteUrl"
                @click="copyInviteLink"
              >
                {{ copy.copyInvite }}
              </button>
            </div>
            <div class="text-sm text-[var(--ink-soft)]">
              {{ inviteMessage || copy.inviteExpires }}
            </div>
          </div>
        </article>

        <article class="admin-card p-6">
          <div class="flex items-center justify-between gap-3">
            <div class="admin-card-title">{{ copy.membersTitle }}</div>
            <span :class="canManageMembers ? 'admin-chip-dark' : 'admin-chip'">
              {{ canManageMembers ? copy.manageEnabled : copy.readOnly }}
            </span>
          </div>

          <div v-if="loadingMembers" class="admin-empty mt-5">
            {{ copy.loading }}
          </div>

          <div v-else-if="members.length === 0" class="admin-empty mt-5">
            {{ copy.noMembers }}
          </div>

          <div v-else class="mt-5 space-y-3">
            <article v-for="member in members" :key="member.user_id" class="admin-list-card">
              <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_120px_auto] lg:items-start">
                <div class="min-w-0">
                  <div class="text-base font-semibold text-[var(--ink-strong)]">{{ member.username }}</div>
                  <div class="mt-1 text-sm text-[var(--ink-soft)]">{{ member.email }}</div>
                  <p v-if="memberHint(member)" class="mt-2 text-sm text-[var(--danger)]">{{ memberHint(member) }}</p>
                </div>

                <select
                  :value="member.role"
                  class="admin-select"
                  :disabled="!canEditMemberRole(member)"
                  @change="updateRole(member, ($event.target as HTMLSelectElement).value as WorkspaceRole)"
                >
                  <option v-for="role in roleOptions" :key="role" :value="role">
                    {{ roleLabel[role] }}
                  </option>
                </select>

                <div class="pt-3 text-sm text-[var(--ink-soft)] lg:pt-0">
                  {{ formatDate(member.joined_at) }}
                </div>

                <button
                  class="text-sm font-semibold"
                  :class="canRemoveMember(member) ? 'text-[var(--danger)]' : 'cursor-not-allowed text-[rgba(15,23,42,0.3)]'"
                  type="button"
                  :disabled="!canRemoveMember(member)"
                  @click="removeMember(member)"
                >
                  {{ copy.remove }}
                </button>
              </div>
            </article>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
