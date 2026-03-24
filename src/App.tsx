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
    secondary_color: string;
    accent_color: string;
    background_color: string;
    text_color: string;
    font_heading: string;
    font_body: string;
    font_accent: string;
    logo_url: string;
    hero_image_url: string;
    trust_indicators: Array<{ icon: string; label: string; sub: string }>;
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

  const fontHeading = landingData?.landing?.font_heading?.trim() || '';
  const fontBody = landingData?.landing?.font_body?.trim() || '';
  const fontAccent = landingData?.landing?.font_accent?.trim() || '';

  useEffect(() => {
    const families = [fontHeading, fontBody, fontAccent].filter(Boolean);
    if (families.length === 0) return;

    const id = 'dynamic-google-fonts';
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const params = families.map((f) => `family=${f.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600`).join('&');
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${params}&display=swap`;
    document.head.appendChild(link);

    return () => { link.remove(); };
  }, [fontHeading, fontBody, fontAccent]);

  const themeStyle = useMemo(() => {
    const l = landingData?.landing;
    const primary = l?.primary_color?.trim() || '#8B9E8B';
    const secondary = l?.secondary_color?.trim() || '#F5F5F3';
    const accent = l?.accent_color?.trim() || '#D4A574';
    const bg = l?.background_color?.trim() || '#F5F5F3';
    const text = l?.text_color?.trim() || '#2D2D2D';
    return {
      '--primary': primary,
      '--primary-hover': `color-mix(in srgb, ${primary} 85%, black)`,
      '--secondary': secondary,
      '--accent': accent,
      '--background': bg,
      '--text': text,
      '--text-muted': `color-mix(in srgb, ${text} 55%, ${bg})`,
      '--font-heading': fontHeading ? `'${fontHeading}', serif` : undefined,
      '--font-body': fontBody ? `'${fontBody}', sans-serif` : undefined,
      '--font-accent': fontAccent ? `'${fontAccent}', serif` : undefined,
    } as React.CSSProperties;
  }, [landingData, fontHeading, fontBody, fontAccent]);

  const brandName = landingData?.clinic?.name || 'Lumina Aesthetics';
  const logoUrl = landingData?.landing?.logo_url?.trim() || '';
  const heroHeadline = landingData?.landing?.headline?.trim() || undefined;
  const heroDescription = landingData?.landing?.description?.trim() || undefined;
  const heroImageUrl = landingData?.landing?.hero_image_url?.trim() || undefined;
  const trustIndicators = landingData?.landing?.trust_indicators;

  return (
    <div
      className="min-h-screen"
      style={{ ...themeStyle, backgroundColor: 'var(--background)', color: 'var(--text)', fontFamily: fontBody ? `'${fontBody}', sans-serif` : undefined }}
      >
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F5F5F3]">
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <a href="#home" className="inline-flex items-center gap-3 shrink-0">
            {logoUrl ? (
              <>
                <img src={logoUrl} alt={brandName} className="h-12 max-h-12 w-auto object-contain rounded-xl" />
                <span className="text-base md:text-lg font-medium hidden sm:inline" style={{ color: 'var(--text)' }}>{brandName}</span>
              </>
            ) : (
              <span className="text-2xl font-serif italic" style={{ color: 'var(--text)' }}>
                {brandName.split(' ')[0] ?? brandName}{' '}
                <span className="text-[var(--primary)]">{brandName.split(' ').slice(1).join(' ') || 'Aesthetics'}</span>
              </span>
            )}
          </a>

          <div className="hidden md:flex items-center gap-8">
            <a
              href="#services"
              className="nav-link text-sm font-medium transition-colors">

              Tratamientos
            </a>
            <a
              href="#about"
              className="nav-link text-sm font-medium transition-colors">

              Sobre Nosotros
            </a>
            <a
              href="#testimonials"
              className="nav-link text-sm font-medium transition-colors">

              Reseñas
            </a>
            <a
              href="#contact"
              className="nav-link text-sm font-medium transition-colors">

              Contacto
            </a>
            <Button size="sm" onClick={() => setAppointmentOpen(true)}>
              Reservar Cita
            </Button>
          </div>

          <button className="md:hidden p-2" style={{ color: 'var(--text)' }}>
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
          trustIndicators={trustIndicators}
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