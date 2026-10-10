# 3. Platforms and shapes

**What it is.** Name the places the video will be posted. The kit renders the right
shape for each, from one script, and gives every platform its own named file.

## Steps

1. List the platforms:
   ```json
   {
     "name": "demo",
     "url": "http://localhost:3000",
     "platforms": ["youtube", "youtube-shorts", "instagram-reel", "linkedin"]
   }
   ```

   | Shape | Size | Platforms |
   |---|---|---|
   | `landscape` 16:9 | 1920x1080 | `youtube`, `x`, `website`, `share` |
   | `vertical` 9:16 | 1080x1920 | `youtube-shorts`, `instagram-reel`, `instagram-story`, `facebook-reel`, `tiktok`, `whatsapp-status`, `snapchat` |
   | `square` 1:1 | 1080x1080 | `linkedin` |
   | `portrait` 4:5 | 1080x1350 | `instagram-feed`, `facebook` |
   | `tall` 2:3 | 1080x1620 | `pinterest` |

   You can also name shapes directly, or give a size:
   `"formats": ["square", { "width": 1200, "height": 1600 }]`.

2. Render:
   ```bash
   bunx showcase make --draft
   bunx showcase make
   ```

## Check it worked

For the config above, `out/` holds:

```
demo.landscape.mp4      demo.youtube.mp4
demo.vertical.mp4       demo.youtube-shorts.mp4   demo.instagram-reel.mp4
demo.square.mp4         demo.linkedin.mp4
```

Each shape has its own report, and its `picture` line shows the size.

## Making a desktop product work on a phone

A vertical video uses the `framed` layout: the product is a window in the upper part,
zoomed so its type can be read, with large captions below it.

- Zoom closer in tall shapes. A scene receives `layout`:
  ```ts
  await stage.focus(el, { scale: layout.mode === 'fill' ? 1.5 : 1.9, label: 'Old date kept' })
  ```
- Keep labels to three words.
- Leave a scene out of other shapes only when it cannot work there:
  `formats: ['landscape']`.
- If your product has a real mobile layout, set `"layout": "responsive"` to film it at
  phone width.

## Good to know

- The top 12 percent and bottom 20 percent of a vertical video are kept clear, because
  phone apps draw their own buttons there.
- `showcase make` warns when a video is long for a platform (over 60 seconds for
  short vertical video).
- Open the vertical file on a phone before posting. It is the shape most likely to
  need a closer zoom.
