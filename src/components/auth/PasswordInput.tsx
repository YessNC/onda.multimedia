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
  required?: boolean
}

export function PasswordInput({
  name,
  value,
  onChange,
  placeholder = '********',
  label,
  error,
  autoComplete = 'new-password',
  required = false,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div>
      {label ? (
        <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-onda-muted">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          placeholder={placeholder}
          className={cn(
            'w-full rounded-md border px-4 py-3 pr-12 transition-all duration-200',
            'bg-white focus:border-onda-purple focus:outline-none focus:ring-2 focus:ring-onda-purple/50 dark:bg-white/10',
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
              : 'border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20',
          )}
        />

        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 transition hover:bg-onda-purple/10 hover:text-onda-purple dark:text-onda-muted dark:hover:text-onda-lavender"
          aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
          title={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Eye className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  )
}
