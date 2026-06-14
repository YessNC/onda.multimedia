import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'
import { PasswordInput } from './PasswordInput'

interface RegisterFormData {
  nombre: string
  email: string
  telefono: string
  password: string
  confirmPassword: string
}

const initialFormData: RegisterFormData = {
  nombre: '',
  email: '',
  telefono: '',
  password: '',
  confirmPassword: '',
}

function getRegisterErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''

  if (message === 'User already registered') {
    return 'Este email ya esta registrado. Inicia sesion o recupera tu contrasena.'
  }

  if (message === 'Signups not allowed for this instance') {
    return 'Los registros estan desactivados en Supabase. Activa Allow new users to sign up en Authentication.'
  }

  return message || 'Error al registrar usuario. Intenta nuevamente.'
}

export function RegisterForm() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState(initialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre completo requerido'
    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email invalido'
    }
    if (!formData.telefono.trim()) newErrors.telefono = 'Telefono requerido'
    if (!formData.password) {
      newErrors.password = 'Contrasena requerida'
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contrasena debe tener al menos 6 caracteres'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contrasenas no coinciden'
    }

    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validationErrors = validateForm()

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsLoading(true)
    setErrors({})

    try {
      await register(
        formData.email.trim(),
        formData.password,
        formData.nombre.trim(),
        formData.telefono.trim(),
      )

      setFormData(initialFormData)
      navigate('/login?registered=1', { replace: true })
    } catch (error) {
      console.error('Error de registro:', error)
      setErrors({ submit: getRegisterErrorMessage(error) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-onda-muted">
          Nombre completo
        </label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          autoComplete="name"
          placeholder="Juan Perez"
          className={cn(
            'w-full rounded-md border px-4 py-3 transition-all duration-200',
            'bg-white focus:border-onda-purple focus:outline-none focus:ring-2 focus:ring-onda-purple/50 dark:bg-white/10',
            errors.nombre
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
              : 'border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20',
          )}
        />
        {errors.nombre ? <p className="mt-1 text-xs text-red-500">{errors.nombre}</p> : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-onda-muted">
          Email
        </label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          autoComplete="email"
          placeholder="hola@correo.cl"
          className={cn(
            'w-full rounded-md border px-4 py-3 transition-all duration-200',
            'bg-white focus:border-onda-purple focus:outline-none focus:ring-2 focus:ring-onda-purple/50 dark:bg-white/10',
            errors.email
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
              : 'border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20',
          )}
        />
        {errors.email ? <p className="mt-1 text-xs text-red-500">{errors.email}</p> : null}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-zinc-700 dark:text-onda-muted">
          Telefono
        </label>
        <input
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          autoComplete="tel"
          placeholder="+56999999999"
          className={cn(
            'w-full rounded-md border px-4 py-3 transition-all duration-200',
            'bg-white focus:border-onda-purple focus:outline-none focus:ring-2 focus:ring-onda-purple/50 dark:bg-white/10',
            errors.telefono
              ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
              : 'border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20',
          )}
        />
        {errors.telefono ? <p className="mt-1 text-xs text-red-500">{errors.telefono}</p> : null}
      </div>

      <PasswordInput
        name="password"
        value={formData.password}
        onChange={handleChange}
        label="Contrasena"
        error={errors.password}
        autoComplete="new-password"
        placeholder="Mínimo 8 caracteres"
      />

      <PasswordInput
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        label="Confirmar contrasena"
        error={errors.confirmPassword}
        autoComplete="new-password"
        placeholder="Repite tu contrasena"
      />

      {errors.submit ? (
        <div className="rounded-md border border-red-300 bg-red-100 p-3 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-center text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-gradient-to-r from-onda-purple to-onda-electric px-4 py-3 font-bold text-white transition hover:shadow-lg hover:shadow-onda-purple/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Registrando...' : 'Registrarse'}
      </button>
    </form>
  )
}
