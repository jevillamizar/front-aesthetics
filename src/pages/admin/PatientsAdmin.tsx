import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { AlertTriangle, Loader2, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { PatientModal, type Patient as ModalPatient } from '../../components/PatientModal';

type Patient = ModalPatient;

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
  const [editing, setEditing] = useState<Patient | null | 'new'>(null);
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const openNew = () => setEditing('new');
  const openEdit = (p: Patient) => setEditing(p);

  const handleSaved = async () => {
    setEditing(null);
    await load(search);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/patients/${confirmDelete.id}/`, { method: 'DELETE' });
      setConfirmDelete(null);
      await load(search);
    } finally {
      setDeleting(false);
    }
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
                  <tr key={p.id} onClick={() => navigate(`/admin/patients/${p.id}`)} className="hover:bg-gray-50/60 transition-colors cursor-pointer">
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
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex gap-1">
                        <button onClick={() => openEdit(p)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(p)}
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

      {editing !== null && (
        <PatientModal
          patient={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">Eliminar paciente</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Estás a punto de eliminar a <span className="font-medium text-gray-900">{confirmDelete.first_name} {confirmDelete.last_name}</span>.
                  Esta acción <span className="font-semibold text-red-600">no se puede deshacer</span> y borrará permanentemente:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-gray-700">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />Todas las citas agendadas</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />Historias clínicas y procedimientos</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />Consentimientos informados</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />Todos los datos del paciente</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Sí, eliminar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
