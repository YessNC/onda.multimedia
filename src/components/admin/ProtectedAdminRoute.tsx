import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

type ProtectedAdminRouteProps = {
  children: ReactNode
}

const adminInactivityLimitMs = 30 * 60 * 1000
const adminActivityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const navigate = useNavigate()
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const inactivityTimerRef = useRef<number | null>(null)

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

  useEffect(() => {
    if (!isAuthenticated) return undefined

    let isMounted = true

    function clearInactivityTimer() {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }

    async function closeInactiveSession() {
      clearInactivityTimer()
      await supabase.auth.signOut()

      if (isMounted) {
        navigate('/admin/login?reason=inactive', { replace: true })
      }
    }

    function resetInactivityTimer() {
      clearInactivityTimer()
      inactivityTimerRef.current = window.setTimeout(() => {
        void closeInactiveSession()
      }, adminInactivityLimitMs)
    }

    resetInactivityTimer()

    for (const eventName of adminActivityEvents) {
      window.addEventListener(eventName, resetInactivityTimer, { passive: true })
    }

    return () => {
      isMounted = false
      clearInactivityTimer()

      for (const eventName of adminActivityEvents) {
        window.removeEventListener(eventName, resetInactivityTimer)
      }
    }
  }, [isAuthenticated, navigate])

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
