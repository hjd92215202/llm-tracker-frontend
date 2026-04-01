<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceActivity, WorkspaceActivityResponse } from '@/types'

type ActivityFilter = 'all' | 'member_joined' | 'note_created' | 'roadmap_updated'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const loading = ref(false)
const errorMessage = ref('')
const activityResponse = ref<WorkspaceActivityResponse | null>(null)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        eyebrow: 'Activity Center',
        title: '追踪团队最近发生了什么',
        summary:
          '把成员加入、笔记沉淀和 roadmap 变更汇总成一条可读的运营时间线，方便负责人判断这个 workspace 是否真正持续在推进。',
        readonly:
          '当前角色为只读视角，你可以查看协作动态和执行信号，但不会看到误导性的写操作入口。',
        writable:
          '当前角色可以继续推进 roadmap 与 notes，Activity Center 会帮助你追踪协作是否形成闭环。',
        filters: {
          all: '全部动态',
          member_joined: '成员加入',
          note_created: '新建笔记',
          roadmap_updated: '更新节点',
        },
        activeFilter: '当前筛选',
        totalItems: '动态数量',
        workspace: '当前 Workspace',
        loading: '正在加载 activity feed...',
        errorFallback: '无法加载 activity feed',
        empty: '当前筛选下还没有动态。你可以先邀请成员、创建笔记，或推动 roadmap 节点进入下一阶段。',
        open: '打开',
        happenedAt: '发生时间',
        noWorkspace: '当前没有可用的 workspace 上下文。',
      }
    : {
        eyebrow: 'Activity Center',
        title: 'Track what the team is doing now',
        summary:
          'Turn member joins, note creation, and roadmap updates into one readable operating timeline so the team can quickly see whether the workspace is truly moving.',
        readonly:
          'This role is read-only. You can review collaboration signals without being nudged toward actions you cannot take.',
        writable:
          'This role can move roadmap and notes forward. Activity Center helps you confirm whether collaboration is compounding.',
        filters: {
          all: 'All activity',
          member_joined: 'Member joined',
          note_created: 'Note created',
          roadmap_updated: 'Roadmap updated',
        },
        activeFilter: 'Active filter',
        totalItems: 'Activity items',
        workspace: 'Workspace',
        loading: 'Loading activity feed...',
        errorFallback: 'Unable to load activity feed',
        empty:
          'There is no activity for the current filter yet. Invite a teammate, create a note, or update a roadmap node to start the feed.',
        open: 'Open',
        happenedAt: 'Happened at',
        noWorkspace: 'There is no active workspace context right now.',
      }
)

const currentFilter = computed<ActivityFilter>(() => {
  const value = typeof route.query.type === 'string' ? route.query.type : 'all'
  if (value === 'member_joined' || value === 'note_created' || value === 'roadmap_updated') {
    return value
  }
  return 'all'
})

const filterOptions = computed(() => [
  { value: 'all' as const, label: copy.value.filters.all },
  { value: 'member_joined' as const, label: copy.value.filters.member_joined },
  { value: 'note_created' as const, label: copy.value.filters.note_created },
  { value: 'roadmap_updated' as const, label: copy.value.filters.roadmap_updated },
])

const currentWorkspaceName = computed(
  () => activityResponse.value?.workspace.workspace_name ?? authStore.activeWorkspace?.workspace_name ?? '--'
)

const activityItems = computed(() => activityResponse.value?.items ?? [])

const fetchActivity = async () => {
  if (!authStore.activeWorkspaceId) {
    activityResponse.value = null
    errorMessage.value = copy.value.noWorkspace
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    activityResponse.value = await workspaceApi.getActivity(authStore.activeWorkspaceId, {
      type: currentFilter.value === 'all' ? undefined : currentFilter.value,
      limit: 30,
    })
  } catch (error: any) {
    activityResponse.value = null
    errorMessage.value = error.message || copy.value.errorFallback
  } finally {
    loading.value = false
  }
}

const updateFilter = (value: ActivityFilter) => {
  router.replace({
    name: 'admin-activity',
    query: value === 'all' ? {} : { type: value },
  })
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString(localeStore.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const badgeLabel = (item: WorkspaceActivity) => {
  if (item.type === 'member_joined') {
    return copy.value.filters.member_joined
  }
  if (item.type === 'note_created') {
    return copy.value.filters.note_created
  }
  if (item.type === 'roadmap_updated') {
    return copy.value.filters.roadmap_updated
  }
  return copy.value.filters.all
}

const openLink = (href: string) => {
  router.push(href)
}

watch(
  () => [authStore.activeWorkspaceId, currentFilter.value],
  () => {
    fetchActivity()
  },
  { immediate: true }
)
</script>

<template>
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">{{ copy.eyebrow }}</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">{{ copy.title }}</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">{{ copy.summary }}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="hero-card">
          <div class="hero-label">{{ copy.workspace }}</div>
          <div class="hero-value hero-value-sm">{{ currentWorkspaceName }}</div>
          <div class="hero-copy">{{ authStore.hasWriteAccess ? copy.writable : copy.readonly }}</div>
        </div>
        <div class="hero-card">
          <div class="hero-label">{{ copy.totalItems }}</div>
          <div class="hero-value">{{ activityResponse?.total_items ?? 0 }}</div>
          <div class="hero-copy">
            {{ copy.activeFilter }}:
            {{ filterOptions.find((item) => item.value === currentFilter)?.label }}
          </div>
        </div>
      </div>
    </header>

    <section class="mt-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <div class="flex flex-wrap gap-3">
        <button
          v-for="item in filterOptions"
          :key="item.value"
          :class="currentFilter === item.value ? 'filter-chip-active' : 'filter-chip'"
          @click="updateFilter(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <div
      v-if="errorMessage"
      class="mt-8 rounded-[1.75rem] border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="loading"
      class="mt-10 rounded-[2rem] border border-slate-100 bg-white px-6 py-16 text-center text-sm font-semibold text-slate-400 shadow-[0_18px_70px_rgba(15,23,42,0.04)]"
    >
      {{ copy.loading }}
    </div>

    <section
      v-else-if="activityItems.length > 0"
      class="mt-10 rounded-[2.25rem] border border-slate-100 bg-white p-7 shadow-[0_18px_70px_rgba(15,23,42,0.04)]"
    >
      <div class="space-y-4">
        <article
          v-for="item in activityItems"
          :key="`${item.type}-${item.occurred_at}-${item.title}`"
          class="activity-row"
        >
          <div class="activity-dot"></div>
          <div class="activity-body">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  {{ badgeLabel(item) }}
                </div>
                <h3 class="mt-3 text-xl font-black tracking-tight text-slate-950">{{ item.title }}</h3>
                <p class="mt-2 text-sm leading-7 text-slate-500">{{ item.description }}</p>
              </div>

              <div class="flex flex-col items-start gap-3 lg:items-end">
                <div class="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {{ copy.happenedAt }}
                </div>
                <div class="text-sm font-semibold text-slate-500">{{ formatDate(item.occurred_at) }}</div>
                <button class="ghost-button" @click="openLink(item.href)">{{ copy.open }}</button>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

    <div
      v-else
      class="mt-10 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center text-sm font-semibold text-slate-400"
    >
      {{ copy.empty }}
    </div>
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

.hero-value-sm {
  @apply text-2xl leading-tight;
}

.hero-copy {
  @apply mt-2 text-sm leading-7 text-slate-500;
}

.filter-chip {
  @apply rounded-full border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 transition-all hover:border-slate-300 hover:text-slate-950;
}

.filter-chip-active {
  @apply rounded-full border border-blue-600 bg-blue-600 px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)];
}

.activity-row {
  @apply grid gap-4 rounded-[1.6rem] border border-slate-100 bg-slate-50/70 p-5 lg:grid-cols-[auto_1fr];
}

.activity-dot {
  @apply mt-1 h-4 w-4 rounded-full bg-blue-600 shadow-[0_0_0_8px_rgba(37,99,235,0.10)];
}

.activity-body {
  @apply min-w-0;
}

.ghost-button {
  @apply rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 transition-all hover:border-slate-300 hover:text-slate-950;
}
</style>
