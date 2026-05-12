import { useEffect, useMemo, useRef, useState  } from 'react';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { About } from './components/About';
import { Testimonials } from './components/Testimonials';
import { Contact } from './components/Contact';
import { AppointmentModal } from './components/AppointmentModal';
import { Button } from './components/ui/Button';
import { Menu, X } from 'lucide-react';

type TrustIndicator = { icon: string; label: string; sub: string };
type TestimonialItem = { name: string; treatment: string; rating: number; quote: string; social_url?: string };

type LandingPayload = {
  clinic: {
    id: number;
    name: string;
    slug: string;
    logo_url: string;
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
    show_name: boolean;
    show_logo: boolean;
    hero_image_url: string;
    hero_image_urls: string[];
    trust_indicators: TrustIndicator[];
    testimonials: TestimonialItem[];
    about_title: string;
    about_subtitle: string;
    about_description: string;
    about_bullets: string[];
    about_image_url: string;
    about_image_urls: string[];
    about_badge_title: string;
    about_badge_text: string;
    phone: string;
    email: string;
    whatsapp_phone: string;
    booking_url: string;
    instagram_url: string;
    facebook_url: string;
    address: string;
  };
};

const NAV_LINKS = [
  { href: '#services', label: 'Procedimientos' },
  { href: '#about',    label: 'Sobre Nosotros' },
  { href: '#testimonials', label: 'Reseñas' },
  { href: '#contact',  label: 'Contacto' },
];

export function App() {
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [landingData, setLandingData] = useState<LandingPayload | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: Event) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [menuOpen]);
 
  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const apiBase =
    (import.meta.env.VITE_API_BASE ?? '').trim() ||
    window.location.origin;
  const landingEndpoint = `${String(apiBase).replace(/\/$/, '')}/public/landing/`;

  useEffect(() => {
    fetch(landingEndpoint, { method: 'GET' })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as LandingPayload | null;
        console.log('Landing data received:', data);
        if (!res.ok) return;
        if (!data) return;
        setLandingData(data);
      })
      .catch((err) => {
        console.error('Landing fetch error:', err);
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
  const logoUrl = landingData?.clinic?.logo_url?.trim() || '';

  // Logo display settings from landing page config
  const showName = landingData?.landing?.show_name ?? true;
  const showLogo = landingData?.landing?.show_logo ?? true;
  const heroHeadline = landingData?.landing?.headline?.trim() || undefined;
  const heroDescription = landingData?.landing?.description?.trim() || undefined;
  const heroImageUrl = landingData?.landing?.hero_image_url?.trim() || undefined;
  const instagramUrl = landingData?.landing?.instagram_url?.trim() || '';
  const facebookUrl  = landingData?.landing?.facebook_url?.trim()  || '';
  const whatsappPhone = landingData?.landing?.whatsapp_phone?.trim() || '';

  const heroImageUrls = (
    landingData?.landing?.hero_image_urls?.length
      ? landingData.landing.hero_image_urls
      : (landingData?.landing?.hero_image_url || '').split(/[\n,]+/)
  ).map((u) => u.trim()).filter(Boolean);
  const trustIndicators = landingData?.landing?.trust_indicators;

  function handleNavClick(href: string) {
    setMenuOpen(false);
    // Small delay so the menu closes before scroll
    setTimeout(() => {
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  }

  return (
    <div
      className="min-h-screen"
      style={{ ...themeStyle, backgroundColor: 'var(--background)', color: 'var(--text)', fontFamily: fontBody ? `'${fontBody}', sans-serif` : undefined }}
      >
      {/* Navigation */}
      <nav ref={menuRef} className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F5F5F3]">
        {/* Desktop & tablet bar */}
        <div className="container mx-auto px-4 lg:px-6 h-20 hidden lg:flex items-center justify-between">
          <a href="#home" className="inline-flex items-center gap-3 shrink-0">
            {showLogo && logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-12 max-h-12 w-auto object-contain rounded-xl" />
            ) : null}
            {showName ? (
              <span className="text-base lg:text-lg font-medium" style={{ color: 'var(--text)' }}>{brandName}</span>
            ) : null}
            {!showLogo && !showName ? (
              <span className="text-2xl italic" style={{ color: 'var(--text)', fontFamily: "var(--font-heading, 'Playfair Display', serif)" }}>
                {brandName}
              </span>
            ) : null}
          </a>

          <div className="flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="nav-link text-sm font-medium transition-colors">
                {link.label}
              </a>
            ))}
            <Button size="sm" onClick={() => setAppointmentOpen(true)}>Agendar valoración</Button>
          </div>
        </div>

        {/* Mobile bar */}
        <div className="lg:hidden flex items-center justify-between px-4 h-24">
          {/* Hamburger — left */}
          <button
            className="p-2 rounded-lg transition-colors hover:bg-black/5 shrink-0"
            style={{ color: 'var(--text)' }}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Brand — center */}
          <a href="#home" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            {showLogo && logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-14 max-h-14 w-auto object-contain rounded-xl" />
            ) : null}
            {(showName || (!showLogo && !showName)) ? (
              <span
                className="text-base font-semibold text-center leading-tight"
                style={{ color: 'var(--text)', maxWidth: '160px' }}
              >
                {brandName}
              </span>
            ) : null}
          </a>

          {/* Spacer — right (balances hamburger) */}
          <div className="w-10 shrink-0" />
        </div>

        {/* Mobile dropdown */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            menuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          }`}
          aria-hidden={!menuOpen}
        >
          <div className="bg-white/95 backdrop-blur-md border-t border-black/5 px-4 py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); handleNavClick(link.href); }}
                className="nav-link text-sm font-medium px-3 py-3 rounded-lg transition-colors hover:bg-black/5"
                style={{
                  transitionDelay: menuOpen ? `${i * 40}ms` : '0ms',
                  opacity: menuOpen ? 1 : 0,
                  transform: menuOpen ? 'translateX(0)' : 'translateX(-8px)',
                  transition: 'opacity 0.25s ease, transform 0.25s ease',
                }}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-2 border-t border-black/5 mt-1">
              <Button
                size="sm"
                className="w-full justify-center"
                onClick={() => { setMenuOpen(false); setAppointmentOpen(true); }}
              >
                Agendar valoración
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        <Hero
          onBook={() => setAppointmentOpen(true)}
          headline={heroHeadline}
          description={heroDescription}
          heroImageUrl={heroImageUrl}
          heroImageUrls={heroImageUrls}
          trustIndicators={trustIndicators}
          instagramUrl={instagramUrl}
          facebookUrl={facebookUrl}
          whatsappPhone={whatsappPhone}
        />
        <Services />
        <About landing={landingData?.landing ?? undefined} />
        <Testimonials testimonials={landingData?.landing?.testimonials} />
        <Contact
          onBook={() => setAppointmentOpen(true)}
          brandName={brandName}
          landing={landingData?.landing ?? undefined}
        />
      </main>

      <AppointmentModal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} />
    </div>
  );
}