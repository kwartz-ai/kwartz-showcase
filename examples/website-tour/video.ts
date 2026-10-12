// A tour of the kit's own website (the website/ folder), filmed while it runs locally,
// in the lavender theme (themes/lavender.json) so the cards and captions match the pages
// they sit over. Five to six minutes, in five parts: the landing page, the docs, the
// first video guide, the themes and the theme studio.
//   cd website && bun run build && PORT=4310 bun run start     (in one terminal)
//   bun run showcase make examples/website-tour/showcase.config.json --draft
import { defineScenes, endCard, hookCard, stepsCard } from 'kwartz-showcase'
import type { Locator, Page } from 'playwright'

/** Bring an element to the middle of the screen and wait for the smooth scroll to end. */
async function bring(page: Page, el: Locator, block: 'center' | 'start' = 'center') {
  await el.evaluate((node, b) => node.scrollIntoView({ block: b as ScrollLogicalPosition, behavior: 'smooth' }), block)
  await page.waitForTimeout(900)
}

/** Bring an element to the upper part of the screen, well clear of the caption. */
async function lift(page: Page, el: Locator) {
  await el.evaluate((node) => window.scrollTo({ top: window.scrollY + node.getBoundingClientRect().top - 170, behavior: 'smooth' }))
  await page.waitForTimeout(900)
}

const open = async (page: Page, baseUrl: string, path: string) => {
  await page.goto(baseUrl + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
}

/** One choice in a clay dropdown: open it, then pick the item. */
async function choose(page: Page, stage: { click: (el: Locator) => Promise<void> }, trigger: string, item: string) {
  await stage.click(page.locator(trigger))
  await page.locator('[data-slot=select-item]').first().waitFor()
  await page.waitForTimeout(350)
  await stage.click(page.locator('[data-slot=select-item]', { hasText: item }).first())
  await page.waitForTimeout(300)
}

export default defineScenes({
  appRoot: 'main',
  prepare: async ({ page, baseUrl }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await open(page, baseUrl, '/')
    await page.locator('main h1').waitFor()
  },
  scenes: [
    // ── opening ──────────────────────────────────────────────────────────────
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
      say: 'The video at the top was made by the kit itself, from a script, in a theme built to match this page. Its controls are part of the site, and they sit under the picture, so they never cover a caption.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.3)
        await stage.click(page.locator('button[aria-label^="Play:"]'))
        await untilSaid(0.7)
        await stage.spotlight(page.locator('[role=slider]').locator('..'), { pad: 8, label: 'Play, seek, sound, full screen', side: 'above' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'install',
      say: 'Under the buttons is the one command that starts a video in your own project. The kit installs from npm, so there is nothing to clone.',
      run: async ({ page, stage, untilSaid }) => {
        await page.locator('video').evaluate((v: HTMLVideoElement) => v.pause()).catch(() => {})
        await untilSaid(0.3)
        await stage.spotlight(page.locator('main section').first().locator('.clay-pressed').first(), { pad: 8, label: 'Starts a video in your project', side: 'below' })
        await untilSaid(0.75)
        await stage.clearSpot()
        await stage.click(page.locator('button[aria-label="Copy the command"]'))
        await untilSaid(1)
      },
    },
    {
      id: 'parts',
      say: 'The site has a landing page and four more parts. The full docs, a step by step guide, a gallery of every theme, and a studio where you make a theme of your own.',
      motion: ({ theme, sayMs }) => stepsCard(theme, {
        overline: 'THE SITE',
        title: 'Four parts behind the front page',
        steps: [
          { title: 'Docs', body: 'thirty pages, in order' },
          { title: 'First video', body: 'ten steps to follow' },
          { title: 'Themes', body: 'twelve looks, with video' },
          { title: 'Studio', body: 'a theme of your own' },
        ],
      }, sayMs),
    },

    // ── the landing page ─────────────────────────────────────────────────────
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
      id: 'report',
      say: 'The last step shows the report printed after every render. Picture, length, loudness, captions and fonts are all measured, and the kit says plainly what it could not check.',
      run: async ({ page, stage, untilSaid }) => {
        const tabs = page.locator('[role=tablist][aria-label="The four steps"] button')
        await stage.click(tabs.nth(3))
        const report = page.locator('main [role=tabpanel] pre').first()
        // the full render found the caption over this highlight: lift it well clear
        await lift(page, report)
        await untilSaid(0.4)
        await stage.spotlight(report, { pad: 8, label: 'Measured, not guessed', side: 'below' })
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

    // ── the docs ─────────────────────────────────────────────────────────────
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
      id: 'guides',
      say: 'Sixteen short feature guides follow, one for each thing the kit can do: lengths, platforms, your own script, sound effects, a hosted product, and more.',
      run: async ({ page, stage, untilSaid }) => {
        const guides = page.locator('section#guides')
        await bring(page, guides, 'start')
        await untilSaid(0.5)
        await stage.spotlight(guides.locator('li').nth(2), { pad: 6, label: 'One feature, one short guide', side: 'below' })
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
      say: 'Commands and tables are drawn in the same clay style. And at the end, each page links to the one before it and the one after.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        await bring(page, page.locator('.prose-clay pre').first())
        await untilSaid(0.4)
        await bring(page, page.locator('.prose-clay .table-wrap').first())
        await untilSaid(0.66)
        await bring(page, page.locator('nav[aria-label="Next and previous doc"]'))
        // the next page draws diagrams, which is slow: change to it now, under this line
        await untilSaid(0.86)
        await stage.dissolve(async () => {
          await open(page, baseUrl, '/docs/architecture')
          await page.locator('.mermaid-box svg').first().waitFor({ timeout: 30000 })
          await lift(page, page.locator('.mermaid-box').first())
        })
        await untilSaid(1)
      },
    },
    {
      id: 'diagrams',
      say: 'The architecture page has diagrams of how the kit is put together. They are drawn from text in the docs, so they change when the docs change.',
      run: async ({ page, stage, untilSaid }) => {
        const diagram = page.locator('.mermaid-box').first()
        await untilSaid(0.5)
        await stage.spotlight(diagram, { pad: 6, label: 'Drawn from text in the docs', side: 'below' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },

    // ── the first video guide ────────────────────────────────────────────────
    {
      id: 'guide',
      say: 'The guide to your first video has ten steps, from installing the tools to sharing the finished file. A bar at the top shows how far you are.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        await stage.chapter('PART THREE', 'Your first video', async () => {
          await open(page, baseUrl, '/docs/first-video')
        })
        const rail = page.locator('[role=tablist][aria-label="Steps"]')
        await bring(page, rail)
        await untilSaid(0.4)
        await stage.spotlight(rail, { pad: 8, label: 'Ten steps, in order', side: 'above' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'guide-step',
      say: 'Each step gives the command to type, what you should see, and one tip. Step one checks the three free tools the kit needs.',
      run: async ({ page, stage, untilSaid }) => {
        const command = page.locator('main [role=tabpanel] pre').first()
        await bring(page, command)
        await untilSaid(0.3)
        await stage.spotlight(command, { pad: 8, label: 'The command, ready to copy', side: 'left' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'guide-install',
      say: 'Press next, and step two appears. Getting the kit is one line from npm, with Bun or with Node.',
      run: async ({ page, stage, untilSaid }) => {
        await untilSaid(0.15)
        await stage.click(page.locator('button', { hasText: 'Next step' }))
        const command = page.locator('main [role=tabpanel] pre').first()
        await bring(page, command)
        await untilSaid(0.55)
        await stage.spotlight(command, { pad: 8, label: 'One line, nothing to clone', side: 'left' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'guide-config',
      say: 'Step five is the config. A few lines say what to film, how long the video should be, where it will be posted, and in which theme.',
      run: async ({ page, stage, untilSaid }) => {
        const rail = page.locator('[role=tablist][aria-label="Steps"] button')
        await bring(page, rail.first())
        await untilSaid(0.15)
        await stage.click(rail.nth(4))
        const config = page.locator('main [role=tabpanel] pre').first()
        await bring(page, config)
        await untilSaid(0.55)
        await stage.spotlight(config, { pad: 8, label: 'Only the address is required', side: 'left' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'guide-render',
      say: 'Step nine is the render itself. It shows the two commands, and the report the kit prints when every check has passed.',
      run: async ({ page, stage, untilSaid }) => {
        const rail = page.locator('[role=tablist][aria-label="Steps"] button')
        await bring(page, rail.first())
        await untilSaid(0.15)
        await stage.click(rail.nth(8))
        const report = page.locator('main [role=tabpanel] pre').nth(1)
        await bring(page, report)
        await untilSaid(0.55)
        await stage.spotlight(report, { pad: 8, label: 'Every line starts with ok', side: 'above' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'guide-all',
      say: 'Below the stepper, the same ten steps are written out on one page, for reading straight through.',
      run: async ({ page, untilSaid }) => {
        await bring(page, page.locator('#all-steps'), 'start')
        await untilSaid(0.6)
        await bring(page, page.locator('#all-steps').locator('..').locator('li').nth(2), 'start')
        await untilSaid(1)
      },
    },

    // ── the themes ───────────────────────────────────────────────────────────
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
      id: 'parts-of-look',
      say: 'Below, the parts of the look are drawn with the theme\'s real styles. Beside them is the command that starts a video in that theme, with a skill for an agent.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        const parts = page.locator('h2', { hasText: 'The parts of the look' }).locator('..')
        await bring(page, parts)
        await untilSaid(0.3)
        await stage.spotlight(parts, { pad: 6, label: 'Drawn from the kit\'s own source', side: 'right' })
        await untilSaid(0.7)
        await stage.clearSpot()
        // change to the themes page now, under this line, so the next one starts on it
        await untilSaid(0.86)
        await stage.dissolve(async () => {
          await open(page, baseUrl, '/themes')
          await bring(page, page.locator('h2', { hasText: 'This site has its own theme' }).locator('..').locator('..'))
        })
        await untilSaid(1)
      },
    },
    {
      id: 'own-theme',
      say: 'This site has a theme of its own, called lavender. It starts from the clay look and takes the site\'s colours and fonts. This video is rendered in it.',
      run: async ({ page, stage, untilSaid }) => {
        const own = page.locator('h2', { hasText: 'This site has its own theme' }).locator('..').locator('..')
        await untilSaid(0.5)
        await stage.spotlight(own.locator('pre').first(), { pad: 8, label: 'One small file', side: 'left' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },

    // ── the theme studio ─────────────────────────────────────────────────────
    {
      id: 'studio',
      say: 'The studio is where you make a theme for your own brand. Settings on the left, a video frame on the right, and it changes as you choose.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        await stage.chapter('PART FIVE', 'The theme studio', async () => {
          await open(page, baseUrl, '/studio')
          await page.locator('iframe[title^="A frame"]').waitFor()
        })
        // the layout check found this highlight running under the caption: lift the frame first
        const frame = page.locator('iframe[title^="A frame"]').locator('..')
        await bring(page, frame)
        await untilSaid(0.5)
        await stage.spotlight(frame, { pad: 10, label: 'Drawn by the kit\'s own code', side: 'above' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'studio-look',
      say: 'Start from one of the looks. Then give it your brand colour, and the frame is drawn again with the same cards a real video would have.',
      run: async ({ page, stage, untilSaid }) => {
        const settings = page.locator('aside[aria-label="Theme settings"]')
        await untilSaid(0.15)
        await stage.click(settings.locator('button', { hasText: 'bento' }).first())
        await untilSaid(0.5)
        const swatch = page.locator('button[aria-label="Use #DB2777"]')
        await bring(page, swatch)
        await stage.click(swatch)
        await untilSaid(1)
      },
    },
    {
      id: 'studio-fonts',
      say: 'Choose one of eleven font pairings picked for video, and how things move. Every choice shows on the frame at once.',
      run: async ({ page, stage, untilSaid }) => {
        await bring(page, page.locator('#studio-fonts'))
        await untilSaid(0.2)
        await choose(page, stage, '#studio-fonts', 'editorial')
        await untilSaid(0.7)
        await stage.click(page.locator('aside[aria-label="Theme settings"] button', { hasText: 'lively' }))
        await untilSaid(1)
      },
    },
    {
      id: 'studio-scenes',
      say: 'Four scenes show the theme at work: the opening, the steps, a highlight over a product screen, and the ending.',
      run: async ({ page, stage, untilSaid }) => {
        const frame = page.locator('h2', { hasText: 'How it looks on video' })
        await bring(page, frame, 'start')
        await untilSaid(0.3)
        await stage.click(page.locator('button', { hasText: 'Steps' }).first())
        await untilSaid(0.6)
        await stage.click(page.locator('button', { hasText: 'On your product' }))
        await untilSaid(1)
      },
    },
    {
      id: 'studio-rules',
      say: 'The page runs the kit\'s own rules on your theme. Pick a colour that cannot be read on this look, and it is refused, with the number.',
      run: async ({ page, stage, untilSaid }) => {
        const settings = page.locator('aside[aria-label="Theme settings"]')
        await bring(page, settings.locator('button', { hasText: 'clay' }).first())
        await untilSaid(0.15)
        await stage.click(settings.locator('button', { hasText: 'clay' }).first())
        const pale = page.locator('button[aria-label="Use #FDE68A"]')
        await bring(page, pale)
        await stage.click(pale)
        const rules = page.locator('h2', { hasText: 'Can it be read on video?' }).locator('..').locator('..')
        await bring(page, rules)
        await untilSaid(0.6)
        await stage.spotlight(page.locator('[role=status]'), { pad: 8, label: 'Refused, like a render would', side: 'below' })
        await untilSaid(1)
        await stage.clearSpot()
      },
    },
    {
      id: 'studio-surprise',
      say: 'Or press surprise me. Each press makes a whole new theme: a look, a colour, fonts and a backdrop that suit each other, and only one the rules accept.',
      run: async ({ page, stage, untilSaid }) => {
        const surprise = page.locator('[data-testid=studio-surprise]')
        await bring(page, surprise)
        await untilSaid(0.2)
        await stage.click(surprise)
        await untilSaid(0.5)
        await stage.click(surprise)
        await untilSaid(0.78)
        await stage.click(surprise)
        await untilSaid(1)
      },
    },
    {
      id: 'studio-kind',
      say: 'The video can be of your website, or a presentation. A presentation films no product: every scene is a graphic in your theme.',
      run: async ({ page, stage, untilSaid }) => {
        const kind = page.locator('button', { hasText: 'A presentation' })
        await bring(page, kind)
        await untilSaid(0.45)
        await stage.click(kind)
        await untilSaid(1)
      },
    },
    {
      id: 'studio-prompt',
      say: 'Then take it to Claude. One prompt carries the theme file, the config, the skills and what to make. Paste it into Claude Code, and Claude makes the video.',
      run: async ({ page, stage, untilSaid }) => {
        const out = page.locator('[data-testid=studio-output]')
        await bring(page, out)
        await untilSaid(0.4)
        await stage.spotlight(out, { pad: 8, label: 'Everything Claude needs', side: 'above' })
        await untilSaid(0.8)
        await stage.clearSpot()
        await stage.click(page.locator('[data-testid=studio-copy]'))
        await untilSaid(1)
      },
    },
    {
      id: 'studio-files',
      say: 'The theme file and the config can be copied alone too, for people who work by hand. Nothing is sent anywhere by the page.',
      run: async ({ page, stage, untilSaid, baseUrl }) => {
        await untilSaid(0.25)
        await stage.click(page.locator('button', { hasText: 'Theme file' }))
        await untilSaid(0.6)
        await stage.click(page.locator('button', { hasText: 'Config file' }))
        // back to the front page now, under this line, for the closing scene
        await untilSaid(0.88)
        await stage.dissolve(async () => {
          await open(page, baseUrl, '/')
        })
        await untilSaid(1)
      },
    },

    // ── closing ──────────────────────────────────────────────────────────────
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
      say: 'The Showcase website. Read the docs, follow the guide, pick a theme or make your own, and write your first video.',
      motion: ({ theme, sayMs, cta }) => endCard(theme, {
        title: 'Kwartz Showcase',
        overline: 'DEMO VIDEOS, WRITTEN NOT RECORDED',
        chips: ['Docs', 'Guide', 'Themes', 'Studio'],
        cta: cta?.text,
        ctaSub: cta?.sub,
        note: 'The website shown is running on a local machine.',
      }, sayMs),
    },
  ],
})
