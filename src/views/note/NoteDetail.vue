<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MdCatalog, MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { noteApi } from '@/api/note'
import { roadmapApi } from '@/api/roadmap'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { Artifact, Note, RoadmapNode } from '@/types'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const note = ref<Note | null>(null)
const artifacts = ref<Artifact[]>([])
const roadmapNodes = ref<RoadmapNode[]>([])
const loading = ref(true)
const errorMessage = ref('')
const isCatalogOpen = ref(false)
const scrollElement = document.documentElement

const copy = computed(() =>
  localeStore.isChinese
    ? {
        back: '返回 Notes',
        edit: '编辑 Note',
        loading: '正在加载 note detail...',
        loadError: '无法加载 note 详情',
        workspaceFallback: 'Workspace',
        generalNode: 'General',
        nodeFallback: '节点',
        hideIndex: '收起目录',
        showIndex: '目录',
        contentIndex: '内容目录',
        readingTime: '分钟阅读',
        linkedArtifacts: 'Linked artifacts',
        untitledArtifact: '未命名资源',
        openResource: '打开资源',
      }
    : {
        back: 'Back to notes',
        edit: 'Edit note',
        loading: 'Loading note detail...',
        loadError: 'Unable to load note detail',
        workspaceFallback: 'Workspace',
        generalNode: 'General',
        nodeFallback: 'Node',
        hideIndex: 'Hide',
        showIndex: 'Index',
        contentIndex: 'Content index',
        readingTime: 'min read',
        linkedArtifacts: 'Linked artifacts',
        untitledArtifact: 'Untitled artifact',
        openResource: 'Open resource',
      }
)

const currentNodeTitle = computed(() => {
  if (!note.value?.node_id) {
    return copy.value.generalNode
  }

  return roadmapNodes.value.find((node) => node.id === note.value?.node_id)?.title ?? `${copy.value.nodeFallback} ${note.value.node_id}`
})

const currentWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name ?? copy.value.workspaceFallback)
const canEdit = computed(() => authStore.hasWriteAccess)
const readingTime = computed(() => {
  const words = note.value?.content.trim().split(/\s+/).filter(Boolean).length ?? 0
  return Math.max(1, Math.ceil(words / 220))
})

const fetchDetail = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const id = Number(route.params.id)
    const [noteData, nodesData] = await Promise.all([noteApi.getDetail(id), roadmapApi.getNodes()])
    note.value = noteData.note
    artifacts.value = noteData.artifacts
    roadmapNodes.value = nodesData
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)

const goBack = () => router.push('/admin/notes')
const toggleCatalog = () => {
  isCatalogOpen.value = !isCatalogOpen.value
}
const editNote = () => {
  if (note.value && canEdit.value) {
    router.push(`/admin/note/edit/${note.value.id}`)
  }
}
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#ffffff_22%)]">
    <nav class="sticky top-0 z-50 border-b border-slate-100 bg-white/88 px-6 py-4 backdrop-blur-xl lg:px-10">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <button
          @click="goBack"
          class="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 transition-all hover:border-slate-300 hover:text-slate-950"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200">&lt;</span>
          {{ copy.back }}
        </button>

        <div class="hidden items-center gap-3 lg:flex">
          <span class="rounded-full bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
            {{ currentWorkspaceName }}
          </span>
          <span class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
            {{ currentNodeTitle }}
          </span>
          <button
            v-if="canEdit"
            @click="editNote"
            class="rounded-2xl bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:bg-blue-600"
          >
            {{ copy.edit }}
          </button>
        </div>
      </div>
    </nav>

    <div v-if="loading" class="px-6 py-24 text-center text-sm font-semibold text-slate-400">
      {{ copy.loading }}
    </div>

    <div v-else-if="errorMessage" class="mx-auto max-w-4xl px-6 py-24 lg:px-10">
      <div class="rounded-[2rem] border border-red-100 bg-red-50 px-6 py-5 text-sm font-semibold text-red-600">
        {{ errorMessage }}
      </div>
    </div>

    <div v-else-if="note" class="mx-auto flex max-w-7xl gap-0 px-0 lg:px-8">
      <aside
        :class="[isCatalogOpen ? 'w-80' : 'w-16']"
        class="sticky top-[73px] hidden h-[calc(100vh-73px)] shrink-0 border-r border-slate-100 bg-white/82 transition-all duration-300 lg:flex"
      >
        <div class="flex h-full w-full flex-col">
          <button
            @click="toggleCatalog"
            class="flex h-16 items-center justify-center border-b border-slate-100 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            {{ isCatalogOpen ? copy.hideIndex : copy.showIndex }}
          </button>

          <div v-if="isCatalogOpen" class="flex-1 overflow-y-auto px-6 py-6">
            <div class="text-[11px] font-black uppercase tracking-[0.26em] text-slate-400">{{ copy.contentIndex }}</div>
            <MdCatalog :editorId="'note-preview'" :scrollElement="scrollElement" class="mt-5 text-sm font-semibold text-slate-600" />
          </div>
        </div>
      </aside>

      <main class="min-w-0 flex-1 px-6 py-10 lg:px-12">
        <header class="mx-auto max-w-4xl rounded-[2.2rem] border border-slate-100 bg-white p-8 shadow-[0_24px_90px_rgba(15,23,42,0.06)] lg:p-10">
          <div class="flex flex-wrap items-center gap-3">
            <span class="rounded-full bg-blue-50 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-600">
              {{ currentNodeTitle }}
            </span>
            <span class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              {{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}
            </span>
            <span class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              {{ readingTime }} {{ copy.readingTime }}
            </span>
          </div>

          <h1 class="mt-6 text-4xl font-black leading-tight tracking-[-0.06em] text-slate-950 lg:text-6xl">
            {{ note.title }}
          </h1>

          <div v-if="note.tags?.length" class="mt-6 flex flex-wrap gap-2">
            <span
              v-for="tag in note.tags"
              :key="tag"
              class="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-600"
            >
              #{{ tag }}
            </span>
          </div>
        </header>

        <article class="mx-auto mt-8 max-w-4xl rounded-[2.2rem] border border-slate-100 bg-white px-8 py-10 shadow-[0_24px_90px_rgba(15,23,42,0.05)] lg:px-12">
          <MdPreview
            :modelValue="note.content"
            :editorId="'note-preview'"
            theme="light"
            class="bg-transparent! no-padding-preview"
            :codeFoldable="true"
          />
        </article>

        <section
          v-if="artifacts.length > 0"
          class="mx-auto mt-8 max-w-4xl rounded-[2.2rem] border border-slate-100 bg-white px-8 py-10 shadow-[0_24px_90px_rgba(15,23,42,0.05)] lg:px-12"
        >
          <div class="flex items-center gap-4">
            <h2 class="text-2xl font-black tracking-[-0.04em] text-slate-950">{{ copy.linkedArtifacts }}</h2>
            <div class="h-px flex-1 bg-slate-100"></div>
          </div>

          <div class="mt-8 grid gap-5 md:grid-cols-2">
            <a
              v-for="artifact in artifacts"
              :key="artifact.id"
              :href="artifact.content_url"
              target="_blank"
              class="group rounded-[1.8rem] border border-slate-100 bg-slate-50/70 p-6 transition-all hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:shadow-[0_22px_70px_rgba(37,99,235,0.12)]"
            >
              <div class="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">{{ artifact.artifact_type }}</div>
              <div class="mt-3 text-xl font-black tracking-tight text-slate-900 group-hover:text-blue-600">
                {{ artifact.title || copy.untitledArtifact }}
              </div>
              <div class="mt-4 break-all text-sm font-semibold text-slate-500">{{ artifact.content_url }}</div>
              <div class="mt-6 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 group-hover:text-slate-900">
                {{ copy.openResource }}
              </div>
            </a>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

:deep(.md-editor-preview) {
  padding-top: 0 !important;
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 1.08rem;
  line-height: 1.95;
  color: #1e293b;
}

:deep(.md-editor-preview h1),
:deep(.md-editor-preview h2),
:deep(.md-editor-preview h3) {
  @apply mt-16 mb-6 font-black tracking-tight text-slate-950;
}

:deep(.md-editor-preview pre) {
  @apply my-12 rounded-[1.8rem] border border-slate-800 bg-slate-950 p-8 shadow-2xl;
}

:deep(.md-editor-preview code:not(pre code)) {
  @apply mx-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[0.9em] text-slate-900;
}

:deep(.katex-display) {
  @apply my-10 overflow-x-auto rounded-[1.8rem] border border-slate-100 bg-slate-50 p-8;
}

:deep(.md-editor-catalog-active > .md-editor-catalog-link) {
  @apply text-blue-600 !important;
}

:deep(.md-editor-catalog-link span) {
  @apply transition-all duration-300;
}

:deep(.md-editor-catalog-active > .md-editor-catalog-link span) {
  @apply -ml-0.5 border-l-2 border-blue-600 pl-4;
}
</style>
