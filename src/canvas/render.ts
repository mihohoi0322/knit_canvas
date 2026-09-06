import type { GridPoint, PatternProject } from '../domain/types'

export type CanvasMetrics = {
  width: number
  height: number
  cellWidth: number
  cellHeight: number
  offsetX: number
  offsetY: number
}

export function getMetrics(
  project: PatternProject,
  width: number,
  height: number,
  repeats = 1,
  padding = 28,
): CanvasMetrics {
  const availableWidth = Math.max(1, width - padding * 2)
  const availableHeight = Math.max(1, height - padding * 2)
  const aspect = project.rowsPer10cm / project.stitchesPer10cm
  const cellWidth = Math.min(
    availableWidth / (project.columns * repeats),
    availableHeight / (project.rows * aspect),
  )
  const cellHeight = cellWidth * aspect
  return {
    width,
    height,
    cellWidth,
    cellHeight,
    offsetX: (width - cellWidth * project.columns * repeats) / 2,
    offsetY: (height - cellHeight * project.rows) / 2,
  }
}

export function canvasPointToCell(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  project: PatternProject,
  metrics: CanvasMetrics,
): GridPoint | undefined {
  const px =
    (clientX - rect.left) * (metrics.width / rect.width) - metrics.offsetX
  const py =
    (clientY - rect.top) * (metrics.height / rect.height) - metrics.offsetY
  const x = Math.floor(px / metrics.cellWidth)
  const visualY = Math.floor(py / metrics.cellHeight)
  const y = project.rows - visualY - 1
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x >= project.columns ||
    y < 0 ||
    y >= project.rows
  )
    return undefined
  return { x, y }
}

export function renderPattern(
  ctx: CanvasRenderingContext2D,
  project: PatternProject,
  width: number,
  height: number,
  repeats = 1,
  labels = false,
) {
  const metrics = getMetrics(project, width, height, repeats, labels ? 34 : 8)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = '#fffdf8'
  ctx.fillRect(0, 0, width, height)
  const palette = new Map(
    project.palette.map((color) => [color.id, color.value]),
  )
  for (let repeat = 0; repeat < repeats; repeat += 1) {
    for (let y = 0; y < project.rows; y += 1) {
      for (let x = 0; x < project.columns; x += 1) {
        const color = project.cells[y * project.columns + x]
        ctx.fillStyle = color ? (palette.get(color) ?? '#fff') : '#fffdf8'
        const drawX =
          metrics.offsetX + (repeat * project.columns + x) * metrics.cellWidth
        const drawY =
          metrics.offsetY + (project.rows - y - 1) * metrics.cellHeight
        ctx.fillRect(drawX, drawY, metrics.cellWidth, metrics.cellHeight)
      }
    }
  }
  for (let x = 0; x <= project.columns * repeats; x += 1) {
    const within = x % project.columns
    ctx.strokeStyle =
      within === 0 ? '#324f47' : within % 5 === 0 ? '#877b68' : '#d8d1c4'
    ctx.lineWidth = within === 0 ? 1.8 : within % 5 === 0 ? 1.2 : 0.55
    const drawX = metrics.offsetX + x * metrics.cellWidth
    ctx.beginPath()
    ctx.moveTo(drawX, metrics.offsetY)
    ctx.lineTo(drawX, metrics.offsetY + project.rows * metrics.cellHeight)
    ctx.stroke()
  }
  for (let row = 0; row <= project.rows; row += 1) {
    ctx.strokeStyle = row % 5 === 0 ? '#877b68' : '#d8d1c4'
    ctx.lineWidth = row % 5 === 0 ? 1.2 : 0.55
    const drawY = metrics.offsetY + row * metrics.cellHeight
    ctx.beginPath()
    ctx.moveTo(metrics.offsetX, drawY)
    ctx.lineTo(
      metrics.offsetX + project.columns * repeats * metrics.cellWidth,
      drawY,
    )
    ctx.stroke()
  }
  if (labels) {
    ctx.fillStyle = '#53605b'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    for (let x = 5; x <= project.columns; x += 5)
      ctx.fillText(
        String(x),
        metrics.offsetX + (x - 0.5) * metrics.cellWidth,
        metrics.offsetY + project.rows * metrics.cellHeight + 14,
      )
    if (project.columns % 5)
      ctx.fillText(
        String(project.columns),
        metrics.offsetX + (project.columns - 0.5) * metrics.cellWidth,
        metrics.offsetY + project.rows * metrics.cellHeight + 14,
      )
    ctx.textAlign = 'right'
    for (let y = 5; y <= project.rows; y += 5)
      ctx.fillText(
        String(y),
        metrics.offsetX - 5,
        metrics.offsetY + (project.rows - y + 0.5) * metrics.cellHeight + 3,
      )
    if (project.rows % 5)
      ctx.fillText(
        String(project.rows),
        metrics.offsetX - 5,
        metrics.offsetY + 0.5 * metrics.cellHeight + 3,
      )
  }
  return metrics
}
