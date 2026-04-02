<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { Note, NoteListFilters, RoadmapNode } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const notes = ref<Note[]>([])
const nodes = ref<RoadmapNode[]>([])
const loading = ref(false)
const isDeleteConfirmOpen = ref(false)
const targetNote = ref<Note | null>(null)
const errorMessage = ref('')
const searchTerm = ref('')
const selectedNodeId = ref<'all' | string>('all')

let filterTimer: ReturnType<typeof setTimeout> | null = null

const copy = computed(() =>
  localeStore.isChinese
    ? {
        eyebrow: 'Notes',
        title: '把知识沉淀成可搜索、可追踪的团队记录',
        summaryPrefix: '这些 notes 属于',
        summarySuffix: 'workspace，用来保存研究结论、过程记录和关键决策。',
        writable: '可编辑',
        readonly: '只读',
        newNote: '新建 Note',
        readonlyHint: '你当前可以查看和搜索 notes，但只有 Owner、Admin 和 Member 可以创建或修改。',
        filtersTitle: '搜索与筛选',
        searchPlaceholder: '搜索标题、摘要或正文内容',
        allNodes: '全部节点',
        linkedNode: '关联节点',
        resultCount: '结果数',
        published: '创建时间',
        titleAndSummary: '标题与摘要',
        action: '操作',
        open: '打开',
        edit: '编辑',
        delete: '删除',
        noSummary: '暂无摘要',
        noResults: '当前筛选条件下没有匹配的 notes。',
        loading: '正在加载 notes...',
        deleteTitle: '删除这条 Note？',
        deleteBodyPrefix: '这会把',
        deleteBodySuffix: '从当前 workspace 中移除。',
        deleteAction: '永久删除',
        cancel: '取消',
        deleteError: '删除 Note 失败',
        loadError: '加载 notes 失败',
        workspaceFallback: 'Workspace',
        generalNode: '通用',
        unknownNode: '未知节点',
      }
    : {
        eyebrow: 'Notes',
        title: 'Turn knowledge into searchable, trackable team records',
        summaryPrefix: 'These notes belong to',
        summarySuffix: 'workspace and capture research outcomes, process, and key decisions.',
        writable: 'Editable',
        readonly: 'Read only',
        newNote: 'New note',
        readonlyHint: 'You can review and search notes, but only owners, admins, and members can create or change them.',
        filtersTitle: 'Search and filters',
        searchPlaceholder: 'Search titles, summaries, or note content',
        allNodes: 'All nodes',
        linkedNode: 'Linked node',
        resultCount: 'Results',
        published: 'Created',
        titleAndSummary: 'Title and summary',
        action: 'Action',
        open: 'Open',
        edit: 'Edit',
        delete: 'Delete',
        noSummary: 'No summary yet',
        noResults: 'No notes match the current filters.',
        loading: 'Loading notes...',
        deleteTitle: 'Delete this note?',
        deleteBodyPrefix: 'This removes',
        deleteBodySuffix: 'from the current workspace.',
        deleteAction: 'Delete permanently',
        cancel: 'Cancel',
        deleteError: 'Unable to delete this note right now',
        loadError: 'Unable to load notes',
        workspaceFallback: 'Workspace',
        generalNode: 'General',
        unknownNode: 'Unknown node',
      }
)

const currentWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? copy.value.workspaceFallback)
const hasWriteAccess = computed(() => authStore.hasWriteAccess)

const buildFilters = (): NoteListFilters => {
  const filters: NoteListFilters = {}
  if (searchTerm.value.trim()) {
    filters.search = searchTerm.value.trim()
  }
  if (selectedNodeId.value !== 'all') {
    filters.node_id = Number(selectedNodeId.value)
  }
  return filters
}

const fetchNodes = async () => {
  try {
    nodes.value = await roadmapApi.getNodes()
  } catch {
    nodes.value = []
  }
}

const fetchNotes = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    notes.value = await noteApi.getAllNotes(buildFilters())
  } catch (error: any) {
    notes.value = []
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const scheduleFetchNotes = () => {
  if (filterTimer) {
    clearTimeout(filterTimer)
  }

  filterTimer = setTimeout(() => {
    fetchNotes()
  }, 220)
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchNodes()
  },
  { immediate: true }
)

watch(
  () => route.query.search,
  (value) => {
    const nextValue = typeof value === 'string' ? value : ''
    if (nextValue !== searchTerm.value) {
      searchTerm.value = nextValue
    }
  },
  { immediate: true }
)

watch(
  [() => authStore.activeWorkspaceId, searchTerm, selectedNodeId],
  () => {
    scheduleFetchNotes()
  },
  { immediate: true }
)

watch(searchTerm, (value) => {
  const nextQuery = { ...route.query }
  const normalizedValue = value.trim()

  if (normalizedValue) {
    nextQuery.search = normalizedValue
  } else {
    delete nextQuery.search
  }

  const currentValue = typeof route.query.search === 'string' ? route.query.search : ''
  if (normalizedValue !== currentValue) {
    router.replace({ query: nextQuery })
  }
})

onBeforeUnmount(() => {
  if (filterTimer) {
    clearTimeout(filterTimer)
  }
})

const getNodeTitle = (nodeId: number | null) => {
  if (!nodeId) {
    return copy.value.generalNode
  }

  return nodes.value.find((node) => node.id === nodeId)?.title || copy.value.unknownNode
}

const openNote = (id: number) => router.push(`/note/${id}`)
const editNote = (id: number) => router.push(`/admin/note/edit/${id}`)

const createNote = () => {
  if (!hasWriteAccess.value) {
    return
  }

  router.push('/admin/note/create')
}

const triggerDelete = (note: Note) => {
  if (!hasWriteAccess.value) {
    return
  }

  targetNote.value = note
  isDeleteConfirmOpen.value = true
}

const confirmDelete = async () => {
  if (!targetNote.value || !hasWriteAccess.value) {
    return
  }

  try {
    await noteApi.deleteNote(targetNote.value.id)
    isDeleteConfirmOpen.value = false
    targetNote.value = null
    await fetchNotes()
  } catch {
    errorMessage.value = copy.value.deleteError
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <div class="product-eyebrow border border-[rgba(45,122,120,0.14)] bg-white/80 text-[var(--accent)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"></span>
          {{ copy.eyebrow }}
        </div>
        <h1 class="product-title mt-7 text-4xl leading-[0.96] md:text-6xl">{{ copy.title }}</h1>
        <p class="mt-5 text-base leading-8 text-[var(--ink-soft)]">
          {{ copy.summaryPrefix }}
          <span class="font-black text-[var(--ink-strong)]">{{ currentWorkspaceName }}</span>
          {{ copy.summarySuffix }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="pill">{{ hasWriteAccess ? copy.writable : copy.readonly }}</div>
        <button v-if="hasWriteAccess" class="product-button-primary" type="button" @click="createNote">
          {{ copy.newNote }}
        </button>
      </div>
    </header>

    <div v-if="!hasWriteAccess" class="banner mt-8">
      {{ copy.readonlyHint }}
    </div>

    <div v-if="errorMessage" class="product-error mt-4 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <section class="toolbar mt-8">
      <div class="toolbar-title">{{ copy.filtersTitle }}</div>
      <div class="scope-pill">{{ copy.resultCount }} {{ notes.length }}</div>
      <div class="toolbar-grid">
        <input v-model="searchTerm" type="text" class="product-input" :placeholder="copy.searchPlaceholder" />
        <select v-model="selectedNodeId" class="product-input">
          <option value="all">{{ copy.allNodes }}</option>
          <option v-for="node in nodes" :key="node.id" :value="String(node.id)">
            {{ node.title }}
          </option>
        </select>
      </div>
    </section>

    <section class="table-shell mt-8">
      <table class="w-full border-collapse">
        <thead class="table-head">
          <tr>
            <th class="px-5 py-4">{{ copy.published }}</th>
            <th class="px-5 py-4">{{ copy.titleAndSummary }}</th>
            <th class="px-5 py-4">{{ copy.linkedNode }}</th>
            <th class="px-5 py-4 text-right">{{ copy.action }}</th>
          </tr>
        </thead>

        <tbody v-if="!loading" class="divide-y divide-[rgba(20,33,43,0.08)]">
          <tr v-for="note in notes" :key="note.id" class="row">
            <td class="px-5 py-5 text-sm font-semibold text-[var(--ink-soft)]">
              {{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}
            </td>
            <td class="px-5 py-5">
              <div class="font-black text-[var(--ink-strong)]">{{ note.title }}</div>
              <div class="mt-1 text-sm leading-7 text-[var(--ink-soft)]">{{ note.summary || copy.noSummary }}</div>
            </td>
            <td class="px-5 py-5">
              <span class="pill pill-brand">{{ getNodeTitle(note.node_id) }}</span>
            </td>
            <td class="px-5 py-5 text-right">
              <div class="inline-flex items-center gap-4">
                <button class="secondary-link" type="button" @click="openNote(note.id)">{{ copy.open }}</button>
                <button v-if="hasWriteAccess" class="primary-link" type="button" @click="editNote(note.id)">
                  {{ copy.edit }}
                </button>
                <button v-if="hasWriteAccess" class="danger-link" type="button" @click="triggerDelete(note)">
                  {{ copy.delete }}
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="notes.length === 0">
            <td colspan="4" class="empty-card">
              {{ copy.noResults }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="empty-card">
        {{ copy.loading }}
      </div>
    </section>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-[rgba(20,33,43,0.32)] backdrop-blur-sm" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel">
            <h3 class="text-2xl font-black tracking-[-0.05em] text-[var(--ink-strong)]">{{ copy.deleteTitle }}</h3>
            <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {{ copy.deleteBodyPrefix }}
              <span class="font-black text-[var(--ink-strong)]">{{ targetNote?.title }}</span>
              {{ copy.deleteBodySuffix }}
            </p>
            <div class="mt-8 flex flex-col gap-3">
              <button class="danger-button w-full" type="button" @click="confirmDelete">{{ copy.deleteAction }}</button>
              <button class="product-button-secondary w-full" type="button" @click="isDeleteConfirmOpen = false">
                {{ copy.cancel }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.toolbar {
  @apply rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.8)] p-5 shadow-[0_14px_36px_rgba(20,33,43,0.04)];
}

.toolbar-title {
  @apply text-[11px] font-black uppercase tracking-[0.28em] text-[var(--accent)];
}

.toolbar-grid {
  @apply mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr];
}

.scope-pill {
  @apply mt-4 inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--ink-main)];
}

.table-shell {
  @apply overflow-hidden rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] shadow-[0_18px_50px_rgba(20,33,43,0.05)];
}

.table-head {
  @apply bg-[rgba(20,33,43,0.04)] text-left text-[11px] font-black uppercase tracking-[0.22em] text-[var(--ink-soft)];
}

.row {
  @apply transition-colors hover:bg-[rgba(255,250,242,0.68)];
}

.pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ink-main)];
}

.pill-brand {
  @apply bg-[rgba(45,122,120,0.12)] text-[var(--accent)];
}

.secondary-link {
  @apply text-[11px] font-black uppercase tracking-[0.22em] text-[var(--ink-soft)] transition-all hover:text-[var(--ink-strong)];
}

.primary-link {
  @apply text-[11px] font-black uppercase tracking-[0.22em] text-[var(--accent)] transition-all hover:opacity-70;
}

.danger-link {
  @apply text-[11px] font-black uppercase tracking-[0.22em] text-[var(--danger)] transition-all hover:opacity-70;
}

.banner {
  @apply rounded-[1.6rem] bg-[rgba(216,110,59,0.08)] px-5 py-4 text-sm font-semibold text-[var(--brand-deep)];
}

.empty-card {
  @apply px-6 py-16 text-center text-sm font-semibold text-[var(--ink-soft)];
}

.modal-panel {
  @apply relative w-full max-w-sm rounded-[2rem] bg-[rgba(255,251,245,0.98)] p-8 text-center shadow-[0_30px_80px_rgba(20,33,43,0.18)];
}

.danger-button {
  @apply rounded-[1.2rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all;
  background: var(--danger);
}

.danger-button:hover {
  opacity: 0.9;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: scale(0.96);
}
</style>
