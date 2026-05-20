import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MedicalRecordForm, MR_FIELDS, MRForm, TreatmentItem } from './MedicalRecordForm';

describe('MedicalRecordForm', () => {
  const mockValues: MRForm = {
    chief_complaint: 'Dolor de cabeza',
    current_illness: 'Migraña frecuente',
    personal_history: 'Hipertensión',
    surgical_history: '',
    allergic_history: 'Penicilina',
    pharmacological_history: '',
    family_history: '',
    physical_exam: 'Normal',
    diagnosis: 'Migraña crónica',
    treatment_plan: 'Tratamiento sintomático',
    evolution: 'Estable',
    notes: 'Paciente cooperador',
  };

  const mockTreatmentItems: TreatmentItem[] = [
    {
      id: 1,
      treatment_id: 1,
      treatment_name: 'Botox',
      quantity: 2,
      price: 500000,
      notes: 'Zona frontal',
    },
    {
      id: 2,
      treatment_id: 2,
      treatment_name: 'Rellenos',
      quantity: 1,
      price: 1200000,
      notes: '',
    },
  ];

  // Test 1: Renderiza correctamente en modo readonly con valores
  it('renderiza correctamente en modo readonly con valores', () => {
    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={mockTreatmentItems}
        mode="readonly"
      />
    );

    // Verifica que el título está presente
    expect(screen.getByText('Historia Clínica')).toBeInTheDocument();

    // Verifica que los campos MR_FIELDS se renderizan en modo readonly
    expect(screen.getByText('Motivo de consulta')).toBeInTheDocument();
    expect(screen.getByText('Dolor de cabeza')).toBeInTheDocument();

    expect(screen.getByText('Diagnóstico')).toBeInTheDocument();
    expect(screen.getByText('Migraña crónica')).toBeInTheDocument();

    // Verifica que campos vacíos muestran "—"
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);

    // En modo readonly no debe haber textareas editables
    const textareas = screen.queryAllByRole('textbox');
    expect(textareas.length).toBe(0);
  });

  // Test 2: Renderiza correctamente en modo editable con valores
  it('renderiza correctamente en modo editable con valores', () => {
    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={mockTreatmentItems}
        mode="editable"
      />
    );

    // Verifica que el título está presente
    expect(screen.getByText('Historia Clínica')).toBeInTheDocument();

    // Verifica que los textareas son editables
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);

    // Verifica que el campo de diagnóstico tiene el valor correcto
    const diagnosisTextarea = screen.getByDisplayValue('Migraña crónica');
    expect(diagnosisTextarea).toBeInTheDocument();

    // Verifica que el campo de motivo de consulta tiene el valor correcto
    const complaintTextarea = screen.getByDisplayValue('Dolor de cabeza');
    expect(complaintTextarea).toBeInTheDocument();
  });

  // Test 3: Dispara onChange al editar un campo en modo editable
  it('dispara onChange al editar un campo en modo editable', () => {
    const mockOnChange = vi.fn();

    render(
      <MedicalRecordForm
        values={mockValues}
        mode="editable"
        onChange={mockOnChange}
      />
    );

    // Encuentra el textarea de diagnóstico y cambia su valor
    const diagnosisTextarea = screen.getByDisplayValue('Migraña crónica');
    fireEvent.change(diagnosisTextarea, { target: { value: 'Migraña severa' } });

    // Verifica que onChange fue llamado con los argumentos correctos
    expect(mockOnChange).toHaveBeenCalledWith('diagnosis', 'Migraña severa');
  });

  // Test 4: Renderiza treatment items en ambos modos
  it('renderiza treatment items en modo readonly', () => {
    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={mockTreatmentItems}
        mode="readonly"
      />
    );

    // Verifica que los tratamientos se muestran
    expect(screen.getByText('Botox')).toBeInTheDocument();
    expect(screen.getByText('Rellenos')).toBeInTheDocument();

    // Verifica cantidades
    expect(screen.getByText('× 2')).toBeInTheDocument();
    expect(screen.getByText('× 1')).toBeInTheDocument();

    // Verifica que se muestra el total
    expect(screen.getByText(/Total:/)).toBeInTheDocument();

    // Verifica notas
    expect(screen.getByText('Zona frontal')).toBeInTheDocument();
  });

  it('renderiza treatment items en modo editable', () => {
    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={mockTreatmentItems}
        mode="editable"
      />
    );

    // Verifica que los tratamientos se muestran como inputs editables
    expect(screen.getByDisplayValue('Botox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Rellenos')).toBeInTheDocument();

    // Verifica que hay botones para eliminar (iconos X)
    const removeButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg') !== null
    );
    expect(removeButtons.length).toBeGreaterThan(0);
  });

  it('dispara onTreatmentItemsChange al agregar item en modo editable', () => {
    const mockOnTreatmentItemsChange = vi.fn();

    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={mockTreatmentItems}
        mode="editable"
        onTreatmentItemsChange={mockOnTreatmentItemsChange}
      />
    );

    // Encuentra y hace clic en el botón "Agregar"
    const addButton = screen.getByText('Agregar');
    fireEvent.click(addButton);

    // Verifica que onTreatmentItemsChange fue llamado con 3 items
    expect(mockOnTreatmentItemsChange).toHaveBeenCalledTimes(1);
    const newItems = mockOnTreatmentItemsChange.mock.calls[0][0];
    expect(newItems.length).toBe(3);
    expect(newItems[2]).toMatchObject({
      treatment_id: 0,
      treatment_name: '',
      quantity: 1,
      price: 0,
      notes: '',
    });
  });

  it('dispara onTreatmentItemsChange al eliminar item en modo editable', () => {
    const mockOnTreatmentItemsChange = vi.fn();

    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={mockTreatmentItems}
        mode="editable"
        onTreatmentItemsChange={mockOnTreatmentItemsChange}
      />
    );

    // Encuentra los botones con icono X (eliminar)
    const removeButtons = screen.getAllByRole('button').filter(
      btn => btn.querySelector('svg[class*="lucide-x"]') !== null
    );

    // Hace clic en el primer botón de eliminar
    fireEvent.click(removeButtons[0]);

    // Verifica que onTreatmentItemsChange fue llamado con 1 item menos
    expect(mockOnTreatmentItemsChange).toHaveBeenCalledTimes(1);
    const newItems = mockOnTreatmentItemsChange.mock.calls[0][0];
    expect(newItems.length).toBe(1);
    expect(newItems[0].treatment_name).toBe('Rellenos');
  });

  it('no permite edición en modo readonly', () => {
    const mockOnChange = vi.fn();
    const mockOnTreatmentItemsChange = vi.fn();

    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={mockTreatmentItems}
        mode="readonly"
        onChange={mockOnChange}
        onTreatmentItemsChange={mockOnTreatmentItemsChange}
      />
    );

    // Verifica que no hay botón "Agregar" en readonly
    expect(screen.queryByText('Agregar')).not.toBeInTheDocument();

    // Verifica que no hay botones de eliminar en readonly
    const removeButtons = screen.queryAllByRole('button').filter(
      btn => btn.querySelector('svg[class*="lucide-x"]') !== null
    );
    expect(removeButtons.length).toBe(0);
  });

  it('muestra MR_FIELDS constante exportada correctamente', () => {
    expect(MR_FIELDS).toHaveLength(12);
    expect(MR_FIELDS[0]).toEqual({
      key: 'chief_complaint',
      label: 'Motivo de consulta',
    });
    expect(MR_FIELDS[8]).toEqual({
      key: 'diagnosis',
      label: 'Diagnóstico',
      rows: 2,
      required: true,
    });
  });

  it('muestra mensaje cuando no hay treatment items', () => {
    render(
      <MedicalRecordForm
        values={mockValues}
        treatmentItems={[]}
        mode="readonly"
      />
    );

    expect(screen.getByText('Sin procedimientos registrados')).toBeInTheDocument();
  });

  // Tests para Memory Leak - URL.createObjectURL
  describe('Memory Management - URL.createObjectURL', () => {
    beforeEach(() => {
      // Mock para trackear llamadas
      vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('debe crear URL de objeto cuando se selecciona una foto', () => {
      const mockOnPhotoChange = vi.fn();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      render(
        <MedicalRecordForm
          values={mockValues}
          treatmentItems={[]}
          mode="editable"
          photoBefore={undefined}
          onPhotoBeforeChange={mockOnPhotoChange}
        />
      );

      // Simular selección de archivo
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
        
        // Verificar que se llamó createObjectURL
        expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
      }
    });

    it('debe revocar URL de objeto cuando el componente se desmonta', () => {
      const mockOnPhotoChange = vi.fn();
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      const { unmount, rerender } = render(
        <MedicalRecordForm
          values={mockValues}
          treatmentItems={[]}
          mode="editable"
          photoBefore={undefined}
          onPhotoBeforeChange={mockOnPhotoChange}
        />
      );

      // Simular selección de archivo (esto crea la URL)
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fireEvent.change(fileInput, { target: { files: [mockFile] } });
      }

      // Verificar que se creó la URL
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockFile);
      const createdUrl = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.results[0]?.value;

      // Actualizar estado con la URL creada
      rerender(
        <MedicalRecordForm
          values={mockValues}
          treatmentItems={[]}
          mode="editable"
          photoBefore={{
            url: '',
            file: mockFile,
            preview: createdUrl || 'blob:mock-url',
            uploading: false,
          }}
          onPhotoBeforeChange={mockOnPhotoChange}
        />
      );

      // Desmontar componente
      unmount();

      // Verificar que se revocó la URL al desmontar
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(createdUrl || 'blob:mock-url');
    });

    it('debe revocar URL de objeto cuando se elimina la foto', () => {
      const mockOnPhotoChange = vi.fn();
      const mockPhotoState = {
        url: '',
        file: new File(['test'], 'test.jpg', { type: 'image/jpeg' }),
        preview: 'blob:mock-preview-url',
        uploading: false,
      };

      render(
        <MedicalRecordForm
          values={mockValues}
          treatmentItems={[]}
          mode="editable"
          photoBefore={mockPhotoState}
          onPhotoBeforeChange={mockOnPhotoChange}
        />
      );

      // Buscar y hacer clic en botón de eliminar foto
      const removeButton = screen.queryAllByRole('button').find(
        btn => btn.textContent?.includes('Eliminar') || btn.getAttribute('aria-label')?.includes('Eliminar')
      );

      if (removeButton) {
        fireEvent.click(removeButton);
        
        // Verificar que se revocó la URL al eliminar
        expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-preview-url');
      }
    });
  });

  // Tests para validación de props en runtime
  describe('Props Runtime Validation', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    afterEach(() => {
      consoleSpy.mockClear();
      consoleWarnSpy.mockClear();
    });

    afterAll(() => {
      consoleSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('maneja gracefully valores MR_FIELDS incompletos', () => {
      // Simular objeto values con campos faltantes
      const incompleteValues = {
        chief_complaint: 'Dolor',
        // diagnosis está ausente pero es requerido
      } as MRForm;

      // No debe lanzar error
      expect(() => {
        render(
          <MedicalRecordForm
            values={incompleteValues}
            treatmentItems={[]}
            mode="readonly"
          />
        );
      }).not.toThrow();

      // El campo ausente debe mostrar '—'
      expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    });

    it('ignora campos extraños en values que no están en MR_FIELDS', () => {
      const valuesWithExtra = {
        ...mockValues,
        campo_desconocido: 'valor', // Campo no definido
      } as MRForm;

      // No debe lanzar error
      expect(() => {
        render(
          <MedicalRecordForm
            values={valuesWithExtra}
            treatmentItems={[]}
            mode="readonly"
          />
        );
      }).not.toThrow();
    });

    it('maneja treatmentItems con campos opcionales faltantes', () => {
      const incompleteItems: TreatmentItem[] = [
        {
          treatment_id: 1,
          treatment_name: 'Botox',
          quantity: 1,
          price: 100000,
          notes: '',
          // id es opcional
        },
      ];

      expect(() => {
        render(
          <MedicalRecordForm
            values={mockValues}
            treatmentItems={incompleteItems}
            mode="readonly"
          />
        );
      }).not.toThrow();

      // Debe mostrar el item
      expect(screen.getByText('Botox')).toBeInTheDocument();
    });

    it('maneja treatmentItems vacío o undefined', () => {
      // Probar con undefined
      const { rerender } = render(
        <MedicalRecordForm
          values={mockValues}
          treatmentItems={undefined}
          mode="readonly"
        />
      );
      expect(screen.getByText('Sin procedimientos registrados')).toBeInTheDocument();

      // Probar con array vacío
      rerender(
        <MedicalRecordForm
          values={mockValues}
          treatmentItems={[]}
          mode="readonly"
        />
      );
      expect(screen.getByText('Sin procedimientos registrados')).toBeInTheDocument();
    });
  });
});
