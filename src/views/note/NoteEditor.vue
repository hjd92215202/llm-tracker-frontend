<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { roadmapApi } from '@/api/roadmap'
import { noteApi } from '@/api/note'
import type { RoadmapNode } from '@/types'

const router = useRouter()

// 表单数据
const form = ref({
  title: '',
  node_id: null as number | null,
  content: '',
  tags: ''
})

const nodes = ref<RoadmapNode[]>([])
const submitting = ref(false)

onMounted(async () => {
  try {
    nodes.value = await roadmapApi.getNodes()
  } catch (err) {
    console.error('加载节点失败:', err)
  }
})

const handleSave = async () => {
  if (!form.value.title || !form.value.node_id) {
    alert('请填写标题并选择归属节点')
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...form.value,
      tags: form.value.tags.split(',').map(t => t.trim()).filter(t => t)
    }
    await noteApi.createNote(payload)
    router.push('/admin/roadmap') 
  } catch (err) {
    console.error('保存失败:', err)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-white">
    <!-- 顶部操作栏 -->
    <header class="h-20 border-b border-slate-100 px-12 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
      <div class="flex items-center gap-6 flex-1">
        <button @click="router.back()" class="text-slate-400 hover:text-slate-900 transition-all font-black text-xs uppercase tracking-widest">
          Cancel
        </button>
        <div class="h-6 w-px bg-slate-200"></div>
        <input 
          v-model="form.title"
          type="text" 
          placeholder="ENTER NOTE TITLE..."
          class="flex-1 bg-transparent text-2xl font-black text-slate-900 focus:outline-none placeholder:text-slate-200"
        />
      </div>

      <div class="flex items-center gap-4">
        <select 
          v-model="form.node_id"
          class="bg-slate-50 border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none"
        >
          <option :value="null">SELECT NODE</option>
          <option v-for="node in nodes" :key="node.id" :value="node.id">
            {{ node.title }}
          </option>
        </select>
        <button 
          @click="handleSave"
          :disabled="submitting"
          class="bg-blue-600 text-white px-8 py-2 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
        >
          {{ submitting ? 'Publishing...' : 'Publish' }}
        </button>
      </div>
    </header>

    <!-- 编辑器主体 -->
    <main class="h-[calc(100vh-5rem)]">
      <div class="max-w-400 mx-auto h-full px-4 py-4">
        <div class="flex flex-col h-full gap-4">
          <!-- 标签输入 -->
          <div class="px-8 py-4 bg-slate-50 rounded-2xl flex items-center gap-4 border border-slate-100">
            <span class="text-[10px] font-black text-blue-600 uppercase tracking-widest">Tags</span>
            <input 
              v-model="form.tags"
              type="text" 
              placeholder="Transformer, NLP, PyTorch (Use comma to separate)"
              class="flex-1 bg-transparent text-sm font-medium text-slate-600 focus:outline-none"
            />
          </div>

          <!-- 编辑器组件 -->
          <div class="flex-1 overflow-hidden rounded-4xl border border-slate-100 shadow-sm">
            <MdEditor 
              v-model="form.content" 
              language="en-US"
              :toolbarsExclude="['github']"
              theme="light"
              placeholder="Start your deep learning journey here..."
              class="h-full border-none!"
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@reference "@/style.css";

:deep(.md-editor) {
  --md-bk-color: transparent;
}

:deep(.md-editor-content) {
  font-family: 'Inter', system-ui, sans-serif;
}

/* 隐藏预览区域多余的边距，让全屏感更强 */
:deep(.md-editor-preview-wrapper) {
  padding: 40px !important;
}
</style>