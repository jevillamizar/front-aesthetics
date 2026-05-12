import { type ReactNode } from 'react';

interface SettingsLayoutProps {
  title: string;
  children: ReactNode;
}

export function SettingsLayout({ title, children }: SettingsLayoutProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      </div>
      {children}
    </div>
  );
}
