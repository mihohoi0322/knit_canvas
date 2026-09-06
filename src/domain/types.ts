export type RepeatCount = 3 | 5 | 8
export type Tool = 'pencil' | 'eraser'
export type CellColor = string | null

export type YarnColor = {
  id: string
  name: string
  yarn?: string
  colorNumber?: string
  value: string
}

export type PatternProject = {
  id: string
  name: string
  columns: number
  rows: number
  stitchesPer10cm: number
  rowsPer10cm: number
  palette: YarnColor[]
  recentColorIds?: string[]
  cells: CellColor[]
  repeatCount: RepeatCount
  createdAt: string
  updatedAt: string
}

export type ProjectFileV1 = {
  format: 'knitcanvas'
  version: 1
  project: PatternProject
}

export type GridPoint = { x: number; y: number }

export interface ProjectRepository {
  loadLast(): Promise<PatternProject | undefined>
  save(project: PatternProject): Promise<void>
}
