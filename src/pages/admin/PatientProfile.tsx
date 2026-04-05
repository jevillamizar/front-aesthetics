import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  ArrowLeft, CalendarDays, ChevronDown, ChevronUp, ClipboardList,
  Loader2, Mail, MapPin, Phone, User,
} from 'lucide-react';

type Patient = {
  id: number;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  sex: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type TreatmentItem = {
  id: number;
  treatment_name: string;
  quantity: number;
  price: number;
  notes: string;
};

type MedicalRecord = {
  id: number;
  doctor_name: string;
  appointment_id: number | null;
  chief_complaint: string;
  diagnosis: string;
  notes: string;
  created_at: string;
  treatment_items: TreatmentItem[];
};

type Appointment = {
  id: number;
  starts_at: string;
  status: string;
  treatment_name: string | null;
  doctor_email: string | null;
};

const SEX_LABEL: Record<string, string> = { M: 'Masculino', F: 'Femenino', O: 'Otro' };
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Programada', CONFIRMED: 'Confirmada', COMPLETED: 'Completada',
  CANCELED: 'Cancelada', NO_SHOW: 'No asistió',
};
const STATUS_CLASS: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  CONFIRMED:  'bg-green-50 text-green-700 border-green-200',
  COMPLETED:  'bg-gray-100 text-gray-600 border-gray-200',
  CANCELED:   'bg-red-50 text-red-600 border-red-200',
  NO_SHOW:    'bg-amber-50 text-amber-700 border-amber-200',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function formatDob(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function age(iso: string | null) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-sm text-gray-800 mt-0.5">{value || '—'}</p>
    </div>
  );
}

export function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [tab, setTab] = useState<'records' | 'appointments'>('records');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      apiFetch(`/api/patients/${id}/`).then((r) => r.json()),
      apiFetch(`/api/medical-records/?patient_id=${id}`).then((r) => r.json()),
      apiFetch(`/api/appointments/?patient_id=${id}`).then((r) => r.json()),
    ]).then(([pJson, rJson, aJson]) => {
      setPatient(pJson.patient || null);
      setRecords(rJson.records || []);
      setAppointments((aJson.appointments || []).sort((a: Appointment, b: Appointment) =>
        b.starts_at.localeCompare(a.starts_at)));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Paciente no encontrado.</p>
        <button onClick={() => navigate('/admin/patients')} className="mt-4 text-sm text-gray-600 underline">Volver</button>
      </div>
    );
  }

  const yearsOld = age(patient.date_of_birth);
  const totalRevenue = records.reduce(
    (s, r) => s + r.treatment_items.reduce((rs, it) => rs + it.price * it.quantity, 0), 0
  );

  return (
    <div>
      {/* Back */}
      <button onClick={() => navigate('/admin/patients')}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a Pacientes
      </button>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-gray-300" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
              {patient.document_type && patient.document_number && (
                <span>{patient.document_type} {patient.document_number}</span>
              )}
              {patient.date_of_birth && (
                <span>{formatDob(patient.date_of_birth)}{yearsOld !== null ? ` · ${yearsOld} años` : ''}</span>
              )}
              {patient.sex && <span>{SEX_LABEL[patient.sex] ?? patient.sex}</span>}
            </div>

            {/* Contact */}
            <div className="flex flex-wrap gap-4 mt-3">
              {patient.phone && (
                <a href={`tel:${patient.phone}`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                  <Phone className="w-3.5 h-3.5" />{patient.phone}
                </a>
              )}
              {patient.email && (
                <a href={`mailto:${patient.email}`} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
                  <Mail className="w-3.5 h-3.5" />{patient.email}
                </a>
              )}
              {patient.address && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-3.5 h-3.5" />{patient.address}
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-4 flex-shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{records.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Registros</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
              <p className="text-xs text-gray-400 mt-0.5">Citas</p>
            </div>
            {totalRevenue > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{fmtCurrency(totalRevenue)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Facturado</p>
              </div>
            )}
          </div>
        </div>

        {patient.notes && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Notas clínicas</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{patient.notes}</p>
          </div>
        )}
      </div>

      {/* Full data grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Información completa</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <InfoRow label="Tipo documento" value={patient.document_type} />
          <InfoRow label="Número documento" value={patient.document_number} />
          <InfoRow label="Nombres" value={patient.first_name} />
          <InfoRow label="Apellidos" value={patient.last_name} />
          <InfoRow label="Fecha nacimiento" value={formatDob(patient.date_of_birth)} />
          <InfoRow label="Sexo" value={patient.sex ? SEX_LABEL[patient.sex] : ''} />
          <InfoRow label="Teléfono" value={patient.phone} />
          <InfoRow label="Correo electrónico" value={patient.email} />
          <InfoRow label="Dirección" value={patient.address} />
        </div>
      </div>

      {/* Tabs: Historial / Citas */}
      <div className="border-b border-gray-200 mb-5">
        <nav className="flex gap-6">
          <button onClick={() => setTab('records')}
            className={`inline-flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${tab === 'records' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <ClipboardList className="w-4 h-4" /> Historial clínico ({records.length})
          </button>
          <button onClick={() => setTab('appointments')}
            className={`inline-flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${tab === 'appointments' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <CalendarDays className="w-4 h-4" /> Citas ({appointments.length})
          </button>
        </nav>
      </div>

      {/* Medical Records tab */}
      {tab === 'records' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {records.length === 0 ? (
            <div className="py-14 text-center">
              <ClipboardList className="w-7 h-7 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Sin registros clínicos</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {records.map((r) => {
                const isOpen = expandedRecord === r.id;
                const total = r.treatment_items.reduce((s, it) => s + it.price * it.quantity, 0);
                return (
                  <div key={r.id}>
                    <button
                      onClick={() => setExpandedRecord(isOpen ? null : r.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">{r.chief_complaint || r.diagnosis || 'Sin motivo registrado'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.doctor_name} · {formatDate(r.created_at)}</p>
                      </div>
                      {total > 0 && <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmtCurrency(total)}</span>}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 bg-gray-50/30 border-t border-gray-50 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                          {r.chief_complaint && <InfoRow label="Motivo de consulta" value={r.chief_complaint} />}
                          {r.diagnosis      && <InfoRow label="Diagnóstico" value={r.diagnosis} />}
                          {r.notes          && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Notas</p>
                              <p className="text-sm text-gray-800 whitespace-pre-line">{r.notes}</p>
                            </div>
                          )}
                        </div>
                        {r.treatment_items.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Tratamientos</p>
                            <div className="space-y-1">
                              {r.treatment_items.map((it, i) => (
                                <div key={i} className="flex justify-between text-sm text-gray-700 bg-white border border-gray-100 px-3 py-2 rounded-lg">
                                  <span>{it.treatment_name} × {it.quantity}</span>
                                  <span className="font-medium">{fmtCurrency(it.price * it.quantity)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between text-sm font-semibold text-gray-900 px-3 py-1">
                                <span>Total</span><span>{fmtCurrency(total)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Appointments tab */}
      {tab === 'appointments' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {appointments.length === 0 ? (
            <div className="py-14 text-center">
              <CalendarDays className="w-7 h-7 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Sin citas registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {appointments.map((a) => (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-[130px]">
                    <p className="text-sm font-medium text-gray-900">{formatDateTime(a.starts_at)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{a.treatment_name || '—'}</p>
                    {a.doctor_email && <p className="text-xs text-gray-400">{a.doctor_email}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_CLASS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {STATUS_LABEL[a.status] ?? a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
