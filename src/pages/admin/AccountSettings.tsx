import { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { Loader2, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

type Profile = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  document_type: string;
  document_number: string;
  date_of_birth: string | null;
  role: string;
};

const DOC_TYPES = [
  { value: 'CC', label: 'CC — Cédula de Ciudadanía' },
  { value: 'CE', label: 'CE — Cédula de Extranjería' },
  { value: 'PP', label: 'PP — Pasaporte' },
  { value: 'TP', label: 'TP — Tarjeta Profesional' },
];

export function AccountSettings() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm]       = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const [pwForm, setPwForm]     = useState({ current_password: '', new_password: '', confirm: '' });
  const [savingPw, setSavingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError]   = useState('');
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    apiFetch('/api/profile/')
      .then(r => r.json())
      .then(d => { setProfile(d.profile); setForm(d.profile); })
      .finally(() => setLoading(false));
  }, []);

  const setF = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      const res = await apiFetch('/api/profile/', { method: 'PUT', body: JSON.stringify(form) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Error al guardar');
      setProfile(d.profile); setForm(d.profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const handlePasswordSave = async () => {
    if (pwForm.new_password !== pwForm.confirm) { setPwError('Las contraseñas no coinciden.'); return; }
    if (pwForm.new_password.length < 8) { setPwError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setSavingPw(true); setPwError(''); setPwSuccess(false);
    try {
      const res = await apiFetch('/api/profile/', {
        method: 'PUT',
        body: JSON.stringify({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || 'Error al cambiar contraseña');
      setPwForm({ current_password: '', new_password: '', confirm: '' });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Error');
    } finally { setSavingPw(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>;
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Personal info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Información personal</h2>

        {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
        {success && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Cambios guardados correctamente.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombres</label>
            <input value={form.first_name ?? ''} onChange={setF('first_name')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
            <input value={form.last_name ?? ''} onChange={setF('last_name')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input type="email" value={form.email ?? ''} onChange={setF('email')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
            <input value={form.phone ?? ''} onChange={setF('phone')} placeholder="+57 300 000 0000"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input type="date" value={form.date_of_birth ?? ''} onChange={setF('date_of_birth')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de documento</label>
            <select value={form.document_type ?? ''} onChange={setF('document_type')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de documento</label>
            <input value={form.document_number ?? ''} onChange={setF('document_number')}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar cambios
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Cambiar contraseña</h2>

        {pwError && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{pwError}</div>}
        {pwSuccess && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Contraseña actualizada correctamente.
          </div>
        )}

        <div className="space-y-4">
          {(['current_password', 'new_password', 'confirm'] as const).map((key) => {
            const labels = { current_password: 'Contraseña actual', new_password: 'Nueva contraseña', confirm: 'Confirmar nueva contraseña' };
            return (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{labels[key]}</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm[key]}
                    onChange={e => setPwForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  {key === 'new_password' && (
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={handlePasswordSave} disabled={savingPw}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
            {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Cambiar contraseña
          </button>
        </div>
      </div>
    </div>
  );
}
