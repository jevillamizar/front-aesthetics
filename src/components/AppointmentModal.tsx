import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

type AppointmentModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AppointmentModal({ open, onClose }: AppointmentModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [submitted, setSubmitted] = useState(false);

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

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      setSubmitted(false);
    };
  }, [open, onClose]);

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
                    onSubmit={(e) => {
                      e.preventDefault();
                      setSubmitted(true);
                      window.setTimeout(() => onClose(), 700);
                    }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Nombre</label>
                        <input
                          name="name"
                          required
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                          placeholder="Tu nombre" />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Teléfono</label>
                        <input
                          name="phone"
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B]"
                          placeholder="(###) ###-####" />
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
                          name="service"
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] bg-white">
                          <option value="">Seleccionar</option>
                          <option value="facial">Faciales</option>
                          <option value="injectables">Inyectables</option>
                          <option value="body">Contorno corporal</option>
                          <option value="skin">Rejuvenecimiento cutáneo</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-[#6B6B6B]">Preferencia</label>
                        <select
                          name="time"
                          className="h-11 rounded-xl border border-[#EAEAEA] px-4 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] bg-white">
                          <option value="">Horario</option>
                          <option value="am">Mañana</option>
                          <option value="pm">Tarde</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-[#6B6B6B]">Mensaje (opcional)</label>
                      <textarea
                        name="message"
                        rows={4}
                        className="rounded-xl border border-[#EAEAEA] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#8B9E8B] resize-none"
                        placeholder="Cuéntanos qué te gustaría lograr" />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button type="button" variant="ghost" onClick={onClose}>
                        Cancelar
                      </Button>
                      <Button type="submit">Enviar</Button>
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
