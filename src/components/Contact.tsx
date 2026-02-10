import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter } from
'lucide-react';
import { Button } from './ui/Button';

type ContactProps = {
  onBook?: () => void;
};

export function Contact({ onBook }: ContactProps) {
  return (
    <footer id="contact" className="bg-[#2D2D2D] text-white pt-20 pb-10 scroll-mt-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div>
            <h3 className="text-2xl font-serif italic mb-6">
              Lumina Aesthetics
            </h3> 
            <p className="text-gray-400 mb-6 leading-relaxed">
              Redefiniendo la estética médica con un enfoque en resultados naturales y la seguridad del paciente.
            </p>
            <div className="flex gap-4">
              {[Instagram, Facebook, Twitter].map((Icon, i) =>
              <a
                key={i}
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#8B9E8B] transition-colors">

                  <Icon className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-medium mb-6">Contacto</h4>
            <ul className="space-y-4 text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#8B9E8B] flex-shrink-0 mt-1" />
                <span>
                  123 Wellness Blvd, Suite 400
                  <br />
                  Beverly Hills, CA 90210
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#8B9E8B] flex-shrink-0" />
                <span>(555) 123-4567</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#8B9E8B] flex-shrink-0" />
                <span>hello@luminaaesthetics.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-lg font-medium mb-6">Horarios de Atención</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="flex justify-between">
                <span>Lunes - Viernes</span>
                <span>9:00 AM - 6:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Sábado</span>
                <span>10:00 AM - 4:00 PM</span>
              </li>
              <li className="flex justify-between">
                <span>Domingo</span>
                <span>Cerrado</span>
              </li>
            </ul>
          </div>

          {/* CTA Column */}
          <div>
            <h4 className="text-lg font-medium mb-6">¿Listo para Brillar?</h4>
            <p className="text-gray-400 mb-6">
              Agenda tu consulta gratuita hoy y comienza tu viaje.
            </p>
            <Button
              onClick={onBook}
              className="w-full bg-[#8B9E8B] hover:bg-[#7A8D7A] text-white border-none">
              Reservar Cita
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; 2024 Lumina Aesthetics. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Política de Privacidad
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Términos de Servicio
            </a>
          </div>
        </div>
      </div>
    </footer>);

}