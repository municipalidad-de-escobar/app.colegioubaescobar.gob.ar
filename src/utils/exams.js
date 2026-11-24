// Los ocho exámenes del curso de ingreso. La clave de cada uno lleva el año del
// ciclo (`M1-2026`, `M1-2027`): con esa clave se guardan las notas de cada
// estudiante, la leen el boletín, el listado y el orden de mérito, y la
// carátula la imprime en el código de barras sin guiones (`M12027...`).
// Por eso la clave sale siempre del ciclo que se está viendo y nunca de un
// año escrito en el código.
const EXAMS = [
  { prefix: 'M1', label: 'Matemática 1', short: 'Mat. 1' },
  { prefix: 'M2', label: 'Matemática 2', short: 'Mat. 2' },
  { prefix: 'M3', label: 'Matemática 3', short: 'Mat. 3' },
  { prefix: 'RM', label: 'Recuperatorio Matemática', short: 'Rec. Mat.', recovery: true },
  { prefix: 'L1', label: 'Lengua 1', short: 'Len. 1' },
  { prefix: 'L2', label: 'Lengua 2', short: 'Len. 2' },
  { prefix: 'L3', label: 'Lengua 3', short: 'Len. 3' },
  { prefix: 'RL', label: 'Recuperatorio Lengua', short: 'Rec. Len.', recovery: true },
]

export const examKey = (prefix, cycle) => `${prefix}-${cycle}`

/** Los ocho exámenes del ciclo, para elegir cuál se carga o se imprime. */
export const examOptions = (cycle) =>
  EXAMS.map((exam) => ({ value: examKey(exam.prefix, cycle), label: exam.label }))

/** Los seis exámenes regulares del ciclo, sin los recuperatorios, para el tablero de notas. */
export const boardExams = (cycle) =>
  EXAMS.filter((exam) => !exam.recovery).map((exam) => ({ id: examKey(exam.prefix, cycle), label: exam.short }))
