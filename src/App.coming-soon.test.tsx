import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Suprimir console.log/error del fetch en App.tsx
beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Mock de módulos que App importa y que no necesitan render real en este test
vi.mock('./components/Hero', () => ({
  Hero: () => <section data-testid="hero-section">Hero</section>,
}));
vi.mock('./components/Services', () => ({
  Services: () => <section data-testid="services-section">Services</section>,
}));
vi.mock('./components/About', () => ({
  About: () => <section data-testid="about-section">About</section>,
}));
vi.mock('./components/Testimonials', () => ({
  Testimonials: () => <section data-testid="testimonials-section">Testimonials</section>,
}));
vi.mock('./components/Contact', () => ({
  Contact: () => <footer data-testid="contact-section">Contact</footer>,
}));
vi.mock('./components/AppointmentModal', () => ({
  AppointmentModal: () => null,
}));

import { App } from './App';

const FULL_PAYLOAD = {
  clinic: { id: 1, name: 'Aurora Clínica', slug: 'aurora', logo_url: '' },
  landing: {
    headline: 'Tu mejor versión',
    description: '',
    primary_color: '#8B9E8B', secondary_color: '', accent_color: '',
    background_color: '', text_color: '',
    font_heading: '', font_body: '', font_accent: '',
    show_name: true, show_logo: true,
    hero_image_url: '', hero_image_urls: [],
    trust_indicators: [], testimonials: [],
    about_title: '', about_subtitle: '', about_description: '',
    about_bullets: [], about_image_url: '', about_image_urls: [],
    about_badge_title: '', about_badge_text: '',
    phone: '', email: '', whatsapp_phone: '',
    booking_url: '', instagram_url: '', facebook_url: '', address: '',
  },
};

describe('App — condicional ComingSoon', () => {
  it('T2-01: renderiza ComingSoon cuando la API responde 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ detail: 'Landing not published' }),
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('coming-soon-heading')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('hero-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('T2-02: no renderiza nada sustancial mientras espera la API (sin flash)', () => {
    // fetch que nunca resuelve — simula carga en curso
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));

    render(<App />);

    expect(screen.queryByTestId('coming-soon-heading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('hero-section')).not.toBeInTheDocument();
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
  });

  it('T2-03: renderiza la landing normal cuando la API responde 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => FULL_PAYLOAD,
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('coming-soon-heading')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
