import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { readJson, rootFromArgs } from './lib/files.mjs'
import { renderNotices } from './lib/notices.mjs'

const root = rootFromArgs()
const lock = await readJson(path.join(root, 'games.lock.json'))
await writeFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), renderNotices(lock))
process.stdout.write('Generated THIRD_PARTY_NOTICES.md\n')
