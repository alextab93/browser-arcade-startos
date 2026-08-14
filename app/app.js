const search = document.querySelector('#search')
const genre = document.querySelector('#genre')
const gamesRoot = document.querySelector('#games')
const resultCount = document.querySelector('#result-count')
const emptyState = document.querySelector('#empty-state')

let catalog = []

function badge(label) {
  const item = document.createElement('span')
  item.className = 'badge'
  item.textContent = label
  return item
}

function render() {
  const term = search.value.trim().toLowerCase()
  const selectedGenre = genre.value
  const visible = catalog.filter(game => {
    const searchable = `${game.name} ${game.description} ${game.category}`.toLowerCase()
    return searchable.includes(term) && (selectedGenre === 'all' || game.category === selectedGenre)
  })

  gamesRoot.replaceChildren()
  visible.forEach(game => {
    const card = document.createElement('article')
    card.className = 'game-card'
    card.dataset.gameId = game.id

    const category = document.createElement('p')
    category.className = 'card-category'
    category.textContent = game.category

    const title = document.createElement('h2')
    title.textContent = game.name

    const description = document.createElement('p')
    description.className = 'card-description'
    description.textContent = game.description

    const badges = document.createElement('div')
    badges.className = 'badges'
    Object.entries(game.input).forEach(([input, supported]) => {
      if (supported) badges.append(badge(input))
    })

    const controls = document.createElement('p')
    controls.className = 'controls'
    controls.textContent = game.controls.join(' · ')

    const actions = document.createElement('div')
    actions.className = 'card-actions'

    const play = document.createElement('a')
    play.className = 'play-button'
    play.href = game.path
    play.textContent = 'Play'
    actions.append(play)

    if (game.fullscreen && document.fullscreenEnabled) {
      const fullscreen = document.createElement('button')
      fullscreen.type = 'button'
      fullscreen.className = 'fullscreen-button'
      fullscreen.textContent = 'Play fullscreen'
      fullscreen.addEventListener('click', async () => {
        try {
          await document.documentElement.requestFullscreen()
        } catch {
          window.location.assign(game.path)
          return
        }
        window.location.assign(game.path)
      })
      actions.append(fullscreen)
    }

    card.append(category, title, description, badges, controls, actions)
    gamesRoot.append(card)
  })

  resultCount.textContent = `${visible.length} ${visible.length === 1 ? 'game' : 'games'}`
  emptyState.hidden = visible.length !== 0
}

async function start() {
  const response = await fetch('/data/games.json')
  if (!response.ok) throw new Error(`Catalog request failed with ${response.status}`)
  const data = await response.json()
  catalog = data.games

  Array.from(new Set(catalog.map(game => game.category))).sort().forEach(category => {
    const option = document.createElement('option')
    option.value = category
    option.textContent = category
    genre.append(option)
  })

  render()
}

search.addEventListener('input', render)
genre.addEventListener('change', render)
start().catch(error => {
  resultCount.textContent = 'The game catalog could not be loaded.'
  gamesRoot.textContent = error.message
})
