import { useAuth } from '../../lib/auth';
import { CalendarDays, Users, Scissors, TrendingUp } from 'lucide-react';

const stats = [
  { label: 'Citas Hoy', value: '—', icon: CalendarDays, color: 'bg-blue-50 text-blue-600' },
  { label: 'Pacientes', value: '—', icon: Users, color: 'bg-green-50 text-green-600' },
  { label: 'Tratamientos', value: '—', icon: Scissors, color: 'bg-purple-50 text-purple-600' },
  { label: 'Este Mes', value: '—', icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
];

export function DashboardHome() {
  const { user } = useAuth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          Bienvenido{user?.first_name ? `, ${user.first_name}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">
          Aquí tienes un resumen de tu clínica
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Próximas citas</h2>
        <p className="text-gray-500 text-sm">Las citas programadas aparecerán aquí.</p>
      </div>
    </div>
  );
}
