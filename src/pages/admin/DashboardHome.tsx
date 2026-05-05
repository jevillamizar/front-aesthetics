import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { AtenderModal } from '../../components/AtenderModal';
import { NewAppointmentModal } from '../../components/NewAppointmentModal';
import {
  Users, Loader2, Plus, CalendarX2, CheckCircle2,
  Clock3, DollarSign, ChevronDown, ChevronUp, CalendarDays,
  Eye, Pencil, X as XIcon, AlertTriangle,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

type Stats = {
  appointments_today: number;
  appointments_month: number;
  patients_total: number;
  treatments_active: number;
  valoraciones_no_asistidas: number;
  procedimientos_atendidos: number;
  procedimientos_pendientes: number;
  ingresos_hoy: number;
};

type TodayAppt = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  appointment_type: string;
  treatment_name: string;
  patient_name: string;
  patient_id: number;
  notes: string;
  doctor_id: number | null;
  doctor_name: string;
  payment_status: string | null;
  payment_amount: number | null;
};

type SortKey = 'starts_at' | 'treatment_name' | 'patient_name' | 'status' | 'payment_status' | 'doctor_name';

/* ── Constants ─────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-blue-100 text-blue-800 border-blue-200',
  CONFIRMED:   'bg-green-100 text-green-800 border-green-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  COMPLETED:   'bg-gray-100 text-gray-600 border-gray-200',
  CANCELED:    'bg-red-100 text-red-600 border-red-200',
  NO_SHOW:     'bg-amber-100 text-amber-700 border-amber-200',
};
const STATUS_DOT: Record<string, string> = {
  SCHEDULED:   'bg-blue-500',
  CONFIRMED:   'bg-green-500',
  IN_PROGRESS: 'bg-indigo-500',
  COMPLETED:   'bg-gray-400',
  CANCELED:    'bg-red-400',
  NO_SHOW:     'bg-amber-400',
};
const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Programada', CONFIRMED: 'Confirmada', IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada', CANCELED: 'Cancelada', NO_SHOW: 'No asistió',
};

function fmt(iso: string, type: 'time' | 'date') {
  const d = new Date(iso);
  if (type === 'time') return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ── Payment badge ──────────────────────────────────────────────────────── */

const PAY_COLORS: Record<string, string> = {
  PAID:     'bg-green-100 text-green-700 border-green-200',
  PARTIAL:  'bg-yellow-100 text-yellow-700 border-yellow-200',
  PENDING:  'bg-gray-100 text-gray-500 border-gray-200',
  REFUNDED: 'bg-red-100 text-red-600 border-red-200',
};
const PAY_LABEL: Record<string, string> = {
  PAID: 'Pagado', PARTIAL: 'Parcial', PENDING: 'Pendiente', REFUNDED: 'Reembolsado',
};

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ChevronDown className="w-3 h-3 text-gray-300" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-gray-600" />
    : <ChevronDown className="w-3 h-3 text-gray-600" />;
}

/* ── Main Dashboard (Inicio) ────────────────────────────────────────────── */

export function DashboardHome() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const today = new Date();

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [todayAppts, setTodayAppts] = useState<TodayAppt[]>([]);
  const [tableLoading, setTableLoading] = useState(true);

  const [atenderApptId, setAtenderApptId] = useState<number | null>(null);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [editApptId, setEditApptId] = useState<number | null>(null);
  const [cancelApptId, setCancelApptId] = useState<number | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const [sortKey, setSortKey] = useState<SortKey>('starts_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await apiFetch('/api/dashboard/');
      const data = await res.json();
      setStats(data.stats);
      setTodayAppts(data.today_appointments || []);
    } finally {
      setStatsLoading(false);
      setTableLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCancel = async () => {
    if (!cancelApptId) return;
    setCancelLoading(true); setCancelError('');
    try {
      const r = await apiFetch(`/api/appointments/${cancelApptId}/`, {
        method: 'PATCH', body: JSON.stringify({ status: 'CANCELED' }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al cancelar');
      setCancelApptId(null);
      loadData();
    } catch (e: unknown) {
      setCancelError(e instanceof Error ? e.message : 'Error');
    } finally { setCancelLoading(false); }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = todayAppts
    .filter(a => !statusFilter || a.status === statusFilter)
    .sort((a, b) => {
      const av = String(a[sortKey as keyof TodayAppt] ?? '');
      const bv = String(b[sortKey as keyof TodayAppt] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });

  const todayStr = today.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const kpis = [
    {
      label: 'Pacientes',
      value: stats?.patients_total ?? '—',
      sub: 'Total registrados',
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
    },
    {
      label: 'Valoraciones no asistidas',
      value: stats?.valoraciones_no_asistidas ?? '—',
      sub: 'No show acumulado',
      icon: CalendarX2,
      color: 'bg-red-50 text-red-500',
      border: 'border-red-100',
    },
    {
      label: 'Procedimientos atendidos',
      value: stats?.procedimientos_atendidos ?? '—',
      sub: `${stats?.procedimientos_pendientes ?? '—'} pendientes hoy`,
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600',
      border: 'border-green-100',
    },
    {
      label: 'Ingresos del día',
      value: stats
        ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(stats.ingresos_hoy)
        : '—',
      sub: 'Pagos confirmados hoy',
      icon: DollarSign,
      color: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
    },
  ];

  const thCls = (_key: SortKey) =>
    `px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap`;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inicio</h1>
          <p className="text-gray-400 text-sm mt-0.5 capitalize">{todayStr}</p>
        </div>
        {!isDoctor && (
          <button
            onClick={() => setShowNewAppt(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Agendar Cita
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className={`bg-white rounded-2xl border ${k.border} p-5 flex flex-col gap-3`}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 leading-tight">{k.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.color}`}>
                <k.icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">
                {statsLoading ? <Loader2 className="w-5 h-5 animate-spin text-gray-300" /> : k.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's appointments table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Citas de hoy</h2>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500 font-medium">
              {tableLoading ? '…' : filtered.length}
            </span>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {tableLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Clock3 className="w-8 h-8 mb-2 text-gray-200" />
            <p className="text-sm">No hay citas para hoy</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className={thCls('treatment_name')} onClick={() => handleSort('treatment_name')}>
                    <span className="flex items-center gap-1">Tratamiento <SortIcon active={sortKey === 'treatment_name'} dir={sortDir} /></span>
                  </th>
                  <th className={thCls('starts_at')} onClick={() => handleSort('starts_at')}>
                    <span className="flex items-center gap-1">Fecha y hora <SortIcon active={sortKey === 'starts_at'} dir={sortDir} /></span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    Descripción
                  </th>
                  <th className={thCls('patient_name')} onClick={() => handleSort('patient_name')}>
                    <span className="flex items-center gap-1">Cliente <SortIcon active={sortKey === 'patient_name'} dir={sortDir} /></span>
                  </th>
                  <th className={thCls('status')} onClick={() => handleSort('status')}>
                    <span className="flex items-center gap-1">Estado atención <SortIcon active={sortKey === 'status'} dir={sortDir} /></span>
                  </th>
                  <th className={thCls('payment_status')} onClick={() => handleSort('payment_status')}>
                    <span className="flex items-center gap-1">Estado pago <SortIcon active={sortKey === 'payment_status'} dir={sortDir} /></span>
                  </th>
                  <th className={thCls('doctor_name')} onClick={() => handleSort('doctor_name')}>
                    <span className="flex items-center gap-1">Responsable <SortIcon active={sortKey === 'doctor_name'} dir={sortDir} /></span>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-3.5">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-900 whitespace-nowrap">{a.treatment_name}</span>
                        <span className={`inline-flex w-fit text-[10px] px-1.5 py-0.5 rounded font-medium border ${
                          a.appointment_type === 'VALORACION'
                            ? 'bg-purple-50 text-purple-600 border-purple-100'
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {a.appointment_type === 'VALORACION' ? 'Valoración' : 'Tratamiento'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{fmt(a.starts_at, 'time')}</span>
                      <span className="text-gray-400 text-xs ml-1">— {fmt(a.ends_at, 'time')}</span>
                    </td>
                    <td className="px-3 py-3.5 max-w-[160px]">
                      <span className="text-gray-500 text-xs line-clamp-2">{a.notes || '—'}</span>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap font-medium text-gray-900">{a.patient_name}</td>
                    <td className="px-3 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[a.status] ?? 'bg-gray-400'}`} />
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      {a.payment_status ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${PAY_COLORS[a.payment_status] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {PAY_LABEL[a.payment_status] ?? a.payment_status}
                          </span>
                          {a.payment_amount != null && (
                            <span className="text-xs text-gray-400 pl-1">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(a.payment_amount)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin pago</span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-gray-600">{a.doctor_name}</td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAtenderApptId(a.id)}
                          title="Ver / Atender"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        {!['COMPLETED','CANCELED','NO_SHOW','EXPIRED'].includes(a.status) && (
                          <button
                            onClick={() => setEditApptId(a.id)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {!['COMPLETED','CANCELED','NO_SHOW','EXPIRED','IN_PROGRESS'].includes(a.status) && (
                          <button
                            onClick={() => { setCancelApptId(a.id); setCancelError(''); }}
                            title="Cancelar cita"
                            className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                            <XIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AtenderModal
        appointmentId={atenderApptId}
        onClose={() => setAtenderApptId(null)}
        onDone={loadData}
      />

      {showNewAppt && (
        <NewAppointmentModal
          onClose={() => setShowNewAppt(false)}
          onCreated={loadData}
        />
      )}

      {editApptId && (
        <EditAppointmentModal
          appointmentId={editApptId}
          onClose={() => setEditApptId(null)}
          onSaved={() => { setEditApptId(null); loadData(); }}
        />
      )}

      {cancelApptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelApptId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">¿Cancelar esta cita?</p>
                <p className="text-sm text-gray-500 mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            {cancelError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{cancelError}</p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCancelApptId(null)} disabled={cancelLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
                Volver
              </button>
              <button onClick={handleCancel} disabled={cancelLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {cancelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XIcon className="w-4 h-4" />} Confirmar cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── EditAppointmentModal ───────────────────────────────────────────────── */

type EditAppt = {
  id: number; starts_at: string; ends_at: string; notes: string;
  doctor_id: number | null; treatment_id: number | null;
  patient_name: string; treatment_name: string | null; appointment_type: string;
};
type DocOpt = { id: number; first_name: string; last_name: string };

function EditAppointmentModal({ appointmentId, onClose, onSaved }: {
  appointmentId: number; onClose: () => void; onSaved: () => void;
}) {
  const [appt, setAppt] = useState<EditAppt | null>(null);
  const [doctors, setDoctors] = useState<DocOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt]     = useState('');
  const [notes, setNotes]       = useState('');
  const [doctorId, setDoctorId] = useState<number | ''>('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(`/api/appointments/${appointmentId}/`).then(r => r.json()),
      apiFetch('/api/doctors/').then(r => r.json()),
    ]).then(([ad, dd]) => {
      const a: EditAppt = ad.appointment;
      setAppt(a);
      const toLocal = (iso: string) => {
        const d = new Date(iso);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setStartsAt(toLocal(a.starts_at));
      setEndsAt(toLocal(a.ends_at));
      setNotes(a.notes || '');
      setDoctorId(a.doctor_id ?? '');
      setDoctors((dd.doctors || []).filter((d: DocOpt & { is_active?: boolean }) => d.is_active !== false));
    }).catch(() => setError('No se pudo cargar la cita.'))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  const handleSave = async () => {
    if (!startsAt || !endsAt) { setError('Fecha y hora requeridas.'); return; }
    setSaving(true); setError('');
    try {
      const r = await apiFetch(`/api/appointments/${appointmentId}/`, {
        method: 'PUT',
        body: JSON.stringify({
          starts_at: new Date(startsAt).toISOString(),
          ends_at:   new Date(endsAt).toISOString(),
          notes,
          doctor_id: doctorId || null,
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || 'Error al guardar');
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Editar cita</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
        ) : (
          <div className="px-6 py-5 space-y-4">
            {appt && (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
                <span className="font-medium text-gray-900">{appt.patient_name}</span>
                {appt.treatment_name && <span className="ml-2 text-gray-400">· {appt.treatment_name}</span>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Inicio</label>
                <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Fin</label>
                <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Responsable</label>
              <select value={doctorId} onChange={e => setDoctorId(Number(e.target.value) || '')}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                <option value="">Sin asignar</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.first_name} {d.last_name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Notas</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          </div>
        )}

        {!loading && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />} Guardar cambios
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
