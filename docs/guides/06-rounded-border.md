# 6. The rounded border

**What it is.** Every video is set a little smaller on a soft backdrop, with rounded
corners and a shadow under it. It makes a screen recording look presented, not raw.
It is on by default.

## Steps

**Keep it as it is:** do nothing.

**Change the backdrop colours** (from, to, and the glow at the sides):

```json
{ "style": { "backdrop": ["#0F3D2E", "#1F8A5B", "#B6F2C8"] } }
```

**Turn it off**, so the picture fills the frame:

```json
{ "style": { "border": "none" } }
```

**Turn it off for one run only:**

```bash
bunx showcase make --no-border
```

**In a hand-written video file** you can also change its size:

```ts
export default defineVideo({
  // ...
  border: { inset: 0.03, radius: 0.04, shadow: 0.5, colors: ['#1B2A8F', '#3D5AF1', '#B9A5FF'] },
  // or: border: false
})
```

| Part | Default | Meaning |
|---|---|---|
| `inset` | `0.022` | Space around the picture, as a share of the frame on each side |
| `radius` | `0.034` | Corner radius, as a share of the frame's short side |
| `colors` | blue to violet | The backdrop |
| `shadow` | `0.45` | How dark the shadow is, 0 to 1 |

## Try a change in seconds

The border is added when the file is built, not when the product is filmed. So after
one full render you can change the colours and rebuild without recording again:

```bash
bunx showcase make --remix
```

## Check it worked

Open the video: the corners are round, the backdrop shows on all four sides, and the
`picture` line of the report still shows the full size (for example 1920x1080).

## Good to know

- The picture inside is about 4 percent smaller than the frame. Keep anything
  important out of the outer 3 percent of your page, where the corner cuts.
- Pick backdrop colours from your brand: two close shades of one colour, and a light
  tint of it for the glow.
