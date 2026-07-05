import { Block } from './types'
import { toSlug } from './slug'

export function extractSongMeta(blocks: Block[]): { title: string; artist: string } {
  const header = blocks.find(b => b.type === 'header')
  const lines = header?.sections[0]?.lines ?? []
  return {
    title: lines[0]?.text?.trim() || 'Sem título',
    artist: lines[1]?.text?.trim() || '',
  }
}

export function songSlug(artist: string, title: string): string {
  return `${toSlug(artist)}--${toSlug(title)}`
}
