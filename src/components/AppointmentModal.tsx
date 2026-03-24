import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

type AppointmentModalProps = {
  open: boolean;
  onClose: () => void;
};

type TreatmentOption = {
  id: number;
  name: string;
  slug: string | null;
  duration_minutes: number;
  price: string;
};

export function AppointmentModal({ open, onClose }: AppointmentModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [treatmentsLoading, setTreatmentsLoading] = useState(false);

  const apiBase =
    (import.meta.env.VITE_API_BASE ?? '').trim() ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const endpoint = `${String(apiBase).replace(/\/$/, '')}/public/appointments/`;
  const treatmentsEndpoint = `${String(apiBase).replace(/\/$/, '')}/public/treatments/`;

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('input, textarea, select, button')?.focus();
    });

    setTreatmentsLoading(true);
    fetch(treatmentsEndpoint, {
      method: 'GET'
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) return;
        const results = Array.isArray(data?.results) ? data.results : [];
        setTreatments(results);
      })
      .catch(() => {
        // ignore: we keep static select usable even if network fails
      })
      .finally(() => setTreatmentsLoading(false));

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      setSubmitted(false);
      setLoading(false);
      setError(null);
      setTreatments([]);
      setTreatmentsLoading(false);
    };
  }, [open, onClose, treatmentsEndpoint]);

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
            className="absolute inset-0 bg-black/40"
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
              className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-[#F5F5F3]"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between px-6 pt-6">
                <div>
                  <h3 id={titleId} className="text-xl font-medium text-[#2D2D2D]">
                    Reservar cita
                  </h3>
                  <p className="text-sm text-[#6B6B6B] mt-1">
                    Déjanos tus datos y te contactamos para confirmar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-[#8B9E8B]/10 transition-colors"
                  aria-label="Cerrar">
                  <X className="w-5 h-5 text-[#6B6B6B]" />
                </button>
              </div>

              <div className="px-6 pb-6 pt-4">
                {!submitted ? (
                  <form
                    className="grid grid-cols-1 gap-4"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setError(null);
                      setLoading(true);

                      const formData = new FormData(e.currentTarget);
                      const firstName = String(formData.get('first_name') ?? '').trim();
                      const lastName = String(formData.get('last_name') ?? '').trim();
                      const phone = String(formData.get('phone') ?? '').trim();
                      const email = String(formData.get('email') ?? '').trim();
                      const treatmentSlug = String(formData.get('treatment_slug') ?? '').trim();
                      const date = String(formData.get('date') ?? '').trim();
                      const time = String(formData.get('time') ?? '').trim();
                      const durationMinutes = Number(formData.get('duration_minutes') ?? 60);
                      const notes = String(formData.get('notes') ?? '').trim();

                      if (!firstName || !lastName || !email) {
                        setError('Por favor completa nombre, apellido y email.');
                        setLoading(false);
                        return;
                      }

                      if (!date || !time) {
                        setError('Por favor selecciona fecha y hora.');
                        setLoading(false);
                        return;
                      }

                      const startsLocal = new Date(`${date}T${time}:00`);
                      if (Number.isNaN(startsLocal.getTime())) {
                        setError('Fecha/hora inválida.');
                        setLoading(false);
                        return;
                      }

                      const endsLocal = new Date(startsLocal.getTime() + (Number.isFinite(durationMinutes) ? durationMinutes : 60) * 60 * 1000);

                      const payload: {
                        patient: {
                          first_name: string;
                          last_name: string;
                          phone: string;
                          email: string;
                        };
                        starts_at: string;
                        ends_at: string;
                        notes: string;
                        treatment_slug?: string;
                      } = {
                        patient: {
                          first_name: firstName,
                          last_name: lastName,
                          phone,
                          email
                        },
                        starts_at: startsLocal.toISOString(),
                        ends_at: endsLocal.toISOString(),
                        notes
                      };

                      if (treatmentSlug) {
                        payload.treatment_slug = treatmentSlug;
                      }

                      try {
                        const res = await fetch(endpoint, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify(payload)
                        });

                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          setError(String(data?.detail ?? 'No se pudo agendar la cita.'));
                          setLoading(false);
                          return;
                        }

                        setSubmitted(true);
                        setLoading(false);
                        window.setTimeout(() => onClose(), 900);
                      } catch {
                        setError('Error de red. Intenta nuevamente.');
                        setLoading(false);
                      }
                    }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Nombre</label>
                        <input
                          name="first_name"
                          required
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                          placeholder="Tu nombre" />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Apellido</label>
                        <input
                          name="last_name"
                          required
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                          placeholder="Tu apellido" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Teléfono</label>
                        <input
                          name="phone"
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                          placeholder="(###) ###-####" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Duración (min)</label>
                        <input
                          name="duration_minutes"
                          type="number"
                          min={15}
                          step={15}
                          defaultValue={60}
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-[#6B6B6B]">Email</label>
                      <input
                        name="email"
                        type="email"
                        required
                        className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                        placeholder="tu@email.com" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Servicio</label>
                        <select
                          name="treatment_slug"
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] bg-white">
                          <option value="">{treatmentsLoading ? 'Cargando...' : 'Seleccionar'}</option>
                          {treatments
                            .filter((t) => Boolean(t.slug))
                            .map((t) => (
                              <option key={t.id} value={String(t.slug)}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Fecha</label>
                        <input
                          name="date"
                          type="date"
                          required
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Hora</label>
                        <input
                          name="time"
                          type="time"
                          required
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-[#6B6B6B]">Notas (opcional)</label>
                      <textarea
                        name="notes"
                        rows={4}
                        className="rounded-xl border border-[#EAEAEA] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] resize-none"
                        placeholder="Cuéntanos qué te gustaría lograr" />
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button type="button" variant="ghost" onClick={onClose}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="py-10 text-center">
                    <p className="text-sm text-[#6B6B6B]">¡Listo! Te contactaremos pronto.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
