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
  // date input의 경우 아이콘을 오른쪽에, 다른 타입은 왼쪽에
  const isDateType = type === 'date'
  const paddingClasses = isDateType 
    ? 'pl-4 pr-10'  // date는 오른쪽에 아이콘 공간
    : (icon ? 'pl-10 pr-4' : 'pl-4 pr-4')  // 다른 타입은 왼쪽에 아이콘
  
  const baseClasses = `w-full ${paddingClasses} py-3 bg-primary border border-divider rounded-xl focus:ring-2 focus:ring-[#0064FF] focus:border-[#0064FF] outline-none transition-all duration-200 shadow-sm text-primary`
  const errorClasses = error ? "border-red-500 focus:ring-red-500 focus:border-red-500" : ""
  const disabledClasses = disabled ? "bg-secondary cursor-not-allowed" : ""
  // date input의 경우 높이를 명시적으로 설정하고 line-height를 조정
  const dateClasses = isDateType ? "h-12 leading-[1.2]" : ""
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-primary">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {/* date가 아닌 타입의 아이콘은 왼쪽에 */}
        {icon && !isDateType && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
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
          // date input에 min/max 속성 추가 (1900-2099년 범위)
          min={isDateType ? "1900-01-01" : undefined}
          max={isDateType ? "2099-12-31" : undefined}
          className={`${baseClasses} ${errorClasses} ${disabledClasses} ${dateClasses} ${className}`}
          style={isDateType ? {
            // iOS Safari date input 스타일 통일
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
            minHeight: '48px',
            lineHeight: '1.2'
          } as React.CSSProperties : undefined}
        />
        
        {/* date 타입의 아이콘은 오른쪽에 */}
        {icon && isDateType && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none z-10">
            <span className="text-secondary text-sm">{icon}</span>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
