import React, { useState, useEffect } from 'react'
import { auth, db } from '../../config/firebase'
import { signOut } from 'firebase/auth'
import { collection, getDocs } from 'firebase/firestore'
import Button from '../ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card'
import { LogOut, Users, FileUp, BarChart3, Settings, Home, Archive, Trophy, ChevronDown } from 'lucide-react'
import ImportStudents from '../import/ImportStudents'
import StudentsList from '../students/StudentsList'
import GradeUpload from '../grades/GradeUpload'
import ReportsManager from '../grades/ReportsManager'
import MeritOrder from '../grades/MeritOrder'
import CycleManager from '../cycles/CycleManager'

const roleLabels = {
  admin: 'Administrador/a',
  secretary: 'Secretaria/o',
  teacher: 'Docente',
  coordinator: 'Coordinador/a',
  director: 'Director/a',
}

const Dashboard = ({ user, activeCycle, onCycleChange, onLogout }) => {
  const [activeSection, setActiveSection] = useState('home')
  const [cycles, setCycles] = useState([])
  const [viewingCycle, setViewingCycle] = useState(activeCycle)
  const [showCyclePicker, setShowCyclePicker] = useState(false)

  const isReadOnly = cycles.find(c => c.id === viewingCycle)?.status === 'archived'
  const isSecretary = user?.role === 'secretary'

  useEffect(() => { loadCycles() }, [activeCycle])

  useEffect(() => {
    if (activeCycle) setViewingCycle(activeCycle)
  }, [activeCycle])

  const loadCycles = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'cycles'))
      const mapped = snapshot.docs
        .map(d => ({ id: d.id, status: d.data().status || 'archived' }))
        .sort((a, b) => b.id.localeCompare(a.id))
      setCycles(mapped)
    } catch (err) {
      console.error('Error cargando ciclos:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth)
      if (onLogout) onLogout()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleCycleChange = (newCycle) => {
    setViewingCycle(newCycle)
    onCycleChange(newCycle)
    setShowCyclePicker(false)
  }

  const menuItems = [
    { id: 'home',     label: 'Inicio',               icon: Home },
    { id: 'import',   label: 'Importar Estudiantes', icon: FileUp,    readOnlyHidden: true, adminOnly: true },
    { id: 'students', label: 'Lista de Estudiantes', icon: Users },
    { id: 'grades',   label: 'Carga de Notas',       icon: BarChart3, readOnlyHidden: true },
    { id: 'reports',  label: 'Boletines',            icon: Settings },
     { id: 'merit',    label: 'Orden de Mérito',      icon: Trophy },
    { id: 'cycles',   label: 'Gestión de Ciclos',    icon: Archive,   adminOnly: true },
  ]

  const visibleMenuItems = menuItems.filter(item => {
    if (isReadOnly && item.readOnlyHidden) return false
    if (isSecretary && item.adminOnly) return false
    return true
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo2.png" alt="Logo Cereijo UBA" className="h-8 w-8 rounded" />
              <h1 className="text-xl font-bold text-primary">Gestión Curso Ingreso</h1>
            </div>

            {/* Selector de ciclo */}
            <div className="relative">
              <button
                onClick={() => setShowCyclePicker(!showCyclePicker)}
                className={`flex items-center gap-1 text-xs px-3 py-1 rounded font-semibold transition-colors ${
                  isReadOnly
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {viewingCycle}
                {isReadOnly && <span className="ml-1 text-amber-600">· Solo lectura</span>}
                {cycles.length > 1 && <ChevronDown className="w-3 h-3 ml-1" />}
              </button>

              {showCyclePicker && cycles.length > 1 && (
                <>
                  {/* Overlay para cerrar */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowCyclePicker(false)} />
                  <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[180px] py-1">
                    {cycles.map(c => (
                      <button
                        key={c.id}
                        onClick={() => handleCycleChange(c.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-muted transition-colors ${
                          c.id === viewingCycle ? 'font-semibold text-primary' : ''
                        }`}
                      >
                        <span>{c.id}</span>
                        <span className={`text-xs ml-3 ${c.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`}>
                          {c.status === 'active' ? 'Activo' : 'Archivado'}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end text-sm">
              <span className="font-medium">{user?.displayName}</span>
              <span className="text-xs text-muted-foreground">{roleLabels[user?.role] ?? user?.role}</span>
            </div>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="gap-2">
              <LogOut className="w-4 h-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className="w-64 min-h-screen p-4 space-y-1 shrink-0"
          style={{ background: 'hsl(15, 65%, 10%)', borderRight: '1px solid rgba(255,140,66,0.12)' }}
        >
          <style>{`
            .sidebar-btn { color: rgba(255,255,255,0.72); transition: background 120ms, color 120ms; }
            .sidebar-btn:hover { background: rgba(255,255,255,0.07) !important; color: white; }
            .sidebar-btn-active { background: hsl(var(--primary)) !important; color: white !important; }
            .sidebar-btn-active:hover { filter: brightness(1.08); background: hsl(var(--primary)) !important; }
          `}</style>
          {visibleMenuItems.map(item => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`sidebar-btn w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm ${isActive ? 'sidebar-btn-active' : ''}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.label}
              </button>
            )
          })}

          {isReadOnly && (
            <div className="mt-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.2)' }}>
              <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>Ciclo {viewingCycle}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(251,191,36,0.7)' }}>Modo solo lectura</p>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">

          {activeSection === 'home' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  {isReadOnly ? `Consultando ciclo ${viewingCycle}` : 'Bienvenido'}
                </h2>
                <p className="text-muted-foreground">
                  {isReadOnly
                    ? 'Este ciclo está archivado. Podés consultar e imprimir, pero no modificar datos.'
                    : `Sistema de gestión para el curso de ingreso ${viewingCycle}`}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {!isReadOnly && !isSecretary && (
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('import')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <FileUp className="w-5 h-5 text-primary" /> Importar Estudiantes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>Subí un archivo CSV con los datos de los estudiantes</CardDescription>
                    </CardContent>
                  </Card>
                )}
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('students')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-primary" /> Lista de Estudiantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Visualizá y gestioná los estudiantes registrados</CardDescription>
                  </CardContent>
                </Card>
                {!isReadOnly && (
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('grades')}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="w-5 h-5 text-primary" /> Carga de Notas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>Registrá las calificaciones de los exámenes</CardDescription>
                    </CardContent>
                  </Card>
                )}
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('merit')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="w-5 h-5 text-primary" /> Orden de Mérito
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Listado final con condiciones de ingreso</CardDescription>
                  </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveSection('reports')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings className="w-5 h-5 text-primary" /> Boletines
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>Generá e imprimí los boletines de notas</CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeSection === 'import' && !isReadOnly && !isSecretary && (
            <ImportStudents cycle={viewingCycle} />
          )}

          {activeSection === 'students' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Lista de Estudiantes
                {isReadOnly && <span className="text-sm font-normal text-amber-600 ml-2">· Solo lectura</span>}
              </h2>
              <StudentsList cycle={viewingCycle} readOnly={isReadOnly} />
            </div>
          )}

          {activeSection === 'grades' && !isReadOnly && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Carga de Notas</h2>
              <GradeUpload cycle={viewingCycle} />
            </div>
          )}

          {activeSection === 'merit' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">
                Orden de Mérito
                {isReadOnly && <span className="text-sm font-normal text-amber-600 ml-2">· Solo lectura</span>}
              </h2>
              <MeritOrder cycle={viewingCycle} />
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">
                Boletines
                {isReadOnly && <span className="text-sm font-normal text-amber-600 ml-2">· Solo lectura</span>}
              </h2>
              <ReportsManager cycle={viewingCycle} />
            </div>
          )}

          {activeSection === 'cycles' && !isSecretary && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-1">Gestión de Ciclos</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Archivá el ciclo actual al terminar el año y activá el nuevo para empezar la carga de datos.
              </p>
              <CycleManager
                activeCycle={activeCycle}
                onCycleChange={(newCycle) => {
                  onCycleChange(newCycle)
                  setViewingCycle(newCycle)
                  loadCycles()
                }}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

export default Dashboard