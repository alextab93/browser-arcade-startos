import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fail, rootFromArgs, walk } from './lib/files.mjs'

const root = rootFromArgs()
const appRoot = path.join(root, 'app')
const files = (await walk(appRoot)).filter((file) =>
  /\.(html|css|js)$/i.test(file),
)
const errors = []
const seen = new Set()

function clean(reference) {
  return reference.split('#')[0].split('?')[0]
}

function targetFor(file, reference) {
  const value = clean(reference)
  if (
    !value ||
    /^(?:data:|blob:|mailto:|javascript:|https?:|\/\/|#)/i.test(reference)
  )
    return null
  if (value.startsWith('/licenses/'))
    return path.join(root, 'third_party', value.slice('/licenses/'.length))
  if (value.startsWith('/')) return path.join(appRoot, value.slice(1))
  return path.resolve(path.dirname(file), value)
}

function add(file, reference) {
  const target = targetFor(file, reference)
  if (!target) return
  seen.add(JSON.stringify([file, reference, target]))
}

for (const file of files) {
  const source = await readFile(file, 'utf8')
  if (/\.html$/i.test(file)) {
    for (const match of source.matchAll(
      /\b(?:src|href|poster)\s*=\s*["']([^"']+)["']/gi,
    ))
      add(file, match[1])
    for (const match of source.matchAll(
      /<audio\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi,
    )) {
      add(file, `audio/${match[1]}.mp3`)
      add(file, `audio/${match[1]}.ogg`)
    }
  }
  if (/\.css$/i.test(file)) {
    for (const match of source.matchAll(/url\(["']?([^"')\s]+)["']?\)/gi))
      add(file, match[1])
    for (const match of source.matchAll(
      /@import\s+(?:url\()?["]?([^"')\s]+)["']?\)?/gi,
    ))
      add(file, match[1])
  }
  if (/\.js$/i.test(file)) {
    for (const match of source.matchAll(
      /["']([^"']+\.(?:png|jpe?g|gif|svg|webp|ico|mp3|ogg|wav))["']/gi,
    ))
      add(file, match[1])
    for (const match of source.matchAll(/url\(["']([^"']+)["']\)/gi))
      add(file, match[1])
  }
}

for (const item of seen) {
  const [file, reference, target] = JSON.parse(item)
  try {
    await access(target)
  } catch {
    errors.push(
      `${path.relative(root, file)} references missing local asset ${reference}`,
    )
  }
}

if (errors.length) fail(errors)
else
  process.stdout.write(`Local-asset audit passed for ${seen.size} references\n`)
