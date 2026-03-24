import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';

type AboutLanding = {
  about_title?: string;
  about_subtitle?: string;
  about_description?: string;
  about_bullets?: string[];
  about_image_url?: string;
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
const defaultBullets = [
  'Dermatólogos certificados por el consejo',
  'Tratamientos aprobados por la FDA',
  'Protocolos de seguridad avanzados',
  'Cuidado personalizado después del tratamiento',
];
const defaultImage = '/images/portrait-dermatologist-standing-with-hands-pockets.jpg';

export function About({ landing }: AboutProps) {
  const title = landing?.about_title?.trim() || defaultTitle;
  const subtitle = landing?.about_subtitle?.trim() || defaultSubtitle;
  const description = landing?.about_description?.trim() || defaultDescription;
  const bullets = landing?.about_bullets && landing.about_bullets.length > 0 ? landing.about_bullets : defaultBullets;
  const imageUrl = landing?.about_image_url?.trim() || defaultImage;
  const badgeTitle = landing?.about_badge_title?.trim() || '';
  const badgeText = landing?.about_badge_text?.trim() || '';

  const paragraphs = description.split('\n').filter((p) => p.trim());

  return (
    <section id="about" className="py-24 bg-white overflow-hidden scroll-mt-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Image Side */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full lg:w-1/2 relative">

            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--secondary, #F5F5F3)' }}>
              <img
                src={imageUrl}
                alt="Sobre nosotros"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy" />
            </div>
            {/* Floating Badge */}
            {badgeTitle && (
              <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-xl shadow-xl max-w-[200px] hidden md:block">
                <p className="text-4xl font-serif mb-1" style={{ color: 'var(--primary, #8B9E8B)' }}>{badgeTitle}</p>
                {badgeText && (
                  <p className="text-sm" style={{ color: 'var(--text-muted, #6B6B6B)' }}>
                    {badgeText}
                  </p>
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
              <span className="font-serif italic" style={{ color: 'var(--primary, #8B9E8B)' }}>
                {subtitle}
              </span>
            </h2>

            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`text-lg leading-relaxed ${i < paragraphs.length - 1 ? 'mb-6' : 'mb-8'}`}
                style={{ color: 'var(--text-muted, #6B6B6B)' }}>
                {p}
              </p>
            ))}

            {bullets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {bullets.map((item, i) =>
                <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary, #8B9E8B)' }} />
                    <span className="font-medium" style={{ color: 'var(--text, #2D2D2D)' }}>{item}</span>
                  </div>
                )}
              </div>
            )}

            <Button variant="outline" size="lg">
              Conoce a nuestro equipo
            </Button>
          </motion.div>
        </div>
      </div>
    </section>);

}