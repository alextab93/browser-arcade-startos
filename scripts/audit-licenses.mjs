import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fail, readJson, rootFromArgs } from './lib/files.mjs'
import { renderNotices } from './lib/notices.mjs'

const root = rootFromArgs()
const lock = await readJson(path.join(root, 'games.lock.json'))
const catalog = await readJson(path.join(root, 'app/data/games.json'))
const errors = []
const allowedLicenses = new Set(['MIT'])
const expectedSourceKeys = new Set([
  '2048',
  'radius-raid',
  'tvanas-html5-games',
])
const actualSourceKeys = new Set(lock.sources.map((source) => source.key))

if (lock.schemaVersion !== 1) errors.push('Lock schemaVersion must be 1')
if (lock.sources.length !== expectedSourceKeys.size)
  errors.push('Lock must contain exactly three source records')

for (const key of expectedSourceKeys) {
  if (!actualSourceKeys.has(key)) errors.push(`Lock is missing source ${key}`)
}
for (const key of actualSourceKeys) {
  if (!expectedSourceKeys.has(key))
    errors.push(`Lock contains unexpected source ${key}`)
}

for (const source of lock.sources) {
  if (!allowedLicenses.has(source.license))
    errors.push(`${source.key} has disallowed license ${source.license}`)
  if (!/^[0-9a-f]{40}$/.test(source.commit))
    errors.push(`${source.key} commit must be an immutable 40-character SHA`)
  if (!source.repository?.startsWith('https://github.com/'))
    errors.push(`${source.key} repository must be a GitHub HTTPS URL`)
  if (!source.copyright)
    errors.push(`${source.key} is missing copyright attribution`)
  if (!Array.isArray(source.vendoredPaths) || source.vendoredPaths.length === 0)
    errors.push(`${source.key} has no vendored paths`)
  for (const target of [source.licenseFile, ...(source.vendoredPaths || [])]) {
    try {
      await access(path.join(root, target))
    } catch {
      errors.push(`${source.key} is missing ${target}`)
    }
  }
}

for (const game of catalog.games) {
  if (!actualSourceKeys.has(game.sourceKey))
    errors.push(`${game.id} has unknown sourceKey ${game.sourceKey}`)
  if (game.license !== 'MIT') errors.push(`${game.id} license must be MIT`)
}

const noticesPath = path.join(root, 'THIRD_PARTY_NOTICES.md')
try {
  const notices = await readFile(noticesPath, 'utf8')
  if (notices !== renderNotices(lock))
    errors.push(
      'THIRD_PARTY_NOTICES.md is stale or conflicts with games.lock.json',
    )
} catch {
  errors.push('THIRD_PARTY_NOTICES.md is missing')
}

if (errors.length) fail(errors)
else process.stdout.write('License audit passed for three MIT source records\n')
