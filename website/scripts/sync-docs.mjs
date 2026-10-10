// Reads the kit's own docs (../docs and ../CHANGELOG.md) into one JSON file the site
// renders, so there is a single copy of every doc. Runs before `dev` and `build`.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '../..')
const GITHUB = 'https://github.com/kwartz-ai/kwartz-showcase/blob/main/'

// The sections of the sidebar, in reading order (the order of docs/README.md).
const SECTIONS = [
  { id: 'start', title: 'Start', files: ['user-guide', 'getting-started', 'writing-a-video', 'config-driven-video'] },
  { id: 'guides', title: 'Feature guides', files: readdirSync(join(repo, 'docs/guides')).filter((f) => /^\d\d-.*\.md$/.test(f)).sort().map((f) => 'guides/' + f.slice(0, -3)) },
  { id: 'craft', title: 'Make it good', files: ['themes', 'fonts', 'craft-guide', 'troubleshooting'] },
  { id: 'internals', title: 'How it is built', files: ['how-it-works', 'architecture', 'tech-stack', 'testing', 'release-checklist'] },
  { id: 'background', title: 'Background', files: ['research'] },
]

const slugOf = (file) => file.replace(/^guides\/\d\d-/, 'guides/')
const routes = new Map()
for (const s of SECTIONS) for (const f of s.files) routes.set('docs/' + f + '.md', '/docs/' + slugOf(f))
routes.set('docs/README.md', '/docs')
routes.set('docs/guides/README.md', '/docs#guides')
routes.set('CHANGELOG.md', '/changelog')

/** Point a relative link at its page on the site, or at the file on GitHub. */
function rewriteLinks(body, fileInRepo) {
  return body.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
    if (/^(https?:|mailto:|#)/.test(target)) return whole
    const [path, hash] = target.split('#')
    const resolved = posix.normalize(posix.join(posix.dirname(fileInRepo), path))
    const route = routes.get(resolved)
    if (route) return `](${route.includes('#') ? route : route + (hash ? '#' + hash : '')})`
    return `](${GITHUB}${resolved}${hash ? '#' + hash : ''})`
  })
}

const plain = (md) => md.replace(/\*\*|`|^> ?/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim()

function load(fileInRepo) {
  const raw = readFileSync(join(repo, fileInRepo), 'utf8').replace(/\r\n/g, '\n')
  const title = (raw.match(/^# (.+)$/m)?.[1] ?? fileInRepo).trim()
  const body = rewriteLinks(raw.replace(/^# .+\n+/, ''), fileInRepo)
  const firstPara = body.split(/\n{2,}/).find((p) => p.trim() && !/^(#|```|\||>|-|\d+\.)/.test(p.trim())) ?? ''
  let description = plain(firstPara).replace(/^What it is\. /, '')
  if (description.length > 158) description = description.slice(0, 155).replace(/\s+\S*$/, '') + '...'
  const headings = [...body.replace(/```[\s\S]*?```/g, '').matchAll(/^(##|###) (.+)$/gm)].map((m) => ({ depth: m[1].length, text: plain(m[2]) }))
  return { title, body, description, headings, words: raw.split(/\s+/).length }
}

const docs = []
for (const s of SECTIONS) {
  for (const f of s.files) {
    const d = load('docs/' + f + '.md')
    const number = f.match(/^guides\/(\d\d)-/)?.[1]
    docs.push({ slug: slugOf(f), section: s.id, source: 'docs/' + f + '.md', number: number ? Number(number) : null, ...d, title: d.title.replace(/^\d+\.\s+/, '') })
  }
}
const changelog = load('CHANGELOG.md')

mkdirSync(join(here, '../lib/generated'), { recursive: true })
writeFileSync(join(here, '../lib/generated/docs.json'), JSON.stringify({ sections: SECTIONS.map(({ id, title }) => ({ id, title })), docs, changelog: changelog.body }))
console.log(`docs.json: ${docs.length} pages, ${docs.reduce((n, d) => n + d.words, 0)} words`)
