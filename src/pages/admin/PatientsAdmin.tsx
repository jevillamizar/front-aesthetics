import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Eye, Loader2, Pencil, Plus, Save, Search, Trash2, Users, X } from 'lucide-react';

type Patient = {
  id: number;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  sex: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

type FormData = {
  id?: number;
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

const DOC_TYPES = [
  { value: 'CC',  label: 'Cédula de Ciudadanía' },
  { value: 'CE',  label: 'Cédula de Extranjería' },
  { value: 'TI',  label: 'Tarjeta de Identidad' },
  { value: 'PP',  label: 'Pasaporte' },
  { value: 'RC',  label: 'Registro Civil' },
  { value: 'NIT', label: 'NIT' },
];

const SEX_OPTIONS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Femenino' },
  { value: 'O', label: 'Otro' },
];

const emptyForm: FormData = {
  document_type: '',
  document_number: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  sex: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

function formatDob(iso: string | null) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function PatientsAdmin() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await apiFetch(`/api/patients/${params}`);
      const json = await res.json();
      setPatients(json.patients || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setError(''); setEditing({ ...emptyForm }); };
  const openEdit = (p: Patient) => {
    setError('');
    setEditing({
      id: p.id,
      document_type: p.document_type,
      document_number: p.document_number,
      first_name: p.first_name,
      last_name: p.last_name,
      date_of_birth: p.date_of_birth ?? '',
      sex: p.sex,
      phone: p.phone,
      email: p.email,
      address: p.address,
      notes: p.notes,
    });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.first_name.trim() || !editing.last_name.trim()) {
      setError('Nombres y apellidos son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        document_type: editing.document_type,
        document_number: editing.document_number.trim(),
        first_name: editing.first_name.trim(),
        last_name: editing.last_name.trim(),
        date_of_birth: editing.date_of_birth || null,
        sex: editing.sex,
        phone: editing.phone.trim(),
        email: editing.email.trim(),
        address: editing.address.trim(),
        notes: editing.notes.trim(),
      };
      const isNew = !editing.id;
      const url = isNew ? '/api/patients/' : `/api/patients/${editing.id}/`;
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
    if (!confirm('¿Eliminar este paciente? Esta acción no se puede deshacer.')) return;
    await apiFetch(`/api/patients/${id}/`, { method: 'DELETE' });
    await load(search);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Gestiona el directorio de pacientes</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Paciente
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, documento, email o teléfono…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Buscar</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); load(); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Limpiar</button>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay pacientes registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Paciente</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Documento</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Teléfono</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Fecha Nac.</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{p.last_name}, {p.first_name}</p>
                      {p.email && <p className="text-xs text-gray-400 mt-0.5">{p.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.document_type && p.document_number
                        ? <span>{p.document_type} {p.document_number}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDob(p.date_of_birth)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => navigate(`/admin/patients/${p.id}`)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver perfil">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              {/* Documento */}
              <div className="grid grid-cols-[1fr_1.5fr] gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                  <select value={editing.document_type} onChange={(e) => setEditing({ ...editing, document_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                    <option value="">Seleccionar…</option>
                    {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
                  <input type="text" value={editing.document_number} onChange={(e) => setEditing({ ...editing, document_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Ej: 1234567890" />
                </div>
              </div>

              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                  <input type="text" value={editing.first_name} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Ej: María Elena" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                  <input type="text" value={editing.last_name} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Ej: García López" />
                </div>
              </div>

              {/* Fecha de nacimiento + Sexo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                  <input type="date" value={editing.date_of_birth} onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
                  <select value={editing.sex} onChange={(e) => setEditing({ ...editing, sex: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                    <option value="">Seleccionar…</option>
                    {SEX_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Teléfono + Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input type="tel" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="+57 300 000 0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                  <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="paciente@email.com" />
                </div>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Calle, número, barrio, ciudad" />
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Alergias, condiciones médicas, observaciones…" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Guardar cambios' : 'Crear paciente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
