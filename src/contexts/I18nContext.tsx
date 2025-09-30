'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language, I18nContextType, TranslationKeys } from '@/types/i18n'
import { translations, languageNames } from '@/locales'

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('ko')
  const availableLanguages: Language[] = ['ko', 'en', 'ja', 'zh']

  useEffect(() => {
    // 로컬 스토리지에서 언어 설정 불러오기
    const savedLanguage = localStorage.getItem('language') as Language
    if (savedLanguage && availableLanguages.includes(savedLanguage)) {
      setLanguage(savedLanguage)
    }
  }, [])

  useEffect(() => {
    // 언어 변경 시 로컬 스토리지에 저장
    localStorage.setItem('language', language)
  }, [language])

  // 중첩된 객체 키를 점 표기법으로 접근하는 함수
  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // 키를 찾을 수 없으면 키 자체를 반환
        console.warn(`Translation key "${key}" not found for language "${language}"`)
        return key
      }
    }
    
    return typeof value === 'string' ? value : key
  }

  const handleSetLanguage = (newLanguage: Language) => {
    setLanguage(newLanguage)
  }

  return (
    <I18nContext.Provider value={{
      language,
      setLanguage: handleSetLanguage,
      t,
      availableLanguages
    }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// 편의를 위한 useTranslation 훅
export function useTranslation() {
  const { t, language, setLanguage, availableLanguages } = useI18n()
  return { t, language, setLanguage, availableLanguages }
}
