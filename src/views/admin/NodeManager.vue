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
        eyebrow: 'Roadmap Operations',
        title: '让整个 workspace 都能看清执行顺序、搜索节点，并按状态筛选。',
        summaryPrefix: '当前 roadmap 作用于',
        summarySuffix: 'workspace。',
        writable: '编辑已开启',
        readonly: '只读角色',
        addNode: '新增节点',
        readonlyHint: '你当前可以查看和搜索 roadmap，但只有 Owner、Admin 和 Member 可以修改。',
        filteredHint: '当前处于筛选视图。为避免误操作，拖拽重排会暂时禁用。',
        filtersTitle: '搜索与筛选',
        searchPlaceholder: '搜索标题或描述',
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
        deleteBodySuffix: '并重新串联 roadmap 顺序。',
        deleteAction: '永久删除',
        cancel: '取消',
        noDescription: '还没有描述',
        noResults: '当前筛选条件下没有匹配的节点。',
        loading: '正在加载 roadmap 节点...',
        updateError: '暂时无法更新 roadmap 顺序',
        deleteError: '暂时无法删除节点',
        saveError: '暂时无法保存节点',
        loadError: '无法加载 roadmap',
        editTitle: '编辑 roadmap 节点',
        createTitle: '创建 roadmap 节点',
        dependencyRoot: '根节点',
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
        eyebrow: 'Roadmap operations',
        title: 'Keep execution order visible, searchable, and filterable across the workspace.',
        summaryPrefix: 'This roadmap is currently scoped to',
        summarySuffix: 'workspace.',
        writable: 'Edit enabled',
        readonly: 'Read only role',
        addNode: 'Add node',
        readonlyHint: 'Your role can review and search the roadmap, but only owners, admins, and members can modify it.',
        filteredHint: 'Filters are active. Drag reordering is temporarily disabled to avoid changing only a partial view.',
        filtersTitle: 'Search and filters',
        searchPlaceholder: 'Search titles or descriptions',
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
        deleteBodySuffix: 'and re-links the roadmap chain.',
        deleteAction: 'Delete permanently',
        cancel: 'Cancel',
        noDescription: 'No description yet',
        noResults: 'No roadmap nodes match the current filters.',
        loading: 'Loading roadmap nodes...',
        updateError: 'Unable to update roadmap order right now',
        deleteError: 'Unable to delete this roadmap node',
        saveError: 'Unable to save the roadmap node',
        loadError: 'Unable to load roadmap data',
        editTitle: 'Edit roadmap node',
        createTitle: 'Create roadmap node',
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
    const newSortOrder = index
    const previousNode = index === 0 ? null : targetNodes[index - 1]
    const newParentId = previousNode?.id ?? null

    node.sort_order = newSortOrder
    node.parent_id = newParentId

    return roadmapApi.updateNode(node.id, {
      ...node,
      sort_order: newSortOrder,
      parent_id: newParentId,
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
    alert(copy.value.updateError)
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
    alert(copy.value.deleteError)
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
    alert(copy.value.saveError)
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
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">{{ copy.eyebrow }}</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">{{ copy.title }}</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
          {{ copy.summaryPrefix }}
          <span class="font-black text-slate-800">{{ currentWorkspaceName }}</span>
          {{ copy.summarySuffix }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {{ hasWriteAccess ? copy.writable : copy.readonly }}
        </div>
        <button
          v-if="hasWriteAccess"
          class="rounded-2xl bg-blue-600 px-6 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] transition-all hover:bg-slate-950"
          @click="openEdit()"
        >
          {{ copy.addNode }}
        </button>
      </div>
    </header>

    <div
      v-if="!hasWriteAccess"
      class="mt-8 rounded-[1.8rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700"
    >
      {{ copy.readonlyHint }}
    </div>

    <div
      v-if="isFilterActive"
      class="mt-8 rounded-[1.8rem] border border-sky-100 bg-sky-50 px-5 py-4 text-sm font-semibold text-sky-700"
    >
      {{ copy.filteredHint }}
    </div>

    <div
      v-if="errorMessage"
      class="mt-8 rounded-[1.75rem] border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600"
    >
      {{ errorMessage }}
    </div>

    <section class="mt-10 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="text-[11px] font-black uppercase tracking-[0.28em] text-blue-600">{{ copy.filtersTitle }}</div>
        <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {{ copy.results }} {{ nodes.length }}
        </div>
      </div>

      <div class="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <input v-model="searchTerm" type="text" class="admin-input" :placeholder="copy.searchPlaceholder" />

        <select v-model="selectedStatus" class="admin-input">
          <option value="all">{{ copy.allStatus }}</option>
          <option v-for="status in statusOptions" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>

        <select v-model="selectedType" class="admin-input">
          <option value="all">{{ copy.allTypes }}</option>
          <option v-for="type in typeOptions" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>
    </section>

    <div class="mt-10 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <table class="w-full border-collapse">
        <thead class="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th class="px-6 py-4">{{ copy.order }}</th>
            <th class="px-6 py-4">{{ copy.node }}</th>
            <th class="px-6 py-4">{{ copy.dependency }}</th>
            <th class="px-6 py-4">{{ copy.status }}</th>
            <th v-if="hasWriteAccess" class="px-6 py-4 text-right">{{ copy.action }}</th>
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
          class="divide-y divide-slate-100"
        >
          <template #item="{ element: node }">
            <tr class="hover:bg-slate-50/80">
              <td class="px-6 py-5">
                <div
                  :class="hasWriteAccess && !isFilterActive ? 'cursor-grab' : 'cursor-default'"
                  class="drag-handle inline-flex rounded-full border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400"
                >
                  #{{ node.sort_order + 1 }}
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                    {{ typeLabel(node.node_type) }}
                  </span>
                  <div>
                    <div class="font-black text-slate-900">{{ node.title }}</div>
                    <div class="mt-1 text-sm text-slate-500">{{ node.description || copy.noDescription }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5 text-sm font-semibold text-slate-500">
                {{ getDependencyTitle(node.parent_id) }}
              </td>
              <td class="px-6 py-5">
                <span
                  :class="[
                    node.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : '',
                    node.status === 'in_progress' ? 'bg-blue-50 text-blue-700' : '',
                    node.status === 'todo' ? 'bg-slate-100 text-slate-500' : '',
                  ]"
                  class="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
                >
                  {{ statusBadgeLabel(node.status) }}
                </span>
              </td>
              <td v-if="hasWriteAccess" class="px-6 py-5 text-right">
                <button
                  class="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 transition-all hover:text-slate-950"
                  @click="openEdit(node)"
                >
                  {{ copy.edit }}
                </button>
              </td>
            </tr>
          </template>
        </draggable>
      </table>

      <div v-if="!loading && nodes.length === 0" class="px-6 py-16 text-center text-sm font-semibold text-slate-400">
        {{ copy.noResults }}
      </div>

      <div v-if="loading" class="px-6 py-16 text-center text-sm font-semibold text-slate-400">
        {{ copy.loading }}
      </div>
    </div>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isEditModalOpen" class="fixed inset-0 z-100 flex justify-end overflow-hidden">
          <div class="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" @click="closeEdit"></div>
          <div class="drawer-panel relative flex h-full w-full max-w-lg flex-col bg-white p-8 shadow-2xl">
            <h2 class="border-b border-slate-100 pb-5 text-2xl font-black tracking-[-0.05em] text-slate-950">
              {{ currentEditNode.id ? copy.editTitle : copy.createTitle }}
            </h2>

            <div class="mt-6 flex-1 space-y-5 overflow-y-auto pr-2">
              <div class="space-y-2">
                <label class="field-label">{{ copy.titleLabel }}</label>
                <input
                  v-model="currentEditNode.title"
                  class="admin-input"
                  type="text"
                  placeholder="Example: Shipping analytics layer"
                />
              </div>

              <div class="space-y-2">
                <label class="field-label">{{ copy.descriptionLabel }}</label>
                <textarea
                  v-model="currentEditNode.description"
                  rows="4"
                  class="admin-input"
                  placeholder="Capture the business outcome or implementation context"
                ></textarea>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <label class="field-label">{{ copy.typeLabel }}</label>
                  <select v-model="currentEditNode.node_type" class="admin-input">
                    <option value="theory">{{ copy.theory }}</option>
                    <option value="coding">{{ copy.coding }}</option>
                    <option value="project">{{ copy.project }}</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="field-label">{{ copy.statusLabel }}</label>
                  <select v-model="currentEditNode.status" class="admin-input">
                    <option value="todo">{{ copy.todo }}</option>
                    <option value="in_progress">{{ copy.inProgress }}</option>
                    <option value="completed">{{ copy.completed }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mt-8 space-y-3">
              <button class="primary-button w-full" @click="handleSave">{{ copy.save }}</button>
              <button v-if="currentEditNode.id" class="danger-button w-full" @click="triggerDelete">{{ copy.delete }}</button>
              <button class="secondary-button w-full" @click="closeEdit">{{ copy.cancel }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-110 flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel relative w-full max-w-sm rounded-[2rem] bg-white p-8 text-center shadow-2xl">
            <h3 class="text-2xl font-black tracking-[-0.05em] text-slate-950">{{ copy.deleteTitle }}</h3>
            <p class="mt-3 text-sm leading-7 text-slate-500">
              {{ copy.deleteBodyPrefix }}
              <span class="font-black text-slate-800">{{ currentEditNode.title }}</span>
              {{ copy.deleteBodySuffix }}
            </p>
            <div class="mt-8 flex flex-col gap-3">
              <button class="danger-button w-full" @click="confirmDelete">{{ copy.deleteAction }}</button>
              <button class="secondary-button w-full" @click="isDeleteConfirmOpen = false">{{ copy.cancel }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.drag-ghost {
  @apply border-2 border-dashed border-blue-200 bg-blue-50/40 opacity-40;
}

.field-label {
  @apply text-[11px] font-black uppercase tracking-[0.22em] text-slate-400;
}

.admin-input {
  @apply w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all;
}

.admin-input:focus {
  @apply border-blue-600;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.08);
}

.primary-button {
  @apply rounded-2xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] transition-all hover:bg-slate-950;
}

.danger-button {
  @apply rounded-2xl bg-red-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white transition-all hover:bg-red-700;
}

.secondary-button {
  @apply rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 transition-all hover:bg-slate-50;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.4s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.4s ease;
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
