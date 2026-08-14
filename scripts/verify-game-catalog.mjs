import { access } from 'node:fs/promises'
import path from 'node:path'
import { fail, readJson, rootFromArgs } from './lib/files.mjs'

const root = rootFromArgs()
const catalog = await readJson(path.join(root, 'app/data/games.json'))
const lock = await readJson(path.join(root, 'games.lock.json'))
const expected = [
  ['2048', '/games/2048/'],
  ['radius-raid', '/games/radius-raid/'],
  ['brickit', '/games/brickit/'],
  ['bounceit', '/games/bounceit/'],
  ['floodit', '/games/floodit/'],
  ['sweepit', '/games/sweepit/'],
  ['snakeit', '/games/snakeit/'],
]
const errors = []
const sources = new Map(lock.sources.map((source) => [source.key, source]))

if (catalog.schemaVersion !== 1) errors.push('Catalog schemaVersion must be 1')
if (catalog.games.length !== expected.length)
  errors.push(`Catalog must contain exactly ${expected.length} games`)

for (const [index, [id, gamePath]] of expected.entries()) {
  const game = catalog.games[index]
  if (!game) continue
  if (game.id !== id) errors.push(`Catalog game ${index + 1} must be ${id}`)
  if (game.path !== gamePath) errors.push(`${id} path must be ${gamePath}`)
  if (!sources.has(game.sourceKey))
    errors.push(`${id} has unknown sourceKey ${game.sourceKey}`)
  if (game.license !== 'MIT') errors.push(`${id} license must be MIT`)
  if (!game.name || !game.description || !game.category)
    errors.push(`${id} is missing launcher-visible metadata`)
  if (!Array.isArray(game.controls) || game.controls.length === 0)
    errors.push(`${id} is missing controls`)
  if (!game.input || !Object.values(game.input).some(Boolean))
    errors.push(`${id} has no supported input capability`)
  if (typeof game.fullscreen !== 'boolean')
    errors.push(`${id} fullscreen metadata must be boolean`)
  const directory = path.join(root, 'app', game.path)
  try {
    await access(path.join(directory, 'index.html'))
  } catch {
    errors.push(
      `${id} is missing ${path.relative(root, path.join(directory, 'index.html'))}`,
    )
  }
}

if (errors.length) fail(errors)
else process.stdout.write('Catalog audit passed for exactly seven games\n')
