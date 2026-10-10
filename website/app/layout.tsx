import type { Metadata, Viewport } from 'next'
import { DM_Sans, JetBrains_Mono, Outfit } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { SITE, SITE_URL } from '@/lib/site'
import './globals.css'

const heading = Outfit({ variable: '--font-heading', subsets: ['latin'], display: 'swap' })
const sans = DM_Sans({ variable: '--font-sans', subsets: ['latin'], display: 'swap' })
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE.name}: ${SITE.tagline.toLowerCase()}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ['product demo video', 'demo video from code', 'Playwright video', 'narrated screen recording', 'vertical video for Shorts and Reels', 'Claude Code skill', 'video themes'],
  openGraph: { siteName: SITE.name, type: 'website', locale: 'en' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ECE9FB' },
    { media: '(prefers-color-scheme: dark)', color: '#17142E' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${heading.variable} ${sans.variable} ${mono.variable} antialiased`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col overflow-x-clip">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
