// src/routes/Login.tsx
import { Link } from 'react-router-dom'
import { LoginForm } from '../components/auth/LoginForm'
import SectionTitle from '../components/shared/SectionTitle'

export default function Login() {
  return (
    <section className="py-20">
      <div className="onda-container">
        <div className="mx-auto max-w-md">
          <SectionTitle
            eyebrow="Bienvenido"
            title="Iniciar Sesión"
            subtitle="Accede a tu cuenta para gestionar tus reservas"
          />
          
          <div className="mt-8 rounded-lg border border-onda-purple/20 bg-white/55 p-6 dark:bg-white/5">
            <LoginForm />
            
            <div className="mt-4 text-center text-sm text-zinc-600 dark:text-onda-muted">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-onda-purple hover:underline">
                Regístrate aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}