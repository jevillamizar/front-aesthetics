import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
  getApiBase: () => '',
}));

import { apiFetch } from '../../lib/api';
const mockApiFetch = vi.mocked(apiFetch);

// Import lazily after mocks
import { TreatmentsAdmin } from './TreatmentsAdmin';

const mockTreatments = [
  { id: 1, name: 'Botox', slug: 'botox', category: 'Facial', duration_minutes: 30, price: '100000', is_active: true, requires_consent: true, image_url: '', long_description: '' },
  { id: 2, name: 'Limpieza', slug: 'limpieza', category: 'Facial', duration_minutes: 45, price: '50000', is_active: true, requires_consent: false, image_url: '', long_description: '' },
];

describe('TreatmentsAdmin requires_consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApiFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ treatments: mockTreatments }),
    } as unknown as Response);
  });

  it('shows Consent badge in list for treatment with requires_consent=true', async () => {
    render(<TreatmentsAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Botox')).toBeInTheDocument();
    });
    // Botox tiene requires_consent=true → muestra badge
    expect(screen.getByText('Consent')).toBeInTheDocument();
  });

  it('renders requires_consent checkbox in modal form', async () => {
    render(<TreatmentsAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Botox')).toBeInTheDocument();
    });
    // Click en botón Editar del primer tratamiento (Botox)
    const editButtons = screen.getAllByTitle('Editar');
    fireEvent.click(editButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Requiere consentimiento informado')).toBeInTheDocument();
    });
  });

  it('submits requires_consent=true when checkbox is checked', async () => {
    mockApiFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ treatments: mockTreatments }) } as unknown as Response) // list
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ treatment: mockTreatments[0] }) } as unknown as Response); // save

    render(<TreatmentsAdmin />);
    await waitFor(() => {
      expect(screen.getByText('Botox')).toBeInTheDocument();
    });
    const editButtons = screen.getAllByTitle('Editar');
    fireEvent.click(editButtons[0]);
    await waitFor(() => {
      expect(screen.getByText('Requiere consentimiento informado')).toBeInTheDocument();
    });

    // El checkbox ya debe estar checked (requires_consent=true para Botox)
    const checkbox = screen.getByRole('checkbox', { name: /consentimiento/i });
    expect(checkbox).toBeChecked();
  });
});
