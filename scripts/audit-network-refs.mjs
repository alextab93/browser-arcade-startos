import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fail, rootFromArgs, walk } from './lib/files.mjs'

const root = rootFromArgs()
const gamesRoot = path.join(root, 'app/games')
const files = (await walk(gamesRoot)).filter((file) =>
  /\.(html|css|js)$/i.test(file),
)
const errors = []

function withoutComments(source) {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

for (const file of files) {
  const source = withoutComments(await readFile(file, 'utf8'))
  const relative = path.relative(root, file)
  const checks = [
    [/https?:\/\//i, 'remote URL'],
    [/(?:src|href)\s*=\s*["']\/\//i, 'protocol-relative resource'],
    [/\bfetch\s*\(/, 'fetch call'],
    [/\bXMLHttpRequest\b/, 'XMLHttpRequest'],
    [/\bWebSocket\s*\(/, 'WebSocket'],
    [/\bEventSource\s*\(/, 'EventSource'],
    [/\bsendBeacon\s*\(/, 'sendBeacon'],
  ]
  for (const [pattern, label] of checks) {
    if (pattern.test(source)) errors.push(`${relative} contains ${label}`)
  }
}

if (errors.length) fail(errors)
else
  process.stdout.write(
    `Network-reference audit passed for ${files.length} runtime files\n`,
  )
