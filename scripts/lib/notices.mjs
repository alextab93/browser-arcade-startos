function pathLine(paths) {
  const label = paths.length === 1 ? 'Vendored path' : 'Vendored paths'
  return `- ${label}: ${paths.map((item) => `\`${item}\``).join(', ')}`
}

export function renderNotices(lock) {
  const sections = lock.sources.map((source) => {
    const included =
      source.key === 'tvanas-html5-games'
        ? '- Included games: BrickIt, BounceIt, FloodIt, SweepIt, SnakeIt\n'
        : ''
    return `## ${source.name}

${included}- Upstream: ${source.repository}
- Revision: \`${source.commit}\`
- License: ${source.license}
- Copyright: ${source.copyright}
${pathLine(source.vendoredPaths)}
- Full license: \`${source.licenseFile}\``
  })

  return `# Third-Party Software

Browser Arcade includes the following MIT-licensed open-source games. The immutable revisions and paths below are generated from \`games.lock.json\` and verified by the license audit.

${sections.join('\n\n')}\n`
}
