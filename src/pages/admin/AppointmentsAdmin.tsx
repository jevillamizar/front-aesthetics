import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { AtenderModal } from '../../components/AtenderModal';
import {
  CalendarDays, ChevronDown, ChevronUp, Clock, Loader2, Pencil, Plus, Save, Stethoscope, Trash2, UserPlus, X,
} from 'lucide-react';

type Patient = { id: number; first_name: string; last_name: string; email: string; phone: string };

const DOC_TYPES = [
  { value: 'CC',  label: 'CC — Cédula de Ciudadanía' },
  { value: 'CE',  label: 'CE — Cédula de Extranjería' },
  { value: 'TI',  label: 'TI — Tarjeta de Identidad' },
  { value: 'PP',  label: 'PP — Pasaporte' },
  { value: 'RC',  label: 'RC — Registro Civil' },
  { value: 'NIT', label: 'NIT' },
];

const EMPTY_NEW_PATIENT = { document_type: '', document_number: '', first_name: '', last_name: '', phone: '', email: '' };
type Treatment = { id: number; name: string; duration_minutes: number };

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
  doctor_id: number | null;
  doctor_email: string | null;
};

type FormData = {
  id?: number;
  patient_id: number | '';
  treatment_id: number | '';
  date: string;
  time: string;
  duration_minutes: number;
  status: string;
  notes: string;
};

const empty: FormData = {
  patient_id: '',
  treatment_id: '',
  date: '',
  time: '',
  duration_minutes: 60,
  status: 'SCHEDULED',
  notes: '',
};

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Programada', color: 'bg-blue-50 text-blue-700' },
  { value: 'CONFIRMED', label: 'Confirmada', color: 'bg-green-50 text-green-700' },
  { value: 'COMPLETED', label: 'Completada', color: 'bg-gray-100 text-gray-600' },
  { value: 'CANCELED',  label: 'Cancelada',  color: 'bg-red-50 text-red-600' },
  { value: 'NO_SHOW',   label: 'No asistió', color: 'bg-amber-50 text-amber-700' },
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [patientFilter, setPatientFilter] = useState<number | ''>('');

  const [editing, setEditing] = useState<FormData | null>(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ ...EMPTY_NEW_PATIENT });
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatientError, setNewPatientError] = useState('');
  const [atenderApptId, setAtenderApptId] = useState<number | null>(null);
  const [historial, setHistorial] = useState<Appointment[]>([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialExpanded, setHistorialExpanded] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(Date.now()), 60_000);
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
    const [pRes, tRes] = await Promise.all([
      apiFetch('/api/patients/'),
      apiFetch('/api/treatments/'),
    ]);
    const pJson = await pRes.json();
    const tJson = await tRes.json();
    setPatients(pJson.patients || []);
    setTreatments(tJson.treatments || []);
  };

  const loadHistorial = useCallback(async () => {
    setHistorialLoading(true);
    try {
      const res = await apiFetch('/api/appointments/?past=1');
      const json = await res.json();
      setHistorial(json.appointments || []);
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
    setSaving(true);
    setError('');
    try {
      const starts = new Date(`${editing.date}T${editing.time}:00`);
      const ends = new Date(starts.getTime() + editing.duration_minutes * 60000);

      const body = {
        patient_id: editing.patient_id,
        treatment_id: editing.treatment_id || null,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: editing.status,
        notes: editing.notes,
      };

      const isNew = !editing.id;
      const url = isNew ? '/api/appointments/' : `/api/appointments/${editing.id}/`;
      const res = await apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      setEditing(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleAtender = (id: number) => {
    setAtenderApptId(id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta cita?')) return;
    await apiFetch(`/api/appointments/${id}/`, { method: 'DELETE' });
    await load();
  };

  const handleCreatePatient = async () => {
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim()) {
      setNewPatientError('Nombres y apellidos son obligatorios.');
      return;
    }
    setCreatingPatient(true);
    setNewPatientError('');
    try {
      const res = await apiFetch('/api/patients/', {
        method: 'POST',
        body: JSON.stringify(newPatient),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Error al crear paciente');
      const created: Patient = d.patient;
      setPatients((prev) => [...prev, created]);
      setEditing((prev) => prev ? { ...prev, patient_id: created.id } : prev);
      setShowNewPatient(false);
      setNewPatient({ ...EMPTY_NEW_PATIENT });
    } catch (e: unknown) {
      setNewPatientError(e instanceof Error ? e.message : 'Error');
    } finally {
      setCreatingPatient(false);
    }
  };

  const onTreatmentChange = (tid: number | '') => {
    const t = treatments.find((t) => t.id === Number(tid));
    setEditing((prev) => prev ? {
      ...prev,
      treatment_id: tid,
      duration_minutes: t?.duration_minutes ?? prev.duration_minutes,
    } : prev);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Citas</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestiona la agenda de la clínica</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Cita
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select
          value={patientFilter}
          onChange={(e) => setPatientFilter(Number(e.target.value) || '')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="">Todos los pacientes</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>
          ))}
        </select>
        {(statusFilter || dateFilter || patientFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setDateFilter(''); setPatientFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay citas registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Hora</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Paciente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Tratamiento</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((a) => {
                  const { date, time } = toLocal(a.starts_at);
                  const st = statusInfo(a.status);
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-4 py-3 text-gray-700">{date}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <Clock className="w-3.5 h-3.5" />{time}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{a.patient_name}</p>
                        <p className="text-xs text-gray-400">{a.patient_email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.treatment_name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          {(() => {
                            const startsMs = new Date(a.starts_at).getTime();
                            const canAtender = now >= startsMs - 15 * 60 * 1000
                              && ['SCHEDULED', 'CONFIRMED'].includes(a.status);
                            return canAtender ? (
                              <button
                                onClick={() => handleAtender(a.id)}
                                className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Atender cita"
                              >
                                <Stethoscope className="w-4 h-4" />
                              </button>
                            ) : null;
                          })()}
                          {!['CONFIRMED', 'COMPLETED'].includes(a.status) && (
                            <button
                              onClick={() => openEdit(a)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(a.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="mt-8">
        <button
          onClick={() => setHistorialExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-white rounded-xl border border-gray-200 hover:bg-gray-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Historial de Citas</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{historial.length}</span>
          </div>
          {historialExpanded
            ? <ChevronUp className="w-4 h-4 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {historialExpanded && (
          <div className="bg-white rounded-b-xl border border-t-0 border-gray-200 overflow-hidden">
            {historialLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : historial.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-gray-400 text-sm">Sin registros en el historial</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Hora</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Paciente</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Tratamiento</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historial.map((a) => {
                      const { date, time } = toLocal(a.starts_at);
                      const st = statusInfo(a.status);
                      return (
                        <tr key={a.id} className="hover:bg-gray-50/40 transition-colors">
                          <td className="px-4 py-3 text-gray-700">{date}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-gray-500">
                              <Clock className="w-3.5 h-3.5" />{time}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">{a.patient_name}</p>
                            <p className="text-xs text-gray-400">{a.patient_email}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{a.treatment_name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{a.notes || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing.id ? 'Editar Cita' : 'Nueva Cita'}
              </h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>
              )}

              {/* Patient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente <span className="text-red-500">*</span></label>
                <select
                  value={editing.patient_id}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setShowNewPatient(true);
                      setEditing({ ...editing, patient_id: '' });
                    } else {
                      setShowNewPatient(false);
                      setEditing({ ...editing, patient_id: Number(e.target.value) || '' });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">Selecciona un paciente</option>
                  <option value="__new__">✚ Nuevo paciente…</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.last_name}, {p.first_name} {p.email ? `— ${p.email}` : ''}
                    </option>
                  ))}
                </select>

                {/* Inline new-patient mini-form */}
                {showNewPatient && (
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        <UserPlus className="w-3.5 h-3.5" /> Nuevo paciente
                      </span>
                      <button type="button" onClick={() => { setShowNewPatient(false); setNewPatientError(''); }}
                        className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {newPatientError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">{newPatientError}</p>
                    )}

                    <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Tipo doc.</label>
                        <select value={newPatient.document_type}
                          onChange={(e) => setNewPatient({ ...newPatient, document_type: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                          <option value="">—</option>
                          {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                        <input type="text" value={newPatient.document_number}
                          onChange={(e) => setNewPatient({ ...newPatient, document_number: e.target.value })}
                          placeholder="12345678"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombres <span className="text-red-500">*</span></label>
                        <input type="text" value={newPatient.first_name}
                          onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                          placeholder="Nombres"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Apellidos <span className="text-red-500">*</span></label>
                        <input type="text" value={newPatient.last_name}
                          onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                          placeholder="Apellidos"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
                        <input type="tel" value={newPatient.phone}
                          onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                          placeholder="300 000 0000"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Correo</label>
                        <input type="email" value={newPatient.email}
                          onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                          placeholder="correo@email.com"
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>

                    <button type="button" onClick={handleCreatePatient} disabled={creatingPatient}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {creatingPatient
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <UserPlus className="w-3.5 h-3.5" />}
                      Crear y seleccionar
                    </button>
                  </div>
                )}
              </div>

              {/* Treatment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tratamiento</label>
                <select
                  value={editing.treatment_id}
                  onChange={(e) => onTreatmentChange(Number(e.target.value) || '')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">Sin tratamiento</option>
                  {treatments.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    value={editing.time}
                    onChange={(e) => setEditing({ ...editing, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  />
                </div>
              </div>

              {/* Duration + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={editing.duration_minutes}
                    onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) || 60 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={editing.status}
                    onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Observaciones opcionales…"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Guardar cambios' : 'Crear cita'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AtenderModal
        appointmentId={atenderApptId}
        onClose={() => setAtenderApptId(null)}
        onDone={() => { load(); loadHistorial(); }}
      />
    </div>
  );
}
