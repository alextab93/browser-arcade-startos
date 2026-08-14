import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'))
}

export async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(target)))
    if (entry.isFile()) files.push(target)
  }
  return files
}

export function rootFromArgs() {
  const index = process.argv.indexOf('--root')
  return path.resolve(index === -1 ? process.cwd() : process.argv[index + 1])
}

export function fail(errors) {
  errors.forEach((error) => process.stderr.write(`${error}\n`))
  process.exitCode = 1
}
