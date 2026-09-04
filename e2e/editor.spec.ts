import { expect, test } from '@playwright/test'

test('opens a 30 by 30 pattern with five repeats', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'パターンリピート' }),
  ).toBeVisible()
  await expect(page.getByLabel('30目×30段の編集用編み図')).toBeVisible()
  await expect(page.getByRole('button', { name: '5回' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('changes repeat count and supports undo after drawing', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '8回' }).click()
  await expect(page.getByRole('button', { name: '8回' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  const canvas = page.getByLabel('30目×30段の編集用編み図')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas not visible')
  await canvas.dispatchEvent('pointerdown', {
    pointerId: 1,
    clientX: box.x + box.width / 2,
    clientY: box.y + box.height / 2,
    buttons: 1,
  })
  await canvas.dispatchEvent('pointermove', {
    pointerId: 1,
    clientX: box.x + box.width / 2 + 50,
    clientY: box.y + box.height / 2,
    buttons: 1,
  })
  await canvas.dispatchEvent('pointerup', {
    pointerId: 1,
    clientX: box.x + box.width / 2 + 50,
    clientY: box.y + box.height / 2,
    buttons: 0,
  })
  await expect(page.getByRole('button', { name: '元に戻す' })).toBeEnabled()
})

test('downloads a direct A4 PDF', async ({ page }, testInfo) => {
  await page.goto('/')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'PDF書き出し' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('新しいパターン.pdf')
  await download.saveAs(testInfo.outputPath('knit-canvas.pdf'))
})
