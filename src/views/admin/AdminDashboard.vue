<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import type { Note, RoadmapNode, WorkspaceMember } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const errorMessage = ref('')
const nodes = ref<RoadmapNode[]>([])
const notes = ref<Note[]>([])
const members = ref<WorkspaceMember[]>([])

const currentWorkspace = computed(() => authStore.activeWorkspace)
const currentRole = computed(() => authStore.activeRole ?? 'viewer')
const completedNodes = computed(() => nodes.value.filter((node) => node.status === 'completed').length)
const inProgressNodes = computed(() => nodes.value.filter((node) => node.status === 'in_progress').length)
const todoNodes = computed(() => nodes.value.filter((node) => node.status === 'todo').length)
const completionRate = computed(() => {
  if (nodes.value.length === 0) {
    return 0
  }

  return Math.round((completedNodes.value / nodes.value.length) * 100)
})

const recentNotes = computed(() =>
  [...notes.value]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 5)
)

const roleCounts = computed(() => {
  return members.value.reduce<Record<string, number>>((accumulator, member) => {
    accumulator[member.role] = (accumulator[member.role] ?? 0) + 1
    return accumulator
  }, {})
})

const onboardingChecklist = computed(() => [
  {
    title: '建立路线图结构',
    description: '至少创建 3 个 roadmap 节点，让团队知道能力建设和项目推进的主线。',
    done: nodes.value.length >= 3,
    actionLabel: '去配置路线图',
    action: () => router.push('/admin/roadmap'),
  },
  {
    title: '邀请第一批成员',
    description: '把协作者拉进 workspace，开始用角色权限管理真实协作。',
    done: members.value.length >= 2,
    actionLabel: '去管理团队',
    action: () => router.push('/admin/workspace'),
  },
  {
    title: '沉淀第一批研究笔记',
    description: '至少完成 3 条研究笔记，让工作区开始形成可复用知识。',
    done: notes.value.length >= 3,
    actionLabel: '去写笔记',
    action: () => router.push('/admin/notes'),
  },
])

const fetchDashboard = async () => {
  if (!authStore.activeWorkspaceId) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const [roadmapData, notesData, membersData] = await Promise.all([
      roadmapApi.getNodes(),
      noteApi.getAllNotes(),
      workspaceApi.listMembers(authStore.activeWorkspaceId),
    ])

    nodes.value = roadmapData
    notes.value = notesData
    members.value = membersData
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to load workspace dashboard'
  } finally {
    loading.value = false
  }
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchDashboard()
  },
  { immediate: true }
)
</script>

<template>
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">Workspace overview</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">
          {{ currentWorkspace?.workspace_name || 'Workspace' }} command center
        </h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
          在一个总览里看清团队成员、路线图推进、研究沉淀和下一步动作，让这个项目从工具逐步长成真正的知识型 SaaS 产品。
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="hero-card">
          <div class="hero-label">Current role</div>
          <div class="hero-value">{{ currentRole }}</div>
          <div class="hero-copy">当前 workspace 权限层级</div>
        </div>
        <div class="hero-card">
          <div class="hero-label">Completion rate</div>
          <div class="hero-value">{{ completionRate }}%</div>
          <div class="hero-copy">路线图已完成占比</div>
        </div>
      </div>
    </header>

    <div v-if="errorMessage" class="mt-8 rounded-[1.75rem] border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="mt-10 rounded-[2rem] border border-slate-100 bg-white px-6 py-16 text-center text-sm font-semibold text-slate-400 shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      Loading workspace dashboard...
    </div>

    <template v-else>
      <section class="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article class="metric-card">
          <div class="metric-label">Team members</div>
          <div class="metric-value">{{ members.length }}</div>
          <div class="metric-copy">当前工作区协作者数量</div>
        </article>
        <article class="metric-card">
          <div class="metric-label">Roadmap nodes</div>
          <div class="metric-value">{{ nodes.length }}</div>
          <div class="metric-copy">路径中的总节点数</div>
        </article>
        <article class="metric-card">
          <div class="metric-label">Research notes</div>
          <div class="metric-value">{{ notes.length }}</div>
          <div class="metric-copy">已沉淀的研究记录</div>
        </article>
        <article class="metric-card">
          <div class="metric-label">In progress</div>
          <div class="metric-value">{{ inProgressNodes }}</div>
          <div class="metric-copy">当前正在推进的节点</div>
        </article>
      </section>

      <section class="mt-10 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div class="panel">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="panel-eyebrow">Onboarding checklist</div>
              <h2 class="panel-title">把 workspace 从空壳推到可运营状态</h2>
            </div>
            <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              {{ onboardingChecklist.filter((item) => item.done).length }}/{{ onboardingChecklist.length }} complete
            </div>
          </div>

          <div class="mt-8 space-y-4">
            <div v-for="item in onboardingChecklist" :key="item.title" class="rounded-[1.6rem] border border-slate-100 bg-slate-50/70 p-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div class="flex items-center gap-3">
                    <span
                      :class="item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'"
                      class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
                    >
                      {{ item.done ? 'Done' : 'Next' }}
                    </span>
                    <h3 class="text-lg font-black tracking-tight text-slate-950">{{ item.title }}</h3>
                  </div>
                  <p class="mt-3 text-sm leading-7 text-slate-500">{{ item.description }}</p>
                </div>
                <button
                  @click="item.action()"
                  class="rounded-2xl bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-blue-600"
                >
                  {{ item.actionLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-eyebrow">Roadmap health</div>
          <h2 class="panel-title">看清这个工作区当前处在什么阶段</h2>

          <div class="mt-8 space-y-5">
            <div>
              <div class="mb-3 flex items-center justify-between text-sm font-bold text-slate-500">
                <span>整体完成度</span>
                <span>{{ completionRate }}%</span>
              </div>
              <div class="h-3 rounded-full bg-slate-100">
                <div class="h-3 rounded-full bg-gradient-to-r from-sky-500 to-cyan-400" :style="{ width: `${completionRate}%` }"></div>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-3">
              <div class="status-card status-card-complete">
                <div class="status-label">Completed</div>
                <div class="status-value">{{ completedNodes }}</div>
              </div>
              <div class="status-card status-card-progress">
                <div class="status-label">In progress</div>
                <div class="status-value">{{ inProgressNodes }}</div>
              </div>
              <div class="status-card status-card-todo">
                <div class="status-label">Todo</div>
                <div class="status-value">{{ todoNodes }}</div>
              </div>
            </div>

            <div class="rounded-[1.6rem] border border-slate-100 bg-slate-50/70 p-5">
              <div class="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">Suggested next move</div>
              <p class="mt-3 text-sm leading-7 text-slate-600">
                <span v-if="nodes.length === 0">先搭建最小路线图，把团队能力建设主线明确下来。</span>
                <span v-else-if="members.length <= 1">你已经有结构了，下一步应该把第一批成员拉进来一起协作。</span>
                <span v-else-if="notes.length < nodes.length">路径已经成型，建议开始补齐节点下的研究笔记和复盘。</span>
                <span v-else>当前 workspace 已经进入稳定使用阶段，可以继续扩展团队和沉淀更多可复用资产。</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="mt-10 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div class="panel">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="panel-eyebrow">Team snapshot</div>
              <h2 class="panel-title">当前成员结构</h2>
            </div>
            <button
              @click="router.push('/admin/workspace')"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 transition-all hover:border-slate-300 hover:text-slate-950"
            >
              Manage team
            </button>
          </div>

          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <div class="role-card">
              <div class="role-label">Owners</div>
              <div class="role-value">{{ roleCounts.owner ?? 0 }}</div>
            </div>
            <div class="role-card">
              <div class="role-label">Admins</div>
              <div class="role-value">{{ roleCounts.admin ?? 0 }}</div>
            </div>
            <div class="role-card">
              <div class="role-label">Members</div>
              <div class="role-value">{{ roleCounts.member ?? 0 }}</div>
            </div>
            <div class="role-card">
              <div class="role-label">Viewers</div>
              <div class="role-value">{{ roleCounts.viewer ?? 0 }}</div>
            </div>
          </div>

          <div class="mt-8 space-y-3">
            <div
              v-for="member in members.slice(0, 5)"
              :key="member.user_id"
              class="flex items-center justify-between rounded-[1.4rem] border border-slate-100 bg-slate-50/70 px-4 py-4"
            >
              <div>
                <div class="font-black text-slate-900">{{ member.username }}</div>
                <div class="mt-1 text-sm text-slate-500">{{ member.email }}</div>
              </div>
              <span class="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                {{ member.role }}
              </span>
            </div>

            <div v-if="members.length === 0" class="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm font-semibold text-slate-400">
              还没有成员加入这个 workspace。
            </div>
          </div>
        </div>

        <div class="panel">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="panel-eyebrow">Recent notes</div>
              <h2 class="panel-title">最近沉淀的研究记录</h2>
            </div>
            <button
              @click="router.push('/admin/notes')"
              class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 transition-all hover:border-slate-300 hover:text-slate-950"
            >
              View all notes
            </button>
          </div>

          <div class="mt-8 space-y-4">
            <article
              v-for="note in recentNotes"
              :key="note.id"
              class="cursor-pointer rounded-[1.6rem] border border-slate-100 bg-slate-50/70 p-5 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-[0_18px_50px_rgba(37,99,235,0.10)]"
              @click="router.push(`/note/${note.id}`)"
            >
              <div class="flex items-center justify-between gap-4">
                <div class="text-lg font-black tracking-tight text-slate-950">{{ note.title }}</div>
                <div class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {{ new Date(note.created_at).toLocaleDateString() }}
                </div>
              </div>
              <div class="mt-3 text-sm leading-7 text-slate-500">
                {{ note.summary || 'This note is capturing new context for the workspace.' }}
              </div>
            </article>

            <div v-if="recentNotes.length === 0" class="rounded-[1.6rem] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm font-semibold text-slate-400">
              当前还没有研究笔记，可以从路线图节点开始写第一条沉淀。
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.hero-card {
  @apply rounded-[1.75rem] border border-slate-100 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)];
}

.hero-label {
  @apply text-[10px] font-black uppercase tracking-[0.24em] text-slate-400;
}

.hero-value {
  @apply mt-4 text-4xl font-black tracking-[-0.06em] text-slate-950;
}

.hero-copy {
  @apply mt-2 text-sm text-slate-500;
}

.metric-card {
  @apply rounded-[1.75rem] border border-slate-100 bg-white px-5 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.04)];
}

.metric-label {
  @apply text-[10px] font-black uppercase tracking-[0.24em] text-slate-400;
}

.metric-value {
  @apply mt-4 text-4xl font-black tracking-[-0.06em] text-slate-950;
}

.metric-copy {
  @apply mt-2 text-sm text-slate-500;
}

.panel {
  @apply rounded-[2.25rem] border border-slate-100 bg-white p-7 shadow-[0_18px_70px_rgba(15,23,42,0.04)];
}

.panel-eyebrow {
  @apply text-[11px] font-black uppercase tracking-[0.28em] text-blue-600;
}

.panel-title {
  @apply mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950;
}

.status-card {
  @apply rounded-[1.5rem] border px-4 py-5;
}

.status-card-complete {
  @apply border-emerald-100 bg-emerald-50/70;
}

.status-card-progress {
  @apply border-blue-100 bg-blue-50/70;
}

.status-card-todo {
  @apply border-slate-200 bg-slate-50/70;
}

.status-label {
  @apply text-[10px] font-black uppercase tracking-[0.24em] text-slate-400;
}

.status-value {
  @apply mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950;
}

.role-card {
  @apply rounded-[1.5rem] border border-slate-100 bg-slate-50/70 px-4 py-5;
}

.role-label {
  @apply text-[10px] font-black uppercase tracking-[0.24em] text-slate-400;
}

.role-value {
  @apply mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950;
}
</style>
