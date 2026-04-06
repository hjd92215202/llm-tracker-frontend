import type { RoadmapNode, RoadmapTreeMutationItem } from '@/types'

export interface RoadmapTreeNode {
  id: number
  node: RoadmapNode
  parentId: number | null
  depth: number
  children: RoadmapTreeNode[]
}

export interface FlatRoadmapTreeItem {
  id: number
  node: RoadmapNode
  depth: number
  parentId: number | null
  childrenCount: number
}

export type RoadmapNodeMoveDirection = 'up' | 'down' | 'indent' | 'outdent'

export interface RoadmapNodeMoveState {
  canMoveUp: boolean
  canMoveDown: boolean
  canIndent: boolean
  canOutdent: boolean
}

const sortNodes = (nodes: RoadmapNode[]) =>
  [...nodes].sort((left, right) => left.sort_order - right.sort_order || left.id - right.id)

const cloneTree = (node: RoadmapTreeNode): RoadmapTreeNode => ({
  id: node.id,
  node: { ...node.node },
  parentId: node.parentId,
  depth: node.depth,
  children: node.children.map(cloneTree),
})

interface TreeLocation {
  node: RoadmapTreeNode
  container: RoadmapTreeNode[]
  index: number
  parent: RoadmapTreeNode | null
  parentContainer: RoadmapTreeNode[] | null
  parentIndex: number
}

const buildBranch = (
  node: RoadmapNode,
  childrenByParent: Map<number | null, RoadmapNode[]>,
  depth: number,
): RoadmapTreeNode => {
  const children = (childrenByParent.get(node.id) ?? []).map((child) => buildBranch(child, childrenByParent, depth + 1))

  return {
    id: node.id,
    node,
    parentId: node.parent_id ?? null,
    depth,
    children,
  }
}

export const buildRoadmapTree = (nodes: RoadmapNode[]): RoadmapTreeNode[] => {
  const sortedNodes = sortNodes(nodes)
  const childrenByParent = new Map<number | null, RoadmapNode[]>()

  for (const node of sortedNodes) {
    const parentId = node.parent_id ?? null
    const bucket = childrenByParent.get(parentId) ?? []
    bucket.push(node)
    childrenByParent.set(parentId, bucket)
  }

  return (childrenByParent.get(null) ?? []).map((node) => buildBranch(node, childrenByParent, 0))
}

export const cloneRoadmapTree = (tree: RoadmapTreeNode[]) => tree.map(cloneTree)

const findTreeLocation = (
  tree: RoadmapTreeNode[],
  targetId: number,
  parent: RoadmapTreeNode | null = null,
  parentContainer: RoadmapTreeNode[] | null = null,
  parentIndex = -1,
): TreeLocation | null => {
  for (const [index, node] of tree.entries()) {
    if (node.id === targetId) {
      return {
        node,
        container: tree,
        index,
        parent,
        parentContainer,
        parentIndex,
      }
    }

    const nested = findTreeLocation(node.children, targetId, node, tree, index)
    if (nested) {
      return nested
    }
  }

  return null
}

export const flattenRoadmapTree = (tree: RoadmapTreeNode[], depth = 0): FlatRoadmapTreeItem[] => {
  const items: FlatRoadmapTreeItem[] = []

  for (const item of tree) {
    items.push({
      id: item.id,
      node: item.node,
      depth,
      parentId: item.parentId,
      childrenCount: item.children.length,
    })
    items.push(...flattenRoadmapTree(item.children, depth + 1))
  }

  return items
}

export const serializeRoadmapTree = (tree: RoadmapTreeNode[]): RoadmapTreeMutationItem[] => {
  const items: RoadmapTreeMutationItem[] = []

  const walk = (nodes: RoadmapTreeNode[], parentId: number | null) => {
    nodes.forEach((node, index) => {
      items.push({
        id: node.id,
        parent_id: parentId,
        sort_order: index,
      })
      walk(node.children, node.id)
    })
  }

  walk(tree, null)
  return items
}

export const getRoadmapNodeMoveState = (
  nodes: RoadmapNode[],
  targetId: number | null,
): RoadmapNodeMoveState => {
  if (!targetId) {
    return {
      canMoveUp: false,
      canMoveDown: false,
      canIndent: false,
      canOutdent: false,
    }
  }

  const location = findTreeLocation(buildRoadmapTree(nodes), targetId)
  if (!location) {
    return {
      canMoveUp: false,
      canMoveDown: false,
      canIndent: false,
      canOutdent: false,
    }
  }

  return {
    canMoveUp: location.index > 0,
    canMoveDown: location.index < location.container.length - 1,
    canIndent: location.index > 0,
    canOutdent: Boolean(location.parent && location.parentContainer && location.parentIndex >= 0),
  }
}

export const moveRoadmapNode = (
  nodes: RoadmapNode[],
  targetId: number,
  direction: RoadmapNodeMoveDirection,
): RoadmapTreeMutationItem[] | null => {
  const tree = cloneRoadmapTree(buildRoadmapTree(nodes))
  const location = findTreeLocation(tree, targetId)

  if (!location) {
    return null
  }

  if (direction === 'up') {
    if (location.index === 0) return null
    const previousIndex = location.index - 1
    ;[location.container[previousIndex], location.container[location.index]] = [
      location.container[location.index]!,
      location.container[previousIndex]!,
    ]
    return serializeRoadmapTree(tree)
  }

  if (direction === 'down') {
    if (location.index >= location.container.length - 1) return null
    const nextIndex = location.index + 1
    ;[location.container[nextIndex], location.container[location.index]] = [
      location.container[location.index]!,
      location.container[nextIndex]!,
    ]
    return serializeRoadmapTree(tree)
  }

  if (direction === 'indent') {
    if (location.index === 0) return null
    const previousSibling = location.container[location.index - 1]
    if (!previousSibling) return null
    const [node] = location.container.splice(location.index, 1)
    if (!node) return null
    previousSibling.children.push(node)
    return serializeRoadmapTree(tree)
  }

  if (!location.parent || !location.parentContainer || location.parentIndex < 0) {
    return null
  }

  const [node] = location.container.splice(location.index, 1)
  if (!node) return null
  location.parentContainer.splice(location.parentIndex + 1, 0, node)
  return serializeRoadmapTree(tree)
}

export const findRoadmapPath = (tree: RoadmapTreeNode[], targetId: number | null): RoadmapTreeNode[] => {
  if (!targetId) return []

  const visit = (nodes: RoadmapTreeNode[], path: RoadmapTreeNode[]): RoadmapTreeNode[] | null => {
    for (const node of nodes) {
      const nextPath = [...path, node]
      if (node.id === targetId) {
        return nextPath
      }

      const nested = visit(node.children, nextPath)
      if (nested) {
        return nested
      }
    }

    return null
  }

  return visit(tree, []) ?? []
}
