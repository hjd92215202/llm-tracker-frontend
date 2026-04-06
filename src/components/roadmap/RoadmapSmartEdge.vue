<script setup lang="ts">
import { computed } from 'vue'
import { getSmoothStepPath, useVueFlow, type EdgeProps, type GraphNode } from '@vue-flow/core'
import { getRoadmapSmartEdgePath } from '@/utils/roadmapEdgeRouter'

const props = defineProps<EdgeProps>()

const { getNodes } = useVueFlow()

const edgePath = computed(() => {
  const [fallbackPath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
    borderRadius: 10,
    offset: 20,
  })

  return getRoadmapSmartEdgePath({
    edgeId: props.id,
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: (props.sourcePosition as string | undefined)?.toLowerCase() as any,
    targetPosition: (props.targetPosition as string | undefined)?.toLowerCase() as any,
    sourceNodeId: props.sourceNode?.id,
    targetNodeId: props.targetNode?.id,
    nodes: (getNodes.value ?? []) as GraphNode[],
    fallbackPath,
  })
})

const edgeStyle = computed(() => {
  const baseStyle: Record<string, string | number> = {
    stroke: '#d2d9e0',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
    pointerEvents: 'none',
  }

  if (props.animated) {
    baseStyle.strokeDasharray = '7 6'
    baseStyle.animation = 'roadmap-smart-edge-dash 1.3s linear infinite'
  }

  return {
    ...baseStyle,
    ...(props.style || {}),
  }
})
</script>

<template>
  <path
    :id="id"
    class="vue-flow__edge-path roadmap-smart-edge-path"
    :d="edgePath"
    :marker-start="markerStart"
    :marker-end="markerEnd"
    :style="edgeStyle"
  />
</template>

<style scoped>
@keyframes roadmap-smart-edge-dash {
  to {
    stroke-dashoffset: -26;
  }
}
</style>
