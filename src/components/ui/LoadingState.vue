<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
    compact?: boolean
  }>(),
  {
    label: 'Loading...',
    compact: false,
  },
)
</script>

<template>
  <div class="admin-empty" :class="compact ? '!p-8' : ''">
    <span class="ui-loading-spinner" aria-hidden="true"></span>
    <div class="admin-empty-title">{{ props.label }}</div>
    <div class="ui-loading-skeleton" :class="compact ? 'ui-loading-skeleton-compact' : ''">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
</template>
