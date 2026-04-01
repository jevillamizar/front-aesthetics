import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Calendar, Clock, Loader2, Phone, Mail, User, X, CheckCircle, XCircle } from 'lucide-react';

type ApptDetail = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  treatment_name: string | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Programada', color: 'bg-blue-50 text-blue-700' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-green-50 text-green-700' },
  COMPLETED: { label: 'Completada', color: 'bg-gray-100 text-gray-600' },
  CANCELED:  { label: 'Cancelada',  color: 'bg-red-50 text-red-600' },
  NO_SHOW:   { label: 'No asistió', color: 'bg-amber-50 text-amber-700' },
};

function fmt(iso: string, type: 'date' | 'time') {
  const d = new Date(iso);
  if (type === 'date')
    return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

type Props = {
  appointmentId: number | null;
  onClose: () => void;
  onDone: () => void;
};

export function AtenderModal({ appointmentId, onClose, onDone }: Props) {
  const [appt, setAppt] = useState<ApptDetail | null>(null);
  const [loadingAppt, setLoadingAppt] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState<'COMPLETED' | 'NO_SHOW' | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appointmentId) return;
    setLoadingAppt(true);
    setError('');
    setAppt(null);
    apiFetch(`/api/appointments/${appointmentId}/`)
      .then((r) => r.json())
      .then((d) => {
        setAppt(d.appointment);
        setNotes(d.appointment.notes ?? '');
      })
      .catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setLoadingAppt(false));
  }, [appointmentId]);

  if (!appointmentId) return null;

  const handleAction = async (newStatus: 'COMPLETED' | 'NO_SHOW') => {
    if (!appt) return;
    setSaving(newStatus);
    setError('');
    try {
      const res = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus, notes }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      onDone();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(null);
    }
  };

  const st = appt ? (STATUS_LABELS[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600' }) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">Atender Cita</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loadingAppt ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : error && !appt ? (
          <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
        ) : appt ? (
          <div className="px-6 py-5 space-y-5">

            {/* Patient info */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-gray-900 font-semibold">
                <User className="w-4 h-4 text-gray-400" />
                {appt.patient_name}
              </div>
              {appt.patient_email && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Mail className="w-3.5 h-3.5" />
                  {appt.patient_email}
                </div>
              )}
              {appt.patient_phone && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-3.5 h-3.5" />
                  {appt.patient_phone}
                </div>
              )}
            </div>

            {/* Appointment info */}
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
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Estado:</span>
                {st && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>
                    {st.label}
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas de atención
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                placeholder="Observaciones del médico, procedimientos realizados…"
              />
            </div>

            {error && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {error}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        {appt && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={() => handleAction('NO_SHOW')}
              disabled={!!saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
            >
              {saving === 'NO_SHOW' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              No asistió
            </button>
            <button
              onClick={() => handleAction('COMPLETED')}
              disabled={!!saving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving === 'COMPLETED' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Completar cita
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
