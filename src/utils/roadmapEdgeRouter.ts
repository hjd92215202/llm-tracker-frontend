import type { GraphNode } from '@vue-flow/core'

type HandlePosition = 'left' | 'right' | 'top' | 'bottom' | undefined

interface Point {
  x: number
  y: number
}

interface Rect {
  x: number
  y: number
  x2: number
  y2: number
}

interface SearchState extends Point {
  key: string
  g: number
  f: number
  dir: DirectionKey | null
}

type DirectionKey = 'up' | 'down' | 'left' | 'right'

interface Direction {
  key: DirectionKey
  dx: number
  dy: number
}

interface RouteParams {
  edgeId: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition?: HandlePosition
  targetPosition?: HandlePosition
  sourceNodeId?: string
  targetNodeId?: string
  nodes: GraphNode[]
  fallbackPath: string
}

const OBSTACLE_PADDING = 14
const EDGE_OFFSET = 18
const GRID_SIZE = 20
const TURN_PENALTY = 8
const SEARCH_MARGIN = 80
const MAX_ITERATIONS = 9000
const SEARCH_TIMEOUT_MS = 16
const CORNER_RADIUS = 10
const CACHE_MAX_SIZE = 700

const DIRECTIONS: Direction[] = [
  { key: 'up', dx: 0, dy: -GRID_SIZE },
  { key: 'down', dx: 0, dy: GRID_SIZE },
  { key: 'left', dx: -GRID_SIZE, dy: 0 },
  { key: 'right', dx: GRID_SIZE, dy: 0 },
]

const routeCache = new Map<string, string>()

const round1 = (value: number) => Math.round(value * 10) / 10
const pointKey = (point: Point) => `${point.x},${point.y}`
const parsePointKey = (key: string): Point => {
  const [x, y] = key.split(',')
  return {
    x: Number(x),
    y: Number(y),
  }
}

const distance = (from: Point, to: Point) => Math.abs(from.x - to.x) + Math.abs(from.y - to.y)

const isCollinear = (a: Point, b: Point, c: Point) => Math.abs((b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)) < 0.01

const normalizePosition = (position: HandlePosition): HandlePosition => {
  if (!position) return undefined
  const value = String(position).toLowerCase()
  if (value === 'left' || value === 'right' || value === 'top' || value === 'bottom') {
    return value
  }
  return undefined
}

const inferPosition = (from: Point, to: Point): HandlePosition => {
  const dx = to.x - from.x
  const dy = to.y - from.y

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx >= 0 ? 'right' : 'left'
  }
  return dy >= 0 ? 'bottom' : 'top'
}

const offsetFromHandle = (point: Point, position: HandlePosition, fallbackTarget: Point) => {
  const resolved = normalizePosition(position) ?? inferPosition(point, fallbackTarget)
  if (resolved === 'left') return { x: point.x - EDGE_OFFSET, y: point.y }
  if (resolved === 'right') return { x: point.x + EDGE_OFFSET, y: point.y }
  if (resolved === 'top') return { x: point.x, y: point.y - EDGE_OFFSET }
  return { x: point.x, y: point.y + EDGE_OFFSET }
}

const gridSnap = (point: Point) => ({
  x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(point.y / GRID_SIZE) * GRID_SIZE,
})

const simplifyPoints = (points: Point[]) => {
  const deduped: Point[] = []

  for (const point of points) {
    const last = deduped[deduped.length - 1]
    if (!last || Math.abs(last.x - point.x) > 0.01 || Math.abs(last.y - point.y) > 0.01) {
      deduped.push(point)
    }
  }

  if (deduped.length < 3) return deduped

  const compressed: Point[] = [deduped[0]!]
  for (let index = 1; index < deduped.length - 1; index += 1) {
    const prev = compressed[compressed.length - 1]!
    const current = deduped[index]!
    const next = deduped[index + 1]!
    if (isCollinear(prev, current, next)) continue
    compressed.push(current)
  }
  compressed.push(deduped[deduped.length - 1]!)

  return compressed
}

const buildRoundedPath = (points: Point[]) => {
  if (points.length < 2) return ''

  const cleaned = simplifyPoints(points)
  if (cleaned.length < 2) return ''

  const first = cleaned[0]!
  let d = `M ${round1(first.x)} ${round1(first.y)}`

  if (cleaned.length === 2) {
    const last = cleaned[1]!
    return `${d} L ${round1(last.x)} ${round1(last.y)}`
  }

  for (let index = 1; index < cleaned.length - 1; index += 1) {
    const prev = cleaned[index - 1]!
    const current = cleaned[index]!
    const next = cleaned[index + 1]!

    const inVector = { x: current.x - prev.x, y: current.y - prev.y }
    const outVector = { x: next.x - current.x, y: next.y - current.y }
    const inLength = Math.hypot(inVector.x, inVector.y)
    const outLength = Math.hypot(outVector.x, outVector.y)

    if (inLength < 0.001 || outLength < 0.001 || isCollinear(prev, current, next)) {
      d += ` L ${round1(current.x)} ${round1(current.y)}`
      continue
    }

    const radius = Math.min(CORNER_RADIUS, inLength / 2, outLength / 2)
    const inUnit = { x: inVector.x / inLength, y: inVector.y / inLength }
    const outUnit = { x: outVector.x / outLength, y: outVector.y / outLength }

    const cornerStart = {
      x: current.x - inUnit.x * radius,
      y: current.y - inUnit.y * radius,
    }
    const cornerEnd = {
      x: current.x + outUnit.x * radius,
      y: current.y + outUnit.y * radius,
    }

    d += ` L ${round1(cornerStart.x)} ${round1(cornerStart.y)}`
    d += ` Q ${round1(current.x)} ${round1(current.y)} ${round1(cornerEnd.x)} ${round1(cornerEnd.y)}`
  }

  const last = cleaned[cleaned.length - 1]!
  d += ` L ${round1(last.x)} ${round1(last.y)}`

  return d
}

const getNodeRect = (node: GraphNode): Rect => {
  const width = Number(node.dimensions?.width || 0) > 0 ? Number(node.dimensions.width) : 208
  const height = Number(node.dimensions?.height || 0) > 0 ? Number(node.dimensions.height) : 56
  const x = node.computedPosition.x - OBSTACLE_PADDING
  const y = node.computedPosition.y - OBSTACLE_PADDING

  return {
    x,
    y,
    x2: x + width + OBSTACLE_PADDING * 2,
    y2: y + height + OBSTACLE_PADDING * 2,
  }
}

const isBlockedByRects = (point: Point, rects: Rect[]) =>
  rects.some((rect) => point.x >= rect.x && point.x <= rect.x2 && point.y >= rect.y && point.y <= rect.y2)

const rebuildPathPoints = (parents: Map<string, string | null>, targetKey: string) => {
  const result: Point[] = []
  let cursor: string | null = targetKey

  while (cursor) {
    result.push(parsePointKey(cursor))
    cursor = parents.get(cursor) ?? null
  }

  result.reverse()
  return result
}

const buildLayoutVersion = (nodes: GraphNode[]) => {
  if (nodes.length === 0) return 'layout:0'
  const sorted = [...nodes].sort((left, right) => Number(left.id) - Number(right.id))
  return sorted
    .map((node) => {
      const width = Number(node.dimensions?.width || 0)
      const height = Number(node.dimensions?.height || 0)
      return `${node.id}:${Math.round(node.computedPosition.x)}:${Math.round(node.computedPosition.y)}:${Math.round(width)}:${Math.round(height)}`
    })
    .join('|')
}

const trimCache = () => {
  if (routeCache.size <= CACHE_MAX_SIZE) return
  let count = 0
  for (const key of routeCache.keys()) {
    routeCache.delete(key)
    count += 1
    if (count >= Math.floor(CACHE_MAX_SIZE * 0.3)) break
  }
}

export const getRoadmapSmartEdgePath = ({
  edgeId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  sourceNodeId,
  targetNodeId,
  nodes,
  fallbackPath,
}: RouteParams) => {
  if (!Number.isFinite(sourceX) || !Number.isFinite(sourceY) || !Number.isFinite(targetX) || !Number.isFinite(targetY)) {
    return fallbackPath
  }

  const layoutVersion = buildLayoutVersion(nodes)
  const cacheKey = `${edgeId}|${layoutVersion}|${Math.round(sourceX)}:${Math.round(sourceY)}:${Math.round(targetX)}:${Math.round(targetY)}`
  const cachedPath = routeCache.get(cacheKey)
  if (cachedPath) return cachedPath

  const sourcePoint = { x: sourceX, y: sourceY }
  const targetPoint = { x: targetX, y: targetY }
  const sourceAnchor = offsetFromHandle(sourcePoint, sourcePosition, targetPoint)
  const targetAnchor = offsetFromHandle(targetPoint, targetPosition, sourcePoint)

  const obstacleRects = nodes
    .filter((node) => node.id !== sourceNodeId && node.id !== targetNodeId)
    .map(getNodeRect)

  const boundsX = [sourceAnchor.x, targetAnchor.x, ...obstacleRects.flatMap((rect) => [rect.x, rect.x2])]
  const boundsY = [sourceAnchor.y, targetAnchor.y, ...obstacleRects.flatMap((rect) => [rect.y, rect.y2])]

  const rawMinX = Math.min(...boundsX) - SEARCH_MARGIN
  const rawMaxX = Math.max(...boundsX) + SEARCH_MARGIN
  const rawMinY = Math.min(...boundsY) - SEARCH_MARGIN
  const rawMaxY = Math.max(...boundsY) + SEARCH_MARGIN

  const minX = Math.floor(rawMinX / GRID_SIZE) * GRID_SIZE
  const maxX = Math.ceil(rawMaxX / GRID_SIZE) * GRID_SIZE
  const minY = Math.floor(rawMinY / GRID_SIZE) * GRID_SIZE
  const maxY = Math.ceil(rawMaxY / GRID_SIZE) * GRID_SIZE

  const start = gridSnap(sourceAnchor)
  const end = gridSnap(targetAnchor)
  const startKey = pointKey(start)
  const endKey = pointKey(end)
  const searchStartedAt = Date.now()

  const open = new Map<string, SearchState>()
  const gScore = new Map<string, number>()
  const parents = new Map<string, string | null>()

  const startState: SearchState = {
    ...start,
    key: startKey,
    g: 0,
    f: distance(start, end),
    dir: null,
  }

  open.set(startKey, startState)
  gScore.set(startKey, 0)
  parents.set(startKey, null)

  let iterations = 0
  let found = false

  while (open.size > 0 && iterations < MAX_ITERATIONS && Date.now() - searchStartedAt < SEARCH_TIMEOUT_MS) {
    iterations += 1

    let current: SearchState | null = null
    for (const state of open.values()) {
      if (!current || state.f < current.f) {
        current = state
      }
    }
    if (!current) break

    open.delete(current.key)

    if (current.key === endKey) {
      found = true
      break
    }

    for (const direction of DIRECTIONS) {
      const nextPoint = {
        x: current.x + direction.dx,
        y: current.y + direction.dy,
      }
      if (nextPoint.x < minX || nextPoint.x > maxX || nextPoint.y < minY || nextPoint.y > maxY) continue

      const nextKey = pointKey(nextPoint)
      if (nextKey !== endKey && nextKey !== startKey && isBlockedByRects(nextPoint, obstacleRects)) continue

      const turnCost = current.dir && current.dir !== direction.key ? TURN_PENALTY : 0
      const tentativeG = current.g + GRID_SIZE + turnCost
      const prevBest = gScore.get(nextKey)

      if (prevBest !== undefined && tentativeG >= prevBest) continue

      gScore.set(nextKey, tentativeG)
      parents.set(nextKey, current.key)
      open.set(nextKey, {
        ...nextPoint,
        key: nextKey,
        g: tentativeG,
        f: tentativeG + distance(nextPoint, end),
        dir: direction.key,
      })
    }
  }

  if (!found) {
    routeCache.set(cacheKey, fallbackPath)
    trimCache()
    return fallbackPath
  }

  const gridPoints = rebuildPathPoints(parents, endKey)
  const composedPoints = simplifyPoints([
    sourcePoint,
    sourceAnchor,
    ...gridPoints,
    targetAnchor,
    targetPoint,
  ])

  if (composedPoints.length < 2) {
    routeCache.set(cacheKey, fallbackPath)
    trimCache()
    return fallbackPath
  }

  const routedPath = buildRoundedPath(composedPoints)
  if (!routedPath) {
    routeCache.set(cacheKey, fallbackPath)
    trimCache()
    return fallbackPath
  }

  routeCache.set(cacheKey, routedPath)
  trimCache()
  return routedPath
}

export const clearRoadmapEdgeRouteCache = () => {
  routeCache.clear()
}
