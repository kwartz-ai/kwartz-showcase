# 9. A hosted product

**What it is.** Filming a live product, not one on your own machine. A live product
may hold real data, so the kit adds three protections: names that must never show,
read-only mode, and a sign-in that is never written down.

## Steps

1. Set the address and list the names that must never appear on screen: real
   customers, people, tenants. Use `[]` only if there are truly none.
   ```json
   {
     "url": "https://app.example.com",
     "safety": { "banned": ["Acme Corp", "Jane Doe"] }
   }
   ```
   Without `safety.banned`, a hosted address is refused.

2. Sign in once. A browser window opens; sign in by hand, two-step codes included.
   When you see the screen the video should start from, go back to the terminal and
   press Enter.
   ```bash
   bunx showcase login
   ```

3. Tell the config to use the saved session:
   ```json
   { "auth": { "session": ".showcase/session.json" } }
   ```

4. Make sure `.showcase/` is in `.gitignore`. (The kit also writes its own ignore file
   inside that folder.)

5. Render:
   ```bash
   bunx showcase make --draft
   bunx showcase make
   ```

## Check it worked

The report has two lines for safety:

```
ok    banned text  none of 2 banned terms on any screen
ok    read-only    on, and nothing tried to change data
```

- `banned text` fails if any listed name was on a screen or a card. Do not share the
  video; change the scene and render again.
- `read-only` lists every request that was refused.

## Read-only mode

For a hosted address it is on. Any request that could change data (everything except
GET, HEAD and OPTIONS) is stopped before it leaves the browser. A wrong click cannot
create, edit or delete anything.

If the product reads data with POST (a search, GraphQL), a screen may stay empty. The
report shows what was refused. Allow that address by name:

```json
{ "safety": { "banned": [], "allow": ["/api/search", "https://api.example.com/graphql*"] } }
```

| Setting | Meaning |
|---|---|
| `"readOnly": true` | Use read-only mode on a local product too |
| `"readOnly": false` | Turn it off, for a demo instance that is safe to change |
| `"allow": [...]` | Parts of addresses that may still be sent. `*` matches anything |

## Good to know

- The session file is a set of keys to the product. Never commit it, never share it.
- When the session expires, the render stops at the sign-in screen. Run
  `showcase login` again.
- Prefer a demo account with made-up data. The banned list is a net, not a plan.
- Say on screen when the data is fictional (the end card's `note`).
