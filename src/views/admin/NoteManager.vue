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
        eyebrow: '笔记',
        title: '把方法、结论和过程留在节点下面',
        summaryPrefix: '这些笔记属于',
        summarySuffix: '空间，用来承接路线图下的实际内容。',
        writable: '可编辑',
        readonly: '只读',
        newNote: '新建笔记',
        readonlyHint: '你可以查看笔记，但只有所有者、管理员和成员可以创建或修改。',
        filtersTitle: '筛选',
        searchPlaceholder: '搜索标题、摘要或正文内容',
        allNodes: '全部节点',
        resultCount: '当前结果',
        noSummary: '还没有摘要',
        noResults: '当前条件下还没有匹配笔记。',
        loading: '正在加载笔记...',
        deleteTitle: '确认删除这条笔记吗？',
        deleteBodyPrefix: '删除后，',
        deleteBodySuffix: '会从当前空间中移除。',
        deleteAction: '永久删除',
        cancel: '取消',
        deleteError: '删除笔记失败',
        loadError: '加载笔记失败',
        workspaceFallback: '当前空间',
        generalNode: '通用记录',
        unknownNode: '未知节点',
        open: '查看',
        edit: '编辑',
        delete: '删除',
      }
    : {
        eyebrow: 'Notes',
        title: 'Keep methods, findings, and records under the right nodes',
        summaryPrefix: 'These notes belong to',
        summarySuffix: 'workspace and hold the real content behind the roadmap.',
        writable: 'Editable',
        readonly: 'Read only',
        newNote: 'New note',
        readonlyHint: 'You can review notes, but only owners, admins, and members can create or update them.',
        filtersTitle: 'Filters',
        searchPlaceholder: 'Search title, summary, or content',
        allNodes: 'All nodes',
        resultCount: 'Results',
        noSummary: 'No summary yet',
        noResults: 'No notes match the current filters.',
        loading: 'Loading notes...',
        deleteTitle: 'Delete this note?',
        deleteBodyPrefix: '',
        deleteBodySuffix: 'will be removed from the current workspace.',
        deleteAction: 'Delete permanently',
        cancel: 'Cancel',
        deleteError: 'Unable to delete this note',
        loadError: 'Unable to load notes',
        workspaceFallback: 'Workspace',
        generalNode: 'General',
        unknownNode: 'Unknown node',
        open: 'Open',
        edit: 'Edit',
        delete: 'Delete',
      }
)

const currentWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? copy.value.workspaceFallback)
const hasWriteAccess = computed(() => authStore.hasWriteAccess)

const buildFilters = (): NoteListFilters => {
  const filters: NoteListFilters = {}
  if (searchTerm.value.trim()) filters.search = searchTerm.value.trim()
  if (selectedNodeId.value !== 'all') filters.node_id = Number(selectedNodeId.value)
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
  if (filterTimer) clearTimeout(filterTimer)
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

  if (normalizedValue) nextQuery.search = normalizedValue
  else delete nextQuery.search

  const currentValue = typeof route.query.search === 'string' ? route.query.search : ''
  if (normalizedValue !== currentValue) {
    router.replace({ query: nextQuery })
  }
})

onBeforeUnmount(() => {
  if (filterTimer) clearTimeout(filterTimer)
})

const getNodeTitle = (nodeId: number | null) => {
  if (!nodeId) return copy.value.generalNode
  return nodes.value.find((node) => node.id === nodeId)?.title || copy.value.unknownNode
}

const openNote = (id: number) => router.push(`/note/${id}`)
const editNote = (id: number) => router.push(`/admin/note/edit/${id}`)

const createNote = () => {
  if (!hasWriteAccess.value) return
  router.push('/admin/note/create')
}

const triggerDelete = (note: Note) => {
  if (!hasWriteAccess.value) return
  targetNote.value = note
  isDeleteConfirmOpen.value = true
}

const confirmDelete = async () => {
  if (!targetNote.value || !hasWriteAccess.value) return

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
  <div class="admin-page">
    <header class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
      <div class="max-w-3xl">
        <div class="admin-kicker">{{ copy.eyebrow }}</div>
        <h1 class="admin-headline mt-3">{{ copy.title }}</h1>
        <p class="admin-subtitle mt-5">
          {{ copy.summaryPrefix }}
          <span class="font-semibold text-[var(--ink-strong)]">{{ currentWorkspaceName }}</span>
          {{ copy.summarySuffix }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span :class="hasWriteAccess ? 'admin-chip-dark' : 'admin-chip'">
          {{ hasWriteAccess ? copy.writable : copy.readonly }}
        </span>
        <button v-if="hasWriteAccess" class="product-button-dark" type="button" @click="createNote">
          {{ copy.newNote }}
        </button>
      </div>
    </header>

    <div v-if="!hasWriteAccess" class="mt-5 rounded-[18px] bg-[rgba(229,106,43,0.08)] px-5 py-4 text-sm font-semibold text-[var(--brand-deep)]">
      {{ copy.readonlyHint }}
    </div>

    <div v-if="errorMessage" class="product-error mt-5 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <section class="admin-card mt-6 p-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div class="text-sm font-semibold text-[var(--ink-main)]">
          {{ copy.filtersTitle }}
        </div>
        <div class="admin-chip">
          {{ copy.resultCount }} {{ notes.length }}
        </div>
      </div>

      <div class="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
        <input v-model="searchTerm" type="text" class="admin-input" :placeholder="copy.searchPlaceholder" />
        <select v-model="selectedNodeId" class="admin-select">
          <option value="all">{{ copy.allNodes }}</option>
          <option v-for="node in nodes" :key="node.id" :value="String(node.id)">
            {{ node.title }}
          </option>
        </select>
      </div>
    </section>

    <div v-if="loading" class="admin-empty mt-6">
      {{ copy.loading }}
    </div>

    <section v-else-if="notes.length > 0" class="mt-6 grid gap-4 xl:grid-cols-2">
      <article v-for="note in notes" :key="note.id" class="admin-card p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <span class="admin-chip-warm">{{ getNodeTitle(note.node_id) }}</span>
            <span class="admin-chip">{{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}</span>
          </div>

          <div class="flex items-center gap-4">
            <button class="text-sm font-semibold text-[var(--ink-main)]" type="button" @click="openNote(note.id)">{{ copy.open }}</button>
            <button v-if="hasWriteAccess" class="text-sm font-semibold text-[var(--ink-strong)]" type="button" @click="editNote(note.id)">
              {{ copy.edit }}
            </button>
            <button v-if="hasWriteAccess" class="text-sm font-semibold text-[var(--danger)]" type="button" @click="triggerDelete(note)">
              {{ copy.delete }}
            </button>
          </div>
        </div>

        <div class="mt-4 text-xl font-semibold tracking-[-0.03em] text-[var(--ink-strong)]">{{ note.title }}</div>
        <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ note.summary || copy.noSummary }}</p>
      </article>
    </section>

    <div v-else class="admin-empty mt-6">
      {{ copy.noResults }}
    </div>

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
