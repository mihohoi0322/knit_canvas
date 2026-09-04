import { describe, expect, it } from 'vitest'
import {
  cellIndex,
  createProject,
  dimensions,
  interpolateLine,
  parseProjectFile,
  resizeCells,
  resizeLosesPaint,
  toProjectFile,
  usedColorIds,
} from './project'

describe('project domain', () => {
  it('calculates physical dimensions and cell aspect ratio', () => {
    expect(
      dimensions({
        columns: 30,
        rows: 30,
        stitchesPer10cm: 20,
        rowsPer10cm: 30,
      }),
    ).toEqual({ widthCm: 15, heightCm: 10, cellAspectRatio: 1.5 })
  })
  it('maps logical coordinates from the bottom-left', () => {
    expect(cellIndex({ x: 2, y: 1 }, 4, 3)).toBe(6)
    expect(cellIndex({ x: 4, y: 1 }, 4, 3)).toBe(-1)
  })
  it('interpolates every cell in a fast diagonal stroke', () => {
    expect(interpolateLine({ x: 0, y: 0 }, { x: 3, y: 3 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ])
  })
  it('resizes cells preserving the bottom-left overlap', () => {
    expect(resizeCells(['a', 'b', 'c', 'd'], 2, 2, 3, 2)).toEqual([
      'a',
      'b',
      null,
      'c',
      'd',
      null,
    ])
    expect(resizeLosesPaint(['a', null, null, 'b'], 2, 2, 1, 2)).toBe(true)
  })
  it('collects unique used colors', () =>
    expect(usedColorIds(['a', null, 'a', 'b'])).toEqual(['a', 'b']))
  it('round-trips a versioned project and rejects broken references', () => {
    const file = toProjectFile(createProject('2026-09-02T00:00:00.000Z'))
    expect(parseProjectFile(file)).toEqual(file)
    file.project.cells[0] = 'missing'
    expect(() => parseProjectFile(file)).toThrow('存在しない色')
  })

  it('migrates the former single-repeat setting to three repeats', () => {
    const file = toProjectFile(createProject())
    const legacy = { ...file, project: { ...file.project, repeatCount: 1 } }
    expect(parseProjectFile(legacy).project.repeatCount).toBe(3)
  })
})
