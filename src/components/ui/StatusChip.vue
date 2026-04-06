<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    tone?: 'default' | 'dark' | 'blue' | 'green' | 'warm'
    active?: boolean
  }>(),
  {
    tone: 'default',
    active: false,
  },
)

const classes = computed(() => {
  const toneMap = {
    default: 'admin-chip',
    dark: 'admin-chip-dark',
    blue: 'admin-chip-blue',
    green: 'admin-chip-green',
    warm: 'admin-chip-warm',
  }

  return [toneMap[props.tone], props.active ? 'status-chip-active' : '']
})
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>

<style scoped>
.status-chip-active {
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06);
}
</style>
