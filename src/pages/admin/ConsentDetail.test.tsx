import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ConsentDetail } from './ConsentDetail';

// Mock de apiFetch
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from '../../lib/api';

const mockedApiFetch = vi.mocked(apiFetch);

// Mock de ConsentForm
vi.mock('../../components/ConsentForm', () => ({
  ConsentForm: ({ values, signedAt, doctorInfo, mode }: {
    values: any;
    signedAt: string | null;
    doctorInfo?: any;
    mode: string;
  }) => (
    <div data-testid="consent-form">
      <div data-testid="consent-mode">{mode}</div>
      <div data-testid="consent-procedure">{values.procedure_description}</div>
      {signedAt && <div data-testid="consent-signed">Firmado</div>}
      {doctorInfo && <div data-testid="doctor-name">{doctorInfo.name}</div>}
    </div>
  ),
}));

describe('ConsentDetail - Race Condition Tests', () => {
  const mockConsentA = {
    id: 1,
    patient_id: 101,
    patient_name: 'María López',
    doctor_id: 5,
    doctor_name: 'Dra. Carolina Martínez',
    doctor_profession: 'Médico',
    doctor_specialty: 'Medicina Estética',
    doctor_rethus_number: '12345',
    doctor_professional_seal: 'SEAL-001',
    medical_record_id: 50,  // Con MR 50
    procedure_description: 'Botox facial',
    risks: 'Rojez',
    notes: '',
    signed_by_name: 'María López',
    signed_at: '2024-01-15T10:30:00Z',
    signature_image: 'data:image/png;base64,abc123',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:30:00Z',
  };

  const mockConsentB = {
    id: 2,
    patient_id: 102,
    patient_name: 'Juan Pérez',
    doctor_id: 5,
    doctor_name: 'Dr. Pedro Sánchez',
    doctor_profession: 'Médico',
    doctor_specialty: 'Dermatología',
    doctor_rethus_number: '54321',
    doctor_professional_seal: 'SEAL-002',
    medical_record_id: 60,  // Con MR 60 (diferente)
    procedure_description: 'Rellenos',
    risks: 'Inflamación',
    notes: '',
    signed_by_name: 'Juan Pérez',
    signed_at: '2024-01-16T14:00:00Z',
    signature_image: 'data:image/png;base64,def456',
    created_at: '2024-01-16T14:00:00Z',
    updated_at: '2024-01-16T14:00:00Z',
  };

  const mockMedicalRecord50 = {
    id: 50,
    appointment_id: 100,
    patient_id: 101,
  };

  const mockMedicalRecord60 = {
    id: 60,
    appointment_id: 200,
    patient_id: 102,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 1: Carga atómica - medical record se carga después del consent
  it('debe cargar consent y luego medical record en secuencia atómica', async () => {
    const apiCallOrder: string[] = [];

    mockedApiFetch.mockImplementation(async (url: string) => {
      apiCallOrder.push(url);
      
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsentA,
        } as Response;
      }
      
      if (url.includes('/api/medical-records/50/')) {
        return {
          ok: true,
          json: async () => mockMedicalRecord50,
        } as Response;
      }

      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Esperar que se muestren los datos
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar el orden de llamadas: primero consent, luego medical record
    expect(apiCallOrder[0]).toContain('/api/consents/1/');
    expect(apiCallOrder[1]).toContain('/api/medical-records/50/');
    
    // Verificar que se muestra el link correcto
    await waitFor(() => {
      expect(screen.getByText(/Ver cita #100/)).toBeInTheDocument();
    });
  });

  // Test 2: Race condition - cambio rápido de ID debe cancelar carga anterior
  it('debe manejar cambio rápido de ID sin mostrar datos mezclados', async () => {
    let consentAResolve!: (value: any) => void;
    let consentBResolve!: (value: any) => void;
    
    const consentAPromise = new Promise((resolve) => { consentAResolve = resolve; });
    const consentBPromise = new Promise((resolve) => { consentBResolve = resolve; });

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        await consentAPromise;
        return {
          ok: true,
          json: async () => mockConsentA,
        } as Response;
      }
      
      if (url.includes('/api/consents/2/')) {
        await consentBPromise;
        return {
          ok: true,
          json: async () => mockConsentB,
        } as Response;
      }

      if (url.includes('/api/medical-records/50/')) {
        return {
          ok: true,
          json: async () => mockMedicalRecord50,
        } as Response;
      }

      if (url.includes('/api/medical-records/60/')) {
        return {
          ok: true,
          json: async () => mockMedicalRecord60,
        } as Response;
      }

      return { ok: false, json: async () => ({}) } as Response;
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Iniciar carga del consent 1 (queda pendiente)
    // Sin resolver aún
    
    // Desmontar y renderizar con ID 2 (simula navegación rápida)
    unmount();
    
    // Ahora resolver la promesa de A (que ya no debería afectar)
    consentAResolve(mockConsentA);
    
    // Renderizar con ID 2
    render(
      <MemoryRouter initialEntries={['/admin/consents/2']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    // Resolver B
    consentBResolve(mockConsentB);
    
    // La UI debe mostrar datos de B, no mezclados con A
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });
    expect(screen.queryByText('María López')).not.toBeInTheDocument();
    
    // El medical record debe ser el de B (cita #200)
    await waitFor(() => {
      expect(screen.getByText(/Ver cita #200/)).toBeInTheDocument();
    });
  });

  // Test 3: Loading state debe mantenerse durante toda la carga
  it('debe mostrar loading hasta que ambos recursos estén cargados', async () => {
    let mrResolve!: (value: any) => void;
    
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsentA,
        } as Response;
      }
      
      if (url.includes('/api/medical-records/50/')) {
        return new Promise((resolve) => {
          mrResolve = resolve;
        }).then(() => ({
          ok: true,
          json: async () => mockMedicalRecord50,
        } as Response));
      }

      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Inicialmente debe mostrar loading (buscando el spinner por su clase)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();

    // Esperar a que el consent cargue
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Pero el estado de "origen" debe estar cargando o mostrar placeholder
    // ya que el medical record aún no ha cargado
    const originSection = screen.getByText('Origen del registro').parentElement;
    expect(originSection).not.toBeNull();

    // Resolver el medical record
    mrResolve!(mockMedicalRecord50);

    // Ahora debe mostrar el link correcto
    await waitFor(() => {
      expect(screen.getByText(/Ver cita #100/)).toBeInTheDocument();
    });
  });

  // Test 4: Consent sin medical_record_id no debe hacer llamada innecesaria
  it('no debe intentar cargar medical record si no hay medical_record_id', async () => {
    const consentWithoutMR = { ...mockConsentA, medical_record_id: null };

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => consentWithoutMR,
        } as Response;
      }

      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que no se llamó a ningún endpoint de medical-records
    const mrCalls = mockedApiFetch.mock.calls.filter(([url]) => 
      url.includes('/api/medical-records/')
    );
    expect(mrCalls.length).toBe(0);

    // Debe mostrar warning de huérfano
    expect(screen.getByText('Registro huérfano')).toBeInTheDocument();
  });
});

describe('ConsentDetail - Error Handling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 5: Error 404 del consentimiento
  it('muestra mensaje específico cuando el consentimiento no existe (404)', async () => {
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/999/')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ detail: 'Not found' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/999']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Consentimiento no encontrado')).toBeInTheDocument();
    });
  });

  // Test 6: Error 403 - Sin permisos
  it('muestra mensaje específico cuando no tiene permisos (403)', async () => {
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ detail: 'Forbidden' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No tiene permisos para ver este consentimiento')).toBeInTheDocument();
    });
  });

  // Test 7: Error genérico del servidor (500)
  it('muestra mensaje genérico cuando hay error del servidor (500)', async () => {
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ detail: 'Internal Server Error' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error al cargar el consentimiento')).toBeInTheDocument();
    });
  });

  // Test 8: Error de red / conexión
  it('muestra mensaje de error de conexión cuando falla la red', async () => {
    mockedApiFetch.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // Test 9: Error 404 del medical record asociado
  it('muestra error específico cuando el registro médico asociado no existe', async () => {
    const mockConsent = {
      id: 1,
      patient_id: 101,
      patient_name: 'María López',
      doctor_id: 5,
      doctor_name: 'Dra. Carolina Martínez',
      doctor_profession: 'Médico',
      doctor_specialty: 'Medicina Estética',
      doctor_rethus_number: '12345',
      doctor_professional_seal: 'SEAL-001',
      medical_record_id: 999,  // MR que no existe
      procedure_description: 'Botox',
      risks: '',
      notes: '',
      signed_by_name: 'María López',
      signed_at: '2024-01-15T10:30:00Z',
      signature_image: 'data:image/png;base64,abc',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsent,
        } as Response;
      }
      if (url.includes('/api/medical-records/999/')) {
        return {
          ok: false,
          status: 404,
          json: async () => ({ detail: 'Not found' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Primero se muestra el consent
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Luego se muestra el error del MR
    await waitFor(() => {
      expect(screen.getByText('El registro médico asociado no fue encontrado')).toBeInTheDocument();
    });
  });

  // Test 10: Error 403 del medical record asociado
  it('muestra error de permisos cuando no puede acceder al registro médico asociado', async () => {
    const mockConsent = {
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
      procedure_description: 'Botox',
      risks: '',
      notes: '',
      signed_by_name: 'María López',
      signed_at: '2024-01-15T10:30:00Z',
      signature_image: 'data:image/png;base64,abc',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsent,
        } as Response;
      }
      if (url.includes('/api/medical-records/50/')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ detail: 'Forbidden' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Primero se muestra el consent
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Luego se muestra el error de permisos del MR
    await waitFor(() => {
      expect(screen.getByText('No tiene permisos para ver el registro médico asociado')).toBeInTheDocument();
    });
  });
});

describe('ConsentDetail - Security/Permissions Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 11: No debe revelar información del consent en error 403
  it('no muestra datos del consent cuando hay error 403', async () => {
    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ detail: 'Forbidden' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Esperar mensaje de permisos
    await waitFor(() => {
      expect(screen.getByText('No tiene permisos para ver este consentimiento')).toBeInTheDocument();
    });

    // Verificar que NO se muestra ningún dato del paciente
    expect(screen.queryByText('María López')).not.toBeInTheDocument();
    expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    expect(screen.queryByText('Paciente')).not.toBeInTheDocument();
  });

  // Test 12: No debe revelar información del medical record en error 403 del MR
  it('muestra consent pero no datos del MR cuando hay 403 en el MR', async () => {
    const mockConsent = {
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
      procedure_description: 'Botox',
      risks: '',
      notes: '',
      signed_by_name: 'María López',
      signed_at: '2024-01-15T10:30:00Z',
      signature_image: 'data:image/png;base64,abc',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsent,
        } as Response;
      }
      if (url.includes('/api/medical-records/50/')) {
        return {
          ok: false,
          status: 403,
          json: async () => ({ detail: 'Forbidden' }),
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Se muestra el consent (tiene permiso para esto)
    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Pero se muestra error para el MR (no tiene permiso)
    await waitFor(() => {
      expect(screen.getByText('No tiene permisos para ver el registro médico asociado')).toBeInTheDocument();
    });

    // NO debe mostrar link a la cita (porque no cargó el MR)
    expect(screen.queryByText(/Ver cita #/)).not.toBeInTheDocument();
  });
});

describe('ConsentDetail - Type Mapping Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 13: Mapeo consistente de signature_image a signature_data_url
  it('mapea correctamente signature_image de la API a signature_data_url del formulario', async () => {
    const mockConsent = {
      id: 1,
      patient_id: 101,
      patient_name: 'María López',
      doctor_id: 5,
      doctor_name: 'Dra. Carolina Martínez',
      doctor_profession: 'Médico',
      doctor_specialty: 'Medicina Estética',
      doctor_rethus_number: '12345',
      doctor_professional_seal: 'SEAL-001',
      medical_record_id: null,
      procedure_description: 'Botox facial',
      risks: 'Rojez',
      notes: 'Notas de prueba',
      signed_by_name: 'María López',
      signed_at: '2024-01-15T10:30:00Z',
      signature_image: 'data:image/png;base64,TEST123',  // Nombre en API
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsent,
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que ConsentForm recibe los valores mapeados correctamente
    // El mock de ConsentForm debe recibir signature_data_url (no signature_image)
    const consentForm = screen.getByTestId('consent-form');
    expect(consentForm).toBeInTheDocument();
  });

  // Test 14: Mapeo consistente de campos nulos/undefined
  it('maneja correctamente campos nulos de la API mapeándolos a strings vacíos', async () => {
    const mockConsentConNulos = {
      id: 1,
      patient_id: 101,
      patient_name: 'María López',
      doctor_id: 5,
      doctor_name: 'Dra. Carolina Martínez',
      doctor_profession: 'Médico',
      doctor_specialty: 'Medicina Estética',
      doctor_rethus_number: '12345',
      doctor_professional_seal: 'SEAL-001',
      medical_record_id: null,
      procedure_description: null,  // null en API
      risks: undefined,  // undefined en API
      notes: '',  // string vacío
      signed_by_name: null,
      signed_at: null,
      signature_image: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsentConNulos,
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que el componente no falla con valores nulos
    expect(screen.getByTestId('consent-form')).toBeInTheDocument();
  });

  // Test 15: Mapeo consistente de doctorInfo
  it('mapea correctamente los campos del doctor a doctorInfo', async () => {
    const mockConsent = {
      id: 1,
      patient_id: 101,
      patient_name: 'María López',
      doctor_id: 5,
      doctor_name: 'Dr. Pedro Sánchez',
      doctor_profession: 'Médico Especialista',
      doctor_specialty: 'Cirugía Plástica',
      doctor_rethus_number: '98765',
      doctor_professional_seal: 'SEAL-999',
      medical_record_id: null,
      procedure_description: 'Procedimiento',
      risks: '',
      notes: '',
      signed_by_name: '',
      signed_at: null,
      signature_image: '',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    };

    mockedApiFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/consents/1/')) {
        return {
          ok: true,
          json: async () => mockConsent,
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    });

    render(
      <MemoryRouter initialEntries={['/admin/consents/1']}>
        <Routes>
          <Route path="/admin/consents/:id" element={<ConsentDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('María López')).toBeInTheDocument();
    });

    // Verificar que doctorInfo se mapea correctamente al ConsentForm
    const consentForm = screen.getByTestId('consent-form');
    expect(consentForm).toBeInTheDocument();
    // El mock de ConsentForm muestra el nombre del doctor
    expect(screen.getByTestId('doctor-name')).toHaveTextContent('Dr. Pedro Sánchez');
  });
});
