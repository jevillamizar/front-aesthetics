import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConsentsAdmin } from './ConsentsAdmin';

// Mock de apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/api';

const mockedApiFetch = vi.mocked(apiFetch);

describe('ConsentsAdmin - Keyboard Navigation', () => {
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
      risks: '',
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

  // Test: Navegación por teclado - foco en botones de filtro
  it('permite navegación por teclado en botones de filtro', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Obtener botones de filtro
    const todosButton = screen.getByText('Todos');
    const firmadosButton = screen.getByText('Firmados');
    const pendientesButton = screen.getByText('Pendientes');

    // Verificar que son focusables
    todosButton.focus();
    expect(document.activeElement).toBe(todosButton);

    // Simular navegación con Tab
    firmadosButton.focus();
    expect(document.activeElement).toBe(firmadosButton);

    pendientesButton.focus();
    expect(document.activeElement).toBe(pendientesButton);
  });

  // Test: Botones de filtro tienen aria-pressed
  it('botones de filtro tienen aria-pressed indicando estado activo', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    const todosButton = screen.getByText('Todos');
    const firmadosButton = screen.getByText('Firmados');
    const pendientesButton = screen.getByText('Pendientes');

    // Verificar aria-pressed
    expect(todosButton).toHaveAttribute('aria-pressed', 'true');
    expect(firmadosButton).toHaveAttribute('aria-pressed', 'false');
    expect(pendientesButton).toHaveAttribute('aria-pressed', 'false');

    // Cambiar filtro
    fireEvent.click(firmadosButton);

    expect(todosButton).toHaveAttribute('aria-pressed', 'false');
    expect(firmadosButton).toHaveAttribute('aria-pressed', 'true');
    expect(pendientesButton).toHaveAttribute('aria-pressed', 'false');
  });

  // Test: Items de lista son navegables por teclado
  it('items de la lista son navegables por teclado', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Obtener los botones de los registros
    const buttons = screen.getAllByRole('button').filter(
      btn => btn.getAttribute('aria-label')?.includes('Consentimiento de')
    );

    // Verificar que hay 3 items navegables
    expect(buttons.length).toBe(3);

    // Verificar que cada uno tiene aria-label descriptivo
    buttons.forEach((btn, index) => {
      expect(btn).toHaveAttribute('aria-label');
      expect(btn.getAttribute('aria-label')).toContain(mockConsents[index].patient_name);
    });
  });

  // Test: Navegación con flechas no está implementada pero los elementos son focusables
  it('todos los elementos interactivos son focusables', async () => {
    render(
      <BrowserRouter>
        <ConsentsAdmin />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que hay elementos con role="list"
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();

    // Verificar que los items tienen role="listitem"
    const listItems = screen.getAllByRole('listitem');
    expect(listItems.length).toBe(3);

    // Cada item debe contener un botón
    listItems.forEach(item => {
      const button = item.querySelector('button');
      expect(button).toBeInTheDocument();
    });
  });
});
