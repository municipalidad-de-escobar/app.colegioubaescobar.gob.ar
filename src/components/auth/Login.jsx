import React, { useState } from 'react'
import { supabase } from '../../config/supabase'
import Button from '../ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card'
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert'
import { Input } from '../ui/Input'
import { AlertCircle, Mail, CheckCircle } from 'lucide-react'

const Login = ({ onLoginSuccess }) => {
  const [error, setError] = useState(null)
  const [email, setEmail] = useState('')
  const [isSendingLink, setIsSendingLink] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError(null)
    setIsSendingLink(true)

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      })

      if (otpError) throw otpError
      setMagicLinkSent(true)
    } catch (err) {
      console.error('Error enviando magic link:', err)
      setError('No se pudo enviar el enlace. Verificá que el correo tenga acceso al sistema.')
    } finally {
      setIsSendingLink(false)
    }
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Revisá tu correo</h2>
                <p className="text-sm text-muted-foreground">
                  Te enviamos un enlace de acceso a
                </p>
                <p className="text-sm font-medium">{email}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                El enlace expira en 1 hora. Si no lo ves, revisá la carpeta de spam.
              </p>
              <button
                onClick={() => { setMagicLinkSent(false); setEmail('') }}
                className="text-xs text-primary underline underline-offset-2"
              >
                Usar otro correo
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Mail className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl">Gestión Curso Ingreso</CardTitle>
            <CardDescription>Ingresá tu correo institucional para recibir un enlace de acceso</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="ml-2">Error</AlertTitle>
                <AlertDescription className="ml-6">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="correo@colegioubaescobar.gob.ar"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSendingLink}
              />
              <Button
                type="submit"
                disabled={isSendingLink || !email.trim()}
                className="w-full h-11 text-base"
              >
                <Mail className="mr-2 h-4 w-4" />
                {isSendingLink ? 'Enviando...' : 'Enviar enlace de acceso'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 text-center text-xs text-muted-foreground">
            <div className="space-y-2">
              <p>Solo se permite el acceso a administradores y personal de secretaría.</p>
              <p>Si tienes problemas para acceder, contacta al administrador del sistema.</p>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2026 Gestión Curso Ingreso - Sistema de Administración</p>
        </div>
      </div>
    </div>
  )
}

export default Login
