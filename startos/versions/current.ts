import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '0.1.0:0',
  releaseNotes: {
    en_US:
      'Initial Browser Arcade prerelease with seven offline open-source games.',
    es_ES:
      'Versión preliminar inicial de Browser Arcade con siete juegos de código abierto sin conexión.',
    de_DE:
      'Erste Vorabversion von Browser Arcade mit sieben offline spielbaren Open-Source-Spielen.',
    pl_PL:
      'Pierwsze wydanie testowe Browser Arcade z siedmioma otwartoźródłowymi grami offline.',
    fr_FR:
      'Première préversion de Browser Arcade avec sept jeux libres utilisables hors ligne.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
