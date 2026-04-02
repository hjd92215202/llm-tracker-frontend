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
const scrollElement = document.documentElement

const copy = computed(() =>
  localeStore.isChinese
    ? {
        back: '返回笔记',
        edit: '编辑笔记',
        loading: '正在加载笔记详情...',
        loadError: '加载笔记详情失败',
        workspaceFallback: '当前空间',
        generalNode: '通用记录',
        nodeFallback: '节点',
        outline: '内容目录',
        readingTime: '分钟阅读',
        linkedArtifacts: '关联资料',
        untitledArtifact: '未命名资料',
        openResource: '打开链接',
        emptyArtifacts: '这条笔记还没有关联资料。',
      }
    : {
        back: 'Back to notes',
        edit: 'Edit note',
        loading: 'Loading note detail...',
        loadError: 'Unable to load note detail',
        workspaceFallback: 'Workspace',
        generalNode: 'General',
        nodeFallback: 'Node',
        outline: 'Outline',
        readingTime: 'min read',
        linkedArtifacts: 'Linked artifacts',
        untitledArtifact: 'Untitled artifact',
        openResource: 'Open resource',
        emptyArtifacts: 'No linked artifacts yet.',
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

const editNote = () => {
  if (note.value && canEdit.value) {
    router.push(`/admin/note/edit/${note.value.id}`)
  }
}
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#faf7f0_0%,#f4f1eb_100%)]">
    <div class="border-b border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.84)] backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
        <button class="product-button-secondary !px-5 !py-3" type="button" @click="goBack">{{ copy.back }}</button>

        <div class="hidden items-center gap-3 lg:flex">
          <span class="pill">{{ currentWorkspaceName }}</span>
          <span class="pill pill-brand">{{ currentNodeTitle }}</span>
          <button v-if="canEdit" class="product-button-primary !px-5 !py-3" type="button" @click="editNote">
            {{ copy.edit }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mx-auto max-w-5xl px-6 py-24 text-center text-sm font-semibold text-[var(--ink-soft)] lg:px-10">
      {{ copy.loading }}
    </div>

    <div v-else-if="errorMessage" class="mx-auto max-w-5xl px-6 py-24 lg:px-10">
      <div class="product-error px-6 py-5 text-sm font-semibold">{{ errorMessage }}</div>
    </div>

    <div v-else-if="note" class="mx-auto max-w-7xl px-6 py-8 lg:px-10">
      <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main class="min-w-0">
          <section class="rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] p-8 shadow-[0_18px_50px_rgba(20,33,43,0.05)]">
            <div class="flex flex-wrap items-center gap-3">
              <span class="pill pill-brand">{{ currentNodeTitle }}</span>
              <span class="pill">{{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}</span>
              <span class="pill">{{ readingTime }} {{ copy.readingTime }}</span>
            </div>

            <h1 class="product-title mt-6 text-4xl leading-[0.96] md:text-6xl">{{ note.title }}</h1>

            <div v-if="note.tags?.length" class="mt-6 flex flex-wrap gap-2">
              <span
                v-for="tag in note.tags"
                :key="tag"
                class="rounded-full border border-[rgba(20,33,43,0.08)] bg-[rgba(255,250,242,0.9)] px-3 py-1 text-[11px] font-black text-[var(--ink-main)]"
              >
                #{{ tag }}
              </span>
            </div>
          </section>

          <article class="note-body mt-6 rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.76)] px-8 py-10 shadow-[0_18px_50px_rgba(20,33,43,0.05)]">
            <MdPreview :modelValue="note.content" :editorId="'note-preview'" theme="light" class="bg-transparent! no-padding-preview" />
          </article>
        </main>

        <aside class="space-y-6">
          <section class="rounded-[1.8rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.84)] p-5 shadow-[0_14px_36px_rgba(20,33,43,0.04)]">
            <div class="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--brand)]">{{ copy.outline }}</div>
            <div class="mt-4 text-sm text-[var(--ink-main)]">
              <MdCatalog :editorId="'note-preview'" :scrollElement="scrollElement" />
            </div>
          </section>

          <section class="rounded-[1.8rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.84)] p-5 shadow-[0_14px_36px_rgba(20,33,43,0.04)]">
            <div class="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--brand)]">{{ copy.linkedArtifacts }}</div>

            <div v-if="artifacts.length > 0" class="mt-4 space-y-3">
              <a
                v-for="artifact in artifacts"
                :key="artifact.id"
                :href="artifact.content_url"
                target="_blank"
                class="artifact-card"
              >
                <div class="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">{{ artifact.artifact_type }}</div>
                <div class="mt-2 text-sm font-black leading-6 text-[var(--ink-strong)]">
                  {{ artifact.title || copy.untitledArtifact }}
                </div>
                <div class="mt-2 break-all text-sm leading-6 text-[var(--ink-soft)]">{{ artifact.content_url }}</div>
                <div class="mt-3 text-[11px] font-black text-[var(--brand)]">{{ copy.openResource }}</div>
              </a>
            </div>

            <div v-else class="mt-4 text-sm font-semibold leading-7 text-[var(--ink-soft)]">
              {{ copy.emptyArtifacts }}
            </div>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ink-main)];
}

.pill-brand {
  @apply bg-[rgba(216,110,59,0.12)] text-[var(--brand)];
}

.artifact-card {
  @apply block rounded-[1.4rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,255,255,0.72)] px-4 py-4 transition-all;
}

.artifact-card:hover {
  box-shadow: 0 14px 30px rgba(20, 33, 43, 0.06);
  transform: translateY(-1px);
}

:deep(.md-editor-preview) {
  padding-top: 0 !important;
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.95;
  color: var(--ink-main);
}

:deep(.md-editor-preview h1),
:deep(.md-editor-preview h2),
:deep(.md-editor-preview h3) {
  @apply mt-12 mb-5 font-[var(--font-display)] font-black tracking-tight text-[var(--ink-strong)];
}

:deep(.md-editor-preview pre) {
  @apply my-10 overflow-x-auto rounded-[1.4rem] border border-[rgba(20,33,43,0.12)] bg-[var(--ink-strong)] p-6;
}

:deep(.md-editor-preview code:not(pre code)) {
  @apply rounded bg-[rgba(20,33,43,0.06)] px-2 py-0.5 font-mono text-[0.9em] text-[var(--ink-strong)];
  font-family: var(--font-mono);
}

:deep(.katex-display) {
  @apply my-8 overflow-x-auto rounded-[1.4rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,250,242,0.8)] p-6;
}

:deep(.md-editor-catalog-active > .md-editor-catalog-link) {
  color: var(--brand) !important;
}

:deep(.md-editor-catalog-link span) {
  transition: all 0.2s ease;
}

:deep(.md-editor-catalog-active > .md-editor-catalog-link span) {
  border-left: 2px solid var(--brand);
  padding-left: 14px;
}
</style>
