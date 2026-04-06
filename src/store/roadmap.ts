import { defineStore } from 'pinia'
import { roadmapApi } from '@/api/roadmap'
import { useAuthStore } from '@/store/auth'
import type { RoadmapNode, RoadmapTreeMutationItem } from '@/types'
import { buildRoadmapTree } from '@/utils/roadmapTree'

interface RoadmapState {
  nodes: RoadmapNode[]
  loading: boolean
  errorMessage: string
  selectedNodeId: number | null
  lastWorkspaceId: number | null
}

export const useRoadmapStore = defineStore('roadmap', {
  state: (): RoadmapState => ({
    nodes: [],
    loading: false,
    errorMessage: '',
    selectedNodeId: null,
    lastWorkspaceId: null,
  }),

  getters: {
    hasNodes: (state) => state.nodes.length > 0,
    selectedNode: (state) => state.nodes.find((node) => node.id === state.selectedNodeId) ?? null,
    tree: (state) => buildRoadmapTree(state.nodes),
  },

  actions: {
    selectNode(nodeId: number | null) {
      this.selectedNodeId = nodeId
    },

    clearState() {
      this.nodes = []
      this.loading = false
      this.errorMessage = ''
      this.selectedNodeId = null
      this.lastWorkspaceId = null
    },

    async ensureLoaded(force = false) {
      const authStore = useAuthStore()
      const workspaceId = authStore.activeWorkspaceId

      if (!workspaceId) {
        this.clearState()
        return
      }

      if (!force && this.lastWorkspaceId === workspaceId && this.nodes.length > 0) {
        return
      }

      await this.fetchNodes()
    },

    async fetchNodes() {
      const authStore = useAuthStore()
      const workspaceId = authStore.activeWorkspaceId

      if (!workspaceId) {
        this.clearState()
        return
      }

      this.loading = true
      this.errorMessage = ''

      try {
        this.nodes = await roadmapApi.getNodes()
        this.lastWorkspaceId = workspaceId
        if (this.selectedNodeId && !this.nodes.some((node) => node.id === this.selectedNodeId)) {
          this.selectedNodeId = null
        }
      } catch (error: any) {
        this.nodes = []
        this.errorMessage = error.message || 'Unable to load roadmap'
      } finally {
        this.loading = false
      }
    },

    async createNode(data: Partial<RoadmapNode>) {
      const created = await roadmapApi.createNode(data)
      this.nodes = [...this.nodes, created]
      return created
    },

    async patchNode(id: number, data: Partial<RoadmapNode>) {
      const updated = await roadmapApi.patchNode(id, data)
      this.nodes = this.nodes.map((node) => (node.id === id ? updated : node))
      return updated
    },

    async updateTree(nodes: RoadmapTreeMutationItem[]) {
      const updatedNodes = await roadmapApi.updateTree(nodes)
      this.nodes = updatedNodes
      if (this.selectedNodeId && !updatedNodes.some((node) => node.id === this.selectedNodeId)) {
        this.selectedNodeId = null
      }
      return updatedNodes
    },

    async deleteNode(id: number) {
      const updatedNodes = await roadmapApi.deleteNode(id)
      this.nodes = updatedNodes
      if (this.selectedNodeId === id || !updatedNodes.some((node) => node.id === this.selectedNodeId)) {
        this.selectedNodeId = null
      }
      return updatedNodes
    },
  },
})
