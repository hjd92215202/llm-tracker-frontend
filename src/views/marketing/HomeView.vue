<script setup lang="ts">
import { computed } from 'vue'
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'
import { BRAND } from '@/config/brand'
import { useAuthStore } from '@/store/auth'
import { useLocaleStore } from '@/store/locale'

const authStore = useAuthStore()
const localeStore = useLocaleStore()

const primaryHref = computed(() => (authStore.isLoggedIn ? '/admin/dashboard' : '/register'))
const secondaryHref = computed(() =>
  authStore.isLoggedIn ? '/admin/search' : { name: 'login', query: { redirect: '/admin/dashboard' } }
)

const copy = computed(() =>
  localeStore.isChinese
    ? {
        descriptor: 'AI 团队工作台',
        nav: {
          product: '产品能力',
          scenarios: '适用团队',
          pricing: '价格方案',
        },
        badge: `${BRAND.name} · 让团队协作更清晰`,
        title: '把路线图、笔记和团队协作放进同一个工作空间',
        summary:
          'ContextOps 帮你把目标、进度、知识和成员协作放到一个清晰入口里。少切换工具，少丢上下文，更快把想法推进成结果。',
        primary: authStore.isLoggedIn ? '进入工作台' : '立即开始',
        secondary: authStore.isLoggedIn ? '打开搜索' : '登录体验',
        highlights: [
          { title: '一个入口', description: '最重要的信息先看到，不用在多个页面之间反复切换。' },
          { title: '进度清楚', description: '路线图、笔记和动态保持同步，团队知道现在该做什么。' },
          { title: '经验沉淀', description: '每次研究与交付都会留下可复用的记录，而不是散落在各处。' },
        ],
        consoleTitle: '空间总览',
        consoleName: '产品增长空间',
        consoleSummary: '打开后先看到最重要的事：完成率、待推进节点、最新笔记和最近动态。',
        consoleMetrics: [
          { label: '完成率', value: '74%', hint: '本周重点节点仍在持续推进' },
          { label: '进行中', value: '6', hint: '每个节点都能看到负责人和状态' },
          { label: '笔记数', value: '18', hint: '研究结论与交付动作保持关联' },
        ],
        activityTitle: '最近动态',
        activities: [
          '新成员加入产品增长空间，并完成初始协作设置。',
          '评估方法笔记已更新，并关联到本周重点节点。',
          '路线图新增两个任务，其中一个已进入执行中。',
        ],
        proofTitle: '为什么团队会更愿意长期用下去',
        proofs: [
          {
            title: '首页就能抓住重点',
            description: '打开空间先看到最关键的信息，不需要用户先理解系统结构。',
          },
          {
            title: '团队节奏一眼可见',
            description: '成员变化、路线图推进和笔记沉淀都能快速串起来看。',
          },
          {
            title: '对新成员也足够友好',
            description: '新加入的人能快速看懂当前目标、已有结论和接下来要做的事。',
          },
        ],
        featureTitle: '围绕团队日常协作，把重点放在最前面',
        features: [
          {
            title: '总览台',
            description: '把完成率、待办、最近动态和关键笔记收进一个首页，先看重点，再进入细节。',
          },
          {
            title: '路线图',
            description: '把方向拆成清晰节点，让团队知道现在推进到哪、下一步去哪里。',
          },
          {
            title: '研究笔记',
            description: '记录结论、实验和方案讨论，让笔记始终留在业务上下文里。',
          },
          {
            title: '团队权限',
            description: '不同角色看到不同边界，既能协作，也能让空间保持清晰秩序。',
          },
        ],
        scenariosTitle: '这些团队会最先感受到价值',
        scenarios: [
          {
            title: 'AI 创业团队',
            description: '适合同时推进产品探索、模型评估、交付协作的小团队。',
          },
          {
            title: '培训与内容团队',
            description: '适合需要管理课程路线、资料整理和团队复盘的运营场景。',
          },
          {
            title: '实验室与技术组织',
            description: '适合围绕项目、论文和实验长期沉淀知识与执行记录。',
          },
        ],
        pricingTitle: '从一个团队开始，按协作规模升级',
        pricing: [
          {
            name: '个人试用',
            price: '免费',
            description: '适合个人体验与最初验证',
            bullets: ['1 个空间', '基础路线图与笔记', '个人工作流试运行'],
          },
          {
            name: '团队版',
            price: '299 元 / 空间 / 月',
            description: '适合已经开始团队协作的业务',
            bullets: ['成员与权限管理', '总览、动态与搜索', '更清晰的协作结构'],
            featured: true,
          },
          {
            name: '企业版',
            price: '联系咨询',
            description: '适合多团队与更复杂的治理需求',
            bullets: ['多空间管理', '更正式的协作流程', '迁移与落地支持'],
          },
        ],
        ctaTitle: '让团队在一个空间里同步目标、知识和执行',
        ctaSummary: '越少切换，越少遗漏。让每一次讨论、记录和推进都回到同一个地方。',
      }
    : {
        descriptor: 'AI workspace for teams',
        nav: {
          product: 'Product',
          scenarios: 'Teams',
          pricing: 'Pricing',
        },
        badge: `${BRAND.name} · Clearer teamwork for AI teams`,
        title: 'Keep roadmap, notes, and collaboration inside one workspace',
        summary:
          'ContextOps gives teams one clear place for goals, progress, knowledge, and collaboration so work keeps moving without losing context.',
        primary: authStore.isLoggedIn ? 'Open workspace' : 'Get started',
        secondary: authStore.isLoggedIn ? 'Open search' : 'Sign in',
        highlights: [
          { title: 'One home', description: 'See the most important information first instead of bouncing across tools.' },
          { title: 'Clear progress', description: 'Roadmap, notes, and activity stay aligned so the team knows what happens next.' },
          { title: 'Reusable memory', description: 'Research and delivery work turn into knowledge the team can use again.' },
        ],
        consoleTitle: 'Workspace overview',
        consoleName: 'Product Growth Workspace',
        consoleSummary: 'Open the workspace and immediately see completion, active work, recent notes, and team activity.',
        consoleMetrics: [
          { label: 'Completion', value: '74%', hint: 'Priority work keeps moving through the roadmap' },
          { label: 'In progress', value: '6', hint: 'Every active node has visible context and ownership' },
          { label: 'Notes', value: '18', hint: 'Research stays attached to delivery decisions' },
        ],
        activityTitle: 'Recent activity',
        activities: [
          'A new teammate joined the growth workspace and completed setup.',
          'The evaluation note was refreshed and linked to a priority node.',
          'Two new roadmap items were added and one moved into progress.',
        ],
        proofTitle: 'Why teams keep coming back',
        proofs: [
          {
            title: 'The first screen does the heavy lifting',
            description: 'Users see the important information first without learning the whole system.',
          },
          {
            title: 'Team momentum is visible',
            description: 'Members, roadmap movement, and notes are easy to read together.',
          },
          {
            title: 'New teammates ramp faster',
            description: 'People can quickly understand goals, context, and what needs attention next.',
          },
        ],
        featureTitle: 'Built around daily teamwork with the most important things first',
        features: [
          {
            title: 'Dashboard',
            description: 'Bring completion, next steps, activity, and important notes into one focused home.',
          },
          {
            title: 'Roadmap',
            description: 'Break direction into clear nodes so the team knows what is moving and what comes next.',
          },
          {
            title: 'Research notes',
            description: 'Capture findings, experiments, and decisions without losing business context.',
          },
          {
            title: 'Permissions',
            description: 'Give every role the right surface while keeping the workspace orderly.',
          },
        ],
        scenariosTitle: 'Teams that feel the value first',
        scenarios: [
          {
            title: 'AI startups',
            description: 'Great for teams balancing product exploration, evaluation work, and delivery.',
          },
          {
            title: 'Training and content teams',
            description: 'Useful for course planning, material organization, and operating review loops.',
          },
          {
            title: 'Labs and technical orgs',
            description: 'Helpful for long-running knowledge and execution around projects, papers, and experiments.',
          },
        ],
        pricingTitle: 'Start with one team and grow with collaboration',
        pricing: [
          {
            name: 'Starter',
            price: 'Free',
            description: 'For early exploration and solo validation',
            bullets: ['1 workspace', 'Core roadmap and notes', 'Personal workflow testing'],
          },
          {
            name: 'Team',
            price: '$39 / workspace / month',
            description: 'For teams already collaborating around shared work',
            bullets: ['Members and permissions', 'Dashboard, activity, and search', 'A clearer team operating structure'],
            featured: true,
          },
          {
            name: 'Enterprise',
            price: 'Contact sales',
            description: 'For multi-team setups and stronger governance needs',
            bullets: ['Multi-workspace management', 'More formal collaboration flows', 'Migration and rollout support'],
          },
        ],
        ctaTitle: 'Keep goals, knowledge, and execution in one workspace',
        ctaSummary: 'Switch less, lose less, and move work forward with more clarity.',
      }
)
</script>

<template>
  <div class="page-shell overflow-hidden">
    <section class="relative pb-18 pt-6 md:pb-24">
      <div class="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_top_left,_rgba(229,106,43,0.15),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.12),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.84)_0%,_rgba(245,247,251,0.3)_70%,_transparent_100%)]"></div>

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

        <nav class="hidden items-center gap-7 text-sm font-semibold text-[var(--ink-soft)] lg:flex">
          <a href="#features" class="transition-colors hover:text-[var(--ink-strong)]">{{ copy.nav.product }}</a>
          <a href="#scenarios" class="transition-colors hover:text-[var(--ink-strong)]">{{ copy.nav.scenarios }}</a>
          <a href="#pricing" class="transition-colors hover:text-[var(--ink-strong)]">{{ copy.nav.pricing }}</a>
        </nav>

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
                  {{ copy.consoleTitle }}
                </p>
                <h2 class="mt-3 font-[var(--font-display)] text-3xl font-black tracking-[-0.05em]">
                  {{ copy.consoleName }}
                </h2>
                <p class="mt-4 max-w-md text-sm leading-7 text-[rgba(255,255,255,0.68)]">
                  {{ copy.consoleSummary }}
                </p>
              </div>
              <span class="rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold text-[rgba(255,255,255,0.76)]">
                {{ localeStore.isChinese ? '今日概览' : 'Live overview' }}
              </span>
            </div>

            <div class="mt-8 grid gap-4 md:grid-cols-3">
              <div
                v-for="metric in copy.consoleMetrics"
                :key="metric.label"
                class="rounded-[1.5rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5"
              >
                <div class="text-[11px] font-semibold tracking-[0.08em] text-[rgba(255,255,255,0.54)]">
                  {{ metric.label }}
                </div>
                <div class="mt-3 font-[var(--font-display)] text-4xl font-black tracking-[-0.06em]">
                  {{ metric.value }}
                </div>
                <p class="mt-3 text-sm leading-6 text-[rgba(255,255,255,0.66)]">{{ metric.hint }}</p>
              </div>
            </div>

            <div class="mt-5 rounded-[1.6rem] border border-white/10 bg-[rgba(255,255,255,0.06)] p-5">
              <div class="flex items-center justify-between gap-3">
                <div class="text-[11px] font-semibold tracking-[0.08em] text-[rgba(255,255,255,0.56)]">
                  {{ copy.activityTitle }}
                </div>
                <div class="rounded-full bg-[rgba(229,106,43,0.18)] px-3 py-1 text-[11px] font-semibold text-[rgba(255,245,240,0.92)]">
                  {{ localeStore.isChinese ? '持续推进中' : 'Team flow' }}
                </div>
              </div>

              <div class="mt-4 space-y-3">
                <div
                  v-for="activity in copy.activities"
                  :key="activity"
                  class="rounded-[1.2rem] border border-white/10 bg-[rgba(255,255,255,0.06)] px-4 py-3 text-sm leading-6 text-[rgba(255,255,255,0.72)]"
                >
                  {{ activity }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="product-shell pb-6 md:pb-10">
      <div class="grid gap-5 lg:grid-cols-3">
        <article v-for="item in copy.proofs" :key="item.title" class="product-panel rounded-[2rem] p-7">
          <div class="text-sm font-bold text-[var(--ink-strong)]">{{ item.title }}</div>
          <p class="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section id="features" class="product-shell py-14 md:py-18">
      <div class="max-w-3xl">
        <div class="product-eyebrow border border-[rgba(37,99,235,0.14)] bg-white/80 text-[var(--accent)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"></span>
          {{ copy.proofTitle }}
        </div>
        <h2 class="product-section-title mt-7">{{ copy.featureTitle }}</h2>
      </div>

      <div class="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <article v-for="feature in copy.features" :key="feature.title" class="product-panel rounded-[2rem] p-7">
          <h3 class="font-[var(--font-display)] text-3xl font-black tracking-[-0.05em] text-[var(--ink-strong)]">
            {{ feature.title }}
          </h3>
          <p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ feature.description }}</p>
        </article>
      </div>
    </section>

    <section id="scenarios" class="product-shell py-14 md:py-18">
      <div class="max-w-3xl">
        <div class="product-eyebrow border border-[rgba(229,106,43,0.14)] bg-white/80 text-[var(--brand)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--brand)]"></span>
          {{ copy.nav.scenarios }}
        </div>
        <h2 class="product-section-title mt-7">{{ copy.scenariosTitle }}</h2>
      </div>

      <div class="mt-10 grid gap-5 lg:grid-cols-3">
        <article v-for="item in copy.scenarios" :key="item.title" class="product-panel rounded-[2rem] p-7">
          <h3 class="font-[var(--font-display)] text-3xl font-black tracking-[-0.05em] text-[var(--ink-strong)]">
            {{ item.title }}
          </h3>
          <p class="mt-4 text-sm leading-7 text-[var(--ink-soft)]">{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section id="pricing" class="product-shell pb-16 pt-14 md:pb-20 md:pt-18">
      <div class="max-w-3xl">
        <div class="product-eyebrow border border-[rgba(37,99,235,0.14)] bg-white/80 text-[var(--accent)]">
          <span class="h-2.5 w-2.5 rounded-full bg-[var(--accent)]"></span>
          {{ copy.nav.pricing }}
        </div>
        <h2 class="product-section-title mt-7">{{ copy.pricingTitle }}</h2>
      </div>

      <div class="mt-10 grid gap-5 lg:grid-cols-3">
        <article
          v-for="plan in copy.pricing"
          :key="plan.name"
          :class="plan.featured ? 'bg-[var(--ink-strong)] text-white shadow-[0_28px_90px_rgba(20,33,43,0.18)]' : 'product-panel text-[var(--ink-strong)]'"
          class="rounded-[2rem] border p-8"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="font-[var(--font-display)] text-3xl font-black tracking-[-0.05em]">{{ plan.name }}</div>
              <p :class="plan.featured ? 'text-[rgba(255,255,255,0.68)]' : 'text-[var(--ink-soft)]'" class="mt-3 text-sm leading-7">
                {{ plan.description }}
              </p>
            </div>
            <span
              v-if="plan.featured"
              class="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-[rgba(255,255,255,0.82)]"
            >
              {{ localeStore.isChinese ? '推荐' : 'Recommended' }}
            </span>
          </div>

          <div class="mt-8 font-[var(--font-display)] text-5xl font-black tracking-[-0.07em]">{{ plan.price }}</div>

          <div class="mt-7 space-y-3">
            <div
              v-for="bullet in plan.bullets"
              :key="bullet"
              :class="plan.featured ? 'bg-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.76)]' : 'bg-[rgba(255,255,255,0.64)] text-[var(--ink-main)]'"
              class="rounded-[1.2rem] px-4 py-3 text-sm font-semibold leading-6"
            >
              {{ bullet }}
            </div>
          </div>
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
