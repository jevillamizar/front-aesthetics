import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  ArrowLeft, CalendarDays, Camera, ChevronLeft, ChevronRight, ClipboardList,
  FileText, Loader2, Mail, MapPin, Minus, Pencil, Phone, Plus, RotateCcw, User, X,
} from 'lucide-react';
import { PatientModal } from '../../components/PatientModal';

import type { Patient } from '../../components/PatientModal';

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
  PENDING: 'Pendiente', IN_PROGRESS: 'En curso', COMPLETED: 'Completada',
  CANCELED: 'Cancelada', NO_SHOW: 'No asistió', EXPIRED: 'Vencida',
};
const STATUS_CLASS: Record<string, string> = {
  PENDING:     'bg-amber-50 text-amber-700 border-amber-200',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 border-violet-200',
  COMPLETED:   'bg-gray-100 text-gray-600 border-gray-200',
  CANCELED:    'bg-red-50 text-red-600 border-red-200',
  NO_SHOW:     'bg-amber-50 text-amber-700 border-amber-200',
  EXPIRED:     'bg-orange-50 text-orange-600 border-orange-200',
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
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [lightbox, setLightbox] = useState<{ images: string[]; idx: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [tab, setTab] = useState<'records' | 'appointments'>('records');

  const [showEdit, setShowEdit] = useState(false);

  /* Photo-only upload state */
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const changeImg = (newIdx: number) => {
    resetZoom();
    setLightbox(lb => lb ? { ...lb, idx: newIdx } : lb);
  };

  // Close lightbox on Escape / arrow keys
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setLightbox(null); resetZoom(); }
      if (e.key === 'ArrowRight' && zoom === 1) changeImg(Math.min(lightbox.idx + 1, lightbox.images.length - 1));
      if (e.key === 'ArrowLeft'  && zoom === 1) changeImg(Math.max(lightbox.idx - 1, 0));
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 5));
      if (e.key === '-') setZoom(z => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setPan({ x: 0, y: 0 }); return nz; });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, zoom]);

  const reload = async (patientId: string) => {
    const [pJson, rJson, aJson] = await Promise.all([
      apiFetch(`/api/patients/${patientId}/`).then((r) => r.json()),
      apiFetch(`/api/medical-records/?patient_id=${patientId}`).then((r) => r.json()),
      apiFetch(`/api/appointments/?patient_id=${patientId}`).then((r) => r.json()),
    ]);
    setPatient(pJson.patient || null);
    setRecords(rJson.records || []);
    setAppointments((aJson.appointments || []).sort((a: Appointment, b: Appointment) =>
      b.starts_at.localeCompare(a.starts_at)));
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    reload(id).finally(() => setLoading(false));
  }, [id]);

  const openEdit = () => { if (patient) setShowEdit(true); };

  /* Quick photo upload from avatar area */
  const handleAvatarPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !patient) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('first_name', patient.first_name);
      fd.append('last_name', patient.last_name);
      fd.append('photo', file);
      const res = await apiFetch(`/api/patients/${patient.id}/`, { method: 'PUT', body: fd });
      if (res.ok) {
        const json = await res.json();
        setPatient(json.patient);
      }
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

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

      {/* Patient card — compact single block */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex items-start gap-4">

          {/* Avatar */}
          <div className="relative flex-shrink-0 group">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPhotoChange} />
            <div onClick={() => photoInputRef.current?.click()}
              className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 cursor-pointer ring-2 ring-transparent group-hover:ring-gray-300 transition-all">
              {patient.photo
                ? <img src={patient.photo} alt="Foto" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><User className="w-7 h-7 text-gray-300" /></div>}
            </div>
            <div onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center cursor-pointer shadow-sm">
              {uploadingPhoto ? <Loader2 className="w-2.5 h-2.5 text-white animate-spin" /> : <Camera className="w-2.5 h-2.5 text-white" />}
            </div>
          </div>

          {/* Name + fields */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                  {patient.first_name} {patient.last_name}
                </h1>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-400">
                  {patient.document_type && patient.document_number && <span>{patient.document_type} {patient.document_number}</span>}
                  {patient.date_of_birth && <span>{formatDob(patient.date_of_birth)}{yearsOld !== null ? ` · ${yearsOld} años` : ''}</span>}
                  {patient.sex && <span>{SEX_LABEL[patient.sex] ?? patient.sex}</span>}
                  {patient.created_at && <span>Registro: {formatDate(patient.created_at)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex gap-3 text-center mr-2">
                  <div><p className="text-base font-bold text-gray-900">{records.length}</p><p className="text-xs text-gray-400">Registros</p></div>
                  <div><p className="text-base font-bold text-gray-900">{appointments.length}</p><p className="text-xs text-gray-400">Citas</p></div>
                  {totalRevenue > 0 && <div><p className="text-base font-bold text-gray-900">{fmtCurrency(totalRevenue)}</p><p className="text-xs text-gray-400">Facturado</p></div>}
                </div>
                <button onClick={openEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Pencil className="w-3 h-3" /> Editar
                </button>
                {showEdit && patient && (
                  <PatientModal
                    patient={patient}
                    onClose={() => setShowEdit(false)}
                    onSaved={(updated) => { setPatient(updated); setShowEdit(false); }}
                  />
                )}
              </div>
            </div>

            {/* All fields in one tight grid */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 text-xs">
              {patient.phone && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <a href={`tel:${patient.phone}`} className="hover:text-gray-900 truncate">{patient.phone}</a>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-1 text-gray-600 lg:col-span-2">
                  <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${patient.email}`} className="hover:text-gray-900 truncate">{patient.email}</a>
                </div>
              )}
              {patient.address && (
                <div className="flex items-center gap-1 text-gray-600 lg:col-span-2">
                  <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate">{patient.address}</span>
                </div>
              )}
              {patient.eps && <div className="text-gray-500"><span className="text-gray-400">EPS: </span>{patient.eps}</div>}
              {patient.emergency_contact_name && <div className="text-gray-500"><span className="text-gray-400">Emergencia: </span>{patient.emergency_contact_name}</div>}
              {patient.emergency_contact_phone && <div className="text-gray-500"><span className="text-gray-400">Tel: </span>{patient.emergency_contact_phone}</div>}
              {(age(patient.date_of_birth) ?? 18) < 18 && patient.legal_guardian && <div className="text-gray-500"><span className="text-gray-400">Responsable: </span>{patient.legal_guardian}</div>}
            </div>

          </div>
        </div>
      </div>

      {/* All patient fields — single compact block */}
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
          <InfoRow label="Tipo documento"      value={patient.document_type} />
          <InfoRow label="Número documento"    value={patient.document_number} />
          <InfoRow label="Nombres"             value={patient.first_name} />
          <InfoRow label="Apellidos"           value={patient.last_name} />
          <InfoRow label="Fecha nacimiento"    value={formatDob(patient.date_of_birth)} />
          <InfoRow label="Sexo"                value={patient.sex ? SEX_LABEL[patient.sex] : ''} />
          <InfoRow label="Teléfono"            value={patient.phone} />
          <InfoRow label="Correo electrónico"  value={patient.email} />
          <InfoRow label="Dirección"           value={patient.address} />
          {patient.created_at && <InfoRow label="Fecha de registro" value={formatDate(patient.created_at)} />}
          <InfoRow label="EPS"                 value={patient.eps} />
          <InfoRow label="Contacto emergencia" value={patient.emergency_contact_name} />
          <InfoRow label="Parentesco"          value={patient.emergency_contact_relation} />
          <InfoRow label="Tel. emergencia"     value={patient.emergency_contact_phone} />
          {(age(patient.date_of_birth) ?? 18) < 18 && <InfoRow label="Responsable" value={patient.legal_guardian} />}
        </div>
        {patient.notes && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Notas</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{patient.notes}</p>
          </div>
        )}
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
            <div className="divide-y divide-gray-100">
              {records.map((r) => {
                const total = r.treatment_items.reduce((s, it) => s + it.price * it.quantity, 0);
                return (
                  <button key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                      <FileText className="w-4 h-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{r.chief_complaint || r.diagnosis || 'Sin motivo registrado'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.doctor_name} · {formatDate(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {(r.photo_before_url || r.photo_after_url) && (
                        <span className="text-xs text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">Fotos</span>
                      )}
                      {total > 0 && <span className="text-sm font-semibold text-gray-900">{fmtCurrency(total)}</span>}
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Medical Record Modal */}
      {selectedRecord && (() => {
        const r = selectedRecord;
        const total = r.treatment_items.reduce((s, it) => s + it.price * it.quantity, 0);
        const photoArr = [r.photo_before_url, r.photo_after_url].filter(Boolean) as string[];
        return (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedRecord(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-100">
                <div>
                  <p className="font-semibold text-gray-900 text-base">{r.chief_complaint || r.diagnosis || 'Historia clínica'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.doctor_name} · {formatDate(r.created_at)}</p>
                </div>
                <button onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="overflow-y-auto px-6 py-5 space-y-5">

                {/* Fotos */}
                {photoArr.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fotos Antes / Después</p>
                    <div className="grid grid-cols-2 gap-3">
                      {photoArr.map((url, i) => (
                        <div key={url}>
                          <p className="text-xs text-gray-500 mb-1">{i === 0 && photoArr.length === 2 ? 'Antes' : i === 1 ? 'Después' : r.photo_before_url ? 'Antes' : 'Después'}</p>
                          <button type="button" onClick={() => setLightbox({ images: photoArr, idx: i })}
                            className="w-full block rounded-xl overflow-hidden border border-gray-200 hover:border-violet-400 hover:shadow-md transition-all group">
                            <img src={url} alt="foto" className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-200" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {r.chief_complaint && <InfoRow label="Motivo de consulta" value={r.chief_complaint} />}
                  {r.diagnosis && <InfoRow label="Diagnóstico" value={r.diagnosis} />}
                  {r.current_illness && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Enfermedad actual</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{r.current_illness}</p>
                    </div>
                  )}
                  {(r.personal_history||r.surgical_history||r.allergic_history||r.pharmacological_history||r.family_history) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">Antecedentes</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {r.personal_history        && <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Personales</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.personal_history}</p></div>}
                        {r.surgical_history        && <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Quirúrgicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.surgical_history}</p></div>}
                        {r.allergic_history        && <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Alérgicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.allergic_history}</p></div>}
                        {r.pharmacological_history && <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Farmacológicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.pharmacological_history}</p></div>}
                        {r.family_history          && <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Familiares</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.family_history}</p></div>}
                      </div>
                    </div>
                  )}
                  {r.physical_exam && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Examen físico</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{r.physical_exam}</p>
                    </div>
                  )}
                  {r.treatment_plan && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Plan de procedimiento</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{r.treatment_plan}</p>
                    </div>
                  )}
                  {r.evolution && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Evolución</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{r.evolution}</p>
                    </div>
                  )}
                  {r.notes && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Notas</p>
                      <p className="text-sm text-gray-800 whitespace-pre-line">{r.notes}</p>
                    </div>
                  )}
                  {(r.informed_consent || r.consent_signed) && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Consentimiento informado</p>
                      {r.informed_consent && <p className="text-sm text-gray-800 whitespace-pre-line mb-1">{r.informed_consent}</p>}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.consent_signed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                        {r.consent_signed ? '✓ Firmado' : 'Pendiente de firma'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Procedimientos */}
                {r.treatment_items.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Procedimientos</p>
                    <div className="space-y-1">
                      {r.treatment_items.map((it, i) => (
                        <div key={i} className="flex justify-between text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
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

                {/* Médico responsable */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Médico responsable</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div><p className="text-xs text-gray-400">Nombre</p><p className="text-sm font-medium text-gray-800">{r.doctor_name || '—'}</p></div>
                    {r.doctor_profession && <div><p className="text-xs text-gray-400">Profesión</p><p className="text-sm text-gray-800">{r.doctor_profession}{r.doctor_specialty ? ` · ${r.doctor_specialty}` : ''}</p></div>}
                    {r.doctor_rethus_number && (
                      <div>
                        <p className="text-xs text-gray-400">ReTHUS</p>
                        <p className="text-sm text-gray-800">{r.doctor_rethus_number}
                          <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            r.doctor_rethus_status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>{r.doctor_rethus_status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</span>
                        </p>
                      </div>
                    )}
                    {r.doctor_professional_seal && <div className="col-span-2"><p className="text-xs text-gray-400">Sello profesional</p><p className="text-sm font-medium text-gray-800">{r.doctor_professional_seal}</p></div>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm overflow-hidden"
          onClick={() => { if (zoom === 1) { setLightbox(null); resetZoom(); } }}
          onWheel={e => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.25 : -0.25;
            setZoom(z => {
              const nz = Math.min(Math.max(z + delta, 1), 5);
              if (nz === 1) setPan({ x: 0, y: 0 });
              return nz;
            });
          }}
        >
          {/* Top toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5 z-10"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setZoom(z => { const nz = Math.max(z - 0.5, 1); if (nz === 1) setPan({ x: 0, y: 0 }); return nz; })}
              disabled={zoom <= 1}
              className="p-1 rounded-full text-white hover:bg-white/20 disabled:opacity-30 transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white text-xs font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(z + 0.5, 5))}
              disabled={zoom >= 5}
              className="p-1 rounded-full text-white hover:bg-white/20 disabled:opacity-30 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            {zoom > 1 && (
              <button onClick={resetZoom}
                className="p-1 rounded-full text-white hover:bg-white/20 transition-colors ml-1">
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Close */}
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            onClick={() => { setLightbox(null); resetZoom(); }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev — only when not zoomed */}
          {zoom === 1 && lightbox.idx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); changeImg(lightbox.idx - 1); }}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Image with zoom + drag */}
          <img
            src={lightbox.images[lightbox.idx]}
            alt="foto"
            draggable={false}
            onDoubleClick={e => {
              e.stopPropagation();
              if (zoom > 1) { resetZoom(); } else { setZoom(2.5); }
            }}
            onMouseDown={e => {
              if (zoom <= 1) return;
              e.preventDefault();
              dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
            }}
            onMouseMove={e => {
              if (!dragRef.current) return;
              setPan({
                x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
                y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
              });
            }}
            onMouseUp={() => { dragRef.current = null; }}
            onMouseLeave={() => { dragRef.current = null; }}
            onClick={e => e.stopPropagation()}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transition: dragRef.current ? 'none' : 'transform 0.15s ease',
              cursor: zoom > 1 ? 'grab' : 'zoom-in',
              userSelect: 'none',
            }}
            className="max-h-[85vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
          />

          {/* Next — only when not zoomed */}
          {zoom === 1 && lightbox.idx < lightbox.images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              onClick={e => { e.stopPropagation(); changeImg(lightbox.idx + 1); }}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Dots */}
          {lightbox.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10"
              onClick={e => e.stopPropagation()}>
              {lightbox.images.map((_, i) => (
                <button key={i}
                  onClick={() => changeImg(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === lightbox.idx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          )}

          {/* Zoom hint */}
          <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none">
            {zoom === 1 ? 'Doble click o scroll para hacer zoom' : 'Arrastra para mover · Doble click para restablecer'}
          </p>
        </div>
      )}
    </div>
  );
}
