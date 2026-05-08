import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import {
  ArrowLeft, Calendar, CheckCircle, Clock, ClipboardList,
  Loader2, Mail, Phone, Stethoscope, User,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

type ApptDetail = {
  id: number; starts_at: string; ends_at: string; status: string; notes: string;
  patient_id: number; patient_name: string; patient_email: string; patient_phone: string;
  treatment_id: number | null; treatment_name: string | null; treatment_price: number | null;
  doctor_id: number | null; doctor_name: string | null; doctor_email: string | null;
  medical_record_id: number | null;
};

/* ── Medical record fields ─────────────────────────────────────────── */

const MR_FIELDS: { key: string; label: string; rows?: number; required?: boolean }[] = [
  { key: 'chief_complaint',         label: 'Motivo de consulta' },
  { key: 'current_illness',         label: 'Enfermedad actual',            rows: 2 },
  { key: 'personal_history',        label: 'Antecedentes personales',      rows: 2 },
  { key: 'surgical_history',        label: 'Antecedentes quirúrgicos' },
  { key: 'allergic_history',        label: 'Antecedentes alérgicos' },
  { key: 'pharmacological_history', label: 'Antecedentes farmacológicos' },
  { key: 'family_history',          label: 'Antecedentes familiares' },
  { key: 'physical_exam',           label: 'Examen físico',               rows: 3 },
  { key: 'diagnosis',               label: 'Diagnóstico',                 rows: 2, required: true },
  { key: 'treatment_plan',          label: 'Plan de procedimiento',       rows: 2 },
  { key: 'evolution',               label: 'Evolución',                   rows: 2 },
  { key: 'notes',                   label: 'Notas adicionales' },
];

type MRForm = Record<string, string>;

/* ── Helpers ───────────────────────────────────────────────────────── */

function fmt(iso: string, type: 'date' | 'time') {
  const d = new Date(iso);
  if (type === 'date')
    return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Pendiente',   color: 'bg-amber-50 text-amber-700' },
  IN_PROGRESS: { label: 'En curso',    color: 'bg-indigo-50 text-indigo-700' },
  COMPLETED:   { label: 'Completada',  color: 'bg-gray-100 text-gray-600' },
  CANCELED:    { label: 'Cancelada',   color: 'bg-red-50 text-red-600' },
  NO_SHOW:     { label: 'No asistió',  color: 'bg-amber-50 text-amber-700' },
  EXPIRED:     { label: 'Vencida',     color: 'bg-orange-50 text-orange-600' },
};

/* ── Component ─────────────────────────────────────────────────────── */

export function AppointmentComplete() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [appt, setAppt] = useState<ApptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const blank: MRForm = Object.fromEntries(MR_FIELDS.map(f => [f.key, '']));
  const [form, setForm] = useState<MRForm>(blank);
  const [loadingRec, setLoadingRec] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Load appointment
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch(`/api/appointments/${id}/`)
      .then(r => r.json())
      .then(d => {
        setAppt(d.appointment);
        // If already completed, load the record read-only
      })
      .catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setLoading(false));
  }, [id]);

  // Load existing medical record
  useEffect(() => {
    if (!appt?.medical_record_id) return;
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
  }, [appt?.medical_record_id]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSaveAndComplete = useCallback(async () => {
    if (!appt) return;
    if (!form.diagnosis.trim()) {
      setSaveError('El diagnóstico es obligatorio para completar la cita.');
      return;
    }
    setSaving(true); setSaveError('');
    try {
      let mrId = appt.medical_record_id;

      // If PENDING, transition to IN_PROGRESS first (auto-creates MedicalRecord)
      if (appt.status === 'PENDING') {
        const r = await apiFetch(`/api/appointments/${appt.id}/`, {
          method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }),
        });
        const rData = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(rData.detail || 'Error al iniciar consulta');
        mrId = rData.appointment?.medical_record_id ?? mrId;
      }

      // If still no mrId, re-fetch
      if (!mrId) {
        const freshRes = await apiFetch(`/api/appointments/${appt.id}/`);
        const freshData = await freshRes.json();
        mrId = freshData.appointment?.medical_record_id;
      }
      if (!mrId) throw new Error('No se pudo obtener la historia clínica.');

      // Save medical record
      const mr = await apiFetch(`/api/medical-records/${mrId}/`, {
        method: 'PUT', body: JSON.stringify(form),
      });
      if (!mr.ok) throw new Error((await mr.json().catch(() => ({}))).detail || 'Error al guardar historia clínica');

      // Complete appointment
      const c = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (!c.ok) throw new Error((await c.json().catch(() => ({}))).detail || 'Error al completar cita');

      setSaved(true);
      // Redirect after short delay
      setTimeout(() => navigate('/admin/appointments'), 1500);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  }, [appt, form, navigate]);

  // Save draft (without completing)
  const handleSaveDraft = useCallback(async () => {
    if (!appt) return;
    setSaving(true); setSaveError('');
    try {
      let mrId = appt.medical_record_id;

      // If PENDING, transition to IN_PROGRESS first
      if (appt.status === 'PENDING') {
        const r = await apiFetch(`/api/appointments/${appt.id}/`, {
          method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }),
        });
        const rData = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(rData.detail || 'Error al iniciar consulta');
        mrId = rData.appointment?.medical_record_id ?? mrId;
        // Update local state
        setAppt(prev => prev ? { ...prev, status: 'IN_PROGRESS', medical_record_id: mrId ?? prev.medical_record_id } : prev);
      }

      if (!mrId) {
        const freshRes = await apiFetch(`/api/appointments/${appt.id}/`);
        const freshData = await freshRes.json();
        mrId = freshData.appointment?.medical_record_id;
        setAppt(prev => prev ? { ...prev, medical_record_id: mrId ?? prev.medical_record_id } : prev);
      }
      if (!mrId) throw new Error('No se pudo obtener la historia clínica.');

      const mr = await apiFetch(`/api/medical-records/${mrId}/`, {
        method: 'PUT', body: JSON.stringify(form),
      });
      if (!mr.ok) throw new Error((await mr.json().catch(() => ({}))).detail || 'Error al guardar');

      setSaveError('');
      // Brief success feedback
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  }, [appt, form]);

  /* ── Render ──────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  if (error || !appt) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-red-500 mb-4">{error || 'Cita no encontrada'}</p>
        <button onClick={() => navigate('/admin/appointments')}
          className="text-sm text-gray-600 hover:text-gray-900 underline">
          Volver a citas
        </button>
      </div>
    );
  }

  const isReadOnly = ['COMPLETED', 'CANCELED', 'NO_SHOW'].includes(appt.status);
  const canComplete = ['PENDING', 'IN_PROGRESS'].includes(appt.status);
  const st = STATUS_LABELS[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600' };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isReadOnly ? 'Historia Clínica' : 'Completar Cita'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isReadOnly
              ? 'Registro médico de la consulta'
              : 'Complete la historia clínica para finalizar la cita'}
          </p>
        </div>
        <span className={`text-xs font-medium px-3 py-1.5 rounded-full ${st.color}`}>{st.label}</span>
      </div>

      {/* Appointment info card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <User className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{appt.patient_name}</p>
              {appt.patient_email && <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" /> {appt.patient_email}</p>}
              {appt.patient_phone && <p className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" /> {appt.patient_phone}</p>}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm text-gray-900 capitalize">{fmt(appt.starts_at, 'date')}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {fmt(appt.starts_at, 'time')} — {fmt(appt.ends_at, 'time')}
              </p>
            </div>
          </div>
          {appt.treatment_name && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Procedimiento:</span> {appt.treatment_name}
            </div>
          )}
          {appt.doctor_name && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Stethoscope className="w-4 h-4 text-gray-400" />
              <span>{appt.doctor_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Medical Record Form */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-900">Historia Clínica</h2>
        </div>

        {loadingRec ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            {MR_FIELDS.map(f => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-gray-700">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={form[f.key]}
                  onChange={set(f.key)}
                  rows={f.rows ?? 1}
                  readOnly={isReadOnly}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none transition-colors
                    ${isReadOnly ? 'bg-gray-50 text-gray-600 border-gray-100 cursor-default' : ''}
                    ${f.required && !form[f.key].trim() && !isReadOnly ? 'border-red-300' : 'border-gray-200'}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Error/success messages */}
        {saveError && (
          <div className="mx-5 mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {saveError}
          </div>
        )}
        {saved && !saveError && (
          <div className="mx-5 mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {appt.status === 'COMPLETED' ? 'Cita completada exitosamente. Redirigiendo…' : 'Guardado exitosamente'}
          </div>
        )}

        {/* Action buttons */}
        {!isReadOnly && (
          <div className="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3 sm:justify-between">
            <button onClick={() => navigate(-1)}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <div className="flex gap-3">
              {canComplete && (
                <button onClick={handleSaveDraft} disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Guardar borrador
                </button>
              )}
              {canComplete && (
                <button onClick={handleSaveAndComplete} disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Guardar y Completar Cita
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
