'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from '@/contexts/I18nContext'
import { Button } from './index'
import { languageNames, languageFlags } from '@/locales'
import { Language } from '@/types/i18n'

interface LanguageSwitcherProps {
  trigger?: React.ReactNode
  className?: string
}

export default function LanguageSwitcher({ 
  trigger, 
  className = '' 
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { language, setLanguage, availableLanguages } = useTranslation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const defaultTrigger = (
    <Button variant="ghost" className="p-2">
      <span className="text-secondary text-lg">{languageFlags[language]}</span>
    </Button>
  )

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger || defaultTrigger}
      </div>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-primary rounded-xl shadow-lg border border-divider py-2 z-50">
          {availableLanguages.map((lang) => (
            <button
              key={lang}
              onClick={() => {
                setLanguage(lang)
                setIsOpen(false)
              }}
              className={`w-full flex items-center px-4 py-3 text-left hover:bg-secondary transition-colors duration-200 ${
                language === lang 
                  ? 'text-[#0064FF] font-medium' 
                  : 'text-primary'
              }`}
            >
              <span className="text-lg mr-3">{languageFlags[lang]}</span>
              <span className="text-sm">{languageNames[lang]}</span>
              {language === lang && (
                <span className="ml-auto text-[#0064FF]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
