import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Syringe, User, Sun } from 'lucide-react';
import { cn } from '../lib/utils';
const services = [
{
  id: 'facial',
  label: 'Tratamientos Faciales',
  icon: Sparkles,
  items: [
  {
    name: 'HydraFacial Élite',
    price: '$199 - $299',
    desc: 'Limpieza profunda, extracción e hidratación con sueros potentes ricos en antioxidantes.'
  },
  {
    name: 'Quemadores de Piel',
    price: '$150 - $350',
    desc: 'Exfoliación avanzada para mejorar la textura, el tono y la claridad de la piel para un brillo radiante.'
  },
  {
    name: 'Microneedling',
    price: '$350 - $500',
    desc: 'Terapia de inducción de colágeno para reducir líneas finas, cicatrices de acné y el tamaño de los poros.'
  }]

},
{
  id: 'injectables',
  label: 'Inyectables',
  icon: Syringe,
  items: [
  {
    name: 'Botox & Dysport',
    price: '$12 - $14 / unit',
    desc: 'Relaja los músculos faciales para suavizar arrugas y prevenir la formación de líneas finas.'
  },
  {
    name: 'Dermal Fillers',
    price: '$650 - $850',
    desc: 'Restaura volumen y define contornos en pómulos, labios y mandíbula para un perfil juvenil.'
  },
  {
    name: 'Kybella',
    price: '$600 / vial',
    desc: 'Tratamiento no quirúrgico para destruir células grasas bajo el mentón y lograr un perfil definido.'
  }]

},
{
  id: 'body',
  label: 'Contorno Corporal',
  icon: User,
  items: [
  {
    name: 'CoolSculpting',
    price: 'Consultation Required',
    desc: 'Elimina las células grasas rebeldes con congelación, sin tiempo de recuperación y con resultados duraderos.'
  },
  {
    name: 'EmSculpt NEO',
    price: '$850 / session',
    desc: 'Construye músculo y quema grasa simultáneamente mediante energía electromagnética.'
  },
  {
    name: 'Laser Hair Removal',
    price: '$100 - $500',
    desc: 'Reducción permanente del vello para una piel suave en todas las zonas del cuerpo.'
  }]

},
{
  id: 'skin',
  label: 'Rejuvenecimiento Cutáneo',
  icon: Sun,
  items: [
  {
    name: 'IPL Photofacial',
    price: '$300 - $450',
    desc: 'Trata el daño solar, la rosácea y la hiperpigmentación con luz pulsada intensa.'
  },
  {
    name: 'Laser Resurfacing',
    price: '$800 - $1,500',
    desc: 'Renovación profunda de la piel para tratar arrugas marcadas, cicatrices y textura irregular.'
  },
  {
    name: 'PRP Therapy',
    price: '$500 - $700',
    desc: 'Utiliza tus propias plaquetas para estimular el colágeno y rejuvenecer la piel de forma natural.'
  }]

}];

export function Services() {
  const [activeTab, setActiveTab] = useState(services[0].id);
  return (
    <section className="py-24 bg-white" id="services">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-light text-[#2D2D2D] mb-4">
            Tratamientos Diseñados para Ti
          </h2>
          <p className="text-[#6B6B6B] max-w-2xl mx-auto">
            Nuestro menú completo de servicios está diseñado para abordar tus
            preocupaciones únicas con precisión y cuidado.
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {services.map((service) =>
          <button
            key={service.id}
            onClick={() => setActiveTab(service.id)}
            className={cn(
              'relative px-6 py-3 rounded-full text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#8B9E8B]',
              activeTab === service.id ?
              'text-white' :
              'text-[#6B6B6B] hover:text-[#2D2D2D]'
            )}>

              {activeTab === service.id &&
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
                <service.icon className="w-4 h-4" />
                {service.label}
              </span>
            </button>
          )}
        </div>

        {/* Services Grid */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
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

              {services.
              find((s) => s.id === activeTab)?.
              items.map((item, index) =>
              <motion.div
                key={item.name}
                initial={{
                  opacity: 0,
                  y: 20
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay: index * 0.1
                }}
                className="group p-8 rounded-2xl bg-[#F5F5F3] hover:bg-white border border-transparent hover:border-[#8B9E8B]/20 transition-all duration-300 hover:shadow-lg hover:shadow-[#8B9E8B]/5">

                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-medium text-[#2D2D2D]">
                        {item.name}
                      </h3>
                    </div>
                    <p className="text-[#6B6B6B] text-sm leading-relaxed mb-6 min-h-[60px]">
                      {item.desc}
                    </p>
                    <div className="pt-4 border-t border-[#8B9E8B]/10 flex justify-between items-center">
                      <span className="text-sm font-medium text-[#8B9E8B]">
                        {item.price}
                      </span>
                      <span className="text-xs text-[#6B6B6B] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        Learn More
                      </span>
                    </div>
                  </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>);

}