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
        summary: '先切换当前空间，再邀请成员加入。',
        currentTitle: '当前空间',
        currentHint: '你现在正在推进的空间',
        createTitle: '新建空间',
        createPlaceholder: '例如：产品增长 / 客户交付 / 研究实验',
        createAction: '创建空间',
        creating: '创建中...',
        inviteTitle: '邀请加入',
        inviteHint: '发给对方即可加入当前空间',
        inviteAction: '生成邀请链接',
        inviteGenerating: '生成中...',
        inviteLinkLabel: '邀请链接',
        inviteLinkEmpty: '生成后显示在这里',
        inviteRoleLabel: '加入身份',
        copyInvite: '复制链接',
        copied: '链接已复制',
        inviteExpires: '链接 7 天后失效',
        membersTitle: '成员',
        manageEnabled: '可管理',
        readOnly: '只读',
        loading: '正在加载成员...',
        noMembers: '当前还没有其他成员。',
        emptyName: '空间名称不能为空',
        createError: '创建空间失败',
        inviteError: '生成邀请链接失败',
        updateError: '更新成员角色失败',
        removeError: '移除成员失败',
        protectedOwner: '至少保留一位所有者。',
        selfHint: '不能在这里移除自己。',
        ownerOnlyHint: '只有所有者可以调整所有者角色。',
        removeConfirm: '确认将 {name} 从 {workspace} 中移除吗？',
        remove: '移除',
        joinedAt: '加入时间',
        totalMembers: '成员',
        totalSpaces: '空间',
        currentBadge: '当前',
      }
    : {
        kicker: 'Workspace',
        title: 'Workspace and members',
        summary: 'Switch the active workspace first, then invite people into it.',
        currentTitle: 'Current workspace',
        currentHint: 'The space you are working in now',
        createTitle: 'Create workspace',
        createPlaceholder: 'For example: Growth / Delivery / Research',
        createAction: 'Create workspace',
        creating: 'Creating...',
        inviteTitle: 'Invite people',
        inviteHint: 'Send the link and they can join this workspace',
        inviteAction: 'Generate invite link',
        inviteGenerating: 'Generating...',
        inviteLinkLabel: 'Invite link',
        inviteLinkEmpty: 'The link appears here after generation',
        inviteRoleLabel: 'Role',
        copyInvite: 'Copy link',
        copied: 'Link copied',
        inviteExpires: 'The link expires in 7 days',
        membersTitle: 'Members',
        manageEnabled: 'Can manage',
        readOnly: 'Read only',
        loading: 'Loading members...',
        noMembers: 'There are no other members yet.',
        emptyName: 'Workspace name cannot be empty',
        createError: 'Unable to create workspace',
        inviteError: 'Unable to generate invite link',
        updateError: 'Unable to update member role',
        removeError: 'Unable to remove member',
        protectedOwner: 'At least one owner must remain.',
        selfHint: 'You cannot remove yourself here.',
        ownerOnlyHint: 'Only an owner can change another owner role.',
        removeConfirm: 'Remove {name} from {workspace}?',
        remove: 'Remove',
        joinedAt: 'Joined',
        totalMembers: 'Members',
        totalSpaces: 'Workspaces',
        currentBadge: 'Current',
      }
)

const currentWorkspaceId = computed(() => authStore.activeWorkspaceId)
const currentWorkspace = computed(() => authStore.activeWorkspace)
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
    .replace('{workspace}', currentWorkspace.value?.workspace_name || 'workspace')

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

    <section class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="space-y-6">
        <article class="admin-card p-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="admin-card-title">{{ copy.currentTitle }}</div>
              <p class="admin-card-copy">{{ copy.currentHint }}</p>
              <div class="mt-4 text-2xl font-bold tracking-[-0.04em] text-[var(--ink-strong)]">
                {{ currentWorkspace?.workspace_name || '--' }}
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <span class="admin-chip">{{ copy.totalSpaces }} {{ authStore.workspaces.length }}</span>
              <span class="admin-chip">{{ copy.totalMembers }} {{ members.length }}</span>
              <span v-if="authStore.activeRole" class="admin-chip-dark">{{ roleLabel[authStore.activeRole] }}</span>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <button
              v-for="workspace in authStore.workspaces"
              :key="workspace.workspace_id"
              type="button"
              class="workspace-switcher-card"
              :class="authStore.activeWorkspaceId === workspace.workspace_id ? 'workspace-switcher-card-active' : ''"
              @click="authStore.setActiveWorkspace(workspace.workspace_id)"
            >
              <div class="min-w-0">
                <div class="truncate text-base font-semibold text-[var(--ink-strong)]">{{ workspace.workspace_name }}</div>
                <div class="mt-1 text-sm text-[var(--ink-soft)]">{{ roleLabel[workspace.role] }}</div>
              </div>
              <span v-if="authStore.activeWorkspaceId === workspace.workspace_id" class="admin-chip-dark">{{ copy.currentBadge }}</span>
            </button>
          </div>
        </article>

        <article class="admin-card p-6">
          <div class="admin-card-title">{{ copy.membersTitle }}</div>

          <div v-if="loadingMembers" class="admin-empty mt-5">
            {{ copy.loading }}
          </div>

          <div v-else-if="members.length === 0" class="admin-empty mt-5">
            {{ copy.noMembers }}
          </div>

          <div v-else class="mt-5 space-y-3">
            <article v-for="member in members" :key="member.user_id" class="member-row">
              <div class="min-w-0">
                <div class="text-base font-semibold text-[var(--ink-strong)]">{{ member.username }}</div>
                <div class="mt-1 text-sm text-[var(--ink-soft)]">{{ member.email }}</div>
                <p v-if="memberHint(member)" class="mt-2 text-sm text-[var(--danger)]">{{ memberHint(member) }}</p>
              </div>

              <div class="member-row-side">
                <select
                  :value="member.role"
                  class="admin-select !min-w-[130px]"
                  :disabled="!canEditMemberRole(member)"
                  @change="updateRole(member, ($event.target as HTMLSelectElement).value as WorkspaceRole)"
                >
                  <option v-for="role in roleOptions" :key="role" :value="role">
                    {{ roleLabel[role] }}
                  </option>
                </select>

                <div class="text-sm text-[var(--ink-soft)]">
                  {{ copy.joinedAt }} {{ formatDate(member.joined_at) }}
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

      <div class="space-y-6">
        <article class="admin-card p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="admin-card-title">{{ copy.inviteTitle }}</div>
              <p class="admin-card-copy">{{ copy.inviteHint }}</p>
            </div>
            <span :class="canManageMembers ? 'admin-chip-dark' : 'admin-chip'">
              {{ canManageMembers ? copy.manageEnabled : copy.readOnly }}
            </span>
          </div>

          <div class="mt-5 space-y-4">
            <div class="space-y-2">
              <label class="product-label">{{ copy.inviteRoleLabel }}</label>
              <select v-model="inviteRole" class="admin-select" :disabled="!canManageMembers || creatingInviteLink">
                <option v-for="role in roleOptions" :key="role" :value="role">
                  {{ roleLabel[role] }}
                </option>
              </select>
            </div>

            <button
              class="product-button-dark w-full"
              type="button"
              :disabled="!canManageMembers || creatingInviteLink"
              @click="handleCreateInviteLink"
            >
              {{ creatingInviteLink ? copy.inviteGenerating : copy.inviteAction }}
            </button>

            <div class="space-y-2">
              <label class="product-label">{{ copy.inviteLinkLabel }}</label>
              <input :value="currentInviteUrl || copy.inviteLinkEmpty" type="text" class="admin-input" readonly />
            </div>

            <button class="product-button-secondary w-full" type="button" :disabled="!currentInviteUrl" @click="copyInviteLink">
              {{ copy.copyInvite }}
            </button>

            <div class="text-sm text-[var(--ink-soft)]">
              {{ inviteMessage || copy.inviteExpires }}
            </div>
          </div>
        </article>

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
            <button class="product-button-secondary w-full" type="button" :disabled="creatingWorkspace" @click="handleCreateWorkspace">
              {{ creatingWorkspace ? copy.creating : copy.createAction }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.workspace-switcher-card {
  @apply flex w-full items-center justify-between gap-3 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.94)] px-4 py-4 text-left transition-all;
}

.workspace-switcher-card:hover {
  border-color: rgba(15, 23, 42, 0.14);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}

.workspace-switcher-card-active {
  border-color: rgba(229, 106, 43, 0.18);
  background: rgba(255, 250, 242, 0.92);
}

.member-row {
  @apply flex flex-col gap-4 rounded-[20px] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.94)] p-4 xl:flex-row xl:items-center xl:justify-between;
}

.member-row-side {
  @apply flex flex-col gap-3 xl:items-end;
}
</style>
