import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock('../../lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

// Mock NewAppointmentModal
vi.mock('../../components/NewAppointmentModal', () => ({
  NewAppointmentModal: () => null,
}));

// Mock AtenderModal
vi.mock('../../components/AtenderModal', () => ({
  AtenderModal: () => null,
}));

import { apiFetch } from '../../lib/api';
import { Agenda } from './Agenda';

const mockApiFetch = vi.mocked(apiFetch);

describe('Agenda - Problema 2: Criterio de permisos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMocks = () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ appointments: [], doctors: [] }),
    } as Response);
  };

  it('Problema 2: botón "Nueva Cita" es visible para ADMIN', async () => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'ADMIN' } });

    render(<Agenda />);

    await waitFor(() => {
      expect(screen.getByText(/Nueva Cita/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('Problema 2: botón "Nueva Cita" NO es visible para DOCTOR', async () => {
    setupMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'DOCTOR' } });

    render(<Agenda />);

    await waitFor(() => {
      // El botón no debe estar en el DOM
      expect(screen.queryByText(/Nueva Cita/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('Problema 2: botón "Nueva Cita" NO es visible para rol no definido (ej: RECEPTIONIST)', async () => {
    // Este test garantiza que el criterio es whitelist (ADMIN), no blacklist (!DOCTOR)
    setupMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'RECEPTIONIST' } });

    render(<Agenda />);

    await waitFor(() => {
      expect(screen.queryByText(/Nueva Cita/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
