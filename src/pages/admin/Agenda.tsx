import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { apiFetch } from '../../lib/api';
import { AtenderModal } from '../../components/AtenderModal';
import { NewAppointmentModal } from '../../components/NewAppointmentModal';
import {
  CalendarDays, Loader2,
  ChevronLeft, ChevronRight,
  Plus,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

type Appt = {
  id: number;
  starts_at: string;
  ends_at: string;
  status: string;
  patient_name: string;
  treatment_name: string | null;
  doctor_id: number | null;
  doctor_name: string | null;
  appointment_type: string;
};

type Doctor = { id: number; first_name: string; last_name: string; email: string };
type View = 'month' | 'week' | 'day';

/* ── Constants ─────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  PENDING:     'bg-amber-100 text-amber-800 border-amber-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  COMPLETED:   'bg-gray-100 text-gray-600 border-gray-200',
  CANCELED:    'bg-red-100 text-red-600 border-red-200',
  NO_SHOW:     'bg-amber-100 text-amber-700 border-amber-200',
  EXPIRED:     'bg-orange-100 text-orange-700 border-orange-200',
};
const STATUS_DOT: Record<string, string> = {
  PENDING:     'bg-amber-400',
  IN_PROGRESS: 'bg-indigo-500',
  COMPLETED:   'bg-gray-400',
  CANCELED:    'bg-red-400',
  NO_SHOW:     'bg-amber-400',
  EXPIRED:     'bg-orange-400',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente', IN_PROGRESS: 'En curso',
  COMPLETED: 'Completada', CANCELED: 'Cancelada', NO_SHOW: 'No asistió', EXPIRED: 'Vencida',
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

/* ── Month Grid ─────────────────────────────────────────────────────────── */

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
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="py-2 sm:py-2.5 text-center text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">{d}</div>
        ))}
      </div>

      {/* Calendar grid - mobile: slightly larger cells */}
      <div className="grid grid-cols-7 divide-x divide-gray-50">
        {cells.map((d, i) => {
          const key = d ? isoDate(d) : '';
          const appts = d ? (byDay.get(key) || []) : [];
          const shown = appts.slice(0, 2); // Show fewer on mobile
          const extra = appts.length - 2;
          return (
            <div
              key={i}
              className={`min-h-[80px] sm:min-h-[100px] border-b border-gray-50 p-1 sm:p-1.5 ${d ? 'cursor-pointer hover:bg-gray-50/50 active:bg-gray-100' : 'bg-gray-50/30'}`}
              onClick={() => d && onDayClick(d)}
            >
              {d && (
                <>
                  {/* Day number - larger touch target on mobile */}
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`inline-flex items-center justify-center w-6 h-6 sm:w-6 sm:h-6 text-xs font-medium rounded-full ${
                      isToday(d, today) ? 'bg-gray-900 text-white' : 'text-gray-700'
                    }`}>
                      {d.getDate()}
                    </span>
                    {/* Appointment count badge on mobile */}
                    {appts.length > 0 && (
                      <span className="sm:hidden inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-medium rounded-full bg-gray-100 text-gray-600">
                        {appts.length}
                      </span>
                    )}
                  </div>

                  {/* Appointments - stacked on mobile */}
                  <div className="space-y-0.5">
                    {shown.map((a) => (
                      <div
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); onApptClick(a.id); }}
                        className={`flex items-center gap-1 px-1 py-0.5 rounded text-[10px] sm:text-xs border truncate cursor-pointer hover:opacity-80 touch-manipulation min-h-[20px] ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[a.status] ?? 'bg-gray-400'}`} />
                        <span className="truncate hidden sm:inline">{fmt(a.starts_at, 'time')} </span>
                        <span className="truncate">{a.patient_name.split(' ')[0]}</span>
                      </div>
                    ))}
                    {extra > 0 && (
                      <div className="text-[10px] sm:text-xs text-gray-400 px-0.5 sm:px-1.5 truncate">
                        +{extra} más
                      </div>
                    )}
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

/* ── Week Grid ──────────────────────────────────────────────────────────── */

const HOUR_START = 7;
const HOUR_END   = 21;
const TOTAL_MINS = (HOUR_END - HOUR_START) * 60;
const DAY_MIN_WIDTH = 100; // px - min width for each day column on mobile

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
      {/* Header - Mobile: scrollable container */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="grid grid-cols-[56px_repeat(7,minmax(100px,1fr))] min-w-[756px] sm:min-w-0 sm:grid-cols-[56px_repeat(7,1fr)] border-b border-gray-100">
          <div className="sticky left-0 bg-white z-10" />
          {days.map((d, i) => (
            <div key={i} className={`py-3 text-center border-l border-gray-100 ${isToday(d, today) ? 'bg-gray-50' : ''}`}>
              <p className="text-xs text-gray-500 uppercase">{DAYS_SHORT[d.getDay()]}</p>
              <p className={`text-base font-semibold mt-0.5 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday(d, today) ? 'bg-gray-900 text-white' : 'text-gray-900'}`}>
                {d.getDate()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid - Mobile: horizontal scroll */}
      <div className="overflow-x-auto scrollbar-hide max-h-[500px] sm:max-h-[600px]">
        <div className="relative grid grid-cols-[56px_repeat(7,minmax(100px,1fr))] min-w-[756px] sm:min-w-0 sm:grid-cols-[56px_repeat(7,1fr)]">
          {/* Time column - sticky on mobile */}
          <div className="sticky left-0 bg-white z-10 border-r border-gray-100">
            {hours.map((h) => (
              <div key={h} className="py-4 sm:py-6 px-2 text-right h-12 sm:h-auto">
                <span className="text-xs text-gray-400">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((d, di) => {
            const key = isoDate(d);
            const dayAppts = appointments.filter((a) => a.starts_at.slice(0, 10) === key);
            return (
              <div key={di} className="relative border-l border-gray-50 min-h-[600px]">
                {/* Hour grid lines */}
                {hours.map((h) => (
                  <div key={h} className="border-t border-gray-50 h-12 sm:h-auto sm:py-4" />
                ))}

                {/* Appointments */}
                {dayAppts.map((a) => {
                  const start = new Date(a.starts_at);
                  const end = new Date(a.ends_at);
                  const startMin = (start.getHours() - HOUR_START) * 60 + start.getMinutes();
                  const endMin = (end.getHours() - HOUR_START) * 60 + end.getMinutes();
                  const top = Math.max(0, (startMin / TOTAL_MINS) * 100);
                  const height = Math.max(3, ((endMin - startMin) / TOTAL_MINS) * 100);

                  return (
                    <div
                      key={a.id}
                      onClick={() => onApptClick(a.id)}
                      style={{ position: 'absolute', top: `${top}%`, height: `${height}%`, left: '2px', right: '2px' }}
                      className={`rounded px-1.5 sm:px-2 py-1 text-xs border overflow-hidden cursor-pointer hover:opacity-90 active:scale-[0.98] transition-transform touch-manipulation ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                    >
                      <p className="font-medium truncate leading-tight">{a.patient_name.split(' ')[0]}</p>
                      <p className="opacity-70 truncate text-[10px] sm:text-xs">{fmt(a.starts_at, 'time')}</p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Day View ───────────────────────────────────────────────────────────── */

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

/* ── Agenda Page ────────────────────────────────────────────────────────── */

export function Agenda() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const today = new Date();

  const [view, setView] = useState<View>('week');
  const [date, setDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [calLoading, setCalLoading] = useState(false);

  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Filters ('' = todos)
  const [filterDoctor, setFilterDoctor] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterTreatment, setFilterTreatment] = useState<string>('');

  const [atenderApptId, setAtenderApptId] = useState<number | null>(null);
  const [showNewAppt, setShowNewAppt] = useState(false);

  useEffect(() => {
    if (!isDoctor) {
      apiFetch('/api/doctors/').then((r) => r.json()).then((d) => setDoctors(d.doctors || []));
    }
  }, [isDoctor]);

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

  const loadAppointments = useCallback(async () => {
    setCalLoading(true);
    try {
      const { from, to } = getRange();
      const url = `/api/appointments/?from=${from}&to=${to}`;
      const res = await apiFetch(url);
      const json = await res.json();
      setAppointments(json.appointments || []);
    } finally {
      setCalLoading(false);
    }
  }, [getRange]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

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

  // Derived: unique treatment names + "Valoración" option
  const treatmentOptions: string[] = [
    'Valoración',
    ...Array.from(
      new Set(
        appointments
          .filter((a) => a.appointment_type !== 'VALORACION' && a.treatment_name)
          .map((a) => a.treatment_name as string)
      )
    ).sort(),
  ];

  // Client-side filtering for calendar display
  const visibleAppointments = appointments.filter((a) => {
    if (filterDoctor && String(a.doctor_id) !== filterDoctor) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterTreatment) {
      if (filterTreatment === 'Valoración') {
        if (a.appointment_type !== 'VALORACION') return false;
      } else {
        if (a.treatment_name !== filterTreatment) return false;
      }
    }
    return true;
  });

  const handleDone = useCallback(() => {
    loadAppointments();
  }, [loadAppointments]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {isDoctor ? 'Mi Agenda' : 'Agenda'}
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {isDoctor ? 'Tu agenda personal' : 'Vista general de la clínica'}
          </p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setShowNewAppt(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Nueva Cita
          </button>
        )}
      </div>

      {/* Filters - Mobile: full width, stacked / Desktop: inline */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-5">
        {/* Procedimiento */}
        <div className="flex flex-col gap-1.5 sm:gap-1 flex-1 sm:flex-auto min-w-0">
          <span className="text-xs text-gray-400 font-medium">Procedimiento</span>
          <select
            value={filterTreatment}
            onChange={(e) => setFilterTreatment(e.target.value)}
            className="w-full sm:w-auto sm:min-w-[160px] px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 touch-manipulation"
          >
            <option value="">Todos</option>
            {treatmentOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Responsable */}
        {!isDoctor && (
          <div className="flex flex-col gap-1.5 sm:gap-1 flex-1 sm:flex-auto min-w-0">
            <span className="text-xs text-gray-400 font-medium">Responsable</span>
            <select
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              className="w-full sm:w-auto sm:min-w-[160px] px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 touch-manipulation"
            >
              <option value="">Todos</option>
              {doctors.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : d.email}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Estado */}
        <div className="flex flex-col gap-1.5 sm:gap-1 flex-1 sm:flex-auto min-w-0">
          <span className="text-xs text-gray-400 font-medium">Estado</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto sm:min-w-[160px] px-3 py-2.5 sm:py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 touch-manipulation"
          >
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Clear button - aligned bottom on desktop */}
        {(filterTreatment || filterDoctor || filterStatus) && (
          <div className="flex items-end">
            <button
              onClick={() => { setFilterTreatment(''); setFilterDoctor(''); setFilterStatus(''); }}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm sm:text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Calendar toolbar - Mobile: full width, larger touch targets */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 mb-4">
        {/* Navigation */}
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600" />
            </button>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 min-w-[140px] sm:min-w-[200px] text-center capitalize">
              {headerLabel()}
            </h2>
            <button
              onClick={() => navigate(1)}
              className="p-2.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Siguiente"
            >
              <ChevronRight className="w-5 h-5 sm:w-4 sm:h-4 text-gray-600" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="px-4 py-2 sm:px-3 sm:py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px] sm:min-h-0"
            >
              Hoy
            </button>
            {calLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-300" />}
          </div>
        </div>

        {/* View switcher - Mobile: full width */}
        <div className="flex justify-center sm:justify-start">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
            {(['day', 'week', 'month'] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2.5 sm:px-3 sm:py-2 text-sm font-medium transition-colors touch-manipulation min-h-[44px] sm:min-h-0 ${view === v ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
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
        <MonthView year={date.getFullYear()} month={date.getMonth()} appointments={visibleAppointments}
          onDayClick={(d) => { setDate(d); setView('day'); }} onApptClick={setAtenderApptId} today={today} />
      )}
      {view === 'week' && (
        <WeekView weekStart={weekStart} appointments={visibleAppointments} onApptClick={setAtenderApptId} today={today} />
      )}
      {view === 'day' && (
        <DayView date={date} appointments={visibleAppointments} onApptClick={setAtenderApptId} />
      )}

      <AtenderModal
        appointmentId={atenderApptId}
        onClose={() => setAtenderApptId(null)}
        onDone={handleDone}
      />

      {showNewAppt && (
        <NewAppointmentModal
          onClose={() => setShowNewAppt(false)}
          onCreated={handleDone}
          defaultDate={isoDate(date)}
          defaultDoctorId={filterDoctor ? Number(filterDoctor) : undefined}
        />
      )}
    </div>
  );
}
