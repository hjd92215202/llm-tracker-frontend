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
        eyebrow: '动态中心',
        title: '团队最近在推进什么',
        summary: '把成员加入、笔记创建和路线图更新汇总成一条清晰时间线，方便快速判断空间是否真正向前。',
        readOnlyHint: '你当前拥有只读权限，可查看协作变化，但不会看到误导性的编辑入口。',
        writableHint: '你当前可以继续推进内容和流程，这里会帮助你快速判断团队是否在持续协同。',
        workspace: '当前空间',
        total: '动态总数',
        activeFilter: '当前筛选',
        filters: {
          all: '全部动态',
          member_joined: '成员加入',
          note_created: '新建笔记',
          roadmap_updated: '路线图更新',
        },
        loading: '正在加载动态...',
        errorFallback: '加载动态失败',
        empty: '当前筛选下还没有动态。先邀请成员、创建笔记，或更新路线图。',
        open: '查看详情',
        happenedAt: '发生时间',
        noWorkspace: '当前没有可用的空间。',
      }
    : {
        eyebrow: 'Activity center',
        title: 'See what the team is moving now',
        summary: 'Turn member joins, note creation, and roadmap updates into one readable timeline so the workspace feels easy to understand.',
        readOnlyHint: 'You are in a read-only role and can review activity without misleading edit prompts.',
        writableHint: 'You can keep work moving, and this view helps confirm whether collaboration is compounding.',
        workspace: 'Workspace',
        total: 'Total activity',
        activeFilter: 'Active filter',
        filters: {
          all: 'All activity',
          member_joined: 'Member joined',
          note_created: 'Note created',
          roadmap_updated: 'Roadmap updated',
        },
        loading: 'Loading activity...',
        errorFallback: 'Unable to load activity',
        empty: 'No activity matches the current filter yet. Invite a teammate, add a note, or update the roadmap.',
        open: 'Open',
        happenedAt: 'Happened at',
        noWorkspace: 'There is no active workspace right now.',
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

watch(
  () => [authStore.activeWorkspaceId, currentFilter.value],
  () => {
    fetchActivity()
  },
  { immediate: true }
)
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <div class="product-eyebrow border border-[rgba(37,99,235,0.14)] bg-white/80 text-[var(--accent)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"></span>
          {{ copy.eyebrow }}
        </div>
        <h1 class="product-title mt-7 text-4xl leading-[0.96] md:text-6xl">{{ copy.title }}</h1>
        <p class="mt-5 text-base leading-8 text-[var(--ink-soft)]">{{ copy.summary }}</p>
      </div>

      <div class="summary-grid">
        <article class="summary-card">
          <div class="summary-label">{{ copy.workspace }}</div>
          <div class="summary-value summary-value-name">{{ currentWorkspaceName }}</div>
          <p class="summary-copy">{{ authStore.hasWriteAccess ? copy.writableHint : copy.readOnlyHint }}</p>
        </article>

        <article class="summary-card">
          <div class="summary-label">{{ copy.total }}</div>
          <div class="summary-value">{{ activityResponse?.total_items ?? 0 }}</div>
          <p class="summary-copy">
            {{ copy.activeFilter }}：{{ filterOptions.find((item) => item.value === currentFilter)?.label }}
          </p>
        </article>
      </div>
    </header>

    <section class="toolbar mt-8">
      <button
        v-for="item in filterOptions"
        :key="item.value"
        :class="currentFilter === item.value ? 'chip chip-active' : 'chip'"
        type="button"
        @click="updateFilter(item.value)"
      >
        {{ item.label }}
      </button>
    </section>

    <div v-if="errorMessage" class="product-error mt-8 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="empty-card mt-8">
      {{ copy.loading }}
    </div>

    <section v-else-if="activityItems.length > 0" class="mt-8 space-y-4">
      <article
        v-for="item in activityItems"
        :key="`${item.type}-${item.occurred_at}-${item.title}`"
        class="activity-card"
      >
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0">
            <div class="pill">{{ badgeLabel(item) }}</div>
            <h2 class="mt-3 text-xl font-black tracking-tight text-[var(--ink-strong)]">{{ item.title }}</h2>
            <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description }}</p>
          </div>

          <div class="activity-side">
            <div class="text-xs font-semibold text-[var(--ink-soft)]">{{ copy.happenedAt }}</div>
            <div class="mt-2 text-sm font-semibold text-[var(--ink-main)]">{{ formatDate(item.occurred_at) }}</div>
            <button class="product-button-secondary mt-4 !px-5 !py-3" type="button" @click="router.push(item.href)">
              {{ copy.open }}
            </button>
          </div>
        </div>
      </article>
    </section>

    <div v-else class="empty-card mt-8">
      {{ copy.empty }}
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.summary-grid {
  @apply grid gap-4 md:grid-cols-2;
}

.summary-card {
  @apply rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.84)] px-6 py-6 shadow-[0_18px_50px_rgba(20,33,43,0.05)];
}

.summary-label {
  @apply text-xs font-semibold text-[var(--ink-soft)];
}

.summary-value {
  @apply mt-4 font-[var(--font-display)] text-4xl font-black tracking-[-0.06em] text-[var(--ink-strong)];
}

.summary-value-name {
  @apply text-2xl leading-tight;
}

.summary-copy {
  @apply mt-3 text-sm leading-7 text-[var(--ink-soft)];
}

.toolbar {
  @apply flex flex-wrap gap-3 rounded-[1.8rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.62)] p-4 shadow-[0_14px_36px_rgba(20,33,43,0.04)];
}

.chip {
  @apply rounded-full border border-[rgba(20,33,43,0.12)] bg-white px-4 py-3 text-sm font-semibold text-[var(--ink-soft)] transition-all;
}

.chip:hover {
  border-color: rgba(20, 33, 43, 0.24);
  color: var(--ink-strong);
}

.chip-active {
  border-color: transparent;
  background: var(--ink-strong);
  color: white;
}

.activity-card {
  @apply rounded-[1.9rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_14px_40px_rgba(20,33,43,0.05)];
}

.activity-side {
  @apply min-w-[180px] rounded-[1.4rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,250,242,0.9)] px-4 py-4 text-left lg:text-right;
}

.pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-3 py-1 text-xs font-semibold text-[var(--ink-main)];
}

.empty-card {
  @apply rounded-[2rem] border border-dashed border-[rgba(20,33,43,0.12)] bg-[rgba(255,255,255,0.58)] px-6 py-16 text-center text-sm font-semibold text-[var(--ink-soft)];
}
</style>
