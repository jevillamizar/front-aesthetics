import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { Star, Award, Clock, Users, type LucideIcon, Heart, Shield, Zap, ThumbsUp, TrendingUp, CheckCircle } from 'lucide-react';

type TrustIndicator = {
  icon: string;
  label: string;
  sub: string;
};

type HeroProps = {
  onBook?: () => void;
  headline?: string;
  description?: string;
  heroImageUrl?: string;
  heroImageUrls?: string[];
  trustIndicators?: TrustIndicator[];
};

const iconMap: Record<string, LucideIcon> = {
  clock: Clock,
  award: Award,
  users: Users,
  star: Star,
  heart: Heart,
  shield: Shield,
  zap: Zap,
  thumbsup: ThumbsUp,
  trending: TrendingUp,
  check: CheckCircle,
};

const defaultIndicators: TrustIndicator[] = [
  { icon: 'clock', label: '15+ Años', sub: 'Experiencia' },
  { icon: 'award', label: 'Certificados', sub: 'Especialistas' },
  { icon: 'users', label: '10k+', sub: 'Tratamientos' },
  { icon: 'star', label: '5-Star Rated', sub: 'En Google' },
];

export function Hero({ onBook, headline, description, heroImageUrl, heroImageUrls, trustIndicators }: HeroProps) {
  const images = useMemo(() => {
    const fromList = (heroImageUrls ?? []).map((url) => url.trim()).filter(Boolean);
    if (fromList.length > 0) return fromList;
    return heroImageUrl?.trim() ? [heroImageUrl.trim()] : [];
  }, [heroImageUrl, heroImageUrls]);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [images]);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveImage((current) => (current + 1) % images.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [images]);

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
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-[#E8ECE8] to-transparent opacity-40" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#8B9E8B]/5 rounded-full blur-3xl" />

      {images.length > 0 ? (
        <div className="absolute inset-0">
          {images.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className={`absolute inset-0 bg-center bg-cover transition-opacity duration-1000 ${index === activeImage ? 'opacity-100' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          ))}
          <div className="absolute inset-0 bg-[#F5F5F3]/50" />
        </div>
      ) : null}

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

            {headline ? (() => {
              const words = headline.trim().split(/\s+/);
              const main = words.slice(0, -2).join(' ');
              const styled = words.slice(-2).join(' ');
              return (
                <>
                  {main}{main ? ' ' : ''} <br />
                  <span className="italic text-[var(--primary)]">{styled}</span>
                </>
              );
            })() : (
              <>
                Revela tu <br />
                <span className="italic text-[var(--primary)]">Resplandor natural</span>
              </>
            )}
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-[#6B6B6B] mb-10 max-w-2xl mx-auto leading-relaxed">

            {description
              ? description
              : 'Experimenta el equilibrio perfecto entre la experiencia médica y la visión artística. Nos especializamos en tratamientos sutiles y transformadores que realzan tu belleza única.'}
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">

            <Button size="lg" className="w-full sm:w-auto group" onClick={onBook}>
              ¡Agenda tu cita!
              
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href="#services">Ver nuestros servicios</a>
            </Button>
          </motion.div>

          {/* Trust Indicators - Mobile: 2 cols with smaller gap, Desktop: 4 cols */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 border-t border-[#8B9E8B]/20 pt-8 md:pt-12">

            {(trustIndicators && trustIndicators.length > 0 ? trustIndicators : defaultIndicators).map((item, index) => {
              const Icon = iconMap[(item.icon || '').toLowerCase()] || Star;
              return (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center text-center p-2">
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-[#8B9E8B] mb-2 md:mb-3" />
                  <span className="block text-sm md:text-lg font-medium text-[#2D2D2D]">
                    {item.label}
                  </span>
                  <span className="text-xs md:text-sm text-[#6B6B6B]">{item.sub}</span>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
      </div>
    </section>);

}