import { useState } from 'react';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { About } from './components/About';
import { Testimonials } from './components/Testimonials';
import { Contact } from './components/Contact';
import { AppointmentModal } from './components/AppointmentModal';
import { Button } from './components/ui/Button';
import { Menu } from 'lucide-react';
export function App() {
  const [appointmentOpen, setAppointmentOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F5F3] font-sans text-[#2D2D2D]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#F5F5F3]">
        <div className="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
          <a href="#home" className="text-2xl font-serif italic text-[#2D2D2D]">
            Lumina <span className="text-[#8B9E8B]">Aesthetics</span>
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
        <Hero onBook={() => setAppointmentOpen(true)} />
        <Services />
        <About />
        <Testimonials />
        <Contact onBook={() => setAppointmentOpen(true)} />
      </main>

      <AppointmentModal open={appointmentOpen} onClose={() => setAppointmentOpen(false)} />
    </div>
  );
}