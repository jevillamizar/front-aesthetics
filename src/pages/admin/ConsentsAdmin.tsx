import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  CheckCircle2, ChevronDown, ChevronUp, ClipboardCheck, Loader2,
  Pencil, Plus, Save, Search, Trash2, X, PenLine, RotateCcw,
} from 'lucide-react';

type Patient = { id: number; first_name: string; last_name: string };
type Doctor  = { id: number; first_name: string; last_name: string; email: string };

type Consent = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number | null;
  doctor_name: string;
  doctor_profession: string;
  doctor_specialty: string;
  doctor_rethus_number: string;
  doctor_professional_seal: string;
  medical_record_id: number | null;
  procedure_description: string;
  risks: string;
  notes: string;
  signed_by_name: string;
  signed_at: string | null;
  signature_image: string;
  created_at: string;
};

type FormData = {
  id?: number;
  patient_id: number | '';
  doctor_id: number | '';
  procedure_description: string;
  risks: string;
  notes: string;
  signed_by_name: string;
  signed_at: string | null;
  signature_image: string;
};

const emptyForm: FormData = {
  patient_id: '',
  doctor_id: '',
  procedure_description: '',
  risks: '',
  notes: '',
  signed_by_name: '',
  signed_at: null,
  signature_image: '',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Canvas Signature Pad ─────────────────────────────────── */
function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    drawing.current = true;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current || !lastPos.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  };

  const stopDraw = () => {
    drawing.current = false;
    lastPos.current = null;
    const canvas = canvasRef.current!;
    onChange(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Firma del paciente / representante</label>
        <button type="button" onClick={clear} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
          <RotateCcw className="w-3 h-3" /> Limpiar
        </button>
      </div>
      <div className="relative border-2 border-dashed border-gray-200 rounded-xl overflow-hidden bg-gray-50/50 hover:border-gray-300 transition-colors">
        <canvas
          ref={canvasRef}
          width={560}
          height={180}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!value && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-xs text-gray-300 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> Firme aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────── */
export function ConsentsAdmin() {
  const [consents, setConsents]     = useState<Consent[]>([]);
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [doctors, setDoctors]       = useState<Doctor[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterSigned, setFilterSigned] = useState<'all' | 'signed' | 'pending'>('all');
  const [editing, setEditing]       = useState<FormData | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, pRes, dRes] = await Promise.all([
        apiFetch('/api/consents/').then((r) => r.json()),
        apiFetch('/api/patients/').then((r) => r.json()),
        apiFetch('/api/doctors/').then((r) => r.json()),
      ]);
      setConsents(cRes.consents || []);
      setPatients(pRes.patients || []);
      setDoctors(dRes.doctors || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = consents.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.patient_name.toLowerCase().includes(q) || c.procedure_description.toLowerCase().includes(q);
    const matchSigned =
      filterSigned === 'all' ||
      (filterSigned === 'signed' && !!c.signed_at) ||
      (filterSigned === 'pending' && !c.signed_at);
    return matchSearch && matchSigned;
  });

  const openNew = () => { setError(''); setEditing({ ...emptyForm }); };
  const openEdit = (c: Consent) => {
    setError('');
    setEditing({
      id: c.id,
      patient_id: c.patient_id,
      doctor_id: c.doctor_id ?? '',
      procedure_description: c.procedure_description,
      risks: c.risks,
      notes: c.notes,
      signed_by_name: c.signed_by_name,
      signed_at: c.signed_at,
      signature_image: c.signature_image,
    });
  };

  const handleSign = () => {
    if (!editing) return;
    setEditing({ ...editing, signed_at: new Date().toISOString() });
  };
  const handleUnsign = () => {
    if (!editing) return;
    setEditing({ ...editing, signed_at: null, signature_image: '', signed_by_name: '' });
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.patient_id) { setError('Selecciona un paciente'); return; }
    setSaving(true); setError('');
    try {
      const body = {
        patient_id: editing.patient_id,
        doctor_id: editing.doctor_id || null,
        procedure_description: editing.procedure_description,
        risks: editing.risks,
        notes: editing.notes,
        signed_by_name: editing.signed_by_name,
        signed_at: editing.signed_at,
        signature_image: editing.signature_image,
      };
      if (editing.id) {
        await apiFetch(`/api/consents/${editing.id}/`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/consents/', { method: 'POST', body: JSON.stringify(body) });
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este consentimiento?')) return;
    await apiFetch(`/api/consents/${id}/`, { method: 'DELETE' });
    setConsents((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-900 rounded-xl"><ClipboardCheck className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Consentimientos</h1>
            <p className="text-sm text-gray-500">{consents.length} registrado{consents.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por paciente o procedimiento…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
        </div>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {(['all', 'signed', 'pending'] as const).map((v) => (
            <button key={v} onClick={() => setFilterSigned(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterSigned === v ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {v === 'all' ? 'Todos' : v === 'signed' ? 'Firmados' : 'Pendientes'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <ClipboardCheck className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No hay consentimientos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((c) => {
              const isOpen = expandedId === c.id;
              return (
                <div key={c.id}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <button onClick={() => setExpandedId(isOpen ? null : c.id)} className="flex-1 flex items-center gap-4 text-left">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{c.patient_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{c.procedure_description || 'Sin procedimiento registrado'}</p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-1">
                        {c.signed_at ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                            <CheckCircle2 className="w-3 h-3" /> Firmado
                          </span>
                        ) : (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Pendiente</span>
                        )}
                        <span className="text-xs text-gray-400">{fmt(c.created_at)}</span>
                      </div>
                    </button>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 bg-gray-50/40 border-t border-gray-50 space-y-4 pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {c.procedure_description && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Procedimiento</p>
                            <p className="text-sm text-gray-800 whitespace-pre-line">{c.procedure_description}</p>
                          </div>
                        )}
                        {c.risks && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Riesgos informados</p>
                            <p className="text-sm text-gray-800 whitespace-pre-line">{c.risks}</p>
                          </div>
                        )}
                        {c.notes && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notas</p>
                            <p className="text-sm text-gray-800 whitespace-pre-line">{c.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Firma */}
                      <div className={`rounded-xl border px-4 py-3 ${c.signed_at ? 'bg-green-50/60 border-green-100' : 'bg-amber-50/60 border-amber-100'}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${c.signed_at ? 'text-green-700' : 'text-amber-700'}`}>
                          {c.signed_at ? 'Consentimiento firmado' : 'Pendiente de firma'}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {c.signed_by_name && <div><p className="text-xs text-gray-400">Firmado por</p><p className="text-sm font-medium text-gray-800">{c.signed_by_name}</p></div>}
                          {c.signed_at && <div><p className="text-xs text-gray-400">Fecha y hora</p><p className="text-sm text-gray-800">{fmtDatetime(c.signed_at)}</p></div>}
                        </div>
                        {c.signature_image && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-400 mb-1">Firma</p>
                            <div className="bg-white border border-gray-100 rounded-lg p-2 inline-block">
                              <img src={c.signature_image} alt="Firma" className="max-h-24 max-w-xs" />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Médico */}
                      {c.doctor_name && c.doctor_name !== '—' && (
                        <div className="bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Médico responsable</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div><p className="text-xs text-gray-400">Nombre</p><p className="text-sm font-medium text-gray-800">{c.doctor_name}</p></div>
                            {c.doctor_profession && <div><p className="text-xs text-gray-400">Profesión</p><p className="text-sm text-gray-800">{c.doctor_profession}{c.doctor_specialty ? ` · ${c.doctor_specialty}` : ''}</p></div>}
                            {c.doctor_rethus_number && <div><p className="text-xs text-gray-400">ReTHUS</p><p className="text-sm text-gray-800">{c.doctor_rethus_number}</p></div>}
                            {c.doctor_professional_seal && <div className="sm:col-span-2"><p className="text-xs text-gray-400">Sello</p><p className="text-sm font-medium text-gray-800">{c.doctor_professional_seal}</p></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Editar Consentimiento' : 'Nuevo Consentimiento'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              {/* Paciente & Médico */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identificación</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paciente <span className="text-red-500">*</span></label>
                    <select value={editing.patient_id} onChange={(e) => setEditing({ ...editing, patient_id: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      <option value="">Seleccionar…</option>
                      {patients.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Médico responsable</label>
                    <select value={editing.doctor_id} onChange={(e) => setEditing({ ...editing, doctor_id: Number(e.target.value) || '' })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      <option value="">Seleccionar…</option>
                      {doctors.map((d) => <option key={d.id} value={d.id}>{d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : d.email}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Procedimiento y Riesgos */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Procedimiento</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del procedimiento</label>
                    <textarea rows={3} value={editing.procedure_description} onChange={(e) => setEditing({ ...editing, procedure_description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      placeholder="Describa el procedimiento a realizar…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Riesgos informados</label>
                    <textarea rows={3} value={editing.risks} onChange={(e) => setEditing({ ...editing, risks: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      placeholder="Riesgos, complicaciones posibles, contraindicaciones…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
                    <textarea rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                      placeholder="Observaciones, aclaraciones…" />
                  </div>
                </div>
              </div>

              {/* Firma */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Evidencia de aceptación</p>
                  {editing.signed_at ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Firmado {fmtDatetime(editing.signed_at)}
                      </span>
                      <button type="button" onClick={handleUnsign} className="text-xs text-red-400 hover:text-red-600 underline">Deshacer</button>
                    </div>
                  ) : (
                    <button type="button" onClick={handleSign}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Firmar ahora
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del firmante</label>
                    <input type="text" value={editing.signed_by_name} onChange={(e) => setEditing({ ...editing, signed_by_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder="Nombre completo del paciente o representante legal" />
                  </div>
                  <SignaturePad value={editing.signature_image} onChange={(v) => setEditing({ ...editing, signature_image: v })} />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
