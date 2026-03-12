<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { roadmapApi } from '@/api/roadmap'
import type { RoadmapNode } from '@/types'

const nodes = ref<RoadmapNode[]>([])
const isEditModalOpen = ref(false)
const isDeleteConfirmOpen = ref(false)
const currentEditNode = ref<Partial<RoadmapNode>>({})

const fetchNodes = async () => {
  const data = await roadmapApi.getNodes()
  nodes.value = data
}

onMounted(fetchNodes)

const openEdit = (node: RoadmapNode | null = null) => {
  currentEditNode.value = node ? { ...node } : { title: '', node_type: 'theory', status: 'todo', sort_order: 0, parent_id: null }
  isEditModalOpen.value = true
  document.body.style.overflow = 'hidden'
}

const closeEdit = () => {
  isEditModalOpen.value = false
  document.body.style.overflow = 'auto'
}

const triggerDelete = () => {
  isDeleteConfirmOpen.value = true
}

const confirmDelete = async () => {
  if (!currentEditNode.value.id) return
  try {
    await roadmapApi.deleteNode(currentEditNode.value.id)
    isDeleteConfirmOpen.value = false
    closeEdit()
    fetchNodes()
  } catch (err) {
    alert("Delete operation failed")
  }
}

const handleSave = async () => {
  const node = currentEditNode.value
  try {
    if (node.id) {
      await roadmapApi.updateNode(node.id, {
        title: node.title!,
        description: node.description || "",
        status: node.status!,
        node_type: node.node_type!,
        parent_id: node.parent_id,
        sort_order: node.sort_order || 0
      })
    } else {
      await roadmapApi.createNode(node)
    }
    closeEdit()
    fetchNodes()
  } catch (err) {
    alert("Save failed")
  }
}
</script>

<template>
  <div class="p-12 max-w-7xl mx-auto">
    <!-- 1. 顶部标题栏 -->
    <header class="flex justify-between items-end mb-16 px-4">
      <div>
        <h1 class="text-5xl font-black text-slate-900 tracking-tighter">Nodes Management</h1>
        <p class="text-slate-500 font-bold mt-2 uppercase text-[10px] tracking-widest italic">Management & Supervision</p>
      </div>
      <button @click="openEdit()" class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl active:scale-95">
        + Add New Step
      </button>
    </header>

    <!-- 2. 列表数据区 -->
    <div class="bg-white rounded-4xl border border-slate-100 overflow-hidden shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-100">
          <tr>
            <th class="px-8 py-6">#Order</th>
            <th class="px-8 py-6">Node Identity</th>
            <th class="px-8 py-6">Dependency</th>
            <th class="px-8 py-6">Status</th>
            <th class="px-8 py-6 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="node in nodes" :key="node.id" class="hover:bg-blue-50/20 transition-colors">
            <td class="px-8 py-6 font-mono text-xs text-slate-500 font-bold">#{{ node.sort_order }}</td>
            <td class="px-8 py-6 text-sm font-black text-slate-800 tracking-tight">{{ node.title }}</td>
            <td class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
               {{ node.parent_id ? '↑ ' + (nodes.find(n => n.id === node.parent_id)?.title) : 'Root Neuron' }}
            </td>
            <td class="px-8 py-6 text-[10px] font-black uppercase tracking-widest">
              <span :class="{'text-emerald-600': node.status === 'completed', 'text-blue-600': node.status === 'in_progress'}" class="flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                {{ node.status }}
              </span>
            </td>
            <td class="px-8 py-6 text-right">
              <button @click="openEdit(node)" class="text-[10px] font-black text-blue-700 hover:text-slate-900 uppercase tracking-widest underline decoration-2 underline-offset-4 transition-colors">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 3. 抽屉式编辑弹窗 -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isEditModalOpen" class="fixed inset-0 z-100 flex justify-end overflow-hidden">
          <div class="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" @click="closeEdit"></div>
          
          <div class="drawer-content relative w-full max-w-lg bg-white shadow-2xl p-16 flex flex-col h-full will-change-transform">
            <h2 class="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-12 flex items-center gap-4 border-b border-slate-100 pb-6">
              <span class="w-2 h-8 bg-blue-600 rounded-full"></span>
              Configure Node
            </h2>
            
            <div class="space-y-8 flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <!-- Title -->
              <div class="flex flex-col gap-3">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Title</label>
                <input v-model="currentEditNode.title" class="admin-input" type="text" placeholder="e.g. Transformer" />
              </div>

              <!-- Description -->
              <div class="flex flex-col gap-3">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea v-model="currentEditNode.description" rows="3" class="admin-input" placeholder="Note context..."></textarea>
              </div>

              <!-- Type & Order -->
              <div class="grid grid-cols-2 gap-6">
                <div class="flex flex-col gap-3">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
                  <div class="relative">
                    <select v-model="currentEditNode.node_type" class="admin-input admin-select">
                      <option value="theory">THEORY</option>
                      <option value="coding">CODING</option>
                    </select>
                  </div>
                </div>
                <div class="flex flex-col gap-3">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Sort Order</label>
                  <input v-model.number="currentEditNode.sort_order" type="number" class="admin-input" />
                </div>
              </div>

              <!-- Status -->
              <div class="flex flex-col gap-3">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Learning Status</label>
                <div class="relative">
                  <select v-model="currentEditNode.status" class="admin-input admin-select">
                    <option value="todo">TODO</option>
                    <option value="in_progress">IN PROGRESS</option>
                    <option value="completed">COMPLETED</option>
                  </select>
                </div>
              </div>

              <!-- Dependency -->
              <div class="flex flex-col gap-3">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Dependency</label>
                <div class="relative">
                  <select v-model="currentEditNode.parent_id" class="admin-input admin-select">
                    <option :value="null">ROOT LEVEL</option>
                    <option v-for="n in nodes.filter(n => n.id !== currentEditNode.id)" :key="n.id" :value="n.id">{{ n.title }}</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="mt-12 space-y-4">
              <button @click="handleSave" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-900 transition-all shadow-xl active:scale-95">
                Save Node
              </button>
              <button 
                v-if="currentEditNode.id"
                @click="triggerDelete" 
                class="w-full bg-white text-red-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border border-red-100 hover:bg-red-50 transition-all active:scale-95"
              >
                Delete Permanent
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 删除模态框保持现状 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isDeleteConfirmOpen" class="fixed inset-0 z-110 flex items-center justify-center p-6">
          <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-md" @click="isDeleteConfirmOpen = false"></div>
          <div class="relative w-full max-w-sm bg-white rounded-4xl p-10 shadow-2xl text-center">
            <div class="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 class="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Dangerous Action</h3>
            <p class="text-slate-500 text-sm leading-relaxed mb-10">确定要删除 "{{ currentEditNode.title }}" 吗？</p>
            <div class="flex flex-col gap-3">
              <button @click="confirmDelete" class="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 shadow-xl">Yes, Delete Permanent</button>
              <button @click="isDeleteConfirmOpen = false" class="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

/* 💡 极致强化的输入框样式 */
.admin-input {
  display: block;
  width: 100%;
  background-color: #f8fafc; /* bg-slate-50 */
  /* 强制实线描边，确保不消失 */
  border: 2px solid #e2e8f0 !important; 
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e293b;
  outline: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-input:hover {
  border-color: #cbd5e1 !important; /* hover: border-slate-300 */
}

.admin-input:focus {
  background-color: #ffffff;
  border-color: #2563eb !important; /* focus: border-blue-600 */
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.08); /* 蓝色发光 */
}

/* 💡 自定义 Select */
.admin-select {
  appearance: none;
  cursor: pointer;
  /* 自定义箭头 */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1.25rem center;
  background-size: 1rem;
}

/* 抽屉动画 */
.drawer-enter-active, .drawer-leave-active {
  transition: opacity 0.4s ease;
}
.drawer-enter-active .drawer-content,
.drawer-leave-active .drawer-content {
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
}
.drawer-enter-from .drawer-content,
.drawer-leave-to .drawer-content {
  transform: translateX(100%);
}

/* 模态框动画 */
.modal-enter-active, .modal-leave-active { transition: all 0.4s cubic-bezier(0.32, 0.72, 0, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.9); }

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
</style>