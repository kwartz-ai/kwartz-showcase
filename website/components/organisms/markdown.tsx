import Link from 'next/link'
import type { ComponentProps, ReactElement } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import remarkGfm from 'remark-gfm'
import { Mermaid } from '@/components/molecules/mermaid'

/** The text inside a rendered code element, for the diagrams. */
function textOf(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && typeof node === 'object' && 'props' in node) return textOf((node as ReactElement<{ children?: unknown }>).props.children)
  return ''
}

/** Renders one of the kit's markdown docs in the site's clay prose style. */
export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose-clay">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: false, plainText: ['mermaid', 'text'] }]]}
        components={{
          a({ href = '', children, ...rest }: ComponentProps<'a'>) {
            if (href.startsWith('/')) return <Link href={href}>{children}</Link>
            if (href.startsWith('#')) return <a href={href}>{children}</a>
            return (
              <a href={href} rel="noreferrer" {...rest}>
                {children}
              </a>
            )
          },
          table({ children }) {
            return (
              <div className="table-wrap">
                <table>{children}</table>
              </div>
            )
          },
          pre({ children }) {
            const child = children as ReactElement<{ className?: string; children?: unknown }>
            if (child?.props?.className?.includes('language-mermaid')) return <Mermaid chart={textOf(child).trim()} />
            return <pre>{children}</pre>
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
