'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * Lets a block rise into place as it enters the screen. The content is in the HTML
 * from the start, so it is readable before any script runs and by search engines.
 */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ y: 22, scale: 0.985 }}
      whileInView={{ y: 0, scale: 1 }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
      transition={{ type: 'spring', stiffness: 170, damping: 20, delay }}
    >
      {children}
    </motion.div>
  )
}
