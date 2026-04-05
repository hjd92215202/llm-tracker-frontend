<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MdCatalog, MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'
import { workspaceApi } from '@/api/workspace'
import { useLocaleStore } from '@/store/locale'
import type { RoadmapNode, WorkspaceSharedArtifact, WorkspaceSharedNoteDetail } from '@/types'

const route = useRoute()
const router = useRouter()
const localeStore = useLocaleStore()

const detail = ref<WorkspaceSharedNoteDetail | null>(null)
const roadmapNodes = ref<RoadmapNode[]>([])
const loading = ref(true)
const errorMessage = ref('')
const scrollElement = document.documentElement

const token = computed(() => String(route.params.token || ''))
const noteId = computed(() => Number(route.params.noteId))
const currentNodeQuery = computed(() => {
  const value = Number(route.query.nodeId)
  return Number.isFinite(value) && value > 0 ? value : null
})

const copy = computed(() =>
  localeStore.isChinese
    ? {
        back: '返回路线图',
        login: '登录',
        start: '立即使用',
        loading: '正在加载笔记内容...',
        loadError: '加载笔记内容失败',
        workspaceFallback: '公开分享',
        generalNode: '通用记录',
        nodeFallback: '节点',
        outline: '目录',
        readingTime: '分钟阅读',
        linkedArtifacts: '关联资料',
        untitledArtifact: '未命名资料',
        openResource: '打开链接',
        emptyArtifacts: '这条笔记还没有关联资料。',
        shareTag: '公开阅读',
        ctaTitle: '把目标、路线和笔记放到一张图里',
        ctaSummary: '公开分享时，别人先看主线，再进入节点内容，整个过程会更直观也更容易理解。',
      }
    : {
        back: 'Back to roadmap',
        login: 'Sign in',
        start: 'Start free',
        loading: 'Loading note content...',
        loadError: 'Unable to load note content',
        workspaceFallback: 'Shared roadmap',
        generalNode: 'General',
        nodeFallback: 'Node',
        outline: 'Outline',
        readingTime: 'min read',
        linkedArtifacts: 'Linked artifacts',
        untitledArtifact: 'Untitled artifact',
        openResource: 'Open resource',
        emptyArtifacts: 'No linked artifacts yet.',
        shareTag: 'Public reading',
        ctaTitle: 'Put goals, roadmap, and notes into one clear view',
        ctaSummary: 'People can follow the path first and then go deeper into the right content without losing context.',
      }
)

const note = computed(() => detail.value?.note ?? null)
const artifacts = computed<WorkspaceSharedArtifact[]>(() => detail.value?.artifacts ?? [])
const workspaceName = computed(() => detail.value?.workspace_name ?? copy.value.workspaceFallback)
const currentNodeTitle = computed(() => {
  if (!note.value?.node_id) return copy.value.generalNode
  return roadmapNodes.value.find((node) => node.id === note.value?.node_id)?.title ?? `${copy.value.nodeFallback} ${note.value.node_id}`
})
const readingTime = computed(() => {
  const words = note.value?.content.trim().split(/\s+/).filter(Boolean).length ?? 0
  return Math.max(1, Math.ceil(words / 220))
})

const fetchDetail = async () => {
  if (!Number.isFinite(noteId.value) || noteId.value <= 0) {
    errorMessage.value = copy.value.loadError
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const [detailData, roadmapData] = await Promise.all([
      workspaceApi.getSharedNoteDetail(token.value, noteId.value),
      workspaceApi.getSharedRoadmap(token.value),
    ])
    detail.value = detailData
    roadmapNodes.value = roadmapData.nodes
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push({
    path: `/share/${token.value}`,
    query: currentNodeQuery.value ? { nodeId: String(currentNodeQuery.value) } : {},
  })
}

onMounted(fetchDetail)
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fafaf8_0%,#f4f6f8_100%)]">
    <div class="sticky top-0 z-20 border-b border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.72)] backdrop-blur">
      <div class="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-6 py-4">
        <button class="product-button-secondary !px-5 !py-3" type="button" @click="goBack">{{ copy.back }}</button>
        <div class="flex flex-wrap gap-3">
          <button class="product-button-secondary !px-4 !py-2.5" type="button" @click="router.push('/login')">{{ copy.login }}</button>
          <button class="product-button-dark !px-4 !py-2.5" type="button" @click="router.push('/register')">{{ copy.start }}</button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="mx-auto max-w-5xl px-6 py-24 text-center text-sm font-semibold text-[var(--ink-soft)]">
      {{ copy.loading }}
    </div>

    <div v-else-if="errorMessage" class="mx-auto max-w-5xl px-6 py-24">
      <div class="product-error px-6 py-5 text-sm font-semibold">{{ errorMessage }}</div>
    </div>

    <div v-else-if="note" class="mx-auto max-w-[92rem] px-6 py-8">
      <section class="rounded-[2rem] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.8)] p-7 shadow-[0_18px_50px_rgba(20,33,43,0.05)] md:p-8">
        <div class="flex flex-wrap gap-2">
          <span class="admin-chip-dark">{{ copy.shareTag }}</span>
          <span class="admin-chip-warm">{{ currentNodeTitle }}</span>
          <span class="admin-chip">{{ workspaceName }}</span>
          <span class="admin-chip">{{ new Date(note.created_at).toLocaleDateString(localeStore.locale) }}</span>
          <span class="admin-chip">{{ readingTime }} {{ copy.readingTime }}</span>
        </div>

        <h1 class="product-title mt-5 text-4xl leading-[0.96] md:text-6xl">{{ note.title }}</h1>

        <p v-if="note.summary" class="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
          {{ note.summary }}
        </p>

        <div v-if="note.tags?.length" class="mt-6 flex flex-wrap gap-2">
          <span
            v-for="tag in note.tags"
            :key="tag"
            class="rounded-full border border-[rgba(15,23,42,0.08)] bg-[rgba(255,250,242,0.9)] px-3 py-1 text-[11px] font-black text-[var(--ink-main)]"
          >
            #{{ tag }}
          </span>
        </div>
      </section>

      <div class="mt-6 grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside class="shared-note-sidebar space-y-6">
          <section class="rounded-[1.8rem] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_14px_36px_rgba(20,33,43,0.04)]">
            <div class="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--brand)]">{{ copy.outline }}</div>
            <div class="mt-4 text-sm text-[var(--ink-main)]">
              <MdCatalog :editorId="'shared-note-preview'" :scrollElement="scrollElement" />
            </div>
          </section>

          <section class="rounded-[1.8rem] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.82)] p-5 shadow-[0_14px_36px_rgba(20,33,43,0.04)]">
            <div class="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--brand)]">{{ copy.linkedArtifacts }}</div>

            <div v-if="artifacts.length > 0" class="mt-4 space-y-3">
              <a
                v-for="artifact in artifacts"
                :key="artifact.id"
                :href="artifact.content_url"
                target="_blank"
                rel="noreferrer"
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

        <div class="space-y-6">
          <article class="rounded-[2rem] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.84)] px-8 py-10 shadow-[0_18px_50px_rgba(20,33,43,0.05)]">
            <MdPreview :modelValue="note.content" :editorId="'shared-note-preview'" theme="light" class="bg-transparent! no-padding-preview" />
          </article>

          <section class="overflow-hidden rounded-[2rem] bg-[var(--surface-dark)] px-7 py-7 text-white shadow-[0_24px_60px_rgba(20,33,43,0.16)]">
            <div class="max-w-3xl">
              <div class="text-sm font-semibold text-[rgba(255,255,255,0.56)]">{{ workspaceName }}</div>
              <h2 class="mt-3 font-[var(--font-display)] text-3xl font-black tracking-[-0.05em]">{{ copy.ctaTitle }}</h2>
              <p class="mt-4 text-sm leading-8 text-[rgba(255,255,255,0.68)]">{{ copy.ctaSummary }}</p>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <button class="product-button-secondary" type="button" @click="router.push('/login')">{{ copy.login }}</button>
              <button class="product-button-primary" type="button" @click="router.push('/register')">{{ copy.start }}</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.artifact-card {
  @apply block rounded-[1.4rem] border border-[rgba(15,23,42,0.08)] bg-[rgba(247,247,245,0.82)] px-4 py-4 transition-all;
}

.artifact-card:hover {
  box-shadow: 0 14px 30px rgba(20, 33, 43, 0.06);
  transform: translateY(-1px);
}

:deep(.md-editor-preview) {
  padding-top: 0 !important;
  width: 100% !important;
  max-width: none !important;
  font-family: var(--font-sans);
  font-size: 1rem;
  line-height: 1.95;
  color: var(--ink-main);
}

:deep(.md-editor-preview-wrapper) {
  width: 100% !important;
  max-width: none !important;
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

@media (min-width: 1280px) {
  .shared-note-sidebar {
    position: sticky;
    top: 94px;
    align-self: start;
  }
}
</style>
