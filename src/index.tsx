import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { App } from './App';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { DashboardHome } from './pages/admin/DashboardHome';
import { LandingEditor } from './pages/admin/LandingEditor';
import { PlaceholderPage } from './pages/admin/PlaceholderPage';
import { TreatmentsAdmin } from './pages/admin/TreatmentsAdmin';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<App />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* Admin dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="landing" element={<LandingEditor />} />
            <Route path="treatments" element={<TreatmentsAdmin />} />
            <Route path="appointments" element={<PlaceholderPage title="Citas" description="Administra las citas y la agenda." />} />
            <Route path="patients" element={<PlaceholderPage title="Pacientes" description="Gestiona la información de tus pacientes." />} />
            <Route path="settings" element={<PlaceholderPage title="Configuración" description="Ajustes generales de tu clínica." />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);