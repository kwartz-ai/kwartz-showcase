"""Break the code in one place at a time and confirm the tests notice.
Run from the repo root: python tests/mutate.py   (or: bun run test:mutate)
Each mutation is undone before the next; the files end as they started."""
import re
import subprocess

MUTATIONS = [
    ('src/render/encode.ts', 'const gain = lufs - measured.lufs', 'const gain = measured.lufs - lufs', 'loudness gain has the wrong sign'),
    ('src/render/encode.ts', "if (music) {\n    args.push('-stream_loop', '-1', '-i', music)", "if (music) {\n    args.push('-i', music)", 'music no longer loops'),
    ('src/render/encode.ts', 'out.filter((f) => f.t <= d.t1 || f.t > d.t2)', 'out.filter(() => true)', 'loading frames are no longer dropped'),
    ('src/capture/stage.ts', 'return { x: b.x / z, y: b.y / z, w: b.width / z, h: b.height / z }', 'return { x: b.x, y: b.y, w: b.width, h: b.height }', 'overlays ignore the page zoom'),
    ('src/capture/stage.ts', "    await this.setCaption(this.captionText)\n    if (label)", '    if (label)', 'caption is left under the spotlight'),
    ('src/capture/stage.ts', 'await sleep(Math.max(160, t1 + ms - this.clock()))', 'await sleep(0)', 'dissolve does not wait for the new screen to paint'),
    ('src/audio/palette.ts', "if (item.meta?.license !== 'CC0')", "if (item.meta?.license === 'NEVER')", 'any sound licence is downloaded'),
    ('src/audio/palette.ts', "    && !cats.some((c) => BLOCKED_CATEGORIES.includes(c))\n", '', 'sounds from a blocked set are candidates'),
    ('src/audio/palette.ts', 'else if (m.centroidHz > rule.maxCentroidHz)', 'else if (false)', 'a squeaky sound passes the gate'),
    ('src/capture/readonly.ts', 'return READS.has(method.toUpperCase()) || allowed(url)', 'return true', 'read-only mode lets writes through'),
    ('src/brief/brief.ts', "isHosted(b.url) && !Array.isArray(b.safety?.banned)", 'false', 'a hosted product needs no banned list'),
    ('src/brief/resolve.ts', 'const readOnly = brief.safety?.readOnly ?? hosted', 'const readOnly = brief.safety?.readOnly ?? false', 'a hosted product is not read-only by default'),
    ('src/brief/plan.ts', 'export const SPEECH_SHARE = 0.92', 'export const SPEECH_SHARE = 1.4', 'the word budget overfills the length'),
    ('src/brief/script.ts', 'if (need.length !== inOrder.length) {', 'if (false) {', 'a script with the wrong number of paragraphs is accepted'),
    ('src/brief/presets.ts', "captionBand: { y: top + h, height: CAPTION_BAND }", "captionBand: { y: 0, height: CAPTION_BAND }", 'framed captions are drawn over the product'),
    ('src/render/encode.ts', "const video = ['-reinit_filter', '0', '-f'", "const video = ['-f'", 'captions are lost where frame sources meet'),
    ('src/render/encode.ts', 'let audioAt = captionImages.length ? 2 : 1', 'let audioAt = 1', 'sound is read from the caption track'),
    ('src/render/compose.ts', 'add(img.file, img.end - Math.max(t, img.start))', 'add(img.file, img.end - img.start)', 'overlapping captions push the track out of time'),
    ('src/capture/recorder.ts', "if (this.pausedAt !== null) return       // the app", "if (false) return       // the app", 'app frames leak into a motion scene'),
    ('src/capture/recorder.ts', 'this.skipped += skipMs', 'this.skipped += 0', 'a motion scene takes no time on the timeline'),
    ('src/graphics/motion.ts', 'if (t > times.at(-1)! && t < durationMs) times.push(t)', '', 'captions never change in a still motion scene'),
    ('src/capture/session.ts', "if (!fs.existsSync(ignore)) fs.writeFileSync(", 'if (false) fs.writeFileSync(', 'a saved session can be committed'),
    ('src/render/encode.ts', '    audioAt += 2\n', '', 'sound is read from the border pictures'),
    ('src/render/border.ts', 'const scale = 1 - 2 * border.inset', 'const scale = 1 + 2 * border.inset', 'the bordered picture is larger than the frame'),
    ('src/video/define.ts', "if (input === false) return { ...DEFAULT_BORDER, on: false }", 'if (input === false) return { ...DEFAULT_BORDER }', 'the border cannot be turned off'),
    ('src/brief/fonts.ts', '  const have = ROLE_WEIGHTS[role].filter((w) => known.weights.includes(w))', '  const have = ROLE_WEIGHTS[role]', 'a font is asked for weights it does not have'),
    ('src/brief/resolve.ts', 'if (contrast(match.accent, ink) >= 3) {', 'if (true) {', 'a colour too dark to see becomes the highlight'),
    ('src/brief/resolve.ts', "const match = s.match !== false ? explored : null", 'const match = explored', 'the product style cannot be turned off'),
    ('src/auto/auto.ts', "if (from !== 'kwartz-showcase') reasons.push(", 'if (false) reasons.push(', 'generated scenes may import anything'),
    ('src/auto/auto.ts', '      if (!reasons.length) return fs.writeFileSync(scenesFile, code)', '      return fs.writeFileSync(scenesFile, code)', 'a refused file is written and run'),
    ('src/auto/auto.ts', "    if (!opts.force) throw new Error(", '    if (false) throw new Error(', 'auto overwrites scenes a person wrote'),
    ('src/graphics/clip.ts', 'return Math.round(Math.max(used, speechMs))', 'return Math.round(used)', 'a clip scene cuts its narration short'),
    ('src/graphics/motion.ts', "const band = layout.captions === 'composite'", "const band = false", 'captions cannot be read under a light motion scene'),
    ('src/video/define.ts', '&& config.scenes.some((s) => s.run)) {', '&& false) {', 'a video that films a product needs no address'),
    ('src/graphics/motion.ts', "if (r.bottom > hi + 0.5) out.add(", 'if (false) out.add(', 'a graphic cut off at the bottom is not noticed'),
    ('src/graphics/motion.ts', 'return o > 0.15', 'return true', 'hidden things are reported as cut off'),
    ('src/verify/verify.ts', "      ok: n === 0,\n      detail: n === 0\n        ? 'every graphic", "      ok: true,\n      detail: n === 0\n        ? 'every graphic", 'a cut-off graphic does not fail the render'),
    ('src/capture/stage.ts', 'if (b.x < 0 || b.y < 0 || b.x + b.w > vw || b.y + b.h > vh) this.problems.push(', 'if (false) this.problems.push(', 'a highlight off screen is not noticed'),
    ('src/brief/resolve.ts', "else if (preset) { /* a theme's highlight is part of its look */ }", 'else if (false) { }', 'the product colour overrides a theme'),
    ('src/brief/themes.ts', "if (n === key || preset.aliases.includes(key)) return", "if (n === key) return", 'the design terms no longer name a theme'),
    ('src/render/border.ts', "if (r <= 0) return `color=c=white", "if (false) return `color=c=white", 'square corners dim the whole picture'),
    ('src/graphics/cards.ts', "cut: { keys: 'showcasecut', time: 0, ease: 'steps(1,end)' },", "cut: { keys: 'showcaserise', time: 1 },", 'a brutal card eases in softly'),
    ('src/brief/themes.ts', "caption: 'background:#0E1320;color:#FFFFFF;border-radius:8px',", "caption: 'background:#E5E7EB;color:#FFFFFF;border-radius:8px',", 'a theme ships captions nobody can read'),
    ('src/brief/custom-theme.ts', "if (/url\\s*\\(|expression\\s*\\(|javascript:|behavior\\s*:|-moz-binding/i.test(plain)) return", 'if (false) return', 'a theme file may load something from the network'),
    ('src/brief/custom-theme.ts', "  if (errors.length) throw new Error(`the theme ${path.basename(file)} would be hard to read on video", "  if (false) throw new Error(`the theme ${path.basename(file)} would be hard to read on video", 'an unreadable theme is accepted'),
    ('src/brief/custom-theme.ts', '    if (c < min) errors.push(', '    if (false) errors.push(', 'contrast is never enforced on a theme'),
    ('src/auto/theme.ts', '    if (!problems.errors.length) {', '    if (true) {', 'a refused theme from the model is saved'),
    ('src/brief/custom-theme.ts', "if (name === 'classic' || THEMES[name] ||", 'if (false ||', 'a custom theme may take the name of a built-in one'),
    ('src/capture/explore.ts', '&& !/log-?out|sign-?out/i.test(u)', '', 'explore follows the sign-out link'),
    ('src/render/captions.ts', 'export const CAPTION_MAX = 92', 'export const CAPTION_MAX = 140', 'captions may run to three lines'),
    ('src/render/captions.ts', "if (last >= 0 && sentences[last]!.length < 16)", 'if (false)', 'very short sentences flash by'),
    ('src/verify/verify.ts', '.filter((h) => h.overrunMs > 300)', '.filter((h) => h.overrunMs > 30000)', 'late holds are never flagged'),
    ('src/verify/verify.ts', 's.text.toLowerCase().includes(b.toLowerCase())', 's.text.includes(b)', 'banned text check is case-sensitive'),
    ('src/render/render.ts', '    await server?.close()\n', '', 'static server is never stopped'),
    ('src/render/render.ts', "const sfx = take.draft || !wantFx ? []", 'const sfx = !wantFx ? []', 'a draft gets sound effects'),
    ('src/video/define.ts', "if (!s.say?.trim() && !s.clip)", 'if (false)', 'a scene with no spoken line is accepted'),
    ('src/capture/serve.ts', "if (!path.resolve(file).startsWith(path.resolve(root)))", 'if (false)', 'files outside the folder are served'),
    ('src/audio/tts.ts', 'const todo = clips.filter((c) => !fs.existsSync(c.out))', 'const todo = clips', 'every line is voiced again on every render'),
    ('src/setup/setup.ts', 'if (!fs.existsSync(file)) await download(', 'await download(', 'the model is downloaded again every time'),
    ('src/graphics/cards.ts', '${caps(theme)}">${esc(title)}</div>', '${caps(theme)}">${title}</div>', 'title card no longer escapes its text'),
]

caught = 0
for path, old, new, what in MUTATIONS:
    src = open(path, encoding='utf-8').read()
    assert old in src, f'mutation target not found in {path}: {old[:50]}'
    open(path, 'w', encoding='utf-8', newline='\n').write(src.replace(old, new, 1))
    try:
        r = subprocess.run('bunx vitest run --exclude tests/unit/cli/cli.test.ts', shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        failed = re.search(r'Tests\s+(\d+) failed', r.stdout + r.stderr)
        n = int(failed.group(1)) if failed else 0
        caught += n > 0
        print(f"{'caught' if n else 'MISSED'}  {n:>3} failing   {what}")
    finally:
        open(path, 'w', encoding='utf-8', newline='\n').write(src)
print(f'\n{caught} of {len(MUTATIONS)} mutations caught')
