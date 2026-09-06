import { beforeEach, describe, expect, it } from 'vitest'
import { createProject } from '../domain/project'
import { useEditorStore } from './editorStore'

describe('editor store', () => {
  beforeEach(() => useEditorStore.getState().replace(createProject()))
  it('groups a stroke into one undo operation', () => {
    const store = useEditorStore.getState()
    store.beginStroke()
    store.paint([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ])
    store.endStroke()
    expect(useEditorStore.getState().project.cells.slice(0, 2)).toEqual([
      'percent-1',
      'percent-1',
    ])
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().project.cells.slice(0, 2)).toEqual([
      null,
      null,
    ])
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().project.cells.slice(0, 2)).toEqual([
      'percent-1',
      'percent-1',
    ])
  })
  it('stores resize and clear in history', () => {
    useEditorStore.getState().resize(20, 10)
    expect(useEditorStore.getState().project.cells).toHaveLength(200)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().project.columns).toBe(20)
  })

  it('replaces legacy colors with the current official 100-color palette', () => {
    const project = createProject()
    project.palette = [
      { id: 'legacy-red', name: '旧赤', value: '#ff0000' },
      project.palette.find((color) => color.id === 'percent-1')!,
    ]
    project.cells[0] = 'legacy-red'
    project.cells[1] = 'percent-1'
    project.recentColorIds = ['legacy-red', 'percent-1']

    useEditorStore.getState().replace(project)

    const migrated = useEditorStore.getState().project
    expect(migrated.palette).toHaveLength(100)
    expect(migrated.cells.slice(0, 2)).toEqual([null, 'percent-1'])
    expect(migrated.recentColorIds).toEqual(['percent-1'])
  })
})

it('keeps five unique recently drawn colors and restores them per project', () => {
  const store = useEditorStore.getState()
  store.replace(createProject())
  for (let i = 1; i <= 6; i++) {
    store.setSelectedColor(`percent-${i}`)
    store.beginStroke()
    store.paint([{ x: i, y: 0 }])
    store.endStroke()
  }
  expect(useEditorStore.getState().project.recentColorIds).toEqual([
    'percent-6',
    'percent-5',
    'percent-4',
    'percent-3',
    'percent-2',
  ])
  store.setSelectedColor('percent-3')
  expect(useEditorStore.getState().project.recentColorIds?.[0]).toBe(
    'percent-6',
  )
  store.beginStroke()
  store.paint([{ x: 7, y: 0 }])
  store.endStroke()
  expect(useEditorStore.getState().project.recentColorIds).toEqual([
    'percent-3',
    'percent-6',
    'percent-5',
    'percent-4',
    'percent-2',
  ])
  store.setTool('eraser')
  store.beginStroke()
  store.paint([{ x: 7, y: 0 }])
  store.endStroke()
  const saved = JSON.parse(JSON.stringify(useEditorStore.getState().project))
  store.replace(createProject())
  store.replace(saved)
  expect(useEditorStore.getState().project.recentColorIds).toEqual([
    'percent-3',
    'percent-6',
    'percent-5',
    'percent-4',
    'percent-2',
  ])
  expect(useEditorStore.getState().selectedColorId).toBe('percent-3')
})
