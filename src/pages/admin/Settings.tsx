import { useState } from 'react';
import { Palette, Building2, Bell } from 'lucide-react';
import { LandingEditor } from './LandingEditor';

type Tab = 'landing' | 'clinic' | 'notifications';

const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: 'landing', label: 'Landing Page', icon: Palette },
  { id: 'clinic', label: 'Datos de la Clínica', icon: Building2 },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('landing');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Administra la configuración de tu clínica</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'landing' && <LandingEditor />}
        {activeTab === 'clinic' && <ClinicSettings />}
        {activeTab === 'notifications' && <NotificationSettings />}
      </div>
    </div>
  );
}

function ClinicSettings() {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Información de la Clínica</h2>
        <p className="text-gray-500 text-sm">Módulo en construcción…</p>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Configuración de Notificaciones</h2>
        <p className="text-gray-500 text-sm">Módulo en construcción…</p>
      </div>
    </div>
  );
}
