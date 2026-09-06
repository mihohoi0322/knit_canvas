import { colorLabel } from './domain/percentPalette'
import { useEffect, useRef, useState } from 'react'
import { YarnPalette } from './components/YarnPalette'
import { PatternCanvas } from './components/PatternCanvas'
import {
  createProject,
  dimensions,
  readProjectFile,
  rowColorUsage,
  resizeLosesPaint,
  toProjectFile,
  usedColorIds,
} from './domain/project'
import type { RepeatCount } from './domain/types'
import { projectRepository } from './persistence/repository'
import { exportProjectPdf } from './pdf/exportPdf'
import { useEditorStore } from './store/editorStore'

type SaveStatus = 'loading' | 'saving' | 'saved' | 'error'
type PendingResize = { columns: number; rows: number }

export default function App() {
  const {
    project,
    tool,
    selectedColorId,
    past,
    future,
    beginStroke,
    paint,
    endStroke,
    setTool,
    setSelectedColor,
    updateProject,
    resize,
    clear,
    undo,
    redo,
    replace,
    setRepeatCount,
  } = useEditorStore()
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('loading')
  const [message, setMessage] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)
  const [repeatHeight, setRepeatHeight] = useState(31)
  const [pendingResize, setPendingResize] = useState<PendingResize>()
  const [sizeInputRevision, setSizeInputRevision] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const firstSave = useRef(true)

  useEffect(() => {
    const startedAt = useEditorStore.getState().project.updatedAt
    projectRepository
      .loadLast()
      .then((saved) => {
        if (saved && useEditorStore.getState().project.updatedAt === startedAt)
          replace(saved)
        setSaveStatus('saved')
      })
      .catch(() => setSaveStatus('error'))
  }, [replace])
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false
      return
    }
    setSaveStatus('saving')
    const timer = window.setTimeout(
      () =>
        projectRepository
          .save(project)
          .then(() => setSaveStatus('saved'))
          .catch(() => setSaveStatus('error')),
      500,
    )
    return () => window.clearTimeout(timer)
  }, [project])

  const rowColors = rowColorUsage(project)
  const multiColorRows = rowColors.filter(
    (row) => row.colorIds.length >= 2,
  ).length
  const physical = dimensions(project)
  const used = usedColorIds(project.cells)
    .map((id) => project.palette.find((color) => color.id === id))
    .filter(Boolean)
  const updateSize = (key: 'columns' | 'rows', raw: string) => {
    const value = Math.max(1, Math.min(200, Math.round(Number(raw))))
    if (!Number.isFinite(value) || value === project[key]) return
    const columns = key === 'columns' ? value : project.columns
    const rows = key === 'rows' ? value : project.rows
    if (
      resizeLosesPaint(
        project.cells,
        project.columns,
        project.rows,
        columns,
        rows,
      )
    ) {
      setPendingResize({ columns, rows })
      return
    }
    resize(columns, rows)
  }
  const exportProject = () => {
    const blob = new Blob([JSON.stringify(toProjectFile(project), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name || 'pattern'}.knitcanvas`
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const importProject = async (file?: File) => {
    if (!file) return
    try {
      replace((await readProjectFile(file)).project)
      setMessage('ファイルを読み込みました')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'ファイルを読み込めません',
      )
    }
  }
  const retrySave = () => {
    setSaveStatus('saving')
    projectRepository
      .save(project)
      .then(() => setSaveStatus('saved'))
      .catch(() => setSaveStatus('error'))
  }
  const downloadPdf = async () => {
    setExportingPdf(true)
    setMessage('')
    try {
      await exportProjectPdf(project)
      setMessage('PDFを書き出しました')
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'PDFを書き出せませんでした',
      )
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <>
      <div className="app-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">K</span>
            <div>
              <strong>Knit Canvas</strong>
              <small>COLORWORK STUDIO</small>
            </div>
          </div>
          <input
            className="project-name"
            aria-label="ドキュメント名"
            value={project.name}
            onChange={(event) => updateProject({ name: event.target.value })}
          />
          <div className="header-actions">
            <span className={`save-state ${saveStatus}`}>
              {saveStatus === 'loading'
                ? '復元中…'
                : saveStatus === 'saving'
                  ? '保存中…'
                  : saveStatus === 'saved'
                    ? '保存済み'
                    : '保存失敗'}
            </span>
            {saveStatus === 'error' && (
              <button onClick={retrySave}>再試行</button>
            )}
            <button
              aria-label="元に戻す"
              disabled={!past.length}
              onClick={undo}
            >
              ↶
            </button>
            <button
              aria-label="やり直す"
              disabled={!future.length}
              onClick={redo}
            >
              ↷
            </button>
            <button onClick={exportProject}>プロジェクト保存</button>
            <button onClick={() => fileRef.current?.click()}>読み込む</button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept=".knitcanvas,application/json"
              onChange={(event) => void importProject(event.target.files?.[0])}
            />
            <button onClick={() => window.print()}>印刷</button>
            <button
              className="primary"
              disabled={exportingPdf}
              onClick={() => void downloadPdf()}
            >
              {exportingPdf ? 'PDF作成中…' : 'PDF書き出し'}
            </button>
          </div>
        </header>

        <main className="workspace">
          <aside className="sidebar left-panel" aria-label="編集設定">
            <Section title="方眼サイズ">
              <div className="two-fields">
                <NumberField
                  key={`columns-${sizeInputRevision}`}
                  label="横（目）"
                  value={project.columns}
                  min={1}
                  max={200}
                  onCommit={(value) => updateSize('columns', value)}
                />
                <NumberField
                  key={`rows-${sizeInputRevision}`}
                  label="縦（段）"
                  value={project.rows}
                  min={1}
                  max={200}
                  onCommit={(value) => updateSize('rows', value)}
                />
              </div>
              <p className="hint">1〜200・左下を基準に保持</p>
            </Section>
            <Section title="10cmあたりのゲージ">
              <div className="two-fields">
                <NumberField
                  label="横（目）"
                  value={project.stitchesPer10cm}
                  min={0.1}
                  step={0.1}
                  onCommit={(value) => {
                    const n = Number(value)
                    if (Number.isFinite(n) && n > 0)
                      updateProject({ stitchesPer10cm: n })
                  }}
                />
                <NumberField
                  label="縦（段）"
                  value={project.rowsPer10cm}
                  min={0.1}
                  step={0.1}
                  onCommit={(value) => {
                    const n = Number(value)
                    if (Number.isFinite(n) && n > 0)
                      updateProject({ rowsPer10cm: n })
                  }}
                />
              </div>
            </Section>
            <Section title="ツール">
              <div className="tool-row">
                <button
                  aria-pressed={tool === 'pencil'}
                  className={tool === 'pencil' ? 'selected' : ''}
                  onClick={() => setTool('pencil')}
                >
                  ✎ 鉛筆
                </button>
                <button
                  aria-pressed={tool === 'eraser'}
                  className={tool === 'eraser' ? 'selected' : ''}
                  onClick={() => setTool('eraser')}
                >
                  ◇ 消しゴム
                </button>
              </div>
            </Section>
            <Section title="色糸パレット">
              <YarnPalette
                key={project.id}
                project={project}
                selectedId={selectedColorId}
                onSelect={setSelectedColor}
                onNew={() => {
                  if (
                    window.confirm(
                      '新しい作品を作成します。現在の作品を残す場合は、先にファイル保存してください。',
                    )
                  )
                    replace(createProject())
                }}
              />
            </Section>
            <button
              className="danger"
              onClick={() => {
                if (
                  window.confirm(
                    '編み図をすべて消去しますか？元に戻すことができます。',
                  )
                )
                  clear()
              }}
            >
              全消去
            </button>
            {message && (
              <p role="status" className="message">
                {message}
              </p>
            )}
          </aside>

          <section
            className="canvas-column"
            style={
              { '--repeat-height': `${repeatHeight}%` } as React.CSSProperties
            }
          >
            <div className="repeat-pane">
              <div className="pane-heading">
                <div>
                  <span className="eyebrow">PATTERN PREVIEW</span>
                  <h1>パターンリピート</h1>
                  <p>作成したパターンを横方向にタイル表示</p>
                </div>
              </div>
              <PatternCanvas
                project={project}
                repeats={project.repeatCount}
                className="repeat-canvas"
              />
              <div className="repeat-controls" aria-label="リピート回数">
                {([3, 5, 8] as RepeatCount[]).map((count) => (
                  <button
                    key={count}
                    aria-pressed={project.repeatCount === count}
                    className={project.repeatCount === count ? 'selected' : ''}
                    onClick={() => setRepeatCount(count)}
                  >
                    {count}回
                  </button>
                ))}
              </div>
            </div>
            <input
              className="splitter"
              aria-label="プレビュー領域の高さ"
              type="range"
              min="20"
              max="60"
              value={repeatHeight}
              onChange={(event) => setRepeatHeight(Number(event.target.value))}
            />
            <div className="editor-pane">
              <div className="editor-label">
                実ゲージ編み図 · 下から上へ数えます
              </div>
              <PatternCanvas
                project={project}
                interactive
                labels
                className="editor-canvas"
                onStrokeStart={beginStroke}
                onStroke={paint}
                onStrokeEnd={endStroke}
              />
            </div>
          </section>

          <aside className="sidebar right-panel" aria-label="パターン情報">
            <span className="eyebrow">PATTERN DETAILS</span>
            <h2>パターン情報</h2>
            <Info
              label="方眼サイズ"
              value={`${project.columns}目 × ${project.rows}段`}
            />
            <Info
              label="完成寸法"
              value={`約 ${physical.widthCm.toFixed(1)} × ${physical.heightCm.toFixed(1)} cm`}
              detail="横 × 縦"
            />
            <Info
              label="ゲージ"
              value={`${project.stitchesPer10cm}目 × ${project.rowsPer10cm}段`}
              detail="10cmあたり"
            />
            <div className="info-block">
              <span>使用色</span>
              <strong>{used.length}色</strong>
              <div className="used-colors">
                {used.map(
                  (color) =>
                    color && (
                      <i
                        key={color.id}
                        title={colorLabel(color)}
                        style={{ background: color.value }}
                      />
                    ),
                )}
              </div>
            </div>
            <section
              className="row-color-check"
              aria-labelledby="row-color-heading"
            >
              <h3 id="row-color-heading">横1段ごとの色数</h3>
              <p>
                2色以上の段：{multiColorRows} / {project.rows}段
              </p>
              <small>下から1段目・未着色は数えません</small>
              <div
                className="row-color-list"
                tabIndex={0}
                role="region"
                aria-label="段別の使用色一覧"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">段</th>
                      <th scope="col">色数</th>
                      <th scope="col">使用色</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...rowColors].reverse().map(({ row, colorIds }) => (
                      <tr key={row}>
                        <th scope="row">{row}段</th>
                        <td>{colorIds.length}色</td>
                        <td>
                          <div className="row-color-chips">
                            {colorIds.map((id) => {
                              const color = project.palette.find(
                                (entry) => entry.id === id,
                              )
                              return color ? (
                                <span
                                  key={id}
                                  role="img"
                                  aria-label={colorLabel(color)}
                                  title={colorLabel(color)}
                                  style={{ backgroundColor: color.value }}
                                />
                              ) : null
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <div className="tip">
              <strong>編み図のヒント</strong>
              <p>5目・5段ごとの太線と番号を目安にしてください。</p>
            </div>
          </aside>
        </main>
      </div>
      {pendingResize && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resize-dialog-title"
          >
            <h2 id="resize-dialog-title">方眼サイズを変更しますか？</h2>
            <p>
              {pendingResize.columns}目 × {pendingResize.rows}
              段へ縮小すると、範囲外の色付きセルが失われます。
            </p>
            <div>
              <button
                onClick={() => {
                  setPendingResize(undefined)
                  setSizeInputRevision((value) => value + 1)
                }}
              >
                キャンセル
              </button>
              <button
                className="primary"
                onClick={() => {
                  resize(pendingResize.columns, pendingResize.rows)
                  setPendingResize(undefined)
                }}
              >
                変更する
              </button>
            </div>
          </section>
        </div>
      )}
      <PrintPage project={project} />
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="control-section">
      <h2>{title}</h2>
      {children}
    </section>
  )
}
function NumberField({
  label,
  value,
  onCommit,
  ...props
}: {
  label: string
  value: number
  onCommit(value: string): void
  min?: number
  max?: number
  step?: number
}) {
  const [inputValue, setInputValue] = useState(String(value))
  useEffect(() => setInputValue(String(value)), [value])

  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        value={inputValue}
        onChange={(event) => setInputValue(event.target.value)}
        onBlur={(event) => onCommit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        {...props}
      />
    </label>
  )
}
function Info({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="info-block">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  )
}
function PrintPage({
  project,
}: {
  project: ReturnType<typeof useEditorStore.getState>['project']
}) {
  const size = dimensions(project)
  return (
    <article className="print-page">
      <header>
        <h1>{project.name}</h1>
        <p>Knit Canvas カラーワーク編み図</p>
      </header>
      <section>
        <h2>編み図</h2>
        <PatternCanvas project={project} labels className="print-grid" />
      </section>
      <section>
        <h2>5回パターンリピート</h2>
        <PatternCanvas project={project} repeats={5} className="print-repeat" />
      </section>
      <footer>
        <div>
          書き出し日: {new Intl.DateTimeFormat('ja-JP').format(new Date())}
        </div>
        <div>
          <strong>
            {project.columns}目 × {project.rows}段
          </strong>
          <br />
          10cmあたり {project.stitchesPer10cm}目 × {project.rowsPer10cm}段<br />
          完成寸法 約 {size.widthCm.toFixed(1)} × {size.heightCm.toFixed(1)} cm
        </div>
      </footer>
    </article>
  )
}
