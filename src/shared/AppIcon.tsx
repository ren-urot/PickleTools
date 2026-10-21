import glyphs from './glyphs.json'

export type Glyph = keyof typeof glyphs

export function AppIcon({ glyph, color, size = 48 }: { glyph: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="shrink-0">
      <rect width="48" height="48" rx="12" fill={color} />
      <g transform="translate(12 12)" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={glyphs[glyph as Glyph]} />
      </g>
      <circle cx="39" cy="9" r="4" fill="#d9f02b" />
    </svg>
  )
}
