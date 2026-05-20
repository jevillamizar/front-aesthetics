import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClinicConfigProvider, useClinicConfig } from './clinicConfig';

// Mock apiFetch
vi.mock('./api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from './api';
const mockApiFetch = vi.mocked(apiFetch);

function TestConsumer() {
  const { config, loading } = useClinicConfig();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="hc">{String(config?.enable_medical_history ?? 'null')}</span>
      <span data-testid="consent">{String(config?.enable_consent ?? 'null')}</span>
    </div>
  );
}

describe('useClinicConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading=true initially', () => {
    mockApiFetch.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <ClinicConfigProvider>
        <TestConsumer />
      </ClinicConfigProvider>,
    );
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('fetches /api/clinic/ and exposes enable_medical_history', async () => {
    mockApiFetch.mockResolvedValue({
      json: () => Promise.resolve({ clinic: { enable_medical_history: false, enable_consent: true } }),
    } as Response);

    render(
      <ClinicConfigProvider>
        <TestConsumer />
      </ClinicConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('hc').textContent).toBe('false');
    expect(screen.getByTestId('consent').textContent).toBe('true');
    expect(mockApiFetch).toHaveBeenCalledWith('/api/clinic/');
  });

  it('falls back to defaults on fetch error', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'));

    render(
      <ClinicConfigProvider>
        <TestConsumer />
      </ClinicConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    // Defaults: enable_medical_history=true, enable_consent=true
    expect(screen.getByTestId('hc').textContent).toBe('true');
    expect(screen.getByTestId('consent').textContent).toBe('true');
  });
});
