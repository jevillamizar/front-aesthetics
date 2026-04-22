import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  Ban, CalendarDays, CalendarPlus, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardList, Clock, CreditCard, FileSignature, Loader2, Pencil, Play,
  Plus, Save, Stethoscope, Trash2, UserPlus, UserX, X,
} from 'lucide-react';
import { useAuth } from '../../lib/auth';

type Patient   = { id: number; first_name: string; last_name: string; email: string; phone: string };
type Treatment = { id: number; name: string; duration_minutes: number; price?: number };
type Doctor    = { id: number; first_name: string; last_name: string; email: string };

const DOC_TYPES = [
  { value: 'CC',  label: 'CC — Cédula de Ciudadanía' },
  { value: 'CE',  label: 'CE — Cédula de Extranjería' },
  { value: 'TI',  label: 'TI — Tarjeta de Identidad' },
  { value: 'PP',  label: 'PP — Pasaporte' },
  { value: 'RC',  label: 'RC — Registro Civil' },
  { value: 'NIT', label: 'NIT' },
];

const EMPTY_NEW_PATIENT = { document_type: '', document_number: '', first_name: '', last_name: '', phone: '', email: '' };

type PaymentInfo = {
  id: number;
  amount: number;
  method: string;
  status: string;
  notes: string;
  paid_at: string | null;
};

type ConsentInfo = {
  id: number;
  signed: boolean;
  signed_at: string | null;
  signed_by_name: string;
};

type Appointment = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  treatment_id: number | null;
  treatment_name: string | null;
  treatment_price: number | null;
  doctor_id: number | null;
  doctor_name: string | null;
  doctor_email: string | null;
  payment: PaymentInfo | null;
  medical_record_id: number | null;
  consent: ConsentInfo | null;
};

type FormData = {
  id?: number;
  patient_id: number | '';
  treatment_id: number | '';
  doctor_id: number | '';
  date: string;
  time: string;
  duration_minutes: number;
  status: string;
  notes: string;
};

const empty: FormData = {
  patient_id: '',
  treatment_id: '',
  doctor_id: '',
  date: '',
  time: '',
  duration_minutes: 60,
  status: 'PENDING',
  notes: '',
};

const STATUS_OPTIONS = [
  { value: 'PENDING',     label: 'Pendiente',  color: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-400' },
  { value: 'SCHEDULED',   label: 'Programada', color: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-400' },
  { value: 'CONFIRMED',   label: 'Confirmada', color: 'bg-green-50 text-green-700',   dot: 'bg-green-500' },
  { value: 'IN_PROGRESS', label: 'En curso',   color: 'bg-violet-50 text-violet-700', dot: 'bg-violet-400' },
  { value: 'COMPLETED',   label: 'Completada', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-400' },
  { value: 'CANCELED',    label: 'Cancelada',  color: 'bg-red-50 text-red-600',       dot: 'bg-red-400' },
  { value: 'NO_SHOW',     label: 'No asistió', color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
];

const PAYMENT_STATUS = {
  PENDING:  { label: 'Pendiente', color: 'bg-amber-50 text-amber-700' },
  PAID:     { label: 'Pagado',    color: 'bg-green-50 text-green-700' },
  PARTIAL:  { label: 'Parcial',   color: 'bg-blue-50 text-blue-700' },
  REFUNDED: { label: 'Reembolso',  color: 'bg-gray-100 text-gray-500' },
};

const PAYMENT_METHODS = [
  { value: 'CASH',     label: 'Efectivo' },
  { value: 'CARD',     label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER',    label: 'Otro' },
];

function statusInfo(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? { label: s, color: 'bg-gray-100 text-gray-600' };
}

function toLocal(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return { date, time };
}

function toInputDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toInputTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function AppointmentsAdmin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients]         = useState<Patient[]>([]);
  const [treatments, setTreatments]     = useState<Treatment[]>([]);
  const [doctors, setDoctors]           = useState<Doctor[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  const [statusFilter, setStatusFilter]   = useState('');
  const [dateFilter, setDateFilter]       = useState('');
  const [patientFilter, setPatientFilter] = useState<number | ''>('');

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editing, setEditing]       = useState<FormData | null>(null);
  const [showNewPatient, setShowNewPatient]     = useState(false);
  const [newPatient, setNewPatient]             = useState({ ...EMPTY_NEW_PATIENT });
  const [creatingPatient, setCreatingPatient]   = useState(false);
  const [newPatientError, setNewPatientError]   = useState('');

  const [paymentForm, setPaymentForm]   = useState<Record<number, { amount: string; method: string; status: string; notes: string }>>({});
  const [savingPay, setSavingPay]       = useState<number | null>(null);
  const [transiting, setTransiting]     = useState<number | null>(null);

  const [consentApptId, setConsentApptId]   = useState<number | null>(null);
  const [consentName, setConsentName]       = useState('');
  const [consentDesc, setConsentDesc]       = useState('');
  const [savingConsent, setSavingConsent]   = useState(false);
  const [consentError, setConsentError]     = useState('');

  // Auto-open new form when navigated with ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') openNew();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [historial, setHistorial]             = useState<Appointment[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialExpanded, setHistorialExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {}, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (dateFilter) params.set('date', dateFilter);
      if (patientFilter) params.set('patient_id', String(patientFilter));
      const res = await apiFetch(`/api/appointments/?${params}`);
      const json = await res.json();
      setAppointments(json.appointments || []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, patientFilter]);

  const loadMeta = async () => {
    const [pRes, tRes, dRes] = await Promise.all([
      apiFetch('/api/patients/'),
      apiFetch('/api/treatments/'),
      apiFetch('/api/doctors/'),
    ]);
    setPatients((await pRes.json()).patients || []);
    setTreatments((await tRes.json()).treatments || []);
    setDoctors((await dRes.json()).doctors || []);
  };

  const loadHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      const res = await apiFetch('/api/appointments/?past=1');
      setHistorial((await res.json()).appointments || []);
    } finally {
      setHistorialLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); loadHistorial(); }, [loadHistorial]);

  const openNew = () => {
    setEditing({ ...empty });
    setShowNewPatient(false);
    setNewPatient({ ...EMPTY_NEW_PATIENT });
    setNewPatientError('');
  };

  const openEdit = (a: Appointment) => {
    setShowNewPatient(false);
    setNewPatient({ ...EMPTY_NEW_PATIENT });
    setNewPatientError('');
    const durMs = new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime();
    setEditing({
      id: a.id,
      patient_id: a.patient_id,
      treatment_id: a.treatment_id ?? '',
      doctor_id: a.doctor_id ?? '',
      date: toInputDate(a.starts_at),
      time: toInputTime(a.starts_at),
      duration_minutes: Math.round(durMs / 60000),
      status: a.status,
      notes: a.notes,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.patient_id || !editing.date || !editing.time) {
      setError('Paciente, fecha y hora son obligatorios.');
      return;
    }
    setSaving(true); setError('');
    try {
      const starts = new Date(`${editing.date}T${editing.time}:00`);
      const ends   = new Date(starts.getTime() + editing.duration_minutes * 60000);
      const body = {
        patient_id:   editing.patient_id,
        treatment_id: editing.treatment_id || null,
        doctor_id:    editing.doctor_id || null,
        starts_at:    starts.toISOString(),
        ends_at:      ends.toISOString(),
        status:       editing.status,
        notes:        editing.notes,
      };
      const isNew = !editing.id;
      const url = isNew ? '/api/appointments/' : `/api/appointments/${editing.id}/`;
      const res = await apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || 'Error'); }
      setEditing(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta cita?')) return;
    await apiFetch(`/api/appointments/${id}/`, { method: 'DELETE' });
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleTransition = async (apptId: number, newStatus: string) => {
    setTransiting(apptId);
    try {
      const res = await apiFetch(`/api/appointments/${apptId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const json = await res.json();
        setAppointments((prev) => prev.map((a) => a.id === apptId ? json.appointment : a));
      }
    } finally { setTransiting(null); }
  };

  const handleSavePayment = async (apptId: number) => {
    const form = paymentForm[apptId];
    if (!form) return;
    setSavingPay(apptId);
    try {
      const res = await apiFetch(`/api/appointments/${apptId}/payment/`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(form.amount) || 0,
          method: form.method,
          status: form.status,
          notes:  form.notes,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setAppointments((prev) =>
          prev.map((a) => a.id === apptId ? { ...a, payment: json.payment } : a)
        );
        setPaymentForm((prev) => { const n = { ...prev }; delete n[apptId]; return n; });
      }
    } finally { setSavingPay(null); }
  };

  const initPaymentForm = (a: Appointment) => {
    setPaymentForm((prev) => ({
      ...prev,
      [a.id]: {
        amount: a.payment ? String(a.payment.amount) : (a.treatment_price ? String(a.treatment_price) : ''),
        method: a.payment?.method ?? 'CASH',
        status: a.payment?.status ?? 'PENDING',
        notes:  a.payment?.notes ?? '',
      },
    }));
  };

  const openConsentModal = (a: Appointment) => {
    setConsentApptId(a.id);
    setConsentName(a.patient_name);
    setConsentDesc(a.treatment_name ?? '');
    setConsentError('');
  };

  const handleSaveConsent = async () => {
    if (!consentApptId) return;
    if (!consentName.trim()) { setConsentError('El nombre del firmante es obligatorio.'); return; }
    setSavingConsent(true); setConsentError('');
    try {
      const res = await apiFetch(`/api/appointments/${consentApptId}/consent/`, {
        method: 'POST',
        body: JSON.stringify({ signed_by_name: consentName, procedure_description: consentDesc }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error al registrar consentimiento');
      const data = await res.json();
      setAppointments((prev) =>
        prev.map((a) => a.id === consentApptId ? { ...a, consent: data.consent } : a)
      );
      setConsentApptId(null);
    } catch (e: unknown) {
      setConsentError(e instanceof Error ? e.message : 'Error');
    } finally { setSavingConsent(false); }
  };

  const handleCreatePatient = async () => {
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim()) {
      setNewPatientError('Nombres y apellidos son obligatorios.');
      return;
    }
    setCreatingPatient(true); setNewPatientError('');
    try {
      const res = await apiFetch('/api/patients/', { method: 'POST', body: JSON.stringify(newPatient) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Error al crear paciente');
      const created: Patient = d.patient;
      setPatients((prev) => [...prev, created]);
      setEditing((prev) => prev ? { ...prev, patient_id: created.id } : prev);
      setShowNewPatient(false);
      setNewPatient({ ...EMPTY_NEW_PATIENT });
    } catch (e: unknown) {
      setNewPatientError(e instanceof Error ? e.message : 'Error');
    } finally { setCreatingPatient(false); }
  };

  const onTreatmentChange = (tid: number | '') => {
    const t = treatments.find((t) => t.id === Number(tid));
    setEditing((prev) => prev ? { ...prev, treatment_id: tid, duration_minutes: t?.duration_minutes ?? prev.duration_minutes } : prev);
  };

  /* ── helpers ── */
  const payBadge = (p: PaymentInfo | null) => {
    if (!p) return { label: 'Sin pago', cls: 'bg-gray-100 text-gray-400' };
    const m = PAYMENT_STATUS[p.status as keyof typeof PAYMENT_STATUS];
    return m ? { label: m.label, cls: m.color } : { label: p.status, cls: 'bg-gray-100 text-gray-500' };
  };

  const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-900 rounded-xl"><CalendarDays className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Citas</h1>
            <p className="text-sm text-gray-500">{appointments.length} cita{appointments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Nueva Cita
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
        <select value={patientFilter} onChange={(e) => setPatientFilter(Number(e.target.value) || '')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Todos los pacientes</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
        </select>
        {(statusFilter || dateFilter || patientFilter) && (
          <button onClick={() => { setStatusFilter(''); setDateFilter(''); setPatientFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Limpiar</button>
        )}
      </div>

      {/* Appointment list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay citas registradas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appointments.map((a) => {
              const { date, time } = toLocal(a.starts_at);
              const st  = statusInfo(a.status);
              const pay = payBadge(a.payment);
              const isOpen = expandedId === a.id;
              const pf    = paymentForm[a.id];
              const isSavingPay = savingPay === a.id;
              const isTransiting = transiting === a.id;
              const pastDue = isPast(a.ends_at);

              return (
                <div key={a.id}>
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : a.id)}
                  >
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}

                    {/* Date/time */}
                    <div className="flex-shrink-0 text-center w-14">
                      <p className="text-xs font-semibold text-gray-900">{date.split('/').slice(0,2).join('/')}</p>
                      <p className="text-xs text-gray-400 flex items-center justify-center gap-0.5"><Clock className="w-3 h-3" />{time}</p>
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{a.patient_name}</p>
                      <p className="text-xs text-gray-400 truncate">{a.treatment_name ?? 'Sin servicio'}{a.doctor_name ? ` · ${a.doctor_name}` : ''}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pay.cls}`}>{pay.label}</span>
                      {a.consent ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.consent.signed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                          {a.consent.signed ? 'Firmado' : 'Sin firmar'}
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Sin consent.</span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.medical_record_id ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                        {a.medical_record_id ? 'HC ✓' : 'Sin HC'}
                      </span>
                    </div>

                    {/* Actions - stop propagation */}
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(a.status) && (
                        <button onClick={() => openEdit(a)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded panel */}
                  {isOpen && (
                    <div className="px-5 pb-5 bg-gray-50/40 border-t border-gray-100 space-y-4 pt-4">

                      {/* Detail grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                          <p className="text-xs text-gray-400 mb-0.5">Paciente</p>
                          <p className="text-sm font-medium text-gray-900">{a.patient_name}</p>
                          {a.patient_phone && <p className="text-xs text-gray-400">{a.patient_phone}</p>}
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                          <p className="text-xs text-gray-400 mb-0.5">Servicio</p>
                          <p className="text-sm font-medium text-gray-900">{a.treatment_name ?? '—'}</p>
                          {a.treatment_price != null && <p className="text-xs text-gray-400">${a.treatment_price.toLocaleString()}</p>}
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                          <p className="text-xs text-gray-400 mb-0.5">Médico</p>
                          <p className="text-sm font-medium text-gray-900">{a.doctor_name ?? '—'}</p>
                          {a.doctor_email && <p className="text-xs text-gray-400 truncate">{a.doctor_email}</p>}
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                          <p className="text-xs text-gray-400 mb-0.5">Fecha y hora</p>
                          <p className="text-sm font-medium text-gray-900">{date}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{time}</p>
                        </div>
                      </div>

                      {a.notes && (
                        <div className="bg-white rounded-xl border border-gray-100 px-3 py-2.5">
                          <p className="text-xs text-gray-400 mb-0.5">Notas</p>
                          <p className="text-sm text-gray-700 whitespace-pre-line">{a.notes}</p>
                        </div>
                      )}

                      {/* Linked modules row */}
                      <div className="grid grid-cols-3 gap-3">

                        {/* Payment panel */}
                        <div className={`rounded-xl border px-3 py-3 ${a.payment ? 'bg-white border-gray-100' : 'bg-amber-50/40 border-amber-100'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5" /> Pago
                            </p>
                            {!pf && (
                              <button onClick={() => initPaymentForm(a)}
                                className="text-xs text-blue-600 hover:underline">{a.payment ? 'Editar' : 'Registrar'}</button>
                            )}
                          </div>
                          {a.payment && !pf ? (
                            <>
                              <p className="text-sm font-semibold text-gray-900">${a.payment.amount.toLocaleString()}</p>
                              <p className="text-xs text-gray-400">{PAYMENT_METHODS.find((m) => m.value === a.payment!.method)?.label ?? a.payment.method}</p>
                              <span className={`mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${PAYMENT_STATUS[a.payment.status as keyof typeof PAYMENT_STATUS]?.color ?? 'bg-gray-100 text-gray-500'}`}>
                                {PAYMENT_STATUS[a.payment.status as keyof typeof PAYMENT_STATUS]?.label ?? a.payment.status}
                              </span>
                            </>
                          ) : !pf ? (
                            <p className="text-xs text-gray-400">Sin pago registrado</p>
                          ) : null}
                          {pf && (
                            <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                              <input type="number" placeholder="Monto" value={pf.amount}
                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, [a.id]: { ...prev[a.id], amount: e.target.value } }))}
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-900" />
                              <select value={pf.method}
                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, [a.id]: { ...prev[a.id], method: e.target.value } }))}
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-gray-900">
                                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </select>
                              <select value={pf.status}
                                onChange={(e) => setPaymentForm((prev) => ({ ...prev, [a.id]: { ...prev[a.id], status: e.target.value } }))}
                                className="w-full px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-gray-900">
                                {Object.entries(PAYMENT_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                              </select>
                              <div className="flex gap-1 pt-0.5">
                                <button onClick={() => handleSavePayment(a.id)} disabled={isSavingPay}
                                  className="flex-1 flex items-center justify-center gap-1 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
                                  {isSavingPay ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Guardar
                                </button>
                                <button onClick={() => setPaymentForm((prev) => { const n = { ...prev }; delete n[a.id]; return n; })}
                                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Consent panel */}
                        <div className={`rounded-xl border px-3 py-3 ${a.consent?.signed ? 'bg-white border-gray-100' : 'bg-amber-50/40 border-amber-100'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                              <FileSignature className="w-3.5 h-3.5" /> Consentimiento
                            </p>
                            {!a.consent?.signed && !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(a.status) && (
                              <button onClick={(e) => { e.stopPropagation(); openConsentModal(a); }}
                                className="text-xs text-indigo-600 hover:underline font-medium">Firmar</button>
                            )}
                          </div>
                          {a.consent ? (
                            <>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.consent.signed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                {a.consent.signed ? 'Firmado' : 'Pendiente de firma'}
                              </span>
                              {a.consent.signed_by_name && <p className="text-xs text-gray-400 mt-1">{a.consent.signed_by_name}</p>}
                            </>
                          ) : (
                            <p className="text-xs text-gray-400">Sin consentimiento</p>
                          )}
                          <button onClick={() => navigate('/admin/consents')}
                            className="mt-2 text-xs text-blue-600 hover:underline block">Ver consentimientos →</button>
                        </div>

                        {/* Historia clínica panel */}
                        <div className={`rounded-xl border px-3 py-3 ${a.medical_record_id ? 'bg-white border-gray-100' : 'bg-gray-50 border-gray-100'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                              <ClipboardList className="w-3.5 h-3.5" /> Historia Clínica
                            </p>
                            {['CONFIRMED', 'IN_PROGRESS'].includes(a.status) && (
                              <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/appointments/${a.id}/complete`); }}
                                className="text-xs text-indigo-600 hover:underline font-medium">
                                {a.medical_record_id ? 'Editar HC' : 'Crear HC'}
                              </button>
                            )}
                          </div>
                          {a.medical_record_id ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">HC #{a.medical_record_id}</span>
                          ) : (
                            <p className="text-xs text-gray-400">Sin registro clínico</p>
                          )}
                          <button onClick={() => navigate(`/admin/patients/${a.patient_id}`)}
                            className="mt-2 text-xs text-blue-600 hover:underline block">Ver perfil paciente →</button>
                        </div>
                      </div>

                      {/* ── Status action buttons ── */}
                      <div className="flex flex-wrap items-center gap-2 pt-2">

                        {/* PENDING → SCHEDULED */}
                        {a.status === 'PENDING' && (
                          <button onClick={() => handleTransition(a.id, 'SCHEDULED')} disabled={isTransiting}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors">
                            {isTransiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Programar
                          </button>
                        )}

                        {/* SCHEDULED → CONFIRMED (requires payment + consent + doctor) */}
                        {a.status === 'SCHEDULED' && (() => {
                          const hasPay = a.payment && ['PAID', 'PARTIAL'].includes(a.payment.status);
                          const hasCon = a.consent?.signed;
                          const hasDoc = !!a.doctor_id;
                          const canConfirm = hasPay && hasCon && hasDoc;
                          return (
                            <>
                              {!hasPay && <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">⚠ Falta pago</span>}
                              {!hasCon && <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">⚠ Falta consentimiento</span>}
                              {!hasDoc && <span className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">⚠ Falta médico</span>}
                              <button onClick={() => handleTransition(a.id, 'CONFIRMED')} disabled={isTransiting || !canConfirm}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                                title={!canConfirm ? 'Registre pago, consentimiento y médico primero' : ''}>
                                {isTransiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Confirmar
                              </button>
                            </>
                          );
                        })()}

                        {/* CONFIRMED → IN_PROGRESS (only within time window) */}
                        {a.status === 'CONFIRMED' && (() => {
                          const now = Date.now();
                          const windowStart = new Date(a.starts_at).getTime() - 15 * 60 * 1000;
                          const windowEnd = new Date(a.ends_at).getTime();
                          const inWindow = now >= windowStart && now <= windowEnd;
                          const tooEarly = now < windowStart;
                          const minsLeft = tooEarly ? Math.ceil((windowStart - now) / 60000) : 0;
                          return (
                            <>
                              {tooEarly && (
                                <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                                  Disponible en {minsLeft} min
                                </span>
                              )}
                              {!tooEarly && !inWindow && (
                                <span className="text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                  Ventana expirada
                                </span>
                              )}
                              <button onClick={() => handleTransition(a.id, 'IN_PROGRESS')} disabled={isTransiting || !inWindow}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                                title={!inWindow ? (tooEarly ? `Puede iniciar desde 15 min antes (faltan ${minsLeft} min)` : 'Ventana expirada') : ''}>
                                {isTransiting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />} Iniciar Procedimiento
                              </button>
                            </>
                          );
                        })()}

                        {/* IN_PROGRESS → redirect to complete page */}
                        {a.status === 'IN_PROGRESS' && (
                          <button onClick={() => navigate(`/admin/appointments/${a.id}/complete`)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors">
                            <ClipboardList className="w-4 h-4" /> Finalizar — Completar HC
                          </button>
                        )}

                        {/* COMPLETED → view patient profile */}
                        {a.status === 'COMPLETED' && (
                          <button onClick={() => navigate(`/admin/patients/${a.patient_id}`)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
                            <CheckCircle2 className="w-4 h-4" /> Ver historial
                          </button>
                        )}

                        {/* NO_SHOW from SCHEDULED (past due) or CONFIRMED */}
                        {((a.status === 'SCHEDULED' && pastDue) || a.status === 'CONFIRMED') && (
                          <button onClick={() => {
                            if (confirm('¿Marcar como no asistió?' + (a.status === 'CONFIRMED' ? ' Podrá reagendar después.' : ''))) {
                              handleTransition(a.id, 'NO_SHOW');
                            }
                          }} disabled={isTransiting}
                            className="flex items-center gap-2 px-3 py-2 text-amber-700 border border-amber-200 bg-amber-50 text-sm font-medium rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors">
                            <UserX className="w-4 h-4" /> No asistió
                          </button>
                        )}

                        {/* Reschedule option for NO_SHOW */}
                        {a.status === 'NO_SHOW' && (
                          <button onClick={() => {
                            setEditing({
                              patient_id: a.patient_id,
                              treatment_id: a.treatment_id ?? '',
                              doctor_id: a.doctor_id ?? '',
                              date: '', time: '',
                              duration_minutes: Math.round((new Date(a.ends_at).getTime() - new Date(a.starts_at).getTime()) / 60000),
                              status: 'PENDING',
                              notes: `Reagendada (original: ${toLocal(a.starts_at).date})`,
                            });
                          }}
                            className="flex items-center gap-2 px-3 py-2 text-blue-700 border border-blue-200 bg-blue-50 text-sm font-medium rounded-xl hover:bg-blue-100 transition-colors">
                            <CalendarPlus className="w-4 h-4" /> Reagendar
                          </button>
                        )}

                        {/* CANCEL — admin only, before COMPLETED */}
                        {isAdmin && !['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(a.status) && (
                          <button onClick={() => {
                            if (confirm('¿Cancelar esta cita?')) handleTransition(a.id, 'CANCELED');
                          }} disabled={isTransiting}
                            className="flex items-center gap-2 px-3 py-2 text-red-600 border border-red-200 bg-red-50 text-sm font-medium rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors">
                            <Ban className="w-4 h-4" /> Cancelar
                          </button>
                        )}

                        <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial colapsable */}
      <div>
        <button onClick={() => setHistorialExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50/50 transition-colors">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Historial</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{historial.length}</span>
          </div>
          {historialExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>
        {historialExpanded && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 divide-y divide-gray-50">
            {historialLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
            ) : historial.length === 0 ? (
              <div className="py-8 text-center"><p className="text-gray-400 text-sm">Sin registros</p></div>
            ) : historial.map((a) => {
              const { date, time } = toLocal(a.starts_at);
              const st = statusInfo(a.status);
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-shrink-0 text-xs text-gray-400 w-20">
                    <p>{date.split('/').slice(0,2).join('/')}</p>
                    <p className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{a.patient_name}</p>
                    <p className="text-xs text-gray-400 truncate">{a.treatment_name ?? '—'}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Editar Cita' : 'Nueva Cita'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              {/* Patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente <span className="text-red-500">*</span></label>
                <select value={editing.patient_id}
                  onChange={(e) => {
                    if (e.target.value === '__new__') { setShowNewPatient(true); setEditing({ ...editing, patient_id: '' }); }
                    else { setShowNewPatient(false); setEditing({ ...editing, patient_id: Number(e.target.value) || '' }); }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="">Selecciona un paciente</option>
                  <option value="__new__">✚ Nuevo paciente…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}{p.email ? ` — ${p.email}` : ''}</option>)}
                </select>
                {showNewPatient && (
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase"><UserPlus className="w-3.5 h-3.5" /> Nuevo paciente</span>
                      <button type="button" onClick={() => { setShowNewPatient(false); setNewPatientError(''); }} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    {newPatientError && <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{newPatientError}</p>}
                    <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo doc.</label>
                        <select value={newPatient.document_type} onChange={(e) => setNewPatient({ ...newPatient, document_type: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                          <option value="">—</option>
                          {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                        <input type="text" value={newPatient.document_number} onChange={(e) => setNewPatient({ ...newPatient, document_number: e.target.value })}
                          placeholder="12345678" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombres <span className="text-red-500">*</span></label>
                        <input type="text" value={newPatient.first_name} onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                          placeholder="Nombres" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos <span className="text-red-500">*</span></label>
                        <input type="text" value={newPatient.last_name} onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                          placeholder="Apellidos" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                        <input type="tel" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                          placeholder="300 000 0000" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                        <input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                          placeholder="correo@email.com" className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>
                    <button type="button" onClick={handleCreatePatient} disabled={creatingPatient}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {creatingPatient ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Crear y seleccionar
                    </button>
                  </div>
                )}
              </div>

              {/* Treatment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
                <select value={editing.treatment_id} onChange={(e) => onTreatmentChange(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="">Sin tratamiento</option>
                  {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Doctor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Médico</label>
                <select value={editing.doctor_id} onChange={(e) => setEditing({ ...editing, doctor_id: Number(e.target.value) || '' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                  <option value="">Sin médico asignado</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : d.email}</option>)}
                </select>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                  <input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora <span className="text-red-500">*</span></label>
                  <input type="time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
                </div>
              </div>

              {/* Duration + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                  <input type="number" min={5} step={5} value={editing.duration_minutes}
                    onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) || 60 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Observaciones opcionales…" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Guardar cambios' : 'Crear cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent signing modal */}
      {consentApptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConsentApptId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-indigo-600" /> Firmar Consentimiento
              </h2>
              <button onClick={() => setConsentApptId(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {consentError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{consentError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del firmante <span className="text-red-500">*</span></label>
                <input type="text" value={consentName} onChange={(e) => setConsentName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Procedimiento</label>
                <input type="text" value={consentDesc} onChange={(e) => setConsentDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Descripción del procedimiento" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setConsentApptId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleSaveConsent} disabled={savingConsent}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {savingConsent ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
                Firmar Consentimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
