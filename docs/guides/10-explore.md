# 10. Explore the product

**What it is.** Before writing scenes you need to know what screens exist and how to
point at each button. `showcase explore` opens the product, visits its pages, and
writes a map with a screenshot of each screen.

## Steps

1. With a config in the folder:
   ```bash
   bunx showcase explore
   ```
   Or give an address directly, and visit more pages:
   ```bash
   bunx showcase explore https://app.example.com --max-pages 12
   ```

2. Open `.showcase/explore/map.md` and the screenshots beside it. For each screen:
   ```
   ## 1. Orders

   Address: https://app.example.com/orders
   Screenshot: screen-01.jpg

   Headings: Orders | Open
   Table with columns: Order, Date, Status

   Controls:
   - button "Changed only": `page.locator('[data-testid=orders-changed-only]')`
   - button "Export": `page.getByRole('button', { name: 'Export' })`
   ```

3. Copy a selector straight into a scene:
   ```ts
   await stage.click(page.locator('[data-testid=orders-changed-only]'))
   ```

## Check it worked

The command ends with a count and the product's own look:

```
4 screen(s) mapped. Read .showcase/explore/map.md and the screenshots beside it.
the product's own font: Inter; main button colour: #2fa8e0
```

Use that font and colour in `style` ([guide 5](05-style.md)).

## Good to know

- Explore only looks. It runs in read-only mode, and never follows a sign-out link, a
  download, or a data address.
- It visits 8 pages by default and lists the ones it left out. Raise `--max-pages` to
  include them.
- If the product needs a sign-in, run `showcase login` first and set `auth.session`
  ([guide 9](09-hosted-product.md)).
- A selector with a test id is the most stable. If your product has none, adding
  `data-testid` to the few elements a video clicks is worth it.
- `showcase plan` points at the map once it exists.
