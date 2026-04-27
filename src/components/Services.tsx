import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

type TreatmentItem = {
  id: number;
  name: string;
  slug: string | null;
  category: string;
  description: string;
  long_description: string;
  duration_minutes: number;
  price: string;
  image_url: string;
};

function ServiceModal({ item, onClose }: { item: TreatmentItem; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      ref={overlayRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Image left */}
          {item.image_url ? (
            <div className="w-full sm:w-5/12 flex-shrink-0">
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-56 sm:h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-full sm:w-5/12 flex-shrink-0 flex items-center justify-center h-32 sm:h-auto bg-[#F5F5F3]">
              <Sparkles className="w-10 h-10 text-[#8B9E8B] opacity-30" />
            </div>
          )}

          {/* Content right */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center overflow-y-auto max-h-[70vh]">
            <h3 className="text-xl font-semibold text-[#2D2D2D] mb-1 leading-snug">{item.name}</h3>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-[#8B9E8B]">{formatPrice(item.price)}</span>
              <span className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                <Clock className="w-3.5 h-3.5" />{item.duration_minutes} min
              </span>
            </div>
            {item.long_description ? (
              <p className="text-sm text-[#6B6B6B] leading-relaxed whitespace-pre-line">{item.long_description}</p>
            ) : (
              <p className="text-sm text-[#6B6B6B] leading-relaxed">{item.description}</p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

type CategoryGroup = {
  id: string;
  label: string;
  items: TreatmentItem[];
};

function groupByCategory(treatments: TreatmentItem[]): CategoryGroup[] {
  const map = new Map<string, TreatmentItem[]>();
  for (const t of treatments) {
    const cat = t.category?.trim() || 'General';
    const list = map.get(cat) ?? [];
    if (!map.has(cat)) map.set(cat, list);
    list.push(t);
  }
  return Array.from(map.entries()).map(([label, items]) => ({
    id: label.toLowerCase().replace(/\s+/g, '-'),
    label,
    items,
  }));
}

function formatPrice(price: string | number): string {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(n) || n === 0) return 'Consultar';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function Services() {
  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TreatmentItem | null>(null);

  const apiBase =
    (import.meta.env.VITE_API_BASE ?? '').trim() ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const endpoint = `${String(apiBase).replace(/\/$/, '')}/public/treatments/`;

  useEffect(() => {
    fetch(endpoint, { method: 'GET' })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok || !data) return;
        const results: TreatmentItem[] = Array.isArray(data.results) ? data.results : [];
        setTreatments(results);
      })
      .catch(() => { /* network error: section stays hidden */ })
      .finally(() => setLoading(false));
  }, [endpoint]);

  const categories = useMemo(() => groupByCategory(treatments), [treatments]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const currentTab = activeTab ?? categories[0]?.id ?? null;

  if (loading) {
    return (
      <section className="py-24 bg-white" id="services">
        <div className="container mx-auto px-4 md:px-6 text-center text-[#6B6B6B]">
          Cargando procedimientos…
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  return (
    <section className="py-24 bg-white" id="services">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-light text-[#2D2D2D] mb-4">
            Procedimientos Diseñados para Ti
          </h2>
          <p className="text-[#6B6B6B] max-w-2xl mx-auto">
            Nuestro menú completo de servicios está diseñado para abordar tus
            preocupaciones únicas con precisión y cuidado.
          </p>
        </div>

        {/* Tabs Navigation — only if more than 1 category */}
        {categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map((cat) =>
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              className={cn(
                'relative px-6 py-3 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B]',
                currentTab === cat.id ?
                'text-white' :
                'text-[#6B6B6B] hover:text-[#2D2D2D]'
              )}>

                {currentTab === cat.id &&
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-[#8B9E8B] rounded-full"
                transition={{
                  type: 'spring',
                  bounce: 0.2,
                  duration: 0.6
                }} />
              }
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  {cat.label}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Services Grid */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{
                opacity: 0,
                y: 20
              }}
              animate={{
                opacity: 1,
                y: 0
              }}
              exit={{
                opacity: 0,
                y: -20
              }}
              transition={{
                duration: 0.4
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8">

              {categories
                .find((c) => c.id === currentTab)
                ?.items.map((item, index) => {
                  const hasDetail = !!(item.long_description || item.image_url);
                  return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => hasDetail && setSelected(item)}
                    className={cn(
                      'group p-8 rounded-2xl bg-[#F5F5F3] hover:bg-white border border-transparent hover:border-[#8B9E8B]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#8B9E8B]/5',
                      hasDetail && 'cursor-pointer'
                    )}>

                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-medium text-[#2D2D2D]">{item.name}</h3>
                      {hasDetail && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[#8B9E8B] text-[#8B9E8B] opacity-70 flex-shrink-0 ml-2">
                          Ver más
                        </span>
                      )}
                    </div>
                    <p className="text-[#6B6B6B] text-sm leading-relaxed mb-6 min-h-[60px]">
                      {item.description}
                    </p>
                    <div className="pt-4 border-t border-[#8B9E8B]/10 flex justify-between items-center">
                      <span className="text-sm font-medium text-[#8B9E8B]">{formatPrice(item.price)}</span>
                      <span className="text-xs text-[#6B6B6B] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.duration_minutes} min
                      </span>
                    </div>
                  </motion.div>
                  );
                })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <ServiceModal item={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>);

}