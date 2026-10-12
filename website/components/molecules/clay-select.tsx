'use client'

import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface Option {
  value: string
  label: string
  /** A quieter second line in the list. */
  hint?: string
}

/** A dropdown in the clay style: a pressed well that opens a raised clay list. Built on the shadcn/ui Select. */
export function ClaySelect({ id, value, options, onChange, className }: { id?: string; value: string; options: Option[]; onChange: (value: string) => void; className?: string }) {
  return (
    <Select value={value} items={options} onValueChange={(v) => onChange(String(v))}>
      <SelectTrigger
        id={id}
        className={cn(
          'clay-pressed h-auto! w-full min-w-0 cursor-pointer rounded-xl border-0 px-3 py-2.5 text-[0.95rem] text-foreground focus-visible:ring-0 focus-visible:outline-3 focus-visible:outline-violet dark:bg-clay-2 dark:hover:bg-clay-2',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="clay rounded-2xl border-0 p-1.5 ring-0">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="cursor-pointer rounded-xl px-3 py-2 text-[0.93rem] data-highlighted:bg-violet-soft data-highlighted:text-foreground">
            <span className="flex flex-col">
              <span>{o.label}</span>
              {o.hint ? <span className="text-xs text-muted-foreground">{o.hint}</span> : null}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** A tick box with its label, in the clay style. Built on the shadcn/ui Checkbox. */
export function ClayCheckbox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[0.95rem]">
      <Checkbox
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="clay-pressed size-5 cursor-pointer rounded-md border-0 data-checked:bg-primary data-checked:text-white dark:bg-clay-2 dark:data-checked:bg-primary"
      />
      {children}
    </label>
  )
}
