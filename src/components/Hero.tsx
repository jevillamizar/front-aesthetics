import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { Star, Award, Clock, Users, type LucideIcon, Heart, Shield, Zap, ThumbsUp, TrendingUp, CheckCircle, Instagram, Facebook } from 'lucide-react';

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
  instagramUrl?: string;
  facebookUrl?: string;
  whatsappPhone?: string;
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

export function Hero({ onBook, headline, description, heroImageUrl, heroImageUrls, trustIndicators, instagramUrl, facebookUrl, whatsappPhone }: HeroProps) {
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

          <motion.div variants={itemVariants} className="flex flex-col items-center gap-4 mb-16">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <Button size="lg" className="w-full sm:w-auto group" onClick={onBook}>
                ¡Agenda tu cita!
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <a href="#services">Ver nuestros servicios</a>
              </Button>
            </div>

            {/* Redes sociales — solo en móvil */}
            {(instagramUrl || facebookUrl || whatsappPhone) && (
              <div className="flex sm:hidden items-center justify-center gap-4 pt-1">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-[#8B9E8B]/40 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors"
                    style={{ color: 'var(--primary)' }}
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Instagram</span>
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-[#8B9E8B]/40 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors"
                    style={{ color: 'var(--primary)' }}
                  >
                    <Facebook className="w-4 h-4" />
                    <span>Facebook</span>
                  </a>
                )}
                {whatsappPhone && (
                  <a
                    href={`https://wa.me/${whatsappPhone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full border border-[#8B9E8B]/40 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-colors"
                    style={{ color: 'var(--primary)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            )}
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