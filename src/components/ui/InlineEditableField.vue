<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    multiline?: boolean
    placeholder?: string
    disabled?: boolean
    displayClass?: string
    inputClass?: string
    emptyLabel?: string
  }>(),
  {
    multiline: false,
    placeholder: '',
    disabled: false,
    displayClass: '',
    inputClass: '',
    emptyLabel: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  save: [value: string]
  cancel: []
  start: []
}>()

const editing = ref(false)
const draft = ref(props.modelValue)
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)

watch(
  () => props.modelValue,
  (value) => {
    if (!editing.value) {
      draft.value = value
    }
  },
)

const displayValue = computed(() => props.modelValue.trim() || props.emptyLabel || props.placeholder)

const startEditing = async () => {
  if (props.disabled || editing.value) return
  editing.value = true
  draft.value = props.modelValue
  emit('start')
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select?.()
}

const commit = () => {
  if (!editing.value) return
  const nextValue = draft.value
  editing.value = false
  emit('update:modelValue', nextValue)
  emit('save', nextValue)
}

const cancel = () => {
  if (!editing.value) return
  draft.value = props.modelValue
  editing.value = false
  emit('cancel')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancel()
    return
  }

  if (!props.multiline && event.key === 'Enter') {
    event.preventDefault()
    commit()
  }

  if (props.multiline && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    commit()
  }
}
</script>

<template>
  <button
    v-if="!editing"
    type="button"
    class="inline-edit-display"
    :class="[displayClass, !modelValue?.trim() ? 'inline-edit-empty' : '']"
    :disabled="disabled"
    @click="startEditing"
  >
    {{ displayValue }}
  </button>

  <textarea
    v-else-if="multiline"
    ref="inputRef"
    v-model="draft"
    rows="4"
    class="inline-edit-input inline-edit-textarea"
    :class="inputClass"
    :placeholder="placeholder"
    @blur="commit"
    @keydown="handleKeydown"
  />

  <input
    v-else
    ref="inputRef"
    v-model="draft"
    type="text"
    class="inline-edit-input"
    :class="inputClass"
    :placeholder="placeholder"
    @blur="commit"
    @keydown="handleKeydown"
  />
</template>

<style scoped>
.inline-edit-display {
  width: 100%;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
  color: inherit;
  transition: opacity 160ms ease;
}

.inline-edit-display:hover {
  opacity: 0.82;
}

.inline-edit-empty {
  color: var(--ink-soft);
}

.inline-edit-input {
  width: 100%;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  padding: 12px 14px;
  color: var(--ink-strong);
  outline: none;
  box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
}

.inline-edit-textarea {
  resize: vertical;
}
</style>
