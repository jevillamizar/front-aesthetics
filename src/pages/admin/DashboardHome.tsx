import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { AtenderModal } from '../../components/AtenderModal';
import { CalendarDays, Users, Scissors, TrendingUp, Loader2, Clock, Stethoscope } from 'lucide-react';

type Stats = {
  appointments_today: number;
  appointments_month: number;
  patients_total: number;
  treatments_active: number;
};

type Appt = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  patient_name: string;
  treatment_name: string;
};

type Tab = 'day' | 'week';

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  SCHEDULED: { label: 'Programada', color: 'bg-blue-50 text-blue-700',   dot: 'bg-blue-400' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  COMPLETED: { label: 'Completada', color: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400' },
  CANCELED:  { label: 'Cancelada',  color: 'bg-red-50 text-red-600',     dot: 'bg-red-400' },
  NO_SHOW:   { label: 'No asistió', color: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
};

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function AppointmentList({ appts, emptyMsg, onAtender }: {
  appts: Appt[]; emptyMsg: string; onAtender: (id: number) => void;
}) {
  if (appts.length === 0) return (
    <div className="px-6 py-10 text-center">
      <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
      <p className="text-gray-400 text-sm">{emptyMsg}</p>
    </div>
  );
  return (
    <div className="divide-y divide-gray-50">
      {appts.map((a) => {
        const st = STATUS_LABELS[a.status] ?? { label: a.status, color: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' };
        const d = new Date(a.starts_at);
        const canAtender = ['SCHEDULED', 'CONFIRMED'].includes(a.status);
        return (
          <div
            key={a.id}
            onClick={() => canAtender && onAtender(a.id)}
            className={`px-6 py-4 flex items-center gap-4 transition-colors
              ${canAtender ? 'cursor-pointer hover:bg-emerald-50/40 hover:ring-1 hover:ring-inset hover:ring-emerald-100' : 'hover:bg-gray-50/50'}`}
          >
            <div className="w-12 text-center shrink-0">
              <p className="text-xs text-gray-400 capitalize">{DAY_NAMES[d.getDay()]}</p>
              <p className="text-lg font-semibold text-gray-900 leading-tight">{d.getDate()}</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-500 shrink-0 w-16">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTime(a.starts_at)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{a.patient_name}</p>
              <p className="text-sm text-gray-400 truncate">{a.treatment_name ?? '—'}</p>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${st.color}`}>
              {st.label}
            </span>
            {canAtender && (
              <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}


export function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [allAppts, setAllAppts] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('day');
  const [atenderApptId, setAtenderApptId] = useState<number | null>(null);

  const now = new Date();

  useEffect(() => {
    apiFetch('/api/dashboard/')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setAllAppts(data.upcoming_appointments ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter helpers
  const todayAppts = allAppts.filter((a) => sameDay(new Date(a.starts_at), now));

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const reloadDashboard = useCallback(async () => {
    const r = await apiFetch('/api/dashboard/');
    const data = await r.json();
    setStats(data.stats);
    setAllAppts(data.upcoming_appointments ?? []);
  }, []);

  const handleAtender = useCallback((id: number) => {
    setAtenderApptId(id);
  }, []);

  const weekAppts = allAppts.filter((a) => {
    const d = new Date(a.starts_at);
    return d >= weekStart && d <= weekEnd;
  });

  const statCards = [
    { label: 'Citas Hoy',      value: stats?.appointments_today  ?? '—', icon: CalendarDays, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pacientes',      value: stats?.patients_total       ?? '—', icon: Users,        color: 'bg-green-50 text-green-600' },
    { label: 'Tratamientos',   value: stats?.treatments_active    ?? '—', icon: Scissors,     color: 'bg-purple-50 text-purple-600' },
    { label: 'Citas este mes', value: stats?.appointments_month   ?? '—', icon: TrendingUp,   color: 'bg-amber-50 text-amber-600' },
  ];

  const TABS: { key: Tab; label: string }[] = [
    { key: 'day',  label: 'Hoy' },
    { key: 'week', label: 'Esta semana' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">Aquí tienes un resumen de tu clínica</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-300" /> : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Appointments panel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header + tabs */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Citas</h2>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors
                  ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : tab === 'day' ? (
          <AppointmentList appts={todayAppts} emptyMsg="Sin citas hoy" onAtender={handleAtender} />
        ) : (
          <AppointmentList appts={weekAppts} emptyMsg="Sin citas esta semana" onAtender={handleAtender} />
        )}
      </div>

      <AtenderModal
        appointmentId={atenderApptId}
        onClose={() => setAtenderApptId(null)}
        onDone={reloadDashboard}
      />
    </div>
  );
}
