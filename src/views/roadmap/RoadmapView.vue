<script setup lang="ts">
import { computed, markRaw, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Background } from '@vue-flow/background'
import { VueFlow } from '@vue-flow/core'
import { ArrowUp, ArrowUpRight } from 'lucide-vue-next'
import InlineEditableField from '@/components/ui/InlineEditableField.vue'
import RoadmapSmartEdge from '@/components/roadmap/RoadmapSmartEdge.vue'
import RoadmapHeroHeader from '@/components/roadmap/RoadmapHeroHeader.vue'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { Note, RoadmapNode } from '@/types'
import { buildRoadmapTree, findRoadmapPath, flattenRoadmapTree, getRoadmapNodeMoveState, moveRoadmapNode } from '@/utils/roadmapTree'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const nodes = ref<RoadmapNode[]>([])
const selectedNode = ref<RoadmapNode | null>(null)
const notes = ref<Note[]>([])
const pageScrollRef = ref<HTMLElement | null>(null)
const showFloatingTop = ref(false)
const loading = ref(false)
const loadingNotes = ref(false)
const errorMessage = ref('')
const shareMessage = ref('')
const actionMessage = ref('')
const menuBusyAction = ref<string | null>(null)
const actionMenuRef = ref<HTMLElement | null>(null)
const menuAnchorPoint = ref<{ x: number; y: number } | null>(null)
const canvasMenu = ref<{
  open: boolean
  nodeId: number | null
  x: number
  y: number
}>({
  open: false,
  nodeId: null,
  x: 0,
  y: 0,
})
const lastTouchTap = ref<{ nodeId: number; ts: number } | null>(null)
const MENU_VIEWPORT_PADDING = 12
const MENU_POINTER_OFFSET = 10
const MENU_FALLBACK_WIDTH = 220
const MENU_FALLBACK_HEIGHT = 320
const presetNodeId = computed(() => {
  const value = Number(route.query.nodeId)
  return Number.isFinite(value) && value > 0 ? value : null
})

const copy = computed(() =>
  localeStore.isChinese
    ? {
        title: '路线图',
        summary: '先看主线，再点节点进入对应内容。',
        loading: '正在加载路线图...',
        notesLoading: '正在加载节点内容...',
        loadError: '加载路线图失败',
        linkedNotes: '节点内容',
        noNotes: '这个节点下还没有笔记。',
        noDescription: '这个节点还没有补充说明。',
        openNote: '查看笔记',
        createNote: '新建笔记',
        manageAction: '打开编辑台',
        shareAction: '复制分享链接',
        shareDone: '分享链接已复制',
        emptyHint: '点一个节点，继续往下看内容。',
        floatingTop: '回到顶部',
        totalNodes: '节点',
        activeNodes: '进行中',
        completedNodes: '已完成',
        selectedNotes: '关联笔记',
        openCanvas: '点节点展开内容',
        theory: '理论',
        coding: '编码',
        project: '项目',
        todo: '待开始',
        inProgress: '进行中',
        completed: '已完成',
        firstRoadmapTitle: '先画出你的第一条主线',
        firstRoadmapSummary: '先从一个节点开始，把你现在最重要的方向放上来。后面再继续补节点、笔记和细节。',
        firstRoadmapAction: '创建第一个节点',
        readonlyRoadmapSummary: '这个空间还没有路线图，等拥有写权限的成员先补上主线。',
        firstNotesTitle: '节点内容会跟在路线图下面',
        firstNotesSummary: '先把路线画出来，再把方法、结论和过程补到对应节点下面，整个协作流会更清晰。',
        firstSteps: ['先放一个当前最重要的节点', '再把后续节点接在主线上', '最后补充每个节点下面的笔记'],
      }
    : {
        title: 'Roadmap',
        summary: 'See the path first, then open the right content from each node.',
        loading: 'Loading roadmap...',
        notesLoading: 'Loading node content...',
        loadError: 'Unable to load roadmap',
        linkedNotes: 'Node content',
        noNotes: 'There are no notes under this node yet.',
        noDescription: 'No description yet.',
        openNote: 'Open note',
        createNote: 'Create note',
        manageAction: 'Open editor',
        shareAction: 'Copy share link',
        shareDone: 'Share link copied',
        emptyHint: 'Click a node and continue into the content below.',
        floatingTop: 'Back to top',
        totalNodes: 'Nodes',
        activeNodes: 'Active',
        completedNodes: 'Done',
        selectedNotes: 'Linked notes',
        openCanvas: 'Click a node to open content',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
        firstRoadmapTitle: 'Start with the first node on your roadmap',
        firstRoadmapSummary: 'Put the current priority on the path first. You can add more nodes, notes, and detail right after.',
        firstRoadmapAction: 'Create first node',
        readonlyRoadmapSummary: 'This workspace does not have a roadmap yet. Wait for someone with write access to set up the path.',
        firstNotesTitle: 'Node content appears right under the roadmap',
        firstNotesSummary: 'Add the path first, then attach methods, findings, and decisions to the right node.',
        firstSteps: ['Add the current priority first', 'Connect the next nodes onto the path', 'Fill each node with notes and detail'],
      }
)

const workspaceName = computed(() => authStore.activeWorkspace?.workspace_name || copy.value.title)
const hasNodes = computed(() => nodes.value.length > 0)
const roadmapProgress = computed(() => {
  if (nodes.value.length === 0) return 0
  const completed = nodes.value.filter((node) => node.status === 'completed').length
  return Math.round((completed / nodes.value.length) * 100)
})
const activeCount = computed(() => nodes.value.filter((node) => node.status === 'in_progress').length)
const completedCount = computed(() => nodes.value.filter((node) => node.status === 'completed').length)
const heroStats = computed(() => [
  { label: copy.value.totalNodes, value: nodes.value.length },
  { label: copy.value.activeNodes, value: activeCount.value },
  { label: copy.value.completedNodes, value: completedCount.value },
  { label: copy.value.selectedNotes, value: notes.value.length },
])
const roadmapTree = computed(() => buildRoadmapTree(nodes.value))
const roadmapOutline = computed(() => flattenRoadmapTree(roadmapTree.value))
const selectedPath = computed(() => findRoadmapPath(roadmapTree.value, selectedNode.value?.id ?? null))
const breadcrumbLabel = computed(() => (localeStore.isChinese ? '当前路径' : 'Current path'))
const titlePlaceholder = computed(() => (localeStore.isChinese ? '给这个节点一个清晰标题' : 'Give this node a clear title'))
const descriptionPlaceholder = computed(() =>
  localeStore.isChinese ? '补充背景、目标或判断依据，Ctrl/Cmd + Enter 保存' : 'Add context, goal, or rationale. Ctrl/Cmd + Enter saves.',
)
const menuCopy = computed(() =>
  localeStore.isChinese
    ? {
        addChild: '新增下级',
        addSibling: '新增同级',
        moveEarlier: '前移',
        moveLater: '后移',
        moveDeeper: '下沉',
        moveHigher: '上提',
        delete: '删除节点',
        nodeActions: '节点动作',
        pathTools: '调整路径',
        status: '状态',
      }
    : {
        addChild: 'Add child',
        addSibling: 'Add sibling',
        moveEarlier: 'Earlier',
        moveLater: 'Later',
        moveDeeper: 'Deeper',
        moveHigher: 'Higher',
        delete: 'Delete node',
        nodeActions: 'Node actions',
        pathTools: 'Shape path',
        status: 'Status',
      },
)
const defaultNewNodeTitle = computed(() => (localeStore.isChinese ? '新节点' : 'New node'))
const selectedMoveState = computed(() => getRoadmapNodeMoveState(nodes.value, selectedNode.value?.id ?? null))

const updateFloatingTopVisibility = () => {
  if (!selectedNode.value || !pageScrollRef.value) {
    showFloatingTop.value = false
    return
  }

  const currentScroll = pageScrollRef.value.scrollTop
  const threshold = Math.max(220, pageScrollRef.value.clientHeight * 0.35)
  showFloatingTop.value = currentScroll >= threshold
}

const flowNodes = computed(() =>
  roadmapOutline.value.map((item, index) => ({
    id: String(item.node.id),
    label: item.node.title,
    data: item.node,
    position: {
      x:
        72 +
        item.depth * 260 +
        (item.node.node_type === 'project' ? 20 : item.node.node_type === 'coding' ? 8 : 0),
      y: index * 156 + 48,
    },
    class: `roadmap-node roadmap-node-${item.node.status} ${selectedNode.value?.id === item.node.id ? 'roadmap-node-selected' : ''}`,
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
      type: 'roadmap-smart',
      style: { stroke: '#d2d9e0', strokeWidth: 1.9 },
    }))
)
const edgeTypes = {
  'roadmap-smart': markRaw(RoadmapSmartEdge),
}

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

const sortNodes = (items: RoadmapNode[]) => [...items].sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)

const clearSelectedNode = () => {
  selectedNode.value = null
  notes.value = []
  const nextQuery = { ...route.query, nodeId: undefined }
  router.replace({ query: nextQuery })
}

const closeNodeMenu = () => {
  canvasMenu.value.open = false
  canvasMenu.value.nodeId = null
  menuAnchorPoint.value = null
}

const flashActionMessage = (message: string) => {
  actionMessage.value = message
  window.setTimeout(() => {
    actionMessage.value = ''
  }, 2200)
}

const getNodeFromMenu = () => {
  if (!canvasMenu.value.nodeId) return selectedNode.value
  return nodes.value.find((node) => node.id === canvasMenu.value.nodeId) ?? selectedNode.value
}

const getPointerCoordinates = (event: MouseEvent | TouchEvent) => {
  if ('touches' in event && event.touches.length > 0) {
    return { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY }
  }

  if ('changedTouches' in event && event.changedTouches.length > 0) {
    return { x: event.changedTouches[0]!.clientX, y: event.changedTouches[0]!.clientY }
  }

  const pointer = event as MouseEvent
  return { x: pointer.clientX, y: pointer.clientY }
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const resolveMenuPosition = (anchor: { x: number; y: number }, menuWidth: number, menuHeight: number) => {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const maxLeft = Math.max(MENU_VIEWPORT_PADDING, viewportWidth - menuWidth - MENU_VIEWPORT_PADDING)
  const maxTop = Math.max(MENU_VIEWPORT_PADDING, viewportHeight - menuHeight - MENU_VIEWPORT_PADDING)

  let x = anchor.x + MENU_POINTER_OFFSET
  if (x + menuWidth + MENU_VIEWPORT_PADDING > viewportWidth) {
    x = anchor.x - menuWidth - MENU_POINTER_OFFSET
  }

  let y = anchor.y + MENU_POINTER_OFFSET
  if (y + menuHeight + MENU_VIEWPORT_PADDING > viewportHeight) {
    y = anchor.y - menuHeight - MENU_POINTER_OFFSET
  }

  return {
    x: clamp(x, MENU_VIEWPORT_PADDING, maxLeft),
    y: clamp(y, MENU_VIEWPORT_PADDING, maxTop),
  }
}

const repositionNodeMenu = async (mode: 'fallback' | 'measure' = 'measure') => {
  if (!canvasMenu.value.open || !menuAnchorPoint.value) return

  const anchor = menuAnchorPoint.value
  if (mode === 'fallback') {
    const fallbackPosition = resolveMenuPosition(anchor, MENU_FALLBACK_WIDTH, MENU_FALLBACK_HEIGHT)
    canvasMenu.value = { ...canvasMenu.value, ...fallbackPosition }
  }

  await nextTick()
  if (!canvasMenu.value.open || !menuAnchorPoint.value) return

  const menuRect = actionMenuRef.value?.getBoundingClientRect()
  const menuWidth = Math.max(1, menuRect?.width ?? MENU_FALLBACK_WIDTH)
  const menuHeight = Math.max(1, menuRect?.height ?? MENU_FALLBACK_HEIGHT)
  const measuredPosition = resolveMenuPosition(menuAnchorPoint.value, menuWidth, menuHeight)

  if (measuredPosition.x !== canvasMenu.value.x || measuredPosition.y !== canvasMenu.value.y) {
    canvasMenu.value = { ...canvasMenu.value, ...measuredPosition }
  }
}

const openNodeMenu = (node: RoadmapNode, event: MouseEvent | TouchEvent) => {
  if (!authStore.hasWriteAccess) return
  const pointer = getPointerCoordinates(event)
  menuAnchorPoint.value = pointer

  canvasMenu.value = {
    open: true,
    nodeId: node.id,
    x: pointer.x,
    y: pointer.y,
  }

  void repositionNodeMenu('fallback')
}

const resolveSiblingSortOrder = (parentId: number | null) =>
  nodes.value.filter((node) => (node.parent_id ?? null) === parentId).length

const openFirstNode = () => {
  if (!authStore.hasWriteAccess) return
  router.push({
    name: 'admin-roadmap',
    query: { intent: 'root' },
  })
}

const findInitialNode = () => {
  if (presetNodeId.value) {
    return nodes.value.find((node) => node.id === presetNodeId.value) ?? null
  }

  return roadmapOutline.value[0]?.node ?? null
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

    const initialNode = findInitialNode()
    if (initialNode) {
      await selectNode(initialNode, { autoScroll: false })
    }
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const selectNode = async (node: RoadmapNode, options?: { autoScroll?: boolean }) => {
  if (selectedNode.value?.id === node.id && !loadingNotes.value) {
    if (options?.autoScroll) {
      setTimeout(() => {
        document.getElementById('roadmap-notes-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
    return
  }

  selectedNode.value = node
  router.replace({ query: { ...route.query, nodeId: String(node.id) } })
  loadingNotes.value = true

  try {
    notes.value = await noteApi.getNotesByNode(node.id)
    if (options?.autoScroll !== false) {
      setTimeout(() => {
        document.getElementById('roadmap-notes-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  } catch {
    notes.value = []
  } finally {
    loadingNotes.value = false
    setTimeout(updateFloatingTopVisibility, 120)
  }
}

const persistNodePatch = async (targetId: number, patch: Partial<RoadmapNode>, successMessage: string) => {
  menuBusyAction.value = 'patch'
  errorMessage.value = ''

  try {
    const updated = await roadmapApi.patchNode(targetId, patch)
    nodes.value = nodes.value.map((node) => (node.id === targetId ? updated : node))
    if (selectedNode.value?.id === targetId) {
      selectedNode.value = updated
    }
    flashActionMessage(successMessage)
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    menuBusyAction.value = null
  }
}

const saveTitle = async (value: string) => {
  const target = selectedNode.value
  if (!target || !authStore.hasWriteAccess) return
  const nextValue = value.trim() || target.title
  if (nextValue === target.title) return
  await persistNodePatch(target.id, { title: nextValue }, localeStore.isChinese ? '节点标题已更新' : 'Node title updated')
}

const saveDescription = async (value: string) => {
  const target = selectedNode.value
  if (!target || !authStore.hasWriteAccess) return
  const nextValue = value.trim()
  if ((target.description ?? '') === nextValue) return
  await persistNodePatch(target.id, { description: nextValue || null }, localeStore.isChinese ? '节点说明已更新' : 'Node description updated')
}

const updateStatus = async (status: RoadmapNode['status']) => {
  const target = getNodeFromMenu()
  if (!target || !authStore.hasWriteAccess || target.status === status) return
  await persistNodePatch(target.id, { status }, localeStore.isChinese ? '节点状态已更新' : 'Node status updated')
  closeNodeMenu()
}

const createNodeFromMenu = async (mode: 'child' | 'sibling') => {
  const anchor = getNodeFromMenu()
  if (!anchor || !authStore.hasWriteAccess) return
  const parentId = mode === 'child' ? anchor.id : anchor.parent_id ?? null

  menuBusyAction.value = mode
  errorMessage.value = ''
  try {
    const created = await roadmapApi.createNode({
      title: defaultNewNodeTitle.value,
      description: null,
      node_type: anchor.node_type,
      parent_id: parentId,
      sort_order: resolveSiblingSortOrder(parentId),
    })
    nodes.value = sortNodes([...nodes.value, created])
    closeNodeMenu()
    await selectNode(created, { autoScroll: false })
    flashActionMessage(mode === 'child' ? (localeStore.isChinese ? '已新增下级节点' : 'Child node created') : (localeStore.isChinese ? '已新增同级节点' : 'Sibling node created'))
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    menuBusyAction.value = null
  }
}

const moveSelectedNode = async (direction: 'up' | 'down' | 'indent' | 'outdent') => {
  const target = getNodeFromMenu()
  if (!target || !authStore.hasWriteAccess) return
  const nextTree = moveRoadmapNode(nodes.value, target.id, direction)
  if (!nextTree) return

  menuBusyAction.value = direction
  errorMessage.value = ''
  try {
    const updatedNodes = await roadmapApi.updateTree(nextTree)
    nodes.value = sortNodes(updatedNodes)
    const nextNode = nodes.value.find((node) => node.id === target.id) ?? null
    closeNodeMenu()
    if (nextNode) {
      await selectNode(nextNode, { autoScroll: false })
    }
    const messageMap = {
      up: localeStore.isChinese ? '节点已前移' : 'Node moved earlier',
      down: localeStore.isChinese ? '节点已后移' : 'Node moved later',
      indent: localeStore.isChinese ? '节点已下沉' : 'Node moved deeper',
      outdent: localeStore.isChinese ? '节点已上提' : 'Node moved higher',
    } as const
    flashActionMessage(messageMap[direction])
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    menuBusyAction.value = null
  }
}

const deleteNodeFromMenu = async () => {
  const target = getNodeFromMenu()
  if (!target || !authStore.hasWriteAccess) return

  menuBusyAction.value = 'delete'
  errorMessage.value = ''
  const fallbackNodeId = target.parent_id ?? nodes.value.find((node) => node.id !== target.id)?.id ?? null

  try {
    const updatedNodes = await roadmapApi.deleteNode(target.id)
    nodes.value = sortNodes(updatedNodes)
    closeNodeMenu()

    const fallbackNode = fallbackNodeId ? nodes.value.find((node) => node.id === fallbackNodeId) : null
    if (fallbackNode) {
      await selectNode(fallbackNode, { autoScroll: false })
    } else if (nodes.value.length > 0) {
      await selectNode(nodes.value[0]!, { autoScroll: false })
    } else {
      clearSelectedNode()
    }
    flashActionMessage(localeStore.isChinese ? '节点已删除' : 'Node deleted')
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    menuBusyAction.value = null
  }
}

const handleNodeContextMenu = async (payload: { event: MouseEvent | TouchEvent; node: { data: RoadmapNode } }) => {
  if (!authStore.hasWriteAccess) return
  payload.event.preventDefault()
  await selectNode(payload.node.data, { autoScroll: false })
  openNodeMenu(payload.node.data, payload.event)
}

const handleNodeClick = async (payload: { event?: MouseEvent | TouchEvent; node: { data: RoadmapNode } }) => {
  const { event, node } = payload
  const coarsePointer = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  const mouseDoubleTapLike = Boolean(event && event instanceof MouseEvent && coarsePointer && event.detail >= 2)
  const isTouchInteraction = Boolean(event && event.type.startsWith('touch')) || mouseDoubleTapLike

  if (isTouchInteraction && event && authStore.hasWriteAccess) {
    const now = Date.now()
    const previousTap = lastTouchTap.value
    if (previousTap && previousTap.nodeId === node.data.id && now - previousTap.ts < 320) {
      lastTouchTap.value = null
      openNodeMenu(node.data, event)
      return
    }
    lastTouchTap.value = { nodeId: node.data.id, ts: now }
  }

  await selectNode(node.data, { autoScroll: true })
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
  if (!authStore.activeWorkspaceId || !hasNodes.value) return

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

const scrollToTop = () => {
  pageScrollRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

const handleGlobalPointerDown = (event: PointerEvent) => {
  if (!canvasMenu.value.open) return
  const target = event.target as Node | null
  if (target && actionMenuRef.value?.contains(target)) return
  closeNodeMenu()
}

const handleGlobalKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  closeNodeMenu()
}

const handlePageScroll = () => {
  updateFloatingTopVisibility()
  if (canvasMenu.value.open) {
    closeNodeMenu()
  }
}

const handleViewportChange = () => {
  if (!canvasMenu.value.open) return
  void repositionNodeMenu('measure')
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchRoadmap()
  },
  { immediate: true }
)

watch(
  presetNodeId,
  async (value) => {
    if (value) {
      if (selectedNode.value?.id === value) return
      const targetNode = nodes.value.find((node) => node.id === value)
      if (targetNode) {
        await selectNode(targetNode, { autoScroll: false })
      }
      return
    }

    if (!selectedNode.value && roadmapOutline.value.length > 0) {
      await selectNode(roadmapOutline.value[0]!.node, { autoScroll: false })
    }
  }
)

onMounted(() => {
  pageScrollRef.value?.addEventListener('scroll', handlePageScroll, { passive: true })
  window.addEventListener('pointerdown', handleGlobalPointerDown, { passive: true })
  window.addEventListener('keydown', handleGlobalKeydown)
  window.addEventListener('resize', handleViewportChange, { passive: true })
  window.addEventListener('orientationchange', handleViewportChange)
  updateFloatingTopVisibility()
})

onUnmounted(() => {
  pageScrollRef.value?.removeEventListener('scroll', handlePageScroll)
  window.removeEventListener('pointerdown', handleGlobalPointerDown)
  window.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', handleViewportChange)
  window.removeEventListener('orientationchange', handleViewportChange)
})
</script>

<template>
  <div
    ref="pageScrollRef"
    class="roadmap-page-scroll h-screen overflow-y-auto bg-[linear-gradient(180deg,#fafaf8_0%,#f4f6f8_100%)] px-3 py-3 md:px-4 md:py-4"
  >
    <section class="roadmap-main-shell relative overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.06)] bg-white">
      <RoadmapHeroHeader
        :workspace-name="workspaceName"
        :title="copy.title"
        :summary="copy.summary"
        :progress="roadmapProgress"
        :stats="heroStats"
      >
        <template #actions>
          <button v-if="hasNodes" class="roadmap-action-button product-button-secondary" type="button" @click="copyShareLink">
            {{ copy.shareAction }}
          </button>
          <button
            v-if="authStore.hasWriteAccess"
            class="roadmap-action-button product-button-dark"
            type="button"
            @click="router.push('/admin/dashboard')"
          >
            {{ copy.manageAction }}
          </button>
        </template>
      </RoadmapHeroHeader>

      <div v-if="shareMessage" class="roadmap-toast">
        {{ shareMessage }}
      </div>
      <div v-if="actionMessage" class="roadmap-toast roadmap-toast-action">
        {{ actionMessage }}
      </div>

      <div class="roadmap-canvas-shell">
        <div v-if="loading" class="roadmap-inline-state roadmap-inline-state-plain">{{ copy.loading }}</div>

        <div v-else-if="!hasNodes" class="roadmap-empty-shell">
          <div class="roadmap-empty-card">
            <div class="roadmap-empty-kicker">{{ workspaceName }}</div>
            <h2 class="roadmap-empty-title">
              {{ copy.firstRoadmapTitle }}
            </h2>
            <p class="roadmap-empty-summary">
              {{ authStore.hasWriteAccess ? copy.firstRoadmapSummary : copy.readonlyRoadmapSummary }}
            </p>

            <div class="roadmap-empty-actions">
              <button
                v-if="authStore.hasWriteAccess"
                class="roadmap-action-button product-button-dark"
                type="button"
                @click="openFirstNode"
              >
                {{ copy.firstRoadmapAction }}
              </button>
              <button class="roadmap-action-button product-button-secondary" type="button" @click="router.push('/admin/workspace')">
                {{ workspaceName }}
              </button>
            </div>
          </div>
        </div>

        <VueFlow
          v-else
          class="h-full w-full bg-transparent"
          :nodes="flowNodes"
          :edges="flowEdges"
          :edge-types="edgeTypes"
          fit-view-on-init
          :fit-view-on-init-options="{ padding: 0.42, minZoom: 0.48, maxZoom: 1.1, duration: 360 }"
          :min-zoom="0.48"
          :max-zoom="1.3"
          :nodes-draggable="false"
          :elements-selectable="false"
          @node-click="handleNodeClick"
          @node-context-menu="handleNodeContextMenu"
        >
          <Background pattern-color="#e5e7eb" :gap="26" variant="dots" />
        </VueFlow>

        <div v-if="hasNodes" class="roadmap-canvas-hint">
          <span class="roadmap-canvas-hint-kicker">
            {{ selectedNode ? statusLabel(selectedNode.status) : copy.openCanvas }}
          </span>
          <strong v-if="selectedNode" class="roadmap-canvas-hint-title">
            {{ selectedNode.title }}
          </strong>
        </div>
      </div>
    </section>

    <div v-if="errorMessage" class="roadmap-error-banner mx-auto mt-4 max-w-6xl">
      {{ errorMessage }}
    </div>

    <section
      id="roadmap-notes-section"
      class="roadmap-detail-shell mx-auto mt-4 max-w-6xl rounded-[32px] border border-[rgba(15,23,42,0.06)] bg-white px-5 py-5 md:px-7 md:py-6"
    >
      <template v-if="selectedNode">
        <div class="roadmap-detail-head flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <div v-if="selectedPath.length" class="roadmap-breadcrumb">
              <span class="roadmap-breadcrumb-label">{{ breadcrumbLabel }}</span>
              <span v-for="item in selectedPath" :key="item.id" class="roadmap-breadcrumb-item">
                {{ item.node.title }}
              </span>
            </div>

            <div class="roadmap-detail-tags">
              <span class="admin-chip-warm">{{ typeLabel(selectedNode.node_type) }}</span>
              <template v-if="authStore.hasWriteAccess">
                <button
                  type="button"
                  class="status-toggle"
                  :class="selectedNode.status === 'todo' ? 'status-toggle-active' : ''"
                  @click="updateStatus('todo')"
                >
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
              </template>
              <span v-else :class="selectedNode.status === 'completed' ? 'admin-chip-green' : selectedNode.status === 'in_progress' ? 'admin-chip-blue' : 'admin-chip'">
                {{ statusLabel(selectedNode.status) }}
              </span>
            </div>

            <InlineEditableField
              :model-value="selectedNode.title"
              :disabled="!authStore.hasWriteAccess || menuBusyAction === 'patch'"
              :placeholder="titlePlaceholder"
              display-class="roadmap-inline-title"
              input-class="roadmap-inline-title-input"
              @save="saveTitle"
            />
            <InlineEditableField
              :model-value="selectedNode.description || ''"
              multiline
              :disabled="!authStore.hasWriteAccess || menuBusyAction === 'patch'"
              :placeholder="descriptionPlaceholder"
              :empty-label="copy.noDescription"
              display-class="roadmap-inline-description"
              input-class="roadmap-inline-description-input"
              @save="saveDescription"
            />
          </div>

          <button v-if="authStore.hasWriteAccess" class="roadmap-action-button product-button-dark" type="button" @click="createNote">
            {{ copy.createNote }}
          </button>
        </div>

        <div class="roadmap-detail-subhead mt-6 flex items-center justify-between gap-4">
          <div class="roadmap-section-label">{{ copy.linkedNotes }}</div>
          <div class="roadmap-section-count">{{ notes.length }}</div>
        </div>

        <div v-if="loadingNotes" class="roadmap-inline-state mt-4">{{ copy.notesLoading }}</div>
        <div v-else-if="notes.length > 0" class="roadmap-notes-list mt-4">
          <article
            v-for="note in notes"
            :key="note.id"
            class="roadmap-note-row cursor-pointer"
            @click="openNote(note.id)"
          >
            <div class="roadmap-note-copy">
              <div class="roadmap-note-title">{{ note.title }}</div>
              <div class="roadmap-note-summary">{{ note.summary || copy.noDescription }}</div>
            </div>

            <div class="roadmap-note-row-side">
              <span class="roadmap-note-date">
                {{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}
              </span>
              <span class="roadmap-note-link">
                {{ copy.openNote }}
                <ArrowUpRight :size="14" />
              </span>
            </div>
          </article>
        </div>
        <div v-else class="roadmap-section-empty mt-4">
          <div class="roadmap-section-empty-kicker">{{ copy.linkedNotes }}</div>
          <div class="roadmap-section-empty-text">{{ copy.noNotes }}</div>
          <button v-if="authStore.hasWriteAccess" class="roadmap-action-button product-button-secondary" type="button" @click="createNote">
            {{ copy.createNote }}
          </button>
        </div>
      </template>

      <div v-else-if="!hasNodes" class="roadmap-empty-notes">
        <div class="roadmap-section-empty-kicker">{{ copy.linkedNotes }}</div>
        <div class="roadmap-empty-notes-title">{{ copy.firstNotesTitle }}</div>
        <p class="roadmap-empty-notes-summary">{{ copy.firstNotesSummary }}</p>

        <div class="roadmap-step-grid">
          <article
            v-for="(step, index) in copy.firstSteps"
            :key="step"
            class="roadmap-step-card"
          >
            <div class="roadmap-step-index">{{ index + 1 }}</div>
            <div class="roadmap-step-text">{{ step }}</div>
          </article>
        </div>
      </div>

      <div v-else class="roadmap-section-empty">
        <div class="roadmap-section-empty-kicker">{{ copy.linkedNotes }}</div>
        <div class="roadmap-section-empty-text">{{ copy.emptyHint }}</div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="menu-pop">
        <div
          v-if="canvasMenu.open && authStore.hasWriteAccess"
          ref="actionMenuRef"
          class="roadmap-node-context-menu"
          :style="{ left: `${canvasMenu.x}px`, top: `${canvasMenu.y}px` }"
          @contextmenu.prevent
        >
          <div class="roadmap-menu-group">
            <div class="roadmap-menu-group-label">{{ menuCopy.nodeActions }}</div>
            <button class="roadmap-menu-item" type="button" :disabled="menuBusyAction !== null" @click="createNodeFromMenu('child')">
              {{ menuCopy.addChild }}
            </button>
            <button class="roadmap-menu-item" type="button" :disabled="menuBusyAction !== null" @click="createNodeFromMenu('sibling')">
              {{ menuCopy.addSibling }}
            </button>
            <button class="roadmap-menu-item roadmap-menu-item-danger" type="button" :disabled="menuBusyAction !== null" @click="deleteNodeFromMenu">
              {{ menuCopy.delete }}
            </button>
          </div>

          <div class="roadmap-menu-divider"></div>

          <div class="roadmap-menu-group">
            <div class="roadmap-menu-group-label">{{ menuCopy.pathTools }}</div>
            <button class="roadmap-menu-item" type="button" :disabled="!selectedMoveState.canMoveUp || menuBusyAction !== null" @click="moveSelectedNode('up')">
              {{ menuCopy.moveEarlier }}
            </button>
            <button class="roadmap-menu-item" type="button" :disabled="!selectedMoveState.canMoveDown || menuBusyAction !== null" @click="moveSelectedNode('down')">
              {{ menuCopy.moveLater }}
            </button>
            <button class="roadmap-menu-item" type="button" :disabled="!selectedMoveState.canIndent || menuBusyAction !== null" @click="moveSelectedNode('indent')">
              {{ menuCopy.moveDeeper }}
            </button>
            <button class="roadmap-menu-item" type="button" :disabled="!selectedMoveState.canOutdent || menuBusyAction !== null" @click="moveSelectedNode('outdent')">
              {{ menuCopy.moveHigher }}
            </button>
          </div>

          <div class="roadmap-menu-divider"></div>

          <div class="roadmap-menu-group">
            <div class="roadmap-menu-group-label">{{ menuCopy.status }}</div>
            <button class="roadmap-menu-item" type="button" :disabled="menuBusyAction !== null || selectedNode?.status === 'todo'" @click="updateStatus('todo')">
              {{ copy.todo }}
            </button>
            <button class="roadmap-menu-item" type="button" :disabled="menuBusyAction !== null || selectedNode?.status === 'in_progress'" @click="updateStatus('in_progress')">
              {{ copy.inProgress }}
            </button>
            <button class="roadmap-menu-item" type="button" :disabled="menuBusyAction !== null || selectedNode?.status === 'completed'" @click="updateStatus('completed')">
              {{ copy.completed }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <button
      v-if="showFloatingTop"
      type="button"
      class="shared-floating-top"
      :aria-label="copy.floatingTop"
      @click="scrollToTop"
    >
      <ArrowUp :size="18" />
    </button>
  </div>
</template>

<style scoped>
:global(body) {
  overflow: hidden;
}

.roadmap-page-scroll {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.roadmap-page-scroll::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.roadmap-main-shell {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 24px);
}

.roadmap-toast {
  position: absolute;
  right: 20px;
  top: 22px;
  z-index: 10;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  padding: 8px 12px;
  color: white;
  font-size: 11px;
  font-weight: 700;
}

.roadmap-toast-action {
  top: 56px;
  background: rgba(30, 64, 175, 0.92);
}

.roadmap-action-button {
  padding: 0.5rem 1rem !important;
}

.roadmap-inline-state {
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 18px;
  background: rgba(248, 248, 246, 0.44);
  padding: 16px;
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.7;
}

.roadmap-inline-state-plain {
  border: 0;
  background: transparent;
  padding: 0;
}

.roadmap-error-banner {
  border: 1px solid rgba(185, 28, 28, 0.08);
  border-radius: 20px;
  background: rgba(254, 242, 242, 0.82);
  padding: 14px 18px;
  color: #991b1b;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.6;
}

.roadmap-canvas-shell {
  position: relative;
  flex: 1;
  min-height: 420px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 247, 245, 0.94));
}

.roadmap-empty-shell {
  display: grid;
  min-height: 100%;
  place-items: center;
  padding: 28px;
}

.roadmap-empty-card {
  width: min(640px, 100%);
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.8);
  padding: 28px;
  box-shadow: 0 22px 54px rgba(20, 33, 43, 0.06);
}

.roadmap-empty-kicker {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  padding: 7px 11px;
  color: var(--ink-main);
  font-size: 11px;
  font-weight: 700;
}

.roadmap-empty-title {
  margin-top: 16px;
  color: var(--ink-strong);
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.05em;
  line-height: 1.02;
}

.roadmap-empty-summary {
  margin-top: 14px;
  max-width: 34rem;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.8;
}

.roadmap-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.roadmap-canvas-hint {
  position: absolute;
  left: 22px;
  top: 22px;
  z-index: 5;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: min(280px, calc(100% - 44px));
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  padding: 10px 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
  backdrop-filter: blur(12px);
}

.roadmap-canvas-hint-kicker {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.2;
  text-transform: uppercase;
}

.roadmap-canvas-hint-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-strong);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.35;
}

.roadmap-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.roadmap-breadcrumb-label {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.roadmap-breadcrumb-item {
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  padding: 6px 10px;
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 700;
}

.roadmap-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.status-toggle {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: rgba(248, 248, 246, 0.82);
  padding: 8px 12px;
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.status-toggle:hover {
  border-color: rgba(15, 23, 42, 0.14);
}

.status-toggle-active {
  border-color: rgba(15, 23, 42, 0.28);
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);
}

.status-toggle-blue.status-toggle-active {
  border-color: rgba(37, 99, 235, 0.36);
  background: rgba(37, 99, 235, 0.92);
}

.status-toggle-green.status-toggle-active {
  border-color: rgba(21, 128, 61, 0.36);
  background: rgba(21, 128, 61, 0.9);
}

.roadmap-inline-title {
  margin-top: 12px;
  color: var(--ink-strong);
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1.04;
}

.roadmap-inline-title-input {
  margin-top: 12px;
  border-radius: 18px;
  padding: 14px 16px;
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.roadmap-inline-description {
  margin-top: 8px;
  max-width: 46rem;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 1.7;
}

.roadmap-inline-description-input {
  margin-top: 8px;
  border-radius: 16px;
  min-height: 124px;
}

.roadmap-node-context-menu {
  position: fixed;
  z-index: 40;
  width: 220px;
  max-height: calc(100dvh - 24px);
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.98);
  padding: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(10px);
}

.roadmap-menu-group {
  display: grid;
  gap: 6px;
}

.roadmap-menu-group-label {
  padding: 2px 4px 4px;
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.roadmap-menu-item {
  border: 0;
  border-radius: 10px;
  background: transparent;
  padding: 8px 10px;
  text-align: left;
  color: var(--ink-main);
  font-size: 13px;
  font-weight: 700;
  line-height: 1.3;
  transition: background-color 0.16s ease;
}

.roadmap-menu-item:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.06);
}

.roadmap-menu-item-danger {
  color: #b91c1c;
}

.roadmap-menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.roadmap-menu-divider {
  height: 1px;
  margin: 8px 0;
  background: rgba(15, 23, 42, 0.08);
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}

.roadmap-empty-notes {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 24px;
  background: rgba(248, 248, 246, 0.5);
  padding: 18px;
}

.roadmap-detail-shell {
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.04);
}

.roadmap-detail-head {
  padding-bottom: 6px;
}

.roadmap-detail-subhead {
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding-top: 14px;
}

.roadmap-section-label {
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1.2;
  text-transform: uppercase;
}

.roadmap-section-count {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
}

.roadmap-notes-list {
  display: grid;
  gap: 0;
  border-top: 1px solid rgba(15, 23, 42, 0.07);
}

.roadmap-note-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding: 16px 0;
  transition: background-color 0.18s ease, opacity 0.18s ease;
}

.roadmap-note-row:first-child {
  border-top: 0;
}

.roadmap-note-row:hover {
  background: rgba(248, 248, 246, 0.52);
}

.roadmap-note-copy {
  min-width: 0;
  flex: 1;
}

.roadmap-note-title {
  overflow: hidden;
  color: var(--ink-strong);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.roadmap-note-summary {
  margin-top: 4px;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.7;
}

.roadmap-note-row-side {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.roadmap-note-date {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.roadmap-note-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-main);
  font-size: 12px;
  font-weight: 700;
  transition: opacity 0.18s ease;
}

.roadmap-note-link:hover {
  opacity: 0.72;
}

.roadmap-notes-empty {
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding-top: 12px;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.8;
}

.roadmap-section-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  border: 1px dashed rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  background: rgba(248, 248, 246, 0.44);
  padding: 18px;
}

.roadmap-section-empty-kicker {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.2;
  text-transform: uppercase;
}

.roadmap-section-empty-text {
  max-width: 34rem;
  color: var(--ink-main);
  font-size: 14px;
  line-height: 1.8;
}

.roadmap-empty-notes-title {
  margin-top: 8px;
  color: var(--ink-strong);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.4;
}

.roadmap-empty-notes-summary {
  margin-top: 10px;
  max-width: 38rem;
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.8;
}

.roadmap-step-grid {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.roadmap-step-card {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  padding: 14px;
}

.roadmap-step-index {
  color: var(--brand);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.roadmap-step-text {
  margin-top: 8px;
  color: var(--ink-main);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.7;
}

.shared-floating-top {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 30;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid rgba(15, 23, 42, 0.07);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--ink-strong);
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(12px);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease, border-color 0.18s ease;
}

.shared-floating-top:hover {
  transform: translateY(-2px);
  border-color: rgba(15, 23, 42, 0.14);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 30px rgba(15, 23, 42, 0.14);
}

:deep(.roadmap-node) {
  min-width: 208px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  padding: 16px 18px;
  color: var(--ink-strong);
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  line-height: 1.45;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.045);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background-color 0.18s ease;
}

:deep(.roadmap-node-selected) {
  border-color: rgba(229, 106, 43, 0.34);
  background: rgba(255, 250, 246, 0.98);
  box-shadow: 0 0 0 4px rgba(229, 106, 43, 0.07), 0 14px 26px rgba(15, 23, 42, 0.07);
}

:deep(.roadmap-node-in_progress) {
  border-color: rgba(15, 23, 42, 0.24);
  background: rgba(252, 252, 251, 0.98);
  box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.035), 0 12px 24px rgba(15, 23, 42, 0.065);
}

:deep(.roadmap-node-completed) {
  border-color: rgba(21, 128, 61, 0.16);
  background: rgba(248, 255, 251, 0.94);
}

:deep(.vue-flow__attribution) {
  display: none;
}

@media (min-width: 768px) {
  .roadmap-main-shell {
    height: calc(100vh - 32px);
  }

  .roadmap-note-row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .roadmap-note-row-side {
    flex: 0 0 auto;
    align-items: center;
    justify-content: flex-end;
    min-width: 176px;
  }

  .roadmap-empty-card {
    padding: 34px;
  }

  .roadmap-canvas-hint {
    width: auto;
    max-width: 320px;
  }

  .roadmap-empty-title {
    font-size: 2.4rem;
  }

  .roadmap-step-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .roadmap-canvas-hint {
    left: 16px;
    top: 16px;
    width: min(260px, calc(100% - 32px));
    padding: 9px 11px;
  }

  .roadmap-canvas-hint-title {
    font-size: 13px;
  }

  .shared-floating-top {
    right: 14px;
    bottom: 14px;
    width: 40px;
    height: 40px;
  }

  .roadmap-node-context-menu {
    width: min(220px, calc(100vw - 20px));
  }
}
</style>
