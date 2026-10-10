# 2. Set the length

**What it is.** You say how long the video should be. The kit turns that into a number
of scenes and a word budget, because a video's length comes from its narration: the
voice reads about 3 words a second.

## Steps

1. Set `length` in seconds (10 to 600):
   ```json
   { "url": "http://localhost:3000", "length": 60 }
   ```

2. Ask for the plan:
   ```bash
   bunx showcase plan
   ```

   | Length | Scenes | Words |
   |---|---|---|
   | 30 s | 4 | about 70 |
   | 60 s | 7 | about 143 |
   | 90 s | 9 | about 220 |
   | 180 s | 18, in chapters | about 419 |

   Any other length works: about one scene per 10 seconds.

3. Write the narration to the budget, then render:
   ```bash
   bunx showcase make
   ```

## Check it worked

The report has a `length` line. It passes within 10 percent of the target:

```
ok    length       29.5 s (target 27 to 33 s)
```

When it misses, the next line says what to change, in words:

```
FAIL  length       25.1 s (target 27 to 33 s)
to fit the length: 4.9 s too short: add about 14 words of narration, or one scene
```

Add or cut that many words in `video.ts` and render again.

## Good to know

- Change the words, not the pacing. Pauses that are too short make the video feel rushed.
- A draft render (`--draft`) estimates the length from the word count, so you can fit
  the length before the voice is generated.
- The default is 30 seconds.
