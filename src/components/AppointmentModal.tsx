import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Loader2, CalendarCheck2 } from 'lucide-react';
import { Button } from './ui/Button';

type AppointmentModalProps = {
  open: boolean;
  onClose: () => void;
};

type Slot = {
  starts_at: string;
  ends_at: string;
};

const STEP_LABELS = ['Tus datos', 'Elige fecha', 'Confirmar'];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function AppointmentModal({ open, onClose }: AppointmentModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [interestNotes, setInterestNotes] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const apiBase =
    (import.meta.env.VITE_API_BASE ?? '').trim() ||
    window.location.origin;
  const availabilityEndpoint = `${String(apiBase).replace(/\/$/, '')}/public/availability/`;
  const leadsEndpoint = `${String(apiBase).replace(/\/$/, '')}/public/leads/`;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      setStep(1);
      setSubmitted(false);
      setLoading(false);
      setError(null);
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setInterestNotes('');
      setSelectedSlot(null);
      setSlots([]);
      setSelectedDate(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d; });
    };
  }, [open, onClose]);

  useEffect(() => {
    if (step !== 2) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedSlot(null);
    const dateStr = toDateInputValue(selectedDate);
    fetch(`${availabilityEndpoint}?date=${dateStr}`)
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        setSlots(Array.isArray(data?.slots) ? data.slots : []);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [step, selectedDate, availabilityEndpoint]);

  async function handleConfirm() {
    if (!selectedSlot) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(leadsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          interest_notes: interestNotes,
          starts_at: selectedSlot.starts_at,
          ends_at: selectedSlot.ends_at,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(String(data?.detail ?? 'No se pudo agendar la valoración.'));
        setLoading(false);
        return;
      }
      setSubmitted(true);
      setLoading(false);
      window.setTimeout(() => onClose(), 2000);
    } catch {
      setError('Error de red. Intenta nuevamente.');
      setLoading(false);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}>
          <motion.button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <div className="relative h-full w-full flex items-center justify-center p-4">
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#F0F0EE] overflow-hidden"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.22 }}>

              {/* Header */}
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div>
                  <h3 id={titleId} className="text-xl font-medium text-[#2D2D2D]">
                    Agenda tu valoración
                  </h3>
                  <p className="text-sm text-[#6B6B6B] mt-0.5">
                    Sin costo · Te confirmamos por WhatsApp o email
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[#F0F0EE] transition-colors mt-0.5"
                  aria-label="Cerrar">
                  <X className="w-4 h-4 text-[#6B6B6B]" />
                </button>
              </div>

              {/* Step indicator */}
              {!submitted && (
                <div className="px-6 pb-4">
                  <div className="flex items-center gap-2">
                    {STEP_LABELS.map((label, i) => {
                      const n = i + 1;
                      const active = step === n;
                      const done = step > n;
                      return (
                        <div key={n} className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium shrink-0 transition-colors
                            ${done ? 'bg-[var(--primary,#8B9E8B)] text-white' : active ? 'bg-[#2D2D2D] text-white' : 'bg-[#F0F0EE] text-[#9B9B9B]'}`}>
                            {done ? '✓' : n}
                          </div>
                          <span className={`text-xs truncate ${active ? 'text-[#2D2D2D] font-medium' : 'text-[#9B9B9B]'}`}>{label}</span>
                          {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-[#EAEAEA]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="px-6 pb-6">
                <AnimatePresence mode="wait">

                  {/* ── STEP 1: Personal data ── */}
                  {!submitted && step === 1 && (
                    <motion.div key="step1"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                      className="grid grid-cols-1 gap-4">

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#6B6B6B]">Nombre *</label>
                          <input value={firstName} onChange={e => setFirstName(e.target.value)} required
                            className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                            placeholder="Tu nombre" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#6B6B6B]">Apellido *</label>
                          <input value={lastName} onChange={e => setLastName(e.target.value)} required
                            className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                            placeholder="Tu apellido" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#6B6B6B]">Teléfono / WhatsApp *</label>
                          <input value={phone} onChange={e => setPhone(e.target.value)}
                            className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                            placeholder="+57 300 000 0000" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-medium text-[#6B6B6B]">Email</label>
                          <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                            className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                            placeholder="tu@email.com" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">¿Qué te interesa tratar? (opcional)</label>
                        <textarea value={interestNotes} onChange={e => setInterestNotes(e.target.value)} rows={3}
                          className="rounded-xl border border-[#EAEAEA] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] resize-none"
                          placeholder="Ej: Botox, relleno de labios, manchas en la piel…" />
                      </div>

                      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                      <div className="flex justify-end pt-1">
                        <Button onClick={() => {
                          if (!firstName.trim() || !lastName.trim()) { setError('Nombre y apellido son requeridos.'); return; }
                          if (!phone.trim() && !email.trim()) { setError('Ingresa un teléfono o email para contactarte.'); return; }
                          setError(null);
                          setStep(2);
                        }}>
                          Siguiente →
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── STEP 2: Date + slot picker ── */}
                  {!submitted && step === 2 && (
                    <motion.div key="step2"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col gap-5">

                      {/* Date navigation */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <button type="button"
                            onClick={() => { const d = addDays(selectedDate, -1); if (d >= today) setSelectedDate(d); }}
                            disabled={addDays(selectedDate, -1) < today}
                            className="p-1.5 rounded-lg hover:bg-[#F0F0EE] disabled:opacity-30 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="text-center">
                            <p className="text-sm font-medium text-[#2D2D2D]">
                              {dayNames[selectedDate.getDay()]}, {selectedDate.getDate()} de {monthNames[selectedDate.getMonth()]}
                            </p>
                            <p className="text-xs text-[#9B9B9B]">{selectedDate.getFullYear()}</p>
                          </div>
                          <button type="button"
                            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                            className="p-1.5 rounded-lg hover:bg-[#F0F0EE] transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quick date chips: next 7 days */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {Array.from({ length: 7 }, (_, i) => addDays(today, i + 1)).map((d) => {
                            const active = toDateInputValue(d) === toDateInputValue(selectedDate);
                            return (
                              <button key={d.toISOString()} type="button"
                                onClick={() => setSelectedDate(d)}
                                className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs shrink-0 border transition-colors
                                  ${active ? 'border-[var(--primary,#8B9E8B)] bg-[var(--primary,#8B9E8B)] text-white' : 'border-[#EAEAEA] hover:border-[#8B9E8B] text-[#6B6B6B]'}`}>
                                <span className="font-medium">{dayNames[d.getDay()]}</span>
                                <span>{d.getDate()}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Slots */}
                      <div>
                        <p className="text-xs font-medium text-[#6B6B6B] mb-2">Horarios disponibles</p>
                        {slotsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-[#8B9E8B]" />
                          </div>
                        ) : slots.length === 0 ? (
                          <div className="rounded-xl border border-[#EAEAEA] bg-[#F9F9F7] py-6 text-center text-sm text-[#9B9B9B]">
                            No hay horarios disponibles para este día.
                            <br />
                            <span className="text-xs">Prueba con otra fecha.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto pr-1">
                            {slots.map((slot) => {
                              const active = selectedSlot?.starts_at === slot.starts_at;
                              return (
                                <button key={slot.starts_at} type="button"
                                  onClick={() => setSelectedSlot(slot)}
                                  className={`py-2.5 rounded-xl text-sm font-medium border transition-colors
                                    ${active ? 'border-[var(--primary,#8B9E8B)] bg-[var(--primary,#8B9E8B)] text-white' : 'border-[#EAEAEA] hover:border-[#8B9E8B] text-[#2D2D2D]'}`}>
                                  {formatTime(slot.starts_at)}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                      <div className="flex items-center justify-between pt-1">
                        <button type="button" onClick={() => { setError(null); setStep(1); }}
                          className="flex items-center gap-1 text-sm text-[#6B6B6B] hover:text-[#2D2D2D] transition-colors">
                          <ChevronLeft className="w-4 h-4" /> Volver
                        </button>
                        <Button disabled={!selectedSlot} onClick={() => { setError(null); setStep(3); }}>
                          Confirmar horario →
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── STEP 3: Summary + submit ── */}
                  {!submitted && step === 3 && (
                    <motion.div key="step3"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-col gap-5">

                      <div className="rounded-xl border border-[#EAEAEA] bg-[#F9F9F7] p-4 space-y-3 text-sm">
                        <p className="font-medium text-[#2D2D2D]">Resumen de tu cita de valoración</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[#6B6B6B]">
                          <span className="text-xs uppercase tracking-wide">Paciente</span>
                          <span className="text-[#2D2D2D] font-medium">{firstName} {lastName}</span>
                          <span className="text-xs uppercase tracking-wide">Contacto</span>
                          <span className="text-[#2D2D2D]">{phone || email}</span>
                          {selectedSlot && (
                            <>
                              <span className="text-xs uppercase tracking-wide">Fecha</span>
                              <span className="text-[#2D2D2D] font-medium">
                                {new Date(selectedSlot.starts_at).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })}
                              </span>
                              <span className="text-xs uppercase tracking-wide">Hora</span>
                              <span className="text-[#2D2D2D] font-medium">
                                {formatTime(selectedSlot.starts_at)} – {formatTime(selectedSlot.ends_at)}
                              </span>
                            </>
                          )}
                          {interestNotes && (
                            <>
                              <span className="text-xs uppercase tracking-wide">Interés</span>
                              <span className="text-[#2D2D2D]">{interestNotes}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-[#9B9B9B] leading-relaxed">
                        Al confirmar, te llegará un mensaje de nuestro equipo para corroborar el horario. La cita de valoración es sin costo.
                      </p>

                      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

                      <div className="flex items-center justify-between pt-1">
                        <button type="button" onClick={() => { setError(null); setStep(2); }}
                          className="flex items-center gap-1 text-sm text-[#6B6B6B] hover:text-[#2D2D2D] transition-colors">
                          <ChevronLeft className="w-4 h-4" /> Volver
                        </button>
                        <Button onClick={handleConfirm} disabled={loading}>
                          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando…</> : 'Confirmar valoración'}
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* ── SUCCESS ── */}
                  {submitted && (
                    <motion.div key="success"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-10 text-center gap-3">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'color-mix(in srgb, var(--primary,#8B9E8B) 15%, white)' }}>
                        <CalendarCheck2 className="w-7 h-7" style={{ color: 'var(--primary,#8B9E8B)' }} />
                      </div>
                      <p className="text-lg font-medium text-[#2D2D2D]">¡Valoración agendada!</p>
                      <p className="text-sm text-[#6B6B6B] max-w-xs">
                        Nos pondremos en contacto contigo pronto para confirmar tu cita.
                      </p>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
