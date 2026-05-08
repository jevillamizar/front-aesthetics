import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  CalendarDays, CalendarCheck2, ChevronLeft, ChevronRight,
  Loader2, UserPlus, X, Stethoscope, ClipboardList, User,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────── */

type Patient   = { id: number; first_name: string; last_name: string; email: string; phone: string };
type Treatment = { id: number; name: string; duration_minutes: number; price?: number };
type Doctor    = { id: number; first_name: string; last_name: string; email: string };
type Slot      = { starts_at: string; ends_at: string };
type ApptType  = 'PROCEDIMIENTO' | 'VALORACION';
type Step      = 1 | 2 | 3;

const STEP_LABELS = ['Datos', 'Elegir fecha', 'Confirmar'];

const EMPTY_PATIENT = {
  first_name: '', last_name: '', email: '', phone: '',
  doc_type: 'CC', doc_number: '',
};
const DOC_TYPES = [
  { value: 'CC', label: 'CC — Cédula' },
  { value: 'CE', label: 'CE — Cédula Extranjería' },
  { value: 'TI', label: 'TI — Tarjeta Identidad' },
  { value: 'PP', label: 'PP — Pasaporte' },
  { value: 'NIT', label: 'NIT' },
];

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
}

const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

/* ── Props ─────────────────────────────────────────────────────────── */

type Props = {
  onClose: () => void;
  onCreated?: () => void;
  defaultDate?: string;
  forceProcedimiento?: boolean;
  defaultPatientId?: number;
  defaultPatientName?: string;
};

/* ── Component ─────────────────────────────────────────────────────── */

export function NewAppointmentModal({ onClose, onCreated, forceProcedimiento, defaultPatientId, defaultPatientName }: Props) {
  /* meta */
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [doctors, setDoctors]       = useState<Doctor[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  /* step */
  const [step, setStep] = useState<Step>(1);

  /* step 1 — datos */
  const [apptType, setApptType]       = useState<ApptType>('PROCEDIMIENTO');
  const [patientId, setPatientId]     = useState<number | ''>(defaultPatientId ?? '');
  const [treatmentId, setTreatmentId] = useState<number | ''>('');
  const [doctorId, setDoctorId]       = useState<number | ''>('');
  const [duration, setDuration]       = useState(60);
  const [notes, setNotes]             = useState('');
  const [showNewPat, setShowNewPat]   = useState(false);
  const [newPat, setNewPat]           = useState({ ...EMPTY_PATIENT });
  const [creatingPat, setCreatingPat] = useState(false);
  const [patError, setPatError]       = useState('');

  /* step 2 — fecha/slot */
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [selDate, setSelDate]   = useState<Date>(() => today);
  const [weekStart, setWeekStart] = useState<Date>(() => today);
  const [slots, setSlots]       = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selSlot, setSelSlot]   = useState<Slot | null>(null);

  /* misc */
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone]     = useState(false);

  const apiBase = ((import.meta.env.VITE_API_BASE ?? '').trim() ||
    `${window.location.protocol}//${window.location.hostname}:8000`).replace(/\/$/, '');

  /* Load meta */
  useEffect(() => {
    Promise.all([
      apiFetch('/api/patients/').then(r => r.json()),
      apiFetch('/api/treatments/').then(r => r.json()),
      apiFetch('/api/doctors/').then(r => r.json()),
    ]).then(([p, t, d]) => {
      setPatients(p.patients ?? []);
      setTreatments(t.treatments ?? []);
      setDoctors(d.doctors ?? []);
    }).finally(() => setMetaLoading(false));
  }, []);

  /* Load slots when entering step 2 or changing date */
  useEffect(() => {
    if (step !== 2) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelSlot(null);
    fetch(`${apiBase}/public/availability/?date=${toDateStr(selDate)}&duration=${duration}`)
      .then(r => r.json().catch(() => null))
      .then(d => setSlots(Array.isArray(d?.slots) ? d.slots : []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [step, selDate, apiBase, duration]);

  /* Treatment change → auto duration */
  const onTreatmentChange = (tid: number | '') => {
    const t = treatments.find(t => t.id === Number(tid));
    setTreatmentId(tid);
    if (t) setDuration(t.duration_minutes);
  };

  /* Create patient inline */
  const handleCreatePatient = useCallback(async () => {
    if (!newPat.first_name.trim() || !newPat.last_name.trim()) {
      setPatError('Nombres y apellidos son obligatorios.'); return;
    }
    setCreatingPat(true); setPatError('');
    try {
      const res = await apiFetch('/api/patients/', { method: 'POST', body: JSON.stringify(newPat) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.detail || 'Error al crear paciente');
      const created: Patient = d.patient;
      setPatients(prev => [...prev, created]);
      setPatientId(created.id);
      setShowNewPat(false);
      setNewPat({ ...EMPTY_PATIENT });
    } catch (e: unknown) {
      setPatError(e instanceof Error ? e.message : 'Error');
    } finally { setCreatingPat(false); }
  }, [newPat]);

  /* Step 1 → 2 validation */
  const goStep2 = () => {
    if (!patientId) { setError('Selecciona un paciente.'); return; }
    if (apptType === 'PROCEDIMIENTO' && !treatmentId) { setError('Selecciona un procedimiento.'); return; }
    if (apptType === 'PROCEDIMIENTO' && !doctorId) { setError('Selecciona un responsable (médico).'); return; }
    setError(''); setStep(2);
  };

  /* Final submit */
  const handleConfirm = async () => {
    if (!selSlot) return;
    setSaving(true); setError('');
    try {
      const endsAtISO = new Date(
        new Date(selSlot.starts_at).getTime() + duration * 60 * 1000
      ).toISOString();
      const body: Record<string, unknown> = {
        patient_id:       patientId,
        appointment_type: apptType === 'VALORACION' ? 'VALORACION' : 'TRATAMIENTO',
        starts_at:        selSlot.starts_at,
        ends_at:          endsAtISO,
        notes,
      };
      if (apptType === 'PROCEDIMIENTO') {
        body.treatment_id = treatmentId || null;
        body.doctor_id    = doctorId || null;
      }
      const res = await apiFetch('/api/appointments/', { method: 'POST', body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || 'Error al crear cita');
      setDone(true);
      setTimeout(() => { onCreated?.(); onClose(); }, 1800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally { setSaving(false); }
  };

  const selPatient   = patients.find(p => p.id === patientId);
  const selTreatment = treatments.find(t => t.id === treatmentId);
  const selDoctor    = doctors.find(d => d.id === doctorId);

  /* Step indicator */
  const StepBar = () => (
    <div className="flex items-center gap-2 px-6 pb-4">
      {STEP_LABELS.map((label, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done_  = step > n;
        return (
          <div key={n} className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 transition-colors
              ${done_ ? 'bg-gray-900 text-white' : active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
              {done_ ? '✓' : n}
            </div>
            <span className={`text-xs truncate ${active ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-gray-100" />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-gray-400" /> Nueva Cita
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Step bar */}
        {!done && <div className="pt-4"><StepBar /></div>}

        <div className="flex-1 overflow-y-auto">
          {metaLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>

          ) : done ? (
            /* ── Success ── */
            <div className="flex flex-col items-center py-14 text-center gap-3 px-6">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CalendarCheck2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-lg font-semibold text-gray-900">¡Cita creada!</p>
              <p className="text-sm text-gray-500">La cita fue registrada correctamente.</p>
            </div>

          ) : step === 1 ? (
            /* ── STEP 1: Datos ── */
            <div className="px-6 pb-6 space-y-5">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              {/* Tipo de cita */}
              {forceProcedimiento ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Cita de Procedimiento</span>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de cita</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { val: 'VALORACION'    as ApptType, icon: ClipboardList, label: 'Valoración' },
                      { val: 'PROCEDIMIENTO' as ApptType, icon: Stethoscope, label: 'Procedimiento' },
                    ] as const).map(({ val, icon: Icon, label }) => (
                      <button key={val} type="button" onClick={() => setApptType(val)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors
                          ${apptType === val ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paciente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paciente <span className="text-red-500">*</span></label>

                {defaultPatientId ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-900 font-medium">{defaultPatientName}</span>
                    <span className="ml-auto text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Fijo</span>
                  </div>
                ) : (
                  <select value={patientId}
                    onChange={e => {
                      if (e.target.value === '__new__') { setShowNewPat(true); setPatientId(''); }
                      else { setShowNewPat(false); setPatientId(Number(e.target.value) || ''); }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                    <option value="">Selecciona un paciente</option>
                    <option value="__new__">+ Nuevo paciente</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name} — {p.phone || p.email}</option>
                    ))}
                  </select>
                )}

                {!defaultPatientId && showNewPat && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700">Nuevo paciente</p>
                      <button onClick={() => setShowNewPat(false)} className="p-1 hover:bg-gray-200 rounded"><X className="w-3 h-3" /></button>
                    </div>
                    {patError && <p className="text-xs text-red-600">{patError}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Nombres *" value={newPat.first_name} onChange={e => setNewPat({ ...newPat, first_name: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      <input placeholder="Apellidos *" value={newPat.last_name} onChange={e => setNewPat({ ...newPat, last_name: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      <select value={newPat.doc_type} onChange={e => setNewPat({ ...newPat, doc_type: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gray-900">
                        {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                      <input placeholder="Nro. documento" value={newPat.doc_number} onChange={e => setNewPat({ ...newPat, doc_number: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      <input placeholder="Teléfono" value={newPat.phone} onChange={e => setNewPat({ ...newPat, phone: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      <input type="email" placeholder="Email" value={newPat.email} onChange={e => setNewPat({ ...newPat, email: e.target.value })}
                        className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>
                    <button onClick={handleCreatePatient} disabled={creatingPat}
                      className="w-full inline-flex items-center justify-center gap-2 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                      {creatingPat ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />} Crear y seleccionar
                    </button>
                  </div>
                )}
              </div>

              {/* Procedimiento fields (only if PROCEDIMIENTO) */}
              {apptType === 'PROCEDIMIENTO' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Procedimiento <span className="text-red-500">*</span></label>
                    <select value={treatmentId} onChange={e => onTreatmentChange(Number(e.target.value) || '')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      <option value="">Selecciona procedimiento</option>
                      {treatments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsable <span className="text-red-500">*</span></label>
                    <select value={doctorId} onChange={e => setDoctorId(Number(e.target.value) || '')}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      <option value="">Selecciona un médico</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.first_name || d.last_name ? `${d.first_name} ${d.last_name}`.trim() : d.email}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duración (min)</label>
                    <input type="number" min={5} step={5} value={duration}
                      onChange={e => setDuration(Number(e.target.value) || 60)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                </>
              )}

              {/* Notes — always visible */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  placeholder="Observaciones opcionales…" />
              </div>

              <div className="flex justify-end pt-1">
                <button onClick={goStep2}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
                  Siguiente →
                </button>
              </div>
            </div>

          ) : step === 2 ? (
            /* ── STEP 2: Fecha / slots ── */
            <div className="px-6 pb-6 space-y-5">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              {/* Date navigation */}
              <div>
                {/* Input de fecha */}
                <div className="mb-3">
                  <input
                    type="date"
                    value={toDateStr(selDate)}
                    min={toDateStr(today)}
                    onChange={e => {
                      const parsed = new Date(e.target.value + 'T00:00:00');
                      if (!isNaN(parsed.getTime()) && parsed >= today) {
                        setSelDate(parsed);
                        setWeekStart(parsed);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>

                {/* Semana con flechas */}
                <div className="flex items-center justify-between mb-2">
                  <button type="button"
                    onClick={() => {
                      const newStart = addDays(weekStart, -7);
                      const clamped = newStart < today ? today : newStart;
                      setWeekStart(clamped);
                      if (toDateStr(selDate) < toDateStr(clamped)) setSelDate(clamped);
                    }}
                    disabled={addDays(weekStart, -7) < today}
                    className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <p className="text-xs text-gray-400 font-medium">
                    {MONTH_NAMES[weekStart.getMonth()]} {weekStart.getFullYear()}
                  </p>
                  <button type="button"
                    onClick={() => setWeekStart(addDays(weekStart, 7))}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Day chips */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map(d => {
                    const active = toDateStr(d) === toDateStr(selDate);
                    const past = d < today;
                    return (
                      <button key={d.toISOString()} type="button"
                        onClick={() => { if (!past) setSelDate(d); }}
                        disabled={past}
                        className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs shrink-0 border transition-colors
                          ${active ? 'border-gray-900 bg-gray-900 text-white' : past ? 'border-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 hover:border-gray-400 text-gray-600'}`}>
                        <span className="font-medium">{DAY_NAMES[d.getDay()]}</span>
                        <span>{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Horarios disponibles</p>
                {slotsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                ) : slots.length === 0 ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 py-6 text-center text-sm text-gray-400">
                    No hay horarios disponibles.<br />
                    <span className="text-xs">Prueba con otra fecha.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                    {slots.map(slot => {
                      const active = selSlot?.starts_at === slot.starts_at;
                      return (
                        <button key={slot.starts_at} type="button" onClick={() => setSelSlot(slot)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-colors
                            ${active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-400 text-gray-800'}`}>
                          {fmtTime(slot.starts_at)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => { setError(''); setStep(1); }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Volver
                </button>
                <button disabled={!selSlot} onClick={() => { setError(''); setStep(3); }}
                  className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors">
                  Confirmar horario →
                </button>
              </div>
            </div>

          ) : (
            /* ── STEP 3: Confirmar ── */
            <div className="px-6 pb-6 space-y-5">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3 text-sm">
                <p className="font-semibold text-gray-900">Resumen de la cita</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Tipo</span>
                  <span className="text-gray-900 font-medium">{apptType === 'VALORACION' ? 'Valoración' : 'Procedimiento'}</span>

                  <span className="text-xs text-gray-400 uppercase tracking-wide">Paciente</span>
                  <span className="text-gray-900 font-medium">{selPatient ? `${selPatient.first_name} ${selPatient.last_name}` : '—'}</span>

                  {apptType === 'PROCEDIMIENTO' && selTreatment && (
                    <>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Procedimiento</span>
                      <span className="text-gray-900">{selTreatment.name}</span>
                    </>
                  )}

                  {apptType === 'PROCEDIMIENTO' && selDoctor && (
                    <>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Responsable</span>
                      <span className="text-gray-900">{`${selDoctor.first_name} ${selDoctor.last_name}`.trim() || selDoctor.email}</span>
                    </>
                  )}

                  {selSlot && (
                    <>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Fecha</span>
                      <span className="text-gray-900 font-medium capitalize">{fmtDate(selSlot.starts_at)}</span>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Hora</span>
                      <span className="text-gray-900 font-medium">{fmtTime(selSlot.starts_at)} – {fmtTime(selSlot.ends_at)}</span>
                    </>
                  )}

                  {notes && (
                    <>
                      <span className="text-xs text-gray-400 uppercase tracking-wide">Notas</span>
                      <span className="text-gray-700">{notes}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={() => { setError(''); setStep(2); }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Volver
                </button>
                <button onClick={handleConfirm} disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors">
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</> : 'Confirmar cita'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
