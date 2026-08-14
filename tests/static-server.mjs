import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'

const project = process.cwd()
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.eot': 'application/vnd.ms-fontobject',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff': 'font/woff',
}

createServer(async (request, response) => {
  const pathname = decodeURIComponent(
    new URL(request.url, 'http://127.0.0.1').pathname,
  )
  const license = pathname.startsWith('/licenses/')
  const base = path.join(project, license ? 'third_party' : 'app')
  const relative = license
    ? pathname.slice('/licenses/'.length)
    : pathname.slice(1)
  let target = path.resolve(base, relative || 'index.html')

  if (!target.startsWith(`${base}${path.sep}`) && target !== base) {
    response.writeHead(403).end('Forbidden')
    return
  }

  try {
    const info = await stat(target)
    if (info.isDirectory()) target = path.join(target, 'index.html')
    const file = await stat(target)
    if (!file.isFile()) throw new Error('Not a file')
    response.writeHead(200, {
      'content-type':
        mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'x-content-type-options': 'nosniff',
    })
    createReadStream(target).pipe(response)
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
}).listen(4173, '127.0.0.1')
