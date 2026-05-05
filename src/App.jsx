import React, { useState, useEffect } from 'react'
import { auth, db } from './config/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
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

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const adminData = await checkAdminWhitelist(currentUser.email)
          if (adminData && isMounted) {
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              role: adminData.role || 'admin',
              adminId: adminData.id
            })
            await loadActiveCycle()
          } else if (!adminData && isMounted) {
            await signOut(auth)
            setUser(null)
          }
        } else {
          if (isMounted) setUser(null)
        }
      } catch (err) {
        console.error('Auth state error:', err)
        if (isMounted) setError('Error al verificar autenticación')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const loadActiveCycle = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'cycles'))
      const cycles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      cycles.sort((a, b) => b.id.localeCompare(a.id))
      const active = cycles.find(c => c.status === 'active')
      if (active) {
        setActiveCycle(active.id)
      } else if (cycles.length > 0) {
        setActiveCycle(cycles[0].id)
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