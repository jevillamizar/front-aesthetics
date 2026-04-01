import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { CalendarDays, Users, Scissors, TrendingUp, Loader2, Clock } from 'lucide-react';

type Stats = {
  appointments_today: number;
  appointments_month: number;
  patients_total: number;
  treatments_active: number;
};

type UpcomingAppointment = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  patient_name: string;
  patient_email: string;
  treatment_name: string;
  doctor_email: string | null;
  notes: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  SCHEDULED: { label: 'Programada', color: 'bg-blue-50 text-blue-700' },
  CONFIRMED: { label: 'Confirmada', color: 'bg-green-50 text-green-700' },
  COMPLETED: { label: 'Completada', color: 'bg-gray-100 text-gray-600' },
  CANCELED:  { label: 'Cancelada',  color: 'bg-red-50 text-red-600' },
  NO_SHOW:   { label: 'No asistió', color: 'bg-amber-50 text-amber-700' },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/dashboard/')
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setUpcoming(data.upcoming_appointments);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Citas Hoy',    value: stats?.appointments_today  ?? '—', icon: CalendarDays, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pacientes',    value: stats?.patients_total       ?? '—', icon: Users,        color: 'bg-green-50 text-green-600' },
    { label: 'Tratamientos', value: stats?.treatments_active    ?? '—', icon: Scissors,     color: 'bg-purple-50 text-purple-600' },
    { label: 'Citas este mes', value: stats?.appointments_month ?? '—', icon: TrendingUp,   color: 'bg-amber-50 text-amber-600' },
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

      {/* Upcoming appointments */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-medium text-gray-900">Próximas citas</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        ) : upcoming.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay próximas citas programadas</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {upcoming.map((a) => {
              const st = STATUS_LABELS[a.status] ?? { label: a.status, color: 'bg-gray-100 text-gray-600' };
              return (
                <div key={a.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                  {/* Date block */}
                  <div className="w-14 text-center shrink-0">
                    <p className="text-xs text-gray-400 capitalize">{formatDate(a.starts_at).split(' ')[0]}</p>
                    <p className="text-lg font-semibold text-gray-900 leading-tight">{new Date(a.starts_at).getDate()}</p>
                    <p className="text-xs text-gray-400 capitalize">{formatDate(a.starts_at).split(' ').slice(1).join(' ')}</p>
                  </div>

                  {/* Time */}
                  <div className="flex items-center gap-1 text-sm text-gray-500 shrink-0 w-24">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(a.starts_at)}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{a.patient_name}</p>
                    <p className="text-sm text-gray-400 truncate">{a.treatment_name}</p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${st.color}`}>
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
