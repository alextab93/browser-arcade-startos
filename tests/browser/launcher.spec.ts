import { expect, test } from '@playwright/test'

const expectedPaths = [
  '/games/2048/',
  '/games/radius-raid/',
  '/games/brickit/',
  '/games/bounceit/',
  '/games/floodit/',
  '/games/sweepit/',
  '/games/snakeit/',
]

test('launcher exposes the seven-game catalog and filters it', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Browser Arcade')
  await expect(page.locator('.game-card')).toHaveCount(7)
  expect(
    await page
      .locator('.play-button')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(expectedPaths)
  await expect(page.locator('#result-count')).toHaveText('7 games')

  await page.locator('#search').fill('radius')
  await expect(page.locator('.game-card')).toHaveCount(1)
  await expect(page.locator('.game-card h2')).toHaveText('Radius Raid')

  await page.locator('#search').fill('')
  await page.locator('#genre').selectOption('Puzzle')
  await expect(page.locator('.game-card')).toHaveCount(3)
  await expect(page.locator('#result-count')).toHaveText('3 games')
})

test('license page and every full license work offline', async ({
  page,
  context,
}) => {
  await context.route('http://**', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1') route.continue()
    else route.abort()
  })
  await page.goto('/licenses.html')
  await expect(
    page.getByRole('heading', { name: 'Open Source Licenses' }),
  ).toBeVisible()
  await expect(page.locator('.license-list .game-card')).toHaveCount(3)

  const links = page.locator('.license-list .play-button')
  await expect(links).toHaveCount(3)
  for (let index = 0; index < 3; index += 1) {
    const response = await page.request.get(
      (await links.nth(index).getAttribute('href')) as string,
    )
    expect(response.status()).toBe(200)
    expect(await response.text()).toContain('Permission is hereby granted')
  }
})

test('fullscreen action navigates from direct user interaction and Escape exits', async ({
  page,
}) => {
  await page.goto('/')
  const supported = await page.evaluate(() => document.fullscreenEnabled)
  const actions = page.locator('.fullscreen-button')
  await expect(actions).toHaveCount(supported ? 7 : 0)
  if (!supported) return

  await actions.first().click()
  await expect(page).toHaveURL(/\/games\/2048\/$/)
  await page.keyboard.press('Escape')
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement === null))
    .toBe(true)
})
