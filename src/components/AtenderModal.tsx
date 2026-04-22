import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  Calendar, Clock, Loader2, Phone, Mail, User, X,
  CheckCircle, DollarSign, FileSignature, ClipboardList, Ban, Stethoscope, AlertTriangle,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────── */

type PaymentInfo = {
  id: number; amount: number; method: string; status: string;
  notes: string; paid_at: string | null;
};
type ConsentInfo = {
  id: number; signed: boolean; signed_at: string | null; signed_by_name: string;
};
type ApptDetail = {
  id: number; starts_at: string; ends_at: string; status: string; notes: string;
  patient_id: number; patient_name: string; patient_email: string; patient_phone: string;
  treatment_id: number | null; treatment_name: string | null; treatment_price: number | null;
  doctor_id: number | null; doctor_name: string | null; doctor_email: string | null;
  payment: PaymentInfo | null; medical_record_id: number | null; consent: ConsentInfo | null;
};
type DoctorOption = { id: number; first_name: string; last_name: string; specialty: string };
type DoctorSlot = {
  id: number; starts_at: string; ends_at: string; status: string;
  patient_name: string; treatment_name: string | null;
};

/* ── Constants ──────────────────────────────────────────────────── */

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SCHEDULED:   { label: 'Programada',  color: 'bg-blue-50 text-blue-700' },
  CONFIRMED:   { label: 'Confirmada',  color: 'bg-green-50 text-green-700' },
  IN_PROGRESS: { label: 'En curso',    color: 'bg-indigo-50 text-indigo-700' },
  COMPLETED:   { label: 'Completada',  color: 'bg-gray-100 text-gray-600' },
  CANCELED:    { label: 'Cancelada',   color: 'bg-red-50 text-red-600' },
  NO_SHOW:     { label: 'No asistió',  color: 'bg-amber-50 text-amber-700' },
};

const PAY_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
];

function fmt(iso: string, type: 'date' | 'time') {
  const d = new Date(iso);
  if (type === 'date')
    return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function cop(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

/* ── Shared patient/appointment info block ──────────────────────── */

function ApptInfo({ appt }: { appt: ApptDetail }) {
  const st = STATUS_LABELS[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600' };
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-gray-900 font-semibold">
          <User className="w-4 h-4 text-gray-400" /> {appt.patient_name}
        </div>
        {appt.patient_email && (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" /> {appt.patient_email}</div>
        )}
        {appt.patient_phone && (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" /> {appt.patient_phone}</div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="capitalize">{fmt(appt.starts_at, 'date')}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400" />
          {fmt(appt.starts_at, 'time')} — {fmt(appt.ends_at, 'time')}
        </div>
        {appt.treatment_name && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Tratamiento:</span> {appt.treatment_name}
            {appt.treatment_price != null && (
              <span className="text-gray-400 ml-1">({cop(appt.treatment_price)})</span>
            )}
          </div>
        )}
        {appt.doctor_name && (
          <div className="text-sm text-gray-600"><span className="font-medium">Médico:</span> {appt.doctor_name}</div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Estado:</span>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   SCHEDULED → CONFIRMED  (Pago + Consentimiento)
   ================================================================ */

function ConfirmPanel({ appt, onDone, onClose }: { appt: ApptDetail; onDone: () => void; onClose: () => void }) {
  const [payAmount, setPayAmount] = useState(appt.treatment_price?.toString() ?? '0');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payStatus, setPayStatus] = useState('PAID');
  const [payNotes, setPayNotes] = useState('');

  const [consentName, setConsentName] = useState(appt.patient_name);
  const [consentDesc, setConsentDesc] = useState(appt.treatment_name ?? '');

  // Doctor assignment
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>(appt.doctor_id ?? '');
  const [doctorSlots, setDoctorSlots] = useState<DoctorSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState('');

  const paymentDone = appt.payment && ['PAID', 'PARTIAL'].includes(appt.payment.status);
  const consentDone = appt.consent?.signed;

  // Fetch doctors list
  useEffect(() => {
    apiFetch('/api/doctors/')
      .then(r => r.json())
      .then(d => setDoctors((d.doctors || []).filter((doc: DoctorOption & { is_active?: boolean }) => doc.is_active !== false)))
      .catch(() => {});
  }, []);

  // Fetch selected doctor's agenda for the appointment date
  const apptDate = appt.starts_at.slice(0, 10);
  useEffect(() => {
    if (!selectedDoctorId) { setDoctorSlots([]); return; }
    setLoadingSlots(true);
    apiFetch(`/api/doctors/${selectedDoctorId}/availability/?date=${apptDate}`)
      .then(r => r.json())
      .then(d => setDoctorSlots(d.appointments || []))
      .catch(() => setDoctorSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctorId, apptDate]);

  // Check if selected doctor has a conflict with this appointment's time slot
  const apptStart = new Date(appt.starts_at).getTime();
  const apptEnd = new Date(appt.ends_at).getTime();
  const BUFFER_MS = 5 * 60 * 1000;
  const hasConflict = doctorSlots.some(s => {
    if (s.id === appt.id) return false;
    const sStart = new Date(s.starts_at).getTime();
    const sEnd = new Date(s.ends_at).getTime();
    return sStart < apptEnd + BUFFER_MS && sEnd > apptStart - BUFFER_MS;
  });

  const handleConfirm = async () => {
    if (!selectedDoctorId) { setError('Debe seleccionar un médico.'); return; }
    if (hasConflict) { setError('El médico tiene un conflicto de horario. Seleccione otro.'); return; }
    setSaving(true);
    setError('');
    try {
      if (!paymentDone) {
        const r = await apiFetch(`/api/appointments/${appt.id}/payment/`, {
          method: 'POST',
          body: JSON.stringify({ amount: parseFloat(payAmount) || 0, method: payMethod, status: payStatus, notes: payNotes }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al registrar pago');
      }
      if (!consentDone) {
        const r = await apiFetch(`/api/appointments/${appt.id}/consent/`, {
          method: 'POST',
          body: JSON.stringify({ signed_by_name: consentName, procedure_description: consentDesc }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al registrar consentimiento');
      }
      const r = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'CONFIRMED', doctor_id: selectedDoctorId }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al confirmar');
      onDone(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    setCanceling(true); setError('');
    try {
      const r = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'CANCELED' }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al cancelar');
      onDone(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setCanceling(false); }
  };

  return (
    <>
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />

        {/* Doctor assignment */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <Stethoscope className="w-4 h-4 text-violet-600" /> Médico <span className="text-red-500 text-xs">*</span>
            {appt.doctor_name && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full ml-auto">Asignado</span>}
          </div>
          <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(Number(e.target.value) || '')}
            className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Seleccionar médico…</option>
            {doctors.map(d => (
              <option key={d.id} value={d.id}>
                {d.first_name} {d.last_name}{d.specialty ? ` — ${d.specialty}` : ''}
              </option>
            ))}
          </select>

          {/* Mini-agenda del doctor */}
          {selectedDoctorId && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-2">Agenda del {new Date(appt.starts_at).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}:</p>
              {loadingSlots ? (
                <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-300" /></div>
              ) : doctorSlots.length === 0 ? (
                <p className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">Sin citas — disponible todo el día</p>
              ) : (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {doctorSlots.map(s => {
                    const sStart = new Date(s.starts_at).getTime();
                    const sEnd = new Date(s.ends_at).getTime();
                    const isConflict = s.id !== appt.id && sStart < apptEnd + BUFFER_MS && sEnd > apptStart - BUFFER_MS;
                    return (
                      <div key={s.id} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                        s.id === appt.id ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                        isConflict ? 'bg-red-50 border border-red-200 text-red-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="font-medium">
                          {new Date(s.starts_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                          {' — '}
                          {new Date(s.ends_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="truncate">{s.patient_name}</span>
                        {isConflict && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0 ml-auto" />}
                        {s.id === appt.id && <span className="ml-auto text-[10px] font-semibold">ESTA CITA</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              {hasConflict && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Conflicto de horario detectado (incluye 5 min de buffer)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <DollarSign className="w-4 h-4 text-green-600" /> Pago
            {paymentDone && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">Registrado</span>}
          </div>
          {!paymentDone ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Monto</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Método</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Estado pago</label>
                <select value={payStatus} onChange={e => setPayStatus(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="PAID">Pagado</option>
                  <option value="PARTIAL">Parcial</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Notas pago</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Opcional" />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              {cop(appt.payment!.amount)} — {PAY_METHODS.find(m => m.value === appt.payment!.method)?.label ?? appt.payment!.method}
            </div>
          )}
        </div>

        {/* Consent */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-900">
            <FileSignature className="w-4 h-4 text-indigo-600" /> Consentimiento
            {consentDone && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">Firmado</span>}
          </div>
          {!consentDone ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Nombre del firmante</label>
                <input type="text" value={consentName} onChange={e => setConsentName(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Procedimiento</label>
                <input type="text" value={consentDesc} onChange={e => setConsentDesc(e.target.value)}
                  className="h-10 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              Firmado por: {appt.consent!.signed_by_name}
              {appt.consent!.signed_at && (
                <span className="text-gray-400"> — {new Date(appt.consent!.signed_at).toLocaleString('es-CO')}</span>
              )}
            </div>
          )}
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button onClick={handleCancel} disabled={canceling || saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 bg-red-50 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
          {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Cancelar Cita
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cerrar
          </button>
          <button onClick={handleConfirm} disabled={saving || canceling || hasConflict || !selectedDoctorId}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirmar Cita
          </button>
        </div>
      </div>
    </>
  );
}

/* ================================================================
   CONFIRMED / IN_PROGRESS → COMPLETED  (Historia Clínica)
   ================================================================ */

const MR_FIELDS: { key: string; label: string; rows?: number; required?: boolean }[] = [
  { key: 'chief_complaint',         label: 'Motivo de consulta' },
  { key: 'current_illness',         label: 'Enfermedad actual',            rows: 2 },
  { key: 'personal_history',        label: 'Antecedentes personales',      rows: 2 },
  { key: 'surgical_history',        label: 'Antecedentes quirúrgicos' },
  { key: 'allergic_history',        label: 'Antecedentes alérgicos' },
  { key: 'pharmacological_history', label: 'Antecedentes farmacológicos' },
  { key: 'family_history',          label: 'Antecedentes familiares' },
  { key: 'physical_exam',           label: 'Examen físico',               rows: 3 },
  { key: 'diagnosis',               label: 'Diagnóstico *',               rows: 2, required: true },
  { key: 'treatment_plan',          label: 'Plan de tratamiento',         rows: 2 },
  { key: 'evolution',               label: 'Evolución',                   rows: 2 },
  { key: 'notes',                   label: 'Notas adicionales' },
];

type MRForm = Record<string, string>;

function MedicalRecordPanel({ appt, onDone, onClose }: { appt: ApptDetail; onDone: () => void; onClose: () => void }) {
  const blank: MRForm = Object.fromEntries(MR_FIELDS.map(f => [f.key, '']));
  const [form, setForm] = useState<MRForm>(blank);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    if (!appt.medical_record_id) return;
    setLoadingRec(true);
    apiFetch(`/api/medical-records/${appt.medical_record_id}/`)
      .then(r => r.json())
      .then(d => {
        const rec = d.record;
        if (rec) setForm(prev => {
          const next = { ...prev };
          for (const f of MR_FIELDS) next[f.key] = rec[f.key] || '';
          return next;
        });
      })
      .finally(() => setLoadingRec(false));
  }, [appt.medical_record_id]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSaveAndComplete = async () => {
    if (!form.diagnosis.trim()) {
      setError('El diagnóstico es obligatorio para completar la cita.');
      return;
    }
    setSaving(true); setError('');
    try {
      let mrId = appt.medical_record_id;

      if (appt.status === 'CONFIRMED') {
        const r = await apiFetch(`/api/appointments/${appt.id}/`, {
          method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }),
        });
        const rData = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(rData.detail || 'Error al iniciar consulta');
        mrId = rData.appointment?.medical_record_id ?? mrId;
      }

      if (!mrId) {
        const freshRes = await apiFetch(`/api/appointments/${appt.id}/`);
        const freshData = await freshRes.json();
        mrId = freshData.appointment?.medical_record_id;
      }
      if (!mrId) throw new Error('No se pudo obtener la historia clínica.');

      const mr = await apiFetch(`/api/medical-records/${mrId}/`, {
        method: 'PUT', body: JSON.stringify(form),
      });
      if (!mr.ok) throw new Error((await mr.json().catch(() => ({}))).detail || 'Error al guardar historia clínica');

      const c = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (!c.ok) throw new Error((await c.json().catch(() => ({}))).detail || 'Error al completar cita');

      onDone(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    setCanceling(true); setError('');
    try {
      const r = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'CANCELED' }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al cancelar');
      onDone(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setCanceling(false); }
  };

  if (loadingRec) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <>
      <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 font-semibold text-gray-900 mb-3">
            <ClipboardList className="w-4 h-4 text-indigo-600" /> Historia Clínica
          </div>
          <div className="space-y-3">
            {MR_FIELDS.map(f => (
              <div key={f.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">{f.label}</label>
                <textarea value={form[f.key]} onChange={set(f.key)} rows={f.rows ?? 1}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none
                    ${f.required && !form[f.key].trim() ? 'border-red-300' : 'border-gray-200'}`} />
              </div>
            ))}
          </div>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button onClick={handleCancel} disabled={canceling || saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 border border-red-200 bg-red-50 text-sm font-medium rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
          {canceling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Cancelar Cita
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cerrar
          </button>
          <button onClick={handleSaveAndComplete} disabled={saving || canceling}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Guardar y Completar
          </button>
        </div>
      </div>
    </>
  );
}

/* ================================================================
   COMPLETED / CANCELED / NO_SHOW  (Solo lectura)
   ================================================================ */

function ReadOnlyPanel({ appt, onClose }: { appt: ApptDetail; onClose: () => void }) {
  const st = STATUS_LABELS[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600' };
  return (
    <>
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />

        {appt.payment && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-gray-900">
              <DollarSign className="w-4 h-4 text-green-600" /> Pago
            </div>
            <div className="text-sm text-gray-600">
              {cop(appt.payment.amount)} — {PAY_METHODS.find(m => m.value === appt.payment!.method)?.label ?? appt.payment.method}
            </div>
          </div>
        )}

        {appt.notes && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 whitespace-pre-wrap">{appt.notes}</div>
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
          <span className="text-sm text-gray-500">Esta cita ya no se puede modificar.</span>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          Cerrar
        </button>
      </div>
    </>
  );
}

/* ================================================================
   Main Modal – routes to the correct panel by status
   ================================================================ */

type Props = {
  appointmentId: number | null;
  onClose: () => void;
  onDone: () => void;
};

export function AtenderModal({ appointmentId, onClose, onDone }: Props) {
  const [appt, setAppt] = useState<ApptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) { setAppt(null); return; }
    setLoading(true); setError('');
    apiFetch(`/api/appointments/${appointmentId}/`)
      .then(r => r.json())
      .then(d => setAppt(d.appointment))
      .catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (!appointmentId) return null;

  const title =
    appt?.status === 'SCHEDULED'   ? 'Confirmar Cita' :
    appt?.status === 'CONFIRMED' || appt?.status === 'IN_PROGRESS' ? 'Atender Cita' :
    'Detalle de Cita';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : error && !appt ? (
          <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
        ) : appt?.status === 'SCHEDULED' ? (
          <ConfirmPanel appt={appt} onDone={onDone} onClose={onClose} />
        ) : appt?.status === 'CONFIRMED' || appt?.status === 'IN_PROGRESS' ? (
          <MedicalRecordPanel appt={appt} onDone={onDone} onClose={onClose} />
        ) : appt ? (
          <ReadOnlyPanel appt={appt} onClose={onClose} />
        ) : null}
      </div>
    </div>
  );
}
