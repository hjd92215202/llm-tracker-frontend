<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MdEditor } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { roadmapApi } from '@/api/roadmap'
import { noteApi } from '@/api/note'
import { useAuthStore } from '@/store/auth'
import type { Artifact, RoadmapNode } from '@/types'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

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
const currentRole = computed(() => authStore.activeRole ?? 'viewer')
const currentNode = computed(() => nodes.value.find((node) => node.id === form.value.node_id) ?? null)
const noteWordCount = computed(() =>
  form.value.content
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
)

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
    errorMessage.value = error.message || 'Unable to load the note editor'
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
    errorMessage.value = 'A note title is required'
    return
  }

  if (!form.value.node_id) {
    errorMessage.value = 'Please link this note to a roadmap node'
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
    errorMessage.value = error.message || 'Unable to save note'
  } finally {
    submitting.value = false
  }
}

const addArtifact = async () => {
  if (!hasWriteAccess.value || !noteId.value) {
    return
  }

  if (!artifactForm.value.title.trim() || !artifactForm.value.content_url.trim()) {
    errorMessage.value = 'Artifact title and URL are required'
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
    errorMessage.value = error.message || 'Unable to attach artifact'
  } finally {
    artifactSubmitting.value = false
  }
}

const deleteArtifact = async (artifact: Artifact) => {
  if (!hasWriteAccess.value) {
    return
  }

  const confirmed = window.confirm(`Remove "${artifact.title}" from this note?`)
  if (!confirmed) {
    return
  }

  errorMessage.value = ''

  try {
    await noteApi.deleteArtifact(artifact.id)
    await refreshArtifacts()
  } catch (error: any) {
    errorMessage.value = error.message || 'Unable to remove artifact'
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
        <div class="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_35%),linear-gradient(180deg,_#ffffff_0%,_#f8fbff_100%)] px-8 py-7">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div class="max-w-3xl">
              <div class="text-[11px] font-black uppercase tracking-[0.32em] text-blue-600">Research editor</div>
              <h1 class="mt-4 text-4xl font-black tracking-[-0.05em] text-slate-950">
                {{ isEditMode ? 'Update a workspace note' : 'Create a new research note' }}
              </h1>
              <p class="mt-4 text-base leading-8 text-slate-500">
                Structure research for <span class="font-black text-slate-800">{{ currentWorkspace?.workspace_name }}</span>,
                connect it to a roadmap node, and attach delivery artifacts in one place.
              </p>
            </div>

            <div class="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
              <div class="metric-card">
                <div class="metric-label">Workspace role</div>
                <div class="metric-value">{{ currentRole }}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Word count</div>
                <div class="metric-value">{{ noteWordCount }}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Artifacts</div>
                <div class="metric-value">{{ artifacts.length }}</div>
              </div>
            </div>
          </div>

          <div class="mt-6 flex flex-wrap items-center gap-3">
            <span class="rounded-full bg-slate-100 px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
              {{ currentNode ? currentNode.title : 'No roadmap node selected' }}
            </span>
            <span
              :class="hasWriteAccess ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'"
              class="rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em]"
            >
              {{ hasWriteAccess ? 'Editing enabled' : 'Read-only access' }}
            </span>
          </div>
        </div>

        <div v-if="errorMessage" class="border-b border-red-100 bg-red-50 px-8 py-4 text-sm font-semibold text-red-600">
          {{ errorMessage }}
        </div>

        <div v-if="!hasWriteAccess" class="border-b border-amber-100 bg-amber-50 px-8 py-4 text-sm font-semibold text-amber-700">
          Your current workspace role can view notes but cannot create or edit them.
        </div>

        <div v-if="loading" class="px-8 py-20 text-center text-sm font-semibold text-slate-400">
          Loading note workspace...
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
                    placeholder="Write a clear, searchable note title"
                    class="title-input w-full"
                  />
                  <div class="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
                    <div class="space-y-2">
                      <label class="field-label">Tags</label>
                      <input
                        v-model="form.tags"
                        :disabled="!hasWriteAccess"
                        type="text"
                        class="field-input"
                        placeholder="evaluation, rag, onboarding"
                      />
                    </div>
                    <div class="space-y-2">
                      <label class="field-label">Linked roadmap node</label>
                      <select v-model="form.node_id" :disabled="!hasWriteAccess" class="field-input">
                        <option :value="null">Choose a roadmap node</option>
                        <option v-for="node in nodes" :key="node.id" :value="node.id">
                          {{ node.title }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                  <button @click="cancelEditing" class="secondary-button">Back to notes</button>
                  <button @click="handleSave" :disabled="!hasWriteAccess || submitting" class="primary-button">
                    {{ submitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Create note' }}
                  </button>
                </div>
              </div>
            </div>

            <div class="h-[calc(100vh-22rem)] min-h-[40rem] overflow-hidden bg-slate-50/50 p-6">
              <div class="h-full overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
                <MdEditor
                  v-model="form.content"
                  language="en-US"
                  theme="light"
                  :preview="true"
                  :toolbarsExclude="!hasWriteAccess ? ['save'] : []"
                  :readOnly="!hasWriteAccess"
                  placeholder="Document context, decisions, experiments, learnings, and next actions..."
                  class="h-full border-none!"
                />
              </div>
            </div>
          </main>

          <aside class="flex flex-col bg-slate-50/70">
            <div class="border-b border-slate-100 px-6 py-6">
              <div class="text-[11px] font-black uppercase tracking-[0.32em] text-blue-600">Artifacts</div>
              <h2 class="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">Attach delivery outputs</h2>
              <p class="mt-3 text-sm leading-7 text-slate-500">
                Link demos, repositories, benchmark sheets, model snapshots, or docs that prove the work happened.
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
                      @click="deleteArtifact(artifact)"
                      :disabled="!hasWriteAccess"
                      class="text-[11px] font-black uppercase tracking-[0.2em] text-red-500 transition-all hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </div>
                  <a :href="artifact.content_url" target="_blank" class="mt-4 block break-all text-sm font-semibold text-slate-500 underline decoration-slate-200 underline-offset-4 hover:text-blue-600">
                    {{ artifact.content_url }}
                  </a>
                </article>

                <div v-if="artifacts.length === 0" class="rounded-[1.6rem] border border-dashed border-slate-200 bg-white/80 px-5 py-8 text-center text-sm font-semibold text-slate-400">
                  No artifacts attached yet.
                </div>
              </div>
            </div>

            <div class="border-t border-slate-100 bg-white px-6 py-6">
              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="field-label">Artifact title</label>
                  <input v-model="artifactForm.title" :disabled="!hasWriteAccess || !noteId" type="text" class="field-input" placeholder="Production demo, GitHub repo, benchmark" />
                </div>
                <div class="space-y-2">
                  <label class="field-label">Artifact type</label>
                  <select v-model="artifactForm.artifact_type" :disabled="!hasWriteAccess || !noteId" class="field-input">
                    <option value="code">Code</option>
                    <option value="model">Model</option>
                    <option value="demo">Demo</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="field-label">Artifact URL</label>
                  <input v-model="artifactForm.content_url" :disabled="!hasWriteAccess || !noteId" type="text" class="field-input" placeholder="https://..." />
                </div>
                <button
                  @click="addArtifact"
                  :disabled="!hasWriteAccess || !noteId || artifactSubmitting"
                  class="primary-button w-full"
                >
                  {{ artifactSubmitting ? 'Attaching...' : noteId ? 'Attach artifact' : 'Save note first to attach artifacts' }}
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
