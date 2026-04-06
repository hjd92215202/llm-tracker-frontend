<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusChip from '@/components/ui/StatusChip.vue'
import InlineEditableField from '@/components/ui/InlineEditableField.vue'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import { useRoadmapStore } from '@/store/roadmap'
import type { RoadmapNode } from '@/types'
import {
  flattenRoadmapTree,
  getRoadmapNodeMoveState,
  moveRoadmapNode,
  serializeRoadmapTree,
} from '@/utils/roadmapTree'

type DraftMode = 'root' | 'child' | 'sibling'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()
const roadmapStore = useRoadmapStore()

const isDeleteConfirmOpen = ref(false)
const errorMessage = ref('')
const structureErrorMessage = ref('')
const movingDirection = ref<'up' | 'down' | 'indent' | 'outdent' | null>(null)
const draftNode = ref<{
  mode: DraftMode
  anchorId: number | null
  title: string
  description: string
  node_type: RoadmapNode['node_type']
  status: RoadmapNode['status']
  parent_id: number | null
  sort_order: number
} | null>(null)
const undoToast = ref<{
  message: string
  undo: () => Promise<void>
} | null>(null)
let undoTimer: number | null = null

const selectedNodeIdFromRoute = computed(() => {
  const value = Number(route.query.nodeId)
  return Number.isFinite(value) && value > 0 ? value : null
})

const routeIntent = computed(() => {
  const value = String(route.query.intent || '')
  return value === 'root' || value === 'child' || value === 'sibling' ? value : null
})

const routeAnchorId = computed(() => {
  const value = Number(route.query.anchorId)
  return Number.isFinite(value) && value > 0 ? value : null
})

const copy = computed(() =>
  localeStore.isChinese
    ? {
        title: '节点管理',
        summary: '创建节点、编辑结构、复制分享链接。',
        share: '复制分享链接',
        shareDone: '链接已复制',
        addNode: '新增根节点',
        addChild: '新增子节点',
        addSibling: '新增同级节点',
        readonly: '只读查看',
        writable: '可编辑',
        loading: '正在加载路线图...',
        loadError: '加载路线图失败',
        noWorkspace: '当前没有可用空间。',
        noDescription: '这个节点还没有补充说明。',
        delete: '删除节点',
        cancel: '取消',
        deleteTitle: '删除这个节点？',
        deleteBody: '删除后会自动把直接子节点抬升到上一层，保持路径不断裂。',
        theory: '理论',
        coding: '编码',
        project: '项目',
        todo: '待开始',
        inProgress: '进行中',
        completed: '已完成',
        totalNodes: '节点',
        firstCanvasTitle: '先把第一条主线放上来',
        firstCanvasSummary: '这里是纯节点管理台。先建立根节点，再逐步补齐同级、子级和路径顺序。',
        firstCanvasAction: '创建第一个节点',
        firstCanvasReadonly: '这个空间还没有路线图，等待有写权限的成员创建第一条主线。',
        firstDetailTitle: '从这里开始搭建路径',
        firstDetailSummary: '创建第一个节点后，右侧会作为节点检查器，持续编辑标题、描述、状态和结构。',
        titlePlaceholder: '给这个节点一个清晰标题',
        descriptionPlaceholder: '补充背景、目标或判断依据。Ctrl/Cmd + Enter 保存。',
        draftTitle: '快速创建节点',
        draftSummary: '直接在这里补一个节点，保存后继续整理整条路径。',
        saveDraft: '保存节点',
        saveError: '保存节点失败',
        createError: '创建节点失败',
        quickActions: '快捷动作',
        pathTools: '调整路径',
        moveEarlier: '前移',
        moveLater: '后移',
        moveDeeper: '下沉',
        moveHigher: '上提',
        undo: '撤销',
        statusSaved: '节点状态已更新',
        titleSaved: '节点标题已更新',
        descriptionSaved: '节点说明已更新',
        createChildSaved: '已新增子节点',
        createSiblingSaved: '已新增同级节点',
        createRootSaved: '已新增根节点',
        pathMovedEarlier: '节点已往前调整',
        pathMovedLater: '节点已往后调整',
        pathMovedDeeper: '节点已向下展开',
        pathMovedHigher: '节点已向上提级',
      }
    : {
        title: 'Node manager',
        summary: 'Create nodes, reshape structure, and keep the path clear.',
        addNode: 'Add root node',
        addChild: 'Add child node',
        addSibling: 'Add sibling node',
        readonly: 'Read only',
        writable: 'Editable',
        loading: 'Loading roadmap...',
        loadError: 'Unable to load roadmap',
        noWorkspace: 'There is no active workspace.',
        noDescription: 'No description yet.',
        delete: 'Delete node',
        cancel: 'Cancel',
        deleteTitle: 'Delete this node?',
        deleteBody: 'Direct children will be lifted to the previous level so the path stays connected.',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
        totalNodes: 'Nodes',
        firstCanvasTitle: 'Start with the first node on the path',
        firstCanvasSummary: 'This is a pure node workbench. Start with a root node, then build the structure with siblings, children, and reordering.',
        firstCanvasAction: 'Create first node',
        firstCanvasReadonly: 'This workspace does not have a roadmap yet. Wait for someone with write access to add the first node.',
        firstDetailTitle: 'Build the path from here',
        firstDetailSummary: 'Once the first node exists, the right panel becomes a stable inspector for title, description, status, and structure.',
        titlePlaceholder: 'Give this node a clear title',
        descriptionPlaceholder: 'Add context, goal, or decision rationale. Ctrl/Cmd + Enter saves.',
        draftTitle: 'Quick node draft',
        draftSummary: 'Create a node inline and keep shaping the path.',
        saveDraft: 'Save node',
        saveError: 'Unable to save node',
        createError: 'Unable to create node',
        quickActions: 'Quick actions',
        pathTools: 'Shape path',
        moveEarlier: 'Earlier',
        moveLater: 'Later',
        moveDeeper: 'Deeper',
        moveHigher: 'Higher',
        undo: 'Undo',
        statusSaved: 'Node status updated',
        titleSaved: 'Node title updated',
        descriptionSaved: 'Node description updated',
        createChildSaved: 'Child node created',
        createSiblingSaved: 'Sibling node created',
        createRootSaved: 'Root node created',
        pathMovedEarlier: 'Node moved earlier on the path',
        pathMovedLater: 'Node moved later on the path',
        pathMovedDeeper: 'Node moved deeper into the path',
        pathMovedHigher: 'Node lifted higher on the path',
      },
)

const hasWriteAccess = computed(() => authStore.hasWriteAccess)
const currentWorkspace = computed(() => authStore.activeWorkspace)
const selectedNode = computed(() => roadmapStore.selectedNode)
const hasNodes = computed(() => roadmapStore.hasNodes)
const flatTree = computed(() => flattenRoadmapTree(roadmapStore.tree))
const pageSummary = computed(() =>
  localeStore.isChinese
    ? '这里只处理节点的创建、编辑、层级调整和删除。'
    : 'Manage nodes only: create, edit, reorder, and remove them from one place.',
)
const shortcutSummary = computed(() =>
  localeStore.isChinese ? '快捷键：N 新建节点，Alt + 方向键 调整路径' : 'Shortcuts: N new node, Alt + Arrow to reshape',
)
const openRoadmapActionLabel = computed(() => (localeStore.isChinese ? '进入路线图' : 'Open roadmap'))
const detailEmptyTitle = computed(() => (localeStore.isChinese ? '先从左侧选一个节点' : 'Select a node from the left'))
const detailEmptyCopy = computed(() =>
  localeStore.isChinese
    ? '右侧只负责当前节点的标题、状态、说明和路径结构调整。'
    : 'The right panel only edits the selected node and reshapes its position on the path.',
)
const detailPanelLabel = computed(() => (localeStore.isChinese ? '节点检查器' : 'Node inspector'))
const detailPanelHint = computed(() =>
  localeStore.isChinese
    ? '在这里直接维护节点标题、说明、状态和结构位置。'
    : 'Edit the title, status, description, and structure from here.',
)
const nodeActionsLabel = computed(() => (localeStore.isChinese ? '节点动作' : 'Node actions'))
const structureMoveState = computed(() =>
  getRoadmapNodeMoveState(roadmapStore.nodes, selectedNode.value?.id ?? null),
)

const typeLabel = (type: RoadmapNode['node_type']) => {
  if (type === 'coding') return copy.value.coding
  if (type === 'project') return copy.value.project
  return copy.value.theory
}

const clearUndoToast = () => {
  undoToast.value = null
  if (undoTimer) {
    window.clearTimeout(undoTimer)
    undoTimer = null
  }
}

const pushUndoToast = (message: string, undo: () => Promise<void>) => {
  clearUndoToast()
  undoToast.value = { message, undo }
  undoTimer = window.setTimeout(() => {
    undoToast.value = null
    undoTimer = null
  }, 5000)
}

const syncSelectedQuery = (nodeId: number | null, replace = false) => {
  const nextQuery = {
    ...route.query,
    nodeId: nodeId ? String(nodeId) : undefined,
  }

  if (replace) {
    router.replace({ name: 'admin-roadmap', query: nextQuery })
    return
  }

  router.push({ name: 'admin-roadmap', query: nextQuery })
}

const selectNodeById = async (nodeId: number | null, options?: { replace?: boolean }) => {
  structureErrorMessage.value = ''

  if (!nodeId) {
    roadmapStore.selectNode(null)
    return
  }

  const node = roadmapStore.nodes.find((item) => item.id === nodeId)
  if (!node) return

  if (roadmapStore.selectedNodeId === nodeId) {
    syncSelectedQuery(node.id, options?.replace)
    return
  }

  roadmapStore.selectNode(node.id)
  syncSelectedQuery(node.id, options?.replace)
}

const resolveSiblingSortOrder = (parentId: number | null) =>
  roadmapStore.nodes.filter((node) => (node.parent_id ?? null) === parentId).length

const openDraft = (mode: DraftMode, anchorId: number | null = null) => {
  if (!hasWriteAccess.value) return

  const anchor = anchorId ? roadmapStore.nodes.find((node) => node.id === anchorId) ?? null : null
  const parentId = mode === 'child' ? anchor?.id ?? null : anchor?.parent_id ?? null

  draftNode.value = {
    mode,
    anchorId,
    title: '',
    description: '',
    node_type: anchor?.node_type ?? 'theory',
    status: anchor?.status ?? 'todo',
    parent_id: parentId,
    sort_order: resolveSiblingSortOrder(parentId),
  }

}

const clearDraftRouteIntent = () => {
  if (!routeIntent.value) return
  const nextQuery = { ...route.query, intent: undefined, anchorId: undefined }
  router.replace({ name: 'admin-roadmap', query: nextQuery })
}

const closeDraft = () => {
  draftNode.value = null
  clearDraftRouteIntent()
}

const createDraftNode = async () => {
  if (!draftNode.value || !hasWriteAccess.value) return
  if (!draftNode.value.title.trim()) {
    errorMessage.value = copy.value.createError
    return
  }

  errorMessage.value = ''

  try {
    const created = await roadmapStore.createNode({
      title: draftNode.value.title.trim(),
      description: draftNode.value.description.trim() || null,
      node_type: draftNode.value.node_type,
      parent_id: draftNode.value.parent_id,
      sort_order: draftNode.value.sort_order,
    })

    if (draftNode.value.status !== 'todo') {
      await roadmapStore.patchNode(created.id, { status: draftNode.value.status })
    }

    const mode = draftNode.value.mode
    closeDraft()
    await roadmapStore.fetchNodes()
    await selectNodeById(created.id)
    pushUndoToast(
      mode === 'child'
        ? copy.value.createChildSaved
        : mode === 'sibling'
          ? copy.value.createSiblingSaved
          : copy.value.createRootSaved,
      async () => {
        await roadmapStore.deleteNode(created.id)
        await roadmapStore.fetchNodes()
      },
    )
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.createError
  }
}

const persistNodePatch = async (
  patch: Partial<RoadmapNode>,
  message: string,
  previous: Partial<RoadmapNode>,
) => {
  if (!selectedNode.value || !hasWriteAccess.value) return
  errorMessage.value = ''

  try {
    await roadmapStore.patchNode(selectedNode.value.id, patch)
    const targetId = selectedNode.value.id
    pushUndoToast(message, async () => {
      await roadmapStore.patchNode(targetId, previous)
    })
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.saveError
  }
}

const saveTitle = async (value: string) => {
  if (!selectedNode.value) return
  const nextValue = value.trim() || selectedNode.value.title
  if (nextValue === selectedNode.value.title) return

  await persistNodePatch(
    { title: nextValue },
    copy.value.titleSaved,
    { title: selectedNode.value.title },
  )
}

const saveDescription = async (value: string) => {
  if (!selectedNode.value) return
  const nextValue = value.trim()
  if ((selectedNode.value.description ?? '') === nextValue) return

  await persistNodePatch(
    { description: nextValue || null },
    copy.value.descriptionSaved,
    { description: selectedNode.value.description },
  )
}

const updateStatus = async (status: RoadmapNode['status']) => {
  if (!selectedNode.value || status === selectedNode.value.status) return

  await persistNodePatch(
    { status },
    copy.value.statusSaved,
    { status: selectedNode.value.status },
  )
}

const confirmDelete = async () => {
  if (!selectedNode.value || !hasWriteAccess.value) return

  const deletingNodeId = selectedNode.value.id
  const fallbackNodeId =
    selectedNode.value.parent_id ?? roadmapStore.nodes.find((node) => node.id !== deletingNodeId)?.id ?? null

  try {
    await roadmapStore.deleteNode(deletingNodeId)
    isDeleteConfirmOpen.value = false
    await roadmapStore.fetchNodes()
    await selectNodeById(fallbackNodeId, { replace: true })
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.saveError
  }
}

const moveMessages = computed<Record<'up' | 'down' | 'indent' | 'outdent', string>>(() => ({
  up: copy.value.pathMovedEarlier,
  down: copy.value.pathMovedLater,
  indent: copy.value.pathMovedDeeper,
  outdent: copy.value.pathMovedHigher,
}))

const syncSelectedNodeAfterTreeChange = async (targetId: number) => {
  await roadmapStore.fetchNodes()
  if (roadmapStore.nodes.some((node) => node.id === targetId)) {
    await selectNodeById(targetId, { replace: true })
  }
}

const moveSelectedNode = async (direction: 'up' | 'down' | 'indent' | 'outdent') => {
  if (!selectedNode.value || !hasWriteAccess.value) return

  const previousTree = serializeRoadmapTree(roadmapStore.tree)
  const nextTree = moveRoadmapNode(roadmapStore.nodes, selectedNode.value.id, direction)
  if (!nextTree) return

  structureErrorMessage.value = ''
  movingDirection.value = direction

  try {
    const targetId = selectedNode.value.id
    await roadmapStore.updateTree(nextTree)
    await syncSelectedNodeAfterTreeChange(targetId)
    pushUndoToast(moveMessages.value[direction], async () => {
      structureErrorMessage.value = ''
      await roadmapStore.updateTree(previousTree)
      await syncSelectedNodeAfterTreeChange(targetId)
    })
  } catch (error: any) {
    structureErrorMessage.value = error.message || copy.value.saveError
  } finally {
    movingDirection.value = null
  }
}

const handlePageShortcut = (event: KeyboardEvent) => {
  if (event.isComposing) return

  const target = event.target as HTMLElement | null
  const isTyping =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable

  if (isTyping) return

  const code = event.code
  const key = event.key.toLowerCase()

  if (event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
    if (code === 'ArrowUp') {
      event.preventDefault()
      void moveSelectedNode('up')
      return
    }

    if (code === 'ArrowDown') {
      event.preventDefault()
      void moveSelectedNode('down')
      return
    }

    if (code === 'ArrowRight') {
      event.preventDefault()
      void moveSelectedNode('indent')
      return
    }

    if (code === 'ArrowLeft') {
      event.preventDefault()
      void moveSelectedNode('outdent')
      return
    }
  }

  if (code === 'KeyN' && !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault()
    openDraft(selectedNode.value ? 'sibling' : 'root', selectedNode.value?.id ?? null)
    return
  }

  if (key === 'escape') {
    draftNode.value = null
    isDeleteConfirmOpen.value = false
  }
}

watch(
  () => authStore.activeWorkspaceId,
  async () => {
    await roadmapStore.fetchNodes()
  },
  { immediate: true },
)

watch(
  () => roadmapStore.nodes,
  async (nodes) => {
    if (!nodes.length) {
      roadmapStore.selectNode(null)
      return
    }

    const routeNodeId = selectedNodeIdFromRoute.value
    if (routeNodeId && nodes.some((node) => node.id === routeNodeId)) {
      if (roadmapStore.selectedNodeId !== routeNodeId) {
        await selectNodeById(routeNodeId, { replace: true })
      }
      return
    }

    if (!roadmapStore.selectedNodeId || !nodes.some((node) => node.id === roadmapStore.selectedNodeId)) {
      await selectNodeById(nodes[0]!.id, { replace: true })
    }
  },
  { immediate: true },
)

watch(
  [routeIntent, routeAnchorId, () => roadmapStore.nodes],
  ([intent, anchorId, nodes]) => {
    if (!intent || !hasWriteAccess.value) return
    if (intent !== 'root' && (!anchorId || !nodes.some((node) => node.id === anchorId))) return
    openDraft(intent, anchorId)
  },
  { immediate: true },
)

watch(
  selectedNodeIdFromRoute,
  async (value) => {
    if (!value || roadmapStore.selectedNodeId === value) return
    if (!roadmapStore.nodes.some((node) => node.id === value)) return
    await selectNodeById(value, { replace: true })
  },
)

onMounted(() => {
  window.addEventListener('keydown', handlePageShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePageShortcut)
  clearUndoToast()
})
</script>

<template>
  <div class="admin-page">
    <div v-if="errorMessage || roadmapStore.errorMessage" class="product-error mb-5 px-5 py-4 text-sm font-semibold">
      {{ errorMessage || roadmapStore.errorMessage }}
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
            <p class="admin-subtitle mt-3 max-w-2xl">{{ pageSummary }}</p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button class="product-button-secondary" type="button" @click="router.push('/roadmap')">{{ openRoadmapActionLabel }}</button>
            <button v-if="hasWriteAccess" class="product-button-dark" type="button" @click="openDraft('root')">{{ copy.addNode }}</button>
          </div>
        </div>
      </section>

      <div class="roadmap-workbench mt-6">
        <section class="roadmap-editor-shell roadmap-panel">
          <div class="roadmap-editor-head">
            <div class="roadmap-editor-strip">
              <span class="roadmap-editor-pill">{{ hasWriteAccess ? copy.writable : copy.readonly }}</span>
              <span class="roadmap-editor-pill">
                {{ localeStore.isChinese ? `${flatTree.length} 个节点` : `${flatTree.length} nodes` }}
              </span>
            </div>
            <div class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
              {{ shortcutSummary }}
            </div>
          </div>

          <div v-if="roadmapStore.loading" class="admin-empty mt-5 !border-none !bg-transparent !p-0">
            {{ copy.loading }}
          </div>

          <div v-else-if="!hasNodes" class="roadmap-empty-shell">
            <div class="roadmap-empty-card">
              <div class="roadmap-empty-kicker">{{ currentWorkspace.workspace_name }}</div>
              <h2 class="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--ink-strong)] md:text-4xl">
                {{ copy.firstCanvasTitle }}
              </h2>
              <p class="mt-4 max-w-2xl text-sm leading-8 text-[var(--ink-soft)] md:text-base">
                {{ hasWriteAccess ? copy.firstCanvasSummary : copy.firstCanvasReadonly }}
              </p>

              <div class="mt-6 flex flex-wrap gap-3">
                <button
                  v-if="hasWriteAccess"
                  class="product-button-dark"
                  type="button"
                  @click="openDraft('root')"
                >
                  {{ copy.firstCanvasAction }}
                </button>
              </div>
            </div>
          </div>

          <div v-else class="roadmap-node-list">
            <button
              v-for="item in flatTree"
              :key="item.id"
              type="button"
              class="roadmap-node-list-item"
              :class="selectedNode?.id === item.id ? 'roadmap-node-list-item-selected' : ''"
              @click="selectNodeById(item.id)"
            >
              <span class="roadmap-node-list-depth" :style="{ width: `${item.depth * 22}px` }"></span>
              <div class="roadmap-node-list-main">
                <div class="flex flex-wrap items-center gap-2">
                  <StatusChip tone="warm">{{ typeLabel(item.node.node_type) }}</StatusChip>
                  <StatusChip :tone="item.node.status === 'completed' ? 'green' : item.node.status === 'in_progress' ? 'dark' : 'default'">
                    {{
                      item.node.status === 'completed'
                        ? copy.completed
                        : item.node.status === 'in_progress'
                          ? copy.inProgress
                          : copy.todo
                    }}
                  </StatusChip>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-3">
                  <div class="roadmap-node-list-title">{{ item.node.title }}</div>
                  <span v-if="selectedNode?.id === item.id" class="roadmap-node-list-active">
                    {{ localeStore.isChinese ? '当前' : 'Current' }}
                  </span>
                </div>

                <div class="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-[var(--ink-soft)]">
                  <span>
                    {{
                      localeStore.isChinese
                        ? `层级 ${item.depth + 1}`
                        : `Level ${item.depth + 1}`
                    }}
                  </span>
                  <span v-if="item.childrenCount > 0">
                    {{
                      localeStore.isChinese
                        ? `子节点 ${item.childrenCount}`
                        : `${item.childrenCount} child ${item.childrenCount > 1 ? 'nodes' : 'node'}`
                    }}
                  </span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section id="admin-roadmap-detail" class="roadmap-detail-shell roadmap-panel roadmap-detail-sticky">
        <div v-if="draftNode" class="roadmap-draft-card">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div class="admin-kicker">{{ copy.draftTitle }}</div>
              <p class="mt-2 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">{{ copy.draftSummary }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button class="product-button-secondary" type="button" @click="closeDraft">{{ copy.cancel }}</button>
              <button class="product-button-dark" type="button" @click="createDraftNode">{{ copy.saveDraft }}</button>
            </div>
          </div>

          <div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <input
              v-model="draftNode.title"
              type="text"
              class="admin-input !text-lg !font-semibold"
              :placeholder="copy.titlePlaceholder"
            />
            <select v-model="draftNode.node_type" class="admin-select">
              <option value="theory">{{ copy.theory }}</option>
              <option value="coding">{{ copy.coding }}</option>
              <option value="project">{{ copy.project }}</option>
            </select>
          </div>

          <div class="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
            <textarea
              v-model="draftNode.description"
              rows="4"
              class="admin-input"
              :placeholder="copy.descriptionPlaceholder"
            ></textarea>
            <div class="grid gap-2">
              <button type="button" class="status-toggle" :class="draftNode.status === 'todo' ? 'status-toggle-active' : ''" @click="draftNode.status = 'todo'">
                {{ copy.todo }}
              </button>
              <button type="button" class="status-toggle" :class="draftNode.status === 'in_progress' ? 'status-toggle-active status-toggle-blue' : ''" @click="draftNode.status = 'in_progress'">
                {{ copy.inProgress }}
              </button>
              <button type="button" class="status-toggle" :class="draftNode.status === 'completed' ? 'status-toggle-active status-toggle-green' : ''" @click="draftNode.status = 'completed'">
                {{ copy.completed }}
              </button>
            </div>
          </div>
        </div>

        <template v-if="selectedNode">
          <div class="roadmap-detail-intro">
            <div class="admin-kicker">{{ detailPanelLabel }}</div>
            <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ detailPanelHint }}</p>
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            <StatusChip tone="warm">{{ typeLabel(selectedNode.node_type) }}</StatusChip>
            <button type="button" class="status-toggle" :class="selectedNode.status === 'todo' ? 'status-toggle-active' : ''" @click="updateStatus('todo')">
              {{ copy.todo }}
            </button>
            <button
              type="button"
              class="status-toggle"
              :class="selectedNode.status === 'in_progress' ? 'status-toggle-active status-toggle-blue' : ''"
              @click="updateStatus('in_progress')"
            >
              {{ copy.inProgress }}
            </button>
            <button
              type="button"
              class="status-toggle"
              :class="selectedNode.status === 'completed' ? 'status-toggle-active status-toggle-green' : ''"
              @click="updateStatus('completed')"
            >
              {{ copy.completed }}
            </button>
          </div>

          <div class="mt-4">
            <InlineEditableField
              :model-value="selectedNode.title"
              :disabled="!hasWriteAccess"
              :placeholder="copy.titlePlaceholder"
              display-class="roadmap-inline-title"
              input-class="roadmap-inline-title-input"
              @save="saveTitle"
            />
          </div>

          <div class="mt-3">
            <InlineEditableField
              :model-value="selectedNode.description || ''"
              multiline
              :disabled="!hasWriteAccess"
              :empty-label="copy.noDescription"
              :placeholder="copy.descriptionPlaceholder"
              display-class="roadmap-inline-description"
              input-class="roadmap-inline-description-input"
              @save="saveDescription"
            />
          </div>

          <div v-if="hasWriteAccess" class="roadmap-detail-section">
            <div class="roadmap-section-heading-row">
              <div class="roadmap-section-heading">{{ copy.pathTools }}</div>
              <div v-if="movingDirection" class="roadmap-section-status">
                {{ localeStore.isChinese ? '调整中...' : 'Updating...' }}
              </div>
            </div>
            <p v-if="structureErrorMessage" class="roadmap-inline-feedback roadmap-inline-feedback-error">
              {{ structureErrorMessage }}
            </p>
            <div class="roadmap-structure-actions">
              <button
                type="button"
                class="structure-action-chip"
                :disabled="!structureMoveState.canMoveUp || Boolean(movingDirection)"
                @click="moveSelectedNode('up')"
              >
                {{ copy.moveEarlier }}
              </button>
              <button
                type="button"
                class="structure-action-chip"
                :disabled="!structureMoveState.canMoveDown || Boolean(movingDirection)"
                @click="moveSelectedNode('down')"
              >
                {{ copy.moveLater }}
              </button>
              <button
                type="button"
                class="structure-action-chip"
                :disabled="!structureMoveState.canIndent || Boolean(movingDirection)"
                @click="moveSelectedNode('indent')"
              >
                {{ copy.moveDeeper }}
              </button>
              <button
                type="button"
                class="structure-action-chip"
                :disabled="!structureMoveState.canOutdent || Boolean(movingDirection)"
                @click="moveSelectedNode('outdent')"
              >
                {{ copy.moveHigher }}
              </button>
            </div>
          </div>

          <div v-if="hasWriteAccess" class="roadmap-detail-section">
            <div class="roadmap-section-heading">{{ nodeActionsLabel }}</div>
            <div class="roadmap-detail-actions">
              <button class="product-button-dark" type="button" @click="openDraft('child', selectedNode.id)">{{ copy.addChild }}</button>
              <button class="product-button-secondary" type="button" @click="openDraft('sibling', selectedNode.id)">{{ copy.addSibling }}</button>
              <button class="roadmap-danger-button" type="button" @click="isDeleteConfirmOpen = true">{{ copy.delete }}</button>
            </div>
          </div>
        </template>

        <div v-else-if="!hasNodes" class="roadmap-empty-detail">
          <div class="text-base font-semibold text-[var(--ink-strong)] md:text-lg">{{ copy.firstDetailTitle }}</div>
          <p class="mt-3 max-w-3xl text-sm leading-8 text-[var(--ink-soft)] md:text-base">{{ copy.firstDetailSummary }}</p>
          <div v-if="hasWriteAccess" class="mt-5">
            <button class="product-button-dark" type="button" @click="openDraft('root')">{{ copy.firstCanvasAction }}</button>
          </div>
        </div>

        <div v-else class="roadmap-empty-detail roadmap-empty-detail-dashed">
          <div class="text-base font-semibold text-[var(--ink-strong)]">{{ detailEmptyTitle }}</div>
          <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ detailEmptyCopy }}</p>
        </div>
        </section>
      </div>
    </template>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-[rgba(15,23,42,0.28)] backdrop-blur-sm" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel">
            <h3 class="text-2xl font-bold tracking-[-0.04em] text-[var(--ink-strong)]">{{ copy.deleteTitle }}</h3>
            <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ copy.deleteBody }}</p>
            <div class="mt-8 flex flex-col gap-3">
              <button class="danger-button w-full" type="button" @click="confirmDelete">{{ copy.delete }}</button>
              <button class="product-button-secondary w-full" type="button" @click="isDeleteConfirmOpen = false">
                {{ copy.cancel }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Transition name="toast">
      <div v-if="undoToast" class="roadmap-undo-toast">
        <span>{{ undoToast.message }}</span>
        <button type="button" @click="undoToast.undo().finally(clearUndoToast)">{{ copy.undo }}</button>
      </div>
    </Transition>
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

.roadmap-workbench {
  display: grid;
  gap: 20px;
}

.roadmap-panel {
  min-width: 0;
}

.roadmap-editor-shell {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  padding: 18px;
}

.roadmap-editor-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.roadmap-editor-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.roadmap-editor-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(247, 247, 245, 0.92);
  padding: 8px 12px;
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 700;
}

.roadmap-empty-shell {
  display: grid;
  min-height: 360px;
  place-items: center;
  padding: 28px;
}

.roadmap-empty-card {
  width: min(720px, 100%);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.84);
  padding: 32px;
  box-shadow: 0 28px 70px rgba(20, 33, 43, 0.08);
}

.roadmap-empty-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  padding: 8px 12px;
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 700;
}

.roadmap-node-list {
  margin-top: 16px;
  display: grid;
  gap: 10px;
  max-height: min(68vh, 760px);
  overflow-y: auto;
  padding-right: 4px;
}

.roadmap-node-list-item {
  display: flex;
  align-items: flex-start;
  gap: 0;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.88);
  padding: 12px 14px;
  text-align: left;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.roadmap-node-list-item:hover {
  transform: translateY(-1px);
  border-color: rgba(229, 106, 43, 0.16);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.05);
}

.roadmap-node-list-item-selected {
  border-color: rgba(229, 106, 43, 0.28);
  background: rgba(255, 251, 246, 0.96);
  box-shadow: 0 0 0 4px rgba(229, 106, 43, 0.06), 0 16px 30px rgba(15, 23, 42, 0.05);
}

.roadmap-node-list-depth {
  display: block;
  flex: 0 0 auto;
  height: 100%;
}

.roadmap-node-list-main {
  min-width: 0;
  flex: 1;
  border-left: 1px solid rgba(15, 23, 42, 0.08);
  padding-left: 14px;
}

.roadmap-node-list-title {
  color: var(--ink-strong);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.roadmap-node-list-active {
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  padding: 6px 10px;
  color: var(--ink-main);
  font-size: 11px;
  font-weight: 800;
}

.roadmap-detail-shell {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.96);
  padding: 20px;
}

.roadmap-detail-sticky {
  align-self: start;
}

.roadmap-detail-intro {
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.roadmap-draft-card {
  margin-bottom: 20px;
  border: 1px solid rgba(229, 106, 43, 0.12);
  border-radius: 24px;
  background: rgba(255, 249, 242, 0.92);
  padding: 20px;
}

.roadmap-empty-detail {
  border-radius: 24px;
  background: rgba(248, 248, 246, 0.72);
  padding: 20px;
}

.roadmap-empty-detail-dashed {
  border: 1px dashed rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.6);
}

.roadmap-inline-title {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 0.96;
}

.roadmap-inline-title-input {
  font-size: 1.5rem;
  font-weight: 700;
}

.roadmap-inline-description {
  color: var(--ink-soft);
  font-size: 1rem;
  line-height: 1.9;
}

.roadmap-inline-description-input {
  min-height: 140px;
}

.roadmap-structure-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.roadmap-detail-section {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
}

.roadmap-section-heading {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.roadmap-section-heading-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
}

.roadmap-section-status {
  color: var(--ink-soft);
  font-size: 12px;
  font-weight: 700;
}

.roadmap-inline-feedback {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.6;
}

.roadmap-inline-feedback-error {
  color: var(--danger);
}

.roadmap-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.roadmap-danger-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(185, 28, 28, 0.12);
  border-radius: 999px;
  background: rgba(254, 242, 242, 0.92);
  padding: 10px 14px;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 700;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.roadmap-danger-button:hover {
  border-color: rgba(185, 28, 28, 0.2);
  background: rgba(254, 226, 226, 0.96);
}

.structure-action-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: rgba(247, 247, 245, 0.9);
  padding: 8px 12px;
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 700;
  transition: transform 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.structure-action-chip:hover:not(:disabled) {
  border-color: rgba(229, 106, 43, 0.2);
  background: rgba(255, 248, 241, 0.96);
  transform: translateY(-1px);
}

.structure-action-chip:disabled {
  cursor: not-allowed;
  opacity: 0.42;
}

.status-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.86);
  padding: 8px 12px;
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 700;
  transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
}

.status-toggle-active {
  border-color: rgba(15, 23, 42, 0.12);
  background: rgba(15, 23, 42, 0.92);
  color: white;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.1);
}

.status-toggle-blue.status-toggle-active {
  background: rgba(37, 99, 235, 0.92);
}

.status-toggle-green.status-toggle-active {
  background: rgba(21, 128, 61, 0.92);
}

.roadmap-undo-toast {
  position: fixed;
  left: 50%;
  bottom: 22px;
  z-index: 120;
  display: inline-flex;
  transform: translateX(-50%);
  align-items: center;
  gap: 16px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.94);
  padding: 12px 16px;
  color: white;
  box-shadow: 0 20px 44px rgba(15, 23, 42, 0.16);
}

.roadmap-undo-toast button {
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.84);
  font-size: 12px;
  font-weight: 800;
}

.modal-enter-active,
.modal-leave-active,
.toast-enter-active,
.toast-leave-active {
  transition: opacity 180ms ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 180ms ease;
}

.toast-enter-active .roadmap-undo-toast,
.toast-leave-active .roadmap-undo-toast {
  transition: transform 180ms ease, opacity 180ms ease;
}

.modal-enter-from,
.modal-leave-to,
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: scale(0.96);
}

.toast-enter-from .roadmap-undo-toast,
.toast-leave-to .roadmap-undo-toast {
  transform: translate(-50%, 12px);
}

@media (min-width: 768px) {
  .roadmap-workbench {
    grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
    align-items: start;
  }

  .roadmap-editor-shell {
    padding: 20px;
  }

  .roadmap-detail-shell {
    padding: 24px 28px;
    position: sticky;
    top: 24px;
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }

  .roadmap-empty-card {
    padding: 40px;
  }
}

@media (max-width: 767px) {
  .roadmap-workbench {
    gap: 16px;
  }

  .roadmap-node-list-main {
    padding-left: 14px;
  }

  .roadmap-undo-toast {
    width: calc(100% - 24px);
    justify-content: space-between;
  }
}
</style>
