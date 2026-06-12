import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getActiveAdminMembership } from '../../lib/adminAuth'
import { supabaseAdmin } from '../../lib/supabaseAdminClient'

type ProtectedAdminRouteProps = {
  children: ReactNode
}

type AdminAccessState = 'checking' | 'anonymous' | 'authorized'

const adminInactivityLimitMs = 30 * 60 * 1000
const adminActivityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error validando acceso administrador.'
}

export default function ProtectedAdminRoute({ children }: ProtectedAdminRouteProps) {
  const navigate = useNavigate()
  const [accessState, setAccessState] = useState<AdminAccessState>('checking')
  const inactivityTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true

    async function validateAdminAccess() {
      setAccessState('checking')

      try {
        const {
          data: { user },
        } = await supabaseAdmin.auth.getUser()

        if (!isMounted) return

        if (!user) {
          setAccessState('anonymous')
          return
        }

        const membership = await getActiveAdminMembership(user)

        if (!isMounted) return

        if (!membership) {
          await supabaseAdmin.auth.signOut()

          if (isMounted) {
            navigate('/admin/login?unauthorized=1', { replace: true })
          }

          return
        }

        setAccessState('authorized')
      } catch (error) {
        console.error(getErrorMessage(error))
        await supabaseAdmin.auth.signOut()

        if (isMounted) {
          navigate('/admin/login?unauthorized=1', { replace: true })
        }
      }
    }

    void validateAdminAccess()

    const {
      data: { subscription },
    } = supabaseAdmin.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return

      if (!session?.user) {
        setAccessState('anonymous')
        return
      }

      window.setTimeout(() => {
        if (isMounted) {
          void validateAdminAccess()
        }
      }, 0)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (accessState !== 'authorized') return undefined

    let isMounted = true

    function clearInactivityTimer() {
      if (inactivityTimerRef.current) {
        window.clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
    }

    async function closeInactiveSession() {
      clearInactivityTimer()
      await supabaseAdmin.auth.signOut()

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
  }, [accessState, navigate])

  if (accessState === 'checking') {
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

  if (accessState === 'anonymous') {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
