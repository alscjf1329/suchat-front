import { Language, TranslationKeys } from '@/types/i18n'
import ko from './ko'
import en from './en'
import ja from './ja'
import zh from './zh'

export const translations: Record<Language, TranslationKeys> = {
  ko,
  en,
  ja,
  zh
}

export const languageNames: Record<Language, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文'
}

export const languageFlags: Record<Language, string> = {
  ko: '🇰🇷',
  en: '🇺🇸',
  ja: '🇯🇵',
  zh: '🇨🇳'
}

export { default as ko } from './ko'
export { default as en } from './en'
export { default as ja } from './ja'
export { default as zh } from './zh'
