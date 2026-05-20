import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useClinicConfig } from '../lib/clinicConfig';
import {
  Calendar, Clock, Loader2, Phone, Mail, User, X,
  CheckCircle, DollarSign, Stethoscope,
  UserX, ClipboardList, ArrowRight, CalendarPlus,
} from 'lucide-react';
import { NewAppointmentModal } from './NewAppointmentModal';

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
  appointment_type: string;
  patient_id: number; patient_name: string; patient_email: string; patient_phone: string;
  treatment_id: number | null; treatment_name: string | null; treatment_price: number | null;
  treatment_requires_consent: boolean | null;
  doctor_id: number | null; doctor_name: string | null; doctor_email: string | null;
  payment: PaymentInfo | null; medical_record_id: number | null; consent: ConsentInfo | null;
};

/* ── Constants ──────────────────────────────────────────────────── */

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Pendiente',   color: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  IN_PROGRESS: { label: 'En curso',    color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  COMPLETED:   { label: 'Completada',  color: 'bg-gray-100 text-gray-600 border border-gray-200' },
  CANCELED:    { label: 'Cancelada',   color: 'bg-red-50 text-red-600 border border-red-200' },
  NO_SHOW:     { label: 'No asistió',  color: 'bg-amber-50 text-amber-700 border border-amber-200' },
  EXPIRED:     { label: 'Vencida',     color: 'bg-orange-50 text-orange-700 border border-orange-200' },
};

const PAY_METHODS = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'OTHER', label: 'Otro' },
];

const ACTIVE_STATUSES = ['PENDING', 'IN_PROGRESS'];

function fmt(iso: string, type: 'date' | 'time') {
  const d = new Date(iso);
  if (type === 'date')
    return d.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

function cop(n: number) {
  return n.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
}

/* ── Shared info block ──────────────────────────────────────────── */

function ApptInfo({ appt }: { appt: ApptDetail }) {
  const st = STATUS_LABELS[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600' };
  const isValoracion = appt.appointment_type === 'VALORACION';
  return (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <User className="w-4 h-4 text-gray-400" /> {appt.patient_name}
          </div>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isValoracion ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
            {isValoracion ? 'Valoración' : 'Procedimiento'}
          </span>
        </div>
        {appt.patient_email && (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Mail className="w-3.5 h-3.5" /> {appt.patient_email}</div>
        )}
        {appt.patient_phone && (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Phone className="w-3.5 h-3.5" /> {appt.patient_phone}</div>
        )}
      </div>
      <div className="space-y-1.5">
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
            <span className="font-medium">Procedimiento:</span> {appt.treatment_name}
            {appt.treatment_price != null && <span className="text-gray-400 ml-1">({cop(appt.treatment_price)})</span>}
          </div>
        )}
        {appt.doctor_name && (
          <div className="text-sm text-gray-600"><span className="font-medium">Responsable:</span> {appt.doctor_name}</div>
        )}
        <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
      </div>
    </div>
  );
}

/* ================================================================
   FLUJO VALORACIÓN — Pendiente → Asistida | No Asistida
   ================================================================ */

function ValoracionPendientePanel({ appt, onDone, onClose }: { appt: ApptDetail; onDone: () => void; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [asistidaDone, setAsistidaDone] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);

  const transition = async (status: string) => {
    setSaving(true); setError('');
    try {
      const r = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PATCH', body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error');
      if (status === 'COMPLETED') {
        onDone();
        setAsistidaDone(true);
      } else {
        onDone(); onClose();
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  if (asistidaDone) {
    return (
      <>
        <div className="px-6 py-8 flex flex-col items-center gap-4 text-center flex-1">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900">¡Valoración registrada como asistida!</p>
            <p className="text-sm text-gray-500 mt-1">¿Desea agendar una cita de procedimiento para <span className="font-medium">{appt.patient_name}</span>?</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2">
          <button onClick={() => setShowNewAppt(true)}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
            <CalendarPlus className="w-4 h-4" /> Crear cita de procedimiento
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { onClose(); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Más tarde
            </button>
            <button onClick={() => { onClose(); }}
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-50 rounded-xl transition-colors">
              Cerrar
            </button>
          </div>
        </div>

        {showNewAppt && (
          <NewAppointmentModal
            forceProcedimiento
            defaultPatientId={appt.patient_id}
            defaultPatientName={appt.patient_name}
            onClose={() => setShowNewAppt(false)}
            onCreated={() => { setShowNewAppt(false); onClose(); }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />
        {appt.notes && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span className="font-medium">Notas: </span>{appt.notes}
          </div>
        )}
        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button onClick={() => transition('NO_SHOW')} disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-amber-700 border border-amber-200 bg-amber-50 text-sm font-medium rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />} No asistió
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cerrar
          </button>
          <button onClick={() => transition('COMPLETED')} disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Marcar Asistida
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Valoración COMPLETADA → puede crear procedimiento ── */

function ValoracionCompletadaPanel({ appt, onDone, onClose }: { appt: ApptDetail; onDone: () => void; onClose: () => void }) {
  const [showNewAppt, setShowNewAppt] = useState(false);

  return (
    <>
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />

        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Valoración completada</p>
            <p className="text-xs text-green-600 mt-1">Puede crear una cita de procedimiento para este paciente.</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          Cerrar
        </button>
        <button onClick={() => setShowNewAppt(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          <CalendarPlus className="w-4 h-4" /> Crear cita de procedimiento
        </button>
      </div>

      {showNewAppt && (
        <NewAppointmentModal
          forceProcedimiento
          defaultPatientId={appt.patient_id}
          defaultPatientName={appt.patient_name}
          onClose={() => setShowNewAppt(false)}
          onCreated={() => { setShowNewAppt(false); onDone(); onClose(); }}
        />
      )}
    </>
  );
}

/* ================================================================
   FLUJO PROCEDIMIENTO — Pendiente → Atendida | No Asistida
   ================================================================ */

function ProcedimientoPendientePanel({ appt, onDone, onClose }: { appt: ApptDetail; onDone: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const { config } = useClinicConfig();
  const hcEnabled = config?.enable_medical_history ?? true;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Payment state
  const [payAmount, setPayAmount] = useState(appt.treatment_price?.toString() ?? '0');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payStatus, setPayStatus] = useState('PAID');
  const [payNotes, setPayNotes] = useState('');

  const paymentDone = appt.payment && ['PAID', 'PARTIAL'].includes(appt.payment.status);

  const handleAtender = async () => {
    setSaving(true); setError('');
    try {
      if (!paymentDone) {
        const r = await apiFetch(`/api/appointments/${appt.id}/payment/`, {
          method: 'POST',
          body: JSON.stringify({ amount: parseFloat(payAmount) || 0, method: payMethod, status: payStatus, notes: payNotes }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al registrar pago');
      }

      if (!hcEnabled) {
        // HC desactivada: completar directamente
        const r = await apiFetch(`/api/appointments/${appt.id}/`, {
          method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al completar');
        onDone(); onClose();
      } else {
        // HC activa: transicionar a IN_PROGRESS y navegar a /complete
        const r = await apiFetch(`/api/appointments/${appt.id}/`, {
          method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error');
        onClose();
        navigate(`/admin/appointments/${appt.id}/complete`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const handleNoShow = async () => {
    setSaving(true); setError('');
    try {
      const r = await apiFetch(`/api/appointments/${appt.id}/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'NO_SHOW' }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error');
      onDone(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />

        {/* Pago */}
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
            <DollarSign className="w-4 h-4 text-green-600" /> Pago
            {paymentDone && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-auto">Registrado</span>}
          </div>
          {!paymentDone ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Monto</label>
                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Método</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {PAY_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Estado</label>
                <select value={payStatus} onChange={e => setPayStatus(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="PAID">Pagado</option>
                  <option value="PARTIAL">Parcial</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">Notas</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Opcional"
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              {cop(appt.payment!.amount)} — {PAY_METHODS.find(m => m.value === appt.payment!.method)?.label}
            </p>
          )}
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sm:flex-row sm:justify-between">
        <button onClick={handleNoShow} disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-amber-700 border border-amber-200 bg-amber-50 text-sm font-medium rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />} No asistió
        </button>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cerrar
          </button>
          <button onClick={handleAtender} disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} {hcEnabled ? 'Atender → Historia Clínica' : 'Marcar como Atendido'}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Procedimiento IN_PROGRESS → Historia clínica ── */

function ProcedimientoEnCursoPanel({ appt, onClose }: { appt: ApptDetail; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <>
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />
        <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <Stethoscope className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-800">Procedimiento en curso</p>
            <p className="text-xs text-indigo-600 mt-1">Llena la historia clínica para completar la atención.</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          Cerrar
        </button>
        <button onClick={() => { onClose(); navigate(`/admin/appointments/${appt.id}/complete`); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
          <ClipboardList className="w-4 h-4" /> Llenar Historia Clínica
        </button>
      </div>
    </>
  );
}

/* ── Panel solo lectura (COMPLETED, CANCELED, NO_SHOW, EXPIRED) ── */

function ReadOnlyPanel({ appt, onDone, onClose }: { appt: ApptDetail; onDone: () => void; onClose: () => void }) {
  const [showNewAppt, setShowNewAppt] = useState(false);
  const isValoracionCompleted = appt.appointment_type === 'VALORACION' && appt.status === 'COMPLETED';
  const st = STATUS_LABELS[appt.status] ?? { label: appt.status, color: 'bg-gray-100 text-gray-600' };

  return (
    <>
      <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
        <ApptInfo appt={appt} />

        {appt.payment && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-gray-900 text-sm">
              <DollarSign className="w-4 h-4 text-green-600" /> Pago
            </div>
            <p className="text-sm text-gray-600">
              {cop(appt.payment.amount)} — {PAY_METHODS.find(m => m.value === appt.payment!.method)?.label ?? appt.payment.method}
            </p>
          </div>
        )}

        {appt.notes && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100 whitespace-pre-wrap">
            <span className="font-medium">Notas: </span>{appt.notes}
          </div>
        )}

        <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.color}`}>{st.label}</span>
          <span className="text-sm text-gray-500">Esta cita ya no se puede modificar.</span>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          Cerrar
        </button>
        {isValoracionCompleted && (
          <button onClick={() => setShowNewAppt(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            <CalendarPlus className="w-4 h-4" /> Crear cita de procedimiento
          </button>
        )}
      </div>

      {showNewAppt && (
        <NewAppointmentModal
          onClose={() => setShowNewAppt(false)}
          onCreated={() => { setShowNewAppt(false); onDone(); onClose(); }}
        />
      )}
    </>
  );
}

/* ================================================================
   Main Modal – routes to the correct panel
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

  const isValoracion  = appt?.appointment_type === 'VALORACION';
  const isActive      = appt ? ACTIVE_STATUSES.includes(appt.status) : false;

  const title = !appt ? 'Cita' :
    isValoracion
      ? (isActive ? 'Gestionar Valoración' : 'Detalle de Valoración')
      : (isActive ? 'Atender Procedimiento' : 'Detalle de Procedimiento');

  const renderPanel = () => {
    if (!appt) return null;
    if (isValoracion) {
      if (ACTIVE_STATUSES.includes(appt.status)) return <ValoracionPendientePanel appt={appt} onDone={onDone} onClose={onClose} />;
      if (appt.status === 'COMPLETED') return <ValoracionCompletadaPanel appt={appt} onDone={onDone} onClose={onClose} />;
      return <ReadOnlyPanel appt={appt} onDone={onDone} onClose={onClose} />;
    } else {
      if (appt.status === 'IN_PROGRESS') return <ProcedimientoEnCursoPanel appt={appt} onClose={onClose} />;
      if (ACTIVE_STATUSES.includes(appt.status)) return <ProcedimientoPendientePanel appt={appt} onDone={onDone} onClose={onClose} />;
      return <ReadOnlyPanel appt={appt} onDone={onDone} onClose={onClose} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : error && !appt ? (
          <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
        ) : renderPanel()}
      </div>
    </div>
  );
}
