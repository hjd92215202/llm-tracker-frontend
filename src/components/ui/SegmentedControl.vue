<script setup lang="ts">
export interface SegmentedOption {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: SegmentedOption[]
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="ui-segmented" :class="disabled ? 'ui-segmented-disabled' : ''">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="ui-segmented-item"
      :class="modelValue === option.value ? 'ui-segmented-item-active' : ''"
      :disabled="disabled"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
