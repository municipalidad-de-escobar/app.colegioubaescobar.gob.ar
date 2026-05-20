import React, { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import Button from '../ui/Button';

const EditStudentModal = ({ student, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({});

  // Actualizar formData cada vez que cambia el estudiante seleccionado
  useEffect(() => {
    if (student) {
      setFormData({
        apellido: student.apellido || student.Apellido || '',
        nombre:   student.nombre   || student.Nombre   || '',
        dni:      student.dni      || student.DNI      || '',
        comision: student.comision || student.Comisión || '',
      });
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Validación mínima
    if (!formData.apellido.trim() || !formData.nombre.trim()) {
      alert('Apellido y nombre son obligatorios.');
      return;
    }

    // DNI validation: must be 7-8 digits
    const dniValue = formData.dni.trim();
    if (dniValue && (isNaN(dniValue) || dniValue.length < 7 || dniValue.length > 8)) {
      alert('DNI debe ser un número válido de 7 a 8 dígitos.');
      return;
    }

    // Comisión validation: should be numeric if provided
    const comisionValue = formData.comision.trim();
    if (comisionValue && isNaN(comisionValue)) {
      alert('Comisión debe ser un número válido.');
      return;
    }

    // Solo mandamos los campos editables, no todo el objeto
    onSave({
      apellido: formData.apellido.trim(),
      nombre:   formData.nombre.trim(),
      dni:      formData.dni.trim(),
      comision: formData.comision.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-1">Editar Estudiante</h2>
        <p className="text-sm text-muted-foreground mb-5">
          ID: <span className="font-mono">{student.id}</span>
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Apellido</label>
            <Input
              name="apellido"
              value={formData.apellido || ''}
              onChange={handleChange}
              placeholder="Apellido"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              name="nombre"
              value={formData.nombre || ''}
              onChange={handleChange}
              placeholder="Nombre"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">DNI</label>
            <Input
              name="dni"
              type="number"
              value={formData.dni || ''}
              onChange={handleChange}
              placeholder="12345678"
              min="1000000"
              max="99999999"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Comisión</label>
            <Input
              name="comision"
              type="number"
              value={formData.comision || ''}
              onChange={handleChange}
              placeholder="1"
              min="1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </div>
      </div>
    </div>
  );
};

export default EditStudentModal;