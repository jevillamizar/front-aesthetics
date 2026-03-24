import { useEffect, useMemo, useState } from 'react';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { About } from './components/About';
import { Testimonials } from './components/Testimonials';
import { Contact } from './components/Contact';
import { AppointmentModal } from './components/AppointmentModal';
import { Button } from './components/ui/Button';
import { Menu } from 'lucide-react';

type LandingPayload = {
  clinic: {
    id: number;
    name: string;
    slug: string;
  };
  landing: null | {
    headline: string;
    description: string;
    primary_color: string;
    logo_url: string;
    hero_image_url: string;
    whatsapp_phone: string;
    booking_url: string;
    instagram_url: string;
    facebook_url: string;
    address: string;
  };
};

export function App() {
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [landingData, setLandingData] = useState<LandingPayload | null>(null);

  const apiBase =
    (import.meta.env.VITE_API_BASE ?? '').trim() ||
    `${window.location.protocol}//${window.location.hostname}:8000`;
  const landingEndpoint = `${String(apiBase).replace(/\/$/, '')}/public/landing/`;

  useEffect(() => {
    fetch(landingEndpoint, { method: 'GET' })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as LandingPayload | null;
        if (!res.ok) return;
        if (!data) return;
        setLandingData(data);
      })
      .catch(() => {
        // ignore: fallback to defaults
      });
  }, [landingEndpoint]);

  const themeStyle = useMemo(() => {
    const primary = landingData?.landing?.primary_color?.trim() || '#8B9E8B';
    const primaryHover = '#7A8D7A';
    return {
      '--primary': primary,
      '--primary_hover': primaryHover
    } as React.CSSProperties;
  }, [landingData]);

  const brandName = landingData?.clinic?.name || 'Lumina Aesthetics';
  const logoUrl = landingData?.landing?.logo_url?.trim() || '';
  const heroHeadline = landingData?.landing?.headline?.trim() || undefined;
  const heroDescription = landingData?.landing?.description?.trim() || undefined;
  const heroImageUrl = landingData?.landing?.hero_image_url?.trim() || undefined;

  return (
    <div
      className="min-h-screen bg-[#F5F5F3] font-sans text-[#2D2D2D]"
      style={themeStyle}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F5F5F3]">
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <a href="#home" className="text-2xl font-serif italic text-[#2D2D2D]">
            {logoUrl ? (
              <span className="inline-flex items-center gap-3">
                <img src={logoUrl} alt={brandName} className="h-10 w-10 rounded-full object-cover" />
                <span className="not-italic font-sans text-base md:text-lg">{brandName}</span>
              </span>
            ) : (
              <>
                {brandName.split(' ')[0] ?? brandName}{' '}
                <span className="text-[var(--primary)]">{brandName.split(' ').slice(1).join(' ') || 'Aesthetics'}</span>
              </>
            )}
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#services"
              className="text-sm font-medium text-[#6B6B6B] hover:text-[#8B9E8B] transition-colors">

              Tratamientos
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-[#6B6B6B] hover:text-[#8B9E8B] transition-colors">

              Sobre Nosotros
            </a>
            <a
              href="#testimonials"
              className="text-sm font-medium text-[#6B6B6B] hover:text-[#8B9E8B] transition-colors">

              Reseñas
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-[#6B6B6B] hover:text-[#8B9E8B] transition-colors">

              Contacto
            </a>
            <Button size="sm" onClick={() => setAppointmentOpen(true)}>
              Reservar Cita
            </Button>
          </div>

          <button className="md:hidden p-2 text-[#2D2D2D]">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      <main>
        <Hero
          onBook={() => setAppointmentOpen(true)}
          headline={heroHeadline}
          description={heroDescription}
          heroImageUrl={heroImageUrl}
        />
        <Services />
        <About />
        <Testimonials />
        <Contact onBook={() => setAppointmentOpen(true)} />
      </main>

      <AppointmentModal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} />
    </div>
  );
}