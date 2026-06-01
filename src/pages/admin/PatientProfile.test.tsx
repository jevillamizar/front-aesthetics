import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../../lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock react-router-dom
const mockUseParams = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => vi.fn(),
}));

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

// Mock PatientModal
vi.mock('../../components/PatientModal', () => ({
  PatientModal: () => null,
}));

// Mock NewAppointmentModal
vi.mock('../../components/NewAppointmentModal', () => ({
  NewAppointmentModal: () => null,
}));

import { apiFetch } from '../../lib/api';
import { PatientProfile } from './PatientProfile';

const mockApiFetch = vi.mocked(apiFetch);

describe('PatientProfile - Problema 4: Tests para punto de entrada de agendamiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({ id: '123' });
  });

  const setupMocks = (patientData: Record<string, unknown> | null = null) => {
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes('/api/patients/123/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            patient: patientData || {
              id: 123,
              first_name: 'María',
              last_name: 'López',
              email: 'maria@test.com',
              phone: '3001234567',
            },
          }),
        } as Response);
      }
      if (url.includes('/api/medical-records/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ records: [] }),
        } as Response);
      }
      if (url.includes('/api/appointments/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ appointments: [] }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });
  };

  it('Problema 4: botón "Agendar Cita" es visible para ADMIN', async () => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });

    render(<PatientProfile />);

    await waitFor(() => {
      expect(screen.getByText(/Agendar Cita/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('Problema 4: botón "Agendar Cita" NO es visible para DOCTOR', async () => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'DOCTOR' } });

    render(<PatientProfile />);

    // Esperar a que cargue el perfil
    await waitFor(() => {
      expect(screen.getByText(/María López/i)).toBeInTheDocument();
    }, { timeout: 3000 });

    // El botón NO debe estar
    expect(screen.queryByText(/Agendar Cita/i)).not.toBeInTheDocument();
  });

  it('Problema 4: botón "Agendar Cita" NO es visible cuando patient es null', async () => {
    setupMocks(null); // Paciente no cargado
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });

    render(<PatientProfile />);

    // Esperar a que termine de cargar (mostrará mensaje de no encontrado o similar)
    await waitFor(() => {
      expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // El botón NO debe estar visible si no hay paciente
    expect(screen.queryByText(/Agendar Cita/i)).not.toBeInTheDocument();
  });
});
