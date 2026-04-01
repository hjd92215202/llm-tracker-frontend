<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'
import { roadmapApi } from '@/api/roadmap'
import { useAuthStore } from '@/store/auth'
import type { RoadmapNode } from '@/types'

const authStore = useAuthStore()

const nodes = ref<RoadmapNode[]>([])
const loading = ref(false)
const isEditModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const currentEditNode = ref<Partial<RoadmapNode>>({})

const currentWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? 'Workspace')
const hasWriteAccess = computed(() => authStore.hasWriteAccess)

const fetchNodes = async () => {
  loading.value = true

  try {
    const data = await roadmapApi.getNodes()
    nodes.value = data.sort((a, b) => a.sort_order - b.sort_order)
  } finally {
    loading.value = false
  }
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    fetchNodes()
  },
  { immediate: true }
)

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
  if (!hasWriteAccess.value) {
    return
  }

  try {
    await syncEntireChain(nodes.value)
  } catch {
    alert('Unable to update roadmap order')
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
    const remainingNodes = nodes.value.filter((node) => node.id !== idToDelete)
    await syncEntireChain(remainingNodes)
    await roadmapApi.deleteNode(idToDelete)
    isDeleteConfirmOpen.value = false
    closeEdit()
    await fetchNodes()
  } catch {
    alert('Unable to delete roadmap node')
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
      const lastNode = nodes.value.length > 0 ? nodes.value[nodes.value.length - 1] : null
      await roadmapApi.createNode({
        ...node,
        sort_order: nodes.value.length,
        parent_id: lastNode?.id ?? null,
      })
    }

    closeEdit()
    await fetchNodes()
  } catch {
    alert('Unable to save roadmap node')
  }
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-8 py-10 lg:px-12">
    <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div class="text-[11px] font-black uppercase tracking-[0.34em] text-blue-600">Roadmap operations</div>
        <h1 class="mt-4 text-5xl font-black tracking-[-0.06em] text-slate-950">Keep execution order visible for the whole workspace.</h1>
        <p class="mt-4 max-w-3xl text-base leading-8 text-slate-500">
          This roadmap is currently scoped to <span class="font-black text-slate-800">{{ currentWorkspaceName }}</span>.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <div class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
          {{ hasWriteAccess ? 'Edit enabled' : 'Read only role' }}
        </div>
        <button
          @click="openEdit()"
          :disabled="!hasWriteAccess"
          class="rounded-2xl bg-blue-600 px-6 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] transition-all hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add node
        </button>
      </div>
    </header>

    <div v-if="!hasWriteAccess" class="mt-8 rounded-[1.8rem] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
      Your current role can review the roadmap, but only owners, admins, and members can modify it.
    </div>

    <div class="mt-10 overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_18px_70px_rgba(15,23,42,0.04)]">
      <table class="w-full border-collapse">
        <thead class="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          <tr>
            <th class="px-6 py-4">Order</th>
            <th class="px-6 py-4">Node</th>
            <th class="px-6 py-4">Dependency</th>
            <th class="px-6 py-4">Status</th>
            <th class="px-6 py-4 text-right">Action</th>
          </tr>
        </thead>
        <draggable
          v-model="nodes"
          tag="tbody"
          item-key="id"
          handle=".drag-handle"
          ghost-class="drag-ghost"
          :disabled="!hasWriteAccess"
          @end="handleDragEnd"
          class="divide-y divide-slate-100"
        >
          <template #item="{ element: node }">
            <tr class="hover:bg-slate-50/80">
              <td class="px-6 py-5">
                <div class="drag-handle inline-flex cursor-grab rounded-full border border-slate-200 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                  #{{ node.sort_order + 1 }}
                </div>
              </td>
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <span class="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">
                    {{ node.node_type }}
                  </span>
                  <div>
                    <div class="font-black text-slate-900">{{ node.title }}</div>
                    <div class="mt-1 text-sm text-slate-500">{{ node.description || 'No description yet' }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-5 text-sm font-semibold text-slate-500">
                {{ node.parent_id ? nodes.find((item) => item.id === node.parent_id)?.title ?? 'Missing node' : 'Root node' }}
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
                  {{ node.status }}
                </span>
              </td>
              <td class="px-6 py-5 text-right">
                <button
                  @click="openEdit(node)"
                  :disabled="!hasWriteAccess"
                  class="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 transition-all hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Edit
                </button>
              </td>
            </tr>
          </template>
        </draggable>
      </table>

      <div v-if="loading" class="px-6 py-16 text-center text-sm font-semibold text-slate-400">
        Loading roadmap nodes...
      </div>
    </div>

    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isEditModalOpen" class="fixed inset-0 z-100 flex justify-end overflow-hidden">
          <div class="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" @click="closeEdit"></div>
          <div class="drawer-panel relative flex h-full w-full max-w-lg flex-col bg-white p-8 shadow-2xl">
            <h2 class="border-b border-slate-100 pb-5 text-2xl font-black tracking-[-0.05em] text-slate-950">
              {{ currentEditNode.id ? 'Edit roadmap node' : 'Create roadmap node' }}
            </h2>

            <div class="mt-6 flex-1 space-y-5 overflow-y-auto pr-2">
              <div class="space-y-2">
                <label class="field-label">Title</label>
                <input v-model="currentEditNode.title" class="admin-input" type="text" placeholder="Example: Shipping analytics layer" />
              </div>

              <div class="space-y-2">
                <label class="field-label">Description</label>
                <textarea
                  v-model="currentEditNode.description"
                  rows="4"
                  class="admin-input"
                  placeholder="Capture the business outcome or implementation context"
                ></textarea>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <label class="field-label">Type</label>
                  <select v-model="currentEditNode.node_type" class="admin-input">
                    <option value="theory">Theory</option>
                    <option value="coding">Coding</option>
                    <option value="project">Project</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="field-label">Status</label>
                  <select v-model="currentEditNode.status" class="admin-input">
                    <option value="todo">Todo</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="mt-8 space-y-3">
              <button @click="handleSave" class="primary-button w-full">Save node</button>
              <button v-if="currentEditNode.id" @click="triggerDelete" class="danger-button w-full">Delete node</button>
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
            <h3 class="text-2xl font-black tracking-[-0.05em] text-slate-950">Delete this node?</h3>
            <p class="mt-3 text-sm leading-7 text-slate-500">
              This removes <span class="font-black text-slate-800">{{ currentEditNode.title }}</span> and re-links the roadmap chain.
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
