import { ImageResponse } from 'next/og'
import { SITE } from '@/lib/site'

export const alt = `${SITE.name}: ${SITE.tagline.toLowerCase()}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** The picture shown when a page of the site is shared. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#ECE9FB', color: '#1E1B3A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 36, fontWeight: 700 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: '#6A4BEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="34" height="34" viewBox="0 0 24 24">
              <path d="M7 4.5v15l13-7.5z" fill="#fff" />
            </svg>
          </div>
          {SITE.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1.02, letterSpacing: -3 }}>Demo videos, written not recorded.</div>
          <div style={{ fontSize: 34, color: '#5F5A82' }}>Films your real product, reads the narration in a local voice, builds the video.</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['#7C5CF6', '#7FD8B4', '#FFB48A', '#FFD166', '#8EC5FF', '#FF9FB8'].map((c) => (
            <div key={c} style={{ width: 56, height: 56, borderRadius: 18, background: c }} />
          ))}
        </div>
      </div>
    ),
    size,
  )
}
