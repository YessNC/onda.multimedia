// src/components/auth/RegisterForm.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PasswordInput } from './PasswordInput'
import { cn } from '../../lib/utils'
import { supabase } from '../../lib/supabaseClient'

export function RegisterForm() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones
    const newErrors: Record<string, string> = {}
    
    if (!formData.nombre.trim()) newErrors.nombre = 'Nombre completo requerido'
    if (!formData.email.trim()) {
      newErrors.email = 'Email requerido'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido'
    }
    if (!formData.telefono.trim()) newErrors.telefono = 'Teléfono requerido'
    if (!formData.password) {
      newErrors.password = 'Contraseña requerida'
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsLoading(true)
    
    try {
      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.nombre,
            phone: formData.telefono,
          }
        }
      })
      
      if (authError) {
        throw authError
      }
      
      if (authData.user) {
        // 2. (Opcional) Guardar datos adicionales en una tabla 'profiles'
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: formData.nombre,
              email: formData.email,
              phone: formData.telefono,
              created_at: new Date().toISOString()
            }
          ])
        
        if (profileError) {
          console.error('Error guardando perfil:', profileError)
          // No bloqueamos el registro si falla el perfil
        }
        
        // Registro exitoso
        alert('✅ ¡Registro exitoso! Revisa tu email para confirmar tu cuenta.\n\nRedirigiendo al inicio de sesión...')
        navigate('/login')
      }
      
    } catch (error: any) {
      console.error('Error de registro:', error)
      
      // Manejar errores específicos de Supabase
      if (error.message === 'User already registered') {
        setErrors({ submit: 'Este email ya está registrado. Inicia sesión o recupera tu contraseña.' })
      } else {
        setErrors({ submit: error.message || 'Error al registrar usuario. Intenta nuevamente.' })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre completo */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 dark:text-onda-muted mb-2">
          Nombre completo
        </label>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          autoComplete="name"
          placeholder="Juan Pérez"
          className={cn(
            "w-full px-4 py-3 rounded-xl border transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-onda-purple/50 focus:border-onda-purple",
            "bg-white dark:bg-white/10",
            errors.nombre 
              ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
              : "border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20"
          )}
        />
        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 dark:text-onda-muted mb-2">
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
            "w-full px-4 py-3 rounded-xl border transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-onda-purple/50 focus:border-onda-purple",
            "bg-white dark:bg-white/10",
            errors.email 
              ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
              : "border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20"
          )}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-semibold text-zinc-700 dark:text-onda-muted mb-2">
          Teléfono
        </label>
        <input
          type="tel"
          name="telefono"
          value={formData.telefono}
          onChange={handleChange}
          autoComplete="tel"
          placeholder="+56999999999"
          className={cn(
            "w-full px-4 py-3 rounded-xl border transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-onda-purple/50 focus:border-onda-purple",
            "bg-white dark:bg-white/10",
            errors.telefono 
              ? "border-red-500 bg-red-50 dark:bg-red-950/20" 
              : "border-onda-purple/20 hover:border-onda-purple/50 dark:border-white/20"
          )}
        />
        {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
      </div>

      {/* Contraseña */}
      <PasswordInput
        name="password"
        value={formData.password}
        onChange={handleChange}
        label="Contraseña"
        error={errors.password}
        autoComplete="new-password"
        placeholder="Mínimo 6 caracteres"
      />

      {/* Confirmar Contraseña */}
      <PasswordInput
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        label="Confirmar contraseña"
        error={errors.confirmPassword}
        autoComplete="new-password"
        placeholder="Repite tu contraseña"
      />

      {/* Error general del submit */}
      {errors.submit && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 text-sm text-center">{errors.submit}</p>
        </div>
      )}

      {/* Botón de registro */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-onda-purple to-onda-electric text-white font-bold py-3 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-onda-purple/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Registrando...
          </span>
        ) : (
          'Registrarse'
        )}
      </button>
    </form>
  )
}