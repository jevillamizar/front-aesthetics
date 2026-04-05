import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { ChevronLeft, ChevronRight, DollarSign, Loader2, TrendingUp, Users } from 'lucide-react';

type MonthRow   = { month: string; total: number };
type NamedRow   = { name: string; total: number };

type RevenueData = {
  year: number;
  total: number;
  completed_appointments: number;
  avg_per_appointment: number;
  monthly: MonthRow[];
  top_treatments: NamedRow[];
  top_doctors: NamedRow[];
};

const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function BarChart({ data, max }: { data: MonthRow[]; max: number }) {
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((r, i) => {
        const pct = max > 0 ? (r.total / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-400 hidden sm:block">
              {r.total > 0 ? fmt(r.total).replace('COP\u00a0', '$') : ''}
            </span>
            <div className="w-full bg-gray-100 rounded-t-sm relative" style={{ height: '100px' }}>
              <div
                className="absolute bottom-0 w-full bg-gray-800 rounded-t-sm transition-all duration-500"
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

function HorizontalBar({ name, total, max }: { name: string; total: number; max: number }) {
  const pct = max > 0 ? (total / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-36 truncate flex-shrink-0">{name}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="bg-gray-800 h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-gray-900 w-28 text-right flex-shrink-0">{fmt(total)}</span>
    </div>
  );
}

export function RevenueAdmin() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/revenue/?year=${y}`);
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(year); }, [load, year]);

  const maxMonthly = data ? Math.max(...data.monthly.map((r) => r.total), 1) : 1;
  const maxTreatment = data?.top_treatments[0]?.total ?? 1;
  const maxDoctor    = data?.top_doctors[0]?.total    ?? 1;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ingresos</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Resumen financiero basado en historiales clínicos</p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-base font-semibold text-gray-900 w-16 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : !data ? null : (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-sm text-gray-500">Ingresos {year}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmt(data.total)}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Citas completadas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{data.completed_appointments}</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-gray-500">Promedio por cita</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{fmt(data.avg_per_appointment)}</p>
            </div>
          </div>

          {/* Monthly chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-6">Ingresos mensuales</h2>
            <BarChart data={data.monthly} max={maxMonthly} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top treatments */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">Top Tratamientos</h2>
              {data.top_treatments.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos aún</p>
              ) : (
                <div className="space-y-3">
                  {data.top_treatments.map((r, i) => (
                    <HorizontalBar key={i} name={r.name} total={r.total} max={maxTreatment} />
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
                    <HorizontalBar key={i} name={r.name} total={r.total} max={maxDoctor} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
