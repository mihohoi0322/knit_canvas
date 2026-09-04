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
      'brick',
      'brick',
    ])
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().project.cells.slice(0, 2)).toEqual([
      null,
      null,
    ])
    useEditorStore.getState().redo()
    expect(useEditorStore.getState().project.cells.slice(0, 2)).toEqual([
      'brick',
      'brick',
    ])
  })
  it('stores resize and clear in history', () => {
    useEditorStore.getState().resize(20, 10)
    expect(useEditorStore.getState().project.cells).toHaveLength(200)
    useEditorStore.getState().undo()
    expect(useEditorStore.getState().project.columns).toBe(30)
  })
})
