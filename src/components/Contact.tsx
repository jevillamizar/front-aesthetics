import {
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  MessageCircle } from
'lucide-react';
import { Button } from './ui/Button';

type LandingInfo = {
  phone?: string;
  email?: string;
  whatsapp_phone?: string;
  instagram_url?: string;
  facebook_url?: string;
  address?: string;
};

type ContactProps = {
  onBook?: () => void;
  brandName?: string;
  landing?: LandingInfo;
};

export function Contact({ onBook, brandName = 'Lumina Aesthetics', landing }: ContactProps) {
  const address = landing?.address?.trim() || '';
  const phone = landing?.phone?.trim() || '';
  const email = landing?.email?.trim() || '';
  const whatsapp = landing?.whatsapp_phone?.trim() || '';
  const instagramUrl = landing?.instagram_url?.trim() || '';
  const facebookUrl = landing?.facebook_url?.trim() || '';

  const socialLinks = [
    instagramUrl ? { icon: Instagram, href: instagramUrl } : null,
    facebookUrl ? { icon: Facebook, href: facebookUrl } : null,
    whatsapp ? { icon: MessageCircle, href: `https://wa.me/${whatsapp.replace(/\D/g, '')}` } : null,
  ].filter(Boolean) as Array<{ icon: typeof Instagram; href: string }>;

  return (
    <footer id="contact" className="text-white pt-20 pb-10 scroll-mt-24" style={{ backgroundColor: 'color-mix(in srgb, var(--text, #2D2D2D) 95%, black)' }}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div>
            <h3 className="text-2xl font-serif italic mb-6">
              {brandName}
            </h3>
            <p className="text-gray-400 mb-6 leading-relaxed">
              Redefiniendo la estética médica con un enfoque en resultados naturales y la seguridad del paciente.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
                    style={{ ['--tw-bg-opacity' as string]: undefined }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary, #8B9E8B)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}>
                    <link.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-medium mb-6">Contacto</h4>
            <ul className="space-y-4 text-gray-400">
              {address && (
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: 'var(--primary, #8B9E8B)' }} />
                  <span>{address}</span>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary, #8B9E8B)' }} />
                  <a href={`tel:${phone}`} className="hover:text-white transition-colors">{phone}</a>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--primary, #8B9E8B)' }} />
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors">{email}</a>
                </li>
              )}
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
              className="w-full">
              Reservar Cita
            </Button>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} {brandName}. All rights reserved.</p>
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