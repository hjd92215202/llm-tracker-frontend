<script setup lang="ts">
defineProps<{
  workspaceName: string
  title: string
  summary: string
  progress: number
  stats: Array<{
    label: string
    value: number | string
  }>
  tag?: string
}>()
</script>

<template>
  <div class="roadmap-hero">
    <div class="roadmap-hero-meta">
      <div class="roadmap-hero-workspace">
        {{ workspaceName }}
      </div>

      <div class="roadmap-hero-badges">
        <span v-if="tag" class="roadmap-hero-badge roadmap-hero-badge-muted">
          {{ tag }}
        </span>
        <span class="roadmap-hero-badge roadmap-hero-badge-progress">{{ progress }}%</span>
      </div>
    </div>

    <div class="roadmap-hero-main">
      <div class="min-w-0 flex-1">
        <h1 class="roadmap-hero-title">{{ title }}</h1>
        <p class="roadmap-hero-summary">
          {{ summary }}
        </p>
      </div>

      <div class="roadmap-hero-actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="roadmap-hero-stats">
      <div v-for="stat in stats" :key="stat.label" class="roadmap-hero-stat">
        <span>{{ stat.label }}</span>
        <strong>{{ stat.value }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.roadmap-hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  padding: 16px 18px 14px;
}

.roadmap-hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.roadmap-hero-workspace {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.roadmap-hero-badges {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.roadmap-hero-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 27px;
  border-radius: 999px;
  padding: 0 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.roadmap-hero-badge-muted {
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(247, 247, 245, 0.9);
  color: var(--ink-main);
}

.roadmap-hero-badge-progress {
  background: rgba(15, 23, 42, 0.08);
  color: var(--ink-strong);
}

.roadmap-hero-main {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.roadmap-hero-title {
  color: var(--ink-strong);
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: -0.07em;
  line-height: 0.98;
}

.roadmap-hero-summary {
  margin-top: 8px;
  max-width: 44rem;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.7;
}

.roadmap-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.roadmap-hero-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.roadmap-hero-stat {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 999px;
  background: rgba(247, 247, 245, 0.52);
  padding: 7px 10px;
}

.roadmap-hero-stat span {
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.roadmap-hero-stat strong {
  color: var(--ink-strong);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: -0.05em;
  line-height: 1;
}

@media (min-width: 768px) {
  .roadmap-hero {
    gap: 14px;
    padding: 18px 22px 16px;
  }

  .roadmap-hero-main {
    flex-direction: row;
    align-items: end;
    justify-content: space-between;
    gap: 18px;
  }

  .roadmap-hero-title {
    font-size: 2.2rem;
  }

  .roadmap-hero-summary {
    font-size: 14px;
  }
}
</style>
