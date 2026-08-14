import { expect, test } from '@playwright/test'

const games = [
  ['2048', '/games/2048/', '.game-container'],
  ['Radius Raid', '/games/radius-raid/', '#wrap canvas'],
  [
    'BrickIt',
    '/games/brickit/',
    '#BrickItDiv canvas:visible, #PortraitMode:visible',
  ],
  ['BounceIt', '/games/bounceit/', '#BounceItDiv canvas'],
  ['FloodIt', '/games/floodit/', '#FloodItDiv'],
  ['SweepIt', '/games/sweepit/', '#SweepItDiv'],
  ['SnakeIt', '/games/snakeit/', '#snake'],
] as const

for (const [name, path, root] of games) {
  test(`${name} loads locally without a gameplay-blocking error`, async ({
    page,
    context,
  }) => {
    const externalRequests: string[] = []
    const failedLocalRequests: string[] = []
    const pageErrors: string[] = []

    await context.route('**/*', (route) => {
      const url = new URL(route.request().url())
      if (
        url.hostname === '127.0.0.1' ||
        ['data:', 'blob:'].includes(url.protocol)
      )
        route.continue()
      else {
        externalRequests.push(url.href)
        route.abort()
      }
    })
    page.on('response', (response) => {
      if (
        response.url().startsWith('http://127.0.0.1') &&
        response.status() >= 400
      )
        failedLocalRequests.push(response.url())
    })
    page.on('pageerror', (error) => pageErrors.push(error.message))

    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator(root).first()).toBeVisible()
    await page.waitForTimeout(500)
    expect(externalRequests).toEqual([])
    expect(failedLocalRequests).toEqual([])
    expect(pageErrors).toEqual([])
  })
}

test('2048 accepts keyboard input and persists browser-local state', async ({
  page,
}) => {
  await page.goto('/games/2048/')
  await page.keyboard.press('ArrowLeft')
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('gameState') !== null))
    .toBe(true)
  await page.reload()
  await expect(page.locator('.tile')).not.toHaveCount(0)
})

test('Radius Raid accepts movement, pause, mute, and autofire controls', async ({
  page,
}) => {
  await page.goto('/games/radius-raid/')
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('KeyP')
  await page.keyboard.press('KeyM')
  await page.keyboard.press('KeyF')
  await expect(page.locator('#wrap canvas').first()).toBeVisible()
})
