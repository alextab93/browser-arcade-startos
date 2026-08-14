export const DEFAULT_LANG = 'en_US'

const dict = {
  'Web Interface': 0,
  'Open Browser Arcade': 1,
  'Browser Arcade is ready': 2,
  'Browser Arcade is not ready': 3,
} as const

export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
