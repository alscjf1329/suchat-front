import React from 'react'

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
}

export default function Button({
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  onClick,
  className = ''
}: ButtonProps) {
  const baseClasses = "font-semibold rounded-2xl transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--icon-active)]/50 flex items-center justify-center"

  const variantClasses = {
    primary: "btn-primary disabled:opacity-50",
    secondary: "bg-secondary hover:bg-secondary/80 disabled:opacity-50 text-primary backdrop-blur-xl border border-divider",
    outline: "border border-[var(--icon-active)]/60 text-[var(--icon-active)] hover:bg-secondary disabled:border-divider disabled:text-secondary backdrop-blur-xl",
    ghost: "text-[var(--icon-active)] hover:bg-secondary disabled:text-secondary"
  }
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  }
  
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          로딩 중...
        </div>
      ) : (
        children
      )}
    </button>
  )
}
