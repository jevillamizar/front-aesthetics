import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { CalendarDays, Loader2, Save, UserPlus, X } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

type Patient   = { id: number; first_name: string; last_name: string; email: string; phone: string };
type Treatment = { id: number; name: string; duration_minutes: number; price?: number };
type Doctor    = { id: number; first_name: string; last_name: string; email: string };

type FormData = {
  patient_id: number | '';
  treatment_id: number | '';
  doctor_id: number | '';
  date: string;
  time: string;
  duration_minutes: number;
  status: string;
  notes: string;
};

const EMPTY: FormData = {
  patient_id: '', treatment_id: '', doctor_id: '',
  date: '', time: '', duration_minutes: 60, status: 'PENDING', notes: '',
};

const EMPTY_PATIENT = {
  first_name: '', last_name: '', email: '', phone: '',
  doc_type: 'CC', doc_number: '',
};

const DOC_TYPES = [
  { value: 'CC', label: 'CC — Cédula' },
  { value: 'CE', label: 'CE — Cédula Extranjería' },
  { value: 'TI', label: 'TI — Tarjeta Identidad' },
  { value: 'PP', label: 'PP — Pasaporte' },
  { value: 'NIT', label: 'NIT' },
];

/* ── Props ─────────────────────────────────────────────────────────── */

type Props = {
  onClose: () => void;
  onCreated?: () => void;
  /** Pre-fill date (YYYY-MM-DD) when clicking a day on the calendar */
  defaultDate?: string;
};

/* ── Component ─────────────────────────────────────────────────────── */

export function NewAppointmentModal({ onClose, onCreated, defaultDate }: Props) {
  const [form, setForm] = useState<FormData>({ ...EMPTY, date: defaultDate ?? '' });
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [doctors, setDoctors]       = useState<Doctor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const [showNewPatient, setShowNewPatient]   = useState(false);
  const [newPatient, setNewPatient]           = useState({ ...EMPTY_PATIENT });
  const [creatingPat, setCreatingPat]         = useState(false);
  const [newPatientError, setNewPatientError] = useState('');

  // Load meta once
  useEffect(() => {
    Promise.all([
      apiFetch('/api/patients/').then(r => r.json()),
      apiFetch('/api/treatments/').then(r => r.json()),
      apiFetch('/api/doctors/').then(r => r.json()),
    ]).then(([p, t, d]) => {
      setPatients(p.patients ?? []);
      setTreatments(t.treatments ?? []);
      setDoctors(d.doctors ?? []);
    }).finally(() => setLoading(false));
  }, []);

  const setF = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const onTreatmentChange = (tid: number | '') => {
    const t = treatments.find(t => t.id === Number(tid));
    setForm(prev => ({ ...prev, treatment_id: tid, duration_minutes: t?.duration_minutes ?? prev.duration_minutes }));
  };

  const handleCreatePatient = useCallback(async () => {
    if (!newPatient.first_name.trim() || !newPatient.last_name.trim()) {
      setNewPatientError('Nombres y apellidos son obligatorios.'); return;
    }
    setCreatingPat(true); setNewPatientError('');
    try {
      const res = await apiFetch('/api/patients/', { method: 'POST', body: JSON.stringify(newPatient) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Error al crear paciente');
      const created: Patient = d.patient;
      setPatients(prev => [...prev, created]);
      setForm(prev => ({ ...prev, patient_id: created.id }));
      setShowNewPatient(false);
      setNewPatient({ ...EMPTY_PATIENT });
    } catch (e: unknown) {
      setNewPatientError(e instanceof Error ? e.message : 'Error');
    } finally { setCreatingPat(false); }
  }, [newPatient]);

  const handleSave = async () => {
    if (!form.patient_id) { setError('Selecciona un paciente.'); return; }
    if (!form.date || !form.time) { setError('Fecha y hora son obligatorias.'); return; }
    setSaving(true); setError('');
    try {
      const starts_at = new Date(`${form.date}T${form.time}`).toISOString();
      const ends_at   = new Date(new Date(starts_at).getTime() + form.duration_minutes * 60000).toISOString();
      const body = {
        patient_id:       form.patient_id,
        treatment_id:     form.treatment_id || null,
        doctor_id:        form.doctor_id || null,
        starts_at, ends_at,
        status:           form.status,
        notes:            form.notes,
      };
      const res = await apiFetch('/api/appointments/', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error al crear cita');
      onCreated?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gray-400" /> Nueva Cita
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

            {/* Patient */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Paciente <span className="text-red-500">*</span></label>
              <select value={form.patient_id}
                onChange={(e) => {
                  if (e.target.value === '__new__') { setShowNewPatient(true); setForm(p => ({ ...p, patient_id: '' })); }
                  else { setShowNewPatient(false); setForm(p => ({ ...p, patient_id: Number(e.target.value) || '' })); }
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="">Selecciona un paciente</option>
                <option value="__new__">+ Nuevo paciente</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.phone || p.email}</option>
                ))}
              </select>

              {/* Inline new patient form */}
              {showNewPatient && (
                <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">Nuevo paciente</p>
                    <button onClick={() => setShowNewPatient(false)} className="p-1 hover:bg-gray-200 rounded"><X className="w-3 h-3 text-gray-500" /></button>
                  </div>
                  {newPatientError && <p className="text-xs text-red-600">{newPatientError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Nombres *" value={newPatient.first_name} onChange={e => setNewPatient({ ...newPatient, first_name: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    <input placeholder="Apellidos *" value={newPatient.last_name} onChange={e => setNewPatient({ ...newPatient, last_name: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    <select value={newPatient.doc_type} onChange={e => setNewPatient({ ...newPatient, doc_type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                      {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <input placeholder="Nro. documento" value={newPatient.doc_number} onChange={e => setNewPatient({ ...newPatient, doc_number: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    <input placeholder="Teléfono" value={newPatient.phone} onChange={e => setNewPatient({ ...newPatient, phone: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    <input type="email" placeholder="Email" value={newPatient.email} onChange={e => setNewPatient({ ...newPatient, email: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                  <button onClick={handleCreatePatient} disabled={creatingPat}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                    {creatingPat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Crear y seleccionar
                  </button>
                </div>
              )}
            </div>

            {/* Treatment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Procedimiento</label>
              <select value={form.treatment_id} onChange={e => onTreatmentChange(Number(e.target.value) || '')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="">Sin procedimiento</option>
                {treatments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Doctor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Médico</label>
              <select value={form.doctor_id} onChange={setF('doctor_id')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="">Sin médico asignado</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : d.email}</option>
                ))}
              </select>
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha <span className="text-red-500">*</span></label>
                <input type="date" value={form.date} onChange={setF('date')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora <span className="text-red-500">*</span></label>
                <input type="time" value={form.time} onChange={setF('time')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
              <input type="number" min={5} step={5} value={form.duration_minutes}
                onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) || 60 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea value={form.notes} onChange={setF('notes')} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                placeholder="Observaciones opcionales…" />
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Crear Cita
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
