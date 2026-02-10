import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
export function About() {
  return (
    <section id="about" className="py-24 bg-white overflow-hidden scroll-mt-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Image Side */}
          <motion.div
            initial={{
              opacity: 0,
              x: -50
            }}
            whileInView={{
              opacity: 1,
              x: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              duration: 0.8
            }}
            className="w-full lg:w-1/2 relative">

            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-[#F5F5F3]">
              {/* Abstract placeholder for doctor/clinic image */}
              <img
                src="/images/portrait-dermatologist-standing-with-hands-pockets.jpg"
                alt="Interior de la clínica / Retrato del doctor"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#8B9E8B]/20 to-[#F5F5F3] hidden" />
              <div className="absolute inset-0 flex items-center justify-center text-[#8B9E8B]/30 hidden">
                <span className="text-lg tracking-widest uppercase">
                  [Clinic Interior / Doctor Portrait]
                </span>
              </div>
            </div>
            {/* Floating Badge */}
            <div className="absolute -bottom-8 -right-8 bg-white p-6 rounded-xl shadow-xl max-w-[200px] hidden md:block">
              <p className="text-4xl font-serif text-[#8B9E8B] mb-1">Top 1%</p>
              <p className="text-sm text-[#6B6B6B]">
                Injector in the region for 3 consecutive years
              </p>
            </div>
          </motion.div>

          {/* Content Side */}
          <motion.div
            initial={{
              opacity: 0,
              x: 50
            }}
            whileInView={{
              opacity: 1,
              x: 0
            }}
            viewport={{
              once: true
            }}
            transition={{
              duration: 0.8
            }}
            className="w-full lg:w-1/2">

            <h2 className="text-3xl md:text-4xl font-light text-[#2D2D2D] mb-6">
              Belleza respaldada por la ciencia, <br />
              <span className="text-[#8B9E8B] font-serif italic">
                Entregado con arte
              </span>
            </h2>

            <p className="text-[#6B6B6B] text-lg mb-6 leading-relaxed">
              Fundada por la Dra. Elena Ross, nuestra clínica une la precisión
              médica con el arte estético. Creemos que los mejores resultados
              son los que nadie nota: simplemente una versión más fresca y
              confiada de ti.
            </p>

            <p className="text-[#6B6B6B] mb-8 leading-relaxed">
              Nuestra filosofía se basa en la educación y la transparencia. Tomamos
              el tiempo necesario para entender tu anatomía y tus objetivos, creando un
              plan de tratamiento personalizado que respeta tus características naturales.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {[
              'Dermatólogos certificados por el consejo',
              'Tratamientos aprobados por la FDA',
              'Protocolos de seguridad avanzados',
              'Cuidado personalizado después del tratamiento'].
              map((item, i) =>
              <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#8B9E8B] flex-shrink-0" />
                  <span className="text-[#2D2D2D] font-medium">{item}</span>
                </div>
              )}
            </div>

            <Button variant="outline" size="lg">
              Conoce a nuestro equipo
            </Button>
          </motion.div>
        </div>
      </div>
    </section>);

}