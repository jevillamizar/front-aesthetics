import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { apiFetch } from '../../lib/api';
import { Save, Loader2, CheckCircle2, ExternalLink, Plus, Trash2, GripVertical, Upload, X } from 'lucide-react';
import type { AboutBullet } from '../../components/About';

type LandingData = Record<string, unknown>;

function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await apiFetch('/api/upload-image/', { method: 'POST', body: form, headers: {} });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Error al subir');
      onChange(json.url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al subir');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="preview" className="h-24 w-auto rounded-lg object-cover border border-gray-200" />
          <button type="button" onClick={() => onChange('')}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <button type="button" onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Subiendo...' : 'Subir imagen'}
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="o pega una URL"
          className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

type FieldDef = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'color' | 'json' | 'image' | 'checkbox' | 'bullets' | 'multi_image' | 'trust_indicators' | 'testimonials';
  placeholder?: string;
};

type TestimonialItem = { name: string; treatment: string; rating: number; quote: string; social_url?: string };

type TrustIndicator = { icon: string; label: string; sub: string };

const TRUST_ICONS = [
  { value: 'clock',   label: 'Reloj' },
  { value: 'award',   label: 'Premio' },
  { value: 'users',   label: 'Personas' },
  { value: 'star',    label: 'Estrella' },
  { value: 'shield',  label: 'Escudo' },
  { value: 'heart',   label: 'Corazón' },
  { value: 'check',   label: 'Check' },
  { value: 'zap',     label: 'Rayo' },
];

const sections: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Hero',
    fields: [
      { key: 'headline', label: 'Titular', type: 'text', placeholder: 'Ej: Tu Mejor Versión Comienza Aquí' },
      { key: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Texto debajo del titular' },
      { key: 'hero_image_urls', label: 'Imagen(es) Hero', type: 'multi_image' },
      { key: 'trust_indicators', label: 'Indicadores de Confianza', type: 'trust_indicators' },
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
      { key: 'about_bullets', label: 'Diferenciadores (máx. 6)', type: 'bullets' },
      { key: 'about_image_urls', label: 'Imagen(es) About', type: 'multi_image' },
      { key: 'about_badge_title', label: 'Badge título', type: 'text', placeholder: 'Top 1%' },
      { key: 'about_badge_text', label: 'Badge texto', type: 'text', placeholder: 'Inyector en la región' },
    ],
  },
  {
    title: 'Testimonios',
    fields: [
      { key: 'testimonials', label: 'Testimonios', type: 'testimonials' },
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
      { key: 'show_name', label: 'Mostrar nombre de la clínica', type: 'checkbox' },
      { key: 'show_logo', label: 'Mostrar logo de la clínica', type: 'checkbox' },
      { key: 'is_published', label: 'Publicar Landing', type: 'checkbox' },
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

      const cleanValue = (v: unknown) =>
        Array.isArray(v) ? v.filter((x) => x !== '' && x !== null && x !== undefined) : v;

      if (hasFiles) {
        const form = new FormData();
        for (const [k, v] of Object.entries(data)) {
          if (k === 'id' || k.endsWith('_url')) continue;
          const clean = cleanValue(v);
          if (Array.isArray(clean) || (typeof clean === 'object' && clean !== null)) {
            form.append(k, JSON.stringify(clean));
          } else {
            form.append(k, String(clean ?? ''));
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
          body[k] = cleanValue(v);
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
        <p className="text-gray-500">Personaliza el contenido de tu página de inicio</p>
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

  if (field.type === 'testimonials') {
    const raw = Array.isArray(value) ? value as Partial<TestimonialItem>[] : [];
    const items: TestimonialItem[] = raw.map((r) => ({
      name: r.name || '',
      treatment: r.treatment || '',
      rating: r.rating ?? 5,
      quote: r.quote || '',
      social_url: r.social_url || '',
    }));
    const update = (idx: number, patch: Partial<TestimonialItem>) =>
      onChange(items.map((it, i) => i === idx ? { ...it, ...patch } : it));
    const add = () => onChange([...items, { name: '', treatment: '', rating: 5, quote: '', social_url: '' }]);
    const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          <button type="button" onClick={add}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar
          </button>
        </div>
        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">Sin testimonios aún</p>
        )}
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-2.5 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 flex-shrink-0">{i + 1}</span>
                <input type="text" value={it.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Nombre"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                <input type="text" value={it.treatment}
                  onChange={(e) => update(i, { treatment: e.target.value })}
                  placeholder="Procedimiento"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                <select value={it.rating}
                  onChange={(e) => update(i, { rating: Number(e.target.value) })}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                  {[5,4,3,2,1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}</option>)}
                </select>
                <button type="button" onClick={() => remove(i)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea value={it.quote}
                onChange={(e) => update(i, { quote: e.target.value })}
                placeholder='"El mejor lugar..."'
                rows={2}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
              <input type="url" value={it.social_url || ''}
                onChange={(e) => update(i, { social_url: e.target.value })}
                placeholder="Enlace red social (opcional) — https://g.co/..."
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'trust_indicators') {
    const raw = Array.isArray(value) ? value as (Partial<TrustIndicator>)[] : [];
    const indicators: TrustIndicator[] = raw.map((r) => ({
      icon: r.icon || 'star',
      label: r.label || '',
      sub: r.sub || '',
    }));
    const update = (idx: number, patch: Partial<TrustIndicator>) => {
      onChange(indicators.map((item, i) => i === idx ? { ...item, ...patch } : item));
    };
    const add = () => { if (indicators.length < 6) onChange([...indicators, { icon: 'star', label: '', sub: '' }]); };
    const remove = (idx: number) => onChange(indicators.filter((_, i) => i !== idx));
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          {indicators.length < 6 && (
            <button type="button" onClick={add}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          )}
        </div>
        {indicators.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">Sin indicadores aún</p>
        )}
        <div className="space-y-2">
          {indicators.map((item, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50/50">
              <select
                value={item.icon}
                onChange={(e) => update(i, { icon: e.target.value })}
                className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                {TRUST_ICONS.map((ic) => (
                  <option key={ic.value} value={ic.value}>{ic.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={item.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Número / Valor  (ej: 15+)"
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <input
                type="text"
                value={item.sub}
                onChange={(e) => update(i, { sub: e.target.value })}
                placeholder="Etiqueta  (ej: Años)"
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button type="button" onClick={() => remove(i)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Icono · Valor principal · Etiqueta descriptiva</p>
      </div>
    );
  }

  if (field.type === 'bullets') {
    const raw = Array.isArray(value) ? value as (string | AboutBullet)[] : [];
    const bullets: AboutBullet[] = raw.map((b) =>
      typeof b === 'string' ? { title: b } : (b as AboutBullet)
    );
    const update = (idx: number, patch: Partial<AboutBullet>) => {
      const next = bullets.map((b, i) => i === idx ? { ...b, ...patch } : b);
      onChange(next);
    };
    const add = () => { if (bullets.length < 6) onChange([...bullets, { title: '' }]); };
    const remove = (idx: number) => onChange(bullets.filter((_, i) => i !== idx));
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          {bullets.length < 6 && (
            <button type="button" onClick={add}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Agregar
            </button>
          )}
        </div>
        <div className="space-y-3">
          {bullets.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">Sin diferenciadores aún</p>
          )}
          {bullets.map((b, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => update(i, { title: e.target.value })}
                  placeholder="Título del diferenciador"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                <button type="button" onClick={() => remove(i)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={b.description ?? ''}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Descripción (opcional — el usuario podrá expandirla)"
                rows={2}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Imagen (opcional)</label>
                <ImageUploader
                  value={b.image_url ?? ''}
                  onChange={(url) => update(i, { image_url: url })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'multi_image') {
    const urls: string[] = Array.isArray(value)
      ? (value as string[])
      : (imageUrl ? [imageUrl] : []);
    const setUrls = (next: string[]) => onChange(next);
    const addSlot = () => setUrls([...urls, '']);
    const removeSlot = (i: number) => setUrls(urls.filter((_, j) => j !== i));
    const updateSlot = (i: number, url: string) => {
      const next = [...urls];
      next[i] = url;
      setUrls(next);
    };
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">{field.label}</label>
          <button type="button" onClick={addSlot}
            className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Agregar imagen
          </button>
        </div>
        {urls.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-lg">Sin imágenes aún</p>
        )}
        <div className="space-y-3">
          {urls.map((url, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-3 bg-gray-50/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400">Imagen {i + 1}</span>
                <button type="button" onClick={() => removeSlot(i)}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <ImageUploader value={url} onChange={(newUrl) => updateSlot(i, newUrl)} />
            </div>
          ))}
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
