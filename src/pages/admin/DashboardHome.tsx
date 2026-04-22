import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { AtenderModal } from '../../components/AtenderModal';
import {
  CalendarDays, Users, Scissors, TrendingUp, Loader2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

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
  treatment_name: string | null;
  doctor_id: number | null;
  doctor_name: string | null;
};

type Doctor = { id: number; first_name: string; last_name: string; email: string };
type View = 'month' | 'week' | 'day';

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

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function fmt(iso: string, type: 'time' | 'date') {
  const d = new Date(iso);
  if (type === 'time') return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
}
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function isToday(d: Date, today: Date) {
  return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
}

/* ── Month Grid ────────────────────────────────────────────────────────── */

function MonthView({
  year, month, appointments, onDayClick, onApptClick, today,
}: {
  year: number; month: number; appointments: Appt[];
  onDayClick: (d: Date) => void; onApptClick: (id: number) => void; today: Date;
}) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = new Map<string, Appt[]>();
  for (const a of appointments) {
    const k = a.starts_at.slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(a);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-gray-50">
        {cells.map((d, i) => {
          const key = d ? isoDate(d) : '';
          const appts = d ? (byDay.get(key) || []) : [];
          const shown = appts.slice(0, 3);
          const extra = appts.length - 3;
          return (
            <div
              key={i}
              className={`min-h-[100px] border-b border-gray-50 p-1.5 ${d ? 'cursor-pointer hover:bg-gray-50/50' : 'bg-gray-50/30'}`}
              onClick={() => d && onDayClick(d)}
            >
              {d && (
                <>
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-1 ${
                    isToday(d, today) ? 'bg-gray-900 text-white' : 'text-gray-700'
                  }`}>
                    {d.getDate()}
                  </span>
                  <div className="space-y-0.5">
                    {shown.map((a) => (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onApptClick(a.id); }}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border truncate cursor-pointer hover:opacity-80 ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[a.status] ?? 'bg-gray-400'}`} />
                        <span className="truncate">{fmt(a.starts_at, 'time')} {a.patient_name.split(' ')[0]}</span>
                      </div>
                    ))}
                    {extra > 0 && <div className="text-xs text-gray-400 px-1.5">+{extra} más</div>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Week Grid ─────────────────────────────────────────────────────────── */

const HOUR_START = 7;
const HOUR_END   = 21;
const TOTAL_MINS = (HOUR_END - HOUR_START) * 60;

function WeekView({
  weekStart, appointments, onApptClick, today,
}: {
  weekStart: Date; appointments: Appt[]; onApptClick: (id: number) => void; today: Date;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100">
        <div />
        {days.map((d, i) => (
          <div key={i} className={`py-3 text-center border-l border-gray-100 ${isToday(d, today) ? 'bg-gray-50' : ''}`}>
            <p className="text-xs text-gray-500 uppercase">{DAYS_SHORT[d.getDay()]}</p>
            <p className={`text-base font-semibold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday(d, today) ? 'bg-gray-900 text-white' : 'text-gray-900'}`}>
              {d.getDate()}
            </p>
          </div>
        ))}
      </div>
      <div className="overflow-y-auto max-h-[600px]">
        <div className="relative grid grid-cols-[56px_repeat(7,1fr)]">
          {hours.map((h) => (
            <div key={h} className="contents">
              <div className="py-6 px-2 text-right">
                <span className="text-xs text-gray-400">{h}:00</span>
              </div>
              {days.map((_, di) => (
                <div key={di} className="border-l border-t border-gray-50 h-12" />
              ))}
            </div>
          ))}
          {days.map((d, di) => {
            const key = isoDate(d);
            const dayAppts = appointments.filter((a) => a.starts_at.slice(0, 10) === key);
            return dayAppts.map((a) => {
              const start = new Date(a.starts_at);
              const end = new Date(a.ends_at);
              const startMin = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
              const endMin = (end.getHours() - HOUR_START) * 60 + end.getMinutes();
              const top = Math.max(0, (startMin / TOTAL_MINS) * 100);
              const height = Math.max(2, ((endMin - startMin) / TOTAL_MINS) * 100);
              const colLeft = `calc(56px + ${di} * (100% - 56px) / 7)`;
              const colWidth = `calc((100% - 56px) / 7 - 2px)`;
              return (
                <div
                  key={a.id}
                  onClick={() => onApptClick(a.id)}
                  style={{ position: 'absolute', top: `${top}%`, height: `${height}%`, left: colLeft, width: colWidth }}
                  className={`rounded px-1.5 py-0.5 text-xs border overflow-hidden cursor-pointer hover:opacity-90 ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                >
                  <p className="font-medium truncate">{a.patient_name.split(' ')[0]}</p>
                  <p className="opacity-70 truncate">{fmt(a.starts_at, 'time')}</p>
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Day View ──────────────────────────────────────────────────────────── */

function DayView({ date, appointments, onApptClick }: {
  date: Date; appointments: Appt[]; onApptClick: (id: number) => void;
}) {
  const dayAppts = appointments
    .filter((a) => a.starts_at.slice(0, 10) === isoDate(date))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-medium text-gray-900">{date.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{dayAppts.length} cita{dayAppts.length !== 1 ? 's' : ''}</p>
      </div>
      {dayAppts.length === 0 ? (
        <div className="py-12 text-center">
          <CalendarDays className="w-7 h-7 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">Sin citas para este día</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {dayAppts.map((a) => (
            <div
              key={a.id}
              onClick={() => onApptClick(a.id)}
              className="flex items-center gap-4 px-5 py-3.5 cursor-pointer hover:bg-gray-50/50"
            >
              <div className="flex flex-col items-center min-w-[52px]">
                <span className="text-sm font-semibold text-gray-900">{fmt(a.starts_at, 'time')}</span>
                <span className="text-xs text-gray-400">{fmt(a.ends_at, 'time')}</span>
              </div>
              <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${STATUS_DOT[a.status] ?? 'bg-gray-300'}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{a.patient_name}</p>
                {a.treatment_name && <p className="text-sm text-gray-500 truncate">{a.treatment_name}</p>}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Dashboard (Agenda) ───────────────────────────────────────────── */

export function DashboardHome() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const today = new Date();

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Calendar state
  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  // Doctor filter
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<number | ''>('');

  // Modal
  const [atenderApptId, setAtenderApptId] = useState<number | null>(null);

  // Load stats
  useEffect(() => {
    apiFetch('/api/dashboard/')
      .then((r) => r.json())
      .then((data) => setStats(data.stats))
      .finally(() => setStatsLoading(false));
  }, []);

  // Load doctors (admin only)
  useEffect(() => {
    if (isDoctor && user?.id) {
      setDoctorFilter(user.id);
    } else {
      apiFetch('/api/doctors/').then((r) => r.json()).then((d) => setDoctors(d.doctors || []));
    }
  }, [isDoctor, user?.id]);

  // Date range helper
  const getRange = useCallback(() => {
    if (view === 'month') {
      const from = isoDate(new Date(date.getFullYear(), date.getMonth(), 1));
      const to = isoDate(new Date(date.getFullYear(), date.getMonth() + 1, 0));
      return { from, to };
    }
    if (view === 'week') {
      const ws = new Date(date); ws.setDate(date.getDate() - date.getDay());
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return { from: isoDate(ws), to: isoDate(we) };
    }
    return { from: isoDate(date), to: isoDate(date) };
  }, [view, date]);

  // Load appointments
  const loadAppointments = useCallback(async () => {
    setCalLoading(true);
    try {
      const { from, to } = getRange();
      let url = `/api/appointments/?from=${from}&to=${to}`;
      if (doctorFilter) url += `&doctor_id=${doctorFilter}`;
      const res = await apiFetch(url);
      const json = await res.json();
      setAppointments(json.appointments || []);
    } finally {
      setCalLoading(false);
    }
  }, [getRange, doctorFilter]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Navigation
  const navigate = (dir: 1 | -1) => {
    const d = new Date(date);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setDate(d);
  };
  const goToday = () => {
    const t = new Date();
    if (view === 'month') setDate(new Date(t.getFullYear(), t.getMonth(), 1));
    else setDate(t);
  };

  const weekStart = new Date(date);
  if (view === 'week') weekStart.setDate(date.getDate() - date.getDay());

  const headerLabel = () => {
    if (view === 'month') return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    if (view === 'week') {
      const ws = new Date(date); ws.setDate(date.getDate() - date.getDay());
      const we = new Date(ws); we.setDate(ws.getDate() + 6);
      return `${ws.getDate()} ${MONTHS[ws.getMonth()].slice(0,3)} — ${we.getDate()} ${MONTHS[we.getMonth()].slice(0,3)} ${we.getFullYear()}`;
    }
    return date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const statCards = [
    { label: 'Citas Hoy',      value: stats?.appointments_today  ?? '—', icon: CalendarDays, color: 'bg-blue-50 text-blue-600' },
    { label: 'Pacientes',      value: stats?.patients_total       ?? '—', icon: Users,        color: 'bg-green-50 text-green-600' },
    { label: 'Tratamientos',   value: stats?.treatments_active    ?? '—', icon: Scissors,     color: 'bg-purple-50 text-purple-600' },
    { label: 'Citas este mes', value: stats?.appointments_month   ?? '—', icon: TrendingUp,   color: 'bg-amber-50 text-amber-600' },
  ];

  const handleDone = useCallback(async () => {
    loadAppointments();
    // Refresh stats too
    const r = await apiFetch('/api/dashboard/');
    const data = await r.json();
    setStats(data.stats);
  }, [loadAppointments]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isDoctor ? 'Mi Agenda' : 'Agenda'}
        </h1>
        <p className="text-gray-500 mt-0.5 text-sm">
          {isDoctor ? 'Tu agenda personal' : 'Vista general de la clínica'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {statCards.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-semibold text-gray-900">
              {statsLoading ? <Loader2 className="w-4 h-4 animate-spin text-gray-300" /> : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Calendar toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 min-w-[200px] text-center capitalize">{headerLabel()}</h2>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={goToday} className="ml-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            Hoy
          </button>
          {calLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-300 ml-1" />}
        </div>

        <div className="flex items-center gap-2">
          {/* Doctor filter (admin only) */}
          {!isDoctor && doctors.length > 0 && (
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Todos los médicos</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : d.email}
                </option>
              ))}
            </select>
          )}

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${view === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {v === 'month' ? 'Mes' : v === 'week' ? 'Semana' : 'Día'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(STATUS_LABEL).map(([k, label]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${STATUS_DOT[k]}`} />
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar views */}
      {view === 'month' && (
        <MonthView year={date.getFullYear()} month={date.getMonth()} appointments={appointments}
          onDayClick={(d) => { setDate(d); setView('day'); }} onApptClick={setAtenderApptId} today={today} />
      )}
      {view === 'week' && (
        <WeekView weekStart={weekStart} appointments={appointments} onApptClick={setAtenderApptId} today={today} />
      )}
      {view === 'day' && (
        <DayView date={date} appointments={appointments} onApptClick={setAtenderApptId} />
      )}

      <AtenderModal
        appointmentId={atenderApptId}
        onClose={() => setAtenderApptId(null)}
        onDone={handleDone}
      />
    </div>
  );
}
