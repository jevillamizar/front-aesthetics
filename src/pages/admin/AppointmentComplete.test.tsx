import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockNavigate = vi.fn();

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

// Mock clinicConfig
let mockConfig = { enable_medical_history: true, enable_consent: true };
vi.mock('../../lib/clinicConfig', () => ({
  useClinicConfig: () => ({ config: mockConfig, loading: false, refresh: vi.fn() }),
}));

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
  getApiBase: () => '',
}));

// Mock SignatureCanvas (simplificado para tests)
vi.mock('../../components/SignatureCanvas', () => ({
  SignatureCanvas: ({ onSign, readOnly, existingDataUrl }: {
    onSign: (d: string) => void; onClear?: () => void; readOnly?: boolean; existingDataUrl?: string;
  }) => (
    <div data-testid="signature-canvas">
      {readOnly && existingDataUrl && <img src={existingDataUrl} alt="Firma" />}
      {!readOnly && <button onClick={() => onSign('data:image/png;base64,TESTFIRMA')}>Firmar</button>}
    </div>
  ),
}));

import { apiFetch } from '../../lib/api';
const mockApiFetch = vi.mocked(apiFetch);

// Importar componente después de mocks
import { AppointmentComplete } from './AppointmentComplete';

const baseAppt = {
  id: 1, status: 'IN_PROGRESS', starts_at: '2025-06-01T10:00:00Z', ends_at: '2025-06-01T11:00:00Z',
  notes: '', patient_id: 1, patient_name: 'Ana Test', patient_email: 'ana@test.com', patient_phone: '123',
  treatment_id: 1, treatment_name: 'Botox', treatment_price: 100000,
  treatment_requires_consent: true,
  doctor_id: 1, doctor_name: 'Dra. Martínez', doctor_email: 'doc@test.com',
  medical_record_id: 10,
};

const emptyRecord = {
  id: 10, chief_complaint: '', current_illness: '', personal_history: '',
  surgical_history: '', allergic_history: '', pharmacological_history: '',
  family_history: '', physical_exam: '', diagnosis: '', treatment_plan: '',
  evolution: '', informed_consent: '', notes: '', consent_signed: false,
  photo_before_url: '', photo_after_url: '',
};

function setupMocks(apptOverrides = {}, consentResponse: unknown = { consents: [] }) {
  const appt = { ...baseAppt, ...apptOverrides };
  mockApiFetch.mockImplementation((url: string) => {
    if (url.includes('/consent/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(consentResponse) } as Response);
    }
    if (url.includes('/api/appointments/1/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ appointment: appt }) } as Response);
    }
    if (url.includes('/api/medical-records/')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ record: emptyRecord }) } as Response);
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
  });
  return appt;
}

describe('AppointmentComplete consent section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = { enable_medical_history: true, enable_consent: true };
  });

  it('hides consent section when enable_consent=false', async () => {
    mockConfig.enable_consent = false;
    setupMocks({ treatment_requires_consent: true });

    render(<AppointmentComplete />);
    await waitFor(() => {
      expect(screen.getByText('Ana Test')).toBeInTheDocument();
    });
    expect(screen.queryByText('Consentimiento Informado')).not.toBeInTheDocument();
  });

  it('hides consent section when treatment.requires_consent=false', async () => {
    mockConfig.enable_consent = true;
    setupMocks({ treatment_requires_consent: false, treatment_id: 1 });

    render(<AppointmentComplete />);
    await waitFor(() => {
      expect(screen.getByText('Ana Test')).toBeInTheDocument();
    });
    expect(screen.queryByText('Consentimiento Informado')).not.toBeInTheDocument();
  });

  it('shows consent section when consent ON and treatment requires it', async () => {
    setupMocks({ treatment_requires_consent: true });

    render(<AppointmentComplete />);
    await waitFor(() => {
      expect(screen.getByText('Consentimiento Informado')).toBeInTheDocument();
    });
  });

  it('shows consent section when consent ON and no treatment', async () => {
    setupMocks({ treatment_id: null, treatment_requires_consent: null });

    render(<AppointmentComplete />);
    await waitFor(() => {
      expect(screen.getByText('Consentimiento Informado')).toBeInTheDocument();
    });
  });

  it('blocks save when signature is empty and consent is required', async () => {
    setupMocks({ treatment_requires_consent: true });

    render(<AppointmentComplete />);
    await waitFor(() => {
      expect(screen.getByText('Consentimiento Informado')).toBeInTheDocument();
    });

    // Esperar a que el formulario de MR se cargue (textareas rendereadas)
    let textareas: NodeListOf<HTMLTextAreaElement>;
    await waitFor(() => {
      textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(8);
    });
    // MR_FIELDS: diagnosis es el campo #8 (0-indexed)
    fireEvent.change(textareas![8], { target: { value: 'Test' } });

    // Intentar guardar sin firma — el botón es "Guardar y Completar Cita"
    const saveBtn = screen.getByText(/Guardar y Completar Cita/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Debe mostrar error porque falta la firma (signature_data_url está vacío)
      expect(screen.getByText(/firma.*obligatoria/i)).toBeInTheDocument();
    });
  });

  it('POSTs to /complete/ when signature present', async () => {
    setupMocks({ treatment_requires_consent: true });
    mockApiFetch.mockImplementation((url: string) => {
      if (url.includes('/consent/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ consents: [] }) } as Response);
      }
      if (url.includes('/api/appointments/1/complete')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ appointment: { ...baseAppt, status: 'COMPLETED' } }) } as Response);
      }
      if (url.includes('/api/appointments/1/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ appointment: baseAppt }) } as Response);
      }
      if (url.includes('/api/medical-records/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ record: emptyRecord }) } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(<AppointmentComplete />);
    await waitFor(() => {
      expect(screen.getByText('Consentimiento Informado')).toBeInTheDocument();
    });

    // Esperar a que el formulario de MR se cargue
    let textareas: NodeListOf<HTMLTextAreaElement>;
    await waitFor(() => {
      textareas = document.querySelectorAll('textarea');
      expect(textareas.length).toBeGreaterThan(8);
    });
    fireEvent.change(textareas![8], { target: { value: 'Test diagnóstico' } });

    // Firmar (mock del SignatureCanvas llama onSign)
    fireEvent.click(screen.getByText('Firmar'));

    // Guardar
    const saveBtn = screen.getByText(/Guardar y Completar Cita/i);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      const completeCall = mockApiFetch.mock.calls.find(c => c[0].includes('/complete'));
      expect(completeCall).toBeDefined();
    });
  });

  it('shows read-only signature image for COMPLETED appointments', async () => {
    const signedConsent = {
      consents: [{
        id: 99, signed_by_name: 'Ana Test', signature_image: 'data:image/png;base64,FIRMA',
        signed_at: '2025-06-01T12:00:00Z',
      }],
    };
    setupMocks({ status: 'COMPLETED', treatment_requires_consent: true }, signedConsent);

    render(<AppointmentComplete />);
    await waitFor(() => {
      expect(screen.getByText(/Firmado por: Ana Test/)).toBeInTheDocument();
    });
    // La firma debe mostrarse como imagen read-only
    const img = screen.getByAltText('Firma');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,FIRMA');
  });
});
