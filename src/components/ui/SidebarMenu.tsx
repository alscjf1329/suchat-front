'use client'

import React, { useState, useRef, useEffect } from 'react'

interface SidebarMenuProps {
  trigger: React.ReactNode
}

export default function SidebarMenu({ trigger }: SidebarMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const menuItems = [
    { label: '프로필', icon: '👤', action: () => console.log('프로필') },
    { label: '설정', icon: '⚙', action: () => console.log('설정') },
    { label: '알림', icon: '🔔', action: () => console.log('알림') },
    { label: '도움말', icon: '?', action: () => console.log('도움말') },
    { label: '정보', icon: 'ℹ', action: () => console.log('정보') }
  ]

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
        <div className="absolute left-0 top-full mt-2 w-48 bg-primary rounded-xl shadow-lg border border-divider py-2 z-50">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                item.action()
                setIsOpen(false)
              }}
              className="w-full flex items-center px-4 py-3 text-left hover:bg-secondary transition-colors duration-200 text-primary"
            >
              <span className="text-lg mr-3">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
