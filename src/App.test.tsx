import { act, render, screen, within } from '@testing-library/react'
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
