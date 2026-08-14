import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const project = process.cwd()

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'browser-arcade-audit-'))
  for (const entry of [
    'app',
    'third_party',
    'games.lock.json',
    'THIRD_PARTY_NOTICES.md',
  ]) {
    await cp(path.join(project, entry), path.join(root, entry), {
      recursive: true,
    })
  }
  return root
}

function run(script, root) {
  return spawnSync(
    process.execPath,
    [path.join(project, 'scripts', script), '--root', root],
    {
      encoding: 'utf8',
    },
  )
}

test('license audit rejects a missing local license', async () => {
  const root = await fixture()
  try {
    await rm(path.join(root, 'third_party/2048/LICENSE.txt'))
    const result = run('audit-licenses.mjs', root)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /missing third_party\/2048\/LICENSE\.txt/)
  } finally {
    await rm(root, { recursive: true })
  }
})

test('license audit rejects a moving revision', async () => {
  const root = await fixture()
  try {
    const lockPath = path.join(root, 'games.lock.json')
    const lock = JSON.parse(await readFile(lockPath, 'utf8'))
    lock.sources[0].commit = 'main'
    await writeFile(lockPath, JSON.stringify(lock))
    const result = run('audit-licenses.mjs', root)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /immutable 40-character SHA/)
  } finally {
    await rm(root, { recursive: true })
  }
})

test('license audit rejects stale notices', async () => {
  const root = await fixture()
  try {
    await writeFile(path.join(root, 'THIRD_PARTY_NOTICES.md'), '# Stale\n')
    const result = run('audit-licenses.mjs', root)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /stale or conflicts/)
  } finally {
    await rm(root, { recursive: true })
  }
})

test('asset audit rejects a missing local asset', async () => {
  const root = await fixture()
  try {
    await rm(path.join(root, 'app/games/2048/favicon.ico'))
    const result = run('audit-local-assets.mjs', root)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /missing local asset favicon\.ico/)
  } finally {
    await rm(root, { recursive: true })
  }
})

test('network audit rejects a remote runtime resource', async () => {
  const root = await fixture()
  try {
    const gamePath = path.join(root, 'app/games/2048/index.html')
    await writeFile(
      gamePath,
      `${await readFile(gamePath, 'utf8')}<script src="https://example.com/game.js"></script>`,
    )
    const result = run('audit-network-refs.mjs', root)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /remote URL/)
  } finally {
    await rm(root, { recursive: true })
  }
})
