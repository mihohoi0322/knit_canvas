import { renderPattern } from '../canvas/render'
import type { PatternProject } from '../domain/types'
import { dimensions } from '../domain/project'

const PAGE_WIDTH = 1240
const PAGE_HEIGHT = 1754

export function projectPdfFilename(name: string) {
  const safeName = name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'pattern'
  return `${safeName}.pdf`
}

function dataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function joinBytes(parts: Uint8Array[]) {
  const result = new Uint8Array(
    parts.reduce((total, part) => total + part.length, 0),
  )
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

export function createA4PdfFromJpeg(
  jpeg: Uint8Array,
  imageWidth: number,
  imageHeight: number,
) {
  const encode = (value: string) => new TextEncoder().encode(value)
  const content = encode('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n')
  const objects = [
    encode('<< /Type /Catalog /Pages 2 0 R >>'),
    encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    encode(
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
    ),
    joinBytes([
      encode(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encode('endstream'),
    ]),
    joinBytes([
      encode(
        `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      encode('\nendstream'),
    ]),
  ]
  const parts = [encode('%PDF-1.4\n%KnitCanvas\n')]
  const offsets = [0]
  for (const [index, object] of objects.entries()) {
    offsets.push(parts.reduce((total, part) => total + part.length, 0))
    parts.push(encode(`${index + 1} 0 obj\n`), object, encode('\nendobj\n'))
  }
  const xrefOffset = parts.reduce((total, part) => total + part.length, 0)
  const xref = [
    'xref',
    `0 ${objects.length + 1}`,
    '0000000000 65535 f ',
    ...offsets
      .slice(1)
      .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `),
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    `startxref\n${xrefOffset}`,
    '%%EOF',
  ].join('\n')
  parts.push(encode(xref))
  return joinBytes(parts)
}

function patternImage(
  project: PatternProject,
  width: number,
  height: number,
  repeats: number,
  labels: boolean,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PDF用の編み図を作成できません')
  renderPattern(context, project, width, height, repeats, labels)
  return canvas
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 22,
) {
  context.fillStyle = '#53605b'
  context.font = `500 ${size}px system-ui, sans-serif`
  context.fillText(text, x, y)
}

export async function exportProjectPdf(project: PatternProject) {
  const page = document.createElement('canvas')
  page.width = PAGE_WIDTH
  page.height = PAGE_HEIGHT
  const context = page.getContext('2d')
  if (!context) throw new Error('PDFを作成できません')

  context.fillStyle = '#fffdf8'
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  context.fillStyle = '#203c35'
  context.fillRect(0, 0, PAGE_WIDTH, 18)
  context.font = '700 48px Georgia, "Yu Mincho", serif'
  context.fillText(project.name || '新しいパターン', 72, 92)
  drawLabel(context, 'Knit Canvas カラーワーク編み図', 74, 130, 19)
  context.strokeStyle = '#294f44'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(72, 154)
  context.lineTo(1168, 154)
  context.stroke()

  drawLabel(context, '編み図', 72, 198, 24)
  const grid = patternImage(project, 1096, 910, 1, true)
  context.drawImage(grid, 72, 215)

  drawLabel(context, '5回パターンリピート', 72, 1170, 24)
  const repeat = patternImage(project, 1096, 330, 5, false)
  context.drawImage(repeat, 72, 1187)

  context.strokeStyle = '#a79f91'
  context.beginPath()
  context.moveTo(72, 1554)
  context.lineTo(1168, 1554)
  context.stroke()
  const physical = dimensions(project)
  drawLabel(
    context,
    `書き出し日: ${new Intl.DateTimeFormat('ja-JP').format(new Date())}`,
    72,
    1602,
    18,
  )
  context.textAlign = 'right'
  context.fillStyle = '#203c35'
  context.font = '700 25px system-ui, sans-serif'
  context.fillText(`${project.columns}目 × ${project.rows}段`, 1168, 1600)
  context.font = '500 19px system-ui, sans-serif'
  context.fillText(
    `10cmあたり ${project.stitchesPer10cm}目 × ${project.rowsPer10cm}段`,
    1168,
    1640,
  )
  context.fillText(
    `完成寸法 約 ${physical.widthCm.toFixed(1)} × ${physical.heightCm.toFixed(1)} cm`,
    1168,
    1676,
  )
  context.textAlign = 'left'

  const jpeg = dataUrlBytes(page.toDataURL('image/jpeg', 0.94))
  const pdf = createA4PdfFromJpeg(jpeg, PAGE_WIDTH, PAGE_HEIGHT)
  const url = URL.createObjectURL(
    new Blob([pdf as BlobPart], { type: 'application/pdf' }),
  )
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = projectPdfFilename(project.name)
  anchor.click()
  URL.revokeObjectURL(url)
}
