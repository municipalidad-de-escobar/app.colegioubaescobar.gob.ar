import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import Button from '../ui/Button';
import { Trophy, Download, Settings } from 'lucide-react';

// Exam keys are built dynamically from the cycle prop inside the component

// ── Lógica de cálculo ──────────────────────────────────────────────────────────

const calcSubjectTotal = (grades, exams, recupKey) => {
  let total = 0;
  let absentCount = 0;

  exams.forEach(ex => {
    const val = grades?.[ex];
    if (typeof val === 'number') total += val;
    else if (val === 'Aus') absentCount++;
  });

  // Solo suma el recuperatorio si hubo exactamente 1 ausente
  if (absentCount === 1) {
    const recup = grades?.[recupKey];
    if (typeof recup === 'number') total += recup;
  }

  return total;
};

const countRendidos = (grades, matExams, lenExams, matRecup, lenRecup) => {
  const allExams = [...matExams, ...lenExams];
  let rendidos = allExams.filter(ex => typeof grades?.[ex] === 'number').length;

  const matAusentes = matExams.filter(ex => grades?.[ex] === 'Aus').length;
  const lenAusentes = lenExams.filter(ex => grades?.[ex] === 'Aus').length;

  if (matAusentes === 1 && typeof grades?.[matRecup] === 'number') rendidos++;
  if (lenAusentes === 1 && typeof grades?.[lenRecup] === 'number') rendidos++;

  return rendidos;
};

const processStudents = (students, vacantes, matExams, lenExams, matRecup, lenRecup) => {
  const processed = students.map(s => {
    const matTotal = calcSubjectTotal(s.grades, matExams, matRecup);
    const lenTotal = calcSubjectTotal(s.grades, lenExams, lenRecup);
    const granTotal = matTotal + lenTotal;
    const rendidos = countRendidos(s.grades, matExams, lenExams, matRecup, lenRecup);

    const cumplePiso = matTotal >= 180 && lenTotal >= 180;
    const cumpleTotal = granTotal >= 360;
    const cumpleExamenes = rendidos >= 6;
    const clasifica = cumplePiso && cumpleTotal && cumpleExamenes;
    const enListado = cumpleTotal && cumpleExamenes; // aparece en la lista ordenada

    return { ...s, matTotal, lenTotal, granTotal, rendidos, clasifica, enListado, cumplePiso };
  });

  // Separar los que no llegan a 360 o no tienen 6 exámenes
  const enListado = processed.filter(s => s.enListado);
  const fuera = processed.filter(s => !s.enListado);

  // Ordenar por gran total desc, luego apellido asc
  enListado.sort((a, b) => b.granTotal - a.granTotal || (a.apellido || '').localeCompare(b.apellido || ''));
  fuera.sort((a, b) => b.granTotal - a.granTotal || (a.apellido || '').localeCompare(b.apellido || ''));

  // Asignar números de orden (solo los que clasifican consumen número)
  let counter = 0;
  enListado.forEach(s => {
    if (s.clasifica) {
      counter++;
      s.orden = counter;
      s.condicion = counter <= vacantes ? 'Ingreso directo' : 'Sorteo de vacante';
    } else {
      s.orden = '***';
      s.condicion = '***';
    }
  });

  return { enListado, fuera };
};

// ── Exportación a Excel ────────────────────────────────────────────────────────

const exportToExcel = async (enListado, fuera, cycle, vacantes) => {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();
  const wsData = [];

  // Título
  wsData.push(['', `Orden de mérito Curso de Ingreso ${cycle}`]);
  wsData.push([]);
  // Encabezado
  wsData.push(['', 'ORDEN', 'APELLIDOS', 'NOMBRES', 'DNI', 'TOTAL MATEMATICA', 'TOTAL LENGUA', 'PUNTAJE', 'CONDICION']);

  enListado.forEach(s => {
    wsData.push([
      '',
      s.orden,
      s.apellido || '',
      s.nombre || '',
      s.dni || '',
      s.matTotal,
      s.lenTotal,
      s.granTotal,
      s.condicion,
    ]);
  });

  // Separador y leyenda ***
  wsData.push([]);
  wsData.push(['', '*** No alcanza los 180 puntos en alguna de las materias o los 6 exámenes mínimos']);
  wsData.push([]);

  // Sección puntaje menor a 360
  wsData.push(['', '', 'Puntaje menor a 360']);
  fuera.forEach(s => {
    wsData.push(['', '', s.apellido || '', s.nombre || '', s.dni || '', s.matTotal, s.lenTotal, s.granTotal]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // ── Estilos con SheetJS Pro (xlsx-js-style si está disponible, sino básico) ──
  // Ancho de columnas
  ws['!cols'] = [
    { wch: 3 },   // A
    { wch: 10 },  // B ORDEN
    { wch: 28 },  // C APELLIDOS
    { wch: 25 },  // D NOMBRES
    { wch: 14 },  // E DNI
    { wch: 18 },  // F TOTAL MAT
    { wch: 16 },  // G TOTAL LEN
    { wch: 12 },  // H PUNTAJE
    { wch: 20 },  // I CONDICION
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Orden de mérito');
  XLSX.writeFile(wb, `Orden_de_merito_${cycle}.xlsx`);
};

// ── Componente ─────────────────────────────────────────────────────────────────

const MeritOrder = ({ cycle }) => {
  const MAT_EXAMS = [`M1-${cycle}`, `M2-${cycle}`, `M3-${cycle}`];
  const LEN_EXAMS = [`L1-${cycle}`, `L2-${cycle}`, `L3-${cycle}`];
  const MAT_RECUP = `RM-${cycle}`;
  const LEN_RECUP = `RL-${cycle}`;

  const [students, setStudents] = useState([]);
  const [vacantes, setVacantes] = useState(90);
  const [showSettings, setShowSettings] = useState(false);
  const [tempVacantes, setTempVacantes] = useState(90);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'cycles', cycle, 'students'),
      orderBy('apellido')
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ docId: d.id, ...d.data() })))
    }, (error) => {
      console.error(error)
    })
    return unsubscribe
  }, [cycle]);

  const { enListado, fuera } = processStudents(students, vacantes, MAT_EXAMS, LEN_EXAMS, MAT_RECUP, LEN_RECUP);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToExcel(enListado, fuera, cycle, vacantes);
    } finally {
      setIsExporting(false);
    }
  };

  const ordenColor = (s) => {
    if (s.orden === '***') return 'text-red-600 font-bold';
    return 'font-mono font-semibold';
  };

  const matColor = (s) => s.matTotal < 180 ? 'bg-red-200 text-red-800 font-semibold' : '';
  const lenColor = (s) => s.lenTotal < 180 ? 'bg-red-200 text-red-800 font-semibold' : '';

  const condColor = (s) => {
    if (s.condicion === 'Ingreso directo') return 'text-green-700 font-semibold';
    if (s.condicion === 'Sorteo de vacante') return 'text-blue-700';
    return 'text-red-600 font-bold';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" /> Orden de Mérito {cycle}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setTempVacantes(vacantes); setShowSettings(!showSettings); }} className="gap-2">
              <Settings className="w-4 h-4" />
              Vacantes ingreso directo: {vacantes}
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting} className="gap-2">
              <Download className="w-4 h-4" />
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          </div>
        </div>

        {/* Panel de configuración */}
        {showSettings && (
          <div className="mt-3 p-4 bg-muted/50 rounded-lg border flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Puntaje máximo para "Ingreso directo" (inclusive)
              </label>
              <input
                type="number"
                className="w-40 h-10 border rounded-md px-3 text-sm bg-background"
                value={tempVacantes}
                onChange={e => setTempVacantes(Number(e.target.value))}
                min="1"
                max="9999"
              />
            </div>
            <Button size="sm" onClick={() => { setVacantes(tempVacantes); setShowSettings(false); }}>
              Aplicar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowSettings(false)}>Cancelar</Button>
            <p className="text-xs text-muted-foreground max-w-xs">
              Los primeros {tempVacantes} estudiantes que cumplan los requisitos tendrán condición "Ingreso directo". Los demás figurarán como "Sorteo de vacante".
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total estudiantes', value: students.length },
            { label: 'Clasifican', value: enListado.filter(s => s.clasifica).length },
            { label: `Ingreso directo (${vacantes} vacantes)`, value: enListado.filter(s => s.condicion === 'Ingreso directo').length },
            { label: 'Sorteo de vacante', value: enListado.filter(s => s.condicion === 'Sorteo de vacante').length },
          ].map(stat => (
            <div key={stat.label} className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla principal */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-center w-16">N° Orden</TableHead>
                <TableHead>Apellido</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead className="text-center">Com.</TableHead>
                <TableHead className="text-center">Total Mat.</TableHead>
                <TableHead className="text-center">Total Len.</TableHead>
                <TableHead className="text-center">Gran Total</TableHead>
                <TableHead className="text-center">Condición</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enListado.map((s, i) => (
                <TableRow key={s.docId} className={s.orden === '***' ? 'bg-red-50' : ''}>
                  <TableCell className={`text-center ${ordenColor(s)}`}>
                    {s.orden === '***' ? '***' : String(s.orden).padStart(3, '0')}
                  </TableCell>
                  <TableCell className="font-medium">{s.apellido}</TableCell>
                  <TableCell>{s.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{s.dni}</TableCell>
                  <TableCell className="text-center">{s.comision || s.Comisión}</TableCell>
                  <TableCell className={`text-center ${matColor(s)}`}>{s.matTotal}</TableCell>
                  <TableCell className={`text-center ${lenColor(s)}`}>{s.lenTotal}</TableCell>
                  <TableCell className="text-center font-semibold">{s.granTotal}</TableCell>
                  <TableCell className={`text-center text-sm ${condColor(s)}`}>{s.condicion}</TableCell>
                </TableRow>
              ))}

              {/* Separador sección "no acceden" */}
              {fuera.length > 0 && (
                <>
                  <TableRow>
                    <TableCell colSpan={9} className="bg-amber-50 text-amber-800 font-semibold text-center py-2 text-sm">
                      ↓ Puntaje menor a 360 puntos o menos de 6 exámenes rendidos — No acceden a vacante
                    </TableCell>
                  </TableRow>
                  {fuera.map(s => (
                    <TableRow key={s.docId} className="bg-amber-50/50 text-muted-foreground">
                      <TableCell className="text-center text-xs">—</TableCell>
                      <TableCell>{s.apellido}</TableCell>
                      <TableCell>{s.nombre}</TableCell>
                      <TableCell>{s.dni}</TableCell>
                      <TableCell className="text-center">{s.comision || s.Comisión}</TableCell>
                      <TableCell className={`text-center ${matColor(s)}`}>{s.matTotal}</TableCell>
                      <TableCell className={`text-center ${lenColor(s)}`}>{s.lenTotal}</TableCell>
                      <TableCell className="text-center">{s.granTotal}</TableCell>
                      <TableCell className="text-center text-xs">No accede</TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {students.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No hay estudiantes cargados en este ciclo.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded inline-block" /> Total materia &lt; 180 pts</span>
          <span className="flex items-center gap-1"><span className="font-bold text-red-600">***</span> No cumple piso por materia (no consume número de orden)</span>
          <span className="flex items-center gap-1"><span className="font-semibold text-green-700">Ingreso directo</span> Primeros {vacantes} clasificados</span>
          <span className="flex items-center gap-1"><span className="text-blue-700">Sorteo de vacante</span> Posición &gt; {vacantes} en el listado</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default MeritOrder;