import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';

type ClinicData = {
  name: string;
  phone: string;
  email: string;
  whatsapp_phone: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  booking_url: string;
};

const EMPTY: ClinicData = {
  name: '', phone: '', email: '', whatsapp_phone: '',
  address: '', instagram_url: '', facebook_url: '', booking_url: '',
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

  const setF = (key: keyof ClinicData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      const res = await apiFetch('/api/clinic/', { method: 'PUT', body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Error al guardar');
      setForm({ ...EMPTY, ...d.clinic });
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
        <h2 className="text-base font-semibold text-gray-900 mb-5">Datos de la Clínica</h2>

        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Datos guardados correctamente.
          </div>
        )}

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la clínica</label>
            <input value={form.name} onChange={setF('name')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input value={form.phone} onChange={setF('phone')} placeholder="+57 1 000 0000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input value={form.whatsapp_phone} onChange={setF('whatsapp_phone')} placeholder="+57 300 000 0000"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Correo de contacto</label>
              <input type="email" value={form.email} onChange={setF('email')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
              <input value={form.address} onChange={setF('address')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          </div>

          <hr className="border-gray-100" />

          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Redes y reservas</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">URL de reservas online</label>
              <input value={form.booking_url} onChange={setF('booking_url')} placeholder="https://…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
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
