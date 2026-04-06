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
        kicker: '搜索',
        title: '快速找内容',
        summary: '直接搜节点和笔记，不再在多个页面里来回找。',
        placeholder: '搜索节点标题、研究结论、方法或成员信息',
        loading: '正在搜索...',
        loadError: '搜索失败，请稍后重试',
        empty: '输入关键词后，这里会返回节点和笔记结果。',
        noResults: '没有找到匹配内容。',
        resultsFor: '搜索结果',
        total: '结果',
        roadmap: '节点',
        notes: '笔记',
        openRoadmap: '进入路线图',
        openNote: '打开笔记',
        noSummary: '这条笔记还没有摘要。',
        unknownNode: '未关联节点',
        linkedNode: '关联节点',
        updatedAt: '最近更新',
        createdAt: '创建时间',
        theory: '理论',
        coding: '编码',
        project: '项目',
        todo: '待开始',
        inProgress: '进行中',
        completed: '已完成',
      }
    : {
        kicker: 'Search',
        title: 'Find content fast',
        summary: 'Search nodes and notes directly without bouncing between pages.',
        placeholder: 'Search node titles, findings, methods, or members',
        loading: 'Searching...',
        loadError: 'Unable to search right now',
        empty: 'Type a keyword and results will appear here.',
        noResults: 'No results matched the current query.',
        resultsFor: 'Results',
        total: 'Results',
        roadmap: 'Nodes',
        notes: 'Notes',
        openRoadmap: 'Open roadmap',
        openNote: 'Open note',
        noSummary: 'This note does not have a summary yet.',
        unknownNode: 'No linked node',
        linkedNode: 'Linked node',
        updatedAt: 'Updated',
        createdAt: 'Created',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
      },
)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(localeStore.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

const typeLabel = (type: string) => {
  if (type === 'coding') return copy.value.coding
  if (type === 'project') return copy.value.project
  return copy.value.theory
}

const statusLabel = (status: string) => {
  if (status === 'completed') return copy.value.completed
  if (status === 'in_progress') return copy.value.inProgress
  return copy.value.todo
}

const resolveNodeTitle = (nodeId: number | null) => {
  if (!nodeId) return copy.value.unknownNode
  return roadmapNodes.value.find((node) => node.id === nodeId)?.title ?? `${copy.value.linkedNode} #${nodeId}`
}

const roadmapCount = computed(() => searchResults.value?.roadmap_results.length ?? 0)
const noteCount = computed(() => searchResults.value?.note_results.length ?? 0)
const totalCount = computed(() => searchResults.value?.total_results ?? 0)
const hasQuery = computed(() => searchTerm.value.trim().length > 0)

const fetchRoadmapNodes = async () => {
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

const openRoadmapResult = (item: WorkspaceSearchRoadmapItem) => {
  router.push({ name: 'roadmap', query: { nodeId: String(item.id) } })
}

const openNoteResult = (item: WorkspaceSearchNoteItem) => {
  router.push(item.href)
}

watch(
  () => route.query.q,
  (value) => {
    searchTerm.value = typeof value === 'string' ? value : ''
    performSearch()
  },
  { immediate: true },
)

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchRoadmapNodes()
    performSearch()
  },
  { immediate: true },
)

watch(searchTerm, () => {
  if (searchTimer) clearTimeout(searchTimer)

  searchTimer = setTimeout(() => {
    const q = searchTerm.value.trim()
    router.replace({ name: 'admin-search', query: q ? { q } : {} })
  }, 220)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-card p-6 md:p-8">
      <div class="admin-kicker">{{ copy.kicker }}</div>
      <div class="mt-3 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div class="min-w-0">
          <h1 class="admin-headline">{{ copy.title }}</h1>
          <p class="admin-subtitle mt-4 max-w-3xl">{{ copy.summary }}</p>
        </div>

        <div v-if="searchResults && hasQuery" class="flex flex-wrap gap-2">
          <span class="admin-chip">{{ copy.total }} {{ totalCount }}</span>
          <span class="admin-chip">{{ copy.roadmap }} {{ roadmapCount }}</span>
          <span class="admin-chip">{{ copy.notes }} {{ noteCount }}</span>
        </div>
      </div>

      <div class="mt-6">
        <input v-model="searchTerm" type="text" class="admin-input !text-base" :placeholder="copy.placeholder" />
      </div>
    </header>

    <div v-if="errorMessage" class="product-error mt-5 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="admin-empty mt-6">
      {{ copy.loading }}
    </div>

    <div v-else-if="!hasQuery" class="admin-empty mt-6">
      {{ copy.empty }}
    </div>

    <div v-else-if="searchResults && totalCount === 0" class="admin-empty mt-6">
      {{ copy.noResults }}
    </div>

    <template v-else-if="searchResults">
      <section class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article v-if="roadmapCount > 0" class="admin-card p-6">
          <div class="flex items-center justify-between gap-3">
            <div class="admin-card-title">{{ copy.roadmap }}</div>
            <span class="admin-chip">{{ roadmapCount }}</span>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="item in searchResults.roadmap_results"
              :key="item.id"
              class="admin-list-card search-result-card"
            >
              <div class="flex flex-wrap gap-2">
                <span class="admin-chip-warm">{{ typeLabel(item.node_type) }}</span>
                <span class="admin-chip">{{ statusLabel(item.status) }}</span>
              </div>
              <div class="mt-3 text-lg font-semibold text-[var(--ink-strong)]">{{ item.title }}</div>
              <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description || item.title }}</p>
              <div class="mt-3 text-xs font-semibold text-[var(--ink-soft)]">{{ copy.updatedAt }} {{ formatDate(item.updated_at) }}</div>
              <button class="mt-4 text-sm font-semibold text-[var(--ink-strong)]" type="button" @click="openRoadmapResult(item)">
                {{ copy.openRoadmap }}
              </button>
            </article>
          </div>
        </article>

        <article v-if="noteCount > 0" class="admin-card p-6">
          <div class="flex items-center justify-between gap-3">
            <div class="admin-card-title">{{ copy.notes }}</div>
            <span class="admin-chip">{{ noteCount }}</span>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="item in searchResults.note_results"
              :key="item.id"
              class="admin-list-card search-result-card"
            >
              <span class="admin-chip">{{ copy.linkedNode }} {{ resolveNodeTitle(item.node_id) }}</span>
              <div class="mt-3 text-lg font-semibold text-[var(--ink-strong)]">{{ item.title }}</div>
              <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.summary || copy.noSummary }}</p>
              <div class="mt-3 text-xs font-semibold text-[var(--ink-soft)]">{{ copy.createdAt }} {{ formatDate(item.created_at) }}</div>
              <button class="mt-4 text-sm font-semibold text-[var(--ink-strong)]" type="button" @click="openNoteResult(item)">
                {{ copy.openNote }}
              </button>
            </article>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<style scoped>
.search-result-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 250, 248, 0.96));
}
</style>
