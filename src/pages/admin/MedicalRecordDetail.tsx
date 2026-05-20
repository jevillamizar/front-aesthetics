import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { MedicalRecordForm, TreatmentItem } from '../../components/MedicalRecordForm';
import { Loader2, ChevronLeft, ExternalLink } from 'lucide-react';

type MedicalRecord = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_profession: string;
  doctor_specialty: string;
  doctor_rethus_number: string;
  doctor_rethus_status: string;
  doctor_professional_seal: string;
  appointment_id: number | null;
  chief_complaint: string;
  current_illness: string;
  personal_history: string;
  surgical_history: string;
  allergic_history: string;
  pharmacological_history: string;
  family_history: string;
  physical_exam: string;
  diagnosis: string;
  treatment_plan: string;
  evolution: string;
  informed_consent: string;
  consent_signed: boolean;
  notes: string;
  photo_before_url: string;
  photo_after_url: string;
  created_at: string;
  updated_at: string;
  treatment_items: TreatmentItem[];
};

export function MedicalRecordDetail() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRecord = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/medical-records/${id}/`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Registro no encontrado');
          return;
        }
        throw new Error('Error al cargar el registro');
      }
      const data = await res.json();
      setRecord(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  // Mapear MedicalRecord a MRForm para MedicalRecordForm
  const mrFormValues = {
    chief_complaint: record?.chief_complaint || '',
    current_illness: record?.current_illness || '',
    personal_history: record?.personal_history || '',
    surgical_history: record?.surgical_history || '',
    allergic_history: record?.allergic_history || '',
    pharmacological_history: record?.pharmacological_history || '',
    family_history: record?.family_history || '',
    physical_exam: record?.physical_exam || '',
    diagnosis: record?.diagnosis || '',
    treatment_plan: record?.treatment_plan || '',
    evolution: record?.evolution || '',
    notes: record?.notes || '',
  };

  if (!id) return <Navigate to="/admin/medical-records" replace />;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/medical-records"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver a Historial Clínico
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : record ? (
        <div className="space-y-6">
          {/* Info general del registro */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{record.patient_name}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Registro #{record.id} · {new Date(record.created_at).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Link a cita origen (Paso C) */}
              {record.appointment_id ? (
                <Link
                  to={`/admin/appointments/${record.appointment_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Cita #{record.appointment_id}
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg">
                  Sin cita asociada
                </span>
              )}
            </div>

            {/* Info del médico */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Médico:</span>{' '}
                {record.doctor_name}
                {record.doctor_profession && ` · ${record.doctor_profession}`}
                {record.doctor_specialty && ` · ${record.doctor_specialty}`}
              </p>
            </div>
          </div>

          {/* Medical Record Form - Readonly */}
          <MedicalRecordForm
            mode="readonly"
            values={mrFormValues}
            treatmentItems={record.treatment_items}
            photoBefore={
              record.photo_before_url
                ? {
                    url: record.photo_before_url,
                    file: null,
                    preview: '',
                    uploading: false,
                  }
                : undefined
            }
            photoAfter={
              record.photo_after_url
                ? {
                    url: record.photo_after_url,
                    file: null,
                    preview: '',
                    uploading: false,
                  }
                : undefined
            }
          />

          {/* Consentimiento informado */}
          {(record.informed_consent || record.consent_signed) && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Consentimiento Informado</h2>
              </div>
              <div className="px-5 py-5 space-y-4">
                {record.informed_consent && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Texto del consentimiento</label>
                    <div className="mt-1.5 px-3 py-2 bg-gray-50 text-gray-600 border border-gray-100 rounded-lg text-sm whitespace-pre-wrap min-h-[2.5rem]">
                      {record.informed_consent}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Estado:</span>
                  {record.consent_signed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                      Firmado
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
