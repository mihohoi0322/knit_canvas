import type { YarnColor } from './types'

const colors = [
  ['snow', 'スノー', '#f8f5ec'],
  ['oat', 'オート', '#d8c9ac'],
  ['sand', 'サンド', '#bca680'],
  ['charcoal', 'チャコール', '#343735'],
  ['ink', 'インク', '#193047'],
  ['sky', 'スカイ', '#75a9c2'],
  ['lake', 'レイク', '#2d7385'],
  ['forest', 'フォレスト', '#315b48'],
  ['moss', 'モス', '#74815d'],
  ['sage', 'セージ', '#a6b49b'],
  ['lemon', 'レモン', '#e9ce5b'],
  ['mustard', 'マスタード', '#bf8e32'],
  ['orange', 'オレンジ', '#d8783d'],
  ['brick', 'ブリック', '#a94f3c'],
  ['rose', 'ローズ', '#c96c72'],
  ['blush', 'ブラッシュ', '#dda8a4'],
  ['wine', 'ワイン', '#733747'],
  ['plum', 'プラム', '#67445f'],
  ['lavender', 'ラベンダー', '#9a8fb4'],
  ['violet', 'バイオレット', '#665c9b'],
  ['cocoa', 'ココア', '#765641'],
  ['camel', 'キャメル', '#a8784f'],
  ['silver', 'シルバー', '#aeb2ad'],
  ['white', 'ホワイト', '#ffffff'],
] as const

export const DEFAULT_PALETTE: YarnColor[] = colors.map(([id, name, value]) => ({
  id,
  name,
  value,
}))
