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
const presetNodeId = computed(() => {
  const value = Number(route.query.nodeId)
  return Number.isFinite(value) && value > 0 ? value : null
})
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
        editTitle: '编辑笔记',
        createTitle: '新建笔记',
        summaryPrefix: '把',
        summarySuffix: '空间里的方法、结论和过程整理成一条清晰记录。',
        metrics: {
          role: '当前角色',
          words: '字数',
          artifacts: '资料数',
        },
        noNode: '尚未选择节点',
        editingEnabled: '可编辑',
        readOnly: '只读',
        readonlyHint: '你当前可以查看内容，但不能创建、编辑或追加资料。',
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
        nodeLabel: '关联节点',
        chooseNode: '选择一个节点',
        back: '返回笔记',
        saving: '保存中...',
        saveChanges: '保存修改',
        createNote: '创建笔记',
        editorPlaceholder: '记录背景、判断、实验、结论和下一步动作...',
        artifactsEyebrow: '关联资料',
        artifactsTitle: '把演示、仓库和文档挂到这条笔记下面',
        artifactsSummary: '让结论和实际产出放在一起，后面回看更完整。',
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
          viewer: '只读',
        },
      }
    : {
        eyebrow: 'Note editor',
        editTitle: 'Edit note',
        createTitle: 'Create note',
        summaryPrefix: 'Turn the work inside',
        summarySuffix: 'into one clear note.',
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
        nodeLabel: 'Linked node',
        chooseNode: 'Choose a node',
        back: 'Back to notes',
        saving: 'Saving...',
        saveChanges: 'Save changes',
        createNote: 'Create note',
        editorPlaceholder: 'Document background, decisions, experiments, findings, and next actions...',
        artifactsEyebrow: 'Artifacts',
        artifactsTitle: 'Attach demos, repos, and docs to this note',
        artifactsSummary: 'Keep the note and the actual output together.',
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
      const defaultNodeId =
        presetNodeId.value && nodes.value.some((node) => node.id === presetNodeId.value)
          ? presetNodeId.value
          : nodes.value[0]?.id ?? null

      form.value = { title: '', node_id: defaultNodeId, content: '', tags: '' }
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
  if (!hasWriteAccess.value) return

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
  if (!hasWriteAccess.value || !noteId.value) return

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
  if (!hasWriteAccess.value) return

  const confirmed = window.confirm(`${copy.value.removeConfirmPrefix}${artifact.title}${copy.value.removeConfirmSuffix}`)
  if (!confirmed) return

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
  <div class="min-h-screen bg-[linear-gradient(180deg,#fafaf8_0%,#f4f6f8_100%)]">
    <div class="mx-auto max-w-7xl px-6 py-8">
      <section class="rounded-[2rem] border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.82)] p-8 shadow-[0_18px_50px_rgba(20,33,43,0.05)]">
        <div class="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div class="max-w-3xl">
            <div class="admin-kicker">{{ copy.eyebrow }}</div>
            <h1 class="admin-headline mt-3">{{ isEditMode ? copy.editTitle : copy.createTitle }}</h1>
            <p class="admin-subtitle mt-5">
              {{ copy.summaryPrefix }}
              <span class="font-semibold text-[var(--ink-strong)]">{{ currentWorkspace?.workspace_name }}</span>
              {{ copy.summarySuffix }}
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3 xl:min-w-[24rem]">
            <article class="admin-kpi-card">
              <div class="admin-kpi-label">{{ copy.metrics.role }}</div>
              <div class="admin-kpi-value !text-[2rem]">{{ copy.roleLabels[currentRole] }}</div>
            </article>
            <article class="admin-kpi-card">
              <div class="admin-kpi-label">{{ copy.metrics.words }}</div>
              <div class="admin-kpi-value !text-[2rem]">{{ noteWordCount }}</div>
            </article>
            <article class="admin-kpi-card">
              <div class="admin-kpi-label">{{ copy.metrics.artifacts }}</div>
              <div class="admin-kpi-value !text-[2rem]">{{ artifacts.length }}</div>
            </article>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap items-center gap-3">
          <span class="admin-chip">{{ currentNode ? currentNode.title : copy.noNode }}</span>
          <span :class="hasWriteAccess ? 'admin-chip-dark' : 'admin-chip'">
            {{ hasWriteAccess ? copy.editingEnabled : copy.readOnly }}
          </span>
        </div>
      </section>

      <div v-if="errorMessage" class="product-error mt-5 px-5 py-4 text-sm font-semibold">
        {{ errorMessage }}
      </div>

      <div v-if="!hasWriteAccess" class="mt-5 rounded-[18px] bg-[rgba(229,106,43,0.08)] px-5 py-4 text-sm font-semibold text-[var(--brand-deep)]">
        {{ copy.readonlyHint }}
      </div>

      <div v-if="loading" class="admin-empty mt-6">
        {{ copy.loading }}
      </div>

      <div v-else class="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main class="space-y-6">
          <section class="admin-card p-6">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div class="min-w-0 flex-1">
                <input
                  v-model="form.title"
                  :disabled="!hasWriteAccess"
                  type="text"
                  :placeholder="copy.titleRequired"
                  class="title-input w-full"
                />
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <button class="product-button-secondary" type="button" @click="cancelEditing">{{ copy.back }}</button>
                <button class="product-button-dark" :disabled="!hasWriteAccess || submitting" type="button" @click="handleSave">
                  {{ submitting ? copy.saving : isEditMode ? copy.saveChanges : copy.createNote }}
                </button>
              </div>
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
              <div class="space-y-2">
                <label class="product-label">{{ copy.tagsLabel }}</label>
                <input v-model="form.tags" :disabled="!hasWriteAccess" type="text" class="admin-input" :placeholder="copy.tagsPlaceholder" />
              </div>
              <div class="space-y-2">
                <label class="product-label">{{ copy.nodeLabel }}</label>
                <select v-model="form.node_id" :disabled="!hasWriteAccess" class="admin-select">
                  <option :value="null">{{ copy.chooseNode }}</option>
                  <option v-for="node in nodes" :key="node.id" :value="node.id">{{ node.title }}</option>
                </select>
              </div>
            </div>
          </section>

          <section class="admin-card overflow-hidden p-0">
            <div class="h-[calc(100vh-22rem)] min-h-[36rem] overflow-hidden">
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
          </section>
        </main>

        <aside class="space-y-6">
          <section class="admin-card p-6">
            <div class="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--brand)]">{{ copy.artifactsEyebrow }}</div>
            <h2 class="mt-3 text-2xl font-black tracking-[-0.04em] text-[var(--ink-strong)]">{{ copy.artifactsTitle }}</h2>
            <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ copy.artifactsSummary }}</p>

            <div class="mt-5 space-y-4">
              <article
                v-for="artifact in artifacts"
                :key="artifact.id"
                class="rounded-[1.4rem] border border-[rgba(15,23,42,0.08)] bg-[rgba(247,247,245,0.86)] p-4"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <div class="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--accent)]">
                      {{ copy.artifactTypes[artifact.artifact_type as keyof typeof copy.artifactTypes] || artifact.artifact_type }}
                    </div>
                    <div class="mt-2 text-base font-semibold tracking-[-0.02em] text-[var(--ink-strong)]">{{ artifact.title }}</div>
                  </div>
                  <button v-if="hasWriteAccess" class="text-[11px] font-bold text-[var(--danger)]" type="button" @click="deleteArtifact(artifact)">
                    {{ copy.remove }}
                  </button>
                </div>
                <a
                  :href="artifact.content_url"
                  target="_blank"
                  class="mt-4 block break-all text-sm leading-7 text-[var(--ink-soft)] underline decoration-[rgba(15,23,42,0.16)] underline-offset-4 hover:text-[var(--brand)]"
                >
                  {{ artifact.content_url }}
                </a>
              </article>

              <div v-if="artifacts.length === 0" class="admin-empty !p-8">
                {{ copy.noArtifacts }}
              </div>
            </div>
          </section>

          <section v-if="hasWriteAccess" class="admin-card p-6">
            <div class="space-y-4">
              <div class="space-y-2">
                <label class="product-label">{{ copy.artifactTitle }}</label>
                <input
                  v-model="artifactForm.title"
                  :disabled="!noteId"
                  type="text"
                  class="admin-input"
                  :placeholder="copy.artifactTitlePlaceholder"
                />
              </div>
              <div class="space-y-2">
                <label class="product-label">{{ copy.artifactType }}</label>
                <select v-model="artifactForm.artifact_type" :disabled="!noteId" class="admin-select">
                  <option v-for="item in artifactTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="product-label">{{ copy.artifactUrl }}</label>
                <input v-model="artifactForm.content_url" :disabled="!noteId" type="text" class="admin-input" placeholder="https://..." />
              </div>
              <button class="product-button-dark w-full" :disabled="!noteId || artifactSubmitting" type="button" @click="addArtifact">
                {{ artifactSubmitting ? copy.attaching : noteId ? copy.attachArtifact : copy.saveFirst }}
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
@reference "@/style.css";

.title-input {
  @apply bg-transparent text-4xl font-[var(--font-display)] font-black tracking-[-0.05em] text-[var(--ink-strong)] outline-none placeholder:text-[rgba(15,23,42,0.28)];
}
</style>
