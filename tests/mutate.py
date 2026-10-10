"""Break the code in one place at a time and confirm the tests notice.
Run from the repo root: python tests/mutate.py   (or: bun run test:mutate)
Each mutation is undone before the next; the files end as they started."""
import re
import subprocess

MUTATIONS = [
    ('src/encode.ts', 'const gain = lufs - measured.lufs', 'const gain = measured.lufs - lufs', 'loudness gain has the wrong sign'),
    ('src/encode.ts', "if (music) {\n    args.push('-stream_loop', '-1', '-i', music)", "if (music) {\n    args.push('-i', music)", 'music no longer loops'),
    ('src/encode.ts', 'out.filter((f) => f.t <= d.t1 || f.t > d.t2)', 'out.filter(() => true)', 'loading frames are no longer dropped'),
    ('src/stage.ts', 'return { x: b.x / z, y: b.y / z, w: b.width / z, h: b.height / z }', 'return { x: b.x, y: b.y, w: b.width, h: b.height }', 'overlays ignore the page zoom'),
    ('src/stage.ts', "    await this.setCaption(this.captionText)\n    if (label)", '    if (label)', 'caption is left under the spotlight'),
    ('src/stage.ts', 'await sleep(Math.max(160, t1 + ms - this.clock()))', 'await sleep(0)', 'dissolve does not wait for the new screen to paint'),
    ('src/sound.ts', "if (item.meta?.license !== 'CC0')", "if (item.meta?.license === 'NEVER')", 'any sound licence is accepted'),
    ('src/captions.ts', 'export const CAPTION_MAX = 92', 'export const CAPTION_MAX = 140', 'captions may run to three lines'),
    ('src/captions.ts', "if (last >= 0 && sentences[last]!.length < 16)", 'if (false)', 'very short sentences flash by'),
    ('src/verify.ts', '.filter((h) => h.overrunMs > 300)', '.filter((h) => h.overrunMs > 30000)', 'late holds are never flagged'),
    ('src/verify.ts', 's.text.toLowerCase().includes(b.toLowerCase())', 's.text.includes(b)', 'banned text check is case-sensitive'),
    ('src/render.ts', '    await server?.close()\n', '', 'static server is never stopped'),
    ('src/render.ts', "const sfx = take.draft || !wantFx ? []", 'const sfx = !wantFx ? []', 'a draft gets sound effects'),
    ('src/config.ts', "if (!s.say?.trim())", 'if (false)', 'a scene with no spoken line is accepted'),
    ('src/serve.ts', "if (!path.resolve(file).startsWith(path.resolve(root)))", 'if (false)', 'files outside the folder are served'),
    ('src/voice/tts.ts', 'const todo = clips.filter((c) => !fs.existsSync(c.out))', 'const todo = clips', 'every line is voiced again on every render'),
    ('src/setup.ts', 'if (!fs.existsSync(file)) await download(', 'await download(', 'the model is downloaded again every time'),
    ('src/cards.ts', "<div style=\"${rise(200)};font:800 76px/1.05 ${theme.type.display};letter-spacing:-.035em\">${esc(title)}</div>", "<div style=\"${rise(200)};font:800 76px/1.05 ${theme.type.display};letter-spacing:-.035em\">${title}</div>", 'title card no longer escapes its text'),
]

caught = 0
for path, old, new, what in MUTATIONS:
    src = open(path, encoding='utf-8').read()
    assert old in src, f'mutation target not found in {path}: {old[:50]}'
    open(path, 'w', encoding='utf-8', newline='\n').write(src.replace(old, new, 1))
    try:
        r = subprocess.run('bunx vitest run --exclude tests/cli.test.ts', shell=True, capture_output=True, text=True, encoding='utf-8', errors='replace')
        failed = re.search(r'Tests\s+(\d+) failed', r.stdout + r.stderr)
        n = int(failed.group(1)) if failed else 0
        caught += n > 0
        print(f"{'caught' if n else 'MISSED'}  {n:>3} failing   {what}")
    finally:
        open(path, 'w', encoding='utf-8', newline='\n').write(src)
print(f'\n{caught} of {len(MUTATIONS)} mutations caught')
