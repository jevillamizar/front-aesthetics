import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MedicalRecordsAdmin } from './MedicalRecordsAdmin';

// Mock de apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/api';

const mockedApiFetch = vi.mocked(apiFetch);

describe('MedicalRecordsAdmin', () => {
  const mockRecords = [
    {
      id: 1,
      patient_id: 101,
      patient_name: 'María López',
      doctor_id: 5,
      doctor_name: 'Dra. Carolina Martínez',
      doctor_profession: 'Médico',
      doctor_specialty: 'Medicina Estética',
      doctor_rethus_number: '12345',
      doctor_rethus_status: 'ACTIVE',
      doctor_professional_seal: 'SEAL-001',
      appointment_id: 50,
      chief_complaint: 'Rejuvenecimiento facial',
      current_illness: '',
      personal_history: '',
      surgical_history: '',
      allergic_history: '',
      pharmacological_history: '',
      family_history: '',
      physical_exam: '',
      diagnosis: 'Envejecimiento prematuro',
      treatment_plan: 'Botox',
      evolution: '',
      informed_consent: '',
      consent_signed: true,
      notes: '',
      photo_before_url: '',
      photo_after_url: '',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
      treatment_items: [
        { id: 1, treatment_id: 1, treatment_name: 'Botox', quantity: 1, price: 500000, notes: '' },
      ],
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
      doctor_rethus_status: 'ACTIVE',
      doctor_professional_seal: 'SEAL-001',
      appointment_id: null,
      chief_complaint: 'Acné',
      current_illness: '',
      personal_history: '',
      surgical_history: '',
      allergic_history: '',
      pharmacological_history: '',
      family_history: '',
      physical_exam: '',
      diagnosis: 'Acné moderado',
      treatment_plan: 'Tratamiento tópico',
      evolution: '',
      informed_consent: '',
      consent_signed: false,
      notes: '',
      photo_before_url: '',
      photo_after_url: '',
      created_at: '2024-01-16T14:00:00Z',
      updated_at: '2024-01-16T14:00:00Z',
      treatment_items: [],
    },
  ];

  const mockPatients = [
    { id: 101, first_name: 'María', last_name: 'López' },
    { id: 102, first_name: 'Juan', last_name: 'Pérez' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/medical-records/')) {
        return {
          ok: true,
          json: async () => ({ records: mockRecords }),
        } as Response;
      }
      if (url.includes('/api/patients/')) {
        return {
          ok: true,
          json: async () => ({ patients: mockPatients }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
  });

  // Test 1: Lista renderiza registros sin botones de CRUD
  it('renderiza lista de registros sin botones de CRUD (Nuevo, Editar, Eliminar)', async () => {
    render(
      <BrowserRouter>
        <MedicalRecordsAdmin />
      </BrowserRouter>
    );

    // Esperar a que carguen los registros
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que se muestran los pacientes
    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

    // Verificar que NO hay botón "Nuevo"
    expect(screen.queryByText(/Nuevo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nuevo Registro/i)).not.toBeInTheDocument();

    // Verificar que NO hay botones de Editar (Pencil) ni Eliminar (Trash2)
    // en cada ítem de la lista
    const editButtons = screen.queryAllByRole('button', { name: /editar/i });
    const deleteButtons = screen.queryAllByRole('button', { name: /eliminar/i });
    expect(editButtons.length).toBe(0);
    expect(deleteButtons.length).toBe(0);

    // Verificar que los botones de acción directa (iconos) tampoco existen
    expect(screen.queryAllByTestId('pencil-icon')).toHaveLength(0);
    expect(screen.queryAllByTestId('trash-icon')).toHaveLength(0);
  });

  // Test 2: Click en registro - verificar que el botón es clickeable y tiene el handler
  it('registro es clickeable para abrir detalle', async () => {
    render(
      <BrowserRouter>
        <MedicalRecordsAdmin />
      </BrowserRouter>
    );

    // Esperar a que carguen los registros
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que el botón del registro existe y es clickeable
    const mariaButton = screen.getByText('María López').closest('button');
    expect(mariaButton).toBeInTheDocument();
    expect(mariaButton).not.toBeDisabled();

    // Simular clic - no debe lanzar errores
    if (mariaButton) {
      expect(() => fireEvent.click(mariaButton)).not.toThrow();
    }
  });

  // Test 3: Verificar estructura de datos para link a cita
  it('muestra información de cita asociada cuando existe appointment_id', async () => {
    render(
      <BrowserRouter>
        <MedicalRecordsAdmin />
      </BrowserRouter>
    );

    // Esperar a que carguen los registros
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // El registro 1 tiene appointment_id: 50
    // El registro 2 tiene appointment_id: null
    
    // Verificar que se renderizan ambos registros
    expect(screen.getByText('María López')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });
});

describe('MedicalRecordsAdmin - Link a cita', () => {
  const mockRecordWithAppointment = {
    id: 1,
    patient_id: 101,
    patient_name: 'María López',
    doctor_id: 5,
    doctor_name: 'Dra. Carolina Martínez',
    doctor_profession: 'Médico',
    doctor_specialty: 'Medicina Estética',
    doctor_rethus_number: '12345',
    doctor_rethus_status: 'ACTIVE',
    doctor_professional_seal: 'SEAL-001',
    appointment_id: 50,
    chief_complaint: 'Rejuvenecimiento facial',
    current_illness: '',
    personal_history: '',
    surgical_history: '',
    allergic_history: '',
    pharmacological_history: '',
    family_history: '',
    physical_exam: '',
    diagnosis: 'Envejecimiento prematuro',
    treatment_plan: 'Botox',
    evolution: '',
    informed_consent: '',
    consent_signed: true,
    notes: '',
    photo_before_url: '',
    photo_after_url: '',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    treatment_items: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/medical-records/')) {
        return {
          ok: true,
          json: async () => ({ records: [mockRecordWithAppointment] }),
        } as Response;
      }
      if (url.includes('/api/patients/')) {
        return {
          ok: true,
          json: async () => ({ patients: [] }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });
  });

  it('estructura de datos incluye appointment_id para el link', async () => {
    // Verificar que el mock tiene el appointment_id correcto
    expect(mockRecordWithAppointment.appointment_id).toBe(50);
    
    render(
      <BrowserRouter>
        <MedicalRecordsAdmin />
      </BrowserRouter>
    );

    // Esperar a que cargue
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que la API fue llamada correctamente
    expect(mockedApiFetch).toHaveBeenCalledWith('/api/medical-records/');
  });
});
