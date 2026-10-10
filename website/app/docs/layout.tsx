import { DocsLayout } from '@/components/templates/docs-layout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DocsLayout>{children}</DocsLayout>
}
