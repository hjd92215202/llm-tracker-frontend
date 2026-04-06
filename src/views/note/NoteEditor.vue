<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { roadmapApi } from '@/api/roadmap'
import { noteApi } from '@/api/note'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { Artifact, RoadmapNode, WorkspaceRole } from '@/types'
import { buildRoadmapTree, flattenRoadmapTree } from '@/utils/roadmapTree'

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
const savedMessage = ref('')
const draftAvailable = ref(false)
const restoringDraft = ref(false)
const localDraftSaved = ref(false)
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
const nodeOptions = computed(() =>
  flattenRoadmapTree(buildRoadmapTree(nodes.value)).map((item) => ({
    id: item.node.id,
    label: `${item.depth > 0 ? `${'  '.repeat(item.depth)}└ ` : ''}${item.node.title}`,
  })),
)
const draftStorageKey = computed(() => `note-draft:${authStore.activeWorkspaceId ?? 'global'}:${noteId.value ?? 'new'}`)
const formSnapshot = computed(() => JSON.stringify(form.value))
const savedSnapshot = ref('')
const noteWordCount = computed(() =>
  form.value.content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
)
const hasUnsavedChanges = computed(() => formSnapshot.value !== savedSnapshot.value)
let draftPersistTimer: number | null = null
let localDraftSavedTimer: number | null = null
let savedMessageTimer: number | null = null

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
const editorEnhancements = computed(() =>
  localeStore.isChinese
    ? {
        saved: '已保存，继续在这里写即可。',
        draftSaved: '本地草稿已恢复。',
        draftAvailable: '检测到一份未保存草稿。',
        restoreDraft: '恢复草稿',
        discardDraft: '丢弃草稿',
        templatesTitle: '常用模板',
        templatesSummary: '把背景、决策、结果和下一步快速插入正文。',
        contextTitle: '当前节点上下文',
        leaveConfirm: '这条笔记还有未保存内容，确定现在离开吗？',
      }
    : {
        saved: 'Saved. You can keep writing here.',
        draftSaved: 'Local draft restored.',
        draftAvailable: 'A local unsaved draft is available.',
        restoreDraft: 'Restore draft',
        discardDraft: 'Discard draft',
        templatesTitle: 'Common templates',
        templatesSummary: 'Insert background, decisions, results, and next steps quickly.',
        contextTitle: 'Current node context',
        leaveConfirm: 'This note has unsaved changes. Leave this page anyway?',
      },
)
const nodeDescriptionFallback = computed(() => (localeStore.isChinese ? '该节点还没有补充说明。' : 'No description yet.'))

const editorStatusCopy = computed(() =>
  localeStore.isChinese
    ? {
        localDraft: '本地草稿已保存',
        unsaved: '有未保存修改',
        synced: '当前内容已保存',
        shortcut: 'Ctrl/Cmd + S 保存',
      }
    : {
        localDraft: 'Local draft saved',
        unsaved: 'Unsaved changes',
        synced: 'All changes saved',
        shortcut: 'Ctrl/Cmd + S to save',
      },
)

const editorStatus = computed(() => {
  if (!hasWriteAccess.value) {
    return copy.value.readOnly
  }

  if (submitting.value) {
    return copy.value.saving
  }

  if (localDraftSaved.value && hasUnsavedChanges.value) {
    return editorStatusCopy.value.localDraft
  }

  if (hasUnsavedChanges.value) {
    return editorStatusCopy.value.unsaved
  }

  return editorStatusCopy.value.synced
})

const noteTemplates = computed(() =>
  localeStore.isChinese
    ? [
        { key: 'background', label: '背景', content: '\n## 背景\n- 当前背景\n- 关键约束\n' },
        { key: 'decision', label: '决策', content: '\n## 决策\n- 选择\n- 原因\n- 影响\n' },
        { key: 'result', label: '结果', content: '\n## 结果\n- 现状\n- 证据\n' },
        { key: 'next', label: '下一步', content: '\n## 下一步\n- [ ] 下一步动作\n' },
      ]
    : [
        { key: 'background', label: 'Background', content: '\n## Background\n- Context\n- Constraints\n' },
        { key: 'decision', label: 'Decision', content: '\n## Decision\n- Choice\n- Why it makes sense\n- Impact\n' },
        { key: 'result', label: 'Result', content: '\n## Result\n- Current outcome\n- Evidence\n' },
        { key: 'next', label: 'Next step', content: '\n## Next step\n- [ ] Follow-up action\n' },
      ],
)

const resetArtifactForm = () => {
  artifactForm.value = {
    title: '',
    artifact_type: 'code',
    content_url: '',
  }
}

const syncSavedSnapshot = () => {
  savedSnapshot.value = JSON.stringify(form.value)
}

const clearSavedMessage = () => {
  savedMessage.value = ''
  if (savedMessageTimer) {
    window.clearTimeout(savedMessageTimer)
    savedMessageTimer = null
  }
}

const flashSavedMessage = (message: string, duration = 2400) => {
  clearSavedMessage()
  savedMessage.value = message
  savedMessageTimer = window.setTimeout(() => {
    savedMessage.value = ''
    savedMessageTimer = null
  }, duration)
}

const markLocalDraftSaved = () => {
  localDraftSaved.value = true
  if (localDraftSavedTimer) {
    window.clearTimeout(localDraftSavedTimer)
  }

  localDraftSavedTimer = window.setTimeout(() => {
    localDraftSaved.value = false
    localDraftSavedTimer = null
  }, 1800)
}

const clearDraft = () => {
  localStorage.removeItem(draftStorageKey.value)
  draftAvailable.value = false
  localDraftSaved.value = false
}

const persistDraft = () => {
  if (!hasWriteAccess.value || !hasUnsavedChanges.value) {
    if (!hasUnsavedChanges.value) {
      clearDraft()
    }
    return
  }

  localStorage.setItem(
    draftStorageKey.value,
    JSON.stringify({
      form: form.value,
      updated_at: new Date().toISOString(),
    }),
  )
  markLocalDraftSaved()
}

const scheduleDraftPersist = () => {
  if (draftPersistTimer) {
    window.clearTimeout(draftPersistTimer)
  }

  draftPersistTimer = window.setTimeout(() => {
    persistDraft()
    draftPersistTimer = null
  }, 420)
}

const restoreDraft = () => {
  const raw = localStorage.getItem(draftStorageKey.value)
  if (!raw) return

  try {
    const parsed = JSON.parse(raw) as { form?: typeof form.value }
    if (parsed.form) {
      form.value = {
        title: parsed.form.title ?? '',
        node_id: parsed.form.node_id ?? null,
        content: parsed.form.content ?? '',
        tags: parsed.form.tags ?? '',
      }
      draftAvailable.value = false
      restoringDraft.value = true
      flashSavedMessage(editorEnhancements.value.draftSaved)
      window.setTimeout(() => {
        restoringDraft.value = false
      }, 0)
    }
  } catch {
    clearDraft()
  }
}

const detectDraft = () => {
  draftAvailable.value = Boolean(localStorage.getItem(draftStorageKey.value))
}

const insertTemplate = (content: string) => {
  const trimmed = form.value.content.trimEnd()
  form.value.content = `${trimmed}${content}${trimmed ? '\n' : ''}`
}

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
  if (!hasUnsavedChanges.value || !hasWriteAccess.value) return
  persistDraft()
  event.preventDefault()
  event.returnValue = ''
}

const loadEditorData = async () => {
  loading.value = true
  errorMessage.value = ''
  clearSavedMessage()
  restoringDraft.value = false
  localDraftSaved.value = false

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
    syncSavedSnapshot()
    detectDraft()
  } catch (error: any) {
    errorMessage.value = error.message || copy.value.loadError
  } finally {
    loading.value = false
  }
}

watch(
  [() => authStore.activeWorkspaceId, noteId],
  () => {
    loadEditorData()
  },
  { immediate: true }
)

watch(
  form,
  () => {
    if (!loading.value && !restoringDraft.value) {
      scheduleDraftPersist()
    }
  },
  { deep: true }
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
      flashSavedMessage(editorEnhancements.value.saved)
    } else {
      const note = await noteApi.createNote(payload)
      router.push(`/admin/note/edit/${note.id}`)
      return
    }
    syncSavedSnapshot()
    clearDraft()
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

const handleKeydown = (event: KeyboardEvent) => {
  if (!hasWriteAccess.value || loading.value) return

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    if (!submitting.value) {
      void handleSave()
    }
  }
}

onBeforeRouteLeave(() => {
  if (!hasUnsavedChanges.value || !hasWriteAccess.value) {
    return true
  }

  return window.confirm(editorEnhancements.value.leaveConfirm)
})

watch(
  () => draftStorageKey.value,
  () => {
    detectDraft()
  }
)

watch(
  presetNodeId,
  (value) => {
    if (isEditMode.value || !value) return
    if (nodes.value.some((node) => node.id === value)) {
      form.value.node_id = value
    }
  }
)

watch(
  () => hasUnsavedChanges.value,
  (value) => {
    if (!value) {
      clearDraft()
    }
  }
)

onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  if (draftPersistTimer) {
    window.clearTimeout(draftPersistTimer)
  }
  if (localDraftSavedTimer) {
    window.clearTimeout(localDraftSavedTimer)
  }
  clearSavedMessage()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('keydown', handleKeydown)
})
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

      <div v-if="savedMessage" class="mt-5 rounded-[18px] bg-[rgba(37,99,235,0.08)] px-5 py-4 text-sm font-semibold text-[var(--accent)]">
        {{ savedMessage }}
      </div>

      <div v-if="draftAvailable && hasWriteAccess" class="mt-5 flex flex-wrap items-center gap-3 rounded-[18px] bg-[rgba(15,23,42,0.06)] px-5 py-4 text-sm font-semibold text-[var(--ink-main)]">
        <span>{{ editorEnhancements.draftAvailable }}</span>
        <button class="text-[var(--brand)]" type="button" @click="restoreDraft">{{ editorEnhancements.restoreDraft }}</button>
        <button class="text-[var(--danger)]" type="button" @click="clearDraft">{{ editorEnhancements.discardDraft }}</button>
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
            <div class="flex flex-wrap items-center gap-3">
              <div class="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--brand)]">{{ editorEnhancements.contextTitle }}</div>
              <span class="admin-chip">{{ currentNode ? currentNode.title : copy.noNode }}</span>
            </div>
            <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              {{ currentNode?.description || nodeDescriptionFallback }}
            </p>
          </section>

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
                  <option v-for="node in nodeOptions" :key="node.id" :value="node.id">{{ node.label }}</option>
                </select>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[rgba(15,23,42,0.04)] px-4 py-3 text-sm font-semibold text-[var(--ink-main)]">
              <span>{{ editorStatus }}</span>
              <span class="text-[var(--ink-soft)]">{{ editorStatusCopy.shortcut }}</span>
            </div>
          </section>

          <section class="admin-card p-6">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div class="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--brand)]">{{ editorEnhancements.templatesTitle }}</div>
                <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ editorEnhancements.templatesSummary }}</p>
              </div>

              <div class="flex flex-wrap gap-2">
                <button
                  v-for="template in noteTemplates"
                  :key="template.key"
                  class="product-button-secondary !px-4 !py-2.5"
                  type="button"
                  :disabled="!hasWriteAccess"
                  @click="insertTemplate(template.content)"
                >
                  {{ template.label }}
                </button>
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
