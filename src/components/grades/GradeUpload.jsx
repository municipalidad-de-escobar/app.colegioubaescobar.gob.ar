import React, { useState, useRef, useEffect } from 'react'
import { db } from '../../config/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import Button from '../ui/Button';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const GradeUpload = ({ cycle }) => {
  const [selectedExam, setSelectedExam] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [currentStudent, setCurrentStudent] = useState(null);
  const [grade, setGrade] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const inputRef = useRef(null);

  // Opciones de examen (mismas que en StudentsList)
  const examOptions = [
    { value: 'M1-2026', label: 'Matemática 1' },
    { value: 'M2-2026', label: 'Matemática 2' },
    { value: 'M3-2026', label: 'Matemática 3' },
    { value: 'RM-2026', label: 'Recuperatorio Matemática' },
    { value: 'L1-2026', label: 'Lengua 1' },
    { value: 'L2-2026', label: 'Lengua 2' },
    { value: 'L3-2026', label: 'Lengua 3' },
    { value: 'RL-2026', label: 'Recuperatorio Lengua' },
  ];

  // Mantener el foco en el input para la lectora
  useEffect(() => {
    if (selectedExam && !currentStudent) {
      inputRef.current?.focus();
    }
  }, [selectedExam, currentStudent]);

  const handleScan = async (e) => {
    e.preventDefault();
    const scannedValue = barcodeInput.trim();
    if (!scannedValue) return;

    // 1. Normalizar: quitar guiones del valor escaneado
    const normalizedScan = scannedValue.replace(/-/g, '')
    const normalizedExam = selectedExam.replace(/-/g, '')

    // 2. Validar que el código corresponda al examen seleccionado
    if (!normalizedScan.startsWith(normalizedExam)) {
      setStatus({ type: 'error', message: 'El código escaneado no pertenece al examen seleccionado.' });
      setBarcodeInput('');
      return;
    }

    // 3. Extraer el ID del estudiante y reinsertarle el guión (formato Firestore: YYYY-NNN)
    const rawStudentId = normalizedScan.slice(normalizedExam.length);
    // rawStudentId es algo como '2026001' → lo convertimos a '2026-001'
    const studentId = rawStudentId.length >= 5
      ? rawStudentId.slice(0, 4) + '-' + rawStudentId.slice(4)
      : rawStudentId;
    
    try {
      const ref = doc(db, 'cycles', cycle, 'students', studentId)
      const snap = await getDoc(ref)

      if (!snap.exists()) {
        setStatus({ type: 'error', message: 'Estudiante no encontrado en la base de datos.' })
        setBarcodeInput('')
      } else {
        setCurrentStudent({ docId: snap.id, ...snap.data(), barcodeScanned: scannedValue })
        setStatus({ type: '', message: '' })
      }
    } catch (error) {
      console.error("Error al buscar estudiante:", error)
      setStatus({ type: 'error', message: 'Error de conexión con la base de datos.' })
    }
    setBarcodeInput('');
  };

  const handleSaveGrade = async () => {
    if (!grade || (isNaN(grade) && grade.toLowerCase() !== 'aus')) {
      alert("Por favor ingrese una nota válida (0-100) o escriba 'Aus'")
      return
    }

    try {
      const valueToSave = grade.toLowerCase() === 'aus' ? 'Aus' : Number(grade)

      if (typeof valueToSave === 'number' && (valueToSave < 0 || valueToSave > 100)) {
        alert("La nota debe estar entre 0 y 100")
        return
      }

      const updatedGrades = {
        ...currentStudent.grades,
        [selectedExam]: valueToSave
      }

      const ref = doc(db, 'cycles', cycle, 'students', currentStudent.docId)
      await updateDoc(ref, { grades: updatedGrades, updatedAt: new Date().toISOString() })

      setStatus({
        type: 'success',
        message: `Guardado: ${currentStudent.barcodeScanned || currentStudent.apellido} - ${valueToSave === 'Aus' ? 'Ausente' : 'Nota: ' + valueToSave + ' pts'}`
      })
      setCurrentStudent(null)
      setGrade('')
    } catch (error) {
      console.error("Error al guardar nota:", error)
      setStatus({ type: 'error', message: 'No se pudo guardar la nota.' })
    }
  }

  const handleSetAbsent = async () => {
    try {
      const updatedGrades = {
        ...currentStudent.grades,
        [selectedExam]: 'Aus'
      }

      const ref = doc(db, 'cycles', cycle, 'students', currentStudent.docId)
      await updateDoc(ref, { grades: updatedGrades, updatedAt: new Date().toISOString() })

      setStatus({
        type: 'success',
        message: `Ausente registrado para ${currentStudent.apellido}`
      })
      setCurrentStudent(null)
      setGrade('')
    } catch (error) {
      console.error("Error:", error)
      setStatus({ type: 'error', message: 'Error al registrar ausente' })
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Carga de Calificaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selector de Examen */}
          <div>
            <label className="block text-sm font-medium mb-2">Examen a cargar</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base"
              value={selectedExam}
              onChange={(e) => {
                setSelectedExam(e.target.value);
                setCurrentStudent(null);
                setStatus({ type: '', message: '' });
              }}
            >
              <option value="">Seleccioná el examen</option>
              {examOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Input para la Lectora (solo visible si hay examen seleccionado) */}
          {selectedExam && !currentStudent && (
            <form onSubmit={handleScan} className="space-y-2">
              <label className="block text-sm font-medium text-blue-600">Esperando escaneo de carátula...</label>
              <Input
                ref={inputRef}
                placeholder="Escanee el código de barras aquí"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                autoComplete="off"
              />
            </form>
          )}

          {/* Resultado del escaneo y carga de nota */}
          {currentStudent && (
            <div className="bg-slate-50 p-4 rounded-lg border border-blue-200 animate-in fade-in zoom-in duration-200">
              <h3 className="font-bold text-lg mb-2">Estudiante Encontrado</h3>
              <p><strong>Nombre:</strong> {currentStudent.apellido}, {currentStudent.nombre}</p>
              <p><strong>Comisión:</strong> {currentStudent.comision || currentStudent.Comisión}</p>
              
              <div className="mt-4 flex gap-4 items-end">
  <div className="flex-1">
    <label className="block text-sm font-medium mb-1">Nota (0-100) o 'Aus'</label>
    <Input
      type="text"
      value={grade}
      onChange={(e) => setGrade(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleSaveGrade();
        }
      }}
      placeholder="Ej: 85 o Aus"
      autoFocus
    />
  </div>
  
  {/* Botón Guardar (procesa tanto números como texto "Aus") */}
  <Button onClick={handleSaveGrade}>Guardar Nota</Button>
  
  {/* Botón de acceso rápido para Ausente */}
  <Button 
    variant="outline" 
    className="border-orange-500 text-orange-600 hover:bg-orange-50"
    onClick={handleSetAbsent}
  >
    Marcar Ausente
  </Button>
  
  <Button variant="ghost" onClick={() => setCurrentStudent(null)}>Cancelar</Button>
</div>
            </div>
          )}

          {/* Mensajes de Estado */}
          {status.message && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              status.type === 'error' ? 'bg-destructive/15 text-destructive' : 'bg-green-100 text-green-800'
            }`}>
              {status.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              <span className="text-sm font-medium">{status.message}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GradeUpload;