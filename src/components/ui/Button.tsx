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
  const baseClasses = "font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center"
  
  const variantClasses = {
    primary: "bg-[#0064FF] hover:bg-[#0052CC] disabled:bg-[#0064FF]/50 text-white focus:ring-[#0064FF] shadow-md hover:shadow-lg",
    secondary: "bg-secondary hover:bg-divider disabled:bg-secondary/50 text-primary focus:ring-secondary shadow-md hover:shadow-lg",
    outline: "border-2 border-[#0064FF] text-[#0064FF] hover:bg-secondary disabled:border-divider disabled:text-secondary focus:ring-[#0064FF]",
    ghost: "text-[#0064FF] hover:bg-secondary disabled:text-secondary focus:ring-[#0064FF]"
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
