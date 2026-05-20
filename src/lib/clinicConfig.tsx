import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from './api';

type ClinicConfig = {
  enable_medical_history: boolean;
  enable_consent: boolean;
};

type ClinicConfigContextValue = {
  config: ClinicConfig | null;
  loading: boolean;
  refresh: () => void;
};

const DEFAULTS: ClinicConfig = { enable_medical_history: true, enable_consent: true };

const ClinicConfigContext = createContext<ClinicConfigContextValue>({
  config: null,
  loading: true,
  refresh: () => {},
});

export function ClinicConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ClinicConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/api/clinic/')
      .then(r => r.json())
      .then(d => setConfig({
        enable_medical_history: d.clinic?.enable_medical_history ?? true,
        enable_consent:         d.clinic?.enable_consent         ?? true,
      }))
      .catch(() => setConfig(DEFAULTS))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <ClinicConfigContext.Provider value={{ config, loading, refresh: load }}>
      {children}
    </ClinicConfigContext.Provider>
  );
}

export function useClinicConfig(): ClinicConfigContextValue {
  return useContext(ClinicConfigContext);
}
