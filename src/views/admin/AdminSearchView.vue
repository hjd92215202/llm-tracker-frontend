<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { roadmapApi } from '@/api/roadmap'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { RoadmapNode, WorkspaceSearchNoteItem, WorkspaceSearchResponse, WorkspaceSearchRoadmapItem } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const loading = ref(false)
const errorMessage = ref('')
const searchTerm = ref('')
const searchResults = ref<WorkspaceSearchResponse | null>(null)
const roadmapNodes = ref<RoadmapNode[]>([])

let searchTimer: ReturnType<typeof setTimeout> | null = null

const copy = computed(() =>
  localeStore.isChinese
    ? {
        eyebrow: '全局搜索',
        title: '先找到，再进入具体页面',
        summary: '输入关键词，先定位信息，再决定去路线图还是笔记，避免在多个页面来回猜。',
        inputPlaceholder: '搜索项目、方法、节点标题、研究结论或成员信息',
        searching: '正在搜索空间内容...',
        loadError: '搜索失败，请稍后重试',
        emptyState: '输入关键词后，这里会返回路线图节点和笔记结果。',
        noResults: '当前空间没有找到匹配内容。',
        results: '结果数',
        roadmap: '路线图结果',
        notes: '笔记结果',
        openRoadmap: '查看路线图',
        openNote: '查看笔记',
        lastUpdated: '最近更新',
        createdAt: '创建时间',
        linkedNode: '关联节点',
        unknownNode: '未关联节点',
        noSummary: '这条笔记还没有摘要。',
        scopePrefix: '当前搜索范围',
        workspaceFallback: '当前空间',
        tipsTitle: '搜索建议',
        tips: ['先搜节点标题或项目名称', '再用方法名或结论补充定位', '结果会按路线图和笔记分开展示'],
        todo: '待开始',
        inProgress: '进行中',
        completed: '已完成',
        theory: '理论',
        coding: '编码',
        project: '项目',
      }
    : {
        eyebrow: 'Workspace search',
        title: 'Find first, then jump into the right page',
        summary: 'Search for the context first, then decide whether the answer belongs in roadmap or notes.',
        inputPlaceholder: 'Search projects, methods, node titles, research outcomes, or team context',
        searching: 'Searching workspace...',
        loadError: 'Unable to complete the search right now',
        emptyState: 'Start typing and this page will return roadmap nodes and note results.',
        noResults: 'No results matched the current workspace query.',
        results: 'Results',
        roadmap: 'Roadmap results',
        notes: 'Note results',
        openRoadmap: 'Open roadmap',
        openNote: 'Open note',
        lastUpdated: 'Last updated',
        createdAt: 'Created at',
        linkedNode: 'Linked node',
        unknownNode: 'No linked node',
        noSummary: 'This note does not have a summary yet.',
        scopePrefix: 'Current scope',
        workspaceFallback: 'Workspace',
        tipsTitle: 'Search tips',
        tips: ['Start with node titles or project names', 'Use methods or outcomes to narrow the result', 'Roadmap and note results are separated for faster scanning'],
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
      }
)

const workspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? copy.value.workspaceFallback)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(localeStore.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const statusLabel = (status: string) => {
  if (status === 'completed') return copy.value.completed
  if (status === 'in_progress') return copy.value.inProgress
  return copy.value.todo
}

const typeLabel = (type: string) => {
  if (type === 'coding') return copy.value.coding
  if (type === 'project') return copy.value.project
  return copy.value.theory
}

const resolveNodeTitle = (nodeId: number | null) => {
  if (!nodeId) {
    return copy.value.unknownNode
  }

  return roadmapNodes.value.find((node) => node.id === nodeId)?.title ?? `${copy.value.linkedNode} #${nodeId}`
}

const loadRoadmapNodes = async () => {
  if (!authStore.activeWorkspaceId) {
    roadmapNodes.value = []
    return
  }

  try {
    roadmapNodes.value = await roadmapApi.getNodes()
  } catch {
    roadmapNodes.value = []
  }
}

const performSearch = async () => {
  const q = searchTerm.value.trim()
  if (!authStore.activeWorkspaceId || !q) {
    searchResults.value = null
    errorMessage.value = ''
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    searchResults.value = await workspaceApi.searchWorkspace(authStore.activeWorkspaceId, q)
  } catch (error: any) {
    searchResults.value = null
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const syncRouteQuery = () => {
  const q = searchTerm.value.trim()
  const current = typeof route.query.q === 'string' ? route.query.q : ''
  if (q === current) {
    return
  }

  router.replace({
    name: 'admin-search',
    query: q ? { q } : {},
  })
}

const scheduleRouteSync = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    syncRouteQuery()
  }, 220)
}

watch(
  () => route.query.q,
  (value) => {
    searchTerm.value = typeof value === 'string' ? value : ''
    performSearch()
  },
  { immediate: true }
)

watch(
  () => authStore.activeWorkspaceId,
  () => {
    loadRoadmapNodes()
    performSearch()
  },
  { immediate: true }
)

watch(searchTerm, () => {
  scheduleRouteSync()
})

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})

const openRoadmapResult = (item: WorkspaceSearchRoadmapItem) => {
  router.push({
    name: 'admin-roadmap',
    query: { search: item.title },
  })
}

const openNoteResult = (item: WorkspaceSearchNoteItem) => {
  router.push(item.href)
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <div class="product-eyebrow border border-[rgba(229,106,43,0.14)] bg-white/80 text-[var(--brand)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
          {{ copy.eyebrow }}
        </div>
        <h1 class="product-title mt-7 text-4xl leading-[0.96] md:text-6xl">{{ copy.title }}</h1>
        <p class="mt-5 text-base leading-8 text-[var(--ink-soft)]">{{ copy.summary }}</p>
      </div>

      <div class="scope-pill">{{ copy.scopePrefix }}：{{ workspaceName }}</div>
    </header>

    <section class="search-shell mt-8">
      <input v-model="searchTerm" type="text" class="search-input" :placeholder="copy.inputPlaceholder" />
      <div class="scope-pill">{{ copy.results }} {{ searchResults?.total_results ?? 0 }}</div>
    </section>

    <section class="mt-5 grid gap-4 md:grid-cols-3">
      <article v-for="tip in copy.tips" :key="tip" class="tip-card">
        {{ tip }}
      </article>
    </section>

    <div v-if="errorMessage" class="product-error mt-8 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="empty-card mt-8">
      {{ copy.searching }}
    </div>

    <div v-else-if="!searchTerm.trim()" class="empty-card mt-8">
      {{ copy.emptyState }}
    </div>

    <div v-else-if="searchResults && searchResults.total_results === 0" class="empty-card mt-8">
      {{ copy.noResults }}
    </div>

    <template v-else-if="searchResults">
      <section class="mt-8 grid gap-6 xl:grid-cols-2">
        <article class="result-panel">
          <div class="panel-eyebrow">{{ copy.roadmap }}</div>
          <div class="mt-6 space-y-4">
            <article v-for="item in searchResults.roadmap_results" :key="item.id" class="result-card">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="pill">{{ typeLabel(item.node_type) }}</span>
                    <span class="pill pill-muted">{{ statusLabel(item.status) }}</span>
                  </div>
                  <h2 class="mt-3 text-lg font-black tracking-tight text-[var(--ink-strong)]">{{ item.title }}</h2>
                  <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description || item.title }}</p>
                </div>
                <button class="product-button-secondary !px-5 !py-3" type="button" @click="openRoadmapResult(item)">
                  {{ copy.openRoadmap }}
                </button>
              </div>
              <div class="mt-4 text-xs font-semibold text-[var(--ink-soft)]">
                {{ copy.lastUpdated }} {{ formatDate(item.updated_at) }}
              </div>
            </article>
          </div>
        </article>

        <article class="result-panel">
          <div class="panel-eyebrow">{{ copy.notes }}</div>
          <div class="mt-6 space-y-4">
            <article v-for="item in searchResults.note_results" :key="item.id" class="result-card">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <div class="pill pill-muted">{{ copy.linkedNode }} {{ resolveNodeTitle(item.node_id) }}</div>
                  <h2 class="mt-3 text-lg font-black tracking-tight text-[var(--ink-strong)]">{{ item.title }}</h2>
                  <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.summary || copy.noSummary }}</p>
                </div>
                <button class="product-button-secondary !px-5 !py-3" type="button" @click="openNoteResult(item)">
                  {{ copy.openNote }}
                </button>
              </div>
              <div class="mt-4 text-xs font-semibold text-[var(--ink-soft)]">
                {{ copy.createdAt }} {{ formatDate(item.created_at) }}
              </div>
            </article>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.search-shell {
  @apply flex flex-col gap-4 rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.64)] p-5 shadow-[0_14px_36px_rgba(20,33,43,0.04)] lg:flex-row lg:items-center lg:justify-between;
}

.search-input {
  @apply w-full rounded-[1.2rem] border border-[rgba(20,33,43,0.12)] bg-white px-5 py-4 text-base font-semibold text-[var(--ink-strong)] outline-none transition-all lg:max-w-3xl;
}

.search-input::placeholder {
  color: rgba(42, 58, 68, 0.45);
}

.search-input:focus {
  border-color: rgba(229, 106, 43, 0.42);
  box-shadow: 0 0 0 5px rgba(229, 106, 43, 0.12);
}

.scope-pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-4 py-2 text-sm font-semibold text-[var(--ink-main)];
}

.tip-card {
  @apply rounded-[1.6rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] px-5 py-4 text-sm leading-7 text-[var(--ink-soft)] shadow-[0_10px_24px_rgba(20,33,43,0.04)];
}

.result-panel {
  @apply rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.78)] p-6 shadow-[0_18px_50px_rgba(20,33,43,0.05)];
}

.panel-eyebrow {
  @apply text-sm font-bold text-[var(--brand)];
}

.result-card {
  @apply rounded-[1.6rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.7)] p-5;
}

.pill {
  @apply inline-flex rounded-full bg-[rgba(229,106,43,0.12)] px-3 py-1 text-xs font-semibold text-[var(--brand)];
}

.pill-muted {
  @apply bg-[rgba(20,33,43,0.06)] text-[var(--ink-main)];
}

.empty-card {
  @apply rounded-[2rem] border border-dashed border-[rgba(20,33,43,0.12)] bg-[rgba(255,255,255,0.58)] px-6 py-16 text-center text-sm font-semibold text-[var(--ink-soft)];
}
</style>
