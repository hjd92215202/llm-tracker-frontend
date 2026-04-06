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
const creatingInviteLink = ref(false)
const errorMessage = ref('')
const inviteMessage = ref('')
const inviteRole = ref<WorkspaceRole>('member')
const inviteLink = ref<WorkspaceInviteLink | null>(null)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        kicker: '成员管理',
        title: '协作团队',
        summary: '管理当前空间的成员访问权限，或生成邀请链接邀请新成员加入。',
        inviteTitle: '快速邀请',
        inviteHint: '选择一个角色并生成邀请链接，发送给协作者即可。',
        inviteAction: '生成链接',
        inviteGenerating: '生成中...',
        inviteLinkLabel: '邀请链接',
        inviteLinkEmpty: '链接生成后在此显示',
        inviteRoleLabel: '授予身份',
        inviteFlowHint: '协作者打开链接后将直接加入此空间。',
        copyInvite: '复制链接',
        copied: '链接已成功复制',
        inviteExpires: '邀请链接有效期为 7 天',
        membersTitle: '空间成员',
        membersHint: '当前所有可以访问此空间的人员列表。',
        manageEnabled: '管理模式',
        readOnly: '只读模式',
        loading: '正在获取成员列表...',
        noMembers: '暂无其他协作成员。',
        inviteError: '邀请链接生成失败',
        updateError: '角色更新失败',
        removeError: '移除成员失败',
        protectedOwner: '空间必须保留至少一位所有者',
        selfHint: '无法对自己进行移除操作',
        ownerOnlyHint: '仅所有者可调整其他所有者的权限',
        removeConfirm: '确定要将 {name} 从 {workspace} 中移除吗？',
        remove: '移除',
        joinedAt: '加入于',
        totalMembers: '位成员',
        youBadge: '我',
        currentWorkspace: '当前空间',
      }
    : {
        kicker: 'Members',
        title: 'Team Access',
        summary: 'Manage who can access this workspace and their permission levels.',
        inviteTitle: 'Quick Invite',
        inviteHint: 'Choose a role and generate a link to invite new collaborators.',
        inviteAction: 'Generate Link',
        inviteGenerating: 'Generating...',
        inviteLinkLabel: 'Invite Link',
        inviteLinkEmpty: 'Link will appear here',
        inviteRoleLabel: 'Assign Role',
        inviteFlowHint: 'Collaborators can join directly via this link.',
        copyInvite: 'Copy Link',
        copied: 'Link copied to clipboard',
        inviteExpires: 'Link expires in 7 days',
        membersTitle: 'Workspace Members',
        membersHint: 'List of all people who have access to this workspace.',
        manageEnabled: 'Manager',
        readOnly: 'Read Only',
        loading: 'Fetching members...',
        noMembers: 'No other members yet.',
        inviteError: 'Failed to generate link',
        updateError: 'Failed to update role',
        removeError: 'Failed to remove member',
        protectedOwner: 'At least one owner is required',
        selfHint: 'You cannot remove yourself',
        ownerOnlyHint: 'Only owners can modify other owner roles',
        removeConfirm: 'Remove {name} from {workspace}?',
        remove: 'Remove',
        joinedAt: 'Joined',
        totalMembers: 'Members',
        youBadge: 'You',
        currentWorkspace: 'Workspace',
      },
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
        viewer: '访客',
      }
    : {
        owner: 'Owner',
        admin: 'Admin',
        member: 'Member',
        viewer: 'Viewer',
      },
)

const ownerCount = computed(() => members.value.filter((member) => member.role === 'owner').length)
const roleOptions = computed<WorkspaceRole[]>(() =>
  authStore.activeRole === 'owner' ? ['owner', 'admin', 'member', 'viewer'] : ['admin', 'member', 'viewer'],
)

const currentInviteUrl = computed(() =>
  inviteLink.value ? `${window.location.origin}${inviteLink.value.invite_url}` : '',
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
  { immediate: true },
)
</script>

<template>
  <div class="admin-page">
    <header class="max-w-4xl mb-8">
      <div class="admin-kicker">{{ copy.kicker }}</div>
      <h1 class="admin-headline mt-3">{{ copy.title }}</h1>
      <p class="admin-subtitle mt-4">{{ copy.summary }}</p>

      <div class="mt-6 flex flex-wrap gap-3">
        <div class="admin-chip-dark !px-4 !py-2">
          <span class="opacity-60 mr-2">{{ copy.currentWorkspace }}</span>
          <span class="font-bold">{{ currentWorkspace?.workspace_name || '--' }}</span>
        </div>
        <div class="admin-chip !px-4 !py-2">
          <span class="font-bold mr-1">{{ members.length }}</span>
          <span class="opacity-60">{{ copy.totalMembers }}</span>
        </div>
      </div>
    </header>

    <div v-if="errorMessage" class="product-error mb-6 px-5 py-4 text-sm font-bold shadow-sm">
      {{ errorMessage }}
    </div>

    <section class="grid gap-8 xl:grid-cols-[1fr_360px] items-start">
      <!-- 成员列表 -->
      <div class="space-y-6">
        <article class="admin-card p-6 md:p-8">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h2 class="admin-card-title text-xl">{{ copy.membersTitle }}</h2>
              <p class="admin-card-copy mt-1">{{ copy.membersHint }}</p>
            </div>
            <div :class="canManageMembers ? 'admin-chip-green' : 'admin-chip'" class="!px-4 !py-2 font-bold">
              {{ canManageMembers ? copy.manageEnabled : copy.readOnly }}
            </div>
          </div>

          <div v-if="loadingMembers" class="admin-empty py-16">
            <div class="animate-pulse flex flex-col items-center">
              <div class="h-4 w-32 bg-gray-200 rounded mb-4"></div>
              <div class="text-sm">{{ copy.loading }}</div>
            </div>
          </div>

          <div v-else-if="members.length === 0" class="admin-empty py-16">
            {{ copy.noMembers }}
          </div>

          <div v-else class="space-y-4">
            <article v-for="member in members" :key="member.user_id" 
              class="member-row group transition-all duration-200 border border-transparent hover:border-[rgba(15,23,42,0.08)] hover:bg-[rgba(15,23,42,0.02)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              
              <div class="flex items-center gap-4 flex-1">
                <div class="member-avatar-box">
                  {{ member.username?.charAt(0)?.toUpperCase() || 'U' }}
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-base font-bold text-[var(--ink-strong)] truncate">{{ member.username }}</span>
                    <span v-if="member.user_id === authStore.userId" class="admin-chip-dark !text-[10px] !px-2 !py-0.5">
                      {{ copy.youBadge }}
                    </span>
                  </div>
                  <div class="text-xs text-[var(--ink-soft)] mt-0.5 truncate">{{ member.email }}</div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                <div class="flex flex-col items-end mr-2 hidden md:flex">
                  <span class="text-[10px] uppercase tracking-wider text-[var(--ink-soft)] font-bold">{{ copy.joinedAt }}</span>
                  <span class="text-xs font-semibold">{{ formatDate(member.joined_at) }}</span>
                </div>

                <div class="relative min-w-[130px]">
                  <select
                    :value="member.role"
                    class="role-select"
                    :disabled="!canEditMemberRole(member)"
                    @change="updateRole(member, ($event.target as HTMLSelectElement).value as WorkspaceRole)"
                  >
                    <option v-for="role in roleOptions" :key="role" :value="role">
                      {{ roleLabel[role] }}
                    </option>
                  </select>
                </div>

                <button
                  class="remove-btn"
                  :class="canRemoveMember(member) ? 'remove-btn-active' : 'remove-btn-disabled'"
                  type="button"
                  :disabled="!canRemoveMember(member)"
                  :title="memberHint(member)"
                  @click="removeMember(member)"
                >
                  {{ copy.remove }}
                </button>
              </div>
            </article>
          </div>
        </article>
      </div>

      <!-- 侧边邀请栏 -->
      <aside class="space-y-6">
        <article class="admin-card overflow-hidden">
          <div class="p-6 md:p-8 bg-[rgba(229,106,43,0.03)] border-b border-[rgba(229,106,43,0.08)]">
            <h2 class="admin-card-title text-lg flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[var(--brand)]"></span>
              {{ copy.inviteTitle }}
            </h2>
            <p class="text-sm leading-relaxed text-[var(--ink-soft)] mt-3">{{ copy.inviteHint }}</p>
          </div>
          
          <div class="p-6 md:p-8 space-y-6">
            <div class="space-y-3">
              <label class="product-label text-xs uppercase tracking-widest">{{ copy.inviteRoleLabel }}</label>
              <div class="grid grid-cols-2 gap-2">
                <button 
                  v-for="role in roleOptions" 
                  :key="role"
                  type="button"
                  class="role-opt-btn"
                  :class="inviteRole === role ? 'role-opt-btn-active' : ''"
                  @click="inviteRole = role"
                >
                  {{ roleLabel[role] }}
                </button>
              </div>
            </div>

            <button
              class="product-button-primary w-full !py-4 shadow-lg shadow-[rgba(229,106,43,0.2)]"
              type="button"
              :disabled="!canManageMembers || creatingInviteLink"
              @click="handleCreateInviteLink"
            >
              {{ creatingInviteLink ? copy.inviteGenerating : copy.inviteAction }}
            </button>

            <div v-if="inviteLink || inviteMessage" class="space-y-4 pt-4 border-t border-[rgba(15,23,42,0.06)]">
              <div class="space-y-2">
                <label class="product-label text-[10px] uppercase tracking-widest text-[var(--ink-soft)]">{{ copy.inviteLinkLabel }}</label>
                <div class="relative group">
                  <input :value="currentInviteUrl || copy.inviteLinkEmpty" type="text" class="admin-input !pr-12 !bg-[rgba(15,23,42,0.02)] !text-xs font-mono" readonly />
                  <button 
                    v-if="currentInviteUrl"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white rounded-lg transition-colors"
                    @click="copyInviteLink"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </div>

              <div v-if="inviteMessage" class="rounded-xl bg-[var(--accent-soft)] px-4 py-3 text-xs font-bold text-[var(--accent)] text-center animate-in fade-in slide-in-from-top-1">
                {{ inviteMessage }}
              </div>

              <div class="flex items-center gap-2 text-[10px] font-bold text-[var(--ink-soft)] opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ copy.inviteExpires }}
              </div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.member-avatar-box {
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(15,23,42,0.05)] text-sm font-black text-[var(--ink-strong)] border border-[rgba(15,23,42,0.05)];
}

.role-select {
  @apply w-full border border-[rgba(15,23,42,0.1)] rounded-xl bg-white px-3 py-2 text-sm font-bold text-[var(--ink-main)] outline-none transition-all hover:border-[rgba(15,23,42,0.2)] focus:ring-2 focus:ring-[rgba(37,99,235,0.1)] appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%235f6b7a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
}

.remove-btn {
  @apply px-4 py-2 text-xs font-black rounded-xl transition-all;
}

.remove-btn-active {
  @apply text-[var(--danger)] bg-[rgba(220,38,38,0.05)] hover:bg-[rgba(220,38,38,0.1)];
}

.remove-btn-disabled {
  @apply text-[rgba(15,23,42,0.2)] cursor-not-allowed;
}

.role-opt-btn {
  @apply px-3 py-2.5 rounded-xl border border-[rgba(15,23,42,0.08)] bg-white text-xs font-bold text-[var(--ink-soft)] transition-all hover:border-[var(--brand)] hover:text-[var(--brand)];
}

.role-opt-btn-active {
  @apply border-[var(--brand)] bg-[rgba(229,106,43,0.05)] text-[var(--brand)] shadow-sm;
}

.member-row {
  @apply border-b border-[rgba(15,23,42,0.04)] last:border-0;
}
</style>