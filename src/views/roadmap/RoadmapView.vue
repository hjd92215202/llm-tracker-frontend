<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { VueFlow } from '@vue-flow/core'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { workspaceApi } from '@/api/workspace'
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
const shareMessage = ref('')

const copy = computed(() =>
  localeStore.isChinese
    ? {
        title: '路线图',
        summary: '把重要路径摆在第一屏，点一个节点就继续往下看对应笔记。',
        loading: '正在加载路线图...',
        loadError: '加载路线图失败',
        linkedNotes: '关联笔记',
        noNotes: '这个节点下还没有笔记。',
        noDescription: '这个节点还没有补充说明。',
        openNote: '查看笔记',
        createNote: '新建笔记',
        manageAction: '管理路线图',
        shareAction: '复制分享链接',
        shareDone: '分享链接已复制',
        emptyHint: '先点上方节点，再往下看具体方法、结论和过程。',
        totalNodes: '节点',
        activeNodes: '进行中',
        completedNodes: '已完成',
        usageLabel: '使用方式',
        usageHint: '先点节点，再往下看笔记',
        theory: '理论',
        coding: '编码',
        project: '项目',
        todo: '待开始',
        inProgress: '进行中',
        completed: '已完成',
      }
    : {
        title: 'Roadmap',
        summary: 'Keep the path on the first screen, then click a node and continue into the notes below.',
        loading: 'Loading roadmap...',
        loadError: 'Unable to load roadmap',
        linkedNotes: 'Related notes',
        noNotes: 'There are no notes under this node yet.',
        noDescription: 'No description yet.',
        openNote: 'Open note',
        createNote: 'Create note',
        manageAction: 'Manage roadmap',
        shareAction: 'Copy share link',
        shareDone: 'Share link copied',
        emptyHint: 'Click a node above, then continue into the details below.',
        totalNodes: 'Nodes',
        activeNodes: 'Active',
        completedNodes: 'Done',
        usageLabel: 'How to use',
        usageHint: 'Click a node, then continue into the notes',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
      }
)

const workspaceName = computed(() => authStore.activeWorkspace?.workspace_name || copy.value.title)
const roadmapProgress = computed(() => {
  if (nodes.value.length === 0) return 0
  const completed = nodes.value.filter((node) => node.status === 'completed').length
  return Math.round((completed / nodes.value.length) * 100)
})
const activeCount = computed(() => nodes.value.filter((node) => node.status === 'in_progress').length)

const flowNodes = computed(() =>
  nodes.value.map((node) => ({
    id: String(node.id),
    label: node.title,
    data: node,
    position: {
      x: node.node_type === 'theory' ? 80 : node.node_type === 'coding' ? 340 : 600,
      y: node.sort_order * 176 + 56,
    },
    class: `roadmap-node roadmap-node-${node.status} ${selectedNode.value?.id === node.id ? 'roadmap-node-selected' : ''}`,
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

    if (selectedNode.value && !nodes.value.some((node) => node.id === selectedNode.value?.id)) {
      selectedNode.value = null
      notes.value = []
    }
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

const createNote = () => {
  if (!selectedNode.value || !authStore.hasWriteAccess) return
  router.push({
    name: 'admin-note-create',
    query: { nodeId: String(selectedNode.value.id) },
  })
}

const copyShareLink = async () => {
  if (!authStore.activeWorkspaceId) return

  try {
    const share = await workspaceApi.createShareLink(authStore.activeWorkspaceId)
    await navigator.clipboard.writeText(`${window.location.origin}${share.share_url}`)
    shareMessage.value = copy.value.shareDone
  } catch {
    shareMessage.value = copy.value.loadError
  }

  window.setTimeout(() => {
    shareMessage.value = ''
  }, 2200)
}

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
      <div class="roadmap-hero">
        <div class="min-w-0">
          <div class="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--ink-soft)]">
            {{ workspaceName }}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <h1 class="text-[2rem] font-black tracking-[-0.06em] text-[var(--ink-strong)] md:text-[2.5rem]">{{ copy.title }}</h1>
            <span class="admin-chip">{{ roadmapProgress }}%</span>
          </div>
          <p class="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink-soft)] md:text-base">
            {{ copy.summary }}
          </p>
        </div>

        <div class="roadmap-actions">
          <button class="product-button-secondary !px-4 !py-2.5" type="button" @click="copyShareLink">
            {{ copy.shareAction }}
          </button>
          <button class="product-button-dark !px-4 !py-2.5" type="button" @click="router.push('/admin/roadmap')">
            {{ copy.manageAction }}
          </button>
        </div>
      </div>

      <div class="roadmap-strip">
        <div class="roadmap-strip-item">
          <div class="roadmap-strip-label">{{ copy.totalNodes }}</div>
          <div class="roadmap-strip-value">{{ nodes.length }}</div>
        </div>
        <div class="roadmap-strip-item">
          <div class="roadmap-strip-label">{{ copy.activeNodes }}</div>
          <div class="roadmap-strip-value">{{ activeCount }}</div>
        </div>
        <div class="roadmap-strip-item">
          <div class="roadmap-strip-label">{{ copy.completedNodes }}</div>
          <div class="roadmap-strip-value">{{ nodes.filter((node) => node.status === 'completed').length }}</div>
        </div>
        <div class="roadmap-strip-item roadmap-strip-item-hint">
          <div class="roadmap-strip-label">{{ copy.usageLabel }}</div>
          <div class="roadmap-strip-copy">{{ copy.usageHint }}</div>
        </div>
      </div>

      <div v-if="shareMessage" class="roadmap-toast">
        {{ shareMessage }}
      </div>

      <div class="roadmap-canvas-shell">
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
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex flex-wrap gap-2">
            <span class="admin-chip-warm">{{ typeLabel(selectedNode.node_type) }}</span>
            <span :class="selectedNode.status === 'completed' ? 'admin-chip-green' : selectedNode.status === 'in_progress' ? 'admin-chip-blue' : 'admin-chip'">
              {{ statusLabel(selectedNode.status) }}
            </span>
          </div>

          <button
            v-if="authStore.hasWriteAccess"
            class="product-button-secondary !px-4 !py-2.5"
            type="button"
            @click="createNote"
          >
            {{ copy.createNote }}
          </button>
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
.roadmap-hero {
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  padding: 20px 20px 18px;
}

.roadmap-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roadmap-strip {
  display: grid;
  gap: 10px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  padding: 14px 20px;
}

.roadmap-strip-item {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: rgba(247, 247, 245, 0.8);
  padding: 14px 16px;
}

.roadmap-strip-label {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 700;
}

.roadmap-strip-value {
  margin-top: 8px;
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
}

.roadmap-strip-copy {
  margin-top: 8px;
  color: var(--ink-main);
  font-size: 14px;
  font-weight: 700;
}

.roadmap-strip-item-hint {
  background: rgba(255, 250, 242, 0.88);
}

.roadmap-toast {
  position: absolute;
  right: 20px;
  top: 22px;
  z-index: 10;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  padding: 9px 14px;
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.roadmap-canvas-shell {
  height: calc(100vh - 246px);
  min-height: 620px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 245, 0.94));
}

:deep(.roadmap-node) {
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

:deep(.roadmap-node-selected) {
  border-color: rgba(229, 106, 43, 0.4);
  box-shadow: 0 0 0 5px rgba(229, 106, 43, 0.08), 0 16px 28px rgba(15, 23, 42, 0.08);
}

:deep(.roadmap-node-in_progress) {
  border-color: rgba(15, 23, 42, 0.36);
  box-shadow: 0 0 0 6px rgba(15, 23, 42, 0.04), 0 14px 30px rgba(15, 23, 42, 0.08);
}

:deep(.roadmap-node-completed) {
  border-color: rgba(21, 128, 61, 0.2);
  background: rgba(248, 255, 251, 0.98);
}

@media (min-width: 768px) {
  .roadmap-hero {
    flex-direction: row;
    align-items: end;
    justify-content: space-between;
    padding: 24px 24px 20px;
  }

  .roadmap-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    padding: 14px 24px;
  }
}
</style>
