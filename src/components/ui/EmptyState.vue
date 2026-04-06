<script setup lang="ts">
import type { Component } from 'vue'

const props = withDefaults(
  defineProps<{
    icon?: Component | null
    title: string
    hint?: string
    actionLabel?: string
    compact?: boolean
  }>(),
  {
    icon: null,
    hint: '',
    actionLabel: '',
    compact: false,
  },
)

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="admin-empty" :class="compact ? '!p-8' : ''">
    <div v-if="icon" class="admin-empty-icon">
      <component :is="icon" :size="compact ? 24 : 34" />
    </div>
    <div class="admin-empty-title">{{ title }}</div>
    <div v-if="hint" class="admin-empty-hint">{{ hint }}</div>
    <button v-if="actionLabel" type="button" class="product-button-secondary mt-2" @click="emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>
