import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { fmt } from '../../lib/formatters';
import { ArrowLeft, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { ConsentForm } from '../../components/ConsentForm';

type Consent = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number | null;
  doctor_name: string;
  doctor_profession: string;
  doctor_specialty: string;
  doctor_rethus_number: string;
  doctor_professional_seal: string;
  medical_record_id: number | null;
  procedure_description: string;
  risks: string;
  notes: string;
  signed_by_name: string;
  signed_at: string | null;
  signature_image: string;
  created_at: string;
  updated_at: string;
};

type MedicalRecord = {
  id: number;
  appointment_id: number | null;
};

// Tipo para datos de Consent desde la API
export type ConsentApiResponse = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number | null;
  doctor_name: string;
  doctor_profession: string;
  doctor_specialty: string;
  doctor_rethus_number: string;
  doctor_professional_seal: string;
  medical_record_id: number | null;
  procedure_description: string | null;
  risks: string | null;
  notes: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  signature_image: string | null;
  created_at: string;
  updated_at: string;
};

// Tipo para datos esperados por ConsentForm
export type ConsentFormData = {
  procedure_description: string;
  risks: string;
  notes: string;
  signed_by_name: string;
  signature_data_url: string;
};

// Tipo para información del doctor
export type DoctorInfo = {
  name: string;
  profession: string;
  specialty: string;
  rethus_number: string;
  professional_seal: string;
};

/**
 * Mapper para convertir respuesta de API a formato de formulario
 * con validación de tipos y valores por defecto
 */
function mapConsentToFormValues(consent: ConsentApiResponse | null): ConsentFormData {
  if (!consent) {
    return {
      procedure_description: '',
      risks: '',
      notes: '',
      signed_by_name: '',
      signature_data_url: '',
    };
  }

  return {
    procedure_description: consent.procedure_description ?? '',
    risks: consent.risks ?? '',
    notes: consent.notes ?? '',
    signed_by_name: consent.signed_by_name ?? '',
    signature_data_url: consent.signature_image ?? '',
  };
}

/**
 * Mapper para extraer información del doctor de la respuesta de API
 */
function mapConsentToDoctorInfo(consent: ConsentApiResponse | null): DoctorInfo | undefined {
  if (!consent || !consent.doctor_id) {
    return undefined;
  }

  return {
    name: consent.doctor_name ?? '',
    profession: consent.doctor_profession ?? '',
    specialty: consent.doctor_specialty ?? '',
    rethus_number: consent.doctor_rethus_number ?? '',
    professional_seal: consent.doctor_professional_seal ?? '',
  };
}

export function ConsentDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<Consent | null>(null);
  const [medicalRecord, setMedicalRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMR, setLoadingMR] = useState(false);
  const [error, setError] = useState('');
  const [mrError, setMrError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Efecto de carga atómica: primero consent, luego medical record si aplica
  useEffect(() => {
    if (!id) return;

    // Cancelar cualquier solicitud en curso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const loadData = async () => {
      setLoading(true);
      setLoadingMR(false);
      setError('');
      setMrError('');
      setRecord(null);
      setMedicalRecord(null);

      try {
        // Paso 1: Cargar consentimiento
        const consentRes = await apiFetch(`/api/consents/${id}/`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        if (!consentRes.ok) {
          if (consentRes.status === 404) {
            setError('Consentimiento no encontrado');
          } else if (consentRes.status === 403) {
            setError('No tiene permisos para ver este consentimiento');
          } else {
            setError('Error al cargar el consentimiento');
          }
          setLoading(false);
          return;
        }

        const consentData = await consentRes.json();

        if (controller.signal.aborted) return;

        setRecord(consentData);
        // Terminar loading principal después de cargar el consent
        setLoading(false);

        // Paso 2: Cargar medical record en segundo plano
        if (consentData.medical_record_id) {
          setLoadingMR(true);
          try {
            const mrRes = await apiFetch(`/api/medical-records/${consentData.medical_record_id}/`, {
              signal: controller.signal,
            });

            if (controller.signal.aborted) return;

            if (mrRes.ok) {
              const mrData = await mrRes.json();
              setMedicalRecord(mrData);
            } else if (mrRes.status === 404) {
              setMrError('El registro médico asociado no fue encontrado');
            } else if (mrRes.status === 403) {
              setMrError('No tiene permisos para ver el registro médico asociado');
            } else {
              setMrError('Error al cargar el registro médico asociado');
            }
          } catch (e: any) {
            if (e.name === 'AbortError') return;
            setMrError('Error de conexión al cargar el registro médico');
          } finally {
            if (!controller.signal.aborted) {
              setLoadingMR(false);
            }
          }
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
        setError(e.message || 'Error al cargar');
        setLoading(false);
      }
    };

    loadData();

    return () => {
      controller.abort();
    };
  }, [id]);

  // Usar mappers explícitos para conversión de tipos
  const consentFormValues = mapConsentToFormValues(record as ConsentApiResponse | null);
  const doctorInfo = mapConsentToDoctorInfo(record as ConsentApiResponse | null);

  if (!id) return <Navigate to="/admin/consents" replace />;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/consents"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Consentimientos
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : !record ? (
        <div className="bg-gray-50 border border-gray-200 text-gray-600 px-4 py-3 rounded-lg">
          Consentimiento no encontrado
        </div>
      ) : (
        <div className="space-y-6">
          {/* Info del paciente */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Paciente</p>
                <p className="text-lg font-semibold text-gray-900">{record.patient_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Creado</p>
                <p className="text-sm text-gray-700">{fmt(record.created_at)}</p>
              </div>
            </div>
          </div>

          {/* ConsentForm readonly */}
          <ConsentForm
            values={consentFormValues}
            signedAt={record.signed_at}
            doctorInfo={doctorInfo}
            mode="readonly"
          />

          {/* Link a cita o warning huérfano */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Origen del registro</h3>
            
            {!record.medical_record_id ? (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Registro huérfano</p>
                  <p className="text-sm">Este consentimiento no está vinculado a ningún registro médico.</p>
                </div>
              </div>
            ) : loadingMR ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Cargando información de la cita...</span>
              </div>
            ) : mrError ? (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{mrError}</p>
                </div>
              </div>
            ) : medicalRecord?.appointment_id ? (
              <Link
                to={`/admin/appointments/${medicalRecord.appointment_id}`}
                target="_blank"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Ver cita #{medicalRecord.appointment_id}
                <ExternalLink className="w-4 h-4" />
              </Link>
            ) : (
              <div className="flex items-center gap-2 text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                <span className="text-sm">Registro médico #{record.medical_record_id} sin cita asociada</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
