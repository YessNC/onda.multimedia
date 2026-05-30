import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type ProtectedAdminRouteProps = {
  children: ReactNode
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return

      setIsAuthenticated(Boolean(data.session))
      setIsCheckingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return

      setIsAuthenticated(Boolean(session))
      setIsCheckingSession(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (isCheckingSession) {
    return (
      <section className="py-20">
        <div className="onda-container">
          <div className="glass-panel mx-auto max-w-md rounded-lg p-6 text-center text-sm font-semibold text-zinc-600 dark:text-onda-muted">
            Cargando acceso administrador...
          </div>
        </div>
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
