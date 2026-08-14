import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'browser-arcade',
  title: 'Browser Arcade',
  license: 'MIT',
  packageRepo: 'https://github.com/alextab93/browser-arcade-startos',
  upstreamRepo: 'https://github.com/alextab93/browser-arcade-startos',
  marketingUrl: 'https://github.com/alextab93/browser-arcade-startos',
  donationUrl: null,
  description: { short, long },
  volumes: [],
  images: {
    main: {
      source: { dockerBuild: {} },
      arch: ['x86_64', 'aarch64'],
    },
  },
  dependencies: {},
})
