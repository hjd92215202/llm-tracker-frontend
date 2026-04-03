<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { workspaceApi } from '@/api/workspace'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceSearchResponse } from '@/types'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const query = ref('')
const loading = ref(false)
const errorMessage = ref('')
const results = ref<WorkspaceSearchResponse | null>(null)

let timer: ReturnType<typeof setTimeout> | null = null

const copy = computed(() =>
  localeStore.isChinese
    ? {
        title: '快速搜索',
        subtitle: '搜索节点和笔记，直接跳到你要看的内容',
        placeholder: '输入节点标题、笔记标题、方法或结论',
        helper: '按 Esc 关闭',
        loading: '正在搜索...',
        empty: '输入关键词开始搜索',
        noResults: '没有找到匹配内容',
        roadmap: '路线图',
        notes: '笔记',
        openRoadmap: '打开路线图',
        openNote: '打开笔记',
        noSummary: '还没有摘要',
        searchError: '搜索失败，请稍后重试',
      }
    : {
        title: 'Quick search',
        subtitle: 'Search nodes and notes, then jump straight into the right place',
        placeholder: 'Search nodes, note titles, methods, or findings',
        helper: 'Press Esc to close',
        loading: 'Searching...',
        empty: 'Start typing to search',
        noResults: 'No matching results',
        roadmap: 'Roadmap',
        notes: 'Notes',
        openRoadmap: 'Open roadmap',
        openNote: 'Open note',
        noSummary: 'No summary yet',
        searchError: 'Unable to search right now',
      }
)

const hasQuery = computed(() => query.value.trim().length > 0)

const runSearch = async () => {
  const trimmed = query.value.trim()

  if (!props.open || !authStore.activeWorkspaceId || !trimmed) {
    results.value = null
    errorMessage.value = ''
    loading.value = false
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    results.value = await workspaceApi.searchWorkspace(authStore.activeWorkspaceId, trimmed)
  } catch (error: any) {
    results.value = null
    errorMessage.value = error.message || copy.value.searchError
  } finally {
    loading.value = false
  }
}

const scheduleSearch = () => {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    runSearch()
  }, 180)
}

const close = () => {
  query.value = ''
  results.value = null
  errorMessage.value = ''
  emit('close')
}

const openRoadmap = (title?: string) => {
  emit('close')
  router.push({ name: 'admin-roadmap', query: title ? { search: title } : {} })
}

const openNote = (id: number) => {
  emit('close')
  router.push(`/note/${id}`)
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    close()
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => {
        document.getElementById('workspace-command-input')?.focus()
      }, 40)
      runSearch()
      return
    }

    document.body.style.overflow = 'auto'
  }
)

watch(query, () => {
  scheduleSearch()
})

watch(
  () => authStore.activeWorkspaceId,
  () => {
    if (props.open && hasQuery.value) {
      scheduleSearch()
    }
  }
)

window.addEventListener('keydown', handleKeydown)

onBeforeUnmount(() => {
  document.body.style.overflow = 'auto'
  window.removeEventListener('keydown', handleKeydown)
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="open" class="fixed inset-0 z-[140] flex items-start justify-center px-4 pt-[10vh] md:px-6">
        <div class="absolute inset-0 bg-[rgba(15,23,42,0.28)] backdrop-blur-sm" @click="close"></div>

        <section class="palette-panel relative w-full max-w-3xl overflow-hidden">
          <header class="border-b border-[rgba(15,23,42,0.08)] px-5 py-4 md:px-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm font-bold text-[var(--ink-strong)]">{{ copy.title }}</div>
                <div class="mt-1 text-sm text-[var(--ink-soft)]">{{ copy.subtitle }}</div>
              </div>
              <div class="rounded-full bg-[rgba(15,23,42,0.06)] px-3 py-1 text-xs font-semibold text-[var(--ink-soft)]">
                {{ copy.helper }}
              </div>
            </div>

            <input
              id="workspace-command-input"
              v-model="query"
              type="text"
              class="admin-input mt-4 !rounded-[18px] !px-4 !py-3.5 !text-base"
              :placeholder="copy.placeholder"
            />
          </header>

          <div class="max-h-[65vh] overflow-y-auto px-5 py-5 md:px-6">
            <div v-if="errorMessage" class="product-error px-4 py-3 text-sm font-semibold">
              {{ errorMessage }}
            </div>

            <div v-else-if="loading" class="admin-empty !p-8">
              {{ copy.loading }}
            </div>

            <div v-else-if="!hasQuery" class="admin-empty !p-8">
              {{ copy.empty }}
            </div>

            <div v-else-if="results && results.total_results === 0" class="admin-empty !p-8">
              {{ copy.noResults }}
            </div>

            <div v-else-if="results" class="grid gap-5 xl:grid-cols-2">
              <section class="space-y-3">
                <div class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  {{ copy.roadmap }}
                </div>
                <button
                  v-for="item in results.roadmap_results.slice(0, 6)"
                  :key="`roadmap-${item.id}`"
                  type="button"
                  class="admin-list-card block w-full text-left"
                  @click="openRoadmap(item.title)"
                >
                  <div class="text-base font-semibold text-[var(--ink-strong)]">{{ item.title }}</div>
                  <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description || item.title }}</p>
                  <div class="mt-3 text-sm font-semibold text-[var(--ink-main)]">{{ copy.openRoadmap }}</div>
                </button>
              </section>

              <section class="space-y-3">
                <div class="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-soft)]">
                  {{ copy.notes }}
                </div>
                <button
                  v-for="item in results.note_results.slice(0, 6)"
                  :key="`note-${item.id}`"
                  type="button"
                  class="admin-list-card block w-full text-left"
                  @click="openNote(item.id)"
                >
                  <div class="text-base font-semibold text-[var(--ink-strong)]">{{ item.title }}</div>
                  <p class="mt-2 text-sm leading-7 text-[var(--ink-soft)]">{{ item.summary || copy.noSummary }}</p>
                  <div class="mt-3 text-sm font-semibold text-[var(--ink-main)]">{{ copy.openNote }}</div>
                </button>
              </section>
            </div>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.palette-panel {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 32px 90px rgba(15, 23, 42, 0.16);
}

.palette-enter-active,
.palette-leave-active {
  transition: opacity 180ms ease;
}

.palette-enter-active .palette-panel,
.palette-leave-active .palette-panel {
  transition: transform 180ms ease;
}

.palette-enter-from,
.palette-leave-to {
  opacity: 0;
}

.palette-enter-from .palette-panel,
.palette-leave-to .palette-panel {
  transform: translateY(-8px) scale(0.98);
}
</style>
