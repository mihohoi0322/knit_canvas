import { useEffect, useRef } from 'react'
import {
  canvasPointToCell,
  renderPattern,
  type CanvasMetrics,
} from '../canvas/render'
import { interpolateLine } from '../domain/project'
import type { GridPoint, PatternProject } from '../domain/types'

type Props = {
  project: PatternProject
  repeats?: number
  interactive?: boolean
  onStrokeStart?(): void
  onStroke?(points: GridPoint[]): void
  onStrokeEnd?(): void
  className?: string
  labels?: boolean
}

export function PatternCanvas({
  project,
  repeats = 1,
  interactive = false,
  onStrokeStart,
  onStroke,
  onStrokeEnd,
  className,
  labels = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const metricsRef = useRef<CanvasMetrics | undefined>(undefined)
  const lastPoint = useRef<GridPoint | undefined>(undefined)
  const drawing = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * ratio))
      canvas.height = Math.max(1, Math.round(rect.height * ratio))
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      metricsRef.current = renderPattern(
        ctx,
        project,
        canvas.width,
        canvas.height,
        repeats,
        labels,
      )
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [project, repeats, labels])

  const pointForEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const metrics = metricsRef.current
    return canvas && metrics
      ? canvasPointToCell(
          event.clientX,
          event.clientY,
          canvas.getBoundingClientRect(),
          project,
          metrics,
        )
      : undefined
  }
  const pointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointForEvent(event)
    if (!point) return
    drawing.current = true
    lastPoint.current = point
    onStrokeStart?.()
    onStroke?.([point])
  }
  const pointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !event.currentTarget.hasPointerCapture(event.pointerId))
      return
    const point = pointForEvent(event)
    if (
      !point ||
      !lastPoint.current ||
      (point.x === lastPoint.current.x && point.y === lastPoint.current.y)
    )
      return
    onStroke?.(interpolateLine(lastPoint.current, point))
    lastPoint.current = point
  }
  const pointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive || !drawing.current) return
    drawing.current = false
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    lastPoint.current = undefined
    onStrokeEnd?.()
  }
  const lostCapture = () => {
    if (!drawing.current) return
    drawing.current = false
    lastPoint.current = undefined
    onStrokeEnd?.()
  }
  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label={`${project.columns}目×${project.rows}段の${interactive ? '編集用編み図' : 'パターンリピート'}`}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      onLostPointerCapture={lostCapture}
    />
  )
}
