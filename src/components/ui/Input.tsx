import React from 'react'

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date'
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  label?: string
  icon?: React.ReactNode
  required?: boolean
  disabled?: boolean
  className?: string
  error?: string
  minLength?: number
  maxLength?: number
}

export default function Input({
  type = 'text',
  value,
  onChange,
  onKeyPress,
  placeholder,
  label,
  icon,
  required = false,
  disabled = false,
  className = '',
  error,
  minLength,
  maxLength
}: InputProps) {
  const baseClasses = `w-full ${icon ? 'pl-8' : 'pl-4'} pr-4 py-3 bg-primary border border-divider rounded-xl focus:ring-2 focus:ring-[#0064FF] focus:border-[#0064FF] outline-none transition-all duration-200 shadow-sm text-primary`
  const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
  const disabledClasses = disabled ? "bg-secondary cursor-not-allowed" : ""
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-primary">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
            <span className="text-secondary text-sm">{icon}</span>
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          minLength={minLength}
          maxLength={maxLength}
          className={`${baseClasses} ${errorClasses} ${disabledClasses} ${className}`}
        />
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
