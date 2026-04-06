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
        title: '笔记',
        summaryPrefix: '当前内容属于',
        summarySuffix: '空间，按节点沉淀方法、结论和关键过程。',
        writable: '可编辑',
        readonly: '只读',
        newNote: '新建笔记',
        readonlyHint: '你可以查看笔记，只有拥有写权限的成员可以新建或编辑。',
        searchPlaceholder: '搜索标题、摘要或正文内容',
        allNodes: '全部节点',
        resultCount: '笔记',
        noSummary: '还没有摘要，打开后继续补充。',
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
        openRoadmap: hasWriteAccess.value ? '进入编辑台' : '进入路线图',
        emptyTitle: '还没有笔记',
        emptyCopy: '先从关键节点开始，把结论、方法和过程记下来。',
      }
    : {
        eyebrow: 'Notes',
        title: 'Notes',
        summaryPrefix: 'These notes belong to',
        summarySuffix: 'workspace and capture the method, finding, and key context under each node.',
        writable: 'Editable',
        readonly: 'Read only',
        newNote: 'New note',
        readonlyHint: 'You can review notes, but only members with write access can create or update them.',
        searchPlaceholder: 'Search title, summary, or content',
        allNodes: 'All nodes',
        resultCount: 'Notes',
        noSummary: 'No summary yet. Open it to continue.',
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
        openRoadmap: hasWriteAccess.value ? 'Open editor' : 'Open roadmap',
        emptyTitle: 'No notes yet',
        emptyCopy: 'Start with the key nodes and capture the method, finding, or decision.',
      }
)

const currentWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? copy.value.workspaceFallback)
const hasWriteAccess = computed(() => authStore.hasWriteAccess)
const openRoadmapActionLabel = computed(() => (localeStore.isChinese ? '进入路线图' : 'Open roadmap'))
const selectedNodeLabel = computed(() => {
  if (selectedNodeId.value === 'all') return copy.value.allNodes
  return nodes.value.find((node) => String(node.id) === selectedNodeId.value)?.title || copy.value.unknownNode
})

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
  router.push({
    path: '/admin/note/create',
    query: selectedNodeId.value !== 'all' ? { nodeId: selectedNodeId.value } : {},
  })
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

        <div class="mt-5 flex flex-wrap gap-2">
          <span class="admin-chip-dark">{{ currentWorkspaceName }}</span>
          <span class="admin-chip">{{ selectedNodeLabel }}</span>
          <span class="admin-chip">{{ copy.resultCount }} {{ notes.length }}</span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span :class="hasWriteAccess ? 'admin-chip-dark' : 'admin-chip'">
          {{ hasWriteAccess ? copy.writable : copy.readonly }}
        </span>
        <button class="product-button-secondary" type="button" @click="router.push('/roadmap')">
          {{ openRoadmapActionLabel }}
        </button>
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

    <section class="admin-toolbar mt-6">
      <div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
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

    <section v-else-if="notes.length > 0" class="note-grid mt-6">
      <article v-for="note in notes" :key="note.id" class="admin-list-card note-card">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex min-w-0 flex-wrap gap-2">
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

        <div class="mt-5 text-[1.35rem] font-semibold tracking-[-0.04em] text-[var(--ink-strong)]">{{ note.title }}</div>
        <p class="mt-3 line-clamp-4 text-sm leading-7 text-[var(--ink-soft)]">{{ note.summary || copy.noSummary }}</p>
      </article>
    </section>

    <section v-else class="admin-card mt-6 px-6 py-8 text-center">
      <div class="mx-auto max-w-xl">
        <div class="text-xl font-semibold tracking-[-0.03em] text-[var(--ink-strong)]">{{ copy.emptyTitle }}</div>
        <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
          {{ searchTerm || selectedNodeId !== 'all' ? copy.noResults : copy.emptyCopy }}
        </p>

        <div class="mt-6 flex flex-wrap justify-center gap-3">
          <button v-if="hasWriteAccess" class="product-button-dark" type="button" @click="createNote">
            {{ copy.newNote }}
          </button>
          <button
            class="product-button-secondary"
            type="button"
            @click="router.push('/roadmap')"
          >
            {{ openRoadmapActionLabel }}
          </button>
        </div>
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

<style scoped>
.note-grid {
  display: grid;
  gap: 16px;
}

.note-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 250, 248, 0.96));
  padding: 22px;
}
</style>
