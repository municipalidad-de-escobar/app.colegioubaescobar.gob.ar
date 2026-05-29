import { useState } from 'react'
import { auth } from '../../config/firebase'
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { checkAdminWhitelist } from '../../utils/authUtils'
import { AlertCircle, GraduationCap, ArrowLeft } from 'lucide-react'
import Loading from '../ui/Loading'

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const Login = ({ onLoginSuccess }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      const result = await signInWithPopup(auth, provider)
      const firebaseUser = result.user

      const adminData = await checkAdminWhitelist(firebaseUser.email)
      if (!adminData) {
        await auth.signOut()
        setError('Tu email no está autorizado para acceder a esta aplicación. Contactá al administrador.')
        setIsLoading(false)
        return
      }

      if (onLoginSuccess) {
        onLoginSuccess({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          role: adminData.role || 'admin',
          adminId: adminData.id
        })
      }
    } catch (err) {
      console.error('Error en login:', err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Inicio de sesión cancelado.')
      } else if (err.code === 'auth/popup-blocked') {
        setError('Pop-up bloqueado. Por favor, permití pop-ups en tu navegador.')
      } else {
        setError('Error al iniciar sesión. Intentá nuevamente.')
      }
      setIsLoading(false)
    }
  }

  if (isLoading) return <Loading message="Iniciando sesión..." />

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand identity */}
      <div
        className="hidden md:flex flex-col justify-between p-14 w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(140deg, #c0380a 0%, #ff8c42 55%, #ffb347 100%)' }}
      >
        {/* Decorative blobs */}
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage:
              'radial-gradient(circle at 15% 15%, rgba(255,255,255,0.2), transparent 40%), radial-gradient(circle at 85% 85%, rgba(255,255,255,0.12), transparent 40%)',
          }}
        />
        {/* Top logo */}
        <div className="flex items-center gap-3 relative">
          <img src="/logo2.png" alt="Cereijo" style={{ height: 52, filter: 'brightness(0) invert(1)' }} />
        </div>

        {/* Center copy */}
        <div className="relative space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/20">
              <GraduationCap size={28} color="white" />
            </div>
          </div>
          <h1 className="text-white font-bold leading-tight" style={{ fontSize: 38 }}>
            Curso de Ingreso
          </h1>
          <p className="text-white/85 text-lg max-w-sm">
            Gestión de inscripciones, calificaciones y reportes para el Colegio Preuniversitario Dr. Ramón A. Cereijo.
          </p>
        </div>

        {/* Bottom link */}
        <div className="relative">
          <a
            href="https://app.colegioubaescobar.gob.ar/"
            className="flex items-center gap-1 text-white/70 hover:text-white text-xs transition-colors"
            style={{ textDecoration: 'none' }}
          >
            <ArrowLeft size={12} />
            Volver al portal institucional
          </a>
          <p className="text-white/40 text-xs mt-1">© {new Date().getFullYear()} Colegio UBA Escobar</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-8"
        style={{ background: '#fff9f5' }}
      >
        {/* Mobile logo */}
        <div className="flex md:hidden items-center gap-2 mb-8">
          <img src="/logo2.png" alt="Cereijo" className="h-10 w-10 rounded" />
          <div>
            <p className="text-sm font-bold text-slate-900">Colegio Cereijo</p>
            <p className="text-xs text-slate-500">UBA Escobar</p>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Iniciar sesión</h2>
            <p className="text-slate-500 mt-1 text-sm">Ingresá con tu cuenta de Google institucional</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 h-12 px-6 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium text-sm shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <div className="border-t border-slate-200 pt-6 space-y-2 text-xs text-slate-400">
            <p>Solo se permite el acceso a administradores y personal autorizado.</p>
            <p>Si tenés problemas para acceder, contactá al administrador del sistema.</p>
          </div>
        </div>

        {/* Mobile back link */}
        <a
          href="https://app.colegioubaescobar.gob.ar/"
          className="md:hidden mt-10 flex items-center gap-1 text-slate-400 hover:text-slate-600 text-xs transition-colors"
          style={{ textDecoration: 'none' }}
        >
          <ArrowLeft size={12} />
          Volver al portal institucional
        </a>
      </div>
    </div>
  )
}

export default Login
