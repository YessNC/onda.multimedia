// src/routes/Register.tsx
import { Link } from 'react-router-dom'
import { RegisterForm } from '../components/auth/RegisterForm'
import SectionTitle from '../components/shared/SectionTitle'

export default function Register() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="mx-auto max-w-md">
          <SectionTitle
            eyebrow="Nueva Cuenta"
            title="Regístrate"
            subtitle="Crea tu cuenta para reservar horas en el estudio"
          />
          
          <div className="mt-8 rounded-lg border border-onda-purple/20 bg-white/55 p-6 dark:bg-white/5">
            <RegisterForm />
            
            <div className="mt-4 text-center text-sm text-zinc-600 dark:text-onda-muted">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-onda-purple hover:underline">
                Inicia Sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}