import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { ArrowLeft, Loader2, Pencil, Save, Shield, Stethoscope, Trash2, X } from 'lucide-react';

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
};

type EditForm = {
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
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium">{value || '—'}</p>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function DoctorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/doctors/${id}/`);
      if (!res.ok) { navigate('/admin/doctors'); return; }
      const json = await res.json();
      setDoctor(json.doctor);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  const openEdit = () => {
    if (!doctor) return;
    setEditing({
      first_name: doctor.first_name, last_name: doctor.last_name,
      email: doctor.email, password: '', is_active: doctor.is_active,
      document_type: doctor.document_type, document_number: doctor.document_number,
      date_of_birth: doctor.date_of_birth, phone: doctor.phone,
      profession: doctor.profession, specialty: doctor.specialty,
      university: doctor.university,
      graduation_year: doctor.graduation_year ? String(doctor.graduation_year) : '',
      rethus_number: doctor.rethus_number, rethus_status: doctor.rethus_status,
      certifying_entity: doctor.certifying_entity,
      professional_seal: doctor.professional_seal, notes: doctor.notes,
    });
  };

  const handleSave = async () => {
    if (!editing || !doctor) return;
    if (!editing.email) { setError('El email es obligatorio.'); return; }
    setSaving(true);
    setError('');
    try {
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
      };
      if (editing.password) body.password = editing.password;
      const res = await apiFetch(`/api/doctors/${doctor.id}/`, { method: 'PUT', body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      setEditing(null);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!doctor || !confirm('¿Eliminar este médico? Esta acción no se puede deshacer.')) return;
    await apiFetch(`/api/doctors/${doctor.id}/`, { method: 'DELETE' });
    navigate('/admin/doctors');
  };

  const inp = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900';
  const sel = inp + ' bg-white';
  const sec = 'text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
    </div>
  );

  if (!doctor) return null;

  const fullName = `${doctor.first_name} ${doctor.last_name}`.trim() || doctor.email;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/admin/doctors')} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver a médicos
      </button>

      {/* Hero card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{fullName}</h1>
              <p className="text-gray-500 mt-0.5">
                {doctor.profession || 'Sin profesión'}
                {doctor.specialty ? ` · ${doctor.specialty}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${doctor.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {doctor.is_active ? 'Activo' : 'Inactivo'}
                </span>
                {doctor.rethus_number && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    doctor.rethus_status === 'ACTIVE' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    <Shield className="w-3 h-3" />
                    ReTHUS {doctor.rethus_status === 'ACTIVE' ? 'activo' : 'suspendido'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={openEdit} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Data grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">

        {/* Identificación */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identificación</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoRow label="Tipo doc." value={doctor.document_type} />
            <InfoRow label="Número de documento" value={doctor.document_number} />
            <InfoRow label="Fecha de nacimiento" value={formatDate(doctor.date_of_birth)} />
            <InfoRow label="Teléfono" value={doctor.phone} />
            <InfoRow label="Email" value={doctor.email} />
          </div>
        </div>

        {/* Información profesional */}
        <div className="border-t border-gray-50 pt-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Información profesional</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoRow label="Profesión" value={doctor.profession} />
            <InfoRow label="Especialidad" value={doctor.specialty} />
            <InfoRow label="Universidad" value={doctor.university} />
            <InfoRow label="Año de graduación" value={doctor.graduation_year} />
          </div>
        </div>

        {/* Registro ReTHUS */}
        <div className="border-t border-gray-50 pt-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Registro ReTHUS</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <InfoRow label="Número ReTHUS" value={doctor.rethus_number} />
            <InfoRow label="Estado" value={doctor.rethus_status === 'ACTIVE' ? 'Activo' : doctor.rethus_status === 'SUSPENDED' ? 'Suspendido' : doctor.rethus_status} />
            <InfoRow label="Entidad certificadora" value={doctor.certifying_entity} />
          </div>
        </div>

        {/* Responsabilidad */}
        <div className="border-t border-gray-50 pt-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Responsabilidad médica</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoRow label="Sello profesional" value={doctor.professional_seal} />
            {doctor.notes && <InfoRow label="Notas internas" value={doctor.notes} />}
          </div>
        </div>
      </div>

      {/* ─── Edit Modal ───────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">Editar médico</h2>
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

              {/* ReTHUS */}
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

              {/* Responsabilidad */}
              <div>
                <p className={sec}>Responsabilidad médica</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sello profesional</label>
                    <input type="text" value={editing.professional_seal} onChange={(e) => setEditing({ ...editing, professional_seal: e.target.value })} className={inp} placeholder="Nombre completo + matrícula" />
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
                    <input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className={inp} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nueva contraseña <span className="text-xs text-gray-400 font-normal">(dejar vacío para no cambiar)</span>
                    </label>
                    <input type="password" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} className={inp} placeholder="••••••••" />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <button type="button" onClick={() => setEditing({ ...editing, is_active: !editing.is_active })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editing.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editing.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-gray-500">{editing.is_active ? 'Activo' : 'Inactivo'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
