import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { createProject } from './domain/project'
import { useEditorStore } from './store/editorStore'

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock)
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  set fillStyle(_: string) {},
  set strokeStyle(_: string) {},
  set lineWidth(_: number) {},
  set font(_: string) {},
  set textAlign(_: CanvasTextAlign) {},
})) as never

describe('App', () => {
  beforeEach(() => useEditorStore.getState().replace(createProject()))
  it('shows the initial grid and repeat controls', () => {
    render(<App />)
    expect(screen.getByLabelText('20目×20段の編集用編み図')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5回' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getAllByRole('button', { pressed: false })).not.toHaveLength(
      0,
    )
  })
  it('hides and restores the pattern repeat pane', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(
      screen.getByRole('button', { name: 'パターンリピートを非表示' }),
    )
    expect(
      screen.queryByRole('heading', { name: 'パターンリピート' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('separator', { name: 'パターンリピート領域の高さ' }),
    ).toHaveAttribute('aria-valuetext', '非表示')

    await user.click(
      screen.getByRole('button', { name: 'パターンリピートを表示' }),
    )
    expect(
      screen.getByRole('heading', { name: 'パターンリピート' }),
    ).toBeVisible()
  })
  it('selects an accessible palette color and tool', async () => {
    render(<App />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^4$/ }))
    expect(screen.getByRole('button', { name: /^4$/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(screen.getByRole('button', { name: /消しゴム/ }))
    expect(screen.getByRole('button', { name: /消しゴム/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('zooms the editable chart and resets it to 100%', async () => {
    render(<App />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '編み図を拡大' }))
    const panButton = screen.getByRole('button', { name: '表示位置を移動' })
    expect(panButton).toBeEnabled()
    await user.click(panButton)
    expect(panButton).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', { name: '表示倍率 125%。100%に戻す' }),
    ).toBeEnabled()
    expect(document.querySelector('.editor-canvas-wrap')).toHaveStyle({
      '--editor-zoom': '125%',
    })

    await user.click(
      screen.getByRole('button', { name: '表示倍率 125%。100%に戻す' }),
    )
    expect(
      screen.getByRole('button', { name: '表示倍率 100%。100%に戻す' }),
    ).toBeDisabled()
    expect(panButton).toBeDisabled()
    expect(panButton).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('.editor-canvas-wrap')).toHaveStyle({
      '--editor-zoom': '100%',
    })
  })

  it('zooms only the editable chart with a two-finger pinch', () => {
    render(<App />)
    const viewport = document.querySelector('.editor-viewport')!
    const dispatchTouchPointer = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
    ) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperties(event, {
        pointerId: { value: pointerId },
        pointerType: { value: 'touch' },
        clientX: { value: clientX },
        clientY: { value: clientY },
      })
      viewport.dispatchEvent(event)
    }

    act(() => {
      dispatchTouchPointer('pointerdown', 1, 100, 100)
      dispatchTouchPointer('pointerdown', 2, 200, 100)
      dispatchTouchPointer('pointermove', 2, 250, 100)
    })

    expect(document.querySelector('.editor-canvas-wrap')).toHaveStyle({
      '--editor-zoom': '150%',
    })
    expect(document.querySelector('.repeat-canvas')).not.toHaveStyle({
      '--editor-zoom': '150%',
    })
  })

  it('shows row and column edit buttons for the hovered cell', () => {
    const rect = vi
      .spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 400, 400))
    const confirm = vi.spyOn(window, 'confirm')
    HTMLCanvasElement.prototype.hasPointerCapture = () => false
    try {
      render(<App />)
      const canvas = screen.getByLabelText('20目×20段の編集用編み図')
      const event = new Event('pointermove', { bubbles: true })
      // 400px四方では1目12.17px、1段16.6px、方眼の左上は(78.3, 34)
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        pointerType: { value: 'mouse' },
        clientX: { value: 78.3 + 12.17 * 3.5 },
        clientY: { value: 34 + 16.6 * 15.5 },
      })
      act(() => {
        canvas.dispatchEvent(event)
      })

      fireEvent.click(
        screen.getByRole('button', { name: '5段目の上に段を挿入' }),
      )
      expect(useEditorStore.getState().project.rows).toBe(21)
      fireEvent.click(
        screen.getByRole('button', { name: '4目めの右に目を挿入' }),
      )
      expect(useEditorStore.getState().project.columns).toBe(21)

      confirm.mockReturnValueOnce(false)
      fireEvent.click(screen.getByRole('button', { name: '5段目を削除' }))
      expect(confirm).toHaveBeenCalledWith(
        '5段目を削除してもいいですか？元に戻すこともできます。',
      )
      expect(useEditorStore.getState().project.rows).toBe(21)
      confirm.mockReturnValueOnce(true)
      fireEvent.click(screen.getByRole('button', { name: '5段目を削除' }))
      expect(useEditorStore.getState().project.rows).toBe(20)
    } finally {
      rect.mockRestore()
      confirm.mockRestore()
    }
  })

  it('keeps the size inputs synchronized with the restored project', () => {
    render(<App />)
    const restored = createProject()
    restored.columns = 10
    restored.cells = Array(10 * restored.rows).fill(null)

    act(() => useEditorStore.getState().replace(restored))

    expect(screen.getAllByLabelText('横（目）')[0]).toHaveValue(10)
    expect(screen.getByLabelText('10目×20段の編集用編み図')).toBeInTheDocument()
  })

  it('allows resizing after drawing with an in-app confirmation', async () => {
    render(<App />)
    const user = userEvent.setup()
    const store = useEditorStore.getState()
    store.setTool('pencil')
    store.beginStroke()
    store.paint([{ x: 19, y: 0 }])
    store.endStroke()
    const columns = screen.getAllByLabelText('横（目）')[0]
    await user.clear(columns)
    await user.type(columns, '10{Enter}')
    expect(screen.getByRole('dialog')).toHaveTextContent('範囲外の色付きセル')
    await user.click(screen.getByRole('button', { name: '変更する' }))
    expect(useEditorStore.getState().project.columns).toBe(10)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

it('updates row color checks after painting and undo', () => {
  useEditorStore.getState().replace(createProject())
  render(<App />)
  const list = within(screen.getByRole('region', { name: '段別の使用色一覧' }))
  const firstRow = () =>
    within(list.getByRole('rowheader', { name: '1段' }).closest('tr')!)
  act(() => {
    const store = useEditorStore.getState()
    store.setSelectedColor('percent-1')
    store.beginStroke()
    store.paint([{ x: 0, y: 0 }])
    store.endStroke()
    store.setSelectedColor('percent-2')
    store.beginStroke()
    store.paint([{ x: 1, y: 0 }])
    store.endStroke()
  })
  expect(firstRow().getByText('2色')).toBeInTheDocument()
  expect(screen.getByText('2色以上の段：1 / 20段')).toBeInTheDocument()
  act(() => useEditorStore.getState().undo())
  expect(firstRow().getByText('1色')).toBeInTheDocument()
})
