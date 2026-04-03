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
const linkedNotes = ref<Note[]>([])
const selectedNodeId = ref<number | null>(null)
const loading = ref(false)
const loadingNotes = ref(false)
const errorMessage = ref('')
const shareMessage = ref('')
const isEditModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const currentEditNode = ref<Partial<RoadmapNode>>({})

const copy = computed(() =>
  localeStore.isChinese
    ? {
        kicker: '路线图',
        title: '路线图',
        summary: '先看主线，再点节点往下看内容。',
        share: '复制分享链接',
        shareDone: '链接已复制',
        addNode: '新增节点',
        addNote: '新增笔记',
        readonly: '只读查看',
        writable: '可编辑',
        loading: '正在加载路线图...',
        loadError: '加载路线图失败',
        noWorkspace: '当前没有可用空间。',
        emptyTitle: '选一个节点继续往下看',
        emptyCopy: '节点说明和关联笔记会出现在下方，方便从全局直接进入细节。',
        linkedNotes: '节点内容',
        noNotes: '这个节点下还没有笔记。',
        openNote: '打开笔记',
        noDescription: '这个节点还没有补充说明。',
        edit: '编辑节点',
        save: '保存节点',
        delete: '删除节点',
        cancel: '取消',
        createTitle: '新建节点',
        editTitle: '编辑节点',
        titleLabel: '标题',
        descriptionLabel: '说明',
        typeLabel: '类型',
        statusLabel: '状态',
        saveError: '保存节点失败',
        deleteError: '删除节点失败',
        deleteTitle: '确认删除这个节点吗？',
        deleteBodyPrefix: '删除后，',
        deleteBodySuffix: '会从路线图中移除，并重新连接后续节点。',
        deleteAction: '永久删除',
        theory: '理论',
        coding: '编码',
        project: '项目',
        todo: '待开始',
        inProgress: '进行中',
        completed: '已完成',
        totalNodes: '节点',
        selectedNotes: '关联笔记',
        openCanvas: '点节点展开内容',
      }
    : {
        kicker: 'Roadmap',
        title: 'Roadmap',
        summary: 'See the path first, then click a node and continue into the content below.',
        share: 'Copy share link',
        shareDone: 'Link copied',
        addNode: 'Add node',
        addNote: 'Add note',
        readonly: 'Read only',
        writable: 'Editable',
        loading: 'Loading roadmap...',
        loadError: 'Unable to load roadmap',
        noWorkspace: 'There is no active workspace.',
        emptyTitle: 'Select a node to continue',
        emptyCopy: 'The node description and related notes appear below the canvas.',
        linkedNotes: 'Node content',
        noNotes: 'There are no notes under this node yet.',
        openNote: 'Open note',
        noDescription: 'No description yet.',
        edit: 'Edit node',
        save: 'Save node',
        delete: 'Delete node',
        cancel: 'Cancel',
        createTitle: 'Create node',
        editTitle: 'Edit node',
        titleLabel: 'Title',
        descriptionLabel: 'Description',
        typeLabel: 'Type',
        statusLabel: 'Status',
        saveError: 'Unable to save node',
        deleteError: 'Unable to delete node',
        deleteTitle: 'Delete this node?',
        deleteBodyPrefix: '',
        deleteBodySuffix: 'will be removed from the roadmap and the chain will reconnect.',
        deleteAction: 'Delete permanently',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
        totalNodes: 'Nodes',
        selectedNotes: 'Linked notes',
        openCanvas: 'Click a node to open content',
      }
)

const hasWriteAccess = computed(() => authStore.hasWriteAccess)
const currentWorkspace = computed(() => authStore.activeWorkspace)
const selectedNode = computed(() => nodes.value.find((node) => node.id === selectedNodeId.value) ?? null)
const roadmapMetrics = computed(() => ({
  total: nodes.value.length,
  inProgress: nodes.value.filter((node) => node.status === 'in_progress').length,
  completed: nodes.value.filter((node) => node.status === 'completed').length,
  selectedNotes: linkedNotes.value.length,
}))

const flowNodes = computed(() =>
  nodes.value.map((node) => ({
    id: String(node.id),
    label: node.title,
    data: node,
    position: {
      x: node.node_type === 'theory' ? 60 : node.node_type === 'coding' ? 320 : 580,
      y: node.sort_order * 170 + 48,
    },
    class: `roadmap-canvas-node roadmap-canvas-node-${node.status}`,
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

const fetchNodes = async () => {
  if (!authStore.activeWorkspaceId) {
    nodes.value = []
    selectedNodeId.value = null
    linkedNotes.value = []
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    nodes.value = (await roadmapApi.getNodes()).sort((a, b) => a.sort_order - b.sort_order)

    if (selectedNodeId.value && !nodes.value.some((node) => node.id === selectedNodeId.value)) {
      selectedNodeId.value = null
      linkedNotes.value = []
    }
  } catch (error: any) {
    nodes.value = []
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const loadNotes = async (nodeId: number) => {
  loadingNotes.value = true

  try {
    linkedNotes.value = await noteApi.getNotesByNode(nodeId)
    setTimeout(() => {
      document.getElementById('admin-roadmap-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  } catch {
    linkedNotes.value = []
  } finally {
    loadingNotes.value = false
  }
}

const selectNode = async (node: RoadmapNode) => {
  selectedNodeId.value = node.id
  await loadNotes(node.id)
}

const handleNodeClick = async (payload: { node: { data: RoadmapNode } }) => {
  await selectNode(payload.node.data)
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

const openEdit = (node: RoadmapNode | null = null) => {
  if (!hasWriteAccess.value) return

  currentEditNode.value = node
    ? { ...node }
    : { title: '', description: '', node_type: 'theory', status: 'todo' }

  isEditModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeEdit = () => {
  isEditModalOpen.value = false
  isDeleteConfirmOpen.value = false
  document.body.style.overflow = 'auto'
}

const handleSave = async () => {
  if (!hasWriteAccess.value) return

  try {
    if (currentEditNode.value.id) {
      await roadmapApi.updateNode(currentEditNode.value.id, currentEditNode.value)
    } else {
      const lastNode = nodes.value[nodes.value.length - 1] ?? null
      await roadmapApi.createNode({
        ...currentEditNode.value,
        sort_order: nodes.value.length,
        parent_id: lastNode?.id ?? null,
      })
    }

    closeEdit()
    await fetchNodes()
  } catch {
    errorMessage.value = copy.value.saveError
  }
}

const confirmDelete = async () => {
  if (!currentEditNode.value.id || !hasWriteAccess.value) return

  try {
    const remainingNodes = nodes.value.filter((node) => node.id !== currentEditNode.value.id)

    await Promise.all(
      remainingNodes.map((node, index) => {
        const previousNode = index === 0 ? null : remainingNodes[index - 1] ?? null

        return roadmapApi.updateNode(node.id, {
          ...node,
          sort_order: index,
          parent_id: previousNode?.id ?? null,
        })
      })
    )

    await roadmapApi.deleteNode(currentEditNode.value.id)
    closeEdit()
    await fetchNodes()
  } catch {
    errorMessage.value = copy.value.deleteError
  }
}

const openNote = (id: number) => router.push(`/note/${id}`)
const createNoteForSelectedNode = () => {
  if (!hasWriteAccess.value || !selectedNodeId.value) return
  router.push({
    path: '/admin/note/create',
    query: { nodeId: String(selectedNodeId.value) },
  })
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchNodes()
  },
  { immediate: true }
)
</script>

<template>
  <div class="admin-page">
    <div v-if="errorMessage" class="product-error mb-5 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <div v-if="!currentWorkspace" class="admin-empty">
      {{ copy.noWorkspace }}
    </div>

    <template v-else>
      <section>
        <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div class="admin-kicker">{{ currentWorkspace.workspace_name }}</div>
            <h1 class="roadmap-title mt-3">{{ copy.title }}</h1>
            <p class="admin-subtitle mt-4 max-w-2xl">{{ copy.summary }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <span :class="hasWriteAccess ? 'admin-chip-dark' : 'admin-chip'">
              {{ hasWriteAccess ? copy.writable : copy.readonly }}
            </span>
            <button class="product-button-secondary" type="button" @click="copyShareLink">{{ copy.share }}</button>
            <button v-if="hasWriteAccess" class="product-button-dark" type="button" @click="openEdit()">{{ copy.addNode }}</button>
          </div>
        </div>

        <div v-if="shareMessage" class="mt-4 inline-flex rounded-full bg-[rgba(15,23,42,0.06)] px-4 py-2 text-sm font-semibold text-[var(--ink-main)]">
          {{ shareMessage }}
        </div>

        <div class="roadmap-metric-grid mt-5">
          <article class="roadmap-metric-card">
            <div class="admin-kpi-label">{{ copy.totalNodes }}</div>
            <div class="roadmap-metric-value">{{ roadmapMetrics.total }}</div>
          </article>
          <article class="roadmap-metric-card">
            <div class="admin-kpi-label">{{ copy.inProgress }}</div>
            <div class="roadmap-metric-value">{{ roadmapMetrics.inProgress }}</div>
          </article>
          <article class="roadmap-metric-card">
            <div class="admin-kpi-label">{{ copy.completed }}</div>
            <div class="roadmap-metric-value">{{ roadmapMetrics.completed }}</div>
          </article>
          <article class="roadmap-metric-card">
            <div class="admin-kpi-label">{{ copy.selectedNotes }}</div>
            <div class="roadmap-metric-value">{{ roadmapMetrics.selectedNotes }}</div>
          </article>
        </div>

        <div class="roadmap-canvas-shell mt-6">
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

          <div v-if="!loading" class="roadmap-canvas-hint">
            {{ selectedNode ? selectedNode.title : copy.openCanvas }}
          </div>
        </div>
      </section>

      <section id="admin-roadmap-detail" class="roadmap-detail-shell mt-6">
        <template v-if="selectedNode">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap gap-2">
                <span class="admin-chip-warm">{{ typeLabel(selectedNode.node_type) }}</span>
                <span :class="selectedNode.status === 'completed' ? 'admin-chip-green' : selectedNode.status === 'in_progress' ? 'admin-chip-blue' : 'admin-chip'">
                  {{ statusLabel(selectedNode.status) }}
                </span>
              </div>

              <h2 class="mt-4 text-3xl font-bold tracking-[-0.04em] text-[var(--ink-strong)]">{{ selectedNode.title }}</h2>
              <p class="mt-3 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">{{ selectedNode.description || copy.noDescription }}</p>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <button v-if="hasWriteAccess" class="product-button-dark" type="button" @click="createNoteForSelectedNode">
                {{ copy.addNote }}
              </button>
              <button v-if="hasWriteAccess" class="product-button-secondary" type="button" @click="openEdit(selectedNode)">
                {{ copy.edit }}
              </button>
            </div>
          </div>

          <div class="mt-8 flex items-center justify-between gap-4">
            <div class="text-sm font-semibold text-[var(--ink-main)]">{{ copy.linkedNotes }}</div>
            <div class="admin-chip">
              {{ linkedNotes.length }}
            </div>
          </div>

          <div v-if="loadingNotes" class="admin-empty mt-4">{{ copy.loading }}</div>
          <div v-else-if="linkedNotes.length > 0" class="mt-4 grid gap-4 md:grid-cols-2">
            <article v-for="note in linkedNotes" :key="note.id" class="admin-list-card roadmap-note-card">
              <div class="flex flex-wrap gap-2">
                <span class="admin-chip-warm">{{ typeLabel(selectedNode.node_type) }}</span>
                <span class="admin-chip">{{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}</span>
              </div>

              <div class="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--ink-strong)]">{{ note.title }}</div>
              <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ note.summary || copy.noDescription }}</p>
              <button class="mt-5 text-sm font-semibold text-[var(--ink-strong)]" type="button" @click="openNote(note.id)">
                {{ copy.openNote }}
              </button>
            </article>
          </div>
          <div v-else class="admin-empty mt-4">
            <div class="text-base font-semibold text-[var(--ink-strong)]">{{ copy.noNotes }}</div>
            <button v-if="hasWriteAccess" class="product-button-secondary mt-4" type="button" @click="createNoteForSelectedNode">
              {{ copy.addNote }}
            </button>
          </div>
        </template>

        <div v-else class="admin-empty !border-dashed !bg-[rgba(255,255,255,0.52)]">
          <div class="text-base font-semibold text-[var(--ink-strong)]">{{ copy.emptyTitle }}</div>
          <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ copy.emptyCopy }}</p>
        </div>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isEditModalOpen" class="fixed inset-0 z-[100] flex justify-end overflow-hidden">
          <div class="absolute inset-0 bg-[rgba(15,23,42,0.22)] backdrop-blur-sm" @click="closeEdit"></div>
          <div class="drawer-panel">
            <h2 class="border-b border-[rgba(15,23,42,0.08)] pb-5 text-2xl font-bold tracking-[-0.04em] text-[var(--ink-strong)]">
              {{ currentEditNode.id ? copy.editTitle : copy.createTitle }}
            </h2>

            <div class="mt-6 flex-1 space-y-5 overflow-y-auto pr-2">
              <div class="space-y-2">
                <label class="product-label">{{ copy.titleLabel }}</label>
                <input v-model="currentEditNode.title" type="text" class="admin-input" />
              </div>

              <div class="space-y-2">
                <label class="product-label">{{ copy.descriptionLabel }}</label>
                <textarea v-model="currentEditNode.description" rows="5" class="admin-input"></textarea>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <label class="product-label">{{ copy.typeLabel }}</label>
                  <select v-model="currentEditNode.node_type" class="admin-select">
                    <option value="theory">{{ copy.theory }}</option>
                    <option value="coding">{{ copy.coding }}</option>
                    <option value="project">{{ copy.project }}</option>
                  </select>
                </div>

                <div class="space-y-2">
                  <label class="product-label">{{ copy.statusLabel }}</label>
                  <select v-model="currentEditNode.status" class="admin-select">
                    <option value="todo">{{ copy.todo }}</option>
                    <option value="in_progress">{{ copy.inProgress }}</option>
                    <option value="completed">{{ copy.completed }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mt-8 space-y-3">
              <button class="product-button-dark w-full" type="button" @click="handleSave">{{ copy.save }}</button>
              <button v-if="currentEditNode.id" class="danger-button w-full" type="button" @click="isDeleteConfirmOpen = true">
                {{ copy.delete }}
              </button>
              <button class="product-button-secondary w-full" type="button" @click="closeEdit">{{ copy.cancel }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-[rgba(15,23,42,0.28)] backdrop-blur-sm" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel">
            <h3 class="text-2xl font-bold tracking-[-0.04em] text-[var(--ink-strong)]">{{ copy.deleteTitle }}</h3>
            <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {{ copy.deleteBodyPrefix }}
              <span class="font-semibold text-[var(--ink-strong)]">{{ currentEditNode.title }}</span>
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
.roadmap-title {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: clamp(2.8rem, 4vw, 4.8rem);
  font-weight: 800;
  letter-spacing: -0.08em;
  line-height: 0.92;
}

.roadmap-metric-grid {
  display: grid;
  gap: 14px;
}

.roadmap-metric-card {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  padding: 16px 18px;
}

.roadmap-metric-value {
  margin-top: 10px;
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
}

.roadmap-canvas-shell {
  position: relative;
  height: calc(100vh - 252px);
  min-height: 680px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 245, 0.94));
}

.roadmap-canvas-hint {
  position: absolute;
  left: 24px;
  top: 24px;
  pointer-events: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  padding: 10px 14px;
  color: var(--ink-main);
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
}

.roadmap-detail-shell {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.96);
  padding: 24px;
}

.roadmap-note-card {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(250, 250, 248, 0.96));
}

:deep(.roadmap-canvas-node) {
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

:deep(.roadmap-canvas-node-in_progress) {
  border-color: rgba(15, 23, 42, 0.36);
  box-shadow: 0 0 0 6px rgba(15, 23, 42, 0.04), 0 14px 30px rgba(15, 23, 42, 0.08);
}

:deep(.roadmap-canvas-node-completed) {
  border-color: rgba(21, 128, 61, 0.2);
  background: rgba(248, 255, 251, 0.98);
}

@media (min-width: 768px) {
  .roadmap-detail-shell {
    padding: 28px 32px;
  }
}

@media (min-width: 1024px) {
  .roadmap-metric-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 200ms ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 200ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer-panel,
.drawer-leave-to .drawer-panel {
  transform: translateX(100%);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 180ms ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 180ms ease;
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
