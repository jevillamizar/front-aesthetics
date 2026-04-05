import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import {
  ClipboardList, Loader2, Pencil, Plus, Save, Search, Trash2, X, ChevronDown, ChevronUp,
} from 'lucide-react';

type Patient  = { id: number; first_name: string; last_name: string };
type Doctor   = { id: number; first_name: string; last_name: string; email: string };
type Treatment = { id: number; name: string; price: number };

type TreatmentItem = {
  id?: number;
  treatment_id: number;
  treatment_name: string;
  quantity: number;
  price: number;
  notes: string;
};

type MedicalRecord = {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  doctor_profession: string;
  doctor_specialty: string;
  doctor_rethus_number: string;
  doctor_rethus_status: string;
  doctor_professional_seal: string;
  appointment_id: number | null;
  chief_complaint: string;
  current_illness: string;
  personal_history: string;
  surgical_history: string;
  allergic_history: string;
  pharmacological_history: string;
  family_history: string;
  physical_exam: string;
  diagnosis: string;
  treatment_plan: string;
  evolution: string;
  informed_consent: string;
  consent_signed: boolean;
  notes: string;
  created_at: string;
  treatment_items: TreatmentItem[];
};

type FormData = {
  id?: number;
  patient_id: number | '';
  doctor_id: number | '';
  appointment_id: number | '';
  chief_complaint: string;
  current_illness: string;
  personal_history: string;
  surgical_history: string;
  allergic_history: string;
  pharmacological_history: string;
  family_history: string;
  physical_exam: string;
  diagnosis: string;
  treatment_plan: string;
  evolution: string;
  informed_consent: string;
  consent_signed: boolean;
  notes: string;
  treatment_items: TreatmentItem[];
};

const emptyForm: FormData = {
  patient_id: '',
  doctor_id: '',
  appointment_id: '',
  chief_complaint: '',
  current_illness: '',
  personal_history: '',
  surgical_history: '',
  allergic_history: '',
  pharmacological_history: '',
  family_history: '',
  physical_exam: '',
  diagnosis: '',
  treatment_plan: '',
  evolution: '',
  informed_consent: '',
  consent_signed: false,
  notes: '',
  treatment_items: [],
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

export function MedicalRecordsAdmin() {
  const [records, setRecords]     = useState<MedicalRecord[]>([]);
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [doctors, setDoctors]     = useState<Doctor[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [patientFilter, setPatientFilter] = useState<number | ''>('');
  const [editing, setEditing]     = useState<FormData | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadMeta = async () => {
    const [pRes, dRes, tRes] = await Promise.all([
      apiFetch('/api/patients/'),
      apiFetch('/api/doctors/'),
      apiFetch('/api/treatments/'),
    ]);
    const [pJson, dJson, tJson] = await Promise.all([pRes.json(), dRes.json(), tRes.json()]);
    setPatients(pJson.patients || []);
    setDoctors(dJson.doctors || []);
    setTreatments((tJson.treatments || []).filter((t: Treatment & { is_active: boolean }) => t.is_active));
  };

  const load = useCallback(async (q = '', pid: number | '' = '') => {
    setLoading(true);
    try {
      let url = '/api/medical-records/';
      const params: string[] = [];
      if (q)   params.push(`search=${encodeURIComponent(q)}`);
      if (pid) params.push(`patient_id=${pid}`);
      if (params.length) url += '?' + params.join('&');
      const res = await apiFetch(url);
      const json = await res.json();
      setRecords(json.records || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeta(); load(); }, [load]);

  const openNew = () => setEditing({ ...emptyForm });
  const openEdit = (r: MedicalRecord) =>
    setEditing({
      id: r.id,
      patient_id: r.patient_id,
      doctor_id: r.doctor_id,
      appointment_id: r.appointment_id ?? '',
      chief_complaint: r.chief_complaint,
      current_illness: r.current_illness,
      personal_history: r.personal_history,
      surgical_history: r.surgical_history,
      allergic_history: r.allergic_history,
      pharmacological_history: r.pharmacological_history,
      family_history: r.family_history,
      physical_exam: r.physical_exam,
      diagnosis: r.diagnosis,
      treatment_plan: r.treatment_plan,
      evolution: r.evolution,
      informed_consent: r.informed_consent,
      consent_signed: r.consent_signed,
      notes: r.notes,
      treatment_items: r.treatment_items.map((it) => ({ ...it })),
    });

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.patient_id || !editing.doctor_id) {
      setError('Paciente y médico son obligatorios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        patient_id: editing.patient_id,
        doctor_id: editing.doctor_id,
        appointment_id: editing.appointment_id || null,
        chief_complaint: editing.chief_complaint.trim(),
        current_illness: editing.current_illness.trim(),
        personal_history: editing.personal_history.trim(),
        surgical_history: editing.surgical_history.trim(),
        allergic_history: editing.allergic_history.trim(),
        pharmacological_history: editing.pharmacological_history.trim(),
        family_history: editing.family_history.trim(),
        physical_exam: editing.physical_exam.trim(),
        diagnosis: editing.diagnosis.trim(),
        treatment_plan: editing.treatment_plan.trim(),
        evolution: editing.evolution.trim(),
        informed_consent: editing.informed_consent.trim(),
        consent_signed: editing.consent_signed,
        notes: editing.notes.trim(),
        treatment_items: editing.treatment_items.map((it) => ({
          treatment_id: it.treatment_id,
          quantity: it.quantity,
          price: it.price,
          notes: it.notes,
        })),
      };
      const isNew = !editing.id;
      const url = isNew ? '/api/medical-records/' : `/api/medical-records/${editing.id}/`;
      const res = await apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || 'Error al guardar');
      }
      setEditing(null);
      await load(search, patientFilter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este historial? Esta acción no se puede deshacer.')) return;
    await apiFetch(`/api/medical-records/${id}/`, { method: 'DELETE' });
    await load(search, patientFilter);
  };

  const addItem = () => {
    if (!editing || treatments.length === 0) return;
    const t = treatments[0];
    setEditing({
      ...editing,
      treatment_items: [
        ...editing.treatment_items,
        { treatment_id: t.id, treatment_name: t.name, quantity: 1, price: t.price, notes: '' },
      ],
    });
  };

  const updateItem = (idx: number, patch: Partial<TreatmentItem>) => {
    if (!editing) return;
    const items = editing.treatment_items.map((it, i) => {
      if (i !== idx) return it;
      const merged = { ...it, ...patch };
      if ('treatment_id' in patch) {
        const t = treatments.find((t) => t.id === Number(patch.treatment_id));
        if (t) { merged.treatment_name = t.name; merged.price = t.price; }
      }
      return merged;
    });
    setEditing({ ...editing, treatment_items: items });
  };

  const removeItem = (idx: number) => {
    if (!editing) return;
    setEditing({ ...editing, treatment_items: editing.treatment_items.filter((_, i) => i !== idx) });
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); load(search, patientFilter); };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Historial Clínico</h1>
          <p className="text-gray-500 mt-0.5 text-sm">Registros médicos por paciente</p>
        </div>
        <button onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Registro
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por paciente o diagnóstico…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 w-64" />
          </div>
          <button type="submit" className="px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Buscar</button>
        </form>
        <select value={patientFilter} onChange={(e) => { const v = e.target.value ? Number(e.target.value) : ''; setPatientFilter(v); load(search, v); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
          <option value="">Todos los pacientes</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
        </select>
        {(search || patientFilter !== '') && (
          <button onClick={() => { setSearch(''); setPatientFilter(''); load(); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Limpiar</button>
        )}
      </div>

      {/* Records list */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No hay registros médicos</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map((r) => {
              const isOpen = expandedId === r.id;
              const total = r.treatment_items.reduce((s, it) => s + it.price * it.quantity, 0);
              return (
                <div key={r.id}>
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                    <button onClick={() => setExpandedId(isOpen ? null : r.id)} className="flex-1 flex items-center gap-4 text-left">
                      {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{r.patient_name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {r.chief_complaint || r.diagnosis || 'Sin motivo de consulta'}
                        </p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <span className="text-sm text-gray-500">{r.doctor_name}</span>
                        <span className="text-xs text-gray-400">{fmt(r.created_at)}</span>
                      </div>
                      {total > 0 && (
                        <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{fmtCurrency(total)}</span>
                      )}
                    </button>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(r)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 bg-gray-50/40 border-t border-gray-50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 mb-4">
                        {r.chief_complaint && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1">Motivo de consulta</p><p className="text-sm text-gray-800">{r.chief_complaint}</p></div>}
                        {r.current_illness && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1">Enfermedad actual</p><p className="text-sm text-gray-800 whitespace-pre-line">{r.current_illness}</p></div>}
                        {(r.personal_history||r.surgical_history||r.allergic_history||r.pharmacological_history||r.family_history) && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-2">Antecedentes</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {r.personal_history       && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Personales</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.personal_history}</p></div>}
                              {r.surgical_history       && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Quirúrgicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.surgical_history}</p></div>}
                              {r.allergic_history       && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Alérgicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.allergic_history}</p></div>}
                              {r.pharmacological_history && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Farmacológicos</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.pharmacological_history}</p></div>}
                              {r.family_history         && <div className="bg-white border border-gray-100 rounded-lg px-3 py-2"><p className="text-xs text-gray-400 mb-0.5">Familiares</p><p className="text-sm text-gray-700 whitespace-pre-line">{r.family_history}</p></div>}
                            </div>
                          </div>
                        )}
                        {r.physical_exam  && <div className="sm:col-span-2"><p className="text-xs font-medium text-gray-500 uppercase mb-1">Examen físico</p><p className="text-sm text-gray-800 whitespace-pre-line">{r.physical_exam}</p></div>}
                        {r.diagnosis      && <div><p className="text-xs font-medium text-gray-500 uppercase mb-1">Diagnóstico</p><p className="text-sm text-gray-800">{r.diagnosis}</p></div>}
                        {r.treatment_plan && <div className="sm:col-span-2"><p className="text-xs font-medium text-gray-500 uppercase mb-1">Plan de tratamiento</p><p className="text-sm text-gray-800 whitespace-pre-line">{r.treatment_plan}</p></div>}
                        {r.evolution      && <div className="sm:col-span-2"><p className="text-xs font-medium text-gray-500 uppercase mb-1">Evolución</p><p className="text-sm text-gray-800 whitespace-pre-line">{r.evolution}</p></div>}
                        {r.notes          && <div className="sm:col-span-2"><p className="text-xs font-medium text-gray-500 uppercase mb-1">Notas</p><p className="text-sm text-gray-800 whitespace-pre-line">{r.notes}</p></div>}
                        {(r.informed_consent || r.consent_signed) && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Consentimiento informado</p>
                            {r.informed_consent && <p className="text-sm text-gray-800 whitespace-pre-line mb-1">{r.informed_consent}</p>}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r.consent_signed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                              {r.consent_signed ? '✓ Firmado' : 'Pendiente de firma'}
                            </span>
                          </div>
                        )}
                        {/* Médico responsable */}
                        <div className="sm:col-span-2 bg-blue-50/60 border border-blue-100 rounded-xl px-4 py-3">
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Médico responsable</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div><p className="text-xs text-gray-400">Nombre</p><p className="text-sm font-medium text-gray-800">{r.doctor_name || '—'}</p></div>
                            {r.doctor_profession && <div><p className="text-xs text-gray-400">Profesión</p><p className="text-sm text-gray-800">{r.doctor_profession}{r.doctor_specialty ? ` · ${r.doctor_specialty}` : ''}</p></div>}
                            {r.doctor_rethus_number && (
                              <div>
                                <p className="text-xs text-gray-400">ReTHUS</p>
                                <p className="text-sm text-gray-800">{r.doctor_rethus_number}
                                  <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                    r.doctor_rethus_status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                  }`}>{r.doctor_rethus_status === 'ACTIVE' ? 'Activo' : 'Suspendido'}</span>
                                </p>
                              </div>
                            )}
                            {r.doctor_professional_seal && <div className="sm:col-span-2"><p className="text-xs text-gray-400">Sello profesional</p><p className="text-sm font-medium text-gray-800">{r.doctor_professional_seal}</p></div>}
                          </div>
                        </div>
                      </div>
                      {r.treatment_items.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">Tratamientos realizados</p>
                          <div className="space-y-1">
                            {r.treatment_items.map((it, i) => (
                              <div key={i} className="flex justify-between text-sm text-gray-700 bg-white border border-gray-100 px-3 py-2 rounded-lg">
                                <span>{it.treatment_name} × {it.quantity}</span>
                                <span className="font-medium">{fmtCurrency(it.price * it.quantity)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-semibold text-gray-900 px-3 py-1">
                              <span>Total</span><span>{fmtCurrency(total)}</span>
                            </div>
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-gray-900">{editing.id ? 'Editar Registro' : 'Nuevo Registro'}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-500" /></button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Médico <span className="text-red-500">*</span></label>
                  <select value={editing.doctor_id} onChange={(e) => setEditing({ ...editing, doctor_id: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                    <option value="">Seleccionar…</option>
                    {doctors.map((d) => <option key={d.id} value={d.id}>{d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : d.email}</option>)}
                  </select>
                </div>
              </div>

              {/* Motivo + Enfermedad actual */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Consulta</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de consulta</label>
                  <input type="text" value={editing.chief_complaint} onChange={(e) => setEditing({ ...editing, chief_complaint: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Ej: Rejuvenecimiento facial" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enfermedad actual</label>
                  <textarea value={editing.current_illness} onChange={(e) => setEditing({ ...editing, current_illness: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    placeholder="Descripción del motivo estético o problema actual…" />
                </div>
              </div>

              {/* Antecedentes */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Antecedentes</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personales</label>
                    <textarea value={editing.personal_history} onChange={(e) => setEditing({ ...editing, personal_history: e.target.value })}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" placeholder="Enfermedades…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quirúrgicos</label>
                    <textarea value={editing.surgical_history} onChange={(e) => setEditing({ ...editing, surgical_history: e.target.value })}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" placeholder="Cirugias previas…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alérgicos</label>
                    <textarea value={editing.allergic_history} onChange={(e) => setEditing({ ...editing, allergic_history: e.target.value })}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" placeholder="Alergias conocidas…" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Farmacológicos</label>
                    <textarea value={editing.pharmacological_history} onChange={(e) => setEditing({ ...editing, pharmacological_history: e.target.value })}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" placeholder="Medicamentos actuales…" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Familiares</label>
                    <textarea value={editing.family_history} onChange={(e) => setEditing({ ...editing, family_history: e.target.value })}
                      rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" placeholder="Antecedentes familiares relevantes…" />
                  </div>
                </div>
              </div>

              {/* Examen físico + Diagnóstico */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Evaluación clínica</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Examen físico</label>
                  <textarea value={editing.physical_exam} onChange={(e) => setEditing({ ...editing, physical_exam: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    placeholder="Observaciones del profesional, estado general…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
                  <input type="text" value={editing.diagnosis} onChange={(e) => setEditing({ ...editing, diagnosis: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="Diagnóstico clínico" />
                </div>
              </div>

              {/* Plan + Evolución + Notas */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan y seguimiento</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan de tratamiento</label>
                  <textarea value={editing.treatment_plan} onChange={(e) => setEditing({ ...editing, treatment_plan: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    placeholder="Procedimiento, frecuencia, indicaciones…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Evolución</label>
                  <textarea value={editing.evolution} onChange={(e) => setEditing({ ...editing, evolution: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    placeholder="Seguimiento del paciente en el tiempo…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas clínicas</label>
                  <textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                    rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    placeholder="Observaciones, indicaciones post-tratamiento…" />
                </div>
              </div>

              {/* Consentimiento informado */}
              <div className="space-y-3 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Consentimiento informado</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto del consentimiento</label>
                  <textarea value={editing.informed_consent} onChange={(e) => setEditing({ ...editing, informed_consent: e.target.value })}
                    rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                    placeholder="Descripción del procedimiento, riesgos, aclaraciones…" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.consent_signed}
                    onChange={(e) => setEditing({ ...editing, consent_signed: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <span className="text-sm text-gray-700">Paciente firmó el consentimiento</span>
                </label>
              </div>

              {/* Treatment items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Tratamientos realizados</label>
                  <button type="button" onClick={addItem}
                    className="inline-flex items-center gap-1 text-xs text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Agregar
                  </button>
                </div>

                {editing.treatment_items.length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">Sin tratamientos agregados</p>
                ) : (
                  <div className="space-y-2">
                    {editing.treatment_items.map((it, i) => (
                      <div key={i} className="flex gap-2 items-start bg-gray-50 p-3 rounded-lg">
                        <select value={it.treatment_id}
                          onChange={(e) => updateItem(i, { treatment_id: Number(e.target.value) })}
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                          {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input type="number" min={1} value={it.quantity}
                          onChange={(e) => updateItem(i, { quantity: Math.max(1, Number(e.target.value)) })}
                          className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-gray-900" />
                        <input type="number" min={0} step={100} value={it.price}
                          onChange={(e) => updateItem(i, { price: Number(e.target.value) })}
                          className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                        <button onClick={() => removeItem(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                    <div className="text-sm font-semibold text-gray-900 text-right pr-10 pt-1">
                      Total: {fmtCurrency(editing.treatment_items.reduce((s, it) => s + it.price * it.quantity, 0))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing.id ? 'Guardar cambios' : 'Crear registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
