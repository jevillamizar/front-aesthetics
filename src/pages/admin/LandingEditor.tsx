import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { apiFetch } from '../../lib/api';
import { Save, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';

type LandingData = Record<string, unknown>;

type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'json' | 'image' | 'checkbox';
  placeholder?: string;
};

const sections: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Hero',
    fields: [
      { key: 'headline', label: 'Titular', type: 'text', placeholder: 'Ej: Tu Mejor Versión Comienza Aquí' },
      { key: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Texto debajo del titular' },
      { key: 'hero_image', label: 'Imagen Hero', type: 'image' },
      { key: 'trust_indicators', label: 'Trust Indicators (JSON)', type: 'json', placeholder: '[{"icon":"clock","label":"15+ Años","sub":"Experiencia"}]' },
    ],
  },
  {
    title: 'Colores',
    fields: [
      { key: 'primary_color', label: 'Primario', type: 'color', placeholder: '#8B9E8B' },
      { key: 'secondary_color', label: 'Secundario', type: 'color', placeholder: '#F5F5F3' },
      { key: 'accent_color', label: 'Acento', type: 'color', placeholder: '#D4A574' },
      { key: 'background_color', label: 'Fondo', type: 'color', placeholder: '#F5F5F3' },
      { key: 'text_color', label: 'Texto', type: 'color', placeholder: '#2D2D2D' },
    ],
  },
  {
    title: 'Fuentes (Google Fonts)',
    fields: [
      { key: 'font_heading', label: 'Títulos', type: 'text', placeholder: 'Playfair Display' },
      { key: 'font_body', label: 'Cuerpo', type: 'text', placeholder: 'Inter' },
      { key: 'font_accent', label: 'Decorativa', type: 'text', placeholder: 'Cormorant Garamond' },
    ],
  },
  {
    title: 'Sobre Nosotros',
    fields: [
      { key: 'about_title', label: 'Título', type: 'text', placeholder: 'Belleza respaldada por la ciencia,' },
      { key: 'about_subtitle', label: 'Subtítulo (itálica)', type: 'text', placeholder: 'Entregado con arte' },
      { key: 'about_description', label: 'Descripción', type: 'textarea', placeholder: 'Párrafos separados por salto de línea' },
      { key: 'about_bullets', label: 'Bullets (JSON array)', type: 'json', placeholder: '["Certificados","Aprobados"]' },
      { key: 'about_image', label: 'Imagen About', type: 'image' },
      { key: 'about_badge_title', label: 'Badge título', type: 'text', placeholder: 'Top 1%' },
      { key: 'about_badge_text', label: 'Badge texto', type: 'text', placeholder: 'Inyector en la región' },
    ],
  },
  {
    title: 'Testimonios',
    fields: [
      { key: 'testimonials', label: 'Testimonios (JSON)', type: 'json', placeholder: '[{"name":"María","treatment":"Botox","rating":5,"quote":"..."}]' },
    ],
  },
  {
    title: 'Contacto y Redes',
    fields: [
      { key: 'phone', label: 'Teléfono', type: 'text', placeholder: '+58 412 1234567' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'contacto@clinica.com' },
      { key: 'whatsapp_phone', label: 'WhatsApp (solo números)', type: 'text', placeholder: '584121234567' },
      { key: 'address', label: 'Dirección', type: 'text', placeholder: 'Av. Principal, Torre Med' },
      { key: 'instagram_url', label: 'Instagram URL', type: 'text', placeholder: 'https://instagram.com/tuclinica' },
      { key: 'facebook_url', label: 'Facebook URL', type: 'text', placeholder: 'https://facebook.com/tuclinica' },
      { key: 'booking_url', label: 'URL de Reservas', type: 'text', placeholder: 'https://...' },
    ],
  },
  {
    title: 'Marca',
    fields: [
      { key: 'logo', label: 'Logo', type: 'image' },
      { key: 'is_published', label: 'Publicado', type: 'checkbox' },
    ],
  },
];

export function LandingEditor() {
  const [data, setData] = useState<LandingData>({});
  const [files, setFiles] = useState<Record<string, File>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/api/landing/')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        setData(json.landing || {});
      })
      .catch(() => setError('No se pudo cargar la configuración'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleFile = (key: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFiles((prev) => ({ ...prev, [key]: file }));
      setSaved(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const hasFiles = Object.keys(files).length > 0;

      if (hasFiles) {
        const form = new FormData();
        for (const [k, v] of Object.entries(data)) {
          if (k === 'id' || k.endsWith('_url')) continue;
          if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
            form.append(k, JSON.stringify(v));
          } else {
            form.append(k, String(v ?? ''));
          }
        }
        for (const [k, f] of Object.entries(files)) {
          form.append(k, f);
        }
        const res = await apiFetch('/api/landing/', { method: 'PUT', body: form, headers: {} });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error');
        const json = await res.json();
        setData(json.landing || {});
      } else {
        const body: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(data)) {
          if (k === 'id' || k.endsWith('_url')) continue;
          body[k] = v;
        }
        const res = await apiFetch('/api/landing/', {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error');
        const json = await res.json();
        setData(json.landing || {});
      }
      setFiles({});
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Landing Page</h1>
          <p className="text-gray-500 mt-1">Personaliza el contenido de tu página de inicio</p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Ver landing <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{section.title}</h2>
            </div>
            <div className="px-6 py-5 space-y-5">
              {section.fields.map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={data[field.key]}
                  imageUrl={data[`${field.key}_url`] as string | undefined}
                  pendingFile={files[field.key]}
                  onChange={(v) => handleChange(field.key, v)}
                  onFile={(e) => handleFile(field.key, e)}
                />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-3 sticky bottom-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-lg"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando…' : 'Guardar Cambios'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="w-4 h-4" /> Guardado
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function FieldInput({
  field,
  value,
  imageUrl,
  pendingFile,
  onChange,
  onFile,
}: {
  field: FieldDef;
  value: unknown;
  imageUrl?: string;
  pendingFile?: File;
  onChange: (v: unknown) => void;
  onFile: (e: ChangeEvent<HTMLInputElement>) => void;
}) {
  const strVal = typeof value === 'string' ? value : '';

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
        />
        <span className="text-sm font-medium text-gray-700">{field.label}</span>
      </label>
    );
  }

  if (field.type === 'image') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
        {(imageUrl || pendingFile) && (
          <div className="mb-2">
            <img
              src={pendingFile ? URL.createObjectURL(pendingFile) : (imageUrl || '')}
              alt={field.label}
              className="h-20 w-auto rounded-lg object-contain border border-gray-200"
            />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          className="text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>
    );
  }

  if (field.type === 'color') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={strVal || field.placeholder || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={strVal}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>
    );
  }

  if (field.type === 'json') {
    const jsonStr = typeof value === 'string' ? value : JSON.stringify(value ?? [], null, 2);
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
        <textarea
          value={jsonStr}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          placeholder={field.placeholder}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
        <textarea
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
      <input
        type="text"
        value={strVal}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>
  );
}
