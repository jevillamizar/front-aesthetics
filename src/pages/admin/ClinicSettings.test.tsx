import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClinicSettings } from './ClinicSettings';

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/api';
const mockApiFetch = vi.mocked(apiFetch);

function mockClinicResponse(overrides = {}) {
  return {
    ok: true,
    json: () => Promise.resolve({
      clinic: {
        name: 'Test Clinic', phone: '', address: '', city: '', slogan: '',
        instagram_url: '', facebook_url: '',
        enable_medical_history: true, enable_consent: true,
        ...overrides,
      },
    }),
  } as unknown as Response;
}

describe('ClinicSettings Funcionalidades', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue(mockClinicResponse());
  });

  it('renders Historia Clínica toggle', async () => {
    render(<ClinicSettings />);
    await waitFor(() => {
      expect(screen.getByText('Historia Clínica')).toBeInTheDocument();
    });
  });

  it('renders Consentimiento toggle disabled when HC is OFF', async () => {
    mockApiFetch.mockResolvedValue(mockClinicResponse({ enable_medical_history: false, enable_consent: false }));
    render(<ClinicSettings />);
    await waitFor(() => {
      expect(screen.getByText('Consentimiento Informado')).toBeInTheDocument();
    });
    // El wrapper del toggle de consent tiene clase opacity-40 cuando HC está OFF
    const consentLabel = screen.getByText('Consentimiento Informado');
    // Buscar el ancestro que tiene la clase opacity-40
    const wrapper = consentLabel.closest('.opacity-40');
    expect(wrapper).toBeInTheDocument();
  });

  it('forces consent to false when HC toggle is turned off', async () => {
    render(<ClinicSettings />);
    await waitFor(() => {
      expect(screen.getByText('Historia Clínica')).toBeInTheDocument();
    });
    // Verificar que inicialmente NO tiene opacity-40
    const consentLabel = screen.getByText('Consentimiento Informado');
    expect(consentLabel.closest('.opacity-40')).not.toBeInTheDocument();

    // HC toggle button — buscar el botón dentro del bloque de Historia Clínica
    const hcLabel = screen.getByText('Historia Clínica');
    const hcWrapper = hcLabel.closest('.flex.items-center');
    const hcToggle = hcWrapper?.querySelector('button');
    expect(hcToggle).toBeInTheDocument();

    // Al desactivar HC, consent se desactiva automáticamente
    fireEvent.click(hcToggle!);
    // Ahora el wrapper de consentimiento debería tener opacity-40
    expect(consentLabel.closest('.opacity-40')).toBeInTheDocument();
  });

  it('sends enable_medical_history in save request', async () => {
    mockApiFetch
      .mockResolvedValueOnce(mockClinicResponse()) // initial load
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ clinic: {} }) } as unknown as Response); // save

    render(<ClinicSettings />);
    await waitFor(() => {
      expect(screen.getByText('Historia Clínica')).toBeInTheDocument();
    });

    const saveBtn = screen.getByText('Guardar cambios');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
    });
    // La segunda llamada es el PUT con FormData que incluye enable_medical_history
    const saveCall = mockApiFetch.mock.calls[1];
    expect(saveCall[0]).toBe('/api/clinic/');
    const body = saveCall[1]?.body as FormData;
    expect(body.get('enable_medical_history')).toBe('true');
  });
});
