<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import draggable from 'vuedraggable'
import { roadmapApi } from '@/api/roadmap'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { RoadmapListFilters, RoadmapNode } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const nodes = ref<RoadmapNode[]>([])
const allNodes = ref<RoadmapNode[]>([])
const loading = ref(false)
const isEditModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const currentEditNode = ref<Partial<RoadmapNode>>({})
const errorMessage = ref('')
const searchTerm = ref('')
const selectedStatus = ref<'all' | RoadmapNode['status']>('all')
const selectedType = ref<'all' | RoadmapNode['node_type']>('all')

let filterTimer: ReturnType<typeof setTimeout> | null = null

const copy = computed(() =>
  localeStore.isChinese
    ? {
        eyebrow: 'Roadmap',
        title: '把执行路径整理成清晰、可协作的节点列表',
        summaryPrefix: '当前 roadmap 属于',
        summarySuffix: 'workspace，团队可以在这里搜索、筛选、调整顺序，并持续推进执行。',
        writable: '可编辑',
        readonly: '只读',
        addNode: '新建节点',
        readonlyHint: '你当前可以查看 roadmap，但只有 Owner、Admin 和 Member 可以修改。',
        filteredHint: '当前处于筛选视图。为避免误操作，拖拽排序已暂时关闭。',
        filtersTitle: '搜索与筛选',
        searchPlaceholder: '搜索节点标题或描述',
        allStatus: '全部状态',
        allTypes: '全部类型',
        results: '结果数',
        order: '顺序',
        node: '节点',
        dependency: '依赖',
        status: '状态',
        action: '操作',
        edit: '编辑',
        titleLabel: '标题',
        descriptionLabel: '描述',
        typeLabel: '类型',
        statusLabel: '状态',
        save: '保存节点',
        delete: '删除节点',
        deleteTitle: '删除这个节点？',
        deleteBodyPrefix: '这会删除',
        deleteBodySuffix: '并重新整理 roadmap 链路。',
        deleteAction: '永久删除',
        cancel: '取消',
        noDescription: '暂无描述',
        noResults: '当前筛选条件下没有匹配的节点。',
        loading: '正在加载 roadmap...',
        updateError: '更新 roadmap 顺序失败',
        deleteError: '删除节点失败',
        saveError: '保存节点失败',
        loadError: '加载 roadmap 失败',
        editTitle: '编辑节点',
        createTitle: '创建节点',
        dependencyRoot: '起始节点',
        dependencyMissing: '缺失节点',
        workspaceFallback: 'Workspace',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
      }
    : {
        eyebrow: 'Roadmap',
        title: 'Turn execution into a clear, collaborative node list',
        summaryPrefix: 'This roadmap belongs to',
        summarySuffix: 'workspace, where the team can search, filter, reorder, and keep work moving.',
        writable: 'Editable',
        readonly: 'Read only',
        addNode: 'New node',
        readonlyHint: 'You can review the roadmap, but only owners, admins, and members can change it.',
        filteredHint: 'Filters are active. Drag reordering is temporarily disabled to avoid changing a partial view.',
        filtersTitle: 'Search and filters',
        searchPlaceholder: 'Search node titles or descriptions',
        allStatus: 'All statuses',
        allTypes: 'All types',
        results: 'Results',
        order: 'Order',
        node: 'Node',
        dependency: 'Dependency',
        status: 'Status',
        action: 'Action',
        edit: 'Edit',
        titleLabel: 'Title',
        descriptionLabel: 'Description',
        typeLabel: 'Type',
        statusLabel: 'Status',
        save: 'Save node',
        delete: 'Delete node',
        deleteTitle: 'Delete this node?',
        deleteBodyPrefix: 'This removes',
        deleteBodySuffix: 'and reconnects the roadmap chain.',
        deleteAction: 'Delete permanently',
        cancel: 'Cancel',
        noDescription: 'No description yet',
        noResults: 'No roadmap nodes match the current filters.',
        loading: 'Loading roadmap...',
        updateError: 'Unable to update roadmap order right now',
        deleteError: 'Unable to delete this node',
        saveError: 'Unable to save this node',
        loadError: 'Unable to load roadmap',
        editTitle: 'Edit node',
        createTitle: 'Create node',
        dependencyRoot: 'Root node',
        dependencyMissing: 'Missing node',
        workspaceFallback: 'Workspace',
        theory: 'Theory',
        coding: 'Coding',
        project: 'Project',
        todo: 'Todo',
        inProgress: 'In progress',
        completed: 'Completed',
      }
)

const currentWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? copy.value.workspaceFallback)
const hasWriteAccess = computed(() => authStore.hasWriteAccess)
const isFilterActive = computed(
  () => Boolean(searchTerm.value.trim()) || selectedStatus.value !== 'all' || selectedType.value !== 'all'
)

const typeOptions = computed(() => [
  { value: 'theory' as const, label: copy.value.theory },
  { value: 'coding' as const, label: copy.value.coding },
  { value: 'project' as const, label: copy.value.project },
])

const statusOptions = computed(() => [
  { value: 'todo' as const, label: copy.value.todo },
  { value: 'in_progress' as const, label: copy.value.inProgress },
  { value: 'completed' as const, label: copy.value.completed },
])

const buildFilters = (): RoadmapListFilters => {
  const filters: RoadmapListFilters = {}
  if (searchTerm.value.trim()) {
    filters.search = searchTerm.value.trim()
  }
  if (selectedStatus.value !== 'all') {
    filters.status = selectedStatus.value
  }
  if (selectedType.value !== 'all') {
    filters.node_type = selectedType.value
  }
  return filters
}

const fetchAllNodes = async () => {
  try {
    allNodes.value = (await roadmapApi.getNodes()).sort((a, b) => a.sort_order - b.sort_order)
  } catch {
    allNodes.value = []
  }
}

const fetchNodes = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const data = await roadmapApi.getNodes(buildFilters())
    nodes.value = data.sort((a, b) => a.sort_order - b.sort_order)
  } catch (error: any) {
    nodes.value = []
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const scheduleFetchNodes = () => {
  if (filterTimer) {
    clearTimeout(filterTimer)
  }

  filterTimer = setTimeout(() => {
    fetchNodes()
  }, 220)
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchAllNodes()
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
  [() => authStore.activeWorkspaceId, searchTerm, selectedStatus, selectedType],
  () => {
    scheduleFetchNodes()
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

const syncEntireChain = async (targetNodes: RoadmapNode[]) => {
  const updates = targetNodes.map((node, index) => {
    const previousNode = index === 0 ? null : targetNodes[index - 1]
    node.sort_order = index
    node.parent_id = previousNode?.id ?? null

    return roadmapApi.updateNode(node.id, {
      ...node,
      sort_order: index,
      parent_id: previousNode?.id ?? null,
    })
  })

  await Promise.all(updates)
}

const handleDragEnd = async () => {
  if (!hasWriteAccess.value || isFilterActive.value) {
    return
  }

  try {
    await syncEntireChain(nodes.value)
    await fetchAllNodes()
    await fetchNodes()
  } catch {
    errorMessage.value = copy.value.updateError
    await fetchAllNodes()
    await fetchNodes()
  }
}

const openEdit = (node: RoadmapNode | null = null) => {
  if (!hasWriteAccess.value) {
    return
  }

  currentEditNode.value = node
    ? { ...node }
    : { title: '', description: '', node_type: 'theory', status: 'todo', sort_order: 0, parent_id: null }

  isEditModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeEdit = () => {
  isEditModalOpen.value = false
  document.body.style.overflow = 'auto'
}

const triggerDelete = () => {
  if (!hasWriteAccess.value) {
    return
  }

  isDeleteConfirmOpen.value = true
}

const confirmDelete = async () => {
  const idToDelete = currentEditNode.value.id
  if (!idToDelete || !hasWriteAccess.value) {
    return
  }

  try {
    const remainingNodes = allNodes.value.filter((node) => node.id !== idToDelete)
    await syncEntireChain(remainingNodes)
    await roadmapApi.deleteNode(idToDelete)
    isDeleteConfirmOpen.value = false
    closeEdit()
    await fetchAllNodes()
    await fetchNodes()
  } catch {
    errorMessage.value = copy.value.deleteError
  }
}

const handleSave = async () => {
  if (!hasWriteAccess.value) {
    return
  }

  const node = currentEditNode.value

  try {
    if (node.id) {
      await roadmapApi.updateNode(node.id, node)
    } else {
      const lastNode = allNodes.value.length > 0 ? allNodes.value[allNodes.value.length - 1] : null
      await roadmapApi.createNode({
        ...node,
        sort_order: allNodes.value.length,
        parent_id: lastNode?.id ?? null,
      })
    }

    closeEdit()
    await fetchAllNodes()
    await fetchNodes()
  } catch {
    errorMessage.value = copy.value.saveError
  }
}

const getDependencyTitle = (parentId: number | null) => {
  if (!parentId) {
    return copy.value.dependencyRoot
  }

  return allNodes.value.find((item) => item.id === parentId)?.title ?? copy.value.dependencyMissing
}

const statusBadgeLabel = (status: RoadmapNode['status']) => {
  if (status === 'completed') return copy.value.completed
  if (status === 'in_progress') return copy.value.inProgress
  return copy.value.todo
}

const typeLabel = (type: RoadmapNode['node_type']) => {
  if (type === 'coding') return copy.value.coding
  if (type === 'project') return copy.value.project
  return copy.value.theory
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-8 lg:px-10">
    <header class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div class="max-w-3xl">
        <div class="product-eyebrow border border-[rgba(216,110,59,0.14)] bg-white/80 text-[var(--brand)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
          {{ copy.eyebrow }}
        </div>
        <h1 class="product-title mt-7 text-4xl leading-[0.96] md:text-6xl">{{ copy.title }}</h1>
        <p class="mt-5 text-base leading-8 text-[var(--ink-soft)]">
          {{ copy.summaryPrefix }}
          <span class="font-black text-[var(--ink-strong)]">{{ currentWorkspaceName }}</span>
          {{ copy.summarySuffix }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="pill">{{ hasWriteAccess ? copy.writable : copy.readonly }}</div>
        <button v-if="hasWriteAccess" class="product-button-primary" type="button" @click="openEdit()">
          {{ copy.addNode }}
        </button>
      </div>
    </header>

    <div v-if="!hasWriteAccess" class="banner banner-warning mt-8">
      {{ copy.readonlyHint }}
    </div>

    <div v-if="isFilterActive" class="banner banner-info mt-4">
      {{ copy.filteredHint }}
    </div>

    <div v-if="errorMessage" class="product-error mt-4 px-5 py-4 text-sm font-semibold">
      {{ errorMessage }}
    </div>

    <section class="toolbar mt-8">
      <div class="toolbar-title">{{ copy.filtersTitle }}</div>
      <div class="scope-pill">{{ copy.results }} {{ nodes.length }}</div>
      <div class="toolbar-grid">
        <input v-model="searchTerm" type="text" class="product-input" :placeholder="copy.searchPlaceholder" />

        <select v-model="selectedStatus" class="product-input">
          <option value="all">{{ copy.allStatus }}</option>
          <option v-for="status in statusOptions" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>

        <select v-model="selectedType" class="product-input">
          <option value="all">{{ copy.allTypes }}</option>
          <option v-for="type in typeOptions" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>
    </section>

    <section class="table-shell mt-8">
      <table class="w-full border-collapse">
        <thead class="table-head">
          <tr>
            <th class="px-5 py-4">{{ copy.order }}</th>
            <th class="px-5 py-4">{{ copy.node }}</th>
            <th class="px-5 py-4">{{ copy.dependency }}</th>
            <th class="px-5 py-4">{{ copy.status }}</th>
            <th v-if="hasWriteAccess" class="px-5 py-4 text-right">{{ copy.action }}</th>
          </tr>
        </thead>

        <draggable
          v-model="nodes"
          tag="tbody"
          item-key="id"
          handle=".drag-handle"
          ghost-class="drag-ghost"
          :disabled="!hasWriteAccess || isFilterActive"
          @end="handleDragEnd"
          class="divide-y divide-[rgba(20,33,43,0.08)]"
        >
          <template #item="{ element: node }">
            <tr class="row">
              <td class="px-5 py-5">
                <div :class="hasWriteAccess && !isFilterActive ? 'cursor-grab' : 'cursor-default'" class="drag-handle order-pill">
                  #{{ node.sort_order + 1 }}
                </div>
              </td>
              <td class="px-5 py-5">
                <div class="flex items-start gap-3">
                  <span class="pill pill-brand">{{ typeLabel(node.node_type) }}</span>
                  <div class="min-w-0">
                    <div class="font-black text-[var(--ink-strong)]">{{ node.title }}</div>
                    <div class="mt-1 text-sm leading-7 text-[var(--ink-soft)]">{{ node.description || copy.noDescription }}</div>
                  </div>
                </div>
              </td>
              <td class="px-5 py-5 text-sm font-semibold text-[var(--ink-soft)]">
                {{ getDependencyTitle(node.parent_id) }}
              </td>
              <td class="px-5 py-5">
                <span
                  :class="
                    node.status === 'completed'
                      ? 'status-pill status-pill-success'
                      : node.status === 'in_progress'
                        ? 'status-pill status-pill-brand'
                        : 'status-pill'
                  "
                >
                  {{ statusBadgeLabel(node.status) }}
                </span>
              </td>
              <td v-if="hasWriteAccess" class="px-5 py-5 text-right">
                <button class="action-link" type="button" @click="openEdit(node)">{{ copy.edit }}</button>
              </td>
            </tr>
          </template>
        </draggable>
      </table>

      <div v-if="!loading && nodes.length === 0" class="empty-card">
        {{ copy.noResults }}
      </div>

      <div v-if="loading" class="empty-card">
        {{ copy.loading }}
      </div>
    </section>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isEditModalOpen" class="fixed inset-0 z-[100] flex justify-end overflow-hidden">
          <div class="absolute inset-0 bg-[rgba(20,33,43,0.24)] backdrop-blur-sm" @click="closeEdit"></div>
          <div class="drawer-panel">
            <h2 class="border-b border-[rgba(20,33,43,0.08)] pb-5 text-2xl font-black tracking-[-0.05em] text-[var(--ink-strong)]">
              {{ currentEditNode.id ? copy.editTitle : copy.createTitle }}
            </h2>

            <div class="mt-6 flex-1 space-y-5 overflow-y-auto pr-2">
              <div class="space-y-2">
                <label class="field-label">{{ copy.titleLabel }}</label>
                <input v-model="currentEditNode.title" class="product-input" type="text" />
              </div>

              <div class="space-y-2">
                <label class="field-label">{{ copy.descriptionLabel }}</label>
                <textarea v-model="currentEditNode.description" rows="4" class="product-input"></textarea>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <label class="field-label">{{ copy.typeLabel }}</label>
                  <select v-model="currentEditNode.node_type" class="product-input">
                    <option value="theory">{{ copy.theory }}</option>
                    <option value="coding">{{ copy.coding }}</option>
                    <option value="project">{{ copy.project }}</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="field-label">{{ copy.statusLabel }}</label>
                  <select v-model="currentEditNode.status" class="product-input">
                    <option value="todo">{{ copy.todo }}</option>
                    <option value="in_progress">{{ copy.inProgress }}</option>
                    <option value="completed">{{ copy.completed }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mt-8 space-y-3">
              <button class="product-button-primary w-full" type="button" @click="handleSave">{{ copy.save }}</button>
              <button v-if="currentEditNode.id" class="danger-button w-full" type="button" @click="triggerDelete">{{ copy.delete }}</button>
              <button class="product-button-secondary w-full" type="button" @click="closeEdit">{{ copy.cancel }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-[rgba(20,33,43,0.32)] backdrop-blur-sm" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel">
            <h3 class="text-2xl font-black tracking-[-0.05em] text-[var(--ink-strong)]">{{ copy.deleteTitle }}</h3>
            <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {{ copy.deleteBodyPrefix }}
              <span class="font-black text-[var(--ink-strong)]">{{ currentEditNode.title }}</span>
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

<style lang="postcss" scoped>
@reference "@/style.css";

.toolbar {
  @apply rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.8)] p-5 shadow-[0_14px_36px_rgba(20,33,43,0.04)];
}

.toolbar-title {
  @apply text-[11px] font-black uppercase tracking-[0.28em] text-[var(--brand)];
}

.toolbar-grid {
  @apply mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr];
}

.scope-pill {
  @apply mt-4 inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--ink-main)];
}

.table-shell {
  @apply overflow-hidden rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] shadow-[0_18px_50px_rgba(20,33,43,0.05)];
}

.table-head {
  @apply bg-[rgba(20,33,43,0.04)] text-left text-[11px] font-black uppercase tracking-[0.22em] text-[var(--ink-soft)];
}

.row {
  @apply transition-colors hover:bg-[rgba(255,250,242,0.68)];
}

.drag-ghost {
  @apply border-2 border-dashed border-[rgba(216,110,59,0.24)] bg-[rgba(216,110,59,0.08)] opacity-40;
}

.order-pill {
  @apply inline-flex rounded-full border border-[rgba(20,33,43,0.12)] px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[var(--ink-soft)];
}

.pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ink-main)];
}

.pill-brand {
  @apply bg-[rgba(216,110,59,0.12)] text-[var(--brand)];
}

.status-pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ink-main)];
}

.status-pill-success {
  @apply bg-[rgba(24,121,78,0.12)] text-[var(--success)];
}

.status-pill-brand {
  @apply bg-[rgba(216,110,59,0.12)] text-[var(--brand)];
}

.action-link {
  @apply text-[11px] font-black uppercase tracking-[0.22em] text-[var(--brand)] transition-all hover:opacity-70;
}

.field-label {
  @apply text-[11px] font-black uppercase tracking-[0.22em] text-[var(--ink-soft)];
}

.banner {
  @apply rounded-[1.6rem] px-5 py-4 text-sm font-semibold;
}

.banner-warning {
  background: rgba(216, 110, 59, 0.08);
  color: var(--brand-deep);
}

.banner-info {
  background: rgba(45, 122, 120, 0.08);
  color: var(--accent);
}

.drawer-panel {
  @apply relative flex h-full w-full max-w-lg flex-col bg-[rgba(255,251,245,0.98)] p-8 shadow-[0_30px_80px_rgba(20,33,43,0.18)];
}

.danger-button {
  @apply rounded-[1.2rem] px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all;
  background: var(--danger);
}

.danger-button:hover {
  opacity: 0.9;
}

.modal-panel {
  @apply relative w-full max-w-sm rounded-[2rem] bg-[rgba(255,251,245,0.98)] p-8 text-center shadow-[0_30px_80px_rgba(20,33,43,0.18)];
}

.empty-card {
  @apply px-6 py-16 text-center text-sm font-semibold text-[var(--ink-soft)];
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.35s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.35s ease;
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
