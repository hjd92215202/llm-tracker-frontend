<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { Note, RoadmapNode } from '@/types'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const nodes = ref<RoadmapNode[]>([])
const selectedNode = ref<RoadmapNode | null>(null)
const notes = ref<Note[]>([])
const loading = ref(false)
const loadingNotes = ref(false)
const errorMessage = ref('')

const copy = computed(() =>
  localeStore.isChinese
    ? {
        title: '路线图',
        summary: '点击节点，向下继续看对应笔记。',
        loading: '正在加载路线图...',
        loadError: '加载路线图失败',
        linkedNotes: '相关笔记',
        noNotes: '这个节点下还没有笔记。',
        noDescription: '这个节点还没有补充说明。',
        openNote: '查看笔记',
        notesAction: '笔记',
        manageAction: '管理',
        emptyHint: '点击上方节点后，相关笔记会显示在这里。',
        theory: '理论',
        coding: '编码',
        project: '项目',
        todo: '待开始',
        inProgress: '进行中',
        completed: '已完成',
      }
    : {
        title: 'Roadmap',
        summary: 'Click a node and scroll down to view the related notes.',
        loading: 'Loading roadmap...',
        loadError: 'Unable to load roadmap',
        linkedNotes: 'Related notes',
        noNotes: 'There are no notes under this node yet.',
        noDescription: 'No description yet.',
        openNote: 'Open note',
        notesAction: 'Notes',
        manageAction: 'Manage',
        emptyHint: 'Click a node above and the related notes will appear here.',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
      }
)

const workspaceName = computed(() => authStore.activeWorkspace?.workspace_name || copy.value.title)

const flowNodes = computed(() =>
  nodes.value.map((node) => ({
    id: String(node.id),
    label: node.title,
    data: node,
    position: {
      x: node.node_type === 'theory' ? 80 : node.node_type === 'coding' ? 340 : 600,
      y: node.sort_order * 176 + 56,
    },
    class: `share-node share-node-${node.status}`,
  }))
)

const flowEdges = computed(() =>
  nodes.value
    .filter((node) => node.parent_id)
    .map((node) => ({
      id: `edge-${node.parent_id}-${node.id}`,
      source: String(node.parent_id),
      target: String(node.id),
      animated: node.status === 'in_progress',
      type: 'smoothstep',
      style: { stroke: '#d1d5db', strokeWidth: 2.5 },
    }))
)

const typeLabel = (type: RoadmapNode['node_type']) => {
  if (type === 'coding') return copy.value.coding
  if (type === 'project') return copy.value.project
  return copy.value.theory
}

const statusLabel = (status: RoadmapNode['status']) => {
  if (status === 'completed') return copy.value.completed
  if (status === 'in_progress') return copy.value.inProgress
  return copy.value.todo
}

const fetchRoadmap = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    nodes.value = (await roadmapApi.getNodes()).sort((a, b) => a.sort_order - b.sort_order)
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const selectNode = async (node: RoadmapNode) => {
  selectedNode.value = node
  loadingNotes.value = true

  try {
    notes.value = await noteApi.getNotesByNode(node.id)
    setTimeout(() => {
      document.getElementById('roadmap-notes-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  } catch {
    notes.value = []
  } finally {
    loadingNotes.value = false
  }
}

const handleNodeClick = async (payload: { node: { data: RoadmapNode } }) => {
  await selectNode(payload.node.data)
}

const openNote = (id: number) => router.push(`/note/${id}`)

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchRoadmap()
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fafaf8_0%,#f4f6f8_100%)] px-3 py-3 md:px-4 md:py-4">
    <section class="relative overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.06)] bg-white">
      <div class="flex flex-col gap-4 border-b border-[rgba(15,23,42,0.06)] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div class="min-w-0">
          <div class="truncate text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            {{ workspaceName }}
          </div>
          <div class="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <h1 class="text-2xl font-black tracking-[-0.05em] text-[var(--ink-strong)] md:text-3xl">{{ copy.title }}</h1>
            <p class="text-sm text-[var(--ink-soft)] md:text-base">{{ copy.summary }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button class="product-button-secondary !px-4 !py-2.5" type="button" @click="router.push('/admin/notes')">
            {{ copy.notesAction }}
          </button>
          <button class="product-button-dark !px-4 !py-2.5" type="button" @click="router.push('/admin/roadmap')">
            {{ copy.manageAction }}
          </button>
        </div>
      </div>

      <div class="share-canvas-shell">
        <div v-if="loading" class="admin-empty !border-none !bg-transparent !p-0">{{ copy.loading }}</div>

        <VueFlow
          v-else
          class="h-full w-full bg-transparent"
          :nodes="flowNodes"
          :edges="flowEdges"
          :default-viewport="{ x: 0, y: 0, zoom: 0.82 }"
          :min-zoom="0.48"
          :max-zoom="1.3"
          :nodes-draggable="false"
          :elements-selectable="false"
          @node-click="handleNodeClick"
        >
          <Background pattern-color="#e5e7eb" :gap="26" variant="dots" />
          <Controls />
        </VueFlow>
      </div>
    </section>

    <div v-if="errorMessage" class="product-error mx-auto mt-4 max-w-6xl px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <section
      id="roadmap-notes-section"
      class="mx-auto mt-4 max-w-6xl rounded-[32px] border border-[rgba(15,23,42,0.06)] bg-white px-6 py-6 md:px-8"
    >
      <template v-if="selectedNode">
        <div class="flex flex-wrap gap-2">
          <span class="admin-chip-warm">{{ typeLabel(selectedNode.node_type) }}</span>
          <span :class="selectedNode.status === 'completed' ? 'admin-chip-green' : selectedNode.status === 'in_progress' ? 'admin-chip-blue' : 'admin-chip'">
            {{ statusLabel(selectedNode.status) }}
          </span>
        </div>

        <h2 class="mt-4 text-3xl font-bold tracking-[-0.04em] text-[var(--ink-strong)]">{{ selectedNode.title }}</h2>
        <p class="mt-3 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">{{ selectedNode.description || copy.noDescription }}</p>

        <div class="mt-8 text-sm font-semibold text-[var(--ink-main)]">{{ copy.linkedNotes }}</div>

        <div v-if="loadingNotes" class="admin-empty mt-4">{{ copy.loading }}</div>
        <div v-else-if="notes.length > 0" class="mt-4 grid gap-4 md:grid-cols-2">
          <article v-for="note in notes" :key="note.id" class="admin-list-card cursor-pointer" @click="openNote(note.id)">
            <div class="text-base font-semibold text-[var(--ink-strong)]">{{ note.title }}</div>
            <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ note.summary || copy.noDescription }}</p>
            <button class="mt-4 text-sm font-semibold text-[var(--ink-strong)]" type="button">
              {{ copy.openNote }}
            </button>
          </article>
        </div>
        <div v-else class="admin-empty mt-4">{{ copy.noNotes }}</div>
      </template>

      <div v-else class="admin-empty">{{ copy.emptyHint }}</div>
    </section>
  </div>
</template>

<style scoped>
.share-canvas-shell {
  height: calc(100vh - 170px);
  min-height: 640px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 245, 0.94));
}

:deep(.share-node) {
  min-width: 220px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.98);
  padding: 18px 20px;
  color: var(--ink-strong);
  font-size: 15px;
  font-weight: 700;
  text-align: center;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
}

:deep(.share-node-in_progress) {
  border-color: rgba(15, 23, 42, 0.36);
  box-shadow: 0 0 0 6px rgba(15, 23, 42, 0.04), 0 14px 30px rgba(15, 23, 42, 0.08);
}

:deep(.share-node-completed) {
  border-color: rgba(21, 128, 61, 0.2);
  background: rgba(248, 255, 251, 0.98);
}
</style>
