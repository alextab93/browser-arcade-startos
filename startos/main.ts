import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiPort } from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  return sdk.Daemons.of(effects).addDaemon('web', {
    subcontainer: sdk.SubContainer.of(
      effects,
      { imageId: 'main' },
      sdk.Mounts.of(),
      'web',
    ),
    exec: { command: sdk.useEntrypoint() },
    ready: {
      display: i18n('Web Interface'),
      fn: () =>
        sdk.healthCheck.checkPortListening(effects, uiPort, {
          successMessage: i18n('Browser Arcade is ready'),
          errorMessage: i18n('Browser Arcade is not ready'),
        }),
    },
    requires: [],
  })
})
