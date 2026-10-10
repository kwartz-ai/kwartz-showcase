import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
}

/** Serve a folder of static files on a free local port, for videos of a static
 *  site or a built front end. Returns its URL and a function that stops it. */
export async function serveStatic(root: string): Promise<{ url: string; close: () => Promise<void> }> {
  if (!fs.existsSync(root)) throw new Error(`"serve" folder not found: ${root}`)
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url ?? '/').split('?')[0]!)
    let file = path.join(root, rel)
    // never serve anything outside the folder
    if (!path.resolve(file).startsWith(path.resolve(root))) { res.writeHead(403).end(); return }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    // a path with no extension is a route of a single-page app
    if (!fs.existsSync(file) && !path.extname(file)) file = path.join(root, 'index.html')
    if (!fs.existsSync(file)) { res.writeHead(404).end('not found'); return }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
