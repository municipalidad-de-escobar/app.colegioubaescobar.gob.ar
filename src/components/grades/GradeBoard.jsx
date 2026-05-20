import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, doc, query, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table';
import { Input } from '../ui/Input';
import Button from '../ui/Button'; // Importamos tu componente Button
import { Edit2, Check, X } from 'lucide-react';

const GradeBoard = ({ cycle }) => {
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para la edición rápida
  const [editingCell, setEditingCell] = useState(null); // { studentId, examId }
  const [tempGrade, setTempGrade] = useState('');

  const exams = [
    { id: 'M1-2026', label: 'Mat. 1' },
    { id: 'M2-2026', label: 'Mat. 2' },
    { id: 'M3-2026', label: 'Mat. 3' },
    { id: 'L1-2026', label: 'Len. 1' },
    { id: 'L2-2026', label: 'Len. 2' },
    { id: 'L3-2026', label: 'Len. 3' }
  ];

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
  }, [cycle]);

  const handleStartEdit = (studentId, examId, currentGrade) => {
    setEditingCell({ studentId, examId });
    setTempGrade(currentGrade || '');
  };

  const handleSaveQuickGrade = async (studentDocId) => {
    try {
      const examId = editingCell.examId
      if (tempGrade !== '' && (isNaN(tempGrade) || !Number.isInteger(Number(tempGrade)) || Number(tempGrade) < 0 || Number(tempGrade) > 100)) {
        alert("La nota debe ser un número entero entre 0 y 100")
        return
      }
      const value = tempGrade === '' ? null : Number(tempGrade)
      const ref = doc(db, 'cycles', cycle, 'students', studentDocId)
      await updateDoc(ref, {
        [`grades.${examId}`]: value,
        updatedAt: new Date().toISOString()
      })
      setEditingCell(null)
    } catch (error) {
      console.error("Error al actualizar nota:", error)
      alert("Error al guardar")
    }
  };

  const filteredStudents = students.filter(s => 
    `${s.apellido} ${s.nombre} ${s.dni}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tablero General de Calificaciones</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input 
            placeholder="Buscar por nombre o DNI..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-white z-10">Estudiante</TableHead>
                <TableHead>Comisión</TableHead>
                {exams.map(exam => (
                  <TableHead key={exam.id} className="text-center">{exam.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map(student => (
                <TableRow key={student.docId}>
                  <TableCell className="font-medium sticky left-0 bg-white border-r z-10">
                    {student.apellido}, {student.nombre}
                  </TableCell>
                  <TableCell className="text-center">{student.comision || student.Comisión}</TableCell>
                  
                  {exams.map(exam => {
                    const grade = student.grades?.[exam.id];
                    const isEditing = editingCell?.studentId === student.docId && editingCell?.examId === exam.id;

                    return (
                      <TableCell key={exam.id} className="text-center p-1">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              className="w-14 border rounded px-1 text-center h-8"
                              value={tempGrade}
                              onChange={(e) => setTempGrade(e.target.value)}
                              autoFocus
                            />
                            <button onClick={() => handleSaveQuickGrade(student.docId)} className="text-green-600"><Check size={16}/></button>
                            <button onClick={() => setEditingCell(null)} className="text-red-600"><X size={16}/></button>
                          </div>
                        ) : (
                          <div 
                            className="group flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-100 rounded h-8"
                            onClick={() => handleStartEdit(student.docId, exam.id, grade)}
                          >
                            <span className={grade >= 70 ? 'text-green-600 font-bold' : 'text-red-600'}>
                              {grade !== undefined ? grade : '-'}
                            </span>
                            <Edit2 size={12} className="opacity-0 group-hover:opacity-40 text-slate-500" />
                          </div>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default GradeBoard;