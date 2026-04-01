<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { roadmapApi } from '@/api/roadmap'
import { noteApi } from '@/api/note'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { Artifact, RoadmapNode, WorkspaceRole } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const loading = ref(false)
const submitting = ref(false)
const artifactSubmitting = ref(false)
const nodes = ref<RoadmapNode[]>([])
const artifacts = ref<Artifact[]>([])
const errorMessage = ref('')
const form = ref({ title: '', node_id: null as number | null, content: '', tags: '' })
const artifactForm = ref({
  title: '',
  artifact_type: 'code',
  content_url: '',
})

const noteId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEditMode = computed(() => Boolean(noteId.value))
const hasWriteAccess = computed(() => authStore.hasWriteAccess)
const currentWorkspace = computed(() => authStore.activeWorkspace)
const currentRole = computed<WorkspaceRole>(() => (authStore.activeRole ?? 'viewer') as WorkspaceRole)
const currentNode = computed(() => nodes.value.find((node) => node.id === form.value.node_id) ?? null)
const noteWordCount = computed(() =>
  form.value.content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        eyebrow: 'Research editor',
        editTitle: '更新一条 workspace note',
        createTitle: '创建新的 research note',
        summaryPrefix: '把',
        summarySuffix: '的研究结论、上下文和交付资产收进同一个编辑台。',
        metrics: {
          role: 'Workspace role',
          words: 'Word count',
          artifacts: 'Artifacts',
        },
        noNode: '尚未选择 roadmap 节点',
        editingEnabled: '编辑已开启',
        readOnly: '只读访问',
        readonlyHint: '你当前可以查看这条 note，但不能创建、编辑或附加交付资产。',
        loadError: '无法加载 note editor',
        titleRequired: '需要填写 note 标题',
        nodeRequired: '请先把这条 note 关联到一个 roadmap 节点',
        saveError: '无法保存 note',
        attachValidation: 'Artifact 标题和 URL 不能为空',
        attachError: '无法附加 artifact',
        removeConfirmPrefix: '确定要把 “',
        removeConfirmSuffix: '” 从这条 note 中移除吗？',
        removeError: '无法移除 artifact',
        loading: '正在加载 note workspace...',
        tagsLabel: 'Tags',
        tagsPlaceholder: 'evaluation, rag, onboarding',
        nodeLabel: 'Linked roadmap node',
        chooseNode: '选择一个 roadmap 节点',
        back: '返回 Notes',
        saving: '保存中...',
        saveChanges: '保存修改',
        createNote: '创建 Note',
        editorPlaceholder: '记录上下文、决策、实验、结论和下一步动作...',
        artifactsEyebrow: 'Artifacts',
        artifactsTitle: '附加交付结果',
        artifactsSummary: '关联 demo、仓库、评测表、模型快照或文档，让知识和产出一起沉淀。',
        remove: '移除',
        noArtifacts: '还没有附加任何 artifacts。',
        artifactTitle: 'Artifact 标题',
        artifactType: 'Artifact 类型',
        artifactUrl: 'Artifact URL',
        artifactTitlePlaceholder: 'Production demo, GitHub repo, benchmark',
        attachArtifact: '附加 Artifact',
        attaching: '附加中...',
        saveFirst: '先保存 Note 再附加 Artifact',
      }
    : {
        eyebrow: 'Research editor',
        editTitle: 'Update a workspace note',
        createTitle: 'Create a new research note',
        summaryPrefix: 'Structure research for',
        summarySuffix: 'and keep context, decisions, and delivery assets in one editor.',
        metrics: {
          role: 'Workspace role',
          words: 'Word count',
          artifacts: 'Artifacts',
        },
        noNode: 'No roadmap node selected',
        editingEnabled: 'Editing enabled',
        readOnly: 'Read-only access',
        readonlyHint: 'Your current workspace role can review this note, but cannot create, edit, or attach delivery assets.',
        loadError: 'Unable to load the note editor',
        titleRequired: 'A note title is required',
        nodeRequired: 'Please link this note to a roadmap node',
        saveError: 'Unable to save note',
        attachValidation: 'Artifact title and URL are required',
        attachError: 'Unable to attach artifact',
        removeConfirmPrefix: 'Remove "',
        removeConfirmSuffix: '" from this note?',
        removeError: 'Unable to remove artifact',
        loading: 'Loading note workspace...',
        tagsLabel: 'Tags',
        tagsPlaceholder: 'evaluation, rag, onboarding',
        nodeLabel: 'Linked roadmap node',
        chooseNode: 'Choose a roadmap node',
        back: 'Back to notes',
        saving: 'Saving...',
        saveChanges: 'Save changes',
        createNote: 'Create note',
        editorPlaceholder: 'Document context, decisions, experiments, learnings, and next actions...',
        artifactsEyebrow: 'Artifacts',
        artifactsTitle: 'Attach delivery outputs',
        artifactsSummary: 'Link demos, repositories, benchmark sheets, model snapshots, or docs that prove the work happened.',
        remove: 'Remove',
        noArtifacts: 'No artifacts attached yet.',
        artifactTitle: 'Artifact title',
        artifactType: 'Artifact type',
        artifactUrl: 'Artifact URL',
        artifactTitlePlaceholder: 'Production demo, GitHub repo, benchmark',
        attachArtifact: 'Attach artifact',
        attaching: 'Attaching...',
        saveFirst: 'Save note first to attach artifacts',
      }
)

const roleLabelMap = computed<Record<WorkspaceRole, string>>(() => ({
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}))

const editorLocale = computed(() => (localeStore.isChinese ? 'zh-CN' : 'en-US'))

const resetArtifactForm = () => {
  artifactForm.value = {
    title: '',
    artifact_type: 'code',
    content_url: '',
  }
}

const loadEditorData = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    nodes.value = await roadmapApi.getNodes()

    if (isEditMode.value && noteId.value) {
      const data = await noteApi.getDetail(noteId.value)
      form.value = {
        title: data.note.title,
        node_id: data.note.node_id,
        content: data.note.content,
        tags: (data.note.tags ?? []).join(', '),
      }
      artifacts.value = data.artifacts
    } else {
      artifacts.value = []
      form.value = { title: '', node_id: nodes.value[0]?.id ?? null, content: '', tags: '' }
    }
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

watch(
  () => authStore.activeWorkspaceId,
  () => {
    loadEditorData()
  },
  { immediate: true }
)

const refreshArtifacts = async () => {
  if (!noteId.value) {
    artifacts.value = []
    return
  }

  const data = await noteApi.getDetail(noteId.value)
  artifacts.value = data.artifacts
}

const handleSave = async () => {
  if (!hasWriteAccess.value) {
    return
  }

  if (!form.value.title.trim()) {
    errorMessage.value = copy.value.titleRequired
    return
  }

  if (!form.value.node_id) {
    errorMessage.value = copy.value.nodeRequired
    return
  }

  submitting.value = true
  errorMessage.value = ''

  try {
    const payload = {
      title: form.value.title.trim(),
      node_id: form.value.node_id,
      content: form.value.content,
      tags: form.value.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }

    if (isEditMode.value && noteId.value) {
      await noteApi.updateNote(noteId.value, payload)
    } else {
      const note = await noteApi.createNote(payload)
      router.push(`/admin/note/edit/${note.id}`)
      return
    }

    router.push('/admin/notes')
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.saveError
  } finally {
    submitting.value = false
  }
}

const addArtifact = async () => {
  if (!hasWriteAccess.value || !noteId.value) {
    return
  }

  if (!artifactForm.value.title.trim() || !artifactForm.value.content_url.trim()) {
    errorMessage.value = copy.value.attachValidation
    return
  }

  artifactSubmitting.value = true
  errorMessage.value = ''

  try {
    await noteApi.addArtifact({
      note_id: noteId.value,
      title: artifactForm.value.title.trim(),
      artifact_type: artifactForm.value.artifact_type,
      content_url: artifactForm.value.content_url.trim(),
    })
    resetArtifactForm()
    await refreshArtifacts()
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.attachError
  } finally {
    artifactSubmitting.value = false
  }
}

const deleteArtifact = async (artifact: Artifact) => {
  if (!hasWriteAccess.value) {
    return
  }

  const confirmed = window.confirm(`${copy.value.removeConfirmPrefix}${artifact.title}${copy.value.removeConfirmSuffix}`)
  if (!confirmed) {
    return
  }

  errorMessage.value = ''

  try {
    await noteApi.deleteArtifact(artifact.id)
    await refreshArtifacts()
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.removeError
  }
}

const cancelEditing = () => {
  router.push('/admin/notes')
}
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_28%)]">
    <div class="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
      <div class="overflow-hidden rounded-[2.25rem] border border-slate-100 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.07)]">
        <div
          class="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-8 py-7"
        >
          <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-3xl">
              <div class="text-[11px] font-black uppercase tracking-[0.32em] text-blue-600">{{ copy.eyebrow }}</div>
              <h1 class="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950">
                {{ isEditMode ? copy.editTitle : copy.createTitle }}
              </h1>
              <p class="mt-4 text-base leading-8 text-slate-500">
                {{ copy.summaryPrefix }}
                <span class="font-black text-slate-800">{{ currentWorkspace?.workspace_name }}</span>
                {{ copy.summarySuffix }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
              <div class="metric-card">
                <div class="metric-label">{{ copy.metrics.role }}</div>
                <div class="metric-value">{{ roleLabelMap[currentRole] }}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">{{ copy.metrics.words }}</div>
                <div class="metric-value">{{ noteWordCount }}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">{{ copy.metrics.artifacts }}</div>
                <div class="metric-value">{{ artifacts.length }}</div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <span class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              {{ currentNode ? currentNode.title : copy.noNode }}
            </span>
            <span
              :class="hasWriteAccess ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
              class="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em]"
            >
              {{ hasWriteAccess ? copy.editingEnabled : copy.readOnly }}
            </span>
          </div>
        </div>

        <div v-if="errorMessage" class="border-b border-red-100 bg-red-50 px-8 py-4 text-sm font-semibold text-red-600">
          {{ errorMessage }}
        </div>

        <div
          v-if="!hasWriteAccess"
          class="border-b border-amber-100 bg-amber-50 px-8 py-4 text-sm font-semibold text-amber-700"
        >
          {{ copy.readonlyHint }}
        </div>

        <div v-if="loading" class="px-8 py-20 text-center text-sm font-semibold text-slate-400">
          {{ copy.loading }}
        </div>

        <div v-else class="grid min-h-[calc(100vh-14rem)] xl:grid-cols-[minmax(0,1fr)_360px]">
          <main class="border-r border-slate-100">
            <div class="border-b border-slate-100 px-8 py-6">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div class="flex-1">
                  <input
                    v-model="form.title"
                    :disabled="!hasWriteAccess"
                    type="text"
                    :placeholder="copy.titleRequired"
                    class="title-input w-full"
                  />
                  <div class="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                    <div class="space-y-2">
                      <label class="field-label">{{ copy.tagsLabel }}</label>
                      <input
                        v-model="form.tags"
                        :disabled="!hasWriteAccess"
                        type="text"
                        class="field-input"
                        :placeholder="copy.tagsPlaceholder"
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="field-label">{{ copy.nodeLabel }}</label>
                      <select v-model="form.node_id" :disabled="!hasWriteAccess" class="field-input">
                        <option :value="null">{{ copy.chooseNode }}</option>
                        <option v-for="node in nodes" :key="node.id" :value="node.id">
                          {{ node.title }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button @click="cancelEditing" class="secondary-button">{{ copy.back }}</button>
                  <button @click="handleSave" :disabled="!hasWriteAccess || submitting" class="primary-button">
                    {{ submitting ? copy.saving : isEditMode ? copy.saveChanges : copy.createNote }}
                  </button>
                </div>
              </div>
            </div>

            <div class="h-[calc(100vh-22rem)] min-h-[40rem] overflow-hidden bg-slate-50/50 p-6">
              <div class="h-full overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
                <MdEditor
                  v-model="form.content"
                  :language="editorLocale"
                  theme="light"
                  :preview="true"
                  :toolbarsExclude="!hasWriteAccess ? ['save'] : []"
                  :readOnly="!hasWriteAccess"
                  :placeholder="copy.editorPlaceholder"
                  class="h-full border-none!"
                />
              </div>
            </div>
          </main>

          <aside class="flex flex-col bg-slate-50/70">
            <div class="border-b border-slate-100 px-6 py-6">
              <div class="text-[11px] font-black uppercase tracking-[0.32em] text-blue-600">{{ copy.artifactsEyebrow }}</div>
              <h2 class="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">{{ copy.artifactsTitle }}</h2>
              <p class="mt-3 text-sm leading-7 text-slate-500">
                {{ copy.artifactsSummary }}
              </p>
            </div>

            <div class="flex-1 overflow-y-auto px-6 py-6">
              <div class="space-y-4">
                <article
                  v-for="artifact in artifacts"
                  :key="artifact.id"
                  class="rounded-[1.6rem] border border-slate-100 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <div class="text-[10px] font-black uppercase tracking-[0.24em] text-blue-600">
                        {{ artifact.artifact_type }}
                      </div>
                      <div class="mt-2 text-base font-black tracking-tight text-slate-900">{{ artifact.title }}</div>
                    </div>
                    <button
                      v-if="hasWriteAccess"
                      @click="deleteArtifact(artifact)"
                      class="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 transition-all hover:text-red-700"
                    >
                      {{ copy.remove }}
                    </button>
                  </div>
                  <a
                    :href="artifact.content_url"
                    target="_blank"
                    class="mt-4 block break-all text-sm font-semibold text-slate-500 underline decoration-slate-200 underline-offset-4 hover:text-blue-600"
                  >
                    {{ artifact.content_url }}
                  </a>
                </article>

                <div
                  v-if="artifacts.length === 0"
                  class="rounded-[1.6rem] border border-dashed border-slate-200 bg-white/80 px-5 py-8 text-center text-sm font-semibold text-slate-400"
                >
                  {{ copy.noArtifacts }}
                </div>
              </div>
            </div>

            <div v-if="hasWriteAccess" class="border-t border-slate-100 bg-white px-6 py-6">
              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="field-label">{{ copy.artifactTitle }}</label>
                  <input
                    v-model="artifactForm.title"
                    :disabled="!noteId"
                    type="text"
                    class="field-input"
                    :placeholder="copy.artifactTitlePlaceholder"
                  />
                </div>
                <div class="space-y-2">
                  <label class="field-label">{{ copy.artifactType }}</label>
                  <select v-model="artifactForm.artifact_type" :disabled="!noteId" class="field-input">
                    <option value="code">Code</option>
                    <option value="model">Model</option>
                    <option value="demo">Demo</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="field-label">{{ copy.artifactUrl }}</label>
                  <input v-model="artifactForm.content_url" :disabled="!noteId" type="text" class="field-input" placeholder="https://..." />
                </div>
                <button
                  @click="addArtifact"
                  :disabled="!noteId || artifactSubmitting"
                  class="primary-button w-full"
                >
                  {{ artifactSubmitting ? copy.attaching : noteId ? copy.attachArtifact : copy.saveFirst }}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.metric-card {
  @apply rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)];
}

.metric-label {
  @apply text-[10px] font-black uppercase tracking-[0.22em] text-slate-400;
}

.metric-value {
  @apply mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950;
}

.field-label {
  @apply text-[11px] font-black uppercase tracking-[0.24em] text-slate-400;
}

.title-input {
  @apply bg-transparent text-4xl font-black tracking-[-0.05em] text-slate-950 outline-none placeholder:text-slate-300;
}

.field-input {
  @apply w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition-all;
}

.field-input:focus {
  @apply border-blue-600;
  box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.08);
}

.primary-button {
  @apply rounded-2xl bg-blue-600 px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-white shadow-[0_18px_50px_rgba(37,99,235,0.22)] transition-all hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60;
}

.secondary-button {
  @apply rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[0.26em] text-slate-500 transition-all hover:bg-slate-50;
}
</style>
