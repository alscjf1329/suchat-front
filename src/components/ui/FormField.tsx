import React from 'react'
import Input from './Input'

interface FormFieldProps {
  label: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel'
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  icon?: React.ReactNode
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

export default function FormField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  required = false,
  disabled = false,
  error,
  className = ''
}: FormFieldProps) {
  return (
    <Input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      label={label}
      icon={icon}
      required={required}
      disabled={disabled}
      error={error}
      className={className}
    />
  )
}
