import type { CanvasMetrics } from '../canvas/render'
import { MAX_GRID_SIZE } from '../domain/project'
import type { GridPoint, PatternProject } from '../domain/types'

type Props = {
  project: PatternProject
  metrics?: CanvasMetrics
  hovered?: GridPoint
  onInsertRow(at: number): void
  onRemoveRow(at: number): void
  onInsertColumn(at: number): void
}

export function GridEditControls({
  project,
  metrics,
  hovered,
  onInsertRow,
  onRemoveRow,
  onInsertColumn,
}: Props) {
  if (
    !metrics ||
    !hovered ||
    hovered.x >= project.columns ||
    hovered.y >= project.rows
  )
    return null
  const row = hovered.y + 1
  const column = hovered.x + 1
  const rowCenter =
    metrics.offsetY + (project.rows - hovered.y - 0.5) * metrics.cellHeight
  const columnCenter = metrics.offsetX + (hovered.x + 0.5) * metrics.cellWidth
  const gridRight = metrics.offsetX + project.columns * metrics.cellWidth
  return (
    <div className="grid-edit-controls">
      <div
        className="row-edit-controls"
        style={{ left: gridRight + 4, top: rowCenter }}
      >
        <button
          type="button"
          aria-label={`${row}段目の上に段を挿入`}
          title={`${row}段目の上に段を挿入`}
          disabled={project.rows >= MAX_GRID_SIZE}
          onClick={() => onInsertRow(hovered.y)}
        >
          ＋
        </button>
        <button
          type="button"
          aria-label={`${row}段目を削除`}
          title={`${row}段目を削除`}
          disabled={project.rows <= 1}
          onClick={() => {
            if (
              window.confirm(
                `${row}段目を削除してもいいですか？元に戻すこともできます。`,
              )
            )
              onRemoveRow(hovered.y)
          }}
        >
          −
        </button>
      </div>
      <div
        className="column-edit-controls"
        style={{ left: columnCenter, top: metrics.offsetY - 4 }}
      >
        <button
          type="button"
          aria-label={`${column}目めの右に目を挿入`}
          title={`${column}目めの右に目を挿入`}
          disabled={project.columns >= MAX_GRID_SIZE}
          onClick={() => onInsertColumn(hovered.x)}
        >
          ＋
        </button>
      </div>
    </div>
  )
}
