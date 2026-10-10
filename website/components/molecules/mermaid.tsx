'use client'

import { useEffect, useId, useState } from 'react'
import { useTheme } from 'next-themes'

/** Draws one diagram from the docs. The library is only fetched on a page that has one. */
export function Mermaid({ chart }: { chart: string }) {
  const id = 'm' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const { resolvedTheme } = useTheme()
  const [svg, setSvg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    import('mermaid')
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({ startOnLoad: false, theme: resolvedTheme === 'dark' ? 'dark' : 'neutral', securityLevel: 'strict', fontFamily: 'inherit' })
        const out = await mermaid.render(id, chart)
        if (alive) setSvg(out.svg)
      })
      .catch(() => {
        if (alive) setSvg(null)
      })
    return () => {
      alive = false
    }
  }, [chart, id, resolvedTheme])

  if (svg) return <div className="mermaid-box [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
  // until the diagram is drawn, and if it cannot be: its source, which is readable
  return (
    <pre>
      <code>{chart}</code>
    </pre>
  )
}
