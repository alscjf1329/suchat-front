'use client'

import { useEffect, memo } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

function Toast({ 
  message, 
  type = 'info', 
  duration = 3000,
  onClose 
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const typeStyles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-[#0064FF] text-white',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  return (
    <div 
      className="fixed top-4 left-1/2 z-[9999] pointer-events-none"
      style={{ 
        transform: 'translateX(-50%)',
        willChange: 'transform'
      }}
    >
      <div 
        className={`
          ${typeStyles[type]}
          px-6 py-4 rounded-2xl shadow-xl
          flex items-center gap-3
          min-w-[300px] max-w-md
          backdrop-blur-sm
          border border-white/20
          animate-slide-down
          pointer-events-auto
        `}
        style={{ willChange: 'opacity, transform' }}
        role="alert"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center font-bold">
          {icons[type]}
        </div>
        <p className="font-medium text-sm">{message}</p>
        <button
          onClick={onClose}
          className="ml-auto w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="닫기"
        >
          ×
        </button>
      </div>
    </div>
  )
}

export default memo(Toast)

