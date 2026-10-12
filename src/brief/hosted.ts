// Is an address hosted, or on this machine? Plain logic with nothing that reads the
// disk, so the website's theme studio asks the same question the kit does.

const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|.*\.local|.*\.localhost|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/i

/** A hosted address is anything that is not this machine or a private network. */
export function isHosted(url: string | undefined): boolean {
  return !!url && !LOCAL_HOST.test(new URL(url).hostname)
}
