import { colorLabel } from '../domain/percentPalette'
import { createPortal } from 'react-dom'
import { useState } from 'react'
import type { PatternProject, YarnColor } from '../domain/types'

export function YarnPalette({
  project,
  selectedId,
  onSelect,
  onNew,
}: {
  project: PatternProject
  selectedId: string
  onSelect: (id: string) => void
  onNew: () => void
}) {
  const [query, setQuery] = useState('')
  const colors = project.palette.filter(
    (color) =>
      !query.trim() ||
      (color.colorNumber
        ? color.colorNumber === query.trim()
        : color.name.includes(query.trim())),
  )
  const selected =
    project.palette.find((color) => color.id === selectedId) ??
    project.palette[0]
  const recent = (project.recentColorIds ?? [])
    .map((id) => project.palette.find((color) => color.id === id))
    .filter((color): color is YarnColor => !!color)
  const button = (color: YarnColor, history = false) => (
    <button
      key={color.id}
      className={`yarn-swatch ${selectedId === color.id ? 'selected' : ''}`}
      aria-label={`${history ? '最近使った色: ' : ''}${colorLabel(color)}`}
      aria-pressed={selectedId === color.id}
      title={colorLabel(color)}
      onClick={() => onSelect(color.id)}
    >
      <span className="yarn-chip" style={{ backgroundColor: color.value }} />
      <span>{colorLabel(color)}</span>
    </button>
  )
  const recentContent = (
    <>
      <strong>最近使った5色</strong>
      <div className="recent-grid">
        {recent.map((color) => button(color, true))}
        {Array.from({ length: 5 - recent.length }, (_, i) => (
          <span key={`empty-${i}`} className="empty-color" aria-label="未使用">
            —
          </span>
        ))}
      </div>
    </>
  )
  return (
    <div className="yarn-palette">
      {createPortal(
        <div
          className="mobile-recent"
          role="region"
          aria-label="最近使った5色（モバイル）"
        >
          {recentContent}
        </div>,
        document.body,
      )}
      <div className="recent-colors" role="region" aria-label="最近使った5色">
        <strong>最近使った5色</strong>
        <div className="recent-grid">
          {recent.map((color) => button(color, true))}
          {Array.from({ length: 5 - recent.length }, (_, i) => (
            <span
              key={`empty-${i}`}
              className="empty-color"
              aria-label="未使用"
            >
              —
            </span>
          ))}
        </div>
      </div>
      <div className="selected-color">
        <span style={{ backgroundColor: selected.value }} />
        選択中: {colorLabel(selected)}
      </div>
      <p className="palette-caption">
        色糸パレット · {project.palette.length}色
      </p>
      <input
        className="color-search"
        aria-label="色番検索"
        placeholder="色番で検索（例: 74）"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
        }}
      />
      <div className="paged-palette" aria-label="公式色見本100色">
        {colors.map((color) => button(color))}
      </div>
      {colors.length === 0 && <p role="status">該当する色番はありません</p>}
      <p className="palette-caption">
        表示色は目安です。実際の毛糸は色番でご確認ください。
        <a
          href="https://hamanaka.jp/richmore/0117"
          target="_blank"
          rel="noreferrer"
        >
          公式色見本
        </a>
      </p>
      <button className="new-percent" onClick={onNew}>
        新しい作品を作成
      </button>
    </div>
  )
}
