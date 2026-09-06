import { colorLabel } from './percentPalette'
import { describe, expect, it } from 'vitest'
import {
  MAX_PROJECT_FILE_BYTES,
  readProjectFile,
  rowColorUsage,
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

describe('untrusted project files', () => {
  it.each(['Infinity', Infinity, NaN, 0, -1, '22'])(
    'rejects invalid gauge %s',
    (gauge) => {
      const file = toProjectFile(createProject())
      expect(() =>
        parseProjectFile({
          ...file,
          project: { ...file.project, stitchesPer10cm: gauge },
        }),
      ).toThrow()
    },
  )
  it.each(['url(https://example.invalid/pixel)', 'red', '#12345', null])(
    'rejects unsafe colors %s',
    (value) => {
      const file = toProjectFile(createProject())
      const palette = file.project.palette.map((color, i) =>
        i === 0 ? { ...color, value } : color,
      )
      expect(() =>
        parseProjectFile({ ...file, project: { ...file.project, palette } }),
      ).toThrow()
    },
  )
  it('rejects oversized files before reading their content', async () => {
    let wasRead = false
    const file = {
      size: MAX_PROJECT_FILE_BYTES + 1,
      text: async () => {
        wasRead = true
        return ''
      },
    } as File
    await expect(readProjectFile(file)).rejects.toThrow('5MB')
    expect(wasRead).toBe(false)
  })
  it('reads a valid file within the limit', async () => {
    const data = toProjectFile(createProject())
    const file = { size: 1024, text: async () => JSON.stringify(data) } as File
    await expect(readProjectFile(file)).resolves.toEqual(data)
  })
  it('rejects invalid coordinates without entering the interpolation loop', () => {
    expect(interpolateLine({ x: NaN, y: NaN }, { x: NaN, y: NaN })).toEqual([])
    expect(interpolateLine({ x: 0, y: 0 }, { x: Infinity, y: 0 })).toEqual([])
    expect(interpolateLine({ x: 0, y: 0 }, { x: 0.5, y: 0 })).toEqual([])
  })
})

it('includes 100 unique official color numbers and round-trips recent colors', () => {
  const project = createProject()
  expect(project.palette).toHaveLength(100)
  expect(new Set(project.palette.map((c) => c.colorNumber)).size).toBe(100)
  project.recentColorIds = ['percent-125', 'percent-1']
  const file = toProjectFile(project)
  expect(parseProjectFile(JSON.parse(JSON.stringify(file)))).toEqual(file)
})

it('counts unique colors per horizontal row from the bottom, excluding empty cells', () => {
  expect(
    rowColorUsage({
      columns: 4,
      rows: 3,
      cells: [
        'a',
        'a',
        'b',
        null,
        'b',
        null,
        'b',
        null,
        null,
        null,
        null,
        null,
      ],
    }),
  ).toEqual([
    { row: 1, colorIds: ['a', 'b'] },
    { row: 2, colorIds: ['b'] },
    { row: 3, colorIds: [] },
  ])
})

it('starts new projects at 20 by 20 and labels colors by the official number', () => {
  const project = createProject()
  expect([project.columns, project.rows, project.cells.length]).toEqual([
    20, 20, 400,
  ])
  expect(
    colorLabel({
      id: 'percent-74',
      name: '旧名称',
      value: '#a90012',
    }),
  ).toBe('74')
})
