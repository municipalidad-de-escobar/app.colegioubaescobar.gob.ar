import React, { useState, useEffect } from 'react'
import { db } from '../../config/firebase'
import { collection, doc, query, orderBy, onSnapshot, updateDoc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { Input } from '../ui/Input'
import Button from '../ui/Button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table'
import { FileText } from 'lucide-react'
import { Edit } from 'lucide-react'
import EditStudentModal from './EditStudentModal'


const StudentsList = ({ cycle }) => {
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedExam, setSelectedExam] = useState('')
  const [selectedCommission, setSelectedCommission] = useState('')
  const [isGeneratingAll, setIsGeneratingAll] = useState(false)
  const [generatingStudentId, setGeneratingStudentId] = useState('')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [examDate, setExamDate] = useState('')      // DD/MM/YYYY for PDF
  const [inputDateValue, setInputDateValue] = useState('') // YYYY-MM-DD for input

  const handleEditClick = (student) => {
    setEditingStudent({ ...student });
    setIsEditModalOpen(true);
  };

  const handleUpdateStudent = async (updatedData) => {
    try {
      const ref = doc(db, 'cycles', cycle, 'students', editingStudent.docId)
      await updateDoc(ref, { ...updatedData, updatedAt: new Date().toISOString() })
      setIsEditModalOpen(false)
      setEditingStudent(null)
    } catch (error) {
      console.error("Error al actualizar:", error)
      alert("No se pudieron guardar los cambios.")
    }
  }

  const examOptions = [
    { value: 'M1-2026', label: 'Matemática 1' },
    { value: 'M2-2026', label: 'Matemática 2' },
    { value: 'M3-2026', label: 'Matemática 3' },
     { value: 'RM-2026', label: 'Recuperatorio Matemática' },
     { value: 'L1-2026', label: 'Lengua 1' },
    { value: 'L2-2026', label: 'Lengua 2' },
    { value: 'L3-2026', label: 'Lengua 3' },
     { value: 'RL-2026', label: 'Recuperatorio Lengua' }
  ]

  useEffect(() => {
    const q = query(
      collection(db, 'cycles', cycle, 'students'),
      orderBy('apellido')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ docId: d.id, ...d.data() })))
    }, (error) => {
      console.error('Error loading students:', error)
    })
    return unsubscribe
  }, [cycle])

  const normalizedSearch = searchTerm.toLowerCase().trim()
  

const filteredStudents = students.filter(student => {
    const studentId = student.id || student.ID_ESTUDIANTE || student.id_estudiante || ''
    const apellido = student.apellido || student.Apellido || ''
    const dni = student.dni || student.DNI || ''
    
    
    const comision = (student.comision || student.Comisión || '').toString()

    const matchesSearch = !normalizedSearch || [studentId, apellido, dni].some(value =>
      value?.toString().toLowerCase().includes(normalizedSearch)
    )

     const matchesCommission = !selectedCommission || comision === selectedCommission;

    return matchesSearch && matchesCommission
  })
const commissionOptions = Array.from(
    new Set(students.map((student) => (student.comision || student.Comisión || '').toString().trim()).filter(Boolean))
  ).sort((a, b) => Number(a) - Number(b));


  const getStudentCode = (student) => {
    return student.id || student.ID_ESTUDIANTE || student.id_estudiante || ''
  }

  const getStudentBarcodeValue = (student) => {
    const studentCode = getStudentCode(student)
    const raw = selectedExam && studentCode ? `${selectedExam}-${studentCode}` : ''
    return raw.replace(/-/g, '')
  }

  const createBarcodeImage = (value, JsBarcode) => {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128',
      displayValue: false,
      width: 2,
      height: 50,
      margin: 0
    })
    return canvas.toDataURL('image/png')
  }

  const renderCaratulaPage = (pdf, student, barcodeValue, barcodeImage, examDate) => {
    const studentSurnameAndName = `${student.apellido || student.Apellido || ''} ${student.nombre || student.Nombre || ''}`.trim()
    const commissionValue = student.comision || student.Comisión || ''
    const studentDni = student.dni || student.DNI || ''
    const studentCode = getStudentCode(student)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(14)
    pdf.text('CARÁTULA DE EXAMEN', 40, 30)
    pdf.setFontSize(11)
    pdf.text('Código de barra', 40, 48)
    pdf.text(barcodeValue, 40, 62)
    pdf.addImage(barcodeImage, 'PNG', 360, 20, 190, 60)

    pdf.setLineDashPattern([3, 2], 0)
    pdf.setLineWidth(0.5)
    pdf.line(40, 70, 260, 70)
    pdf.setLineDashPattern([], 0)

    const tableTop = 130
    const tableLeft = 40
    const tableWidth = 360
    const rowHeight = 28
    const headerHeight = 26
    const rows = 10
    const totalRowHeight = 28
    const col1 = 50
    const col2 = 80
    const col3 = tableWidth - col1 - col2
    const tableHeight = headerHeight + rows * rowHeight + totalRowHeight
    const signatureLeft = tableLeft + tableWidth + 20
    const signatureWidth = 120
    const signatureFirstY = tableTop + 60
    const signatureSecondY = tableTop + 210

    pdf.setLineWidth(0.7)
    pdf.rect(tableLeft, tableTop, tableWidth, tableHeight)
    pdf.line(tableLeft + col1, tableTop, tableLeft + col1, tableTop + tableHeight)
    pdf.line(tableLeft + col1 + col2, tableTop, tableLeft + col1 + col2, tableTop + tableHeight)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('Item', tableLeft + col1 / 2, tableTop + 17, { align: 'center' })
    pdf.text('Nota', tableLeft + col1 + col2 / 2, tableTop + 17, { align: 'center' })
    pdf.text('Firma del docente', tableLeft + col1 + col2 + col3 / 2, tableTop + 17, { align: 'center' })

    pdf.line(tableLeft, tableTop + headerHeight, tableLeft + tableWidth, tableTop + headerHeight)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    for (let i = 1; i <= rows; i += 1) {
      const y = tableTop + headerHeight + i * rowHeight
      pdf.line(tableLeft, y, tableLeft + tableWidth, y)
      pdf.text(`${i}`, tableLeft + col1 / 2, tableTop + headerHeight + i * rowHeight - rowHeight / 2 + 8, { align: 'center' })
    }

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.text('Total', tableLeft + col1 / 2, tableTop + headerHeight + rows * rowHeight + totalRowHeight / 2 + 4, { align: 'center' })

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setLineDashPattern([3, 2], 0)
    pdf.line(signatureLeft, signatureFirstY, signatureLeft + signatureWidth, signatureFirstY)
    pdf.line(signatureLeft, signatureSecondY, signatureLeft + signatureWidth, signatureSecondY)
    pdf.setLineDashPattern([], 0)
    pdf.text('Firma supervisor', signatureLeft, signatureFirstY + 14)
    pdf.text('Firma corrector', signatureLeft, signatureSecondY + 14)

    pdf.setLineDashPattern([3, 2], 0)
    pdf.line(40, tableTop + tableHeight + 30, 555, tableTop + tableHeight + 30)
    pdf.setLineDashPattern([], 0)

    const lowerY = tableTop + tableHeight + 55
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(12)
    pdf.text('Curso de Ingreso Ramón Cereijo, UBA.', 40, lowerY)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.text(`Fecha: ${examDate || '______________________'}`, 40, lowerY + 18)
    pdf.text(`Examen: ${selectedExam}`, 40, lowerY + 34)

    pdf.setLineDashPattern([3, 2], 0)
    pdf.line(40, lowerY + 88, 260, lowerY + 88)
    pdf.setLineDashPattern([], 0)
    pdf.text('Firma del alumno', 40, lowerY + 102)

    pdf.text(`Apellido y Nombre: ${studentSurnameAndName}`, 40, lowerY + 128)
    pdf.text(`Comisión: ${commissionValue}`, 40, lowerY + 144)
    pdf.text(`DNI: ${studentDni}`, 40, lowerY + 160)
    pdf.text(`Código del estudiante: ${studentCode}`, 40, lowerY + 176)
    pdf.text(`Código de barra: ${barcodeValue}`, 40, lowerY + 192)
    pdf.addImage(barcodeImage, 'PNG', 360, lowerY + 120, 190, 55)
  }

  const generatePdfForStudents = async (studentsToGenerate) => {
    if (!selectedExam || studentsToGenerate.length === 0) {
      return
    }

    const [{ jsPDF }, { default: JsBarcode }] = await Promise.all([
      import('jspdf'),
      import('jsbarcode'),
    ])

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })

    studentsToGenerate.forEach((student, index) => {
      const barcodeValue = getStudentBarcodeValue(student)
      const barcodeImage = createBarcodeImage(barcodeValue, JsBarcode)

      if (index > 0) {
        pdf.addPage()
      }

      renderCaratulaPage(pdf, student, barcodeValue, barcodeImage, examDate)
    })

    const filename = `${selectedExam}-caratulas-${selectedCommission || 'todas'}.pdf`
    pdf.save(filename)
  }

  const handleGenerateCaratula = async (student) => {
    const studentCode = getStudentCode(student)
    setGeneratingStudentId(studentCode)

    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
      generatePdfForStudents([student])
    } finally {
      setGeneratingStudentId('')
    }
  }

  const handleGenerateAllCaratulas = async () => {
    setIsGeneratingAll(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 50))
      generatePdfForStudents(filteredStudents)
    } finally {
      setIsGeneratingAll(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Estudiantes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr_1fr_1fr] mb-4 items-end">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Examen
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
            >
              <option value="">Seleccioná un examen</option>
              {examOptions.map((exam) => (
                <option key={exam.value} value={exam.value}>
                  {exam.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Comisión
            </label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={selectedCommission}
              onChange={(e) => setSelectedCommission(e.target.value)}
            >
              <option value="">Todas las comisiones</option>
              {commissionOptions.map((comision) => (
                <option key={comision} value={comision}>
                  {comision}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-sm font-medium text-foreground">
              Fecha del examen
            </label>
            <input
              type="date"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-base"
              value={inputDateValue}
              onChange={(e) => {
                const val = e.target.value
                setInputDateValue(val)
                if (val) {
                  const [y, m, d] = val.split('-')
                  setExamDate(`${d}/${m}/${y}`)
                } else {
                  setExamDate('')
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              Seleccioná un examen para habilitar el botón Generar carátula.
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={!selectedExam || isGeneratingAll}
              onClick={handleGenerateAllCaratulas}
            >
              {isGeneratingAll ? 'Generando...' : 'Generar carátulas'}
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <Input
            type="text"
            placeholder="Buscar por ID, Apellido o DNI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID_ESTUDIANTE</TableHead>
              <TableHead>Apellido</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Comisión</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map(student => (
                <TableRow key={student.docId || student.id || student.ID_ESTUDIANTE}>
                  <TableCell>{student.id || student.ID_ESTUDIANTE || student.id_estudiante}</TableCell>
                  <TableCell>{student.apellido || student.Apellido}</TableCell>
                  <TableCell>{student.nombre || student.Nombre}</TableCell>
                  <TableCell>{student.dni || student.DNI}</TableCell>
                  <TableCell>{student.comision || student.Comisión}</TableCell>
                 <TableCell className="flex gap-2 items-center">
  {/* Botón de Editar */}
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handleEditClick(student)}
    title="Editar estudiante"
  >
    <Edit className="w-4 h-4" />
  </Button>
  
  {/* Botón de Generar Carátula (Ahora restaurado) */}
  <Button
    variant="outline"
    size="sm"
    disabled={!selectedExam || isGeneratingAll}
    onClick={() => handleGenerateCaratula(student)}
  >
    <FileText className="w-4 h-4 mr-2" />
    {generatingStudentId === getStudentCode(student) ? 'Generando...' : 'Generar carátula'}
  </Button>
</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  {students.length === 0
                    ? 'No hay estudiantes cargados en este ciclo.'
                    : 'No se encontraron estudiantes que coincidan con la búsqueda.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <EditStudentModal 
  student={editingStudent}
  isOpen={isEditModalOpen}
  onClose={() => setIsEditModalOpen(false)}
  onSave={handleUpdateStudent}
/>
      </CardContent>
    </Card>
  )
}

export default StudentsList