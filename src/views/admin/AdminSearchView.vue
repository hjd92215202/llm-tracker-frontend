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
        eyebrow: 'Global Search',
        title: '先搜索，再进入 Roadmap 或 Notes。',
        summary: '从整个 workspace 的知识与执行上下文里直接找结果，而不是先猜它属于哪个模块。',
        inputPlaceholder: '搜索关键词、项目名、方法论、节点或研究结论',
        searching: '正在搜索 workspace...',
        loadError: '无法完成搜索',
        emptyState: '输入关键词后，这里会返回 roadmap 节点和 research notes 的匹配结果。',
        noResults: '当前 workspace 中没有匹配结果。',
        results: '结果数',
        roadmap: 'Roadmap matches',
        notes: 'Note matches',
        openRoadmap: '打开 Roadmap',
        openNote: '打开 Note',
        lastUpdated: '最近更新',
        createdAt: '创建时间',
        linkedNode: '关联节点',
        unknownNode: '未关联节点',
        noSummary: '这条笔记还没有摘要。',
        scopePrefix: '当前搜索范围:',
        workspaceFallback: 'Workspace',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
      }
    : {
        eyebrow: 'Global search',
        title: 'Search first, then jump into roadmap or notes.',
        summary: 'Look across the full workspace context before deciding which module the answer belongs to.',
        inputPlaceholder: 'Search keywords, project names, methods, nodes, or research outcomes',
        searching: 'Searching workspace...',
        loadError: 'Unable to complete search',
        emptyState: 'Start typing to search roadmap nodes and research notes across the workspace.',
        noResults: 'No results matched the current workspace query.',
        results: 'Results',
        roadmap: 'Roadmap matches',
        notes: 'Note matches',
        openRoadmap: 'Open roadmap',
        openNote: 'Open note',
        lastUpdated: 'Last updated',
        createdAt: 'Created at',
        linkedNode: 'Linked node',
        unknownNode: 'No linked node',
        noSummary: 'This note does not have a summary yet.',
        scopePrefix: 'Current search scope:',
        workspaceFallback: 'Workspace',
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
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">{{ copy.eyebrow }}</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">{{ copy.title }}</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">{{ copy.summary }}</p>
      </div>

      <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
        {{ copy.scopePrefix }} {{ workspaceName }}
      </div>
    </header>

    <section class="mt-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <input
          v-model="searchTerm"
          type="text"
          class="search-input"
          :placeholder="copy.inputPlaceholder"
        />

        <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {{ copy.results }} {{ searchResults?.total_results ?? 0 }}
        </div>
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
      {{ copy.searching }}
    </div>

    <div
      v-else-if="!searchTerm.trim()"
      class="mt-10 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center text-sm font-semibold text-slate-400"
    >
      {{ copy.emptyState }}
    </div>

    <div
      v-else-if="searchResults && searchResults.total_results === 0"
      class="mt-10 rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/60 px-6 py-16 text-center text-sm font-semibold text-slate-400"
    >
      {{ copy.noResults }}
    </div>

    <template v-else-if="searchResults">
      <section class="mt-10 grid gap-6 xl:grid-cols-2">
        <div class="panel">
          <div class="panel-eyebrow">{{ copy.roadmap }}</div>
          <div class="mt-6 space-y-4">
            <article
              v-for="item in searchResults.roadmap_results"
              :key="item.id"
              class="rounded-[1.6rem] border border-slate-100 bg-slate-50/70 p-5 transition-all hover:border-blue-200 hover:bg-white"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                      {{ typeLabel(item.node_type) }}
                    </span>
                    <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                      {{ statusLabel(item.status) }}
                    </span>
                  </div>
                  <h3 class="mt-3 text-lg font-black tracking-tight text-slate-950">{{ item.title }}</h3>
                  <p class="mt-2 text-sm leading-7 text-slate-500">{{ item.description || item.title }}</p>
                </div>
                <button class="ghost-button" @click="openRoadmapResult(item)">{{ copy.openRoadmap }}</button>
              </div>
              <div class="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {{ copy.lastUpdated }} {{ formatDate(item.updated_at) }}
              </div>
            </article>
          </div>
        </div>

        <div class="panel">
          <div class="panel-eyebrow">{{ copy.notes }}</div>
          <div class="mt-6 space-y-4">
            <article
              v-for="item in searchResults.note_results"
              :key="item.id"
              class="rounded-[1.6rem] border border-slate-100 bg-slate-50/70 p-5 transition-all hover:border-blue-200 hover:bg-white"
            >
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                    {{ copy.linkedNode }} {{ resolveNodeTitle(item.node_id) }}
                  </div>
                  <h3 class="mt-3 text-lg font-black tracking-tight text-slate-950">{{ item.title }}</h3>
                  <p class="mt-2 text-sm leading-7 text-slate-500">{{ item.summary || copy.noSummary }}</p>
                </div>
                <button class="ghost-button" @click="openNoteResult(item)">{{ copy.openNote }}</button>
              </div>
              <div class="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {{ copy.createdAt }} {{ formatDate(item.created_at) }}
              </div>
            </article>
          </div>
        </div>
      </section>
    </template>
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

.search-input {
  @apply w-full rounded-2xl border-2 border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 outline-none transition-all lg:max-w-3xl;
}

.search-input:focus {
  @apply border-blue-600;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.08);
}

.ghost-button {
  @apply rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 transition-all hover:border-slate-300 hover:text-slate-950;
}
</style>
