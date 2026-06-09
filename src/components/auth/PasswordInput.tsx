// src/components/auth/PasswordInput.tsx
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'

interface PasswordInputProps {
  name: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  label?: string
  error?: string
  autoComplete?: string
}

export function PasswordInput({ 
  name, 
  value, 
  onChange, 
  placeholder = '••••••••', 
  label, 
  error,
  autoComplete = 'new-password'
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-zinc-700 dark:text-onda-muted mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(
            'w-full px-4 py-3 rounded-xl border transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-onda-purple/50 focus:border-onda-purple',
            'pr-12',
            'bg-white dark:bg-white/10',
            error 
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20' 
              : 'border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20',
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-onda-purple dark:text-onda-muted dark:hover:text-onda-lavender transition-colors"
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}