import React, { useState, useEffect } from 'react'
import { supabase } from '../../config/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import Button from '../ui/Button'
import { Archive, Plus, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const CycleManager = ({ activeCycle, onCycleChange }) => {
  const [cycles, setCycles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [newCycleYear, setNewCycleYear] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(null) // 'archive' | 'activate'
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    loadCycles()
  }, [])

  const loadCycles = async () => {
    setIsLoading(true)
    try {
      const { data: cycles, error: cyclesErr } = await supabase
        .from('cycles')
        .select('year, status, created_at, archived_at')
        .order('year', { ascending: false })

      if (cyclesErr) throw cyclesErr

      const cyclesData = await Promise.all(
        cycles.map(async (c) => {
          const { count, error: countErr } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('cycle_year', c.year)

          if (countErr) throw countErr

          return {
            id: c.year,
            status: c.status || 'archived',
            createdAt: c.created_at,
            archivedAt: c.archived_at,
            studentCount: count || 0
          }
        })
      )

      setCycles(cyclesData)
    } catch (err) {
      setError('Error al cargar ciclos: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateCycle = async () => {
    const year = newCycleYear.trim()
    if (!year || isNaN(year) || year.length !== 4) {
      setError('Ingresá un año válido (ej: 2027)')
      return
    }
    if (cycles.find(c => c.id === year)) {
      setError(`El ciclo ${year} ya existe`)
      return
    }
    if (cycles.find(c => c.status === 'active')) {
      setError('Hay un ciclo activo. Archivalo antes de crear uno nuevo.')
      return
    }

    setIsCreating(true)
    setError('')
    try {
      const { error: insertErr } = await supabase
        .from('cycles')
        .insert({
          year,
          status: 'active',
          created_at: new Date().toISOString(),
          archived_at: null
        })

      if (insertErr) throw insertErr

      setSuccessMsg(`Ciclo ${year} creado y activado correctamente.`)
      setNewCycleYear('')
      await loadCycles()
      onCycleChange(year)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setError('Error al crear ciclo: ' + err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleArchiveCycle = async () => {
    const current = cycles.find(c => c.status === 'active')
    if (!current) return
    setIsArchiving(true)
    setError('')
    try {
      const { error: updateErr } = await supabase
        .from('cycles')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('year', current.id)

      if (updateErr) throw updateErr

      setSuccessMsg(`Ciclo ${current.id} archivado. Ahora podés crear el nuevo ciclo.`)
      setShowConfirm(null)
      await loadCycles()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setError('Error al archivar: ' + err.message)
    } finally {
      setIsArchiving(false)
    }
  }

  const activeCycleData = cycles.find(c => c.status === 'active')
  const archivedCycles = cycles.filter(c => c.status === 'archived')

  if (isLoading) {
    return <div className="text-muted-foreground text-sm p-4">Cargando ciclos...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Mensajes */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-md text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* Ciclo activo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="w-4 h-4 text-green-600" /> Ciclo activo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeCycleData ? (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold text-primary">{activeCycleData.id}</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {activeCycleData.studentCount} estudiantes cargados
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-400 text-orange-600 hover:bg-orange-50 gap-2"
                onClick={() => setShowConfirm('archive')}
              >
                <Archive className="w-4 h-4" /> Archivar ciclo {activeCycleData.id}
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay ningún ciclo activo.</p>
          )}

          {/* Confirmación de archivado */}
          {showConfirm === 'archive' && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
              <p className="text-sm font-medium text-orange-800">
                ⚠️ ¿Confirmar archivado del ciclo <strong>{activeCycleData?.id}</strong>?
              </p>
              <p className="text-xs text-orange-700">
                El ciclo quedará en modo solo lectura. Todos los datos se conservan y pueden
                consultarse, pero no se podrán cargar más notas ni estudiantes.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={handleArchiveCycle}
                  disabled={isArchiving}
                >
                  {isArchiving ? 'Archivando...' : 'Sí, archivar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowConfirm(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crear nuevo ciclo */}
      {!activeCycleData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-primary" /> Activar nuevo ciclo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              No hay ciclo activo. Creá el nuevo ciclo para empezar a cargar estudiantes.
            </p>
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Año del ciclo</label>
                <input
                  type="number"
                  className="w-32 h-10 border rounded-md px-3 text-sm bg-background"
                  placeholder="2027"
                  value={newCycleYear}
                  onChange={e => { setNewCycleYear(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateCycle()}
                />
              </div>
              <Button onClick={handleCreateCycle} disabled={isCreating} className="gap-2">
                <Plus className="w-4 h-4" />
                {isCreating ? 'Creando...' : 'Crear y activar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ciclos archivados */}
      {archivedCycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Archive className="w-4 h-4 text-muted-foreground" /> Ciclos archivados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {archivedCycles.map(cycle => (
                <div
                  key={cycle.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    activeCycle === cycle.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                  onClick={() => onCycleChange(cycle.id)}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <span className="font-semibold">{cycle.id}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {cycle.studentCount} estudiantes
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                    {activeCycle === cycle.id ? 'Consultando' : 'Solo lectura'}
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Hacé clic en un ciclo archivado para consultarlo en modo solo lectura.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default CycleManager