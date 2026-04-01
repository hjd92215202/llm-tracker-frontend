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
        eyebrow: 'Research Notes',
        title: '让团队知识可搜索、可筛选，并始终和执行上下文绑在一起。',
        summaryPrefix: '这些笔记当前属于',
        summarySuffix: 'workspace。',
        writable: '可编辑',
        readonly: '只读角色',
        newNote: '新建笔记',
        readonlyHint: '你当前可以浏览与搜索笔记，但只有 owner、admin 和 member 可以新建或修改。',
        filtersTitle: '搜索与筛选',
        searchPlaceholder: '搜索标题、摘要或正文内容',
        allNodes: '全部节点',
        linkedNode: '关联节点',
        resultCount: '结果数',
        published: '发布时间',
        titleAndSummary: '标题与摘要',
        action: '操作',
        open: '打开',
        edit: '编辑',
        delete: '删除',
        noSummary: '这条笔记还没有摘要。',
        noResults: '当前筛选条件下没有匹配的笔记。',
        loading: '正在加载 workspace 笔记...',
        deleteTitle: '删除这条笔记？',
        deleteBodyPrefix: '这会把',
        deleteBodySuffix: '从当前 workspace 知识库中移除。',
        deleteAction: '永久删除',
        cancel: '取消',
        deleteError: '暂时无法删除这条笔记',
        loadError: '无法加载笔记列表',
        workspaceFallback: 'Workspace',
        generalNode: '通用',
        unknownNode: '未知节点',
      }
    : {
        eyebrow: 'Research notes',
        title: 'Keep team knowledge searchable, filterable, and tied to execution.',
        summaryPrefix: 'These notes are currently scoped to',
        summarySuffix: 'workspace.',
        writable: 'Edit enabled',
        readonly: 'Read only role',
        newNote: 'New note',
        readonlyHint: 'Your role can review and search notes, but only owners, admins, and members can create or modify them.',
        filtersTitle: 'Search and filters',
        searchPlaceholder: 'Search titles, summaries, or note content',
        allNodes: 'All nodes',
        linkedNode: 'Linked node',
        resultCount: 'Results',
        published: 'Published',
        titleAndSummary: 'Title and summary',
        action: 'Action',
        open: 'Open',
        edit: 'Edit',
        delete: 'Delete',
        noSummary: 'No summary available yet.',
        noResults: 'No notes match the current filters.',
        loading: 'Loading workspace notes...',
        deleteTitle: 'Delete this note?',
        deleteBodyPrefix: 'This removes',
        deleteBodySuffix: 'from the current workspace knowledge base.',
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
    alert(copy.value.deleteError)
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">{{ copy.eyebrow }}</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">{{ copy.title }}</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
          {{ copy.summaryPrefix }}
          <span class="font-black text-slate-800">{{ currentWorkspaceName }}</span>
          {{ copy.summarySuffix }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {{ hasWriteAccess ? copy.writable : copy.readonly }}
        </div>
        <button
          :disabled="!hasWriteAccess"
          class="rounded-2xl bg-blue-600 px-6 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] transition-all hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          @click="createNote"
        >
          {{ copy.newNote }}
        </button>
      </div>
    </header>

    <div v-if="!hasWriteAccess" class="mt-8 rounded-[1.8rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
      {{ copy.readonlyHint }}
    </div>

    <div v-if="errorMessage" class="mt-8 rounded-[1.75rem] border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
      {{ errorMessage }}
    </div>

    <section class="mt-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div class="text-[11px] font-black uppercase tracking-[0.28em] text-blue-600">{{ copy.filtersTitle }}</div>
        </div>
        <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {{ copy.resultCount }} {{ notes.length }}
        </div>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <input
          v-model="searchTerm"
          type="text"
          class="admin-input"
          :placeholder="copy.searchPlaceholder"
        />
        <select v-model="selectedNodeId" class="admin-input">
          <option value="all">{{ copy.allNodes }}</option>
          <option v-for="node in nodes" :key="node.id" :value="String(node.id)">
            {{ node.title }}
          </option>
        </select>
      </div>
    </section>

    <div class="mt-10 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <table class="w-full border-collapse">
        <thead class="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th class="px-6 py-4">{{ copy.published }}</th>
            <th class="px-6 py-4">{{ copy.titleAndSummary }}</th>
            <th class="px-6 py-4">{{ copy.linkedNode }}</th>
            <th class="px-6 py-4 text-right">{{ copy.action }}</th>
          </tr>
        </thead>
        <tbody v-if="!loading" class="divide-y divide-slate-100">
          <tr v-for="note in notes" :key="note.id" class="hover:bg-slate-50/80">
            <td class="px-6 py-5 text-sm font-semibold text-slate-500">
              {{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}
            </td>
            <td class="px-6 py-5">
              <div class="font-black text-slate-900">{{ note.title }}</div>
              <div class="mt-1 text-sm text-slate-500">{{ note.summary || copy.noSummary }}</div>
            </td>
            <td class="px-6 py-5">
              <span class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                {{ getNodeTitle(note.node_id) }}
              </span>
            </td>
            <td class="px-6 py-5 text-right">
              <div class="inline-flex items-center gap-4">
                <button
                  class="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 transition-all hover:text-slate-950"
                  @click="openNote(note.id)"
                >
                  {{ copy.open }}
                </button>
                <button
                  :disabled="!hasWriteAccess"
                  class="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 transition-all hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="editNote(note.id)"
                >
                  {{ copy.edit }}
                </button>
                <button
                  :disabled="!hasWriteAccess"
                  class="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 transition-all hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                  @click="triggerDelete(note)"
                >
                  {{ copy.delete }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="notes.length === 0">
            <td colspan="4" class="px-6 py-16 text-center text-sm font-semibold text-slate-400">
              {{ copy.noResults }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="px-6 py-16 text-center text-sm font-semibold text-slate-400">
        {{ copy.loading }}
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-110 flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel relative w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <h3 class="text-2xl font-black tracking-[-0.05em] text-slate-950">{{ copy.deleteTitle }}</h3>
            <p class="mt-3 text-sm leading-7 text-slate-500">
              {{ copy.deleteBodyPrefix }}
              <span class="font-black text-slate-800">{{ targetNote?.title }}</span>
              {{ copy.deleteBodySuffix }}
            </p>
            <div class="mt-8 flex flex-col gap-3">
              <button class="danger-button w-full" @click="confirmDelete">{{ copy.deleteAction }}</button>
              <button class="secondary-button w-full" @click="isDeleteConfirmOpen = false">{{ copy.cancel }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.admin-input {
  @apply w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all;
}

.admin-input:focus {
  @apply border-blue-600;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.08);
}

.danger-button {
  @apply rounded-2xl bg-red-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white transition-all hover:bg-red-700;
}

.secondary-button {
  @apply rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 transition-all hover:bg-slate-50;
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
