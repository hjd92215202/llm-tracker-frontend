<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { roadmapApi } from '@/api/roadmap'
import type { RoadmapNode } from '@/types'
import draggable from 'vuedraggable'

const nodes = ref<RoadmapNode[]>([])
const isEditModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const currentEditNode = ref<Partial<RoadmapNode>>({})

const fetchNodes = async () => {
  const data = await roadmapApi.getNodes()
  nodes.value = data.sort((a, b) => a.sort_order - b.sort_order)
}

onMounted(fetchNodes)

// 💡 优化：增加了可选链保护，解决 'undefined' 报错
const syncEntireChain = async (targetNodes: RoadmapNode[]) => {
  const updates = targetNodes.map((node, index) => {
    const newSortOrder = index
    // 检查前一个节点是否存在
    const prevNode = index === 0 ? null : targetNodes[index - 1]
    const newParentId = prevNode?.id ?? null
    
    node.sort_order = newSortOrder
    node.parent_id = newParentId

    return roadmapApi.updateNode(node.id, {
      ...node,
      sort_order: newSortOrder,
      parent_id: newParentId
    })
  })
  await Promise.all(updates)
}

const handleDragEnd = async () => {
  try {
    await syncEntireChain(nodes.value)
    console.log('排序与依赖链已自动更新')
  } catch (err) {
    alert("自动更新依赖链失败")
  }
}

const openEdit = (node: RoadmapNode | null = null) => {
  currentEditNode.value = node ? { ...node } : { title: '', node_type: 'theory', status: 'todo', sort_order: 0, parent_id: null }
  isEditModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeEdit = () => {
  isEditModalOpen.value = false
  document.body.style.overflow = 'auto'
}

const triggerDelete = () => isDeleteConfirmOpen.value = true

const confirmDelete = async () => {
  const idToDelete = currentEditNode.value.id
  if (!idToDelete) return

  try {
    const remainingNodes = nodes.value.filter(n => n.id !== idToDelete)
    await syncEntireChain(remainingNodes)
    await roadmapApi.deleteNode(idToDelete)

    isDeleteConfirmOpen.value = false
    closeEdit()
    await fetchNodes()
  } catch (err) { 
    console.error(err)
    alert("删除操作失败") 
  }
}

const handleSave = async () => {
  const node = currentEditNode.value
  try {
    if (node.id) {
      await roadmapApi.updateNode(node.id, node)
    } else {
      // 💡 优化：安全地获取最后一个节点 ID
      const lastNode = nodes.value.length > 0 ? nodes.value[nodes.value.length - 1] : null
      await roadmapApi.createNode({
        ...node,
        sort_order: nodes.value.length,
        parent_id: lastNode?.id ?? null
      })
    }
    closeEdit()
    fetchNodes()
  } catch (err) { alert("保存失败") }
}
</script>

<template>
  <div class="p-12 max-w-7xl mx-auto">
    <!-- 1. 顶部标题栏 -->
    <header class="flex justify-between items-end mb-16 px-4">
      <div>
        <h1 class="text-5xl font-black text-slate-900 tracking-tighter">路径管理</h1>
        <p class="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest italic">Trajectory Supervision</p>
      </div>
      <button @click="openEdit()"
        class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl active:scale-95">
        + 新增学习节点
      </button>
    </header>

    <!-- 2. 列表数据区 -->
    <div class="bg-white rounded-4xl border border-slate-100 overflow-hidden shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead
          class="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">
          <tr>
            <th class="px-8 py-6 w-20">排序</th>
            <th class="px-8 py-6">节点名称</th>
            <th class="px-8 py-6">前置依赖 (自动)</th>
            <th class="px-8 py-6">当前状态</th>
            <th class="px-8 py-6 text-right">操作</th>
          </tr>
        </thead>
        <draggable 
          v-model="nodes" 
          tag="tbody" 
          item-key="id" 
          handle=".drag-handle" 
          ghost-class="drag-ghost"
          @end="handleDragEnd"
          class="divide-y divide-slate-50"
        >
          <template #item="{ element: node }">
            <tr class="hover:bg-blue-50/20 transition-colors group">
              <td class="px-8 py-6">
                <div class="drag-handle cursor-grab active:cursor-grabbing text-slate-300 hover:text-blue-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>
              </td>
              <td class="px-8 py-6">
                <div class="flex items-center gap-3">
                  <span :class="node.node_type === 'theory' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'"
                    class="text-[8px] font-black px-2 py-0.5 rounded uppercase">{{ node.node_type }}</span>
                  <span class="text-sm font-black text-slate-800 tracking-tight">{{ node.title }}</span>
                </div>
              </td>
              <td class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">
                {{ node.parent_id ? '↑ ' + (nodes.find(n => n.id === node.parent_id)?.title ?? 'Unknown') : '根节点 (Root)' }}
              </td>
              <td class="px-8 py-6">
                <span
                  :class="{ 'text-emerald-600': node.status === 'completed', 'text-blue-600': node.status === 'in_progress' }"
                  class="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>
                  {{ node.status }}
                </span>
              </td>
              <td class="px-8 py-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click="openEdit(node)"
                  class="text-[10px] font-black text-blue-700 hover:text-slate-900 uppercase tracking-widest underline decoration-2 underline-offset-4">编辑</button>
              </td>
            </tr>
          </template>
        </draggable>
      </table>
    </div>

    <!-- 3. 抽屉编辑页 -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isEditModalOpen" class="fixed inset-0 z-100 flex justify-end overflow-hidden">
          <div class="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" @click="closeEdit"></div>
          <div
            class="drawer-panel relative w-full max-w-md bg-white shadow-2xl p-10 flex flex-col h-full will-change-transform">
            <h2
              class="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-8 flex items-center gap-4 border-b border-slate-100 pb-6">
              <span class="w-1.5 h-6 bg-blue-600 rounded-full"></span>
              配置节点
            </h2>
            <div class="space-y-6 flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">标题</label>
                <input v-model="currentEditNode.title" class="admin-input" type="text" placeholder="输入节点标题..." />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">描述</label>
                <textarea v-model="currentEditNode.description" rows="3" class="admin-input"
                  placeholder="输入简要描述..."></textarea>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分类</label>
                  <select v-model="currentEditNode.node_type" class="admin-input admin-select">
                    <option value="theory">理论 (THEORY)</option>
                    <option value="coding">代码 (CODING)</option>
                  </select>
                </div>
                <div class="flex flex-col gap-2 opacity-60">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">排序权重 (自动)</label>
                  <input :value="currentEditNode.sort_order" disabled type="number" class="admin-input cursor-not-allowed" />
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">学习状态</label>
                <select v-model="currentEditNode.status" class="admin-input admin-select">
                  <option value="todo">待开始 (TODO)</option>
                  <option value="in_progress">进行中 (IN PROGRESS)</option>
                  <option value="completed">已完成 (COMPLETED)</option>
                </select>
              </div>
              <div class="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <p class="text-[10px] font-bold text-blue-600 uppercase tracking-tight">
                  💡 自动规则：当前节点将以前置节点作为依赖。删除节点后，后续节点将自动向前补位重新链接。
                </p>
              </div>
            </div>
            <div class="mt-10 space-y-3">
              <button @click="handleSave"
                class="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-blue-500/10">保存更改</button>
              <button v-if="currentEditNode.id" @click="triggerDelete"
                class="w-full bg-white text-red-500 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-red-50 hover:bg-red-50 transition-all">永久删除节点</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 确认删除弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-110 flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="isDeleteConfirmOpen = false"></div>
          <div class="modal-panel relative w-full max-w-sm bg-white rounded-4xl p-10 shadow-2xl text-center">
            <h3 class="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">确认移除</h3>
            <p class="text-slate-500 text-sm leading-relaxed mb-10 px-4 font-medium">确定要删除 "{{ currentEditNode.title }}" 吗？后续节点将自动重排。</p>
            <div class="flex flex-col gap-3">
              <button @click="confirmDelete"
                class="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">确认删除</button>
              <button @click="isDeleteConfirmOpen = false"
                class="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">取消</button>
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
  @apply bg-blue-50/50 opacity-40 border-2 border-dashed border-blue-200;
}

.admin-input {
  display: block;
  width: 100%;
  background-color: #f8fafc;
  border: 2px solid #e2e8f0 !important;
  border-radius: 0.85rem;
  padding: 0.8rem 1.2rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-input:focus {
  background-color: #fff;
  border-color: #2563eb !important;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.05);
}

.admin-select {
  @apply appearance-none cursor-pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 0.9rem;
}

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.5s ease;
}

.drawer-enter-active .drawer-panel,
.drawer-leave-active .drawer-panel {
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
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
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  transform: scale(0.8) translateY(20px);
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 99px;
}
</style>