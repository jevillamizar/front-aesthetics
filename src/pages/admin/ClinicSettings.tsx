import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Save, Loader2, CheckCircle2, Upload, X } from 'lucide-react';

type ClinicData = {
  // Información Básica
  name: string;
  business_name: string;
  tax_id: string;
  company_type: string;
  logo_url: string;
  short_description: string;

  // Contacto
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  country: string;

  // Redes Sociales
  instagram_url: string;
  facebook_url: string;

  // Funcionalidades
  enable_medical_history: boolean;
  enable_consent: boolean;
};

const EMPTY: ClinicData = {
  // Información Básica
  name: '', business_name: '', tax_id: '', company_type: '', logo_url: '', short_description: '',
  // Contacto
  phone: '', whatsapp: '', email: '', address: '', city: '', country: '',
  // Redes Sociales
  instagram_url: '', facebook_url: '',
  // Funcionalidades
  enable_medical_history: true, enable_consent: true,
};

export function ClinicSettings() {
  const [form, setForm]       = useState<ClinicData>({ ...EMPTY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    apiFetch('/api/clinic/')
      .then(r => r.json())
      .then(d => setForm({ ...EMPTY, ...d.clinic }))
      .finally(() => setLoading(false));
  }, []);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const setF = (key: keyof ClinicData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      // Use FormData for file upload support
      const formData = new FormData();
      const BOOL_FIELDS = ['enable_medical_history', 'enable_consent'];
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'logo_url') return;
        if (BOOL_FIELDS.includes(key)) return;
        formData.append(key, (value as string) || '');
      });
      formData.append('enable_medical_history', String(form.enable_medical_history));
      formData.append('enable_consent', String(form.enable_consent));
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await apiFetch('/api/clinic/', {
        method: 'POST',
        body: formData
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Error al guardar');
      setForm({ ...EMPTY, ...d.clinic });
      setLogoFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">

        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Datos guardados correctamente.
          </div>
        )}

        <div className="space-y-6">
          {/* Información Básica */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Información Básica</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica</label>
                <input value={form.name} onChange={setF('name')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón social</label>
                  <input value={form.business_name} onChange={setF('business_name')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIT</label>
                  <input value={form.tax_id} onChange={setF('tax_id')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de empresa</label>
                <input value={form.company_type} onChange={setF('company_type')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <div className="space-y-2">
                  {/* Logo Preview */}
                  {form.logo_url && !logoFile && (
                    <div className="relative inline-block">
                      <img src={form.logo_url} alt="Logo actual" className="h-24 w-auto rounded-lg object-cover border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setForm(p => ({ ...p, logo_url: '' }))}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {logoFile && (
                    <div className="relative inline-block">
                      <img src={URL.createObjectURL(logoFile)} alt="Nuevo logo" className="h-24 w-auto rounded-lg object-cover border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => setLogoFile(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {/* File Input */}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setLogoFile(f);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {form.logo_url || logoFile ? 'Cambiar logo' : 'Subir logo'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción corta</label>
                <input value={form.short_description} onChange={setF('short_description')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Contacto */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input value={form.phone} onChange={setF('phone')} placeholder="+57 1 000 0000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input value={form.whatsapp} onChange={setF('whatsapp')} placeholder="+57 300 000 0000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo principal</label>
                <input type="email" value={form.email} onChange={setF('email')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input value={form.address} onChange={setF('address')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                <input value={form.city} onChange={setF('city')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                <input value={form.country} onChange={setF('country')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Redes Sociales */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Redes Sociales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input value={form.instagram_url} onChange={setF('instagram_url')} placeholder="https://instagram.com/…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
                <input value={form.facebook_url} onChange={setF('facebook_url')} placeholder="https://facebook.com/…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Funcionalidades */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Funcionalidades</p>
            <div className="space-y-4">
              {/* Toggle Historia Clínica */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Historia Clínica</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Al atender un procedimiento, se abre el formulario de historia clínica
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({
                    ...p,
                    enable_medical_history: !p.enable_medical_history,
                    enable_consent: !p.enable_medical_history ? false : p.enable_consent,
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${form.enable_medical_history ? 'bg-gray-900' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${form.enable_medical_history ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {/* Toggle Consentimiento */}
              <div className={`flex items-center justify-between ${!form.enable_medical_history ? 'opacity-40 pointer-events-none' : ''}`}>
                <div>
                  <p className="text-sm font-medium text-gray-700">Consentimiento Informado</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Se solicita firma del consentimiento al final de la historia clínica
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!form.enable_medical_history}
                  onClick={() => setForm(p => ({ ...p, enable_consent: !p.enable_consent }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${form.enable_consent ? 'bg-gray-900' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${form.enable_consent ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
