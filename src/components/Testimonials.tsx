import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
const testimonials = [
{
  initial: 'S',
  name: 'Sarah M.',
  treatment: 'Botox & Fillers',
  rating: 5,
  quote:
  "Me preocupaba verme 'muy retocada', pero los resultados son tan naturales. Todos dicen que me veo descansada, no diferente. El equipo aquí es realmente artístico."
},
{
  initial: 'J',
  name: 'Jennifer L.',
  treatment: 'HydraFacial',
  rating: 5,
  quote:
  'La hora más relajante de mi mes. Mi piel nunca se había visto mejor. La clínica está impecable y el personal te hace sentir como de la realeza.'
},
{
  initial: 'E',
  name: 'Emily R.',
  treatment: 'CoolSculpting',
  rating: 5,
  quote:
  'Profesionales, con conocimiento y muy atentos. Me guiaron en cada paso del proceso y los resultados superaron mis expectativas.'
}];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-[#F5F5F3] scroll-mt-24">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          whileInView={{
            opacity: 1,
            y: 0
          }}
          viewport={{
            once: true
          }}
          className="text-center mb-16">

          <h2 className="text-3xl md:text-4xl font-light text-[#2D2D2D] mb-4">
            Historias de pacientes
          </h2>
          <p className="text-[#6B6B6B]">
            Testados por más de 10,000 pacientes felices
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) =>
          <motion.div
            key={i}
            initial={{
              opacity: 0,
              y: 20
            }}
            whileInView={{
              opacity: 1,
              y: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              delay: i * 0.1
            }}
            whileHover={{
              y: -5
            }}
            className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-default">

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#8B9E8B]/10 flex items-center justify-center text-[#8B9E8B] font-serif font-medium text-xl">
                  {t.initial}
                </div>
                <div>
                  <h4 className="font-medium text-[#2D2D2D]">{t.name}</h4>
                  <p className="text-xs text-[#8B9E8B] uppercase tracking-wide">
                    {t.treatment}
                  </p>
                </div>
              </div>

              <div className="flex gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) =>
              <Star
                key={i}
                className="w-4 h-4 fill-[#8B9E8B] text-[#8B9E8B]" />

              )}
              </div>

              <div className="relative">
                <Quote className="absolute -top-2 -left-2 w-8 h-8 text-[#8B9E8B]/10 rotate-180" />
                <p className="text-[#6B6B6B] leading-relaxed relative z-10 pl-4">
                  "{t.quote}"
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>);

}