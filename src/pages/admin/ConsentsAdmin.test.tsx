import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConsentsAdmin } from './ConsentsAdmin';

// Mock de apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/api';

const mockedApiFetch = vi.mocked(apiFetch);

describe('ConsentsAdmin', () => {
  const mockConsents = [
    {
      id: 1,
      patient_id: 101,
      patient_name: 'María López',
      doctor_id: 5,
      doctor_name: 'Dra. Carolina Martínez',
      doctor_profession: 'Médico',
      doctor_specialty: 'Medicina Estética',
      doctor_rethus_number: '12345',
      doctor_professional_seal: 'SEAL-001',
      medical_record_id: 50,
      procedure_description: 'Botox facial',
      risks: 'Rojez, inflamación',
      notes: '',
      signed_by_name: 'María López',
      signed_at: '2024-01-15T10:30:00Z',
      signature_image: 'data:image/png;base64,abc123',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 2,
      patient_id: 102,
      patient_name: 'Juan Pérez',
      doctor_id: 5,
      doctor_name: 'Dra. Carolina Martínez',
      doctor_profession: 'Médico',
      doctor_specialty: 'Medicina Estética',
      doctor_rethus_number: '12345',
      doctor_professional_seal: 'SEAL-001',
      medical_record_id: 51,
      procedure_description: 'Rellenos',
      risks: '',
      notes: '',
      signed_by_name: '',
      signed_at: null,
      signature_image: '',
      created_at: '2024-01-16T14:00:00Z',
    },
    {
      id: 3,
      patient_id: 103,
      patient_name: 'Ana García',
      doctor_id: 5,
      doctor_name: 'Dra. Carolina Martínez',
      doctor_profession: 'Médico',
      doctor_specialty: 'Medicina Estética',
      doctor_rethus_number: '12345',
      doctor_professional_seal: 'SEAL-001',
      medical_record_id: 52,
      procedure_description: 'Limpieza facial',
      risks: '',
      notes: '',
      signed_by_name: 'Ana García',
      signed_at: '2024-01-17T11:00:00Z',
      signature_image: 'data:image/png;base64,def456',
      created_at: '2024-01-17T10:30:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/')) {
        return {
          ok: true,
          json: async () => ({ consents: mockConsents }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
  });

  // Test 1: Lista con filtro Firmados muestra solo firmados sin botones CRUD
  it('renderiza lista con filtro Firmados mostrando solo firmados sin botones CRUD', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    // Esperar a que carguen los consentimientos
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que se muestran todos inicialmente
    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.getByText('Ana García')).toBeInTheDocument();

    // Click en filtro "Firmados"
    const firmadosButton = screen.getByText('Firmados');
    fireEvent.click(firmadosButton);

    // Verificar que Juan Pérez (pendiente) ya no aparece
    await waitFor(() => {
      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });

    // Verificar que los firmados sí aparecen
    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('Ana García')).toBeInTheDocument();

    // Verificar que NO hay botones de CRUD
    expect(screen.queryByText(/Nuevo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Editar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Eliminar/i)).not.toBeInTheDocument();
  });

  // Test 2: Lista con filtro Pendientes muestra solo pendientes sin botones CRUD
  it('renderiza lista con filtro Pendientes mostrando solo pendientes sin botones CRUD', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    // Esperar a que carguen
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Click en filtro "Pendientes"
    const pendientesButton = screen.getByText('Pendientes');
    fireEvent.click(pendientesButton);

    // Verificar que solo Juan Pérez (pendiente) aparece
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    // Verificar que los firmados no aparecen
    expect(screen.queryByText('María López')).not.toBeInTheDocument();
    expect(screen.queryByText('Ana García')).not.toBeInTheDocument();

    // Verificar badge Pendiente
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    // Verificar que NO hay botones de CRUD
    expect(screen.queryByText(/Nuevo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Editar/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Eliminar/i)).not.toBeInTheDocument();
  });

  // Test 3: Click en registro es clickeable para navegar a detalle (firmado)
  it('registro firmado es clickeable para abrir detalle', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    // Esperar a que carguen
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que el registro firmado existe y tiene el badge
    const mariaButton = screen.getByText('María López').closest('button');
    expect(mariaButton).toBeInTheDocument();
    
    // Verificar badge Firmado
    expect(screen.getAllByText(/Firmado/i).length).toBeGreaterThan(0);

    // Simular clic - no debe lanzar errores
    if (mariaButton) {
      expect(() => fireEvent.click(mariaButton)).not.toThrow();
    }
  });

  // Test 4: Click en registro es clickeable para navegar a detalle (pendiente)
  it('registro pendiente es clickeable para abrir detalle', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    // Esperar a que carguen
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    // Verificar que el registro pendiente existe
    const juanButton = screen.getByText('Juan Pérez').closest('button');
    expect(juanButton).toBeInTheDocument();
    
    // Verificar badge Pendiente
    expect(screen.getByText('Pendiente')).toBeInTheDocument();

    // Simular clic - no debe lanzar errores
    if (juanButton) {
      expect(() => fireEvent.click(juanButton)).not.toThrow();
    }
  });
});
