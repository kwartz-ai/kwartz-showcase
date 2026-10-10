// A script the person wrote themselves: plain text, one paragraph per scene.
// A "## name" heading before a paragraph ties it to the scene with that id.
import { countWords } from './plan.ts'

export interface ScriptLine { id?: string; say: string }

export function parseScript(text: string): ScriptLine[] {
  const lines: ScriptLine[] = []
  let id: string | undefined
  for (const block of text.replace(/\r\n/g, '\n').split(/\n\s*\n/)) {
    const kept: string[] = []
    for (const raw of block.split('\n')) {
      const line = raw.trim()
      const heading = line.match(/^#{1,6}\s+(.+)$/)
      if (heading) id = heading[1]!.trim().toLowerCase().replace(/[^\w]+/g, '-').replace(/^-|-$/g, '')
      else if (line) kept.push(line)
    }
    if (kept.length) {
      lines.push({ ...(id ? { id } : {}), say: kept.join(' ') })
      id = undefined
    }
  }
  return lines
}

/** Give each scene that has no spoken line one from the script: by id where the
 *  script names it, otherwise in order. The person's words are never changed. */
export function applyScript<T extends { id: string; say?: string }>(scenes: T[], script: ScriptLine[]): (T & { say: string })[] {
  const byId = new Map(script.filter((l) => l.id).map((l) => [l.id!, l.say]))
  const inOrder = script.filter((l) => !l.id || !scenes.some((s) => s.id === l.id)).map((l) => l.say)
  const need = scenes.filter((s) => !s.say?.trim() && !byId.has(s.id))
  if (need.length !== inOrder.length) {
    throw new Error(`the script has ${inOrder.length} paragraph(s) to place, but ${need.length} scene(s) have no spoken line `
      + `(${need.map((s) => s.id).join(', ') || 'none'}). Give every scene one paragraph, or name paragraphs with "## scene-id".`)
  }
  let next = 0
  return scenes.map((s) => ({ ...s, say: s.say?.trim() ? s.say : byId.get(s.id) ?? inOrder[next++]! }))
}

/** How a script measures against a word budget. It is reported, never cut. */
export function scriptFit(script: ScriptLine[], budgetWords: number): { words: number; over: number; message: string | null } {
  const words = script.reduce((n, l) => n + countWords(l.say), 0)
  const over = words - budgetWords
  const message = over > budgetWords * 0.1
    ? `the script is ${words} words; the chosen length fits about ${budgetWords}. Cut about ${over} words, or choose a longer video.`
    : null
  return { words, over, message }
}
