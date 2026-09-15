import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import Button from '../ui/Button';
import { ClipboardList, Printer, Download } from 'lucide-react';

// ── Lógica de cálculo (misma regla que Orden de Mérito) ────────────────────────
// Suma las 3 notas numéricas de la materia; si hubo exactamente 1 ausente,
// suma el recuperatorio en su lugar (si tiene nota numérica cargada).
const calcSubjectTotal = (grades, exams, recupKey) => {
  let total = 0;
  let absentCount = 0;

  exams.forEach((ex) => {
    const val = grades?.[ex];
    if (typeof val === 'number') total += val;
    else if (val === 'Aus') absentCount++;
  });

  if (absentCount === 1) {
    const recup = grades?.[recupKey];
    if (typeof recup === 'number') total += recup;
  }

  return total;
};

const formatGrade = (val) => {
  if (val === undefined || val === null) return '-';
  if (val === 'Aus') return 'Aus';
  return Number.isInteger(val) ? val : parseFloat(val.toFixed(2));
};

// Redondea a 1 decimal, sin decimales de más si es entero
const formatStat = (n) => {
  if (n === null || n === undefined || !isFinite(n)) return '-';
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
};

// Promedio / máxima / mínima de Total Mat., Total Leng. y Gran Total para un grupo de filas
const computeStats = (groupRows) => {
  const count = groupRows.length;
  if (count === 0) {
    return {
      count: 0,
      avgMat: '-', avgLen: '-', avgGran: '-',
      maxMat: '-', maxLen: '-', maxGran: '-',
      minMat: '-', minLen: '-', minGran: '-',
    };
  }
  const mats = groupRows.map((s) => s.matTotal);
  const lens = groupRows.map((s) => s.lenTotal);
  const grans = groupRows.map((s) => s.granTotal);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    count,
    avgMat: formatStat(avg(mats)),
    avgLen: formatStat(avg(lens)),
    avgGran: formatStat(avg(grans)),
    maxMat: Math.max(...mats),
    maxLen: Math.max(...lens),
    maxGran: Math.max(...grans),
    minMat: Math.min(...mats),
    minLen: Math.min(...lens),
    minGran: Math.min(...grans),
  };
};

// Construye las 3 filas de resumen (Promedio / Máxima / Mínima) para tabla plana (PDF/Excel)
const buildStatRows = (stats) => ([
  ['Promedio', '', '', '', '', '', '', '', stats.avgMat, '', '', '', '', stats.avgLen, stats.avgGran],
  ['Máxima', '', '', '', '', '', '', '', stats.maxMat, '', '', '', '', stats.maxLen, stats.maxGran],
  ['Mínima', '', '', '', '', '', '', '', stats.minMat, '', '', '', '', stats.minLen, stats.minGran],
]);

const HEAD_ROW = [
  'Apellido', 'Nombre', 'DNI', 'Com.',
  'M1', 'M2', 'M3', 'RM', 'Total Mat.',
  'L1', 'L2', 'L3', 'RL', 'Total Leng.',
  'Gran Total',
];

// ── Componente ───────────────────────────────────────────────────────────────

const ListadoNotas = ({ cycle }) => {
  const MAT_EXAMS = [`M1-${cycle}`, `M2-${cycle}`, `M3-${cycle}`];
  const LEN_EXAMS = [`L1-${cycle}`, `L2-${cycle}`, `L3-${cycle}`];
  const MAT_RECUP = `RM-${cycle}`;
  const LEN_RECUP = `RL-${cycle}`;

  const [students, setStudents] = useState([]);
  const [selectedCommission, setSelectedCommission] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'cycles', cycle, 'students'),
      orderBy('apellido')
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setStudents(snapshot.docs.map((d) => ({ docId: d.id, ...d.data() })));
      },
      (error) => {
        console.error('Error al cargar estudiantes:', error);
      }
    );
    return unsubscribe;
  }, [cycle]);

  const commissionOptions = Array.from(
    new Set(
      students
        .map((s) => (s.comision || s.Comisión || '').toString().trim())
        .filter(Boolean)
    )
  ).sort((a, b) => Number(a) - Number(b));

  const filteredStudents = students.filter((s) => {
    if (!selectedCommission) return true;
    return (s.comision || s.Comisión || '').toString().trim() === selectedCommission;
  });

  const rows = filteredStudents.map((s) => {
    const matTotal = calcSubjectTotal(s.grades, MAT_EXAMS, MAT_RECUP);
    const lenTotal = calcSubjectTotal(s.grades, LEN_EXAMS, LEN_RECUP);
    return { ...s, matTotal, lenTotal, granTotal: matTotal + lenTotal };
  });

  // Agrupación por comisión: si hay una comisión seleccionada, un solo grupo.
  // Si es "Todas", un grupo por cada comisión (+ "Sin comisión" si corresponde).
  const groups = selectedCommission
    ? [{ label: selectedCommission, students: rows }]
    : commissionOptions
        .map((c) => ({
          label: c,
          students: rows.filter(
            (s) => (s.comision || s.Comisión || '').toString().trim() === c
          ),
        }))
        .filter((g) => g.students.length > 0);

  if (!selectedCommission) {
    const sinComision = rows.filter(
      (s) => !(s.comision || s.Comisión || '').toString().trim()
    );
    if (sinComision.length > 0) {
      groups.push({ label: 'Sin comisión', students: sinComision });
    }
  }

  const groupsWithStats = groups.map((g) => ({ ...g, stats: computeStats(g.students) }));
  const showOverall = groupsWithStats.length > 1;
  const overallStats = showOverall ? computeStats(rows) : null;

  const rowToArray = (s) => [
    s.apellido || '',
    s.nombre || '',
    s.dni || '',
    s.comision || s.Comisión || '',
    formatGrade(s.grades?.[MAT_EXAMS[0]]),
    formatGrade(s.grades?.[MAT_EXAMS[1]]),
    formatGrade(s.grades?.[MAT_EXAMS[2]]),
    formatGrade(s.grades?.[MAT_RECUP]),
    s.matTotal,
    formatGrade(s.grades?.[LEN_EXAMS[0]]),
    formatGrade(s.grades?.[LEN_EXAMS[1]]),
    formatGrade(s.grades?.[LEN_EXAMS[2]]),
    formatGrade(s.grades?.[LEN_RECUP]),
    s.lenTotal,
    s.granTotal,
  ];

  // Arma el cuerpo completo (estudiantes + separadores + resúmenes) como filas planas,
  // reutilizado tanto por el PDF como por el Excel.
  const buildFlatBody = () => {
    const body = [];
    groupsWithStats.forEach((g) => {
      if (showOverall) {
        body.push([`Comisión ${g.label}`, ...Array(14).fill('')]);
      }
      g.students.forEach((s) => body.push(rowToArray(s)));
      buildStatRows(g.stats).forEach((r) => body.push(r));
    });
    if (showOverall) {
      body.push(['TOTAL GENERAL', ...Array(14).fill('')]);
      buildStatRows(overallStats).forEach((r) => body.push(r));
    }
    return body;
  };

  const handleExportPDF = async () => {
    if (rows.length === 0) return;
    setIsExportingPDF(true);
    try {
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text(`Listado de Notas — Curso de Ingreso ${cycle}`, 14, 15);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Comisión: ${selectedCommission || 'Todas'}`, 14, 21);

      autoTable(pdf, {
        startY: 26,
        head: [HEAD_ROW],
        body: buildFlatBody(),
        theme: 'grid',
        headStyles: {
          fillColor: [30, 58, 95],
          textColor: [255, 255, 255],
          fontSize: 8,
          halign: 'center',
        },
        bodyStyles: { fontSize: 8, halign: 'center' },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'left' },
        },
        margin: { left: 10, right: 10 },
        didParseCell: (data) => {
          const label = data.row.raw[0];
          if (label === 'Promedio' || label === 'Máxima' || label === 'Mínima') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          } else if (label === 'TOTAL GENERAL') {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 140, 66];
            data.cell.styles.textColor = [255, 255, 255];
          } else if (typeof label === 'string' && label.startsWith('Comisión ')) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [30, 58, 95];
            data.cell.styles.textColor = [255, 255, 255];
          }
        },
      });

      const suffix = selectedCommission ? `Comision_${selectedCommission}` : 'Todas';
      pdf.save(`Listado_Notas_${cycle}_${suffix}.pdf`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    if (rows.length === 0) return;
    setIsExportingExcel(true);
    try {
      const XLSX = await import('xlsx');

      const wsData = [];
      wsData.push([`Listado de Notas — Curso de Ingreso ${cycle}`]);
      wsData.push([`Comisión: ${selectedCommission || 'Todas'}`]);
      wsData.push([]);
      wsData.push(HEAD_ROW);
      buildFlatBody().forEach((r) => wsData.push(r));

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws['!cols'] = [
        { wch: 18 }, // Apellido
        { wch: 16 }, // Nombre
        { wch: 12 }, // DNI
        { wch: 6 },  // Com.
        { wch: 6 }, { wch: 6 }, { wch: 6 }, // M1 M2 M3
        { wch: 12 }, // Recup. Mat.
        { wch: 10 }, // Total Mat.
        { wch: 6 }, { wch: 6 }, { wch: 6 }, // L1 L2 L3
        { wch: 12 }, // Recup. Leng.
        { wch: 11 }, // Total Leng.
        { wch: 11 }, // Gran Total
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Listado de Notas');

      const suffix = selectedCommission ? `Comision_${selectedCommission}` : 'Todas';
      XLSX.writeFile(wb, `Listado_Notas_${cycle}_${suffix}.xlsx`);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ── Render de filas de resumen en pantalla ──────────────────────────────────
  const renderStatRows = (stats, keyPrefix) => (
    <>
      <TableRow key={`${keyPrefix}-avg`} className="bg-muted/50 font-semibold">
        <TableCell colSpan={8}>Promedio</TableCell>
        <TableCell className="text-center">{stats.avgMat}</TableCell>
        <TableCell colSpan={4} />
        <TableCell className="text-center">{stats.avgLen}</TableCell>
        <TableCell className="text-center text-primary">{stats.avgGran}</TableCell>
      </TableRow>
      <TableRow key={`${keyPrefix}-max`} className="bg-muted/50 font-semibold">
        <TableCell colSpan={8}>Máxima</TableCell>
        <TableCell className="text-center">{stats.maxMat}</TableCell>
        <TableCell colSpan={4} />
        <TableCell className="text-center">{stats.maxLen}</TableCell>
        <TableCell className="text-center text-primary">{stats.maxGran}</TableCell>
      </TableRow>
      <TableRow key={`${keyPrefix}-min`} className="bg-muted/50 font-semibold">
        <TableCell colSpan={8}>Mínima</TableCell>
        <TableCell className="text-center">{stats.minMat}</TableCell>
        <TableCell colSpan={4} />
        <TableCell className="text-center">{stats.minLen}</TableCell>
        <TableCell className="text-center text-primary">{stats.minGran}</TableCell>
      </TableRow>
    </>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Listado de Notas
          </CardTitle>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Comisión
              </label>
              <select
                className="h-10 border rounded-md px-3 text-sm bg-background"
                value={selectedCommission}
                onChange={(e) => setSelectedCommission(e.target.value)}
              >
                <option value="">Todas las comisiones</option>
                {commissionOptions.map((c) => (
                  <option key={c} value={c}>
                    Comisión {c}
                  </option>
                ))}
              </select>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExportingExcel || rows.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isExportingExcel ? 'Generando...' : 'Exportar Excel'}
            </Button>
            <Button
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPDF || rows.length === 0}
              className="gap-2"
            >
              <Printer className="w-4 h-4" />
              {isExportingPDF ? 'Generando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Apellido</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead className="text-center">Com.</TableHead>
                <TableHead className="text-center">M1</TableHead>
                <TableHead className="text-center">M2</TableHead>
                <TableHead className="text-center">M3</TableHead>
                <TableHead className="text-center">RM</TableHead>
                <TableHead className="text-center font-semibold">Total Mat.</TableHead>
                <TableHead className="text-center">L1</TableHead>
                <TableHead className="text-center">L2</TableHead>
                <TableHead className="text-center">L3</TableHead>
                <TableHead className="text-center">RL</TableHead>
                <TableHead className="text-center font-semibold">Total Leng.</TableHead>
                <TableHead className="text-center font-semibold">Gran Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length > 0 ? (
                <>
                  {groupsWithStats.map((g) => (
                    <React.Fragment key={g.label}>
                      {showOverall && (
                        <TableRow className="bg-primary/90 hover:bg-primary/90">
                          <TableCell colSpan={15} className="font-bold text-white">
                            Comisión {g.label}
                          </TableCell>
                        </TableRow>
                      )}
                      {g.students.map((s) => (
                        <TableRow key={s.docId}>
                          <TableCell className="font-medium">{s.apellido}</TableCell>
                          <TableCell>{s.nombre}</TableCell>
                          <TableCell className="text-muted-foreground">{s.dni}</TableCell>
                          <TableCell className="text-center">{s.comision || s.Comisión}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[MAT_EXAMS[0]])}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[MAT_EXAMS[1]])}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[MAT_EXAMS[2]])}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[MAT_RECUP])}</TableCell>
                          <TableCell className="text-center font-semibold">{s.matTotal}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[LEN_EXAMS[0]])}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[LEN_EXAMS[1]])}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[LEN_EXAMS[2]])}</TableCell>
                          <TableCell className="text-center">{formatGrade(s.grades?.[LEN_RECUP])}</TableCell>
                          <TableCell className="text-center font-semibold">{s.lenTotal}</TableCell>
                          <TableCell className="text-center font-bold text-primary">{s.granTotal}</TableCell>
                        </TableRow>
                      ))}
                      {renderStatRows(g.stats, `stats-${g.label}`)}
                    </React.Fragment>
                  ))}
                  {showOverall && (
                    <>
                      <TableRow className="bg-orange-500 hover:bg-orange-500">
                        <TableCell colSpan={15} className="font-bold text-white">
                          TOTAL GENERAL
                        </TableCell>
                      </TableRow>
                      {renderStatRows(overallStats, 'stats-general')}
                    </>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={15} className="text-center text-muted-foreground py-8">
                    No hay estudiantes para mostrar en esta comisión.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ListadoNotas;
