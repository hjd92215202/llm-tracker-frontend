<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

export type UiSelectPrimitive = string | number | boolean | null

interface UiSelectOption {
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    modelValue: UiSelectPrimitive
    options: UiSelectOption[]
    placeholder?: string
    searchable?: boolean
    searchPlaceholder?: string
    disabled?: boolean
    size?: 'sm' | 'md'
    menuWidth?: number | string
    optionKeyField?: string
    optionLabelField?: string
  }>(),
  {
    placeholder: '',
    searchable: false,
    searchPlaceholder: 'Search...',
    disabled: false,
    size: 'md',
    menuWidth: '100%',
    optionKeyField: 'value',
    optionLabelField: 'label',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: UiSelectPrimitive]
  'open-change': [open: boolean]
  'search-change': [query: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')
const activeKey = ref<string>('')

const normalizeValue = (value: unknown): UiSelectPrimitive => {
  if (value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return String(value)
}

const normalizedOptions = computed(() =>
  props.options.map((raw, index) => {
    const key = String(raw[props.optionKeyField] ?? `option-${index}`)
    const value = normalizeValue(raw[props.optionKeyField])
    const label = String(raw[props.optionLabelField] ?? '')

    return {
      key,
      value,
      label,
      raw,
    }
  }),
)

const selectedOption = computed(() =>
  normalizedOptions.value.find((item) => Object.is(item.value, props.modelValue)) ?? null,
)

const filteredOptions = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  if (!props.searchable || !keyword) return normalizedOptions.value

  return normalizedOptions.value.filter((item) => {
    const extraText = Object.values(item.raw)
      .map((value) => String(value ?? ''))
      .join(' ')
      .toLowerCase()
    return item.label.toLowerCase().includes(keyword) || extraText.includes(keyword)
  })
})

const triggerClasses = computed(() => [
  'ui-select-trigger',
  props.size === 'sm' ? 'ui-select-trigger-sm' : '',
  open.value ? 'ui-select-trigger-open' : '',
])

const menuStyle = computed(() => {
  if (typeof props.menuWidth === 'number') {
    return { width: `${props.menuWidth}px` }
  }
  return { width: props.menuWidth }
})

const closeMenu = () => {
  if (!open.value) return
  open.value = false
  query.value = ''
  activeKey.value = ''
  emit('open-change', false)
}

const openMenu = async () => {
  if (props.disabled || open.value) return
  open.value = true
  emit('open-change', true)
  await nextTick()
  if (props.searchable) {
    searchInputRef.value?.focus()
  }
}

const toggleMenu = () => {
  if (open.value) {
    closeMenu()
    return
  }
  void openMenu()
}

const selectOption = (value: UiSelectPrimitive) => {
  emit('update:modelValue', value)
  closeMenu()
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node | null
  if (!target || !rootRef.value?.contains(target)) {
    closeMenu()
  }
}

watch(query, (value) => {
  emit('search-change', value)
})

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) closeMenu()
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})

watch(open, (value) => {
  if (value) {
    document.addEventListener('mousedown', handleClickOutside)
    return
  }

  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div ref="rootRef" class="ui-select" :class="disabled ? 'ui-select-disabled' : ''">
    <button type="button" :disabled="disabled" :class="triggerClasses" @click="toggleMenu">
      <span class="ui-select-trigger-content">
        <slot name="trigger-prefix" :selected="selectedOption?.raw" />
        <span v-if="selectedOption" class="ui-select-label">{{ selectedOption.label }}</span>
        <span v-else class="ui-select-placeholder">{{ placeholder }}</span>
      </span>
      <span class="ui-select-caret" aria-hidden="true">▾</span>
    </button>

    <Transition name="ui-select-menu-pop">
      <div v-if="open" class="ui-select-menu" :style="menuStyle">
        <div v-if="searchable" class="ui-select-search-wrap">
          <input
            ref="searchInputRef"
            v-model="query"
            type="text"
            class="ui-select-search"
            :placeholder="searchPlaceholder"
          />
        </div>

        <div class="ui-select-options">
          <template v-if="filteredOptions.length > 0">
            <button
              v-for="item in filteredOptions"
              :key="item.key"
              type="button"
              class="ui-select-option"
              :class="[
                Object.is(item.value, modelValue) ? 'ui-select-option-selected' : '',
                activeKey === item.key ? 'ui-select-option-active' : '',
              ]"
              @mouseenter="activeKey = item.key"
              @click="selectOption(item.value)"
            >
              <slot name="option" :option="item.raw" :selected="Object.is(item.value, modelValue)">
                <span class="ui-select-option-label">{{ item.label }}</span>
              </slot>
            </button>
          </template>

          <div v-else class="ui-select-empty">
            <slot name="empty">No options found</slot>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
