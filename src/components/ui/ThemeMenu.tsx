'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'

interface ThemeMenuProps {
  trigger: React.ReactNode
}

export default function ThemeMenu({ trigger }: ThemeMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme, actualTheme } = useTheme()

  const themes = [
    { value: 'light', label: '라이트', icon: '☀' },
    { value: 'dark', label: '다크', icon: '🌙' },
    { value: 'system', label: '시스템', icon: '💻' }
  ] as const

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

  return (
    <div className="relative" ref={menuRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-primary rounded-xl shadow-lg border border-divider py-2 z-50">
          {themes.map((themeOption) => (
            <button
              key={themeOption.value}
              onClick={() => {
                setTheme(themeOption.value)
                setIsOpen(false)
              }}
              className={`w-full flex items-center px-4 py-3 text-left hover:bg-secondary transition-colors duration-200 ${
                theme === themeOption.value 
                  ? 'text-[#0064FF] font-medium' 
                  : 'text-primary'
              }`}
            >
              <span className="text-lg mr-3">{themeOption.icon}</span>
              <div>
                <div className="text-sm">{themeOption.label}</div>
                {themeOption.value === 'system' && (
                  <div className="text-xs text-secondary">
                    현재: {actualTheme === 'light' ? '라이트' : '다크'}
                  </div>
                )}
              </div>
              {theme === themeOption.value && (
                <span className="ml-auto text-[#0064FF]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
