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
import { Agenda } from './pages/admin/Agenda';
import { AppointmentsAdmin } from './pages/admin/AppointmentsAdmin';
import { AppointmentComplete } from './pages/admin/AppointmentComplete';
import { DoctorsAdmin } from './pages/admin/DoctorsAdmin';
import { DoctorProfile } from './pages/admin/DoctorProfile';
import { ConsentsAdmin } from './pages/admin/ConsentsAdmin';
import { MedicalRecordsAdmin } from './pages/admin/MedicalRecordsAdmin';
import { PatientsAdmin } from './pages/admin/PatientsAdmin';
import { PatientProfile } from './pages/admin/PatientProfile';
import { RevenueAdmin } from './pages/admin/RevenueAdmin';
import { TreatmentsAdmin } from './pages/admin/TreatmentsAdmin';
import { AccountSettings } from './pages/admin/AccountSettings';
import { ClinicSettings } from './pages/admin/ClinicSettings';
import { LandingEditor } from './pages/admin/LandingEditor';
import { GoogleCalendarSettings } from './pages/admin/GoogleCalendarSettings';
import { SettingsLayout } from './pages/admin/Settings';
import { AvailabilityPage } from './pages/AvailabilityPage';
import { ClinicConfigProvider } from './lib/clinicConfig';

function NotificationsPlaceholder() {
  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Configuración de Notificaciones</h2>
        <p className="text-gray-500 text-sm">Módulo en construcción…</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<App />} />
          <Route path="/disponibilidad" element={<AvailabilityPage />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />

          {/* Admin dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <ClinicConfigProvider>
                  <AdminLayout />
                </ClinicConfigProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="treatments" element={<TreatmentsAdmin />} />
            <Route path="appointments" element={<AppointmentsAdmin />} />
            <Route path="appointments/:id/complete" element={<AppointmentComplete />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="calendar" element={<Navigate to="/admin/agenda" replace />} />
            <Route path="revenue" element={<RevenueAdmin />} />
            <Route path="doctors" element={<DoctorsAdmin />} />
            <Route path="doctors/:id" element={<DoctorProfile />} />
            <Route path="patients" element={<PatientsAdmin />} />
            <Route path="patients/:id" element={<PatientProfile />} />
            <Route path="medical-records" element={<MedicalRecordsAdmin />} />
            <Route path="consents" element={<ConsentsAdmin />} />
            <Route path="settings">
              <Route index element={<Navigate to="account" replace />} />
              <Route path="account" element={<SettingsLayout title="Mi Cuenta"><AccountSettings /></SettingsLayout>} />
              <Route path="clinic" element={<SettingsLayout title="Datos de la Clínica"><ClinicSettings /></SettingsLayout>} />
              <Route path="landing" element={<SettingsLayout title="Landing Page"><LandingEditor /></SettingsLayout>} />
              <Route path="treatments" element={<SettingsLayout title="Procedimientos"><TreatmentsAdmin /></SettingsLayout>} />
              <Route path="gcal" element={<SettingsLayout title="Google Calendar"><GoogleCalendarSettings /></SettingsLayout>} />
              <Route path="notifications" element={<SettingsLayout title="Notificaciones"><NotificationsPlaceholder /></SettingsLayout>} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);