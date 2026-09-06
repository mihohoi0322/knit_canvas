import { PERCENT_PALETTE } from './percentPalette'
import type {
  CellColor,
  GridPoint,
  PatternProject,
  ProjectFileV1,
} from './types'

export const MAX_GRID_SIZE = 200
export const MAX_PROJECT_FILE_BYTES = 5 * 1024 * 1024

export async function readProjectFile(file: File): Promise<ProjectFileV1> {
  if (file.size > MAX_PROJECT_FILE_BYTES)
    throw new Error('ファイルは5MB以下にしてください')
  return parseProjectFile(JSON.parse(await file.text()))
}

export function normalizeRepeatCount(value: number): 3 | 5 | 8 {
  if (value === 1 || value === 3) return 3
  if (value === 5 || value === 8) return value
  throw new Error('リピート回数が不正です')
}

export function cellIndex(
  point: GridPoint,
  columns: number,
  rows: number,
): number {
  if (point.x < 0 || point.y < 0 || point.x >= columns || point.y >= rows)
    return -1
  return point.y * columns + point.x
}

export function dimensions(
  project: Pick<
    PatternProject,
    'columns' | 'rows' | 'stitchesPer10cm' | 'rowsPer10cm'
  >,
) {
  return {
    widthCm: (project.columns / project.stitchesPer10cm) * 10,
    heightCm: (project.rows / project.rowsPer10cm) * 10,
    cellAspectRatio: project.rowsPer10cm / project.stitchesPer10cm,
  }
}

export function interpolateLine(start: GridPoint, end: GridPoint): GridPoint[] {
  if (
    [start.x, start.y, end.x, end.y].some(
      (value) =>
        !Number.isInteger(value) || value < 0 || value >= MAX_GRID_SIZE,
    )
  )
    return []
  const points: GridPoint[] = []
  let x = start.x
  let y = start.y
  const dx = Math.abs(end.x - start.x)
  const sx = start.x < end.x ? 1 : -1
  const dy = -Math.abs(end.y - start.y)
  const sy = start.y < end.y ? 1 : -1
  let error = dx + dy
  while (true) {
    points.push({ x, y })
    if (x === end.x && y === end.y) break
    const e2 = 2 * error
    if (e2 >= dy) {
      error += dy
      x += sx
    }
    if (e2 <= dx) {
      error += dx
      y += sy
    }
  }
  return points
}

export function paintCells(
  cells: CellColor[],
  columns: number,
  rows: number,
  points: GridPoint[],
  color: CellColor,
) {
  const next = [...cells]
  for (const point of points) {
    const index = cellIndex(point, columns, rows)
    if (index >= 0) next[index] = color
  }
  return next
}

export function resizeCells(
  cells: CellColor[],
  oldColumns: number,
  oldRows: number,
  columns: number,
  rows: number,
) {
  const next = Array<CellColor>(columns * rows).fill(null)
  for (let y = 0; y < Math.min(oldRows, rows); y += 1) {
    for (let x = 0; x < Math.min(oldColumns, columns); x += 1)
      next[y * columns + x] = cells[y * oldColumns + x]
  }
  return next
}

export function resizeLosesPaint(
  cells: CellColor[],
  oldColumns: number,
  oldRows: number,
  columns: number,
  rows: number,
) {
  if (columns >= oldColumns && rows >= oldRows) return false
  return cells.some(
    (color, index) =>
      color !== null &&
      (index % oldColumns >= columns || Math.floor(index / oldColumns) >= rows),
  )
}

export function usedColorIds(cells: CellColor[]) {
  return [...new Set(cells.filter((color): color is string => color !== null))]
}

export function createProject(now = new Date().toISOString()): PatternProject {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `project-${Date.now()}`,
    name: '新しいパターン',
    columns: 20,
    rows: 20,
    stitchesPer10cm: 22,
    rowsPer10cm: 30,
    palette: PERCENT_PALETTE.map((color) => ({ ...color })),
    recentColorIds: [],
    cells: Array<CellColor>(400).fill(null),
    repeatCount: 5,
    createdAt: now,
    updatedAt: now,
  }
}

export function toProjectFile(project: PatternProject): ProjectFileV1 {
  return { format: 'knitcanvas', version: 1, project }
}

export function parseProjectFile(value: unknown): ProjectFileV1 {
  if (!value || typeof value !== 'object')
    throw new Error('ファイルを読み取れません')
  const file = value as Partial<ProjectFileV1>
  if (file.format !== 'knitcanvas' || file.version !== 1 || !file.project)
    throw new Error('未対応のKnit Canvasファイルです')
  const p = file.project
  if (
    !Number.isInteger(p.columns) ||
    p.columns < 1 ||
    p.columns > MAX_GRID_SIZE ||
    !Number.isInteger(p.rows) ||
    p.rows < 1 ||
    p.rows > MAX_GRID_SIZE
  )
    throw new Error('方眼サイズが範囲外です')
  if (
    !Number.isFinite(p.stitchesPer10cm) ||
    !Number.isFinite(p.rowsPer10cm) ||
    !(p.stitchesPer10cm > 0) ||
    !(p.rowsPer10cm > 0) ||
    !Number.isFinite(p.rowsPer10cm / p.stitchesPer10cm) ||
    p.rowsPer10cm / p.stitchesPer10cm === 0
  )
    throw new Error('ゲージは0より大きくしてください')
  if (
    !Array.isArray(p.palette) ||
    p.palette.length < 1 ||
    p.palette.length > 256 ||
    !Array.isArray(p.cells) ||
    p.cells.length !== p.columns * p.rows
  )
    throw new Error('パターンデータが不正です')
  if (
    [p.id, p.name, p.createdAt, p.updatedAt].some(
      (value) => typeof value !== 'string',
    ) ||
    p.palette.some(
      (color) =>
        !color ||
        typeof color.id !== 'string' ||
        !color.id ||
        typeof color.name !== 'string' ||
        typeof color.value !== 'string' ||
        (color.yarn !== undefined && typeof color.yarn !== 'string') ||
        (color.colorNumber !== undefined &&
          (typeof color.colorNumber !== 'string' ||
            !/^\d{1,4}$/.test(color.colorNumber))) ||
        !/^#[0-9a-fA-F]{6}$/.test(color.value),
    )
  )
    throw new Error('パターンデータが不正です')
  const ids = new Set(p.palette.map((color) => color.id))
  if (ids.size !== p.palette.length) throw new Error('色のIDが重複しています')
  if (p.cells.some((color) => color !== null && !ids.has(color)))
    throw new Error('存在しない色が使われています')
  if (
    p.recentColorIds !== undefined &&
    (!Array.isArray(p.recentColorIds) ||
      p.recentColorIds.length > 5 ||
      new Set(p.recentColorIds).size !== p.recentColorIds.length ||
      p.recentColorIds.some((id) => typeof id !== 'string' || !ids.has(id)))
  )
    throw new Error('最近使った色が不正です')
  const repeatCount = normalizeRepeatCount(p.repeatCount)
  return { ...file, project: { ...p, repeatCount } } as ProjectFileV1
}

export function rowColorUsage(
  project: Pick<PatternProject, 'cells' | 'columns' | 'rows'>,
) {
  return Array.from({ length: project.rows }, (_, index) => ({
    row: index + 1,
    colorIds: usedColorIds(
      project.cells.slice(
        index * project.columns,
        (index + 1) * project.columns,
      ),
    ),
  }))
}
