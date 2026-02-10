import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { Star, Award, Clock, Users, ArrowRight } from 'lucide-react';

type HeroProps = {
  onBook?: () => void;
};

export function Hero({ onBook }: HeroProps) {
  const containerVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut'
      }
    }
  };
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-[#F5F5F3] pt-20 pb-16 scroll-mt-24">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#E8ECE8] to-transparent opacity-60" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#8B9E8B]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible">

          <motion.div
            variants={itemVariants}
            className="mb-6 inline-flex items-center rounded-full border border-[#8B9E8B]/30 bg-white/50 px-3 py-1 text-sm text-[#6B6B6B] backdrop-blur-sm">

            <span className="flex h-2 w-2 rounded-full bg-[#8B9E8B] mr-2"></span>
            Aceptamos nuevos pacientes para el próximo mes
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-light tracking-tight text-[#2D2D2D] mb-6 leading-[1.1]">

            Revela tu <br />
            <span className="font-serif italic text-[#8B9E8B]">
              Resplandor natural
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-[#6B6B6B] mb-10 max-w-2xl mx-auto leading-relaxed">

            Experimenta el equilibrio perfecto entre la experiencia médica y la visión artística. Nos especializamos en tratamientos sutiles y transformadores que realzan tu belleza única.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">

            <Button size="lg" className="w-full sm:w-auto group" onClick={onBook}>
              Reserva tu consulta
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href="#services">Ver nuestros servicios</a>
            </Button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-[#8B9E8B]/20 pt-12">

            {[
            {
              icon: Clock,
              label: '15+ Años',
              sub: 'Experiencia'
            },
            {
              icon: Award,
              label: 'Certificados',
              sub: 'Especialistas'
            },
            {
              icon: Users,
              label: '10k+',
              sub: 'Tratamientos'
            },
            {
              icon: Star,
              label: '5-Star Rated',
              sub: 'En Google'
            }].
            map((item, index) =>
            <div
              key={index}
              className="flex flex-col items-center justify-center text-center">

                <item.icon className="h-6 w-6 text-[#8B9E8B] mb-3" />
                <span className="block text-lg font-medium text-[#2D2D2D]">
                  {item.label}
                </span>
                <span className="text-sm text-[#6B6B6B]">{item.sub}</span>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>);

}