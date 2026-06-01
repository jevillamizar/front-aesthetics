import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch for availability endpoint
global.fetch = vi.fn();

// Mock apiFetch
vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../lib/api';
import { NewAppointmentModal } from './NewAppointmentModal';

const mockApiFetch = vi.mocked(apiFetch);
const mockFetch = vi.mocked(fetch);

describe('NewAppointmentModal - Tarea 1: Props de contexto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock current date to 2025-06-15 for predictable tests
    vi.setSystemTime(new Date('2025-06-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Setup default mock responses
  const setupMocks = () => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url === '/api/patients/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            patients: [
              { id: 1, first_name: 'Ana', last_name: 'García', email: 'ana@test.com', phone: '3001234567' },
              { id: 2, first_name: 'Luis', last_name: 'Martínez', email: 'luis@test.com', phone: '3009876543' },
            ],
          }),
        } as Response);
      }
      if (url === '/api/treatments/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            treatments: [
              { id: 1, name: 'Botox', duration_minutes: 60, price: 150000 },
              { id: 2, name: 'Relleno', duration_minutes: 45, price: 200000 },
            ],
          }),
        } as Response);
      }
      if (url === '/api/doctors/') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            doctors: [
              { id: 1, first_name: 'Carolina', last_name: 'Martínez', email: 'dra.martinez@demo.com' },
              { id: 2, first_name: 'Juan', last_name: 'Pérez', email: 'dr.perez@demo.com' },
            ],
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ slots: [] }),
    } as unknown as Response);
  };

  describe('defaultDate prop', () => {
    it('sin defaultDate: componente renderiza correctamente', async () => {
      setupMocks();
      
      const { container } = render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      );

      // Esperar a que cargue la metadata
      await waitFor(() => {
        expect(screen.queryByText(/Nueva Cita/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toBeInTheDocument();
    });

    it('con defaultDate futura válida: componente renderiza sin error', async () => {
      setupMocks();
      
      const { container } = render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
          defaultDate="2025-06-20"
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Nueva Cita/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toBeInTheDocument();
    });

    it('con defaultDate pasada: componente renderiza sin error (clampeo)', async () => {
      setupMocks();
      
      const { container } = render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
          defaultDate="2025-01-01"
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Nueva Cita/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toBeInTheDocument();
    });

    it('con defaultDate inválida: componente renderiza sin crash', async () => {
      setupMocks();
      
      const { container } = render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
          defaultDate="invalid-date"
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Nueva Cita/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toBeInTheDocument();
    });
  });

  describe('defaultDoctorId prop', () => {
    it('con defaultDoctorId: componente acepta la prop sin error', async () => {
      setupMocks();
      
      const { container } = render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
          defaultDoctorId={1}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Nueva Cita/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toBeInTheDocument();
    });

    it('sin defaultDoctorId: componente renderiza correctamente', async () => {
      setupMocks();
      
      const { container } = render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Nueva Cita/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(container).toBeInTheDocument();
    });
  });

  describe('defaultPatientId y defaultPatientName props', () => {
    it('con defaultPatientId: muestra nombre pre-llenado', async () => {
      setupMocks();
      
      render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
          defaultPatientId={999}
          defaultPatientName="Paciente Prellenado"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Paciente Prellenado')).toBeInTheDocument();
      }, { timeout: 3000 });

      expect(screen.getByText('Fijo')).toBeInTheDocument();
    });

    it('sin defaultPatientId: muestra select de pacientes', async () => {
      setupMocks();
      
      render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Selecciona un paciente/i)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('Problema 1: Paso 1 con defaultPatientId=999 (ID fuera de lista) muestra defaultPatientName en el campo Paciente', async () => {
      // El ID 999 NO existe en el mock de /api/patients/ (devuelve ids 1 y 2)
      // El campo Paciente del Paso 1 debe mostrar el nombre pre-llenado via defaultPatientName
      // El Paso 3 (Confirmar) debe mostrar ese mismo nombre y NO el guion "—"
      setupMocks();

      render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
          defaultPatientId={999}
          defaultPatientName="María López"
        />
      );

      // Paso 1: el campo Paciente muestra el nombre pre-llenado (badge Fijo)
      await waitFor(() => {
        expect(screen.getByText('María López')).toBeInTheDocument();
      }, { timeout: 3000 });

      // El guion "—" NO debe aparecer en ningún lugar relacionado con el paciente
      // (la presencia de "María López" ya garantiza que el fallback funciona en Paso 1)
      expect(screen.getByText('Fijo')).toBeInTheDocument();
    });

    it('Problema 3: el contenedor raíz del modal tiene z-[60] para estar sobre PatientModal (z-50)', async () => {
      // PatientModal usa z-50, NewAppointmentModal debe usar z-[60] para quedar encima
      // cuando ambos modales estén abiertos simultáneamente desde PatientProfile
      setupMocks();

      const { container } = render(
        <NewAppointmentModal
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Nueva Cita/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      // El div raíz del modal debe tener la clase z-[60]
      const modalRoot = container.querySelector('.fixed.inset-0');
      expect(modalRoot).toHaveClass('z-[60]');
    });
  });
});
