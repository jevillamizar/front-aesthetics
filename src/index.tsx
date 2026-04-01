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
import { AppointmentsAdmin } from './pages/admin/AppointmentsAdmin';
import { PlaceholderPage } from './pages/admin/PlaceholderPage';
import { TreatmentsAdmin } from './pages/admin/TreatmentsAdmin';
import { Settings } from './pages/admin/Settings';

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
            <Route path="treatments" element={<TreatmentsAdmin />} />
            <Route path="appointments" element={<AppointmentsAdmin />} />
            <Route path="patients" element={<PlaceholderPage title="Pacientes" description="Gestiona la información de tus pacientes." />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);