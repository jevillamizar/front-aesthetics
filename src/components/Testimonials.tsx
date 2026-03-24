import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

type TestimonialItem = {
  name: string;
  treatment: string;
  rating: number;
  quote: string;
};

type TestimonialsProps = {
  testimonials?: TestimonialItem[];
};

const defaultTestimonials: TestimonialItem[] = [
  {
    name: 'Sarah M.',
    treatment: 'Botox & Fillers',
    rating: 5,
    quote: "Me preocupaba verme 'muy retocada', pero los resultados son tan naturales. Todos dicen que me veo descansada, no diferente.",
  },
  {
    name: 'Jennifer L.',
    treatment: 'HydraFacial',
    rating: 5,
    quote: 'La hora más relajante de mi mes. Mi piel nunca se había visto mejor. La clínica está impecable y el personal te hace sentir como de la realeza.',
  },
  {
    name: 'Emily R.',
    treatment: 'CoolSculpting',
    rating: 5,
    quote: 'Profesionales, con conocimiento y muy atentos. Me guiaron en cada paso del proceso y los resultados superaron mis expectativas.',
  },
];

export function Testimonials({ testimonials }: TestimonialsProps) {
  const items = testimonials && testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <section id="testimonials" className="py-24 scroll-mt-24" style={{ backgroundColor: 'var(--secondary, #F5F5F3)' }}>
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16">

          <h2 className="text-3xl md:text-4xl font-light mb-4" style={{ color: 'var(--text, #2D2D2D)' }}>
            Historias de pacientes
          </h2>
          <p style={{ color: 'var(--text-muted, #6B6B6B)' }}>
            Testados por más de 10,000 pacientes felices
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((t, i) =>
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5 }}
            className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-default">

              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-serif font-medium text-xl"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--primary, #8B9E8B) 10%, transparent)', color: 'var(--primary, #8B9E8B)' }}>
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-medium" style={{ color: 'var(--text, #2D2D2D)' }}>{t.name}</h4>
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--primary, #8B9E8B)' }}>
                    {t.treatment}
                  </p>
                </div>
              </div>

              <div className="flex gap-1 mb-4">
                {[...Array(Math.min(t.rating || 0, 5))].map((_, j) =>
              <Star
                key={j}
                className="w-4 h-4"
                style={{ fill: 'var(--primary, #8B9E8B)', color: 'var(--primary, #8B9E8B)' }} />
              )}
              </div>

              <div className="relative">
                <Quote className="absolute -top-2 -left-2 w-8 h-8 rotate-180" style={{ color: 'color-mix(in srgb, var(--primary, #8B9E8B) 10%, transparent)' }} />
                <p className="leading-relaxed relative z-10 pl-4" style={{ color: 'var(--text-muted, #6B6B6B)' }}>
                  "{t.quote}"
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>);

}