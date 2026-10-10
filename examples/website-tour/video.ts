// A tour of the kit's own website (the website/ folder), filmed while it runs locally,
// in the lavender theme (themes/lavender.json) so the cards and captions match the pages
// they sit over. About three minutes, in four parts.
//   cd website && bun run build && PORT=4310 bun run start     (in one terminal)
//   bun run showcase make examples/website-tour/showcase.config.json --draft
import { defineScenes, endCard, hookCard, stepsCard } from 'kwartz-showcase'
import type { Locator, Page } from 'playwright'

/** Bring an element to the middle of the screen and wait for the smooth scroll to end. */
async function bring(page: Page, el: Locator, block: 'center' | 'start' = 'center') {
  await el.evaluate((node, b) => node.scrollIntoView({ block: b as ScrollLogicalPosition, behavior: 'smooth' }), block)
  await page.waitForTimeout(900)
}

const open = async (page: Page, baseUrl: string, path: string) => {
  await page.goto(baseUrl + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
}

export default defineScenes({
  appRoot: 'main',
  prepare: async ({ page, baseUrl }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await open(page, baseUrl, '/')
    await page.locator('main h1').waitFor()
  },
  scenes: [
    {
      id: 'hook',
      say: 'You built a product, and now it needs a demo video. But where do you start, and who explains how?',
      motion: ({ theme, sayMs }) => hookCard(theme, {
        overline: 'A NEW TOOL',
        title: 'Where do you start?',
        sub: 'A kit is only as good as its guide.',
        questions: ['How do I make my first video?'],
      }, sayMs),
    },
    {
      id: 'intro',
      say: 'This is the Showcase website. It takes you from nothing installed to a finished, narrated demo video of your own product.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.35)
        await stage.spotlight(page.locator('main h1'), { pad: 14, label: 'The whole idea, in five words', side: 'below' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'hero-video',
      say: 'The video at the top was made by the kit itself, from a script, in a theme built to match this page. One press plays it.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.6)
        await stage.click(page.locator('button[aria-label^="Play:"]'))
        await untilSaid(1)
      },
    },
    {
      id: 'copy',
      say: 'Under the buttons is the one command that starts a video in your own project. Press the button beside it, and it is copied for your terminal.',
      run: async ({ page, stage, untilSaid }) => {
        await page.locator('video').evaluate((v: HTMLVideoElement) => v.pause()).catch(() => {})
        await untilSaid(0.25)
        await stage.spotlight(page.locator('main section').first().locator('.clay-pressed').first(), { pad: 8, label: 'Starts a video in your project', side: 'below' })
        await untilSaid(0.7)
        await stage.clearSpot()
        await stage.click(page.locator('button[aria-label="Copy the command"]'))
        await untilSaid(1)
      },
    },
    {
      id: 'how',
      say: 'The site has four parts. A landing page that explains the idea, the full docs, a step by step guide, and a gallery of every theme.',
      motion: ({ theme, sayMs }) => stepsCard(theme, {
        overline: 'THE SITE',
        title: 'Four parts, one journey',
        steps: [
          { title: 'Landing page', body: 'what it is, and why' },
          { title: 'Docs', body: 'thirty pages, in order' },
          { title: 'First video', body: 'ten steps to follow' },
          { title: 'Themes', body: 'twelve looks, with video' },
        ],
      }, sayMs),
    },
    {
      id: 'steps',
      say: 'Further down, four steps explain how a video is made: write, film, voice and check. Each one opens to show the real code, or what the kit really adds.',
      run: async ({ page, stage, untilSaid }) => {
        const tabs = page.locator('[role=tablist][aria-label="The four steps"] button')
        await bring(page, tabs.first())
        await untilSaid(0.45)
        await stage.click(tabs.nth(1))
        await untilSaid(0.75)
        await stage.click(tabs.nth(2))
        await untilSaid(1)
      },
    },
    {
      id: 'check',
      say: 'The last step shows the report printed after every render. Picture, length, loudness, captions and fonts are all measured, and the kit says plainly what it could not check.',
      run: async ({ page, stage, untilSaid }) => {
        const tabs = page.locator('[role=tablist][aria-label="The four steps"] button')
        await stage.click(tabs.nth(3))
        // the layout check found this label under the caption: lift the report to the middle first
        await bring(page, page.locator('main [role=tabpanel] pre').first())
        await untilSaid(0.4)
        await stage.spotlight(page.locator('main [role=tabpanel] pre').first(), { pad: 8, label: 'Measured, not guessed', side: 'above' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'features',
      say: 'The tiles show what the kit adds for you. Every shape from one script, sound effects that are measured, and a layout check so nothing is cut off. Each tile leads to its guide.',
      run: async ({ page, stage, untilSaid }) => {
        const tile = page.locator('main a[href="/docs/guides/platforms-and-shapes"]').first()
        await bring(page, tile)
        await untilSaid(0.3)
        await stage.spotlight(tile, { pad: 6, label: 'Five shapes, one script', side: 'right' })
        await untilSaid(0.62)
        await stage.clearSpot()
        await stage.moveTo(page.locator('main a[href="/docs/troubleshooting"]').first())
        await untilSaid(1)
      },
    },
    {
      id: 'strip',
      say: 'Six of the twelve themes are shown on the landing page. Every picture is a real frame from a rendered video, not a drawing.',
      run: async ({ page, stage, untilSaid }) => {
        const card = page.locator('main a[href="/themes/glass"]').first()
        await bring(page, card)
        await untilSaid(0.5)
        await stage.spotlight(card, { pad: 6, label: 'A frame from the real render', side: 'right' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'docs',
      say: 'The docs hold all thirty pages of the kit, in reading order. Each card shows what the page covers, and how many minutes it takes to read.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        await stage.chapter('PART TWO', 'The docs', async () => {
          await open(page, baseUrl, '/docs')
        })
        await untilSaid(0.45)
        const section = page.locator('section#start')
        await bring(page, section)
        await stage.spotlight(section.locator('li').first(), { pad: 6, label: 'What it covers, and how long', side: 'below' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'search',
      say: 'Search finds any doc, guide or theme. Press control K, type a word, and the matching pages appear at once.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.3)
        await stage.click(page.locator('aside button', { hasText: 'Search' }))
        await page.locator('[data-slot=command-input]').waitFor()
        await untilSaid(0.55)
        await page.keyboard.type('border', { delay: 110 })
        await untilSaid(1)
      },
    },
    {
      id: 'doc',
      say: 'Every doc is read straight from the kit\'s own files when the site is built. So the site can never say something different from the product.',
      run: async ({ page, stage, untilSaid }) => {
        await stage.dissolve(async () => {
          await page.keyboard.press('Enter')
          await page.locator('h1', { hasText: 'The rounded border' }).waitFor()
          await page.waitForLoadState('networkidle')
        })
        await untilSaid(0.45)
        await stage.spotlight(page.locator('nav[aria-label="On this page"]'), { pad: 6, label: 'Jump to any part', side: 'below' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'doc-body',
      say: 'Commands, tables and diagrams are drawn in the same clay style. And at the end, each page links to the one before it and the one after.',
      run: async ({ page, stage, untilSaid }) => {
        await bring(page, page.locator('.prose-clay pre').first())
        await untilSaid(0.4)
        await bring(page, page.locator('.prose-clay .table-wrap').first())
        await untilSaid(0.72)
        await bring(page, page.locator('nav[aria-label="Next and previous doc"]'))
        await untilSaid(1)
      },
    },
    {
      id: 'guide',
      say: 'The guide to your first video has ten steps, from installing the tools to sharing the finished file. A bar at the top shows how far you are.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        await stage.chapter('PART THREE', 'Your first video', async () => {
          await open(page, baseUrl, '/docs/first-video')
        })
        await untilSaid(0.4)
        await stage.spotlight(page.locator('[role=tablist][aria-label="Steps"]'), { pad: 8, label: 'Ten steps, in order', side: 'below' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'guide-step',
      say: 'Each step gives the command to type, what you should see, and one tip. Press next, and the following step appears, with the bar moving along.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.22)
        await stage.spotlight(page.locator('main [role=tabpanel] pre').first(), { pad: 8, label: 'The command, ready to copy', side: 'left' })
        await untilSaid(0.52)
        await stage.clearSpot()
        await stage.click(page.locator('button', { hasText: 'Next step' }))
        await untilSaid(0.8)
        await stage.click(page.locator('button', { hasText: 'Next step' }))
        await untilSaid(1)
      },
    },
    {
      id: 'guide-render',
      say: 'Step nine is the render itself. It shows the two commands, and the report the kit prints when every check has passed.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.2)
        await stage.click(page.locator('[role=tablist][aria-label="Steps"] button').nth(8))
        await bring(page, page.locator('main [role=tabpanel] pre').nth(1))
        await untilSaid(0.55)
        await stage.spotlight(page.locator('main [role=tabpanel] pre').nth(1), { pad: 8, label: 'Every line starts with ok', side: 'above' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'themes',
      say: 'The themes page shows all twelve looks. One word in the config changes the cards, captions, fonts, colours, movement and sound together.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        await stage.chapter('PART FOUR', 'Themes', async () => {
          await open(page, baseUrl, '/themes')
        })
        await untilSaid(0.45)
        await bring(page, page.locator('main a[href="/themes/bento"]').first())
        await untilSaid(1)
      },
    },
    {
      id: 'theme',
      say: 'Each theme has its own page, with the full video in landscape and in vertical, and its facts read from the kit\'s source: fonts, movement and sound.',
      run: async ({ page, stage, untilSaid }) => {
        await stage.cut(page.locator('main a[href="/themes/glass"]').first(), async () => {
          await page.locator('h1', { hasText: 'The glass theme' }).waitFor()
          await page.waitForLoadState('networkidle')
        })
        await untilSaid(0.5)
        await stage.click(page.locator('button', { hasText: '9:16' }))
        await untilSaid(0.75)
        await stage.click(page.locator('button', { hasText: '16:9' }))
        await untilSaid(1)
      },
    },
    {
      id: 'parts',
      say: 'Below, the parts of the look are drawn with the theme\'s real styles. Beside them is the command that starts a video in that theme, with a skill for an agent.',
      run: async ({ page, stage, untilSaid }) => {
        const parts = page.locator('h2', { hasText: 'The parts of the look' }).locator('..')
        await bring(page, parts)
        await untilSaid(0.3)
        await stage.spotlight(parts, { pad: 6, label: 'Drawn from the kit\'s own source', side: 'right' })
        await untilSaid(0.7)
        await stage.clearSpot()
        await untilSaid(1)
      },
    },
    {
      id: 'dark',
      say: 'The whole site follows your setting, light or dark. One button switches it, and every clay surface changes with it.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.45)
        await stage.click(page.locator('button[aria-label="Switch between light and dark"]'))
        await untilSaid(1)
      },
    },
    {
      id: 'end',
      say: 'The Showcase website. Read the docs, follow the guide, pick a theme, and make your first video.',
      motion: ({ theme, sayMs, cta }) => endCard(theme, {
        title: 'Kwartz Showcase',
        overline: 'DEMO VIDEOS, WRITTEN NOT RECORDED',
        chips: ['Docs', 'Guide', 'Themes'],
        cta: cta?.text,
        ctaSub: cta?.sub,
        note: 'The website shown is running on a local machine.',
      }, sayMs),
    },
  ],
})
