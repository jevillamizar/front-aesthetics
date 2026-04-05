import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  ArrowLeft, CalendarDays, Camera, ChevronDown, ChevronUp, ClipboardList,
  Loader2, Mail, MapPin, Pencil, Phone, Save, Trash2, User, X,
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
  eps: string;
  legal_guardian: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  photo: string | null;
  notes: string;
  created_at: string | null;
};

type EditForm = {
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  eps: string;
  legal_guardian: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  notes: string;
  photoFile: File | null;
  clearPhoto: boolean;
};

const DOC_TYPES = [
  { value: 'CC',  label: 'Cédula de Ciudadanía' },
  { value: 'CE',  label: 'Cédula de Extranjería' },
  { value: 'TI',  label: 'Tarjeta de Identidad' },
  { value: 'PP',  label: 'Pasaporte' },
  { value: 'RC',  label: 'Registro Civil' },
  { value: 'NIT', label: 'NIT' },
];
const SEX_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
];

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
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecord, setExpandedRecord] = useState<number | null>(null);
  const [tab, setTab] = useState<'records' | 'appointments'>('records');

  /* Edit modal state */
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  /* Photo-only upload state */
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

  const openEdit = () => {
    if (!patient) return;
    setEditError('');
    setPhotoPreview(null);
    setEditing({
      document_type: patient.document_type,
      document_number: patient.document_number,
      first_name: patient.first_name,
      last_name: patient.last_name,
      date_of_birth: patient.date_of_birth ?? '',
      sex: patient.sex,
      phone: patient.phone,
      email: patient.email,
      address: patient.address,
      eps: patient.eps,
      legal_guardian: patient.legal_guardian,
      emergency_contact_name: patient.emergency_contact_name,
      emergency_contact_phone: patient.emergency_contact_phone,
      emergency_contact_relation: patient.emergency_contact_relation,
      notes: patient.notes,
      photoFile: null,
      clearPhoto: false,
    });
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setEditing({ ...editing, photoFile: file, clearPhoto: false });
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!editing || !patient) return;
    if (!editing.first_name.trim() || !editing.last_name.trim()) {
      setEditError('Nombres y apellidos son obligatorios.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      let body: FormData | string;
      if (editing.photoFile) {
        const fd = new FormData();
        Object.entries(editing).forEach(([k, v]) => {
          if (k === 'photoFile' || k === 'clearPhoto') return;
          fd.append(k, v as string ?? '');
        });
        fd.append('photo', editing.photoFile);
        body = fd;
      } else {
        body = JSON.stringify({
          document_type: editing.document_type,
          document_number: editing.document_number,
          first_name: editing.first_name,
          last_name: editing.last_name,
          date_of_birth: editing.date_of_birth || null,
          sex: editing.sex,
          phone: editing.phone,
          email: editing.email,
          address: editing.address,
          eps: editing.eps,
          legal_guardian: editing.legal_guardian,
          emergency_contact_name: editing.emergency_contact_name,
          emergency_contact_phone: editing.emergency_contact_phone,
          emergency_contact_relation: editing.emergency_contact_relation,
          notes: editing.notes,
          photo: editing.clearPhoto ? '' : undefined,
        });
      }
      const res = await apiFetch(`/api/patients/${patient.id}/`, { method: 'PUT', body });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      const json = await res.json();
      setPatient(json.patient);
      setEditing(null);
      setPhotoPreview(null);
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!patient) return;
    if (!confirm(`¿Eliminar a ${patient.first_name} ${patient.last_name}? Esta acción no se puede deshacer.`)) return;
    await apiFetch(`/api/patients/${patient.id}/`, { method: 'DELETE' });
    navigate('/admin/patients');
  };

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

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-wrap items-start gap-5">

          {/* Photo / Avatar with upload */}
          <div className="relative flex-shrink-0 group">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPhotoChange}
            />
            <div
              onClick={() => photoInputRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 cursor-pointer ring-2 ring-transparent group-hover:ring-gray-300 transition-all"
            >
              {patient.photo
                ? <img src={patient.photo} alt="Foto" className="w-full h-full object-cover" />
                : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-300" />
                  </div>
                )}
            </div>
            <div
              onClick={() => photoInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center cursor-pointer shadow-sm"
            >
              {uploadingPhoto
                ? <Loader2 className="w-3 h-3 text-white animate-spin" />
                : <Camera className="w-3 h-3 text-white" />}
            </div>
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

          {/* Stats + Actions */}
          <div className="flex flex-col gap-3 items-end flex-shrink-0">
            <div className="flex gap-2">
              <button onClick={openEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5" /> Editar
              </button>
              <button onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Eliminar
              </button>
            </div>
            <div className="flex gap-4">
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
                  <p className="text-xl font-bold text-gray-900">{fmtCurrency(totalRevenue)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Facturado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {patient.notes && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Notas</p>
            <p className="text-sm text-gray-700 whitespace-pre-line">{patient.notes}</p>
          </div>
        )}
      </div>

      {/* Full data grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-6">
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identificación</h2>
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
            {patient.created_at && <InfoRow label="Fecha de registro" value={formatDate(patient.created_at)} />}
          </div>
        </div>
        <div className="border-t border-gray-50 pt-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos administrativos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoRow label="EPS" value={patient.eps} />
            {(age(patient.date_of_birth) ?? 18) < 18 && <InfoRow label="Responsable" value={patient.legal_guardian} />}
            <InfoRow label="Contacto emergencia" value={patient.emergency_contact_name} />
            <InfoRow label="Parentesco" value={patient.emergency_contact_relation} />
            <InfoRow label="Tel. emergencia" value={patient.emergency_contact_phone} />
          </div>
        </div>
      </div>

      {/* ─── Edit Modal ──────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Editar Paciente</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {editError && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{editError}</div>}

              {/* Photo */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {photoPreview || patient.photo
                    ? <img src={photoPreview ?? patient.photo ?? ''} alt="Foto" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><User className="w-8 h-8 text-gray-300" /></div>}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-gray-500" />
                    {editing.photoFile ? 'Cambiar foto' : 'Subir foto'}
                    <input type="file" accept="image/*" className="hidden"
                      onChange={handleEditPhotoChange} />
                  </label>
                  {(patient.photo || editing.photoFile) && !editing.clearPhoto && (
                    <button type="button" onClick={() => { setEditing({ ...editing, photoFile: null, clearPhoto: true }); setPhotoPreview(null); }}
                      className="text-xs text-red-500 hover:text-red-700 text-left">
                      Eliminar foto
                    </button>
                  )}
                </div>
              </div>

              {/* Documento */}
              <div className="grid grid-cols-[1fr_1.5fr] gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                  <select value={editing.document_type} onChange={(e) => setEditing({ ...editing, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                    <option value="">Seleccionar…</option>
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
                  <input type="text" value={editing.document_number} onChange={(e) => setEditing({ ...editing, document_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                  <input type="text" value={editing.first_name} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                  <input type="text" value={editing.last_name} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={editing.date_of_birth} onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select value={editing.sex} onChange={(e) => setEditing({ ...editing, sex: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                    <option value="">Seleccionar…</option>
                    {SEX_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>

              {/* Administrative data */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos administrativos</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EPS</label>
                    <input type="text" value={editing.eps} onChange={(e) => setEditing({ ...editing, eps: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Nombre de la EPS" />
                  </div>
                  {(age(editing.date_of_birth || null) ?? 18) < 18 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsable <span className="text-xs text-amber-600 font-normal">(menor de edad)</span></label>
                      <input type="text" value={editing.legal_guardian} onChange={(e) => setEditing({ ...editing, legal_guardian: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Nombre del responsable" />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de emergencia</label>
                      <input type="text" value={editing.emergency_contact_name} onChange={(e) => setEditing({ ...editing, emergency_contact_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Nombre" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parentesco</label>
                      <input type="text" value={editing.emergency_contact_relation} onChange={(e) => setEditing({ ...editing, emergency_contact_relation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Ej: Madre, Esposo…" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de emergencia</label>
                    <input type="tel" value={editing.emergency_contact_phone} onChange={(e) => setEditing({ ...editing, emergency_contact_phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="+57 300 000 0000" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

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
                                {r.personal_history        && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Personales</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.personal_history}</p></div>}
                                {r.surgical_history        && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Quirúrgicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.surgical_history}</p></div>}
                                {r.allergic_history        && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Alérgicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.allergic_history}</p></div>}
                                {r.pharmacological_history && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Farmacológicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.pharmacological_history}</p></div>}
                                {r.family_history          && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Familiares</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.family_history}</p></div>}
                              </div>
                            </div>
                          )}
                          {r.physical_exam   && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Examen físico</p>
                              <p className="text-sm text-gray-800 whitespace-pre-line">{r.physical_exam}</p>
                            </div>
                          )}
                          {r.diagnosis       && <InfoRow label="Diagnóstico" value={r.diagnosis} />}
                          {r.treatment_plan  && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Plan de tratamiento</p>
                              <p className="text-sm text-gray-800 whitespace-pre-line">{r.treatment_plan}</p>
                            </div>
                          )}
                          {r.evolution       && (
                            <div className="sm:col-span-2">
                              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Evolución</p>
                              <p className="text-sm text-gray-800 whitespace-pre-line">{r.evolution}</p>
                            </div>
                          )}
                          {r.notes           && (
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
                          {/* Médico responsable */}
                          <div className="sm:col-span-2 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
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
                              {r.doctor_professional_seal && <div className="sm:col-span-2"><p className="text-xs text-gray-400">Sello profesional</p><p className="text-sm font-medium text-gray-800">{r.doctor_professional_seal}</p></div>}
                            </div>
                          </div>
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
