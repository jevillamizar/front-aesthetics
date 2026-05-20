import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock clinicConfig
const mockConfig = { enable_medical_history: true, enable_consent: true };
vi.mock('../lib/clinicConfig', () => ({
  useClinicConfig: () => ({ config: mockConfig, loading: false, refresh: vi.fn() }),
}));

// Mock apiFetch
vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

// Mock NewAppointmentModal
vi.mock('./NewAppointmentModal', () => ({
  NewAppointmentModal: () => null,
}));

import { apiFetch } from '../lib/api';
import { AtenderModal } from './AtenderModal';
const mockApiFetch = vi.mocked(apiFetch);

const baseAppt = {
  id: 1, status: 'PENDING', appointment_type: 'TRATAMIENTO',
  patient: { id: 1, first_name: 'Ana', last_name: 'Test', phone: '', email: '' },
  treatment_name: 'Botox', treatment_price: 100000,
  starts_at: '2025-06-01T10:00:00Z', ends_at: '2025-06-01T11:00:00Z',
  doctor_name: 'Dra. Test', payment: null,
  treatment_requires_consent: true,
};

describe('ProcedimientoPendientePanel conditional flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Atender → Historia Clínica button when HC is ON', async () => {
    mockConfig.enable_medical_history = true;
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ appointment: baseAppt }),
    } as unknown as Response);

    render(<AtenderModal appointmentId={1} onClose={vi.fn()} onDone={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Atender → Historia Clínica/i)).toBeInTheDocument();
    });
  });

  it('shows Marcar como Atendido button when HC is OFF', async () => {
    mockConfig.enable_medical_history = false;
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ appointment: baseAppt }),
    } as unknown as Response);

    render(<AtenderModal appointmentId={1} onClose={vi.fn()} onDone={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Marcar como Atendido/i)).toBeInTheDocument();
    });
  });

  it('does NOT render consent section', async () => {
    mockConfig.enable_medical_history = true;
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ appointment: baseAppt }),
    } as unknown as Response);

    render(<AtenderModal appointmentId={1} onClose={vi.fn()} onDone={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Atender → Historia Clínica/)).toBeInTheDocument();
    });
    // No debe haber sección de "Consentimiento" ni campo "Firma"
    expect(screen.queryByText('Firma del paciente')).not.toBeInTheDocument();
    expect(screen.queryByText('Consentimiento Informado')).not.toBeInTheDocument();
  });

  it('PATCH COMPLETED directly when HC is OFF', async () => {
    mockConfig.enable_medical_history = false;
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ appointment: baseAppt }) } as unknown as Response) // load
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as unknown as Response) // payment
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ appointment: { ...baseAppt, status: 'COMPLETED' } }) } as unknown as Response); // PATCH

    const onDone = vi.fn();
    const onClose = vi.fn();
    render(<AtenderModal appointmentId={1} onClose={onClose} onDone={onDone} />);
    await waitFor(() => {
      expect(screen.getByText(/Marcar como Atendido/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Marcar como Atendido/));
    await waitFor(() => {
      expect(onDone).toHaveBeenCalled();
    });
    // Verificar que se hizo PATCH con status COMPLETED
    const patchCall = mockApiFetch.mock.calls.find(c =>
      c[0].includes('/api/appointments/') && c[1]?.body?.toString().includes('COMPLETED'),
    );
    expect(patchCall).toBeDefined();
  });

  it('navigates to /complete when HC is ON', async () => {
    mockConfig.enable_medical_history = true;
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ appointment: baseAppt }) } as unknown as Response) // load
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) } as unknown as Response) // payment
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ appointment: { ...baseAppt, status: 'IN_PROGRESS' } }) } as unknown as Response); // PATCH IN_PROGRESS

    const onClose = vi.fn();
    render(<AtenderModal appointmentId={1} onClose={onClose} onDone={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/Atender → Historia Clínica/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Atender → Historia Clínica/));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/appointments/1/complete');
    });
  });
});
