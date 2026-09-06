import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('opens a 20 by 20 pattern with five repeats', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: 'パターンリピート' }),
  ).toBeVisible()
  await expect(page.getByLabel('20目×20段の編集用編み図')).toBeVisible()
  await expect(page.getByRole('button', { name: '5回' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('uses the entered stitch and row counts and reflects later changes', async ({
  page,
}) => {
  await page.goto('/')

  const sizeSettings = page
    .getByRole('heading', { name: '方眼サイズ' })
    .locator('..')
  const stitches = sizeSettings.getByLabel('横（目）')
  const rows = sizeSettings.getByLabel('縦（段）')

  await expect(stitches).toHaveValue('20')
  await expect(rows).toHaveValue('20')
  const patternInfo = page.getByRole('complementary', { name: 'パターン情報' })
  await expect(
    patternInfo.getByText('20目 × 20段', { exact: true }),
  ).toBeVisible()

  await stitches.fill('32')
  await stitches.press('Enter')
  await rows.fill('24')
  await rows.press('Enter')

  await expect(page.getByLabel('32目×24段の編集用編み図')).toBeVisible()
  await expect(
    patternInfo.getByText('32目 × 24段', { exact: true }),
  ).toBeVisible()

  await stitches.fill('18')
  await stitches.press('Enter')
  await expect(page.getByLabel('18目×24段の編集用編み図')).toBeVisible()
  await expect(
    patternInfo.getByText('18目 × 24段', { exact: true }),
  ).toBeVisible()
})

test('paints the selected color on the grid and adds it to recent colors', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '9', exact: true }).click()
  const canvas = page.getByLabel('20目×20段の編集用編み図')

  const countPaintPixels = () =>
    canvas.evaluate((element) => {
      const context = (element as HTMLCanvasElement).getContext('2d')
      if (!context) return 0
      const { data } = context.getImageData(
        0,
        0,
        (element as HTMLCanvasElement).width,
        (element as HTMLCanvasElement).height,
      )
      let count = 0
      for (let index = 0; index < data.length; index += 4) {
        if (
          data[index] === 64 &&
          data[index + 1] === 29 &&
          data[index + 2] === 13
        )
          count += 1
      }
      return count
    })

  expect(await countPaintPixels()).toBe(0)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas not visible')
  await canvas.click({
    position: { x: box.width * 0.43, y: box.height * 0.47 },
  })

  await expect.poll(countPaintPixels).toBeGreaterThan(0)
  const recent = page.getByRole('region', { name: '最近使った5色' })
  await expect(
    recent.getByRole('button', {
      name: '最近使った色: 9',
      exact: true,
    }),
  ).toBeVisible()
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
  const canvas = page.getByLabel('20目×20段の編集用編み図')
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
  expect(download.suggestedFilename().normalize('NFC')).toBe(
    '新しいパターン.pdf',
  )
  const outputPath = testInfo.outputPath('knit-canvas.pdf')
  await download.saveAs(outputPath)
  const pdf = await readFile(outputPath)
  expect(pdf.subarray(0, 8).toString()).toBe('%PDF-1.4')
  expect(pdf.length).toBeGreaterThan(10_000)
  await expect(page.getByRole('status')).toHaveText('PDFを書き出しました')
})

test('fits the application and canvases to common PC viewport sizes', async ({
  page,
}) => {
  await page.goto('/')

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(viewport)
    const layout = await page.evaluate(() => {
      const shell = document
        .querySelector('.app-shell')
        ?.getBoundingClientRect()
      const canvases = [
        ...document.querySelectorAll('.canvas-column canvas'),
      ].map((canvas) => ({
        className: canvas.className,
        box: canvas.getBoundingClientRect(),
      }))
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        shell: shell && { width: shell.width, height: shell.height },
        canvases: canvases.map(({ className, box }) => ({
          className,
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        })),
      }
    })

    expect(layout.shell).toEqual({
      width: viewport.width,
      height: viewport.height,
    })
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth)
    for (const canvasBox of layout.canvases) {
      expect(canvasBox.width).toBeGreaterThan(0)
      expect(canvasBox.height).toBeGreaterThan(0)
      expect(canvasBox.left).toBeGreaterThanOrEqual(0)
      expect(canvasBox.right).toBeLessThanOrEqual(layout.innerWidth)
      expect(canvasBox.top).toBeGreaterThanOrEqual(0)
      expect(
        canvasBox.bottom,
        `${canvasBox.className} should fit vertically`,
      ).toBeLessThanOrEqual(layout.innerHeight)
    }
  }
})
