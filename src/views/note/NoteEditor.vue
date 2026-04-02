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
        eyebrow: '笔记编辑',
        editTitle: '更新团队笔记',
        createTitle: '创建团队笔记',
        summaryPrefix: '把',
        summarySuffix: '中的研究过程、关键决策和交付内容整理成一条清晰记录。',
        metrics: {
          role: '当前角色',
          words: '字数',
          artifacts: '资料数',
        },
        noNode: '尚未选择节点',
        editingEnabled: '可编辑',
        readOnly: '只读',
        readonlyHint: '你当前可以查看这条笔记，但不能创建、编辑或附加资料。',
        loadError: '加载笔记编辑页失败',
        titleRequired: '请填写笔记标题',
        nodeRequired: '请先把这条笔记关联到一个路线图节点',
        saveError: '保存笔记失败',
        attachValidation: '资料标题和链接不能为空',
        attachError: '添加资料失败',
        removeConfirmPrefix: '确认移除“',
        removeConfirmSuffix: '”吗？',
        removeError: '移除资料失败',
        loading: '正在加载编辑内容...',
        tagsLabel: '标签',
        tagsPlaceholder: '评估, 检索增强, 入职',
        nodeLabel: '关联路线图节点',
        chooseNode: '选择一个节点',
        back: '返回笔记列表',
        saving: '保存中...',
        saveChanges: '保存修改',
        createNote: '创建笔记',
        editorPlaceholder: '记录背景、决策、实验、结论和下一步动作...',
        artifactsEyebrow: '关联资料',
        artifactsTitle: '把演示、仓库和文档挂到这条笔记下',
        artifactsSummary: '关联演示、代码仓库、评测表、模型快照或文档，让结论和交付结果放在一起。',
        remove: '移除',
        noArtifacts: '还没有关联资料。',
        artifactTitle: '资料标题',
        artifactType: '资料类型',
        artifactUrl: '资料链接',
        artifactTitlePlaceholder: '例如：线上演示、代码仓库、评测表',
        attachArtifact: '添加资料',
        attaching: '添加中...',
        saveFirst: '请先保存笔记',
        artifactTypes: {
          code: '代码',
          model: '模型',
          demo: '演示',
          image: '图片',
        },
        roleLabels: {
          owner: '所有者',
          admin: '管理员',
          member: '成员',
          viewer: '访客',
        },
      }
    : {
        eyebrow: 'Note editor',
        editTitle: 'Update team note',
        createTitle: 'Create team note',
        summaryPrefix: 'Capture the research, decisions, and delivery context in',
        summarySuffix: 'as one clear record.',
        metrics: {
          role: 'Role',
          words: 'Words',
          artifacts: 'Artifacts',
        },
        noNode: 'No node selected',
        editingEnabled: 'Editable',
        readOnly: 'Read only',
        readonlyHint: 'You can review this note, but cannot create, edit, or attach resources with the current role.',
        loadError: 'Unable to load the note editor',
        titleRequired: 'A note title is required',
        nodeRequired: 'Please link this note to a roadmap node',
        saveError: 'Unable to save note',
        attachValidation: 'Artifact title and URL are required',
        attachError: 'Unable to attach artifact',
        removeConfirmPrefix: 'Remove "',
        removeConfirmSuffix: '"?',
        removeError: 'Unable to remove artifact',
        loading: 'Loading editor...',
        tagsLabel: 'Tags',
        tagsPlaceholder: 'evaluation, rag, onboarding',
        nodeLabel: 'Linked roadmap node',
        chooseNode: 'Choose a node',
        back: 'Back to notes',
        saving: 'Saving...',
        saveChanges: 'Save changes',
        createNote: 'Create note',
        editorPlaceholder: 'Document background, decisions, experiments, findings, and next actions...',
        artifactsEyebrow: 'Artifacts',
        artifactsTitle: 'Attach demos, repos, and docs to this note',
        artifactsSummary: 'Link the proof of work so the note and the output stay together.',
        remove: 'Remove',
        noArtifacts: 'No linked artifacts yet.',
        artifactTitle: 'Artifact title',
        artifactType: 'Artifact type',
        artifactUrl: 'Artifact URL',
        artifactTitlePlaceholder: 'For example: production demo, repo, benchmark',
        attachArtifact: 'Attach artifact',
        attaching: 'Attaching...',
        saveFirst: 'Save the note first',
        artifactTypes: {
          code: 'Code',
          model: 'Model',
          demo: 'Demo',
          image: 'Image',
        },
        roleLabels: {
          owner: 'Owner',
          admin: 'Admin',
          member: 'Member',
          viewer: 'Viewer',
        },
      }
)

const artifactTypeOptions = computed(() => [
  { value: 'code', label: copy.value.artifactTypes.code },
  { value: 'model', label: copy.value.artifactTypes.model },
  { value: 'demo', label: copy.value.artifactTypes.demo },
  { value: 'image', label: copy.value.artifactTypes.image },
])

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
  <div class="min-h-screen bg-[linear-gradient(180deg,#faf7f0_0%,#f4f1eb_100%)]">
    <div class="mx-auto max-w-[1500px] px-6 py-8 lg:px-10">
      <div class="rounded-[2rem] border border-[rgba(20,33,43,0.08)] bg-[rgba(255,251,245,0.84)] shadow-[0_24px_70px_rgba(20,33,43,0.05)]">
        <div class="border-b border-[rgba(20,33,43,0.08)] px-8 py-7">
          <div class="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div class="max-w-3xl">
              <div class="product-eyebrow border border-[rgba(216,110,59,0.14)] bg-white/80 text-[var(--brand)]">
                <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
                {{ copy.eyebrow }}
              </div>
              <h1 class="product-title mt-6 text-4xl leading-[0.96] md:text-5xl">
                {{ isEditMode ? copy.editTitle : copy.createTitle }}
              </h1>
              <p class="mt-4 text-base leading-8 text-[var(--ink-soft)]">
                {{ copy.summaryPrefix }}
                <span class="font-black text-[var(--ink-strong)]">{{ currentWorkspace?.workspace_name }}</span>
                {{ copy.summarySuffix }}
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3 xl:min-w-[24rem]">
              <article class="metric-card">
                <div class="metric-label">{{ copy.metrics.role }}</div>
                <div class="metric-value">{{ copy.roleLabels[currentRole] }}</div>
              </article>
              <article class="metric-card">
                <div class="metric-label">{{ copy.metrics.words }}</div>
                <div class="metric-value">{{ noteWordCount }}</div>
              </article>
              <article class="metric-card">
                <div class="metric-label">{{ copy.metrics.artifacts }}</div>
                <div class="metric-value">{{ artifacts.length }}</div>
              </article>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <span class="pill">{{ currentNode ? currentNode.title : copy.noNode }}</span>
            <span :class="hasWriteAccess ? 'pill pill-brand' : 'pill'" class="!uppercase">
              {{ hasWriteAccess ? copy.editingEnabled : copy.readOnly }}
            </span>
          </div>
        </div>

        <div v-if="errorMessage" class="border-b border-[rgba(187,45,59,0.12)] bg-[rgba(187,45,59,0.08)] px-8 py-4 text-sm font-semibold text-[var(--danger)]">
          {{ errorMessage }}
        </div>

        <div v-if="!hasWriteAccess" class="border-b border-[rgba(216,110,59,0.12)] bg-[rgba(216,110,59,0.08)] px-8 py-4 text-sm font-semibold text-[var(--brand-deep)]">
          {{ copy.readonlyHint }}
        </div>

        <div v-if="loading" class="px-8 py-20 text-center text-sm font-semibold text-[var(--ink-soft)]">
          {{ copy.loading }}
        </div>

        <div v-else class="grid min-h-[calc(100vh-14rem)] xl:grid-cols-[minmax(0,1fr)_330px]">
          <main class="border-r border-[rgba(20,33,43,0.08)]">
            <div class="border-b border-[rgba(20,33,43,0.08)] px-8 py-6">
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
                      <input v-model="form.tags" :disabled="!hasWriteAccess" type="text" class="product-input" :placeholder="copy.tagsPlaceholder" />
                    </div>
                    <div class="space-y-2">
                      <label class="field-label">{{ copy.nodeLabel }}</label>
                      <select v-model="form.node_id" :disabled="!hasWriteAccess" class="product-input">
                        <option :value="null">{{ copy.chooseNode }}</option>
                        <option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.title }}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button class="product-button-secondary" type="button" @click="cancelEditing">{{ copy.back }}</button>
                  <button class="product-button-primary" :disabled="!hasWriteAccess || submitting" type="button" @click="handleSave">
                    {{ submitting ? copy.saving : isEditMode ? copy.saveChanges : copy.createNote }}
                  </button>
                </div>
              </div>
            </div>

            <div class="h-[calc(100vh-22rem)] min-h-[36rem] overflow-hidden p-6">
              <div class="h-full overflow-hidden rounded-[1.6rem] border border-[rgba(20,33,43,0.08)] bg-white shadow-[0_14px_36px_rgba(20,33,43,0.04)]">
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

          <aside class="flex flex-col bg-[rgba(255,255,255,0.32)]">
            <div class="border-b border-[rgba(20,33,43,0.08)] px-6 py-6">
              <div class="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--brand)]">{{ copy.artifactsEyebrow }}</div>
              <h2 class="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--ink-strong)]">{{ copy.artifactsTitle }}</h2>
              <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ copy.artifactsSummary }}</p>
            </div>

            <div class="flex-1 overflow-y-auto px-6 py-6">
              <div class="space-y-4">
                <article
                  v-for="artifact in artifacts"
                  :key="artifact.id"
                  class="rounded-[1.4rem] border border-[rgba(20,33,43,0.08)] bg-white p-5 shadow-[0_10px_24px_rgba(20,33,43,0.04)]"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <div class="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">
                        {{ copy.artifactTypes[artifact.artifact_type as keyof typeof copy.artifactTypes] || artifact.artifact_type }}
                      </div>
                      <div class="mt-2 text-base font-black tracking-tight text-[var(--ink-strong)]">{{ artifact.title }}</div>
                    </div>
                    <button v-if="hasWriteAccess" class="text-[11px] font-black text-[var(--danger)]" type="button" @click="deleteArtifact(artifact)">
                      {{ copy.remove }}
                    </button>
                  </div>
                  <a
                    :href="artifact.content_url"
                    target="_blank"
                    class="mt-4 block break-all text-sm font-semibold text-[var(--ink-soft)] underline decoration-[rgba(20,33,43,0.16)] underline-offset-4 hover:text-[var(--brand)]"
                  >
                    {{ artifact.content_url }}
                  </a>
                </article>

                <div v-if="artifacts.length === 0" class="rounded-[1.4rem] border border-dashed border-[rgba(20,33,43,0.12)] bg-white/70 px-4 py-8 text-center text-sm font-semibold text-[var(--ink-soft)]">
                  {{ copy.noArtifacts }}
                </div>
              </div>
            </div>

            <div v-if="hasWriteAccess" class="border-t border-[rgba(20,33,43,0.08)] bg-white px-6 py-6">
              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="field-label">{{ copy.artifactTitle }}</label>
                  <input
                    v-model="artifactForm.title"
                    :disabled="!noteId"
                    type="text"
                    class="product-input"
                    :placeholder="copy.artifactTitlePlaceholder"
                  />
                </div>
                <div class="space-y-2">
                  <label class="field-label">{{ copy.artifactType }}</label>
                  <select v-model="artifactForm.artifact_type" :disabled="!noteId" class="product-input">
                    <option v-for="item in artifactTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="field-label">{{ copy.artifactUrl }}</label>
                  <input v-model="artifactForm.content_url" :disabled="!noteId" type="text" class="product-input" placeholder="https://..." />
                </div>
                <button class="product-button-primary w-full" :disabled="!noteId || artifactSubmitting" type="button" @click="addArtifact">
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
  @apply rounded-[1.4rem] border border-[rgba(20,33,43,0.08)] bg-white/80 px-4 py-4 shadow-[0_10px_24px_rgba(20,33,43,0.04)];
}

.metric-label {
  @apply text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ink-soft)];
}

.metric-value {
  @apply mt-3 font-[var(--font-display)] text-2xl font-black tracking-[-0.05em] text-[var(--ink-strong)];
}

.pill {
  @apply inline-flex rounded-full bg-[rgba(20,33,43,0.06)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--ink-main)];
}

.pill-brand {
  @apply bg-[rgba(216,110,59,0.12)] text-[var(--brand)];
}

.field-label {
  @apply text-[11px] font-black uppercase tracking-[0.24em] text-[var(--ink-soft)];
}

.title-input {
  @apply bg-transparent text-4xl font-[var(--font-display)] font-black tracking-[-0.05em] text-[var(--ink-strong)] outline-none placeholder:text-[rgba(20,33,43,0.28)];
}
</style>
