import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Loader2, Pencil, Plus, Save, Search, Stethoscope, Trash2, X } from 'lucide-react';

type Doctor = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
};

type FormData = {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  is_active: boolean;
};

const emptyForm: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  is_active: true,
};

export function DoctorsAdmin() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await apiFetch(`/api/doctors/${params}`);
      const json = await res.json();
      setDoctors(json.doctors || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => setEditing({ ...emptyForm });
  const openEdit = (d: Doctor) =>
    setEditing({ id: d.id, first_name: d.first_name, last_name: d.last_name, email: d.email, password: '', is_active: d.is_active });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.email) { setError('El email es obligatorio.'); return; }
    if (!editing.id && !editing.password) { setError('La contraseña es obligatoria al crear.'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        first_name: editing.first_name,
        last_name: editing.last_name,
        email: editing.email,
        is_active: editing.is_active,
      };
      if (!editing.id) body.password = editing.password;
      if (editing.id && editing.password) body.password = editing.password;

      const isNew = !editing.id;
      const url = isNew ? '/api/doctors/' : `/api/doctors/${editing.id}/`;
      const res = await apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      setEditing(null);
      await load(search);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este médico? Esta acción no se puede deshacer.')) return;
    await apiFetch(`/api/doctors/${id}/`, { method: 'DELETE' });
    await load(search);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Médicos</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestiona el equipo médico de la clínica</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo Médico
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Buscar
        </button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }} className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            Limpiar
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : doctors.length === 0 ? (
          <div className="py-16 text-center">
            <Stethoscope className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay médicos registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {doctors.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{d.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${d.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {d.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Editar Médico' : 'Nuevo Médico'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input type="text" value={editing.first_name} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Nombre" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input type="text" value={editing.last_name} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Apellido" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="doctor@clinica.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {!editing.id && <span className="text-red-500">*</span>}
                  {editing.id && <span className="text-xs text-gray-400 font-normal ml-1">(dejar vacío para no cambiar)</span>}
                </label>
                <input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="••••••••" />
              </div>

              {editing.id && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editing.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm text-gray-500">{editing.is_active ? 'Activo' : 'Inactivo'}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Guardar cambios' : 'Crear médico'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
