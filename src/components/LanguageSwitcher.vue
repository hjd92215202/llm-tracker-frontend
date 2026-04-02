<script setup lang="ts">
import { computed } from 'vue'
import { useLocaleStore, type AppLocale } from '@/store/locale'

const props = withDefaults(
  defineProps<{
    tone?: 'light' | 'dark'
  }>(),
  {
    tone: 'light',
  }
)

const localeStore = useLocaleStore()

const options: Array<{ value: AppLocale; label: string }> = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
]

const shellClass = computed(() =>
  props.tone === 'dark'
    ? 'border-white/10 bg-[rgba(255,255,255,0.08)] text-white'
    : 'border-[rgba(20,33,43,0.10)] bg-white/78 text-[var(--ink-main)] shadow-[0_10px_30px_rgba(20,33,43,0.06)]'
)

const activeClass = computed(() =>
  props.tone === 'dark'
    ? 'bg-white text-[var(--ink-strong)] shadow-[0_10px_20px_rgba(15,23,42,0.18)]'
    : 'bg-[var(--ink-strong)] text-white shadow-[0_10px_20px_rgba(20,33,43,0.12)]'
)

const inactiveClass = computed(() =>
  props.tone === 'dark'
    ? 'text-[rgba(255,255,255,0.72)] hover:text-white'
    : 'text-[var(--ink-soft)] hover:text-[var(--ink-strong)]'
)
</script>

<template>
  <div :class="shellClass" class="inline-flex items-center gap-1 rounded-full border p-1.5 backdrop-blur">
    <button
      v-for="option in options"
      :key="option.value"
      :class="localeStore.locale === option.value ? activeClass : inactiveClass"
      class="rounded-full px-3.5 py-2 text-[11px] font-semibold transition-all"
      type="button"
      @click="localeStore.setLocale(option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>
