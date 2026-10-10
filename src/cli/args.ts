/** The words after the command: flags, flags with a value, and plain arguments. */
export interface Args {
  flag: (name: string) => boolean
  opt: (name: string) => string | undefined
  /** The plain arguments, in order. */
  rest: string[]
}

/** Flags that are followed by a value. Every other --flag stands alone. */
const WITH_VALUE = new Set(['base', 'music', 'max-pages', 'out', 'role', 'mood', 'model', 'tries'])

export function parseArgs(argv: string[]): Args {
  const flags = new Set<string>()
  const opts = new Map<string, string>()
  const rest: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (!a.startsWith('--')) { rest.push(a); continue }
    const name = a.slice(2)
    if (WITH_VALUE.has(name) && argv[i + 1] !== undefined && !argv[i + 1]!.startsWith('--')) opts.set(name, argv[++i]!)
    else flags.add(name)
  }
  return { flag: (n) => flags.has(n), opt: (n) => opts.get(n), rest }
}
