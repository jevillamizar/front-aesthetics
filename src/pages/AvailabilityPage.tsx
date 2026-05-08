import { useEffect, useState } from 'react';
import { getApiBase } from '../lib/api';
import { Calendar, ChevronLeft, ChevronRight, Clock, CalendarDays, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

type Slot = { starts_at: string; ends_at: string };

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toDateLocal(iso: string) {
  return new Date(iso);
}

function formatTime(iso: string) {
  const d = toDateLocal(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date) {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - day);
  return r;
}

export function AvailabilityPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clinicName, setClinicName] = useState('');

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    fetch(`${getApiBase()}/public/landing/`)
      .then(r => r.json())
      .then(d => setClinicName(d?.clinic?.name || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const dateStr = isoDate(selectedDate);
    setLoading(true);
    setError('');
    setSlots([]);
    fetch(`${getApiBase()}/public/availability/?date=${dateStr}`)
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .catch(() => setError('No se pudo cargar la disponibilidad.'))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  const isPast = (d: Date) => d < today;

  const handlePrevWeek = () => setWeekStart(w => addDays(w, -7));
  const handleNextWeek = () => setWeekStart(w => addDays(w, 7));

  const selectDay = (d: Date) => {
    if (isPast(d)) return;
    setSelectedDate(d);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 leading-none">Disponibilidad</p>
            <p className="text-base font-semibold text-gray-900 leading-tight">
              {clinicName || 'Clínica'}
            </p>
          </div>
          <a
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la clínica
          </a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Calendar strip */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Month + navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900">
                {MONTHS_ES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </p>
            </div>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day buttons */}
          <div className="grid grid-cols-7 gap-1 p-4">
            {weekDays.map((d, i) => {
              const isSelected = isoDate(d) === isoDate(selectedDate);
              const past = isPast(d);
              const isToday = isoDate(d) === isoDate(today);
              return (
                <button
                  key={i}
                  onClick={() => selectDay(d)}
                  disabled={past}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-colors
                    ${isSelected
                      ? 'bg-gray-900 text-white'
                      : past
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    {DAYS_ES[d.getDay()]}
                  </span>
                  <span className={`text-base font-bold leading-none ${isToday && !isSelected ? 'text-indigo-600' : ''}`}>
                    {d.getDate()}
                  </span>
                  {isToday && !isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Slots */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">
              {DAYS_ES[selectedDate.getDay()]}, {selectedDate.getDate()} de {MONTHS_ES[selectedDate.getMonth()]}
            </p>
            {!loading && slots.length > 0 && (
              <span className="ml-auto text-xs text-gray-400 font-medium">
                {slots.length} horario{slots.length !== 1 ? 's' : ''} disponible{slots.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="p-5">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p className="text-sm">Cargando disponibilidad…</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {!loading && !error && slots.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                <Clock className="w-8 h-8 opacity-30" />
                <p className="text-sm font-medium">No hay horarios disponibles</p>
                <p className="text-xs">Prueba con otra fecha</p>
              </div>
            )}

            {!loading && !error && slots.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {slots.map((slot, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-white transition-colors group"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="text-sm font-medium text-gray-700">
                      {formatTime(slot.starts_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Los horarios se actualizan en tiempo real desde Google Calendar
        </p>
      </main>
    </div>
  );
}
