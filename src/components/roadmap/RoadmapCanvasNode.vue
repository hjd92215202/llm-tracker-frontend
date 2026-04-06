<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'

type RoadmapCanvasNodeData = {
  title: string
  status: 'todo' | 'in_progress' | 'completed'
  noteCount: number
  subtreeProgress: number
  typeLabel: string
  statusLabel: string
}

const props = defineProps<NodeProps<RoadmapCanvasNodeData>>()
</script>

<template>
  <div class="roadmap-canvas-node" :class="[`roadmap-canvas-node-${props.data.status}`, props.selected ? 'roadmap-canvas-node-selected' : '']">
    <div class="roadmap-canvas-node-top">
      <span class="roadmap-canvas-node-type">{{ props.data.typeLabel }}</span>
      <span class="roadmap-canvas-node-status">{{ props.data.statusLabel }}</span>
    </div>

    <div class="roadmap-canvas-node-title">{{ props.data.title }}</div>

    <div class="roadmap-canvas-node-meta">
      <span>{{ props.data.noteCount }} {{ props.data.noteCount === 1 ? 'note' : 'notes' }}</span>
      <span>{{ props.data.subtreeProgress }}%</span>
    </div>

    <div class="roadmap-canvas-node-progress">
      <span :style="{ width: `${props.data.subtreeProgress}%` }"></span>
    </div>

    <Handle type="target" :position="Position.Left" class="!opacity-0" />
    <Handle type="source" :position="Position.Right" class="!opacity-0" />
  </div>
</template>

<style scoped>
.roadmap-canvas-node {
  min-width: 220px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.96);
  padding: 12px 14px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.06);
}

.roadmap-canvas-node-selected {
  border-color: rgba(229, 106, 43, 0.32);
  box-shadow: 0 0 0 4px rgba(229, 106, 43, 0.08), 0 16px 28px rgba(15, 23, 42, 0.08);
}

.roadmap-canvas-node-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.roadmap-canvas-node-type,
.roadmap-canvas-node-status {
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.roadmap-canvas-node-type {
  background: rgba(15, 23, 42, 0.07);
  color: var(--ink-main);
}

.roadmap-canvas-node-status {
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent);
}

.roadmap-canvas-node-completed .roadmap-canvas-node-status {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.roadmap-canvas-node-todo .roadmap-canvas-node-status {
  background: rgba(71, 85, 105, 0.12);
  color: #334155;
}

.roadmap-canvas-node-title {
  margin-top: 10px;
  color: var(--ink-strong);
  font-size: 15px;
  font-weight: 800;
  line-height: 1.35;
}

.roadmap-canvas-node-meta {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
}

.roadmap-canvas-node-progress {
  margin-top: 8px;
  height: 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.roadmap-canvas-node-progress span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(229, 106, 43, 0.9), rgba(37, 99, 235, 0.86));
}
</style>
