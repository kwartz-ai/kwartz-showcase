# The Kwartz Showcase website

The landing page and the docs site for the kit, in this folder so the site and the docs
can never drift apart. It is not part of the npm package.

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, lucide-react and Motion, in a
clay style.

## Run it

```bash
cd website
bun install
bun run dev        # http://localhost:3000
bun run build      # every page as static HTML
bun run lint
```

## Where the content comes from

Nothing about the kit is typed by hand here.

| What | From | How |
|---|---|---|
| Every docs page and the changelog | `../docs/*.md`, `../docs/guides/*.md`, `../CHANGELOG.md` | `scripts/sync-docs.mjs` runs before every `dev` and `build`. Links between docs become links between pages |
| The themes, font pairings and version | `../src/brief/themes.ts`, `../src/brief/fonts.ts`, `../package.json` | `bun run sync:kit` writes `lib/generated/kit.json`, which is committed. CI fails when it is out of date |
| The theme studio's rules, looks and cards | `../src/brief/theme-rules.ts`, `../src/graphics/cards.ts` and what they import | `scripts/sync-engine.mjs` bundles them for the browser before every `dev` and `build`. The page runs the kit's code, not a copy. A test in the kit fails if these files start to need the disk |
| The ten steps of "Your first video" | `lib/guide.ts` | Written from `docs/getting-started.md` and guides 1, 3, 10 and 11. Update it when those change |
| The tour video in the guide | `public/videos/website-tour.mp4` | A web copy of the render of `../examples/website-tour` (its script and its `lavender` theme), about five and a half minutes in 36 scenes. Render it again after the site changes |
| The share picture | `public/og.png` | Drawn from `scripts/og/og.html` at 1200 by 630. Shown when a link to the site is sent in a chat or posted |
| The theme videos | `public/videos`, `public/posters` | Small web copies (960x540 and 540x960) of the renders of `examples/motion` |

After changing a theme in the kit, run `bun run sync:kit` and commit the result.

## Folder structure

Atomic design: small parts build bigger ones, and an atom knows nothing about the page
it is on.

```
app/                    routes, metadata, sitemap, robots
  (marketing)/          landing page, themes, the theme studio and how its prompt works, changelog
  docs/                 docs index, the first video guide, every doc
components/
  ui/                   shadcn/ui parts, as generated. Do not restyle these
  atoms/                ClayButton, ClayCard, Pill, IconBadge, Container
  molecules/            CopyCommand, CodeBlock, VideoPlayer, SearchBox, ThemeSwatch, ClaySelect, Reveal
  organisms/            SiteNav, Hero, HowItWorks, FeatureBento, GuideStepper, ThemeStudio, DocsSidebar, Markdown
  templates/            MarketingLayout, DocsLayout
lib/                    site settings, docs and theme data, the studio's logic, SEO helpers
scripts/                the sync scripts: docs, theme facts, the engine bundle
public/                 videos and posters
```

The clay look is a few tokens and utilities in `app/globals.css` (`clay`, `clay-flat`,
`clay-pressed`, `clay-violet`). Atoms wrap the shadcn/ui parts and add the clay surface,
so updating shadcn/ui does not undo the design.

## Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. Set **Root Directory** to `website`. Leave "Include files outside the Root Directory"
   on: the build reads `../docs`.
3. Set `NEXT_PUBLIC_SITE_URL` to the site's address (for example
   `https://showcase.example.com`). It is used for the sitemap, canonical links and
   share cards.
4. Every pull request gets a preview address. Merging to `main` publishes the site.

## Adding a page

- A doc: add the markdown file under `../docs`, then list it in a section in
  `scripts/sync-docs.mjs`. The page, the sidebar entry, the search entry and the sitemap
  entry follow.
- A theme: add it to the kit, run `bun run sync:kit`, and add its two videos and two
  posters to `public/`.
