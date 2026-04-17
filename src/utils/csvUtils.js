/**
 * Normaliza un encabezado CSV para compararlo de forma predecible.
 */
const normalizeHeader = (header) => {
  return header.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

const HEADER_ALIASES = {
  id_estudiante: 'id_estudiante',
  id_alumno: 'id_estudiante',
  d_estudiante: 'id_estudiante',
  apellido: 'apellido',
  nombre: 'nombre',
  dni: 'dni',
  fecha_nac: 'fecha_nac',
  fecha_nacimiento: 'fecha_nac',
  'fecha nacimiento': 'fecha_nac',
  comision: 'comision',
  comisión: 'comision',
  gestion: 'gestion',
  gestión: 'gestion',
  partido: 'partido'
}

const mapHeader = (header) => {
  const normalized = normalizeHeader(header)
  return HEADER_ALIASES[normalized] || normalized
}

const detectSeparator = (line) => {
  const separators = [',', ';', '\t']
  let maxCount = 0
  let bestSep = ','
  for (const sep of separators) {
    const count = (line.match(new RegExp(`\\${sep}`, 'g')) || []).length
    if (count > maxCount) { maxCount = count; bestSep = sep }
  }
  return bestSep
}

export const parseCSV = async (file, expectedHeaders) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const lines = text.split('\n').filter(line => line.trim())
        if (lines.length === 0) throw new Error('Archivo CSV vacío')

        const separator = detectSeparator(lines[0])
        const headers = lines[0].split(separator).map((h) => mapHeader(h.trim()))
        const missingHeaders = expectedHeaders.filter((h) => !headers.includes(h))
        if (missingHeaders.length > 0) throw new Error(`Columnas faltantes: ${missingHeaders.join(', ')}`)

        const data = []
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(separator).map((v) => v.trim())
          const row = {}
          headers.forEach((header, index) => { row[header] = values[index] || '' })
          if (row['id_estudiante']) data.push(row)
        }

        if (data.length === 0) throw new Error('No se encontraron registros válidos en el CSV')
        resolve(data)
      } catch (error) { reject(error) }
    }
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsText(file)
  })
}

/**
 * Genera el objeto exams dinámicamente según el ciclo
 */
export const buildExams = (cycle) => ({
  [`M1-${cycle}`]: null,
  [`M2-${cycle}`]: null,
  [`M3-${cycle}`]: null,
  [`RM-${cycle}`]: null,
  [`L1-${cycle}`]: null,
  [`L2-${cycle}`]: null,
  [`L3-${cycle}`]: null,
  [`RL-${cycle}`]: null,
})

export const mapStudentData = (csvData, cycle) => {
  return csvData.map((row, index) => ({
    id: row['id_estudiante'] || row['id_alumno'] || `EST-${index}`,
    apellido: row['apellido'] || '',
    nombre: row['nombre'] || '',
    dni: row['dni'] || '',
    comision: row['comision'] || row['comisión'] || '',
    cycle_year: cycle,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    grades: {}
  }))
}

export const validateStudentData = (student) => {
  const errors = []
  if (!student.id || student.id.trim() === '') errors.push('ID de estudiante requerido')
  if (!student.apellido || student.apellido.trim() === '') errors.push('Apellido requerido')
  if (!student.nombre || student.nombre.trim() === '') errors.push('Nombre requerido')
  if (student.dni && student.dni.trim() && isNaN(student.dni)) errors.push('DNI debe ser un número válido')
  return errors
}