/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Campaigns from './pages/Campaigns';
import CampaignDetails from './pages/CampaignDetails';
import SiteDetails from './pages/SiteDetails';
import Ledger from './pages/Ledger';
import Notifications from './pages/Notifications';
import AuthPage from './pages/AuthPage';
import { NotificationProvider } from './context/NotificationContext';
import { SearchProvider } from './context/SearchContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <SearchProvider>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="campaigns/:id" element={<CampaignDetails />} />
                <Route path="details/:id" element={<SiteDetails />} />
                <Route path="details" element={<Navigate to="/details/1" replace />} />
                <Route path="ledger" element={<Ledger />} />
                <Route path="notifications" element={<Notifications />} />
                {/* Fallback routes for other nav items in sidebar */}
                <Route path="settings" element={<div className="p-10 text-center"><h1 className="text-3xl font-bold">Settings</h1><p className="mt-4">Settings configuration coming soon.</p></div>} />
                <Route path="help" element={<div className="p-10 text-center"><h1 className="text-3xl font-bold">Help Center</h1><p className="mt-4">Support is just a call away.</p></div>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </SearchProvider>
  );
}
