export type ComingSoonProps = {
  clinicName?: string;
  logoUrl?: string;
};

export function ComingSoon({ clinicName, logoUrl }: ComingSoonProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F3] px-6">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center">
        {logoUrl ? (
          <img
            data-testid="coming-soon-logo"
            src={logoUrl}
            alt={clinicName ?? 'Logo'}
            className="h-20 w-auto object-contain rounded-2xl"
          />
        ) : null}

        {clinicName ? (
          <p
            data-testid="coming-soon-clinic-name"
            className="text-base font-medium tracking-wide text-[#2D2D2D]"
          >
            {clinicName}
          </p>
        ) : null}

        <h1
          data-testid="coming-soon-heading"
          className="text-4xl font-serif italic text-[#2D2D2D]"
        >
          Próximamente
        </h1>

        <p
          data-testid="coming-soon-subtext"
          className="text-sm text-[#2D2D2D]/60 leading-relaxed"
        >
          Estamos preparando algo especial. Vuelve pronto o contáctanos directamente.
        </p>
      </div>
    </div>
  );
}
