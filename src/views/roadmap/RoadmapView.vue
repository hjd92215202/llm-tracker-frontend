<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Background } from '@vue-flow/background'
import { VueFlow } from '@vue-flow/core'
import { ArrowUp, ArrowUpRight } from 'lucide-vue-next'
import RoadmapHeroHeader from '@/components/roadmap/RoadmapHeroHeader.vue'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { Note, RoadmapNode } from '@/types'
import { buildRoadmapTree, findRoadmapPath, flattenRoadmapTree } from '@/utils/roadmapTree'

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
      type: 'smoothstep',
      style: { stroke: '#d7dce2', strokeWidth: 2.1 },
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

const handleNodeClick = async (payload: { node: { data: RoadmapNode } }) => {
  await selectNode(payload.node.data, { autoScroll: true })
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
  pageScrollRef.value?.addEventListener('scroll', updateFloatingTopVisibility, { passive: true })
  updateFloatingTopVisibility()
})

onUnmounted(() => {
  pageScrollRef.value?.removeEventListener('scroll', updateFloatingTopVisibility)
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
            @click="router.push('/admin/roadmap')"
          >
            {{ copy.manageAction }}
          </button>
        </template>
      </RoadmapHeroHeader>

      <div v-if="shareMessage" class="roadmap-toast">
        {{ shareMessage }}
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
          fit-view-on-init
          :fit-view-on-init-options="{ padding: 0.42, minZoom: 0.48, maxZoom: 1.1, duration: 360 }"
          :min-zoom="0.48"
          :max-zoom="1.3"
          :nodes-draggable="false"
          :elements-selectable="false"
          @node-click="handleNodeClick"
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
              <span :class="selectedNode.status === 'completed' ? 'admin-chip-green' : selectedNode.status === 'in_progress' ? 'admin-chip-blue' : 'admin-chip'">
                {{ statusLabel(selectedNode.status) }}
              </span>
            </div>

            <h2 class="mt-3 text-[2rem] font-bold tracking-[-0.05em] text-[var(--ink-strong)]">{{ selectedNode.title }}</h2>
            <p class="mt-2 max-w-3xl text-[15px] leading-7 text-[var(--ink-soft)]">{{ selectedNode.description || copy.noDescription }}</p>
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
}
</style>
