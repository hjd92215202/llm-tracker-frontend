<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/store/auth'

const authStore = useAuthStore()

const primaryHref = computed(() => (authStore.isLoggedIn ? '/admin/workspace' : '/register'))
const primaryLabel = computed(() => (authStore.isLoggedIn ? '进入工作台' : '申请试用'))
const secondaryHref = computed(() =>
  authStore.isLoggedIn ? '/roadmap' : { name: 'login', query: { redirect: '/roadmap' } }
)
const secondaryLabel = computed(() => (authStore.isLoggedIn ? '查看产品演示' : '登录查看演示'))

const painPoints = [
  {
    title: '知识分散在多个工具里',
    description: '文档在 Notion，代码在 GitHub，结论在聊天记录，实验结果在网盘，最后没人能看到完整上下文。',
  },
  {
    title: '研究推进没有经营视角',
    description: '团队知道做了很多事，但看不清什么在推进、什么可复用、什么真正形成了能力资产。',
  },
  {
    title: '成员经验难以复制',
    description: '新人的 onboarding、老人的方法论、项目里的关键结论，常常跟着人和项目一起流失。',
  },
]

const features = [
  {
    eyebrow: 'Workspace',
    title: '用工作区管理团队知识资产',
    description: '把 roadmap、研究笔记、实验成果和成员协作放在同一层，形成真正可运营的知识系统。',
  },
  {
    eyebrow: 'Roadmap',
    title: '让学习路径和项目推进可视化',
    description: '从 onboarding 到专项训练，再到真实项目，明确每个节点的目标、状态和依赖关系。',
  },
  {
    eyebrow: 'Notes',
    title: '让研究记录沉淀在正确的位置',
    description: '每一条笔记都属于一个明确的节点和上下文，而不是散落在孤立页面里。',
  },
  {
    eyebrow: 'Artifacts',
    title: '把 Repo、Demo、论文和实验数据绑定起来',
    description: '交付物不再和结论脱节，团队可以快速看到一个结果是怎么做出来的。',
  },
  {
    eyebrow: 'Permissions',
    title: '从第一天开始支持团队权限',
    description: 'Owner、Admin、Member、Viewer 四层角色，方便你从个人工具升级成团队产品。',
  },
  {
    eyebrow: 'Reuse',
    title: '让历史经验可以搜索、复用和复制',
    description: '过去做过的实验、踩过的坑和验证过的方法，不再需要团队反复重来。',
  },
]

const audiences = [
  {
    title: 'AI 创业团队',
    description: '管理内部知识库、训练新人、沉淀方法论，并把研究与交付过程统一起来。',
  },
  {
    title: '训练营与教学团队',
    description: '把课程路径、学员产出、阶段笔记和项目复盘组织成一套可运营系统。',
  },
  {
    title: '研究实验室与技术小组',
    description: '围绕实验路线、论文笔记、结果归档和经验复用，建立长期知识资产。',
  },
]

const plans = [
  {
    name: 'Starter',
    price: '免费',
    description: '适合个人与早期验证中的小团队',
    bullets: ['1 个 workspace', '基础路线图与笔记能力', '适合验证团队知识流'],
  },
  {
    name: 'Team',
    price: '¥49 / 人 / 月',
    description: '适合 5-30 人的 AI 团队',
    bullets: ['多成员协作与权限', 'Workspace 团队管理', '研究资产统一沉淀'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: '定制报价',
    description: '适合训练营、实验室和跨部门 AI 组织',
    bullets: ['组织级权限模型', '多项目知识运营', '落地支持与迁移服务'],
  },
]
</script>

<template>
  <div class="min-h-screen bg-[var(--page-bg)] text-slate-950">
    <section class="relative isolate overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_30%),radial-gradient(circle_at_78%_0%,_rgba(59,130,246,0.16),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#f3f7fb_58%,_#ffffff_100%)]"></div>
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent"></div>

      <header class="relative z-10">
        <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <router-link to="/" class="flex items-center gap-3 text-slate-900 transition-opacity hover:opacity-80">
            <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]">LT</span>
            <span>
              <span class="block text-sm font-black uppercase tracking-[0.28em]">LLM Tracker</span>
              <span class="block text-[10px] font-bold uppercase tracking-[0.32em] text-slate-400">Knowledge Ops for AI Teams</span>
            </span>
          </router-link>

          <nav class="hidden items-center gap-8 text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 lg:flex">
            <a href="#features" class="transition-colors hover:text-slate-900">核心能力</a>
            <a href="#audiences" class="transition-colors hover:text-slate-900">适用团队</a>
            <a href="#pricing" class="transition-colors hover:text-slate-900">价格方案</a>
            <a href="#faq" class="transition-colors hover:text-slate-900">常见问题</a>
          </nav>

          <div class="flex items-center gap-3">
            <router-link
              :to="secondaryHref"
              class="hidden rounded-2xl border border-slate-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-950 lg:inline-flex"
            >
              {{ secondaryLabel }}
            </router-link>
            <router-link
              :to="primaryHref"
              class="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] transition-all hover:-translate-y-0.5 hover:bg-sky-600"
            >
              {{ primaryLabel }}
            </router-link>
          </div>
        </div>
      </header>

      <div class="relative z-10 mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:px-10 lg:pb-28 lg:pt-14">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-3 rounded-full border border-sky-200/70 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700 shadow-[0_12px_32px_rgba(14,165,233,0.08)] backdrop-blur">
            <span class="h-2 w-2 rounded-full bg-sky-500"></span>
            为 AI 团队打造的知识运营系统
          </div>

          <h1 class="mt-8 max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-slate-950 md:text-6xl lg:text-7xl">
            把路线图、研究笔记、实验成果和团队协作
            <span class="text-sky-600">放进同一个 workspace</span>
          </h1>

          <p class="mt-8 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">
            不只是写文档，而是帮助 AI 团队把“学什么、做什么、交付了什么、沉淀了什么”真正连接起来，
            让知识可以复用，让研究可以经营，让团队能力持续积累。
          </p>

          <div class="mt-10 flex flex-col gap-4 sm:flex-row">
            <router-link
              :to="primaryHref"
              class="inline-flex items-center justify-center rounded-[1.4rem] bg-slate-950 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)] transition-all hover:-translate-y-1 hover:bg-sky-600"
            >
              {{ primaryLabel }}
            </router-link>
            <router-link
              :to="secondaryHref"
              class="inline-flex items-center justify-center rounded-[1.4rem] border border-slate-200 bg-white px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-slate-700 transition-all hover:-translate-y-1 hover:border-slate-300 hover:text-slate-950"
            >
              {{ secondaryLabel }}
            </router-link>
          </div>

          <div class="mt-12 grid gap-4 sm:grid-cols-3">
            <div class="rounded-[1.6rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur">
              <div class="text-2xl font-black tracking-[-0.06em]">路线图</div>
              <p class="mt-2 text-sm leading-6 text-slate-500">把 onboarding、训练和项目推进组织成可跟踪的能力路径。</p>
            </div>
            <div class="rounded-[1.6rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur">
              <div class="text-2xl font-black tracking-[-0.06em]">研究笔记</div>
              <p class="mt-2 text-sm leading-6 text-slate-500">让每条理解、结论和复盘都落在正确的上下文中。</p>
            </div>
            <div class="rounded-[1.6rem] border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)] backdrop-blur">
              <div class="text-2xl font-black tracking-[-0.06em]">成果资产</div>
              <p class="mt-2 text-sm leading-6 text-slate-500">统一归档 Repo、Demo、论文、模型和实验资料。</p>
            </div>
          </div>
        </div>

        <div class="relative">
          <div class="absolute -right-12 top-10 h-32 w-32 rounded-full bg-sky-300/20 blur-3xl"></div>
          <div class="absolute left-0 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-blue-300/15 blur-3xl"></div>

          <div class="relative overflow-hidden rounded-[2rem] border border-white/80 bg-slate-950 p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.26)]">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.28em] text-sky-300">Workspace Snapshot</p>
                <h2 class="mt-3 text-2xl font-black tracking-[-0.05em]">AI Team Knowledge Ops</h2>
              </div>
              <span class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-200">Team</span>
            </div>

            <div class="mt-8 grid gap-4">
              <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                <div class="flex items-start justify-between">
                  <div>
                    <p class="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Roadmap</p>
                    <h3 class="mt-2 text-lg font-black">LLM Onboarding Sprint</h3>
                  </div>
                  <span class="rounded-full bg-emerald-400/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
                    72% Completed
                  </span>
                </div>
                <div class="mt-5 h-2 rounded-full bg-white/10">
                  <div class="h-2 w-[72%] rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"></div>
                </div>
                <div class="mt-5 grid gap-3 text-sm text-slate-300">
                  <div class="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span>Transformer Basics</span>
                    <span class="text-emerald-300">Done</span>
                  </div>
                  <div class="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span>RAG Architecture</span>
                    <span class="text-sky-300">In Progress</span>
                  </div>
                  <div class="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
                    <span>Evaluation Playbook</span>
                    <span class="text-slate-400">Pending</span>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Research Note</p>
                  <h3 class="mt-3 text-lg font-black">Prompt Compression Notes</h3>
                  <p class="mt-3 text-sm leading-6 text-slate-300">
                    记录上下文压缩策略、失真点和可复用模板，供下一个项目直接调用。
                  </p>
                </div>
                <div class="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
                  <p class="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Artifacts</p>
                  <div class="mt-3 space-y-3 text-sm text-slate-300">
                    <div class="rounded-2xl bg-white/5 px-4 py-3">GitHub Repo</div>
                    <div class="rounded-2xl bg-white/5 px-4 py-3">Benchmark Sheet</div>
                    <div class="rounded-2xl bg-white/5 px-4 py-3">Demo Recording</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 py-20 lg:px-10">
      <div class="grid gap-6 lg:grid-cols-3">
        <div
          v-for="item in painPoints"
          :key="item.title"
          class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(148,163,184,0.08)]"
        >
          <p class="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Pain Point</p>
          <h2 class="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">{{ item.title }}</h2>
          <p class="mt-4 text-base leading-8 text-slate-600">{{ item.description }}</p>
        </div>
      </div>
    </section>

    <section id="features" class="bg-slate-950 py-24 text-white">
      <div class="mx-auto max-w-7xl px-6 lg:px-10">
        <div class="max-w-3xl">
          <p class="text-[10px] font-black uppercase tracking-[0.3em] text-sky-300">Core Capabilities</p>
          <h2 class="mt-5 text-4xl font-black tracking-[-0.05em] md:text-5xl">
            不只是写文档，而是建立 AI 团队的知识运营层
          </h2>
          <p class="mt-6 text-lg leading-8 text-slate-300">
            围绕 AI 团队的真实工作流设计，把路径、笔记、成果、成员协作和权限管理放进同一系统。
          </p>
        </div>

        <div class="mt-14 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="rounded-[1.9rem] border border-white/10 bg-white/5 p-7 shadow-[0_20px_55px_rgba(2,6,23,0.18)]"
          >
            <p class="text-[10px] font-black uppercase tracking-[0.26em] text-sky-300">{{ feature.eyebrow }}</p>
            <h3 class="mt-4 text-2xl font-black tracking-[-0.05em]">{{ feature.title }}</h3>
            <p class="mt-4 text-base leading-8 text-slate-300">{{ feature.description }}</p>
          </article>
        </div>
      </div>
    </section>

    <section id="audiences" class="mx-auto max-w-7xl px-6 py-24 lg:px-10">
      <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div class="max-w-3xl">
          <p class="text-[10px] font-black uppercase tracking-[0.28em] text-sky-600">Audience</p>
          <h2 class="mt-5 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
            尤其适合这些正在做 AI 能力沉淀的团队
          </h2>
        </div>
        <p class="max-w-2xl text-base leading-8 text-slate-600">
          如果你的团队既要训练成员，又要积累研究能力和交付资产，这套系统会比通用文档工具更贴近真实流程。
        </p>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-3">
        <article
          v-for="item in audiences"
          :key="item.title"
          class="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(148,163,184,0.08)]"
        >
          <h3 class="text-2xl font-black tracking-[-0.05em] text-slate-950">{{ item.title }}</h3>
          <p class="mt-4 text-base leading-8 text-slate-600">{{ item.description }}</p>
        </article>
      </div>
    </section>

    <section class="bg-[linear-gradient(180deg,_#ffffff_0%,_#f5f9fd_100%)] py-24">
      <div class="mx-auto max-w-7xl px-6 lg:px-10">
        <div class="max-w-3xl">
          <p class="text-[10px] font-black uppercase tracking-[0.28em] text-sky-600">Workflow</p>
          <h2 class="mt-5 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
            从路径到成果，形成一条可经营的知识流水线
          </h2>
        </div>

        <div class="mt-14 grid gap-6 lg:grid-cols-4">
          <div class="rounded-[2rem] border border-slate-200 bg-white p-7">
            <div class="text-sm font-black uppercase tracking-[0.28em] text-sky-600">01</div>
            <h3 class="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">创建路径</h3>
            <p class="mt-4 text-base leading-8 text-slate-600">搭建 onboarding、专项训练或研究路线图。</p>
          </div>
          <div class="rounded-[2rem] border border-slate-200 bg-white p-7">
            <div class="text-sm font-black uppercase tracking-[0.28em] text-sky-600">02</div>
            <h3 class="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">记录笔记</h3>
            <p class="mt-4 text-base leading-8 text-slate-600">围绕节点持续沉淀理解、问题、结论和复盘。</p>
          </div>
          <div class="rounded-[2rem] border border-slate-200 bg-white p-7">
            <div class="text-sm font-black uppercase tracking-[0.28em] text-sky-600">03</div>
            <h3 class="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">提交成果</h3>
            <p class="mt-4 text-base leading-8 text-slate-600">把 Repo、Demo、论文和实验资料挂到同一上下文里。</p>
          </div>
          <div class="rounded-[2rem] border border-slate-200 bg-white p-7">
            <div class="text-sm font-black uppercase tracking-[0.28em] text-sky-600">04</div>
            <h3 class="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">团队复用</h3>
            <p class="mt-4 text-base leading-8 text-slate-600">管理者看进度，成员复用经验，组织积累长期资产。</p>
          </div>
        </div>
      </div>
    </section>

    <section id="pricing" class="mx-auto max-w-7xl px-6 py-24 lg:px-10">
      <div class="max-w-3xl">
        <p class="text-[10px] font-black uppercase tracking-[0.28em] text-sky-600">Pricing</p>
        <h2 class="mt-5 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">
          从小团队开始，逐步升级为组织级知识运营系统
        </h2>
      </div>

      <div class="mt-14 grid gap-6 lg:grid-cols-3">
        <article
          v-for="plan in plans"
          :key="plan.name"
          :class="plan.featured ? 'border-slate-950 bg-slate-950 text-white shadow-[0_26px_70px_rgba(15,23,42,0.22)]' : 'border-slate-200 bg-white text-slate-950'"
          class="rounded-[2rem] border p-8"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-2xl font-black tracking-[-0.05em]">{{ plan.name }}</h3>
              <p :class="plan.featured ? 'text-slate-300' : 'text-slate-500'" class="mt-3 text-base leading-7">{{ plan.description }}</p>
            </div>
            <span
              v-if="plan.featured"
              class="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-sky-300"
            >
              Recommended
            </span>
          </div>
          <div class="mt-8 text-4xl font-black tracking-[-0.05em]">{{ plan.price }}</div>
          <ul class="mt-8 space-y-3 text-sm leading-7">
            <li
              v-for="bullet in plan.bullets"
              :key="bullet"
              class="rounded-2xl px-4 py-3"
              :class="plan.featured ? 'bg-white/10 text-slate-200' : 'bg-slate-50 text-slate-600'"
            >
              {{ bullet }}
            </li>
          </ul>
        </article>
      </div>
    </section>

    <section id="faq" class="mx-auto max-w-5xl px-6 py-8 pb-24 lg:px-10">
      <div class="max-w-3xl">
        <p class="text-[10px] font-black uppercase tracking-[0.28em] text-sky-600">FAQ</p>
        <h2 class="mt-5 text-4xl font-black tracking-[-0.05em] text-slate-950 md:text-5xl">常见问题</h2>
      </div>

      <div class="mt-12 space-y-4">
        <details class="group rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(148,163,184,0.08)]" open>
          <summary class="cursor-pointer list-none text-lg font-black tracking-[-0.04em] text-slate-950">
            这和 Notion 或飞书文档有什么不同？
          </summary>
          <p class="mt-4 text-base leading-8 text-slate-600">
            通用文档工具擅长写页面，我们更关注路径、过程、成果、成员协作和权限之间的关系，目标是帮助 AI 团队沉淀能力，而不只是堆积页面。
          </p>
        </details>
        <details class="group rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(148,163,184,0.08)]">
          <summary class="cursor-pointer list-none text-lg font-black tracking-[-0.04em] text-slate-950">
            适合哪些团队？
          </summary>
          <p class="mt-4 text-base leading-8 text-slate-600">
            适合 AI 创业团队、训练营、实验室，以及任何需要管理学习路径、研究记录、成果归档和知识复用的技术组织。
          </p>
        </details>
        <details class="group rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(148,163,184,0.08)]">
          <summary class="cursor-pointer list-none text-lg font-black tracking-[-0.04em] text-slate-950">
            当前支持哪些协作能力？
          </summary>
          <p class="mt-4 text-base leading-8 text-slate-600">
            当前已经支持 workspace、多角色权限、路线图管理、研究笔记、成果附件和团队成员管理，后续可以继续扩展搜索、仪表盘和组织级报表。
          </p>
        </details>
      </div>
    </section>

    <section class="px-6 pb-24 lg:px-10">
      <div class="mx-auto max-w-7xl overflow-hidden rounded-[2.4rem] bg-slate-950 px-8 py-12 text-white shadow-[0_28px_90px_rgba(15,23,42,0.24)] md:px-12 md:py-14">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div class="max-w-3xl">
            <p class="text-[10px] font-black uppercase tracking-[0.28em] text-sky-300">Final CTA</p>
            <h2 class="mt-5 text-4xl font-black tracking-[-0.05em] md:text-5xl">
              把 AI 团队的知识、路径和交付成果真正沉淀下来
            </h2>
            <p class="mt-5 text-lg leading-8 text-slate-300">
              如果你想把这个项目做成 Notion 那样能卖的产品，workspace、权限、知识资产和团队运营，就是最值得持续做深的方向。
            </p>
          </div>
          <div class="flex flex-col gap-4 sm:flex-row lg:flex-col">
            <router-link
              :to="primaryHref"
              class="inline-flex items-center justify-center rounded-[1.3rem] bg-sky-500 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:-translate-y-1 hover:bg-sky-400"
            >
              {{ primaryLabel }}
            </router-link>
            <router-link
              :to="secondaryHref"
              class="inline-flex items-center justify-center rounded-[1.3rem] border border-white/15 bg-white/10 px-7 py-4 text-[11px] font-black uppercase tracking-[0.24em] text-white transition-all hover:-translate-y-1 hover:bg-white/15"
            >
              {{ secondaryLabel }}
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
:global(:root) {
  --page-bg: #ffffff;
}
</style>
