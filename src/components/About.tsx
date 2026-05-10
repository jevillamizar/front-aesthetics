import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { Button } from './ui/Button';

export type AboutBullet = {
  title: string;
  description?: string;
  image_url?: string;
};

type AboutLanding = {
  about_title?: string;
  about_subtitle?: string;
  about_description?: string;
  about_bullets?: (string | AboutBullet)[];
  about_image_url?: string;
  about_image_urls?: string[];
  about_badge_title?: string;
  about_badge_text?: string;
};

type AboutProps = {
  landing?: AboutLanding;
};

const defaultTitle = 'Belleza respaldada por la ciencia,';
const defaultSubtitle = 'Entregado con arte';
const defaultDescription =
  'Fundada por la Dra. Elena Ross, nuestra clínica une la precisión médica con el arte estético. Creemos que los mejores resultados son los que nadie nota: simplemente una versión más fresca y confiada de ti.\n\nNuestra filosofía se basa en la educación y la transparencia. Tomamos el tiempo necesario para entender tu anatomía y tus objetivos, creando un plan de tratamiento personalizado que respeta tus características naturales.';
const defaultBullets: AboutBullet[] = [
  { title: 'Dermatólogos certificados por el consejo' },
  { title: 'Tratamientos aprobados por la FDA' },
  { title: 'Protocolos de seguridad avanzados' },
  { title: 'Cuidado personalizado después del tratamiento' },
];
const defaultImage = '/images/portrait-dermatologist-standing-with-hands-pockets.jpg';

function normalise(raw: (string | AboutBullet)[]): AboutBullet[] {
  return raw.slice(0, 6).map((b) =>
    typeof b === 'string' ? { title: b } : b
  );
}

function BulletModal({ bullet, index, onClose }: { bullet: AboutBullet; index: number; onClose: () => void }) {
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
      key="backdrop"
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
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Image left */}
          {bullet.image_url ? (
            <div className="w-full sm:w-5/12 flex-shrink-0">
              <img
                src={bullet.image_url}
                alt={bullet.title}
                className="w-full h-56 sm:h-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div
              className="w-full sm:w-5/12 flex-shrink-0 flex items-center justify-center h-32 sm:h-auto"
              style={{ backgroundColor: 'var(--secondary, #F5F5F3)' }}
            >
              <span
                className="text-5xl font-bold opacity-20"
                style={{ color: 'var(--primary, #8B9E8B)' }}
              >{index + 1}</span>
            </div>
          )}

          {/* Content right */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
            <span
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mb-4 flex-shrink-0"
              style={{ backgroundColor: 'var(--primary, #8B9E8B)' }}
            >{index + 1}</span>
            <h3 className="text-xl font-semibold mb-3 leading-snug" style={{ color: 'var(--text, #2D2D2D)' }}>
              {bullet.title}
            </h3>
            {bullet.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted, #6B6B6B)' }}>
                {bullet.description}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BulletCard({ bullet, index }: { bullet: AboutBullet; index: number }) {
  const [open, setOpen] = useState(false);
  const hasExtra = !!(bullet.description || bullet.image_url);

  return (
    <>
      <button
        type="button"
        onClick={() => hasExtra && setOpen(true)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 text-left transition-all duration-200 ${
          hasExtra
            ? 'cursor-pointer hover:border-gray-300 hover:shadow-sm hover:scale-[1.01]'
            : 'cursor-default'
        }`}
        style={{ backgroundColor: 'var(--secondary, #F5F5F3)' }}
      >
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
          style={{ backgroundColor: 'var(--primary, #8B9E8B)' }}
        >{index + 1}</span>
        <span className="flex-1 font-medium text-sm" style={{ color: 'var(--text, #2D2D2D)' }}>{bullet.title}</span>
        {hasExtra && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border" style={{ color: 'var(--primary, #8B9E8B)', borderColor: 'var(--primary, #8B9E8B)', opacity: 0.7 }}>
            Ver más
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <BulletModal bullet={bullet} index={index} onClose={() => setOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

type TeamDoctor = {
  id: number;
  first_name: string;
  last_name: string;
  profession: string;
  specialty: string;
  bio: string;
  photo_url: string;
};

function DoctorCard({ doc }: { doc: TeamDoctor }) {
  const [expanded, setExpanded] = useState(false);
  const name = `${doc.first_name} ${doc.last_name}`.trim();
  const BIO_PREVIEW = 160;
  const isLong = doc.bio.length > BIO_PREVIEW;
  const displayBio = expanded || !isLong ? doc.bio : `${doc.bio.slice(0, BIO_PREVIEW)}…`;

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
      style={{ backgroundColor: 'var(--secondary, #F5F5F3)' }}>
      {/* Photo */}
      <div className="w-full aspect-square overflow-hidden" style={{ backgroundColor: 'var(--secondary, #F5F5F3)' }}>
        {doc.photo_url ? (
          <img src={doc.photo_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl font-bold opacity-20" style={{ color: 'var(--primary, #8B9E8B)' }}>
              {(doc.first_name?.[0] || '?').toUpperCase()}
            </span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-semibold leading-snug mb-0.5" style={{ color: 'var(--text, #2D2D2D)' }}>{name || '—'}</h3>
        {(doc.profession || doc.specialty) && (
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--primary, #8B9E8B)' }}>
            {[doc.profession, doc.specialty].filter(Boolean).join(' · ')}
          </p>
        )}
        {doc.bio && (
          <div className="mt-auto">
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted, #6B6B6B)' }}>{displayBio}</p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-xs font-medium underline underline-offset-2 transition-colors"
                style={{ color: 'var(--primary, #8B9E8B)' }}
              >
                {expanded ? 'Ver menos' : 'Ver más'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamModal({ onClose }: { onClose: () => void }) {
  const [team, setTeam] = useState<TeamDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE ?? '').trim() ||
      window.location.origin;
    fetch(`${apiBase.replace(/\/$/, '')}/public/team/`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Error al cargar el equipo');
        const json = await res.json();
        setTeam(json.team || []);
      })
      .catch((e) => setError(e.message || 'Error'))
      .finally(() => setLoading(false));
  }, []);

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
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text, #2D2D2D)' }}>Nuestro Equipo</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted, #6B6B6B)' }}>Conoce a los profesionales detrás de cada tratamiento</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary, #8B9E8B)' }} />
            </div>
          )}
          {!loading && error && (
            <p className="text-center text-sm text-red-500 py-10">{error}</p>
          )}
          {!loading && !error && team.length === 0 && (
            <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted, #6B6B6B)' }}>
              No hay médicos disponibles en este momento.
            </p>
          )}
          {!loading && !error && team.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {team.map((doc) => <DoctorCard key={doc.id} doc={doc} />)}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function About({ landing }: AboutProps) {
  const [teamOpen, setTeamOpen] = useState(false);

  const title       = landing?.about_title?.trim()       || defaultTitle;
  const subtitle    = landing?.about_subtitle?.trim()    || defaultSubtitle;
  const description = landing?.about_description?.trim() || defaultDescription;
  const badgeTitle  = landing?.about_badge_title?.trim() || '';
  const badgeText   = landing?.about_badge_text?.trim()  || '';

  const bullets = useMemo(() => {
    const raw = landing?.about_bullets;
    if (raw && raw.length > 0) return normalise(raw);
    return defaultBullets;
  }, [landing?.about_bullets]);

  const images = useMemo(() => {
    const fromList = (landing?.about_image_urls ?? [])
      .map((u) => u.trim()).filter(Boolean);
    if (fromList.length > 0) return fromList;
    const single = landing?.about_image_url?.trim();
    return single ? [single] : [defaultImage];
  }, [landing?.about_image_url, landing?.about_image_urls]);

  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => { setActiveImage(0); }, [images]);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = window.setInterval(() =>
      setActiveImage((c) => (c + 1) % images.length), 5000);
    return () => window.clearInterval(id);
  }, [images]);

  const paragraphs = description.split('\n').filter((p) => p.trim());

  return (
    <section id="about" className="py-24 bg-white overflow-hidden scroll-mt-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">

          {/* Image Side — carousel */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2 relative">

            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--secondary, #F5F5F3)' }}>
              {images.map((url, idx) => (
                <img
                  key={`${url}-${idx}`}
                  src={url}
                  alt="Sobre nosotros"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${idx === activeImage ? 'opacity-100' : 'opacity-0'}`}
                  loading="lazy"
                />
              ))}
              {/* Dot indicators — only when multiple */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        idx === activeImage ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {badgeTitle && (
              <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-xl shadow-xl max-w-[200px] hidden md:block">
                <p className="text-4xl font-serif mb-1" style={{ color: 'var(--primary, #8B9E8B)' }}>{badgeTitle}</p>
                {badgeText && (
                  <p className="text-sm" style={{ color: 'var(--text-muted, #6B6B6B)' }}>{badgeText}</p>
                )}
              </div>
            )}
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2">

            <h2 className="text-3xl md:text-4xl font-light mb-6" style={{ color: 'var(--text, #2D2D2D)' }}>
              {title} <br />
              <span className="font-serif italic" style={{ color: 'var(--primary, #8B9E8B)' }}>{subtitle}</span>
            </h2>

            {paragraphs.map((p, i) => (
              <p key={i}
                className={`text-lg leading-relaxed ${i < paragraphs.length - 1 ? 'mb-6' : 'mb-8'}`}
                style={{ color: 'var(--text-muted, #6B6B6B)' }}>
                {p}
              </p>
            ))}

            {bullets.length > 0 && (
              <div className="space-y-2 mb-10">
                {bullets.map((b, i) => (
                  <BulletCard key={i} bullet={b} index={i} />
                ))}
              </div>
            )}

            <Button variant="outline" size="lg" onClick={() => setTeamOpen(true)}>Conoce a nuestro equipo</Button>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {teamOpen && <TeamModal onClose={() => setTeamOpen(false)} />}
      </AnimatePresence>
    </section>
  );
}