import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import CTAButton from '../shared/CTAButton'
import { supabase } from '../../lib/supabaseClient'

type AdminSignOutButtonProps = {
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
}

export default function AdminSignOutButton({
  className,
  variant = 'secondary',
}: AdminSignOutButtonProps) {
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    if (isSigningOut) return

    setIsSigningOut(true)
    await supabase.auth.signOut()
    navigate('/admin/login', { replace: true })
  }

  return (
    <CTAButton
      type="button"
      variant={variant}
      className={className}
      icon={<LogOut className="h-4 w-4" aria-hidden="true" />}
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      {isSigningOut ? 'Cerrando...' : 'Cerrar sesi\u00f3n'}
    </CTAButton>
  )
}
