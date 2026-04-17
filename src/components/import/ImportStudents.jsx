import React, { useState } from 'react'
import { supabase } from '../../config/supabase'
import { parseCSV, mapStudentData, validateStudentData } from '../../utils/csvUtils'
import Button from '../ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card'
import { Alert, AlertTitle, AlertDescription } from '../ui/Alert'
import { Input } from '../ui/Input'
import { Label } from '../ui/Label'
import Loading from '../ui/Loading'
import { UploadCloud, AlertCircle, CheckCircle, FileText } from 'lucide-react'

const EXPECTED_HEADERS = [
  'id_estudiante',
  'apellido',
  'nombre',
  'dni',
  'fecha_nac',
  'comision',
  'gestion',
  'partido'
]

/**
 * Componente para importar estudiantes desde CSV
 */
const ImportStudents = ({ cycle = '2026', onSuccess }) => {
  const [file, setFile] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [preview, setPreview] = useState([])
  const [uploading, setUploading] = useState(false)

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setError(null)
    setSuccess(null)
    setPreview([])

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Por favor selecciona un archivo CSV válido')
      return
    }

    setIsLoading(true)

    try {
      // Parsear el CSV
      const csvData = await parseCSV(selectedFile, EXPECTED_HEADERS)

      // Mapear los datos al formato de Firestore
      const students = mapStudentData(csvData, cycle)

      // Validar los datos
      const errors = []
      students.forEach((student, index) => {
        const validationErrors = validateStudentData(student)
        if (validationErrors.length > 0) {
          errors.push(`Fila ${index + 2}: ${validationErrors.join(', ')}`)
        }
      })

      if (errors.length > 0) {
        setError(`Errores de validación:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}`)
        setIsLoading(false)
        return
      }

      // Mostrar preview de los primeros 5 estudiantes
      setPreview(students.slice(0, 5))
      setFile(selectedFile)
    } catch (err) {
      setError(`Error al parsear CSV: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const csvData = await parseCSV(file, EXPECTED_HEADERS)
      const students = mapStudentData(csvData, cycle)

      // Insert students in chunks of 500
      for (let i = 0; i < students.length; i += 500) {
        const chunk = students.slice(i, Math.min(i + 500, students.length))

        const dataToInsert = chunk

        const { error: insertErr } = await supabase
          .from('students')
          .upsert(dataToInsert, { onConflict: 'id,cycle_year' })

        if (insertErr) throw insertErr

        console.log(`Subidos ${Math.min(i + 500, students.length)}/${students.length} estudiantes`)
      }

      setSuccess(`✓ ${students.length} estudiantes importados exitosamente`)
      setFile(null)
      setPreview([])

      if (onSuccess) {
        onSuccess(students.length)
      }

      document.getElementById('csv-input').value = ''
    } catch (err) {
      console.error('Error al subir estudiantes:', err)
      setError(`Error al importar estudiantes: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar Estudiantes</CardTitle>
          <CardDescription>
            Sube un archivo CSV con los datos de los estudiantes del ciclo {cycle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Formato esperado del CSV:</h3>
            <p className="text-sm text-blue-800 mb-3">El archivo debe contener las siguientes columnas:</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
              {EXPECTED_HEADERS.map(header => (
                <div key={header} className="flex items-center">
                  <span className="text-blue-600 mr-2">•</span>
                  <code className="bg-white px-2 py-1 rounded text-xs">{header}</code>
                </div>
              ))}
            </div>
          </div>

          {/* Mostrar errores */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="ml-2">Error</AlertTitle>
              <AlertDescription className="ml-6 whitespace-pre-wrap">{error}</AlertDescription>
            </Alert>
          )}

          {/* Mostrar éxito */}
          {success && (
            <Alert variant="success">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle className="ml-2">Éxito</AlertTitle>
              <AlertDescription className="ml-6">{success}</AlertDescription>
            </Alert>
          )}

          {/* Input de archivo */}
          <div className="space-y-2">
            <Label htmlFor="csv-input" className="text-base">Selecciona archivo CSV</Label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="csv-input"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra tu archivo CSV aquí o <span className="font-semibold text-foreground">haz clic</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">CSV (máximo 10 MB)</p>
                </div>
                <Input
                  id="csv-input"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
            {file && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Archivo: {file.name}
              </p>
            )}
          </div>

          {/* Preview de datos */}
          {preview.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base">Preview de los primeros registros:</Label>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">ID</th>
                      <th className="px-4 py-2 text-left font-semibold">Apellido</th>
                      <th className="px-4 py-2 text-left font-semibold">Nombre</th>
                      <th className="px-4 py-2 text-left font-semibold">DNI</th>
                      <th className="px-4 py-2 text-left font-semibold">Comisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((student, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/50">
                        <td className="px-4 py-2">{student.id}</td>
                        <td className="px-4 py-2">{student.apellido}</td>
                        <td className="px-4 py-2">{student.nombre}</td>
                        <td className="px-4 py-2">{student.dni}</td>
                        <td className="px-4 py-2">{student.comision}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Mostrando primeros 5 registros
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setFile(null)
              setPreview([])
              setError(null)
              setSuccess(null)
              document.getElementById('csv-input').value = ''
            }}
            disabled={!file || uploading}
          >
            Limpiar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading || isLoading}
            className="flex-1"
          >
            {uploading ? 'Importando...' : 'Importar Estudiantes'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default ImportStudents
