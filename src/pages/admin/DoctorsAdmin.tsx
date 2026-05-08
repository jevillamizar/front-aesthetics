import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Check, ClipboardCopy, Loader2, Pencil, Plus, Save, Search, Stethoscope, Trash2, Upload, X } from 'lucide-react';

type Credentials = { email: string; password: string };

type Doctor = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  document_type: string;
  document_number: string;
  date_of_birth: string;
  phone: string;
  profession: string;
  specialty: string;
  university: string;
  graduation_year: number | null;
  rethus_number: string;
  rethus_status: string;
  certifying_entity: string;
  professional_seal: string;
  notes: string;
  bio: string;
  photo_url: string;
};

type FormData = {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  is_active: boolean;
  document_type: string;
  document_number: string;
  date_of_birth: string;
  phone: string;
  profession: string;
  specialty: string;
  university: string;
  graduation_year: string;
  rethus_number: string;
  rethus_status: string;
  certifying_entity: string;
  professional_seal: string;
  notes: string;
  bio: string;
  photo_url: string;
  photoFile?: File;
};

const emptyForm: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  is_active: true,
  document_type: 'CC',
  document_number: '',
  date_of_birth: '',
  phone: '',
  profession: '',
  specialty: '',
  university: '',
  graduation_year: '',
  rethus_number: '',
  rethus_status: 'ACTIVE',
  certifying_entity: '',
  professional_seal: '',
  notes: '',
  bio: '',
  photo_url: '',
};

export function DoctorsAdmin() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [copied, setCopied] = useState(false);

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
    setEditing({
      id: d.id, first_name: d.first_name, last_name: d.last_name, email: d.email,
      password: '', is_active: d.is_active,
      document_type: d.document_type, document_number: d.document_number,
      date_of_birth: d.date_of_birth, phone: d.phone,
      profession: d.profession, specialty: d.specialty,
      university: d.university, graduation_year: d.graduation_year ? String(d.graduation_year) : '',
      rethus_number: d.rethus_number, rethus_status: d.rethus_status,
      certifying_entity: d.certifying_entity, professional_seal: d.professional_seal,
      notes: d.notes, bio: d.bio || '', photo_url: d.photo_url || '',
    });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.email) { setError('El email es obligatorio.'); return; }
    if (editing.bio && editing.bio.length < 100) { setError('La bio debe tener al menos 100 caracteres.'); return; }
    if (editing.bio && editing.bio.length > 500) { setError('La bio no puede superar los 500 caracteres.'); return; }
    setSaving(true);
    setError('');
    try {
      const isNew = !editing.id;
      const url = isNew ? '/api/doctors/' : `/api/doctors/${editing.id}/`;
      let res: Response;
      if (editing.photoFile) {
        const form = new FormData();
        form.append('first_name', editing.first_name);
        form.append('last_name', editing.last_name);
        form.append('email', editing.email);
        form.append('is_active', String(editing.is_active));
        form.append('document_type', editing.document_type);
        form.append('document_number', editing.document_number);
        form.append('date_of_birth', editing.date_of_birth || '');
        form.append('phone', editing.phone);
        form.append('profession', editing.profession);
        form.append('specialty', editing.specialty);
        form.append('university', editing.university);
        form.append('graduation_year', editing.graduation_year || '');
        form.append('rethus_number', editing.rethus_number);
        form.append('rethus_status', editing.rethus_status);
        form.append('certifying_entity', editing.certifying_entity);
        form.append('professional_seal', editing.professional_seal);
        form.append('notes', editing.notes);
        form.append('bio', editing.bio);
        if (editing.password) form.append('password', editing.password);
        form.append('photo', editing.photoFile);
        res = await apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: form, headers: {} });
      } else {
        const body: Record<string, unknown> = {
          first_name: editing.first_name, last_name: editing.last_name,
          email: editing.email, is_active: editing.is_active,
          document_type: editing.document_type, document_number: editing.document_number,
          date_of_birth: editing.date_of_birth || null,
          phone: editing.phone, profession: editing.profession,
          specialty: editing.specialty, university: editing.university,
          graduation_year: editing.graduation_year ? Number(editing.graduation_year) : null,
          rethus_number: editing.rethus_number, rethus_status: editing.rethus_status,
          certifying_entity: editing.certifying_entity,
          professional_seal: editing.professional_seal, notes: editing.notes,
          bio: editing.bio,
        };
        if (editing.password) body.password = editing.password;
        res = await apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) });
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      const json = await res.json();
      setEditing(null);
      await load(search);
      if (isNew && json.generated_password) {
        setCredentials({ email: editing.email, password: json.generated_password });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Email: ${credentials.email}\nContraseña: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';
  const sel = inp + ' bg-white';
  const sec = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Médicos</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestiona el equipo médico de la clínica</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Médico
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email…"
            className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-full bg-white focus:outline-none focus:ring-2 focus:ring-gray-900" />
        </div>
        <button type="submit" className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Buscar</button>
        {search && <button type="button" onClick={() => { setSearch(''); load(); }} className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Limpiar</button>}
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Profesión / Especialidad</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ReTHUS</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Estado</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {doctors.map((d) => (
                  <tr key={d.id} onClick={() => navigate(`/admin/doctors/${d.id}`)} className="hover:bg-gray-50/60 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : '—'}</p>
                      <p className="text-xs text-gray-400">{d.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{d.profession || '—'}</p>
                      {d.specialty && <p className="text-xs text-gray-400">{d.specialty}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {d.rethus_number ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          d.rethus_status === 'ACTIVE' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}>{d.rethus_status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${d.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {d.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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

      {/* ─── Create/Edit Modal ─────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Editar Médico' : 'Nuevo Médico'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              {/* Identificación */}
              <div>
                <p className={sec}>Identificación</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input type="text" value={editing.first_name} onChange={(e) => setEditing({ ...editing, first_name: e.target.value })} className={inp} placeholder="Nombre" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input type="text" value={editing.last_name} onChange={(e) => setEditing({ ...editing, last_name: e.target.value })} className={inp} placeholder="Apellido" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
                    <select value={editing.document_type} onChange={(e) => setEditing({ ...editing, document_type: e.target.value })} className={sel}>
                      <option value="CC">CC — Cédula de ciudadanía</option>
                      <option value="CE">CE — Cédula de extranjería</option>
                      <option value="PP">PP — Pasaporte</option>
                      <option value="TP">TP — Tarjeta profesional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
                    <input type="text" value={editing.document_number} onChange={(e) => setEditing({ ...editing, document_number: e.target.value })} className={inp} placeholder="Número" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                    <input type="date" value={editing.date_of_birth} onChange={(e) => setEditing({ ...editing, date_of_birth: e.target.value })} className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input type="text" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className={inp} placeholder="Teléfono" />
                  </div>
                </div>
              </div>

              {/* Información profesional */}
              <div>
                <p className={sec}>Información profesional</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Profesión</label>
                    <input type="text" value={editing.profession} onChange={(e) => setEditing({ ...editing, profession: e.target.value })} className={inp} placeholder="Médico, Esteticista, Dermatólogo…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                    <input type="text" value={editing.specialty} onChange={(e) => setEditing({ ...editing, specialty: e.target.value })} className={inp} placeholder="Especialidad" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Universidad de egreso</label>
                    <input type="text" value={editing.university} onChange={(e) => setEditing({ ...editing, university: e.target.value })} className={inp} placeholder="Universidad" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Año de graduación</label>
                    <input type="number" value={editing.graduation_year} onChange={(e) => setEditing({ ...editing, graduation_year: e.target.value })} className={inp} placeholder="2015" min="1970" max="2099" />
                  </div>
                </div>
              </div>

              {/* Perfil público (Landing Page) */}
              <div>
                <p className={sec}>Perfil público (Landing Page)</p>
                <div className="space-y-3">
                  {/* Foto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Foto del médico</label>
                    <div className="space-y-2">
                      {(editing.photoFile ? URL.createObjectURL(editing.photoFile) : editing.photo_url) && (
                        <div className="relative inline-block">
                          <img
                            src={editing.photoFile ? URL.createObjectURL(editing.photoFile) : editing.photo_url}
                            alt="preview"
                            className="h-24 w-24 rounded-xl object-cover border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setEditing({ ...editing, photoFile: undefined, photo_url: '' })}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        Subir foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setEditing({ ...editing, photoFile: f });
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  {/* Bio */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Sobre mí <span className="text-xs text-gray-400 font-normal">(visible en landing page)</span></label>
                      <span className={`text-xs font-medium ${editing.bio.length > 500 ? 'text-red-500' : editing.bio.length >= 100 ? 'text-green-600' : 'text-gray-400'}`}>
                        {editing.bio.length}/500
                      </span>
                    </div>
                    <textarea
                      value={editing.bio}
                      onChange={(e) => setEditing({ ...editing, bio: e.target.value.slice(0, 500) })}
                      rows={4}
                      className={inp}
                      placeholder="Describe brevemente tu experiencia, especialidad y enfoque (mínimo 100 caracteres)…"
                    />
                    {editing.bio.length > 0 && editing.bio.length < 100 && (
                      <p className="text-xs text-amber-600 mt-1">Mínimo 100 caracteres ({100 - editing.bio.length} restantes)</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Registro ReTHUS */}
              <div>
                <p className={sec}>Registro ReTHUS</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Número ReTHUS</label>
                    <input type="text" value={editing.rethus_number} onChange={(e) => setEditing({ ...editing, rethus_number: e.target.value })} className={inp} placeholder="Número de registro" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado ReTHUS</label>
                    <select value={editing.rethus_status} onChange={(e) => setEditing({ ...editing, rethus_status: e.target.value })} className={sel}>
                      <option value="ACTIVE">Activo</option>
                      <option value="SUSPENDED">Suspendido</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entidad certificadora</label>
                    <input type="text" value={editing.certifying_entity} onChange={(e) => setEditing({ ...editing, certifying_entity: e.target.value })} className={inp} placeholder="Ministerio de Salud…" />
                  </div>
                </div>
              </div>

              {/* Responsabilidad médica */}
              <div>
                <p className={sec}>Responsabilidad médica</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sello profesional</label>
                    <input type="text" value={editing.professional_seal} onChange={(e) => setEditing({ ...editing, professional_seal: e.target.value })} className={inp} placeholder="Nombre completo + matrícula (aparece en historia clínica)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                    <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} className={inp} placeholder="Observaciones…" />
                  </div>
                </div>
              </div>

              {/* Acceso */}
              <div>
                <p className={sec}>Acceso al sistema</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={inp} placeholder="doctor@clinica.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contraseña
                      {!editing.id && <span className="text-xs text-gray-400 font-normal ml-1">(opcional — se genera automáticamente si se deja vacío)</span>}
                      {editing.id && <span className="text-xs text-gray-400 font-normal ml-1">(dejar vacío para no cambiar)</span>}
                    </label>
                    <input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} className={inp} placeholder="••••••••" />
                  </div>
                  {editing.id && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700">Estado</label>
                      <button type="button" onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editing.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <span className="text-sm text-gray-500">{editing.is_active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Guardar cambios' : 'Crear médico'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Credentials Dialog ───────────────────────────────────────── */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCredentials(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Médico creado</h3>
                  <p className="text-sm text-gray-500">Comparte estas credenciales con el médico</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm font-mono">
                <div><span className="text-gray-500 font-sans font-medium">Email:</span> {credentials.email}</div>
                <div><span className="text-gray-500 font-sans font-medium">Contraseña:</span> {credentials.password}</div>
              </div>
              <p className="text-xs text-amber-600 mt-3">⚠ Esta contraseña no se mostrará nuevamente.</p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <button onClick={copyCredentials}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <ClipboardCopy className="w-4 h-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
              <button onClick={() => setCredentials(null)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">Listo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
