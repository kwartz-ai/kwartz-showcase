import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { serveStatic } from '../src/serve.ts'

let root: string
let outside: string
let server: Awaited<ReturnType<typeof serveStatic>>

beforeAll(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kav-serve-'))
  root = path.join(tmp, 'site')
  outside = path.join(tmp, 'secret.txt')
  fs.mkdirSync(path.join(root, 'sub'), { recursive: true })
  fs.writeFileSync(path.join(root, 'index.html'), '<h1>home</h1>')
  fs.writeFileSync(path.join(root, 'app.js'), 'console.log(1)')
  fs.writeFileSync(path.join(root, 'style.css'), 'body{}')
  fs.writeFileSync(path.join(root, 'data.json'), '{"a":1}')
  fs.writeFileSync(path.join(root, 'logo.svg'), '<svg/>')
  fs.writeFileSync(path.join(root, 'my file.txt'), 'spaced')
  fs.writeFileSync(path.join(root, 'blob.xyz'), 'bin')
  fs.writeFileSync(path.join(root, 'sub', 'index.html'), '<h1>sub</h1>')
  fs.writeFileSync(outside, 'do not serve')
  server = await serveStatic(root)
})
afterAll(async () => {
  await server.close()
  fs.rmSync(path.dirname(root), { recursive: true, force: true })
})

const get = (p: string) => fetch(server.url + p)

describe('serveStatic', () => {
  it('listens on this machine only, on a free port', () => {
    expect(server.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/)
  })
  it('serves index.html at the root', async () => {
    const res = await get('/')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>home</h1>')
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
  })
  it.each([
    ['/app.js', 'text/javascript'],
    ['/style.css', 'text/css'],
    ['/data.json', 'application/json'],
    ['/logo.svg', 'image/svg+xml'],
    ['/blob.xyz', 'application/octet-stream'],
  ])('serves %s as %s', async (file, type) => {
    const res = await get(file)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe(type)
  })
  it('serves the index of a sub-folder', async () => {
    expect(await (await get('/sub/')).text()).toBe('<h1>sub</h1>')
  })
  it('ignores a query string', async () => {
    expect(await (await get('/app.js?v=2')).text()).toBe('console.log(1)')
  })
  it('decodes escaped characters in the path', async () => {
    expect(await (await get('/my%20file.txt')).text()).toBe('spaced')
  })
  it('answers a route with no extension with the app, as a single-page app needs', async () => {
    const res = await get('/customers/42')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('<h1>home</h1>')
  })
  it('answers 404 for a missing file that has an extension', async () => {
    expect((await get('/missing.png')).status).toBe(404)
  })
  it('never serves a file outside the folder', async () => {
    // fetch would normalise "..", so the raw path is sent by hand
    const { default: http } = await import('node:http')
    const status = await new Promise<number>((resolve) => {
      http.get({ host: '127.0.0.1', port: Number(new URL(server.url).port), path: '/..%2fsecret.txt' }, (r) => { r.resume(); resolve(r.statusCode!) })
    })
    expect(status).toBe(403)
  })
  it('refuses a folder that does not exist', async () => {
    await expect(serveStatic(path.join(root, 'nope'))).rejects.toThrow(/"serve" folder not found/)
  })
  it('stops listening when closed', async () => {
    const s = await serveStatic(root)
    await s.close()
    await expect(fetch(s.url + '/')).rejects.toThrow()
  })
  it('gives each server its own port', async () => {
    const s = await serveStatic(root)
    expect(s.url).not.toBe(server.url)
    await s.close()
  })
})
