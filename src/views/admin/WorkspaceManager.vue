<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceMember, WorkspaceRole } from '@/types'

const authStore = useAuthStore()
const localeStore = useLocaleStore()

const loadingMembers = ref(false)
const creatingWorkspace = ref(false)
const invitingMember = ref(false)
const members = ref<WorkspaceMember[]>([])
const errorMessage = ref('')
const createWorkspaceName = ref('')
const inviteIdentifier = ref('')
const inviteRole = ref<WorkspaceRole>('member')

const copy = computed(() =>
  localeStore.isChinese
    ? {
        eyebrow: '空间管理',
        title: '把团队、权限和协作边界管理清楚',
        summary: '这里负责管理团队空间、成员角色和协作秩序。先把边界理顺，后面的路线图、笔记和搜索体验才会稳定。',
        metrics: {
          workspaces: '空间数',
          role: '当前角色',
          teamSize: '成员数',
        },
        createEyebrow: '创建空间',
        createTitle: '为新团队或新项目开一个独立空间',
        createSummary: '每个空间都是一套清晰的协作边界，适合按团队、项目线或客户场景拆开管理。',
        createPlaceholder: '例如：增长实验室 / Agent 平台 / 客户交付',
        createAction: '创建空间',
        creating: '创建中...',
        listEyebrow: '空间列表',
        listTitle: '切换上下文，但保持治理结构清晰',
        activeTag: '当前空间',
        roleGuideTitle: '角色说明',
        roleGuide: [
          '所有者：拥有完整治理权限，可管理成员角色与空间结构。',
          '管理员：负责日常运营、成员协作和访问管理。',
          '成员：可推进路线图与笔记内容。',
          '只读：只能查看，不会看到误导性的编辑入口。',
        ],
        teamEyebrow: '成员与权限',
        teamTitle: '邀请成员，明确每个人能做什么',
        teamSummary: '通过用户名或邮箱邀请成员，再用角色控制读写能力和管理权限。',
        manageEnabled: '可管理成员',
        readOnly: '只读查看',
        invitePlaceholder: '输入用户名或邮箱',
        inviteAction: '邀请成员',
        inviting: '邀请中...',
        member: '成员',
        role: '角色',
        joined: '加入时间',
        action: '操作',
        remove: '移除',
        protectedOwner: '至少保留 1 位所有者，空间才能继续稳定管理。',
        adminOwnerHint: '只有所有者可以调整所有者角色。',
        selfHint: '你不能在这里移除自己。',
        noMembers: '这个空间里还没有成员。',
        loading: '正在加载成员列表...',
        loadError: '加载成员失败',
        emptyName: '空间名称不能为空',
        emptyInvite: '请输入用户名或邮箱',
        createError: '创建空间失败',
        inviteError: '邀请成员失败',
        updateError: '更新成员角色失败',
        removeError: '移除成员失败',
        removeConfirm: '确认将 {name} 从 {workspace} 中移除吗？',
      }
    : {
        eyebrow: 'Workspace settings',
        title: 'Keep teams, permissions, and collaboration boundaries clear',
        summary: 'This page manages workspaces, member roles, and team structure so the rest of the product stays orderly.',
        metrics: {
          workspaces: 'Workspaces',
          role: 'Current role',
          teamSize: 'Members',
        },
        createEyebrow: 'Create workspace',
        createTitle: 'Open a separate space for a new team or project',
        createSummary: 'Each workspace creates a clean collaboration boundary for a team, project line, or client context.',
        createPlaceholder: 'For example: Growth Lab / Agent Platform / Client Delivery',
        createAction: 'Create workspace',
        creating: 'Creating...',
        listEyebrow: 'Workspace list',
        listTitle: 'Switch context without losing structure',
        activeTag: 'Active',
        roleGuideTitle: 'Role guide',
        roleGuide: [
          'Owner: full governance over members and workspace structure.',
          'Admin: manages day-to-day operations and team access.',
          'Member: can move roadmap and notes forward.',
          'Viewer: read-only visibility without editing prompts.',
        ],
        teamEyebrow: 'Members and access',
        teamTitle: 'Invite teammates and set the right access',
        teamSummary: 'Invite people by username or email, then use roles to control write access and governance.',
        manageEnabled: 'Can manage members',
        readOnly: 'Read only',
        invitePlaceholder: 'Enter a username or email',
        inviteAction: 'Invite member',
        inviting: 'Inviting...',
        member: 'Member',
        role: 'Role',
        joined: 'Joined',
        action: 'Action',
        remove: 'Remove',
        protectedOwner: 'At least one owner must remain to keep workspace governance intact.',
        adminOwnerHint: 'Only an owner can change another owner role.',
        selfHint: 'You cannot remove yourself here.',
        noMembers: 'This workspace has no members yet.',
        loading: 'Loading members...',
        loadError: 'Unable to load members',
        emptyName: 'Workspace name cannot be empty',
        emptyInvite: 'Enter a username or email',
        createError: 'Unable to create workspace',
        inviteError: 'Unable to invite member',
        updateError: 'Unable to update member role',
        removeError: 'Unable to remove member',
        removeConfirm: 'Remove {name} from {workspace}?',
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

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(localeStore.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const isLastOwner = (member: WorkspaceMember) => member.role === 'owner' && ownerCount.value <= 1

const roleOptionsForMember = (member: WorkspaceMember): WorkspaceRole[] => {
  if (member.role === 'owner' && authStore.activeRole !== 'owner') {
    return ['owner']
  }
  return roleOptions.value
}

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
  if (member.role === 'owner' && authStore.activeRole !== 'owner') return copy.value.adminOwnerHint
  if (member.user_id === authStore.userId) return copy.value.selfHint
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
    errorMessage.value = error.message || copy.value.loadError
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
    errorMessage.value = copy.value.emptyName
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
    errorMessage.value = error.message || copy.value.createError
  } finally {
    creatingWorkspace.value = false
  }
}

const handleInviteMember = async () => {
  if (!currentWorkspaceId.value) return
  if (!inviteIdentifier.value.trim()) {
    errorMessage.value = copy.value.emptyInvite
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
    errorMessage.value = error.message || copy.value.inviteError
  } finally {
    invitingMember.value = false
  }
}

const updateRole = async (member: WorkspaceMember, role: WorkspaceRole) => {
  if (!currentWorkspaceId.value || member.role === role || !canEditMemberRole(member)) return

  errorMessage.value = ''

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

  const template = copy.value.removeConfirm
    .replace('{name}', member.username)
    .replace('{workspace}', currentWorkspace.value?.workspace_name || 'workspace')

  if (!window.confirm(template)) return

  errorMessage.value = ''

  try {
    await workspaceApi.removeMember(currentWorkspaceId.value, member.user_id)
    await fetchMembers()
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.removeError
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-6 py-8 lg:px-10">
    <header class="grid gap-6 xl:grid-cols-[1.08fr_0.92fr] xl:items-end">
      <div>
        <div class="product-eyebrow border border-[rgba(37,99,235,0.14)] bg-white/80 text-[var(--accent)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"></span>
          {{ copy.eyebrow }}
        </div>
        <h1 class="product-title mt-7 text-4xl leading-[0.96] md:text-6xl">{{ copy.title }}</h1>
        <p class="mt-5 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">{{ copy.summary }}</p>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <article class="metric-card">
          <div class="metric-label">{{ copy.metrics.workspaces }}</div>
          <div class="metric-value">{{ authStore.workspaces.length }}</div>
        </article>
        <article class="metric-card">
          <div class="metric-label">{{ copy.metrics.role }}</div>
          <div class="metric-value metric-value-text">{{ currentWorkspace ? roleLabel[currentWorkspace.role] : '--' }}</div>
        </article>
        <article class="metric-card">
          <div class="metric-label">{{ copy.metrics.teamSize }}</div>
          <div class="metric-value">{{ members.length }}</div>
        </article>
      </div>
    </header>

    <div v-if="errorMessage" class="product-error mt-8 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <section class="mt-8 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <div class="space-y-6">
        <article class="panel">
          <div class="panel-eyebrow">{{ copy.createEyebrow }}</div>
          <h2 class="panel-title">{{ copy.createTitle }}</h2>
          <p class="panel-copy">{{ copy.createSummary }}</p>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              v-model="createWorkspaceName"
              type="text"
              class="product-input flex-1"
              :placeholder="copy.createPlaceholder"
              @keyup.enter="handleCreateWorkspace"
            />
            <button class="product-button-primary sm:min-w-[180px]" :disabled="creatingWorkspace" type="button" @click="handleCreateWorkspace">
              {{ creatingWorkspace ? copy.creating : copy.createAction }}
            </button>
          </div>
        </article>

        <article class="panel">
          <div class="panel-eyebrow">{{ copy.listEyebrow }}</div>
          <h2 class="panel-title">{{ copy.listTitle }}</h2>

          <div class="mt-6 space-y-3">
            <button
              v-for="workspace in authStore.workspaces"
              :key="workspace.workspace_id"
              :class="authStore.activeWorkspaceId === workspace.workspace_id ? 'workspace-card workspace-card-active' : 'workspace-card'"
              class="w-full text-left"
              type="button"
              @click="authStore.setActiveWorkspace(workspace.workspace_id)"
            >
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <div class="truncate text-lg font-black tracking-tight text-[var(--ink-strong)]">
                    {{ workspace.workspace_name }}
                  </div>
                  <div class="mt-1 truncate text-sm text-[var(--ink-soft)]">
                    {{ workspace.workspace_slug }}
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="pill">{{ roleLabel[workspace.role] }}</span>
                  <span v-if="authStore.activeWorkspaceId === workspace.workspace_id" class="pill pill-active">
                    {{ copy.activeTag }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </article>

        <article class="panel">
          <div class="panel-eyebrow">{{ copy.roleGuideTitle }}</div>
          <div class="mt-5 space-y-3">
            <div v-for="item in copy.roleGuide" :key="item" class="guide-card">
              {{ item }}
            </div>
          </div>
        </article>
      </div>

      <article class="panel">
        <div class="flex flex-col gap-4 border-b border-[rgba(20,33,43,0.08)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="panel-eyebrow">{{ copy.teamEyebrow }}</div>
            <h2 class="panel-title">{{ copy.teamTitle }}</h2>
            <p class="panel-copy">{{ copy.teamSummary }}</p>
          </div>
          <div class="pill">{{ canManageMembers ? copy.manageEnabled : copy.readOnly }}</div>
        </div>

        <div class="soft-shell mt-6">
          <div class="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto]">
            <input
              v-model="inviteIdentifier"
              type="text"
              class="product-input"
              :disabled="!canManageMembers || invitingMember"
              :placeholder="copy.invitePlaceholder"
              @keyup.enter="handleInviteMember"
            />
            <select v-model="inviteRole" class="product-input" :disabled="!canManageMembers || invitingMember">
              <option v-for="role in roleOptions" :key="role" :value="role">
                {{ roleLabel[role] }}
              </option>
            </select>
            <button
              class="product-button-primary whitespace-nowrap"
              :disabled="!canManageMembers || invitingMember"
              type="button"
              @click="handleInviteMember"
            >
              {{ invitingMember ? copy.inviting : copy.inviteAction }}
            </button>
          </div>
        </div>

        <div class="table-shell mt-6">
          <table class="w-full border-collapse">
            <thead class="table-head">
              <tr>
                <th class="px-5 py-4">{{ copy.member }}</th>
                <th class="px-5 py-4">{{ copy.role }}</th>
                <th class="px-5 py-4">{{ copy.joined }}</th>
                <th class="px-5 py-4 text-right">{{ copy.action }}</th>
              </tr>
            </thead>

            <tbody v-if="!loadingMembers" class="divide-y divide-[rgba(20,33,43,0.08)]">
              <tr v-for="member in members" :key="member.user_id" class="align-top">
                <td class="px-5 py-5">
                  <div class="font-black text-[var(--ink-strong)]">{{ member.username }}</div>
                  <div class="mt-1 text-sm text-[var(--ink-soft)]">{{ member.email }}</div>
                  <p v-if="memberHint(member)" class="mt-3 text-sm leading-6 text-[var(--brand)]">
                    {{ memberHint(member) }}
                  </p>
                </td>

                <td class="px-5 py-5">
                  <select
                    :value="member.role"
                    class="member-select"
                    :disabled="!canEditMemberRole(member)"
                    @change="updateRole(member, ($event.target as HTMLSelectElement).value as WorkspaceRole)"
                  >
                    <option v-for="role in roleOptionsForMember(member)" :key="role" :value="role">
                      {{ roleLabel[role] }}
                    </option>
                  </select>
                </td>

                <td class="px-5 py-5 text-sm font-semibold text-[var(--ink-soft)]">
                  {{ formatDate(member.joined_at) }}
                </td>

                <td class="px-5 py-5 text-right">
                  <button
                    class="text-sm font-semibold transition-all"
                    :class="canRemoveMember(member) ? 'text-[var(--danger)] hover:opacity-70' : 'cursor-not-allowed text-[rgba(20,33,43,0.28)]'"
                    :disabled="!canRemoveMember(member)"
                    type="button"
                    @click="removeMember(member)"
                  >
                    {{ copy.remove }}
                  </button>
                </td>
              </tr>

              <tr v-if="members.length === 0">
                <td colspan="4" class="px-5 py-14 text-center text-sm font-semibold text-[var(--ink-soft)]">
                  {{ copy.noMembers }}
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="loadingMembers" class="px-5 py-14 text-center text-sm font-semibold text-[var(--ink-soft)]">
            {{ copy.loading }}
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.metric-card {
  @apply rounded-[1.8rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.84)] px-5 py-5 shadow-[0_14px_40px_rgba(20,33,43,0.05)];
}

.metric-label {
  @apply text-sm font-semibold text-[var(--ink-soft)];
}

.metric-value {
  @apply mt-4 font-[var(--font-display)] text-4xl font-black tracking-[-0.07em] text-[var(--ink-strong)];
}

.metric-value-text {
  @apply text-2xl leading-tight;
}

.panel {
  @apply rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.82)] p-6 shadow-[0_18px_50px_rgba(20,33,43,0.05)];
}

.panel-eyebrow {
  @apply text-sm font-bold text-[var(--accent)];
}

.panel-title {
  @apply mt-3 font-[var(--font-display)] text-3xl font-black tracking-[-0.05em] text-[var(--ink-strong)];
}

.panel-copy {
  @apply mt-3 text-sm leading-7 text-[var(--ink-soft)];
}

.workspace-card {
  @apply rounded-[1.6rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.68)] px-5 py-4 transition-all;
}

.workspace-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px rgba(20, 33, 43, 0.06);
}

.workspace-card-active {
  border-color: rgba(229, 106, 43, 0.16);
  background: rgba(255, 250, 242, 0.96);
}

.guide-card {
  @apply rounded-[1.4rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.66)] px-4 py-4 text-sm font-semibold leading-7 text-[var(--ink-main)];
}

.pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-3 py-1 text-sm font-semibold text-[var(--ink-main)];
}

.pill-active {
  @apply bg-[rgba(229,106,43,0.12)] text-[var(--brand)];
}

.soft-shell {
  @apply rounded-[1.6rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.6)] p-4;
}

.table-shell {
  @apply overflow-hidden rounded-[1.8rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.68)];
}

.table-head {
  @apply bg-[rgba(20,33,43,0.04)] text-left text-sm font-semibold text-[var(--ink-soft)];
}

.member-select {
  @apply rounded-full border border-[rgba(20,33,43,0.12)] bg-white px-3 py-2 text-sm font-semibold text-[var(--ink-main)] outline-none transition-all;
}

.member-select:focus {
  border-color: rgba(229, 106, 43, 0.42);
  box-shadow: 0 0 0 4px rgba(229, 106, 43, 0.1);
}

.member-select:disabled {
  @apply cursor-not-allowed bg-[rgba(20,33,43,0.05)] text-[rgba(20,33,43,0.34)];
}
</style>
