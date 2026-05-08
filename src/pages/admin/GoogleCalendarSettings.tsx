import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Unlink,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

type GCalStatus = {
  connected: boolean;
  calendar_id?: string;
  connected_at?: string;
};

export function GoogleCalendarSettings() {
  const [status, setStatus]         = useState<GCalStatus | null>(null);
  const [loading, setLoading]       = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingCal, setSavingCal]   = useState(false);
  const [calInput, setCalInput]     = useState('');
  const [calSuccess, setCalSuccess] = useState(false);
  const [error, setError]           = useState('');

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/gcal/status/');
      if (!res.ok) throw new Error('No se pudo obtener el estado');
      const data: GCalStatus = await res.json();
      setStatus(data);
      if (data.connected && data.calendar_id && data.calendar_id !== 'primary') {
        setCalInput(data.calendar_id);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar estado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      fetchStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    setError('');
    try {
      const res = await apiFetch('/api/gcal/connect/');
      if (!res.ok) throw new Error('No se pudo iniciar la conexión');
      const data: { auth_url: string } = await res.json();
      window.open(data.auth_url, '_blank', 'noopener,noreferrer');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al conectar');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('¿Desconectar Google Calendar? Se eliminarán los tokens guardados.')) return;
    setDisconnecting(true);
    setError('');
    try {
      const res = await apiFetch('/api/gcal/disconnect/', { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al desconectar');
      setStatus({ connected: false });
      setCalInput('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveCalendar = async () => {
    if (!calInput.trim()) return;
    setSavingCal(true);
    setError('');
    setCalSuccess(false);
    try {
      const res = await apiFetch('/api/gcal/calendar/', {
        method: 'PATCH',
        body: JSON.stringify({ calendar_id: calInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al guardar');
      setStatus((prev) => prev ? { ...prev, calendar_id: data.calendar_id } : prev);
      setCalSuccess(true);
      setTimeout(() => setCalSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar calendario');
    } finally {
      setSavingCal(false);
    }
  };

  const handleTestSlots = () => {
    window.open('/disponibilidad', '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Estado de conexión */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${status?.connected ? 'bg-green-50' : 'bg-gray-100'}`}>
              <Calendar className={`w-5 h-5 ${status?.connected ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Google Calendar</p>
              {status?.connected ? (
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Conectado</span>
                  {status.connected_at && (
                    <span className="text-xs text-gray-400 ml-1">
                      desde {new Date(status.connected_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-0.5">
                  <XCircle className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">No conectado</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchStatus}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Actualizar estado"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {status?.connected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />}
                Desconectar
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Conectar con Google
              </button>
            )}
          </div>
        </div>

        {!status?.connected && (
          <div className="mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              Sin Google Calendar conectado, el selector de horarios no mostrará disponibilidad.
              Haz clic en <strong>Conectar con Google</strong>, autoriza el acceso y vuelve a esta
              página — el estado se actualizará automáticamente.
            </p>
          </div>
        )}
      </div>

      {/* Configurar calendario específico */}
      {status?.connected && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Calendario a usar</h2>
          <p className="text-xs text-gray-500 mb-4">
            Por defecto se usa el calendario primario. Si quieres usar un calendario compartido
            específico, ingresa su ID (lo encuentras en la configuración del calendario en Google Calendar → Integrar calendario).
          </p>

          {calSuccess && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Calendario actualizado correctamente.
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={calInput}
              onChange={(e) => setCalInput(e.target.value)}
              placeholder="primary  ó  nombre@group.calendar.google.com"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <button
              onClick={handleSaveCalendar}
              disabled={savingCal || !calInput.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {savingCal ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Guardar
            </button>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Calendario actual: <span className="font-mono">{status.calendar_id || 'primary'}</span>
          </p>
        </div>
      )}

      {/* Probar disponibilidad */}
      {status?.connected && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Verificar disponibilidad</h2>
          <p className="text-xs text-gray-500 mb-4">
            Comprueba que el calendario devuelve horarios disponibles para hoy.
          </p>
          <button
            onClick={handleTestSlots}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver slots disponibles hoy
          </button>
        </div>
      )}
    </div>
  );
}
