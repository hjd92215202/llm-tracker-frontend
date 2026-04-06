<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import WorkspaceCommandPalette from '@/components/WorkspaceCommandPalette.vue'
import { BRAND } from '@/config/brand'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'
import type { WorkspaceRole } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const localeStore = useLocaleStore()

const isCollapsed = ref(false)
const isCommandPaletteOpen = ref(false)
const isWorkspaceMenuOpen = ref(false)
const workspaceMenuRef = ref<HTMLElement | null>(null)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        brandLine: '路线图协作空间',
        workspaceLabel: '当前空间',
        searchHint: 'Ctrl + K',
        quickOpen: '快速搜索...',
        accountLabel: '账号',
        logout: '退出',
        collapse: '收起导航',
        expand: '展开导航',
        nav: [
          { to: '/admin/dashboard', short: '览', label: '总览' },
          { to: '/admin/notes', short: '记', label: '笔记' },
          { to: '/admin/workspace', short: '员', label: '成员管理' },
        ],
      }
    : {
        brandLine: 'Roadmap workspace',
        workspaceLabel: 'Current workspace',
        searchHint: 'Ctrl + K',
        quickOpen: 'Quick search...',
        accountLabel: 'Account',
        logout: 'Log out',
        collapse: 'Collapse',
        expand: 'Expand',
        nav: [
          { to: '/admin/dashboard', short: 'OV', label: 'Overview' },
          { to: '/admin/notes', short: 'NT', label: 'Notes' },
          { to: '/admin/workspace', short: 'MB', label: 'Members' },
        ],
      },
)

const roleLabelMap = computed<Record<WorkspaceRole, string>>(() =>
  localeStore.isChinese
    ? {
        owner: '所有者',
        admin: '管理员',
        member: '成员',
        viewer: '访客',
      }
    : {
        owner: 'Owner',
        admin: 'Admin',
        member: 'Member',
        viewer: 'Viewer',
      },
)

const hasMultipleWorkspaces = computed(() => authStore.workspaces.length > 1)
const activeWorkspaceName = computed(() => authStore.activeWorkspace?.workspace_name || '--')
const activeWorkspaceInitial = computed(() => activeWorkspaceName.value.charAt(0).toUpperCase())
const activeRoleLabel = computed(() => 
  authStore.activeRole ? roleLabelMap.value[authStore.activeRole] : '--'
)

const selectWorkspace = (id: number) => {
  authStore.setActiveWorkspace(id)
  isWorkspaceMenuOpen.value = false
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (workspaceMenuRef.value && !workspaceMenuRef.value.contains(event.target as Node)) {
    isWorkspaceMenuOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('mousedown', handleClickOutside)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<template>
  <div class="min-h-screen bg-[linear-gradient(180deg,#fbfbf9_0%,#f3f5f7_100%)] flex">
    
    <!-- 侧边导航栏 -->
    <!-- 宽度切换动画更加平滑 -->
    <aside
      :class="[isCollapsed ? 'w-[82px]' : 'w-[280px]']"
      class="flex-shrink-0 border-r border-[rgba(15,23,42,0.06)] bg-[rgba(248,248,246,0.85)] backdrop-blur-md transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] relative z-20 flex flex-col h-screen"
    >
      <!-- 将顶部内容区域稍微 padding，为底部折叠按钮留出空间 -->
      <div class="flex flex-col flex-1 p-4 gap-5 overflow-x-hidden overflow-y-auto scrollbar-hide pb-20">
        
        <!-- 1. 品牌 Logo 区域 -->
        <div class="flex items-center justify-between h-10 px-1">
          <router-link to="/" class="flex items-center gap-3 w-full group overflow-hidden" :class="isCollapsed ? 'justify-center' : ''">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ink-strong)] shadow-md shadow-gray-900/10 text-sm font-black text-white transition-transform group-hover:scale-105">
              {{ BRAND.mark }}
            </span>
            <!-- 利用宽缩放实现平滑消失 -->
            <div 
              class="flex flex-col min-w-0 whitespace-nowrap transition-all duration-300"
              :class="isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 flex-1'"
            >
              <div class="text-[15px] font-black tracking-tight text-[var(--ink-strong)] leading-tight">{{ BRAND.name }}</div>
              <div class="text-[10px] font-bold text-[var(--ink-soft)] uppercase tracking-wider mt-0.5">{{ copy.brandLine }}</div>
            </div>
          </router-link>
        </div>

        <div class="h-px bg-gradient-to-r from-transparent via-[rgba(15,23,42,0.06)] to-transparent my-1 shrink-0"></div>

        <!-- 2. 用户信息卡片 -->
        <div
          class="flex items-center rounded-[20px] bg-white border border-[rgba(15,23,42,0.06)] shadow-sm transition-all duration-300 relative overflow-hidden mx-auto shrink-0 hover:shadow-md"
          :class="isCollapsed ? 'w-12 h-12 p-1.5 justify-center' : 'w-full p-3 justify-between'"
        >
          <div class="flex items-center gap-3 whitespace-nowrap overflow-hidden">
            <span class="flex shrink-0 items-center justify-center rounded-full bg-gray-100 border border-gray-200/60 text-sm font-black text-gray-700 transition-all duration-300"
                  :class="isCollapsed ? 'h-9 w-9' : 'h-10 w-10'">
              {{ authStore.user?.username?.charAt(0)?.toUpperCase() || 'U' }}
            </span>
            <div class="transition-all duration-300 flex flex-col" :class="isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-[120px]'">
              <div class="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] leading-none">{{ copy.accountLabel }}</div>
              <div class="text-[14px] font-bold text-[var(--ink-strong)] mt-1.5 leading-none truncate">{{ authStore.user?.username }}</div>
            </div>
          </div>

          <button
            class="text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all duration-300 absolute right-2"
            :class="isCollapsed ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0'"
            type="button"
            @click="handleLogout"
          >
            {{ copy.logout }}
          </button>
        </div>

        <!-- 3. 工作空间下拉组件 -->
        <div class="relative shrink-0 flex flex-col items-center" ref="workspaceMenuRef">
          <div 
            class="w-full px-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-soft)] transition-all duration-300 whitespace-nowrap"
            :class="isCollapsed ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 h-auto mb-2'"
          >
            {{ copy.workspaceLabel }}
          </div>
          
          <button 
            type="button"
            class="flex items-center bg-white border shadow-sm transition-all duration-300 outline-none relative overflow-hidden"
            :class="[
              isWorkspaceMenuOpen && !isCollapsed ? 'border-orange-300 ring-4 ring-orange-50' : 'border-[rgba(15,23,42,0.08)] hover:border-[rgba(15,23,42,0.15)] hover:shadow-md',
              isCollapsed ? 'w-12 h-12 p-1.5 justify-center rounded-[20px]' : 'w-full p-2.5 justify-between rounded-[18px]'
            ]"
            @click="isWorkspaceMenuOpen = !isWorkspaceMenuOpen"
          >
            <div class="flex items-center gap-3 whitespace-nowrap overflow-hidden">
              <div class="flex shrink-0 items-center justify-center rounded-[12px] bg-orange-50 border border-orange-100 text-orange-600 font-black shadow-inner transition-all duration-300"
                   :class="isCollapsed ? 'h-9 w-9' : 'h-9 w-9'">
                {{ activeWorkspaceInitial }}
              </div>
              <div class="transition-all duration-300 flex flex-col text-left" :class="isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-[140px]'">
                <div class="text-[14px] font-bold text-[var(--ink-strong)] leading-tight truncate">{{ activeWorkspaceName }}</div>
                <div class="text-[11px] font-semibold text-gray-500 mt-0.5 truncate">{{ activeRoleLabel }}</div>
              </div>
            </div>
            
            <div v-if="hasMultipleWorkspaces" class="text-gray-400 shrink-0 absolute right-3 transition-all duration-300" 
                 :class="[isWorkspaceMenuOpen ? 'rotate-180' : '', isCollapsed ? 'opacity-0 translate-x-4 pointer-events-none' : 'opacity-100 translate-x-0']">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </button>

          <!-- 下拉菜单弹窗 -->
          <Transition name="dropdown">
            <div v-if="isWorkspaceMenuOpen && hasMultipleWorkspaces" 
                 class="absolute z-50 mt-2 bg-white/95 backdrop-blur-xl border border-gray-200/80 shadow-[0_20px_40px_rgba(0,0,0,0.12)] p-1.5 rounded-2xl overflow-hidden"
                 :class="isCollapsed ? 'left-[calc(100%+8px)] top-0 w-[240px]' : 'left-0 right-0 w-full'">
              <div class="max-h-[300px] overflow-y-auto scrollbar-hide flex flex-col gap-1">
                <button
                  v-for="ws in authStore.workspaces"
                  :key="ws.workspace_id"
                  class="w-full flex items-center justify-between p-2.5 rounded-[12px] text-left transition-colors group"
                  :class="ws.workspace_id === authStore.activeWorkspaceId ? 'bg-orange-50' : 'hover:bg-gray-100'"
                  @click="selectWorkspace(ws.workspace_id)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold text-[11px] transition-colors"
                         :class="ws.workspace_id === authStore.activeWorkspaceId ? 'bg-white text-orange-600 shadow-sm' : 'bg-gray-200/60 text-gray-600 group-hover:bg-white'">
                      {{ ws.workspace_name.charAt(0).toUpperCase() }}
                    </div>
                    <div class="min-w-0">
                      <div class="text-[13px] font-bold truncate" :class="ws.workspace_id === authStore.activeWorkspaceId ? 'text-orange-900' : 'text-gray-700 group-hover:text-gray-900'">
                        {{ ws.workspace_name }}
                      </div>
                    </div>
                  </div>
                  <div v-if="ws.workspace_id === authStore.activeWorkspaceId" class="text-orange-500 shrink-0 ml-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <!-- 4. 快速搜索 -->
        <button
          class="flex items-center border border-gray-200/80 bg-white/60 transition-all duration-300 hover:bg-white hover:border-gray-300 hover:shadow-sm group mt-2 shrink-0 relative overflow-hidden mx-auto"
          :class="isCollapsed ? 'w-12 h-12 justify-center rounded-[20px] p-0' : 'w-full px-3 py-3 gap-3 rounded-[16px]'"
          type="button"
          @click="isCommandPaletteOpen = true"
        >
          <svg class="text-gray-400 group-hover:text-gray-600 shrink-0 transition-transform group-hover:scale-110" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          
          <div class="flex items-center justify-between whitespace-nowrap transition-all duration-300 absolute left-10 right-3"
               :class="isCollapsed ? 'opacity-0 hidden' : 'opacity-100'">
            <span class="text-[13px] font-bold text-gray-500 group-hover:text-gray-800">{{ copy.quickOpen }}</span>
            <div class="flex items-center gap-1 rounded-md bg-gray-100 border border-gray-200/60 px-1.5 py-0.5 text-[10px] font-black text-gray-400 font-mono shadow-sm">
              <span>⌘</span><span>K</span>
            </div>
          </div>
        </button>

        <!-- 5. 导航菜单 -->
        <nav class="flex flex-col gap-2 mt-2 w-full">
          <router-link
            v-for="item in copy.nav"
            :key="item.to"
            :to="item.to"
            custom
            v-slot="{ isActive, href, navigate }"
          >
            <a
              :href="href"
              @click="navigate"
              class="flex items-center transition-all duration-300 border outline-none group overflow-hidden mx-auto"
              :class="[
                isActive ? 'bg-white text-[var(--ink-strong)] shadow-md border-gray-200/80' : 'text-gray-500 border-transparent hover:bg-white/80 hover:text-gray-900 hover:border-gray-200/60 hover:shadow-sm',
                isCollapsed ? 'w-12 h-12 p-1.5 justify-center rounded-[20px]' : 'w-full p-2 gap-3 rounded-[16px]'
              ]"
            >
              <div
                class="flex shrink-0 items-center justify-center rounded-[12px] text-[11px] font-black transition-all duration-300"
                :class="[
                  isActive ? 'bg-[var(--ink-strong)] text-white shadow-inner' : 'bg-transparent group-hover:bg-gray-100/80',
                  isCollapsed ? 'h-9 w-9' : 'h-9 w-9'
                ]"
              >
                {{ item.short }}
              </div>
              <div class="whitespace-nowrap text-[14px] font-bold transition-all duration-300"
                   :class="isCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'">
                {{ item.label }}
              </div>
            </a>
          </router-link>
        </nav>
      </div>

      <!-- 6. 底部折叠按钮（绝对居中/靠右控制） -->
      <!-- 这个按钮被移到了底部，保证即使侧边栏内容很多，也能随时折叠 -->
      <div class="absolute bottom-6 left-0 right-0 flex px-4 transition-all duration-300"
           :class="isCollapsed ? 'justify-center' : 'justify-end'">
        <button
          :aria-label="isCollapsed ? copy.expand : copy.collapse"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-[rgba(15,23,42,0.08)] text-gray-400 shadow-sm transition-all hover:text-gray-800 hover:border-gray-300 hover:shadow-md z-10"
          type="button"
          @click="isCollapsed = !isCollapsed"
        >
          <!-- 使用 SVG 箭头，平滑旋转 -->
          <svg class="transition-transform duration-300" :class="isCollapsed ? 'rotate-180' : ''" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>
    </aside>

    <!-- 右侧内容区 -->
    <main class="min-w-0 flex-1 flex flex-col h-screen overflow-hidden bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
      <div class="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6 scrollbar-hide relative z-10">
        <router-view />
      </div>
    </main>
  </div>

  <WorkspaceCommandPalette :open="isCommandPaletteOpen" @close="isCommandPaletteOpen = false" />
</template>

<style scoped>
/* 隐藏原生滚动条，保持界面干净 */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Dropdown 动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top center;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}
</style>