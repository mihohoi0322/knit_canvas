import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { createProject } from '../domain/project'
import { YarnPalette } from './YarnPalette'

it('shows all 100 current colors in official order, searches, and retains recent colors', async () => {
  const project = createProject()
  project.recentColorIds = ['percent-74']
  const select = vi.fn()
  const user = userEvent.setup()
  render(
    <YarnPalette
      project={project}
      selectedId="percent-74"
      onSelect={select}
      onNew={() => {}}
    />,
  )
  const history = within(screen.getByRole('region', { name: '最近使った5色' }))
  const palette = within(screen.getByLabelText('公式色見本100色'))
  expect(palette.getAllByRole('button')).toHaveLength(100)
  expect(
    palette
      .getAllByRole('button')
      .slice(0, 9)
      .map((button) => button.textContent),
  ).toEqual(['1', '2', '3', '4', '5', '6', '101', '102', '7'])
  expect(screen.getByRole('button', { name: '125' })).toBeInTheDocument()
  await user.type(screen.getByLabelText('色番検索'), '74')
  await user.click(screen.getByRole('button', { name: '74' }))
  expect(select).toHaveBeenCalledWith('percent-74')
  await user.type(screen.getByLabelText('色番検索'), '9')
  expect(screen.getByRole('status')).toHaveTextContent(
    '該当する色番はありません',
  )
  await user.click(history.getByRole('button', { name: '最近使った色: 74' }))
  expect(select).toHaveBeenLastCalledWith('percent-74')
})
