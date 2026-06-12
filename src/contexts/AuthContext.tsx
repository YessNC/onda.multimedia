/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

interface AuthUser {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string | null
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string, phone: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserData = useCallback(async (authUser: User) => {
    setIsLoading(true)

    const email = authUser.email ?? ''
    const metadata = authUser.user_metadata as {
      full_name?: string
      phone?: string
      role?: string
    }

    const fallbackProfile: AuthUser = {
      id: authUser.id,
      email,
      full_name: metadata.full_name ?? email.split('@')[0] ?? 'Cliente Onda',
      phone: metadata.phone ?? null,
      role: metadata.role ?? 'client',
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        console.warn('No pudimos leer el perfil; usando datos de Auth:', error.message)
        setUser(fallbackProfile)
        return
      }

      if (data) {
        setUser({
          id: data.id,
          email,
          full_name: data.full_name || fallbackProfile.full_name,
          phone: data.phone ?? fallbackProfile.phone,
          role: fallbackProfile.role,
        })
        return
      }

      const { data: createdProfile, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: fallbackProfile.id,
            full_name: fallbackProfile.full_name,
            phone: fallbackProfile.phone,
          },
          { onConflict: 'id' },
        )
        .select('id, full_name, phone')
        .single()

      if (profileError) {
        console.warn('No pudimos crear el perfil; usando datos de Auth:', profileError.message)
        setUser(fallbackProfile)
        return
      }

      setUser({
        id: createdProfile.id,
        email,
        full_name: createdProfile.full_name || fallbackProfile.full_name,
        phone: createdProfile.phone ?? fallbackProfile.phone,
        role: fallbackProfile.role,
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!active) return

        if (session?.user) {
          void fetchUserData(session.user)
        } else {
          setUser(null)
          setIsLoading(false)
        }
      })
      .catch((error) => {
        console.error('Error getting session:', error)

        if (active) {
          setUser(null)
          setIsLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setTimeout(() => {
          void fetchUserData(session.user)
        }, 0)
      } else {
        setUser(null)
        setIsLoading(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchUserData])

  async function login(email: string, password: string) {
    setIsLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setIsLoading(false)
      throw error
    }

    if (data.user) {
      await fetchUserData(data.user)
    } else {
      setIsLoading(false)
    }
  }

  async function register(email: string, password: string, fullName: string, phone: string) {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: fullName,
          phone,
          role: 'client',
        },
      },
    })

    if (authError) throw authError

    if (authData.user && authData.session) {
      const { error: dbError } = await supabase.from('profiles').upsert(
        {
          id: authData.user.id,
          full_name: fullName,
          phone,
        },
        { onConflict: 'id' },
      )

      if (dbError) throw dbError

      await supabase.auth.signOut()
    }
  }

  async function logout() {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
