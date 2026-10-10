'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { ClayButton } from '@/components/atoms/clay-button'

/** Switches the site between light and dark clay. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  return (
    <ClayButton variant="soft" size="icon" aria-label="Switch between light and dark" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </ClayButton>
  )
}
