import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  ChevronLeft, ChevronRight, DollarSign, Loader2,
  TrendingUp, Users, Clock, CreditCard,
} from 'lucide-react';

type MonthRow   = { month: string; total: number };
type NamedRow   = { name: string; total: number };
type MethodRow  = { method: string; label: string; total: number; count: number };

type RevenueData = {
  year: number;
  total: number;
  pending: number;
  completed_appointments: number;
  avg_per_appointment: number;
  monthly: MonthRow[];
  top_treatments: NamedRow[];
  top_doctors: NamedRow[];
  payment_methods: MethodRow[];
};

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return fmt(n);
}

function BarChart({ data, max }: { data: MonthRow[]; max: number }) {
  return (
    <div className="flex items-end gap-1.5 h-44">
      {data.map((r, i) => {
        const pct = max > 0 ? Math.max((r.total / max) * 100, r.total > 0 ? 2 : 0) : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            {/* Tooltip */}
            {r.total > 0 && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {fmtShort(r.total)}
              </div>
            )}
            <div className="w-full bg-gray-100 rounded-t-md relative" style={{ height: '120px' }}>
              <div
                className={`absolute bottom-0 w-full rounded-t-md transition-all duration-500 ${r.total > 0 ? 'bg-gray-900' : 'bg-gray-100'}`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-500">{MONTH_LABELS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function HorizontalBar({ name, total, max, rank }: { name: string; total: number; max: number; rank: number }) {
  const pct = max > 0 ? (total / max) * 100 : 0;
  const rankColors = ['bg-gray-900', 'bg-gray-700', 'bg-gray-500', 'bg-gray-400', 'bg-gray-300'];
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{rank}</span>
      <span className="text-sm text-gray-700 w-32 truncate flex-shrink-0">{name}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${rankColors[rank - 1] ?? 'bg-gray-300'} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-900 w-24 text-right flex-shrink-0">{fmtShort(total)}</span>
    </div>
  );
}

const METHOD_ICONS: Record<string, string> = {
  CASH: '💵', CARD: '💳', TRANSFER: '🏦', OTHER: '•',
};

export function RevenueAdmin() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/revenue/?year=${y}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year); }, [load, year]);

  const maxMonthly   = data ? Math.max(...data.monthly.map((r) => r.total), 1) : 1;
  const maxTreatment = data?.top_treatments[0]?.total ?? 1;
  const maxDoctor    = data?.top_doctors[0]?.total    ?? 1;
  const methodTotal  = data?.payment_methods.reduce((s, r) => s + r.total, 0) ?? 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ingresos</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Resumen financiero basado en pagos registrados</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-1 py-1">
          <button onClick={() => setYear((y) => y - 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-900 w-14 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : !data ? null : (
        <div className="space-y-6">

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                </div>
                <span className="text-xs text-gray-500">Cobrado {year}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtShort(data.total)}</p>
              <p className="text-xs text-gray-400 mt-1">{fmt(data.total)}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-xs text-gray-500">Por cobrar</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtShort(data.pending)}</p>
              <p className="text-xs text-gray-400 mt-1">Pagos pendientes</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-gray-500">Citas completadas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.completed_appointments}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                </div>
                <span className="text-xs text-gray-500">Promedio / cita</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmtShort(data.avg_per_appointment)}</p>
            </div>
          </div>

          {/* Monthly chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Ingresos mensuales</h2>
              <span className="text-sm font-semibold text-gray-900">{fmt(data.total)}</span>
            </div>
            <BarChart data={data.monthly} max={maxMonthly} />
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top treatments */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">Top Procedimientos</h2>
              {data.top_treatments.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos aún</p>
              ) : (
                <div className="space-y-3">
                  {data.top_treatments.map((r, i) => (
                    <HorizontalBar key={i} rank={i + 1} name={r.name} total={r.total} max={maxTreatment} />
                  ))}
                </div>
              )}
            </div>

            {/* Top doctors */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">Top Médicos</h2>
              {data.top_doctors.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos aún</p>
              ) : (
                <div className="space-y-3">
                  {data.top_doctors.map((r, i) => (
                    <HorizontalBar key={i} rank={i + 1} name={r.name} total={r.total} max={maxDoctor} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment methods */}
          {data.payment_methods.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Métodos de pago</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.payment_methods.map((m) => (
                  <div key={m.method} className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xl mb-2">{METHOD_ICONS[m.method] ?? '•'}</div>
                    <p className="text-sm font-medium text-gray-900">{m.label}</p>
                    <p className="text-base font-bold text-gray-900 mt-1">{fmtShort(m.total)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.count} {m.count === 1 ? 'pago' : 'pagos'} · {Math.round((m.total / methodTotal) * 100)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
