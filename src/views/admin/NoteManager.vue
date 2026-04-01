<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { useAuthStore } from '@/store/auth'
import type { Note, RoadmapNode } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const notes = ref<Note[]>([])
const nodes = ref<RoadmapNode[]>([])
const loading = ref(false)
const isDeleteConfirmOpen = ref(false)
const targetNote = ref<Note | null>(null)

const currentWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? 'Workspace')
const hasWriteAccess = computed(() => authStore.hasWriteAccess)

const fetchData = async () => {
  loading.value = true

  try {
    const [nodesData, notesData] = await Promise.all([roadmapApi.getNodes(), noteApi.getAllNotes()])
    nodes.value = nodesData
    notes.value = notesData
  } finally {
    loading.value = false
  }
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchData()
  },
  { immediate: true }
)

const getNodeTitle = (nodeId: number | null) => {
  if (!nodeId) {
    return 'General'
  }

  return nodes.value.find((node) => node.id === nodeId)?.title || 'Unknown node'
}

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
    await fetchData()
  } catch {
    alert('Unable to delete note right now')
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">Research notes</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">Keep team learnings searchable and tied to execution.</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
          These notes are scoped to <span class="font-black text-slate-800">{{ currentWorkspaceName }}</span>.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {{ hasWriteAccess ? 'Edit enabled' : 'Read only role' }}
        </div>
        <button
          @click="createNote"
          :disabled="!hasWriteAccess"
          class="rounded-2xl bg-blue-600 px-6 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] transition-all hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          New note
        </button>
      </div>
    </header>

    <div v-if="!hasWriteAccess" class="mt-8 rounded-[1.8rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
      Your current role can review notes, but only owners, admins, and members can create or modify them.
    </div>

    <div class="mt-10 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <table class="w-full border-collapse">
        <thead class="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th class="px-6 py-4">Published</th>
            <th class="px-6 py-4">Title and summary</th>
            <th class="px-6 py-4">Linked node</th>
            <th class="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody v-if="!loading" class="divide-y divide-slate-100">
          <tr v-for="note in notes" :key="note.id" class="hover:bg-slate-50/80">
            <td class="px-6 py-5 text-sm font-semibold text-slate-500">
              {{ new Date(note.created_at).toLocaleDateString() }}
            </td>
            <td class="px-6 py-5">
              <div class="font-black text-slate-900">{{ note.title }}</div>
              <div class="mt-1 text-sm text-slate-500">{{ note.summary || 'No summary available yet' }}</div>
            </td>
            <td class="px-6 py-5">
              <span class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                {{ getNodeTitle(note.node_id) }}
              </span>
            </td>
            <td class="px-6 py-5 text-right">
              <div class="inline-flex items-center gap-4">
                <button
                  @click="editNote(note.id)"
                  :disabled="!hasWriteAccess"
                  class="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 transition-all hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Edit
                </button>
                <button
                  @click="triggerDelete(note)"
                  :disabled="!hasWriteAccess"
                  class="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 transition-all hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="notes.length === 0">
            <td colspan="4" class="px-6 py-16 text-center text-sm font-semibold text-slate-400">
              No notes have been captured in this workspace yet.
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="px-6 py-16 text-center text-sm font-semibold text-slate-400">
        Loading workspace notes...
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-110 flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel relative w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <h3 class="text-2xl font-black tracking-[-0.05em] text-slate-950">Delete this note?</h3>
            <p class="mt-3 text-sm leading-7 text-slate-500">
              This removes <span class="font-black text-slate-800">{{ targetNote?.title }}</span> from the workspace knowledge base.
            </p>
            <div class="mt-8 flex flex-col gap-3">
              <button @click="confirmDelete" class="danger-button w-full">Delete permanently</button>
              <button @click="isDeleteConfirmOpen = false" class="secondary-button w-full">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

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
