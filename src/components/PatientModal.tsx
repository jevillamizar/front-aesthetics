import { useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { Camera, Loader2, Save, Trash2, User, X } from 'lucide-react';

export type Patient = {
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
  eps: string;
  legal_guardian: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  notes: string;
  photo: string | null;
  created_at?: string | null;
};

type FormState = {
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  sex: string;
  phone: string;
  email: string;
  address: string;
  eps: string;
  legal_guardian: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
  notes: string;
  photoFile: File | null;
  clearPhoto: boolean;
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

function isMinor(dob: string) {
  if (!dob) return false;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25)) < 18;
}

type Props = {
  patient?: Patient | null;
  onClose: () => void;
  onSaved: (patient: Patient) => void;
};

export function PatientModal({ patient, onClose, onSaved }: Props) {
  const isEdit = !!patient?.id;
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    document_type: patient?.document_type ?? '',
    document_number: patient?.document_number ?? '',
    first_name: patient?.first_name ?? '',
    last_name: patient?.last_name ?? '',
    date_of_birth: patient?.date_of_birth ?? '',
    sex: patient?.sex ?? '',
    phone: patient?.phone ?? '',
    email: patient?.email ?? '',
    address: patient?.address ?? '',
    eps: patient?.eps ?? '',
    legal_guardian: patient?.legal_guardian ?? '',
    emergency_contact_name: patient?.emergency_contact_name ?? '',
    emergency_contact_phone: patient?.emergency_contact_phone ?? '',
    emergency_contact_relation: patient?.emergency_contact_relation ?? '',
    notes: patient?.notes ?? '',
    photoFile: null,
    clearPhoto: false,
  });

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set({ photoFile: file, clearPhoto: false });
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleRemovePhoto = () => {
    set({ photoFile: null, clearPhoto: true });
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const currentPhoto = photoPreview ?? (form.clearPhoto ? null : (patient?.photo ?? null));

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('Nombres y apellidos son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const url = isEdit ? `/api/patients/${patient!.id}/` : '/api/patients/';
      const method = isEdit ? 'PUT' : 'POST';

      let body: FormData | string;
      if (form.photoFile) {
        const fd = new FormData();
        const fields: (keyof FormState)[] = [
          'document_type', 'document_number', 'first_name', 'last_name',
          'date_of_birth', 'sex', 'phone', 'email', 'address', 'eps',
          'legal_guardian', 'emergency_contact_name', 'emergency_contact_phone',
          'emergency_contact_relation', 'notes',
        ];
        fields.forEach(k => fd.append(k, (form[k] as string) ?? ''));
        fd.append('photo', form.photoFile);
        body = fd;
      } else {
        body = JSON.stringify({
          document_type: form.document_type,
          document_number: form.document_number.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          date_of_birth: form.date_of_birth || null,
          sex: form.sex,
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          eps: form.eps.trim(),
          legal_guardian: form.legal_guardian.trim(),
          emergency_contact_name: form.emergency_contact_name.trim(),
          emergency_contact_phone: form.emergency_contact_phone.trim(),
          emergency_contact_relation: form.emergency_contact_relation.trim(),
          notes: form.notes.trim(),
          ...(form.clearPhoto ? { photo: '' } : {}),
        });
      }

      const res = await apiFetch(url, { method, body });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      const json = await res.json();
      onSaved(json.patient);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Editar Paciente' : 'Nuevo Paciente'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          {/* Photo */}
          <div className="flex items-center gap-4">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <div className="relative flex-shrink-0">
              <div
                onClick={() => photoInputRef.current?.click()}
                className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 cursor-pointer ring-2 ring-transparent hover:ring-gray-300 transition-all"
              >
                {currentPhoto
                  ? <img src={currentPhoto} alt="Foto" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><User className="w-8 h-8 text-gray-300" /></div>}
              </div>
              <div
                onClick={() => photoInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center cursor-pointer shadow-sm"
              >
                <Camera className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Foto del paciente</p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG o WEBP · opcional</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs px-2.5 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {currentPhoto ? 'Cambiar foto' : 'Subir foto'}
                </button>
                {currentPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 border border-red-100 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Quitar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Documento */}
          <div className="grid grid-cols-[1fr_1.5fr] gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
              <select value={form.document_type} onChange={e => set({ document_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="">Seleccionar…</option>
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
              <input type="text" value={form.document_number} onChange={e => set({ document_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Ej: 1234567890" />
            </div>
          </div>

          {/* Nombres */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
              <input type="text" value={form.first_name} onChange={e => set({ first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Ej: María Elena" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
              <input type="text" value={form.last_name} onChange={e => set({ last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Ej: García López" />
            </div>
          </div>

          {/* Fecha + Sexo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
              <input type="date" value={form.date_of_birth} onChange={e => set({ date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sexo</label>
              <select value={form.sex} onChange={e => set({ sex: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                <option value="">Seleccionar…</option>
                {SEX_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {/* Teléfono + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="tel" value={form.phone} onChange={e => set({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="+57 300 000 0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
              <input type="email" value={form.email} onChange={e => set({ email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="paciente@email.com" />
            </div>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
            <input type="text" value={form.address} onChange={e => set({ address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="Calle, número, barrio, ciudad" />
          </div>

          {/* Datos administrativos */}
          <div className="pt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Datos administrativos</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">EPS</label>
                <input type="text" value={form.eps} onChange={e => set({ eps: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="Nombre de la EPS" />
              </div>
              {isMinor(form.date_of_birth) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Responsable <span className="text-xs text-amber-600 font-normal">(menor de edad)</span>
                  </label>
                  <input type="text" value={form.legal_guardian} onChange={e => set({ legal_guardian: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Nombre completo del responsable" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de emergencia</label>
                  <input type="text" value={form.emergency_contact_name} onChange={e => set({ emergency_contact_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Nombre" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parentesco</label>
                  <input type="text" value={form.emergency_contact_relation} onChange={e => set({ emergency_contact_relation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Ej: Madre, Esposo…" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de emergencia</label>
                <input type="tel" value={form.emergency_contact_phone} onChange={e => set({ emergency_contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="+57 300 000 0000" />
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={form.notes} onChange={e => set({ notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              placeholder="Observaciones generales…" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Guardar cambios' : 'Crear paciente'}
          </button>
        </div>
      </div>
    </div>
  );
}
