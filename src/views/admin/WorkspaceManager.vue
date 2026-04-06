<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Users } from 'lucide-vue-next'
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

// Modal 状态
const isRemoveConfirmOpen = ref(false)
const memberToRemove = ref<WorkspaceMember | null>(null)

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
        cancel: '取消',
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
        cancel: 'Cancel',
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
    window.setTimeout(() => {
      inviteMessage.value = ''
    }, 3000)
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

const triggerRemoveMember = (member: WorkspaceMember) => {
  if (!canRemoveMember(member)) return
  memberToRemove.value = member
  isRemoveConfirmOpen.value = true
}

const executeRemoveMember = async () => {
  if (!currentWorkspaceId.value || !memberToRemove.value) return

  try {
    await workspaceApi.removeMember(currentWorkspaceId.value, memberToRemove.value.user_id)
    isRemoveConfirmOpen.value = false
    memberToRemove.value = null
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
  <div class="admin-page max-w-[1200px] mx-auto">
    <!-- 顶部 Header -->
    <header class="mb-8">
      <div class="text-xs font-bold tracking-widest text-[var(--ink-soft)] uppercase">{{ copy.kicker }}</div>
      <h1 class="mt-2 text-3xl md:text-4xl font-black tracking-tight text-[var(--ink-strong)]">{{ copy.title }}</h1>
      <p class="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)] max-w-2xl">{{ copy.summary }}</p>

      <div class="mt-6 flex flex-wrap gap-3">
        <div class="inline-flex items-center rounded-full bg-[var(--ink-strong)] px-4 py-2 text-xs text-white shadow-sm">
          <span class="opacity-70 mr-2">{{ copy.currentWorkspace }}</span>
          <span class="font-bold">{{ currentWorkspace?.workspace_name || '--' }}</span>
        </div>
        <div class="inline-flex items-center rounded-full bg-white border border-gray-200 px-4 py-2 text-xs text-[var(--ink-main)] shadow-sm">
          <span class="font-black mr-1.5">{{ members.length }}</span>
          <span class="font-medium text-gray-500">{{ copy.totalMembers }}</span>
        </div>
      </div>
    </header>

    <div v-if="errorMessage" class="rounded-2xl border border-red-200 bg-red-50 text-red-600 mb-6 px-5 py-4 text-sm font-bold shadow-sm">
      {{ errorMessage }}
    </div>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] items-start">
      <!-- 左侧：成员列表面板 -->
      <article class="rounded-[24px] border border-gray-100 bg-white p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 class="text-xl font-black text-[var(--ink-strong)]">{{ copy.membersTitle }}</h2>
            <p class="text-sm text-gray-500 mt-1">{{ copy.membersHint }}</p>
          </div>
          <div class="px-3 py-1.5 rounded-lg text-xs font-bold" :class="canManageMembers ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'">
            {{ canManageMembers ? copy.manageEnabled : copy.readOnly }}
          </div>
        </div>

        <div v-if="loadingMembers" class="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
          <div class="animate-pulse flex flex-col items-center">
            <div class="h-4 w-32 bg-gray-200 rounded mb-4"></div>
            <div class="text-sm font-medium text-gray-400">{{ copy.loading }}</div>
          </div>
        </div>

        <div v-else-if="members.length === 0" class="py-16 text-center border border-dashed border-gray-200 rounded-2xl bg-gray-50/50 flex flex-col items-center justify-center gap-3">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
            <Users :size="24" />
          </div>
          <div class="text-sm font-bold text-gray-600">{{ copy.noMembers }}</div>
        </div>

        <div v-else class="space-y-1">
          <article v-for="member in members" :key="member.user_id" 
            class="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 -mx-4 rounded-2xl hover:bg-gray-50/80 transition-colors">
            
            <div class="flex items-center gap-4 flex-1 min-w-0">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-black text-gray-700 border border-gray-200/50 shadow-sm">
                {{ member.username?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-[15px] font-bold text-gray-900 truncate">{{ member.username }}</span>
                  <span v-if="member.user_id === authStore.userId" class="px-2 py-0.5 rounded-md bg-gray-900 text-white text-[10px] font-bold">
                    {{ copy.youBadge }}
                  </span>
                </div>
                <div class="text-xs font-medium text-gray-500 mt-0.5 truncate">{{ member.email }}</div>
              </div>
            </div>

            <div class="flex items-center gap-3 sm:justify-end">
              <div class="flex flex-col items-end mr-2 hidden md:flex">
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">{{ copy.joinedAt }}</span>
                <span class="text-xs font-semibold text-gray-600 mt-0.5">{{ formatDate(member.joined_at) }}</span>
              </div>

              <!-- 纯 Tailwind 构建的原生 Select，极致稳定 -->
              <div class="relative min-w-[120px]">
                <select
                  :value="member.role"
                  class="w-full appearance-none bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200 text-gray-700 text-sm font-bold rounded-xl pl-3 pr-8 py-2 transition-colors outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 cursor-pointer"
                  :disabled="!canEditMemberRole(member)"
                  @change="updateRole(member, ($event.target as HTMLSelectElement).value as WorkspaceRole)"
                >
                  <option v-for="role in roleOptions" :key="role" :value="role">
                    {{ roleLabel[role] }}
                  </option>
                </select>
                <div class="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>

              <button
                class="px-3 py-2 text-sm font-bold rounded-xl transition-all"
                :class="canRemoveMember(member) ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-300 cursor-not-allowed'"
                type="button"
                :disabled="!canRemoveMember(member)"
                :title="memberHint(member)"
                @click="triggerRemoveMember(member)"
              >
                {{ copy.remove }}
              </button>
            </div>
          </article>
        </div>
      </article>

      <!-- 右侧：快速邀请面板 -->
      <aside class="space-y-6">
        <article class="rounded-[24px] border border-[rgba(229,106,43,0.15)] bg-gradient-to-b from-[rgba(229,106,43,0.03)] to-transparent shadow-[0_8px_30px_rgba(229,106,43,0.05)] overflow-hidden">
          <div class="p-6 md:p-8 border-b border-[rgba(229,106,43,0.08)]">
            <h2 class="text-xl font-black text-[var(--ink-strong)] flex items-center gap-2.5">
              <span class="w-2.5 h-2.5 rounded-full bg-[#e56a2b]"></span>
              {{ copy.inviteTitle }}
            </h2>
            <p class="text-sm leading-relaxed text-[var(--ink-soft)] mt-3">{{ copy.inviteHint }}</p>
          </div>
          
          <div class="p-6 md:p-8 space-y-6">
            <!-- 100% 纯 Tailwind 构建的网格选择器，告别失效 Bug -->
            <div class="space-y-3">
              <label class="text-xs font-bold uppercase tracking-wider text-gray-500">{{ copy.inviteRoleLabel }}</label>
              <div class="grid grid-cols-2 gap-2.5">
                <button 
                  v-for="role in roleOptions" 
                  :key="role"
                  type="button"
                  class="relative flex items-center justify-center px-3 py-3 text-sm font-bold rounded-xl border-2 transition-all outline-none"
                  :class="inviteRole === role 
                    ? 'border-[#e56a2b] bg-[#e56a2b]/10 text-[#e56a2b]' 
                    : 'border-transparent bg-white shadow-sm text-gray-500 hover:bg-gray-50 hover:text-gray-800 hover:border-gray-200'"
                  @click="inviteRole = role"
                >
                  {{ roleLabel[role] }}
                  <!-- 选中态小圆点 -->
                  <span v-if="inviteRole === role" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#e56a2b]"></span>
                </button>
              </div>
            </div>

            <!-- 生成按钮 -->
            <button
              class="w-full flex items-center justify-center px-4 py-3.5 rounded-xl bg-[var(--ink-strong)] text-white font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/10"
              type="button"
              :disabled="!canManageMembers || creatingInviteLink"
              @click="handleCreateInviteLink"
            >
              {{ creatingInviteLink ? copy.inviteGenerating : copy.inviteAction }}
            </button>

            <!-- 链接展示区 -->
            <div v-if="inviteLink || inviteMessage" class="space-y-4 pt-5 border-t border-[rgba(15,23,42,0.06)] animate-in fade-in slide-in-from-top-2">
              <div class="space-y-2">
                <label class="text-[10px] font-bold uppercase tracking-widest text-gray-400">{{ copy.inviteLinkLabel }}</label>
                <div class="relative group">
                  <input 
                    :value="currentInviteUrl || copy.inviteLinkEmpty" 
                    type="text" 
                    class="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm font-mono text-gray-600 outline-none focus:border-[#e56a2b] focus:ring-2 focus:ring-[#e56a2b]/10 transition-all" 
                    readonly 
                  />
                  <button 
                    v-if="currentInviteUrl"
                    class="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#e56a2b] hover:bg-orange-50 rounded-lg transition-colors"
                    @click="copyInviteLink"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </div>

              <!-- 成功提示 Toast -->
              <div v-if="inviteMessage" class="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-600 animate-in fade-in zoom-in-95">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                {{ inviteMessage }}
              </div>

              <div class="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ copy.inviteExpires }}
              </div>
            </div>
          </div>
        </article>
      </aside>
    </section>

    <!-- 全局 Teleport 模态框，用于安全操作确认 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isRemoveConfirmOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" @click="isRemoveConfirmOpen = false"></div>
          <div class="relative w-full max-w-sm rounded-[24px] bg-white p-7 text-center shadow-2xl">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-5">
              <svg class="h-7 w-7 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </div>
            <h3 class="text-xl font-black tracking-tight text-gray-900">
              {{ localeStore.isChinese ? '移除成员' : 'Remove Member' }}
            </h3>
            <p class="mt-3 text-sm leading-relaxed text-gray-500">
              {{ copy.removeConfirm.replace('{name}', memberToRemove?.username || '').replace('{workspace}', currentWorkspace?.workspace_name || '') }}
            </p>
            <div class="mt-8 flex gap-3">
              <button class="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors" type="button" @click="isRemoveConfirmOpen = false">
                {{ copy.cancel }}
              </button>
              <button class="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all" type="button" @click="executeRemoveMember">
                {{ copy.remove }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* Modal Transition Animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95) translateY(10px);
}
</style>