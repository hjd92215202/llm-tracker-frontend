<script setup lang="ts">
import { computed } from 'vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { BRAND } from '@/config/brand'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'

const authStore = useAuthStore()
const localeStore = useLocaleStore()

const primaryHref = computed(() => (authStore.isLoggedIn ? '/roadmap' : '/register'))
const secondaryHref = computed(() => (authStore.isLoggedIn ? '/admin/workspace' : '/login'))

const copy = computed(() =>
  localeStore.isChinese
    ? {
        descriptor: '路线图协作空间',
        badge: '打开就看主路径',
        title: '把复杂项目整理成一张人人看得懂的路线图',
        summary: '把目标、节点和笔记放在同一条路径上。先看全局，再进入细节，不用在一堆页面里来回找上下文。',
        primary: authStore.isLoggedIn ? '进入路线图' : '立即开始',
        secondary: authStore.isLoggedIn ? '管理空间' : '登录',
        highlights: [
          { title: '先看清路径', description: '最重要的推进顺序直接摆在眼前，不靠翻菜单和找列表。' },
          { title: '节点连着笔记', description: '每个节点下面就是对应的方法、过程和结论。' },
          { title: '分享更容易懂', description: '发一条路线图链接，别人就能快速理解你在推进什么。' },
        ],
        previewTitle: '进入后第一眼',
        previewName: '产品增长空间',
        previewSummary: '路线图就是首页。点一个节点，下面直接接着看笔记和细节。',
        previewMetrics: [
          { label: '总节点', value: '12' },
          { label: '进行中', value: '3' },
          { label: '已完成', value: '7' },
        ],
        previewSteps: ['明确目标路径', '选中当前节点', '继续看对应笔记'],
        pathTitle: '典型使用方式',
        ctaTitle: '少切页面，少丢上下文，直接推进事情',
        ctaSummary: '适合把复杂任务拆成清晰路径的人，也适合围绕同一条路线协作的小团队。',
      }
    : {
        descriptor: 'Roadmap workspace',
        badge: 'Path first',
        title: 'Turn complex work into one roadmap people can understand at a glance',
        summary:
          'Keep goals, nodes, and notes on one visible path. See the whole picture first, then move into detail without jumping across pages.',
        primary: authStore.isLoggedIn ? 'Open roadmap' : 'Get started',
        secondary: authStore.isLoggedIn ? 'Manage workspace' : 'Sign in',
        highlights: [
          { title: 'See the path first', description: 'The important sequence is visible immediately instead of hidden in menus.' },
          { title: 'Nodes connect to notes', description: 'Each node keeps the methods, findings, and decisions underneath it.' },
          { title: 'Share with clarity', description: 'Send a shared roadmap and others can understand the work quickly.' },
        ],
        previewTitle: 'What you see first',
        previewName: 'Growth workspace',
        previewSummary: 'The roadmap is the home screen. Click a node and keep scrolling into the notes below it.',
        previewMetrics: [
          { label: 'Nodes', value: '12' },
          { label: 'Active', value: '3' },
          { label: 'Done', value: '7' },
        ],
        previewSteps: ['Define the path', 'Pick the current node', 'Continue into the note'],
        pathTitle: 'Typical flow',
        ctaTitle: 'Keep the path, notes, and progress in one place',
        ctaSummary: 'Built for people who think best when the whole path is visible.',
      }
)
</script>

<template>
  <div class="page-shell overflow-hidden">
    <section class="relative pb-16 pt-6 md:pb-22">
      <div class="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_top_left,_rgba(229,106,43,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.1),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.9)_0%,_rgba(245,247,251,0.38)_70%,_transparent_100%)]"></div>

      <header class="product-shell relative z-10 flex items-center justify-between gap-5 py-5">
        <router-link to="/" class="flex items-center gap-3 transition-opacity hover:opacity-80">
          <span class="flex h-11 w-11 items-center justify-center rounded-[1.2rem] bg-[var(--ink-strong)] text-sm font-black tracking-[0.18em] text-white shadow-[0_18px_36px_rgba(20,33,43,0.16)]">
            {{ BRAND.mark }}
          </span>
          <span>
            <span class="block font-[var(--font-display)] text-base font-black tracking-[-0.04em] text-[var(--ink-strong)]">
              {{ BRAND.name }}
            </span>
            <span class="block text-xs font-semibold text-[var(--ink-soft)]">
              {{ copy.descriptor }}
            </span>
          </span>
        </router-link>

        <div class="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </header>

      <div class="product-shell relative z-10 pt-10">
        <div>
          <div class="product-eyebrow border border-[rgba(229,106,43,0.14)] bg-white/82 text-[var(--brand)]">
            <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
            {{ copy.badge }}
          </div>

          <h1 class="product-title mt-8 max-w-4xl text-5xl leading-[0.92] md:text-6xl xl:text-7xl">
            {{ copy.title }}
          </h1>

          <div class="mt-9 flex flex-col gap-4 sm:flex-row">
            <router-link :to="primaryHref" class="product-button-primary">
              {{ copy.primary }}
            </router-link>
            <router-link :to="secondaryHref" class="product-button-secondary">
              {{ copy.secondary }}
            </router-link>
          </div>

          <div class="mt-10 grid gap-4 md:grid-cols-3">
            <article v-for="item in copy.highlights" :key="item.title" class="product-stat">
              <div class="text-base font-bold tracking-[-0.03em] text-[var(--ink-strong)]">{{ item.title }}</div>
              <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description }}</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <footer class="flex justify-center py-6 text-xs text-[var(--ink-soft)]">
      <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" class="hover:text-[var(--ink-strong)] transition-colors">
        陕ICP备2026003348号-2
      </a>
    </footer>
  </div>
</template>
