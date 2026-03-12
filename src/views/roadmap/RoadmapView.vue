<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { roadmapApi } from '@/api/roadmap'
import { noteApi } from '@/api/note'
import type { RoadmapNode, Note } from '@/types'
import { useRouter } from 'vue-router'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

const router = useRouter()
const { addNodes, addEdges, onNodeClick, setViewport, dimensions } = useVueFlow()

const loading = ref(true)
const selectedNode = ref<RoadmapNode | null>(null)
const notes = ref<Note[]>([])
const loadingNotes = ref(false)
const notesSectionRef = ref<HTMLElement | null>(null)

const showBackToTop = ref(false)

const handleScroll = () => {
  const scrollPos = window.scrollY || window.pageYOffset || document.documentElement.scrollTop
  showBackToTop.value = scrollPos > 400
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const transformData = (nodes: RoadmapNode[]) => {
  const minOrder = Math.min(...nodes.map(n => n.sort_order))
  const flowNodes = nodes.map((node) => ({
    id: node.id.toString(),
    label: node.title,
    data: { ...node },
    position: { 
      x: node.node_type === 'theory' ? -300 : 300, 
      y: (node.sort_order - minOrder) * 250 
    },
    class: `custom-node ${node.status}`,
  }))
  const flowEdges = nodes.filter(n => n.parent_id).map((node) => ({
    id: `e${node.parent_id}-${node.id}`,
    source: node.parent_id!.toString(),
    target: node.id.toString(),
    animated: nodes.find(n => n.id === node.id)?.status === 'in_progress',
    type: 'smoothstep',
    style: { stroke: '#cbd5e1', strokeWidth: 3 },
  }))
  return { flowNodes, flowEdges }
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  try {
    const data = await roadmapApi.getNodes()
    const { flowNodes, flowEdges } = transformData(data)
    addNodes(flowNodes)
    addEdges(flowEdges)
    await nextTick()
    setTimeout(() => {
      const containerWidth = dimensions.value.width || window.innerWidth
      setViewport({ x: containerWidth / 2, y: 80, zoom: 1.1 }, { duration: 0 })
      loading.value = false
    }, 400)
  } catch (err) {
    loading.value = false
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

onNodeClick(async ({ node }) => {
  selectedNode.value = node.data as RoadmapNode
  loadingNotes.value = true
  try {
    const data = await noteApi.getNotesByNode(Number(node.id))
    notes.value = data
    await nextTick()
    if (notesSectionRef.value) {
      setTimeout(() => {
        notesSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  } catch (err) {
    notes.value = []
  } finally {
    loadingNotes.value = false
  }
})

const viewNoteDetail = (id: number) => router.push(`/note/${id}`)
</script>

<template>
  <!-- 💡 增加 hide-scrollbar 类名 -->
  <div 
    :class="[selectedNode ? 'min-h-screen overflow-y-auto' : 'h-screen overflow-hidden']" 
    class="w-full bg-white relative hide-scrollbar"
  >
    
    <div class="relative h-screen w-full bg-slate-50/10">
      <div v-if="loading" class="absolute inset-0 z-50 flex items-center justify-center bg-white">
         <div class="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
      <VueFlow class="bg-transparent">
        <Background pattern-color="#e2e8f0" :gap="40" variant="dots" />
        <Controls />
      </VueFlow>
      <div class="absolute bottom-8 w-full flex justify-center pointer-events-none text-center">
        <div class="flex flex-col items-center gap-3">
          <span class="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Interactive Research Roadmap</span>
          <div v-if="!selectedNode" class="w-px h-8 bg-linear-to-b from-slate-200 to-transparent animate-bounce"></div>
        </div>
      </div>
    </div>

    <section v-if="selectedNode" ref="notesSectionRef" class="min-h-screen bg-white transition-opacity duration-1000">
      <div class="max-w-7xl mx-auto py-32 px-12">
        <div class="border-l-4 border-blue-600 pl-8 mb-20">
          <h2 class="text-5xl font-black text-slate-900 tracking-tight leading-tight">{{ selectedNode.title }}</h2>
          <p class="text-xl text-slate-400 mt-4 font-medium italic max-w-2xl">{{ selectedNode.description }}</p>
        </div>

        <div v-if="loadingNotes" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div v-for="i in 3" :key="i" class="h-80 bg-slate-50 animate-pulse rounded-4xl"></div>
        </div>

        <div v-else-if="notes.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          <div v-for="note in notes" :key="note.id" @click="viewNoteDetail(note.id)"
            class="group bg-slate-50/50 p-10 rounded-4xl border border-transparent hover:bg-white hover:border-blue-200 hover:shadow-[0_40px_80px_rgba(59,130,246,0.08)] transition-all duration-500 cursor-pointer">
            <div class="flex justify-between items-start mb-10">
              <time class="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{{ new Date(note.created_at).toLocaleDateString() }}</time>
              <span class="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
            </div>
            <h3 class="text-2xl font-black text-slate-800 group-hover:text-blue-600 transition-colors leading-snug">{{ note.title }}</h3>
            <p class="text-slate-500 mt-4 text-sm line-clamp-2 leading-relaxed">{{ note.summary || 'Exploring LLM architecture...' }}</p>
          </div>
        </div>

        <div v-else class="text-center py-40 rounded-[3rem] border-2 border-dashed border-slate-100">
          <p class="text-slate-300 text-2xl font-bold italic">No records here yet.</p>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="fade">
        <button 
          v-if="showBackToTop" 
          @click="scrollToTop"
          class="fixed bottom-12 right-12 z-9999 w-16 h-16 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-full flex items-center justify-center border border-slate-100 hover:bg-blue-600 group transition-all duration-300 active:scale-90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7 7 7M12 3v18" />
          </svg>
        </button>
      </Transition>
    </Teleport>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

/* 💡 针对当前容器隐藏滚动条 */
.hide-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

/* 节点样式保持不变 */
.custom-node {
  @apply rounded-2xl border-[3px] px-12 py-8 font-black transition-all text-lg min-w-80 text-center cursor-pointer bg-white text-slate-800 hover:scale-105;
}
.custom-node.completed {
  @apply border-emerald-500 text-emerald-700 bg-white shadow-[0_0_25px_-5px_rgba(16,185,129,0.4),0_10px_20px_-10px_rgba(16,185,129,0.3)];
}
.custom-node.in_progress {
  @apply border-blue-600 text-blue-700 bg-white shadow-[0_0_35px_-2px_rgba(37,99,235,0.45)];
  animation: hyper-glow 2.5s infinite ease-in-out;
}
.custom-node.todo {
  @apply border-slate-300 text-slate-400 bg-white shadow-[0_5px_15px_-5px_rgba(0,0,0,0.05)];
}
:deep(.vue-flow__node.selected) .custom-node {
  @apply border-blue-700 ring-15 ring-blue-500/10 z-50;
  box-shadow: 0 0 60px -5px rgba(37, 99, 235, 0.6);
}
@keyframes hyper-glow {
  0%, 100% { box-shadow: 0 0 30px -5px rgba(37, 99, 235, 0.4); transform: scale(1); }
  50% { box-shadow: 0 0 60px 5px rgba(37, 99, 235, 0.6); transform: scale(1.03); border-color: #2563eb; }
}
:deep(.vue-flow__edge-path) { stroke: #e2e8f0; stroke-width: 5; transition: all 0.3s; }
:deep(.vue-flow__edge.animated .vue-flow__edge-path) { stroke: #3b82f6; stroke-width: 6; filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.5)); }

.fade-enter-active, .fade-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.5);
}
</style>