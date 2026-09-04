import { create } from 'zustand'
import { createProject, paintCells, resizeCells } from '../domain/project'
import type {
  CellColor,
  GridPoint,
  PatternProject,
  RepeatCount,
  Tool,
} from '../domain/types'

type Snapshot = Pick<PatternProject, 'columns' | 'rows' | 'cells'>
type EditorState = {
  project: PatternProject
  tool: Tool
  selectedColorId: string
  past: Snapshot[]
  future: Snapshot[]
  strokeStart?: Snapshot
  beginStroke(): void
  paint(points: GridPoint[]): void
  endStroke(): void
  setTool(tool: Tool): void
  setSelectedColor(id: string): void
  updateProject(patch: Partial<PatternProject>): void
  resize(columns: number, rows: number): void
  clear(): void
  undo(): void
  redo(): void
  replace(project: PatternProject): void
  setRepeatCount(count: RepeatCount): void
}

const snapshot = (project: PatternProject): Snapshot => ({
  columns: project.columns,
  rows: project.rows,
  cells: [...project.cells],
})
const restore = (project: PatternProject, value: Snapshot): PatternProject => ({
  ...project,
  ...value,
  updatedAt: new Date().toISOString(),
})

export const useEditorStore = create<EditorState>((set, get) => ({
  project: createProject(),
  tool: 'pencil',
  selectedColorId: 'brick',
  past: [],
  future: [],
  beginStroke: () => set({ strokeStart: snapshot(get().project) }),
  paint: (points) =>
    set((state) => {
      const color: CellColor =
        state.tool === 'eraser' ? null : state.selectedColorId
      const cells = paintCells(
        state.project.cells,
        state.project.columns,
        state.project.rows,
        points,
        color,
      )
      return {
        project: {
          ...state.project,
          cells,
          updatedAt: new Date().toISOString(),
        },
      }
    }),
  endStroke: () =>
    set((state) => {
      if (
        !state.strokeStart ||
        state.strokeStart.cells.every(
          (cell, i) => cell === state.project.cells[i],
        )
      )
        return { strokeStart: undefined }
      return {
        past: [...state.past, state.strokeStart].slice(-100),
        future: [],
        strokeStart: undefined,
      }
    }),
  setTool: (tool) => set({ tool }),
  setSelectedColor: (selectedColorId) =>
    set({ selectedColorId, tool: 'pencil' }),
  updateProject: (patch) =>
    set((state) => ({
      project: {
        ...state.project,
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    })),
  resize: (columns, rows) =>
    set((state) => ({
      past: [...state.past, snapshot(state.project)].slice(-100),
      future: [],
      project: {
        ...state.project,
        columns,
        rows,
        cells: resizeCells(
          state.project.cells,
          state.project.columns,
          state.project.rows,
          columns,
          rows,
        ),
        updatedAt: new Date().toISOString(),
      },
    })),
  clear: () =>
    set((state) => ({
      past: [...state.past, snapshot(state.project)].slice(-100),
      future: [],
      project: {
        ...state.project,
        cells: Array<CellColor>(
          state.project.columns * state.project.rows,
        ).fill(null),
        updatedAt: new Date().toISOString(),
      },
    })),
  undo: () =>
    set((state) => {
      const previous = state.past.at(-1)
      if (!previous) return state
      return {
        project: restore(state.project, previous),
        past: state.past.slice(0, -1),
        future: [snapshot(state.project), ...state.future].slice(0, 100),
      }
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0]
      if (!next) return state
      return {
        project: restore(state.project, next),
        past: [...state.past, snapshot(state.project)].slice(-100),
        future: state.future.slice(1),
      }
    }),
  replace: (project) =>
    set({ project, past: [], future: [], strokeStart: undefined }),
  setRepeatCount: (repeatCount) =>
    set((state) => ({
      project: {
        ...state.project,
        repeatCount,
        updatedAt: new Date().toISOString(),
      },
    })),
}))
