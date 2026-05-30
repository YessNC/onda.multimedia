import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CTAButton from '../components/shared/CTAButton'
import SectionTitle from '../components/shared/SectionTitle'
import { supabase } from '../lib/supabaseClient'

export default function AdminPanel() {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <section className="py-20">
      <div className="onda-container">
        <SectionTitle
          align="center"
          eyebrow="Admin"
          title="Panel administrador ONDA"
          subtitle="Acceso temporal preparado para la administracion del sitio."
        />
        <div className="glass-panel mx-auto mt-10 grid max-w-md gap-5 rounded-lg p-6 text-center">
          <CTAButton
            type="button"
            icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Cerrando...' : 'Cerrar sesión'}
          </CTAButton>
        </div>
      </div>
    </section>
  )
}
