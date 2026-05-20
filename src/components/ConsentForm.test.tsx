import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConsentForm, ConsentFormData, DoctorInfo } from './ConsentForm';

// Mock de SignatureCanvas
vi.mock('./SignatureCanvas', () => ({
  SignatureCanvas: ({ onSign, onClear, readOnly, existingDataUrl }: {
    onSign?: (dataUrl: string) => void;
    onClear?: () => void;
    readOnly?: boolean;
    existingDataUrl?: string;
  }) => (
    <div data-testid="signature-canvas">
      {readOnly && existingDataUrl ? (
        <img src={existingDataUrl} alt="Firma" data-testid="existing-signature" />
      ) : (
        <>
          <div data-testid="canvas-draw-area">Canvas Area</div>
          {!readOnly && (
            <>
              <button
                data-testid="canvas-sign-btn"
                onClick={() => onSign?.('data:image/png;base64,fake-signature')}
              >
                Simular Firma
              </button>
              <button
                data-testid="canvas-clear-btn"
                onClick={() => onClear?.()}
              >
                Limpiar
              </button>
            </>
          )}
        </>
      )}
    </div>
  ),
}));

describe('ConsentForm', () => {
  const mockValues: ConsentFormData = {
    procedure_description: 'Procedimiento de Botox',
    risks: 'Riesgos mínimos',
    notes: 'Paciente informado',
    signed_by_name: 'Juan Pérez',
    signature_data_url: 'data:image/png;base64,fake-signature-data',
  };

  const mockDoctor: DoctorInfo = {
    name: 'Dra. Carolina Martínez',
    profession: 'Médico',
    specialty: 'Medicina Estética',
    rethus_number: '12345',
    professional_seal: 'SEAL-001',
  };

  // Test 1: Modo readonly con consentimiento firmado — muestra badge Firmado + firma
  it('modo readonly con consentimiento firmado muestra badge Firmado y firma', () => {
    render(
      <ConsentForm
        values={mockValues}
        signedAt="2024-01-15T10:30:00Z"
        doctorInfo={mockDoctor}
        mode="readonly"
      />
    );

    // Verifica título
    expect(screen.getByText('Consentimiento Informado')).toBeInTheDocument();

    // Verifica badge Firmado (verde)
    const badgeText = screen.getByText('Firmado');
    expect(badgeText).toBeInTheDocument();
    // El badge está en un span con las clases de estilo
    const badgeContainer = badgeText.closest('[class*="bg-green-50"]');
    expect(badgeContainer).toHaveClass('bg-green-50');
    expect(badgeContainer).toHaveClass('text-green-700');

    // Verifica que la firma se muestra (SignatureCanvas con existingDataUrl)
    expect(screen.getByTestId('signature-canvas')).toBeInTheDocument();
    expect(screen.getByTestId('existing-signature')).toHaveAttribute('src', mockValues.signature_data_url);

    // Verifica fecha de firma
    expect(screen.getByText(/Firmado el/)).toBeInTheDocument();

    // Verifica info del médico
    expect(screen.getByText('Dra. Carolina Martínez')).toBeInTheDocument();
    expect(screen.getByText('RETHUS: 12345')).toBeInTheDocument();
  });

  // Test 2: Modo readonly sin firma — muestra badge Pendiente
  it('modo readonly sin firma muestra badge Pendiente y mensaje de sin firma', () => {
    const unsignedValues: ConsentFormData = {
      ...mockValues,
      signature_data_url: '',
      signed_by_name: '',
    };

    render(
      <ConsentForm
        values={unsignedValues}
        signedAt={null}
        doctorInfo={mockDoctor}
        mode="readonly"
      />
    );

    // Verifica badge Pendiente (ámbar)
    const badgeText = screen.getByText('Pendiente');
    expect(badgeText).toBeInTheDocument();
    const badgeContainer = badgeText.closest('[class*="bg-amber-50"]');
    expect(badgeContainer).toHaveClass('bg-amber-50');
    expect(badgeContainer).toHaveClass('text-amber-700');

    // Verifica mensaje de sin firma
    expect(screen.getByText('Sin firma registrada')).toBeInTheDocument();

    // Verifica que NO hay imagen de firma
    expect(screen.queryByTestId('existing-signature')).not.toBeInTheDocument();
  });

  // Test 3: Modo editable — flujo de firma: dibujar → Firmar → dispara onSign
  it('modo editable permite flujo de firma completo y dispara onSign', async () => {
    const mockOnSign = vi.fn();
    const mockOnChange = vi.fn();

    render(
      <ConsentForm
        values={mockValues}
        signedAt={null}
        doctorInfo={mockDoctor}
        mode="editable"
        onChange={mockOnChange}
        onSign={mockOnSign}
      />
    );

    // Verifica que está en modo editable (hay inputs editables)
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThan(0);

    // Ingresa nombre del firmante
    const nameInput = screen.getByPlaceholderText('Nombre completo');
    fireEvent.change(nameInput, { target: { value: 'María López' } });

    // Simula dibujar en el canvas (haciendo clic en el botón de simulación del mock)
    const signBtn = screen.getByTestId('canvas-sign-btn');
    fireEvent.click(signBtn);

    // Verifica que el canvas muestra la firma
    expect(screen.getByTestId('signature-canvas')).toBeInTheDocument();

    // Hace clic en "Firmar ahora"
    const submitBtn = screen.getByText('Firmar ahora');
    fireEvent.click(submitBtn);

    // Verifica que onSign fue llamado con los argumentos correctos
    await waitFor(() => {
      expect(mockOnSign).toHaveBeenCalledTimes(1);
      expect(mockOnSign).toHaveBeenCalledWith(
        'data:image/png;base64,fake-signature',
        'María López'
      );
    });
  });

  // Test 4: Modo editable — limpiar firma dispara onUnsign
  it('modo editable permite deshacer firma y dispara onUnsign', () => {
    const mockOnUnsign = vi.fn();
    const mockOnSign = vi.fn();

    render(
      <ConsentForm
        values={mockValues}
        signedAt="2024-01-15T10:30:00Z"
        doctorInfo={mockDoctor}
        mode="editable"
        onSign={mockOnSign}
        onUnsign={mockOnUnsign}
      />
    );

    // Como está firmado, debe mostrar el botón "Deshacer firma"
    const unsignBtn = screen.getByText('Deshacer firma');
    expect(unsignBtn).toBeInTheDocument();

    // Hace clic en deshacer firma
    fireEvent.click(unsignBtn);

    // Verifica que onUnsign fue llamado
    expect(mockOnUnsign).toHaveBeenCalledTimes(1);
  });

  // Tests adicionales para cobertura

  it('modo readonly muestra campos como divs no editables', () => {
    render(
      <ConsentForm
        values={mockValues}
        signedAt="2024-01-15T10:30:00Z"
        mode="readonly"
      />
    );

    // Verifica que el contenido de procedimiento se muestra como texto
    expect(screen.getByText('Procedimiento de Botox')).toBeInTheDocument();

    // No debe haber textareas editables
    const textareas = screen.queryAllByRole('textbox');
    expect(textareas.length).toBe(0);
  });

  it('modo editable dispara onChange al modificar campos de texto', () => {
    const mockOnChange = vi.fn();

    render(
      <ConsentForm
        values={mockValues}
        signedAt={null}
        mode="editable"
        onChange={mockOnChange}
      />
    );

    // Modifica el campo de procedimiento
    const procedureTextarea = screen.getByDisplayValue('Procedimiento de Botox');
    fireEvent.change(procedureTextarea, { target: { value: 'Nuevo procedimiento' } });

    // Verifica que onChange fue llamado
    expect(mockOnChange).toHaveBeenCalledWith('procedure_description', 'Nuevo procedimiento');
  });

  it('deshabilita botón Firmar cuando no hay firma o nombre', () => {
    render(
      <ConsentForm
        values={{ ...mockValues, signature_data_url: '', signed_by_name: '' }}
        signedAt={null}
        mode="editable"
      />
    );

    // El botón Firmar debe estar deshabilitado inicialmente
    const signBtn = screen.getByText('Firmar ahora');
    expect(signBtn).toBeDisabled();
  });

  it('no muestra sección de médico cuando doctorInfo es undefined', () => {
    render(
      <ConsentForm
        values={mockValues}
        signedAt="2024-01-15T10:30:00Z"
        mode="readonly"
      />
    );

    // No debe haber título de médico
    expect(screen.queryByText('Médico responsable')).not.toBeInTheDocument();
  });

  it('muestra guión para campos vacíos en modo readonly', () => {
    const emptyValues: ConsentFormData = {
      procedure_description: '',
      risks: '',
      notes: '',
      signed_by_name: '',
      signature_data_url: '',
    };

    render(
      <ConsentForm
        values={emptyValues}
        signedAt={null}
        mode="readonly"
      />
    );

    // Debe mostrar guiones para campos vacíos
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  // Test nuevo: onSignatureChange se dispara al dibujar en el canvas (modo auto-save)
  it('dispara onSignatureChange al simular firma en el canvas (modo auto-save)', () => {
    const mockOnSignatureChange = vi.fn();
    const mockOnSign = vi.fn();

    render(
      <ConsentForm
        values={mockValues}
        signedAt={null}
        mode="editable"
        onSign={mockOnSign}
        onSignatureChange={mockOnSignatureChange}
      />
    );

    // Simula dibujar en el canvas
    const signBtn = screen.getByTestId('canvas-sign-btn');
    fireEvent.click(signBtn);

    // Verifica que onSignatureChange fue llamado inmediatamente con la firma
    expect(mockOnSignatureChange).toHaveBeenCalledTimes(1);
    expect(mockOnSignatureChange).toHaveBeenCalledWith('data:image/png;base64,fake-signature');

    // onSign NO debe haber sido llamado aún (requiere clic en "Firmar ahora")
    expect(mockOnSign).not.toHaveBeenCalled();
  });

  // Test nuevo: onSignatureChange('') se dispara al limpiar el canvas
  it('dispara onSignatureChange con string vacío al limpiar el canvas', () => {
    const mockOnSignatureChange = vi.fn();

    render(
      <ConsentForm
        values={mockValues}
        signedAt={null}
        mode="editable"
        onSignatureChange={mockOnSignatureChange}
      />
    );

    // Primero simula una firma
    const signBtn = screen.getByTestId('canvas-sign-btn');
    fireEvent.click(signBtn);
    expect(mockOnSignatureChange).toHaveBeenCalledWith('data:image/png;base64,fake-signature');

    // Luego limpia el canvas
    const clearBtn = screen.getByTestId('canvas-clear-btn');
    fireEvent.click(clearBtn);

    // Verifica que onSignatureChange fue llamado con string vacío
    expect(mockOnSignatureChange).toHaveBeenCalledTimes(2);
    expect(mockOnSignatureChange).toHaveBeenLastCalledWith('');
  });

  // Test: compatibilidad de onSignatureChange y onSign (ambas pueden coexistir)
  it('permite coexistir onSignatureChange y onSign sin conflicto', async () => {
    const mockOnSignatureChange = vi.fn();
    const mockOnSign = vi.fn();

    render(
      <ConsentForm
        values={mockValues}
        signedAt={null}
        mode="editable"
        onSign={mockOnSign}
        onSignatureChange={mockOnSignatureChange}
      />
    );

    // Ingresa nombre
    const nameInput = screen.getByPlaceholderText('Nombre completo');
    fireEvent.change(nameInput, { target: { value: 'Carlos Ruiz' } });

    // Simula firma en canvas (dispara onSignatureChange inmediatamente)
    const signBtn = screen.getByTestId('canvas-sign-btn');
    fireEvent.click(signBtn);

    expect(mockOnSignatureChange).toHaveBeenCalledTimes(1);
    expect(mockOnSignatureChange).toHaveBeenCalledWith('data:image/png;base64,fake-signature');
    expect(mockOnSign).not.toHaveBeenCalled();

    // Clic en "Firmar ahora" (dispara onSign)
    const submitBtn = screen.getByText('Firmar ahora');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSign).toHaveBeenCalledTimes(1);
      expect(mockOnSign).toHaveBeenCalledWith(
        'data:image/png;base64,fake-signature',
        'Carlos Ruiz'
      );
    });

    // onSignatureChange no debe haberse llamado de nuevo
    expect(mockOnSignatureChange).toHaveBeenCalledTimes(1);
  });
});
