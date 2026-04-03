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
        badge: '打开就看路线图',
        title: '把想做的事，直接画成一张清晰路线图',
        summary:
          '从目标到执行节点，再到对应笔记，全部放在一条路径上。先看全局，再点进细节，不用在一堆页面里来回找。',
        primary: authStore.isLoggedIn ? '进入路线图' : '立即开始',
        secondary: authStore.isLoggedIn ? '管理空间' : '登录',
        highlights: [
          { title: '先看全局', description: '最重要的路径先摆在眼前，知道现在做到哪里。' },
          { title: '节点连着笔记', description: '每个节点都能继续往下看方法、结论和过程。' },
          { title: '分享更直接', description: '路线图可以分享给别人查看，理解成本更低。' },
        ],
        previewTitle: '进入后先看到什么',
        previewName: '产品增长空间',
        previewSummary: '路线图是第一屏。点一个节点，继续往下看它对应的笔记和细节。',
        previewMetrics: [
          { label: '总节点', value: '12' },
          { label: '进行中', value: '3' },
          { label: '已完成', value: '7' },
        ],
        previewSteps: ['明确目标路径', '拆出当前节点', '沉淀关键笔记'],
        noteTitle: '节点详情',
        noteSummary: '点击节点后，下面直接展开相关笔记，不打断你的思路。',
        pathTitle: '典型路径',
        valueTitle: '为什么会顺手',
        values: [
          {
            title: '一眼看懂现在的进度',
            description: '不是看一堆列表，而是直接看到路径、顺序和当前重点。',
          },
          {
            title: '研究和执行放在一起',
            description: '节点下面就是笔记，方法、结论和决策不会散掉。',
          },
          {
            title: '适合个人，也适合小团队',
            description: '自己能用，分享出去也能让别人快速看懂你在推进什么。',
          },
        ],
        ctaTitle: '少切页面，少丢上下文，直接推进事情',
        ctaSummary: '适合把复杂任务拆成路线图的人，也适合围绕同一条路径协作的小团队。',
      }
    : {
        descriptor: 'Roadmap workspace',
        badge: 'Roadmap first',
        title: 'Turn complex work into one clear roadmap',
        summary:
          'Keep goals, execution nodes, and notes on one path. Open the product, see the big picture, then move straight into detail.',
        primary: authStore.isLoggedIn ? 'Open roadmap' : 'Get started',
        secondary: authStore.isLoggedIn ? 'Manage workspace' : 'Sign in',
        highlights: [
          { title: 'See the path first', description: 'The important path is visible immediately instead of buried in menus.' },
          { title: 'Nodes connect to notes', description: 'Each node can open the notes and thinking behind the work.' },
          { title: 'Share with clarity', description: 'A shared roadmap is easier for others to understand at a glance.' },
        ],
        previewTitle: 'What you see first',
        previewName: 'Growth workspace',
        previewSummary: 'The roadmap is the home screen. Click a node and keep scrolling into the notes below it.',
        previewMetrics: [
          { label: 'Nodes', value: '12' },
          { label: 'Active', value: '3' },
          { label: 'Done', value: '7' },
        ],
        previewSteps: ['Define the path', 'Pick the current node', 'Capture the note'],
        noteTitle: 'Node details',
        noteSummary: 'After you click a node, the related notes appear below without breaking the flow.',
        pathTitle: 'Typical path',
        valueTitle: 'Why it feels clear',
        values: [
          {
            title: 'Progress is visible immediately',
            description: 'See the path, sequence, and current focus without parsing a dense workspace.',
          },
          {
            title: 'Research stays attached to action',
            description: 'Notes live under the roadmap nodes they belong to, not in a disconnected pile.',
          },
          {
            title: 'Works for solo builders and teams',
            description: 'Useful alone, and even more useful when you need to show others the path.',
          },
        ],
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
          <router-link :to="secondaryHref" class="hidden rounded-full px-4 py-2 text-sm font-semibold text-[var(--ink-main)] transition-colors hover:bg-white/70 md:inline-flex">
            {{ copy.secondary }}
          </router-link>
        </div>
      </header>

      <div class="product-shell relative z-10 grid gap-10 pt-10 lg:grid-cols-[minmax(0,1.02fr)_minmax(340px,0.98fr)] lg:items-center">
        <div>
          <div class="product-eyebrow border border-[rgba(229,106,43,0.14)] bg-white/82 text-[var(--brand)]">
            <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
            {{ copy.badge }}
          </div>

          <h1 class="product-title mt-8 max-w-4xl text-5xl leading-[0.92] md:text-6xl xl:text-7xl">
            {{ copy.title }}
          </h1>

          <p class="product-body mt-6 max-w-2xl text-lg md:text-[1.08rem]">
            {{ copy.summary }}
          </p>

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

        <div class="relative">
          <div class="absolute -left-6 top-10 h-40 w-40 rounded-full bg-[rgba(229,106,43,0.16)] blur-3xl"></div>
          <div class="absolute -right-5 bottom-10 h-44 w-44 rounded-full bg-[rgba(37,99,235,0.18)] blur-3xl"></div>

          <div class="relative overflow-hidden rounded-[2.3rem] bg-[var(--surface-dark)] p-6 text-white shadow-[0_40px_120px_rgba(20,33,43,0.2)] md:p-8">
            <div class="flex items-start justify-between gap-5">
              <div>
                <p class="text-[11px] font-semibold tracking-[0.08em] text-[rgba(255,255,255,0.56)]">
                  {{ copy.previewTitle }}
                </p>
                <h2 class="mt-3 font-[var(--font-display)] text-3xl font-black tracking-[-0.05em]">
                  {{ copy.previewName }}
                </h2>
                <p class="mt-4 max-w-md text-sm leading-7 text-[rgba(255,255,255,0.68)]">
                  {{ copy.previewSummary }}
                </p>
              </div>
              <span class="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold text-[rgba(255,255,255,0.76)]">
                {{ localeStore.isChinese ? '路线图优先' : 'Roadmap first' }}
              </span>
            </div>

            <div class="mt-8 grid gap-4 md:grid-cols-3">
              <div
                v-for="metric in copy.previewMetrics"
                :key="metric.label"
                class="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5"
              >
                <div class="text-[11px] font-semibold tracking-[0.08em] text-[rgba(255,255,255,0.54)]">
                  {{ metric.label }}
                </div>
                <div class="mt-3 font-[var(--font-display)] text-4xl font-black tracking-[-0.06em]">
                  {{ metric.value }}
                </div>
              </div>
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
              <div class="rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5">
                <div class="text-[11px] font-semibold tracking-[0.08em] text-[rgba(255,255,255,0.56)]">
                  {{ copy.noteTitle }}
                </div>
                <div class="mt-4 rounded-[1.3rem] border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-4">
                  <div class="text-sm font-semibold text-white/92">
                    {{ copy.previewSteps[1] }}
                  </div>
                  <p class="mt-2 text-sm leading-7 text-[rgba(255,255,255,0.68)]">
                    {{ copy.noteSummary }}
                  </p>
                </div>
              </div>

              <div class="rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5">
                <div class="text-[11px] font-semibold tracking-[0.08em] text-[rgba(255,255,255,0.56)]">
                  {{ copy.pathTitle }}
                </div>
                <div class="mt-4 space-y-3">
                  <div
                    v-for="step in copy.previewSteps"
                    :key="step"
                    class="rounded-[1.2rem] border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm font-semibold leading-6 text-[rgba(255,255,255,0.78)]"
                  >
                    {{ step }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="product-shell py-10 md:py-14">
      <div class="max-w-3xl">
        <h2 class="product-section-title mt-7">{{ copy.valueTitle }}</h2>
      </div>

      <div class="mt-10 grid gap-5 md:grid-cols-3">
        <article v-for="item in copy.values" :key="item.title" class="product-panel rounded-[2rem] p-7">
          <h3 class="font-[var(--font-display)] text-2xl font-black tracking-[-0.05em] text-[var(--ink-strong)]">
            {{ item.title }}
          </h3>
          <p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="px-5 pb-20 md:px-8 md:pb-24">
      <div class="product-shell overflow-hidden rounded-[2.4rem] bg-[var(--ink-strong)] px-8 py-10 text-white shadow-[0_34px_120px_rgba(20,33,43,0.18)] md:px-12 md:py-14">
        <div class="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div class="max-w-4xl">
            <div class="text-sm font-semibold text-[rgba(255,255,255,0.56)]">
              {{ BRAND.name }}
            </div>
            <h2 class="mt-5 font-[var(--font-display)] text-4xl font-black leading-[0.95] tracking-[-0.06em] md:text-6xl">
              {{ copy.ctaTitle }}
            </h2>
            <p class="mt-5 text-base leading-8 text-[rgba(255,255,255,0.68)]">{{ copy.ctaSummary }}</p>
          </div>

          <div class="flex flex-col gap-4 sm:flex-row lg:flex-col">
            <router-link :to="primaryHref" class="product-button-primary">
              {{ copy.primary }}
            </router-link>
            <router-link :to="secondaryHref" class="product-button-dark">
              {{ copy.secondary }}
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
