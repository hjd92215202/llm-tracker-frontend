<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { roadmapApi } from '@/api/roadmap'
import type { RoadmapNode } from '@/types'

const nodes = ref<RoadmapNode[]>([])
const isEditModalOpen = ref(false)
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
    <header class="flex justify-between items-end mb-16">
      <div>
        <h1 class="text-5xl font-black text-slate-900 tracking-tighter">Nodes Management</h1>
        <p class="text-slate-400 font-medium mt-2 uppercase text-[10px] tracking-widest">Configure your learning trajectory</p>
      </div>
      <button @click="openEdit()" class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl active:scale-95">
        + Add New Step
      </button>
    </header>

    <!-- 2. 列表数据 -->
    <div class="bg-white rounded-4xl border border-slate-100 overflow-hidden shadow-sm">
      <table class="w-full text-left border-collapse">
        <thead class="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">
          <tr>
            <th class="px-8 py-5">#Order</th>
            <th class="px-8 py-5">Node Identity</th>
            <th class="px-8 py-5">Dependency</th>
            <th class="px-8 py-5">Status</th>
            <th class="px-8 py-5 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="node in nodes" :key="node.id" class="hover:bg-slate-50/50 transition-colors">
            <td class="px-8 py-6 font-mono text-xs text-slate-300">#{{ node.sort_order }}</td>
            <td class="px-8 py-6">
              <div class="flex items-center gap-3">
                <span :class="node.node_type === 'theory' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'" class="text-[8px] font-black px-2 py-0.5 rounded uppercase">{{ node.node_type }}</span>
                <span class="font-black text-slate-800 tracking-tight text-base">{{ node.title }}</span>
              </div>
            </td>
            <td class="px-8 py-6">
               <span v-if="node.parent_id" class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">↑ {{ nodes.find(n => n.id === node.parent_id)?.title }}</span>
               <span v-else class="text-[10px] font-bold text-slate-200 uppercase italic">Root Neuron</span>
            </td>
            <td class="px-8 py-6 uppercase text-[10px] font-black">
              <span :class="{'text-emerald-500': node.status === 'completed', 'text-blue-500': node.status === 'in_progress'}" class="tracking-widest">● {{ node.status }}</span>
            </td>
            <td class="px-8 py-6 text-right">
              <button @click="openEdit(node)" class="text-[10px] font-black text-blue-600 hover:underline tracking-widest uppercase">Edit</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 3. 抽屉式弹窗 -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isEditModalOpen" class="fixed inset-0 z-100 flex justify-end overflow-hidden">
          <div class="absolute inset-0 bg-slate-950/20 backdrop-blur-sm" @click="closeEdit"></div>
          
          <div class="relative w-full max-w-lg bg-white shadow-2xl p-16 flex flex-col h-full will-change-transform">
            <div class="flex justify-between items-start mb-12">
              <h2 class="text-3xl font-black text-slate-900 uppercase tracking-tighter">Configure Node</h2>
              <button @click="closeEdit" class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all text-slate-300 hover:text-slate-900">✕</button>
            </div>
            
            <div class="space-y-10 flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <!-- Title -->
              <div class="flex flex-col gap-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identity Title</label>
                <input v-model="currentEditNode.title" class="admin-input" type="text" placeholder="e.g. Transformer Architecture" />
              </div>

              <!-- Description -->
              <div class="flex flex-col gap-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Strategic Description</label>
                <textarea v-model="currentEditNode.description" rows="4" class="admin-input py-4!" placeholder="Explain the core purpose of this node..."></textarea>
              </div>

              <!-- Type & Order -->
              <div class="grid grid-cols-2 gap-6">
                <div class="flex flex-col gap-3">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Category</label>
                  <select v-model="currentEditNode.node_type" class="admin-input admin-select">
                    <option value="theory">THEORY</option>
                    <option value="coding">CODING</option>
                  </select>
                </div>
                <div class="flex flex-col gap-3">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sort Priority</label>
                  <input v-model.number="currentEditNode.sort_order" type="number" class="admin-input" />
                </div>
              </div>

              <!-- Status -->
              <div class="flex flex-col gap-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Learning Status</label>
                <select v-model="currentEditNode.status" class="admin-input admin-select">
                  <option value="todo">TODO / QUEUED</option>
                  <option value="in_progress">ACTIVE / IN PROGRESS</option>
                  <option value="completed">MASTERED / COMPLETED</option>
                </select>
              </div>

              <!-- Dependency -->
              <div class="flex flex-col gap-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Parent Dependency</label>
                <select v-model="currentEditNode.parent_id" class="admin-input admin-select">
                  <option :value="null">ROOT LEVEL (NO PARENT)</option>
                  <option v-for="n in nodes.filter(n => n.id !== currentEditNode.id)" :key="n.id" :value="n.id">
                    {{ n.title }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Save Button -->
            <button @click="handleSave" class="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-slate-900 transition-all mt-10 shadow-2xl shadow-blue-500/20 active:scale-95">
              Sync Configuration
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

/* 💡 深度定制输入框：极致极简 */
.admin-input {
  @apply bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 
         focus:bg-white focus:ring-8 focus:ring-blue-500/5 outline-none transition-all placeholder:text-slate-200;
}

/* 💡 定制下拉列表：移除原生样式并增加自定义箭头 */
.admin-select {
  @apply appearance-none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19.5 8.25l-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1.5rem center;
  background-size: 1rem;
}

/* 过渡动画 */
.drawer-enter-active, .drawer-leave-active {
  transition: all 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-enter-active .absolute, .drawer-leave-active .absolute {
  transition: opacity 0.5s ease;
}
.drawer-enter-active .relative, .drawer-leave-active .relative {
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}
.drawer-enter-from .relative, .drawer-leave-to .relative {
  transform: translateX(100%);
}
.drawer-enter-from .absolute, .drawer-leave-to .absolute {
  opacity: 0;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-100 rounded-full;
}
</style>