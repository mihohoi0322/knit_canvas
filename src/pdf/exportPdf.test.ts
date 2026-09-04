import { describe, expect, it } from 'vitest'
import { createA4PdfFromJpeg, projectPdfFilename } from './exportPdf'

describe('projectPdfFilename', () => {
  it('creates a safe PDF filename from the project name', () => {
    expect(projectPdfFilename(' Fair/Isle: 01 ')).toBe('Fair_Isle_ 01.pdf')
  })

  it('uses a fallback for an empty name', () => {
    expect(projectPdfFilename('  ')).toBe('pattern.pdf')
  })

  it('builds a one-page A4 PDF containing a JPEG image', () => {
    const bytes = createA4PdfFromJpeg(
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      1,
      1,
    )
    const text = new TextDecoder().decode(bytes)
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]')
    expect(text).toContain('/Filter /DCTDecode')
    expect(text.endsWith('%%EOF')).toBe(true)
  })
})
