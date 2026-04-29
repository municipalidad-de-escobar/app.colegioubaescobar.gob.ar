import React, { useState, useEffect } from 'react'
import { supabase } from './config/supabase'
import Login from './components/auth/Login'
import Dashboard from './components/dashboard/Dashboard'
import Loading from './components/ui/Loading'
import { checkAdminWhitelist } from './utils/authUtils'

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeCycle, setActiveCycle] = useState(null)

  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setIsLoading(false)
          return
        }

        if (session?.user) {
          console.log('User authenticated:', session.user.email)
          try {
            const adminData = await checkAdminWhitelist(session.user.email)
            console.log('Admin check result:', adminData)

            if (adminData && isMounted) {
              setUser({
                uid: session.user.id,
                email: session.user.email,
                displayName: session.user.user_metadata?.full_name,
                photoURL: session.user.user_metadata?.avatar_url,
                role: adminData.role || 'admin',
                adminId: adminData.id
              })
              await loadActiveCycle()
            } else if (!adminData && isMounted) {
              console.warn('User not in whitelist:', session.user.email)
              await supabase.auth.signOut()
              setUser(null)
            }
          } catch (whitelistErr) {
            console.error('Whitelist check error:', whitelistErr)
            if (isMounted) {
              setUser(null)
            }
          }
        } else {
          console.log('No session')
          if (isMounted) {
            setUser(null)
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (isMounted) {
          setError('Error al verificar autenticación')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const adminData = await checkAdminWhitelist(session.user.email)
          if (adminData && isMounted) {
            setUser({
              uid: session.user.id,
              email: session.user.email,
              displayName: session.user.user_metadata?.full_name,
              photoURL: session.user.user_metadata?.avatar_url,
              role: adminData.role || 'admin',
              adminId: adminData.id
            })
            await loadActiveCycle()
          } else if (!adminData && isMounted) {
            console.warn('User not in whitelist:', session.user.email)
            await supabase.auth.signOut()
            setUser(null)
          }
        } catch (err) {
          console.error('Whitelist check error on sign in:', err)
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setUser(null)
        }
      }
    })

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const loadActiveCycle = async () => {
    try {
      const { data, error: err } = await supabase
        .from('cycles')
        .select('year, status')
        .order('year', { ascending: false })

      if (err) throw err

      const active = data?.find(c => c.status === 'active')
      if (active) {
        setActiveCycle(active.year)
      } else if (data?.length > 0) {
        setActiveCycle(data[0].year)
      } else {
        setActiveCycle(String(new Date().getFullYear()))
      }
    } catch (err) {
      console.error('Error al cargar ciclo activo:', err)
      setActiveCycle(String(new Date().getFullYear()))
    }
  }

  if (isLoading) return <Loading message="Inicializando aplicación..." />

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {user ? (
        <Dashboard
          user={user}
          activeCycle={activeCycle}
          onCycleChange={setActiveCycle}
          onLogout={() => setUser(null)}
        />
      ) : (
        <Login onLoginSuccess={setUser} />
      )}
    </>
  )
}

export default App